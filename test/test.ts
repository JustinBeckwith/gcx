import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
// eslint-disable-next-line import/no-extraneous-dependencies
import { type GaxiosOptions, request } from 'gaxios';
import { describe, it } from 'mocha';
import nock from 'nock';
import Zip from 'node-stream-zip';
import * as sinon from 'sinon';
import * as gcx from '../src/index.js';

describe('gcx', () => {
	afterEach(() => {
		nock.cleanAll();
		sinon.restore();
	});

	nock.disableNetConnect();

	const name = '🦄';
	const projectId = 'el-gato';

	// eslint-disable-next-line unicorn/prevent-abbreviations
	const targetDir = path.resolve('test/fixtures/');
	const gcloudignore = path.resolve('test/fixtures/.gcloudignore');

	describe('validation', () => {
		it('should throw if a name is not provided', async () => {
			await assert.rejects(gcx.deploy({} as gcx.DeployerOptions));
		});

		it('should throw if multiple triggers are provided', async () => {
			await assert.rejects(
				gcx.deploy({ name, triggerBucket: 'bukkit', triggerTopic: 'toppi' }),
			);
		});
	});

	describe('ignore rules', () => {
		it('should return 0 rules if no .gcloudignore is availabe', async () => {
			const deployer = new gcx.Deployer({ name });
			const rules = await deployer._getIgnoreRules();
			assert.deepStrictEqual(rules, []);
		});

		it('should return expected rules if .gcloudignore is availabe', async () => {
			const expected = [
				'.gcloudignore',
				'.git',
				'.gitignore',
				'node_modules',
				'test/',
			];
			await new Promise((resolve, reject) => {
				fs.createReadStream(gcloudignore)
					.pipe(fs.createWriteStream('.gcloudignore'))
					.on('close', resolve)
					.on('error', reject);
			});
			const deployer = new gcx.Deployer({ name });
			const rules = await deployer._getIgnoreRules();
			await fs.promises.unlink('.gcloudignore');
			assert.deepStrictEqual(rules, expected);
		});
	});

	describe('pack & upload', () => {
		let zipFile: string;

		it('should pack all of the files in the target dir', async () => {
			const deployer = new gcx.Deployer({ name, targetDir });
			zipFile = await deployer._pack();
			const zip = new Zip({ file: zipFile, storeEntries: true });
			await new Promise<void>((resolve, reject) => {
				zip.on('error', reject);
				zip.on('ready', () => {
					const files = Object.keys(zip.entries());
					assert.strictEqual(files.length, 2);
					assert.deepStrictEqual(files.sort(), ['index.js', 'package.json']);
					zip.close();
					resolve();
				});
			});
		});

		it('should PUT the file to Google Cloud Storage', async () => {
			const deployer = new gcx.Deployer({ name, targetDir });
			const scope = mockUpload();
			await deployer._upload(zipFile, 'https://fake.local');
			scope.done();
		});
	});

	describe('cloud functions api', () => {
		it('should check to see if the function exists', async () => {
			const scopes = [mockExists()];
			const deployer = new gcx.Deployer({ name });
			const fullName = `projects/${projectId}/locations/us-central1/functions/${name}`;
			sinon.stub(deployer.auth, 'getProjectId').resolves(projectId);
			sinon.stub(deployer.auth, 'getClient').resolves({
				async request(options: GaxiosOptions) {
					return request(options);
				},
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			} as any);
			const exists = await deployer._exists(fullName);
			assert.strictEqual(exists, true);
			for (const s of scopes) {
				s.done();
			}
		});
	});

	describe('end to end', () => {
		it('should deploy end to end', async () => {
			const scopes = [mockUploadUrl(), mockUpload(), mockDeploy(), mockPoll()];
			const deployer = new gcx.Deployer({ name, targetDir, projectId });
			sinon.stub(deployer.auth, 'getProjectId').resolves(projectId);
			sinon.stub(deployer.auth, 'getClient').resolves({
				async request(options: GaxiosOptions) {
					return request(options);
				},
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			} as any);
			await deployer.deploy();
			for (const s of scopes) {
				s.done();
			}
		});

		it('should call end to end', async () => {
			const scopes = [mockCall()];
			const c = new gcx.Caller();
			sinon.stub(c.auth, 'getProjectId').resolves(projectId);
			sinon.stub(c.auth, 'getClient').resolves({
				async request(options: GaxiosOptions) {
					return request(options);
				},
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			} as any);
			const response = await c.call({ functionName: name });
			assert.strictEqual(response.data.result, '{ "data": 42 }');
			for (const s of scopes) {
				s.done();
			}
		});

		it('should call end to end with data', async () => {
			const scopes = [mockCallWithData()];
			const c = new gcx.Caller();
			sinon.stub(c.auth, 'getProjectId').resolves(projectId);
			sinon.stub(c.auth, 'getClient').resolves({
				async request(options: GaxiosOptions) {
					return request(options);
				},
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			} as any);
			const response = await c.call({ functionName: name, data: '142' });
			assert.strictEqual(response.data.result, '{ "data": 142 }');
			for (const s of scopes) {
				s.done();
			}
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

	function mockExists() {
		return nock('https://cloudfunctions.googleapis.com')
			.get(
				`/v1/projects/${projectId}/locations/us-central1/functions/%F0%9F%A6%84`,
			)
			.reply(200);
	}

	/**
	 * @see https://cloud.google.com/functions/docs/reference/rest/v1/projects.locations.functions/call
	 */
	function mockCall() {
		return nock('https://cloudfunctions.googleapis.com')
			.post(
				`/v1/projects/${projectId}/locations/us-central1/function/%F0%9F%A6%84:call`,
			)
			.reply(200, {
				executionId: 'my-execution-id',
				result: '{ "data": 42 }',
				error: null,
			});
	}

	/**
	 * @see https://cloud.google.com/functions/docs/reference/rest/v1/projects.locations.functions/call
	 */
	function mockCallWithData() {
		return nock('https://cloudfunctions.googleapis.com')
			.post(
				`/v1/projects/${projectId}/locations/us-central1/function/%F0%9F%A6%84:call`,
			)
			.reply(200, {
				executionId: 'my-execution-id',
				result: '{ "data": 142 }',
				error: null,
			});
	}
});
