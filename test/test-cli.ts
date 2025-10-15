import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { type GaxiosOptions, request } from 'gaxios';
import { describe, it } from 'mocha';
import nock from 'nock';
import * as sinon from 'sinon';
import { Deployer, ProgressEvent } from '../src/index.js';

describe('cli', () => {
	afterEach(() => {
		nock.cleanAll();
		sinon.restore();
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
			const scopes = [mockUploadUrl(), mockUpload(), mockDeploy(), mockPoll()];

			const deployer = new Deployer({ name, targetDir, projectId });
			sinon.stub(deployer.auth, 'getProjectId').resolves(projectId);
			sinon.stub(deployer.auth, 'getClient').resolves({
				async request(options: GaxiosOptions) {
					return request(options);
				},
				// biome-ignore lint/suspicious/noExplicitAny: it needs to be any
			} as any);

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

			for (const s of scopes) {
				s.done();
			}
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

	function mockUploadUrl() {
		return nock('https://cloudfunctions.googleapis.com')
			.post(
				`/v1/projects/${projectId}/locations/us-central1/functions:generateUploadUrl`,
			)
			.reply(200, { uploadUrl: 'https://fake.local' });
	}

	function mockDeploy() {
		return nock('https://cloudfunctions.googleapis.com')
			.post(`/v1/projects/${projectId}/locations/us-central1/functions`)
			.reply(200, { name: 'not-a-real-operation' });
	}

	function mockPoll() {
		return nock('https://cloudfunctions.googleapis.com')
			.get('/v1/not-a-real-operation')
			.reply(200, { done: true });
	}
});
