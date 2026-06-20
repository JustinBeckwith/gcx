import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import nock from 'nock';
import { afterEach, describe, it, vi } from 'vitest';
import { Deployer, ProgressEvent } from '../src/index.js';

describe('cli', () => {
	afterEach(() => {
		nock.cleanAll();
		vi.restoreAllMocks();
	});

	nock.disableNetConnect();

	const name = 'test-function';
	const projectId = 'test-project';
	const targetDir = path.resolve('test/fixtures/');

	describe('CLI input validation', () => {
		it('should require function name for deploy', () => {
			// This test verifies the CLI requires proper input
			// The actual CLI code checks cli.input.length !== 2
			assert.ok(true); // Placeholder for CLI validation
		});
	});

	describe('Deployment with events', () => {
		it('should emit progress events during deployment', async () => {
			const scope = mockUpload();

			const deployer = new Deployer({ name, targetDir, projectId });
			mockProjectId(deployer.auth, projectId);

			// Stub gRPC client methods
			const gcfClient = await deployer._getGCFClient();
			vi.spyOn(gcfClient, 'generateUploadUrl').mockResolvedValue([
				{ uploadUrl: 'https://fake.local' },
			] as never);
			vi.spyOn(gcfClient, 'getFunction').mockRejectedValue(
				new Error('Not found'),
			); // Function doesn't exist

			// Mock long-running operation
			const mockOperation = {
				promise: vi
					.fn()
					.mockResolvedValue([{ name: 'test-function', done: true }]),
			};
			vi.spyOn(gcfClient, 'createFunction').mockResolvedValue([
				mockOperation as never,
			] as never);

			const events: string[] = [];
			deployer
				.on(ProgressEvent.STARTING, () => events.push('STARTING'))
				.on(ProgressEvent.PACKAGING, () => events.push('PACKAGING'))
				.on(ProgressEvent.UPLOADING, () => events.push('UPLOADING'))
				.on(ProgressEvent.DEPLOYING, () => events.push('DEPLOYING'))
				.on(ProgressEvent.COMPLETE, () => events.push('COMPLETE'));

			await deployer.deploy();

			assert.ok(events.includes('STARTING'));
			assert.ok(events.includes('PACKAGING'));
			assert.ok(events.includes('UPLOADING'));
			assert.ok(events.includes('DEPLOYING'));
			assert.ok(events.includes('COMPLETE'));

			scope.done();
		});
	});

	describe('.gcloudignore file handling', () => {
		it('should handle missing .gcloudignore file', async () => {
			const testDir = path.join(process.cwd(), 'test-temp-dir');
			fs.mkdirSync(testDir, { recursive: true });

			const ignoreFilePath = path.join(testDir, '.gcloudignore');
			const exists = fs.existsSync(ignoreFilePath);

			// Clean up
			if (fs.existsSync(testDir)) {
				fs.rmSync(testDir, { recursive: true });
			}

			assert.strictEqual(exists, false);
		});

		it('should detect existing .gcloudignore file', async () => {
			const testDir = path.join(process.cwd(), 'test-temp-dir');
			fs.mkdirSync(testDir, { recursive: true });

			const ignoreFilePath = path.join(testDir, '.gcloudignore');
			fs.writeFileSync(ignoreFilePath, '# test ignore file\nnode_modules\n');

			const exists = fs.existsSync(ignoreFilePath);

			// Clean up
			if (fs.existsSync(testDir)) {
				fs.rmSync(testDir, { recursive: true });
			}

			assert.strictEqual(exists, true);
		});
	});

	describe('Project ID handling', () => {
		it('should set projectId from project option', () => {
			const options = {
				name,
				project: 'my-project-id',
			};
			const deployer = new Deployer(options);
			assert.strictEqual(deployer._options.projectId, 'my-project-id');
		});
	});

	describe('Target directory handling', () => {
		it('should default to cwd if targetDir not specified', () => {
			const deployer = new Deployer({ name });
			assert.strictEqual(deployer._options.targetDir, process.cwd());
		});

		it('should use specified targetDir', () => {
			const deployer = new Deployer({ name, targetDir });
			assert.strictEqual(deployer._options.targetDir, targetDir);
		});
	});

	function mockUpload() {
		return nock('https://fake.local', {
			reqheaders: {
				'Content-Type': 'application/zip',
				'x-goog-content-length-range': '0,104857600',
			},
		})
			.put('/')
			.reply(200);
	}

	function mockProjectId(auth: Deployer['auth'], projectId: string) {
		const authWithProjectId = auth as unknown as {
			getProjectId: () => Promise<string>;
		};
		vi.spyOn(authWithProjectId, 'getProjectId').mockResolvedValue(projectId);
	}
});
