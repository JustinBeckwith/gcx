import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
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
			await new Promise<void>((resolve, reject) => {
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
				// biome-ignore lint/suspicious/noExplicitAny: it needs to be any
			} as any);
			const exists = await deployer._exists(fullName);
			assert.strictEqual(exists, true);
			for (const s of scopes) {
				s.done();
			}
		});

		it('should return false if function does not exist', async () => {
			const scopes = [mockNotExists()];
			const deployer = new gcx.Deployer({ name });
			const fullName = `projects/${projectId}/locations/us-central1/functions/${name}`;
			sinon.stub(deployer.auth, 'getProjectId').resolves(projectId);
			sinon.stub(deployer.auth, 'getClient').resolves({
				async request(options: GaxiosOptions) {
					return request(options);
				},
				// biome-ignore lint/suspicious/noExplicitAny: it needs to be any
			} as any);
			const exists = await deployer._exists(fullName);
			assert.strictEqual(exists, false);
			for (const s of scopes) {
				s.done();
			}
		});
	});

	describe('_getUpdateMask', () => {
		it('should return sourceUploadUrl by default', () => {
			const deployer = new gcx.Deployer({ name });
			const mask = deployer._getUpdateMask();
			assert.strictEqual(mask, 'sourceUploadUrl');
		});

		it('should include all specified options', () => {
			const deployer = new gcx.Deployer({
				name,
				memory: 512,
				description: 'test description',
				entryPoint: 'myFunction',
				maxInstances: 10,
				vpcConnector: 'my-connector',
				network: 'my-network',
				runtime: 'nodejs20',
				timeout: '60s',
				triggerHTTP: true,
			});
			const mask = deployer._getUpdateMask();
			assert.ok(mask.includes('availableMemoryMb'));
			assert.ok(mask.includes('description'));
			assert.ok(mask.includes('entryPoint'));
			assert.ok(mask.includes('maxInstances'));
			assert.ok(mask.includes('vpcConnector'));
			assert.ok(mask.includes('network'));
			assert.ok(mask.includes('runtime'));
			assert.ok(mask.includes('timeout'));
			assert.ok(mask.includes('httpsTrigger'));
		});

		it('should include eventTrigger fields for bucket trigger', () => {
			const deployer = new gcx.Deployer({
				name,
				triggerBucket: 'my-bucket',
			});
			const mask = deployer._getUpdateMask();
			assert.ok(mask.includes('eventTrigger.eventType'));
			assert.ok(mask.includes('eventTrigger.resource'));
		});

		it('should include eventTrigger fields for topic trigger', () => {
			const deployer = new gcx.Deployer({
				name,
				triggerTopic: 'my-topic',
			});
			const mask = deployer._getUpdateMask();
			assert.ok(mask.includes('eventTrigger.eventType'));
			assert.ok(mask.includes('eventTrigger.resource'));
		});
	});

	describe('_buildRequest', () => {
		it('should build request with topic trigger', () => {
			const deployer = new gcx.Deployer({
				name,
				triggerTopic: 'my-topic',
			});
			const request = deployer._buildRequest('parent-path', 'upload-url');
			assert.ok(request.eventTrigger);
			assert.strictEqual(
				request.eventTrigger?.eventType,
				'providers/cloud.pubsub/eventTypes/topic.publish',
			);
			assert.strictEqual(request.eventTrigger?.resource, 'my-topic');
		});

		it('should build request with bucket trigger', () => {
			const deployer = new gcx.Deployer({
				name,
				triggerBucket: 'my-bucket',
			});
			const request = deployer._buildRequest('parent-path', 'upload-url');
			assert.ok(request.eventTrigger);
			assert.strictEqual(
				request.eventTrigger?.eventType,
				'providers/cloud.storage/eventTypes/object.change',
			);
			assert.strictEqual(request.eventTrigger?.resource, 'my-bucket');
		});

		it('should build request with custom trigger event', () => {
			const deployer = new gcx.Deployer({
				name,
				triggerBucket: 'my-bucket',
				triggerEvent: 'custom.event.type',
			});
			const request = deployer._buildRequest('parent-path', 'upload-url');
			assert.ok(request.eventTrigger);
			assert.strictEqual(request.eventTrigger?.eventType, 'custom.event.type');
		});

		it('should build request with HTTP trigger by default', () => {
			const deployer = new gcx.Deployer({ name });
			const request = deployer._buildRequest('parent-path', 'upload-url');
			assert.ok(request.httpsTrigger);
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
				// biome-ignore lint/suspicious/noExplicitAny: it needs to be any
			} as any);
			await deployer.deploy();
			for (const s of scopes) {
				s.done();
			}
		});

		it('should update existing function', async () => {
			const scopes = [
				mockUploadUrl(),
				mockUpload(),
				mockExists(),
				mockUpdate(),
				mockPoll(),
			];
			const deployer = new gcx.Deployer({ name, targetDir, projectId });
			sinon.stub(deployer.auth, 'getProjectId').resolves(projectId);
			sinon.stub(deployer.auth, 'getClient').resolves({
				async request(options: GaxiosOptions) {
					return request(options);
				},
				// biome-ignore lint/suspicious/noExplicitAny: it needs to be any
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
				// biome-ignore lint/suspicious/noExplicitAny: it needs to be any
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
				// biome-ignore lint/suspicious/noExplicitAny: it needs to be any
			} as any);
			const response = await c.call({ functionName: name, data: '142' });
			assert.strictEqual(response.data.result, '{ "data": 142 }');
			for (const s of scopes) {
				s.done();
			}
		});

		it('should handle poll errors', async () => {
			const scopes = [
				mockUploadUrl(),
				mockUpload(),
				mockDeploy(),
				mockPollError(),
			];
			const deployer = new gcx.Deployer({ name, targetDir, projectId });
			sinon.stub(deployer.auth, 'getProjectId').resolves(projectId);
			sinon.stub(deployer.auth, 'getClient').resolves({
				async request(options: GaxiosOptions) {
					return request(options);
				},
				// biome-ignore lint/suspicious/noExplicitAny: it needs to be any
			} as any);
			await assert.rejects(deployer.deploy(), /operation failed/);
			for (const s of scopes) {
				s.done();
			}
		});

		it('should throw error if sourceUploadUrl is not available', async () => {
			const scopes = [mockUploadUrlEmpty()];
			const deployer = new gcx.Deployer({ name, targetDir, projectId });
			sinon.stub(deployer.auth, 'getProjectId').resolves(projectId);
			sinon.stub(deployer.auth, 'getClient').resolves({
				async request(options: GaxiosOptions) {
					return request(options);
				},
				// biome-ignore lint/suspicious/noExplicitAny: it needs to be any
			} as any);
			await assert.rejects(
				deployer.deploy(),
				/Source Upload URL not available/,
			);
			for (const s of scopes) {
				s.done();
			}
		});

		it('should throw error if operation name is not available', async () => {
			const scopes = [mockUploadUrl(), mockUpload(), mockDeployNoOperation()];
			const deployer = new gcx.Deployer({ name, targetDir, projectId });
			sinon.stub(deployer.auth, 'getProjectId').resolves(projectId);
			sinon.stub(deployer.auth, 'getClient').resolves({
				async request(options: GaxiosOptions) {
					return request(options);
				},
				// biome-ignore lint/suspicious/noExplicitAny: it needs to be any
			} as any);
			await assert.rejects(deployer.deploy(), /Operation name not available/);
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

	function mockUploadUrlEmpty() {
		return nock('https://cloudfunctions.googleapis.com')
			.post(
				`/v1/projects/${projectId}/locations/us-central1/functions:generateUploadUrl`,
			)
			.reply(200, {});
	}

	function mockDeploy() {
		return nock('https://cloudfunctions.googleapis.com')
			.post(`/v1/projects/${projectId}/locations/us-central1/functions`)
			.reply(200, { name: 'not-a-real-operation' });
	}

	function mockUpdate() {
		return nock('https://cloudfunctions.googleapis.com')
			.patch(
				`/v1/projects/${projectId}/locations/us-central1/functions/%F0%9F%A6%84?updateMask=sourceUploadUrl`,
			)
			.reply(200, { name: 'not-a-real-operation' });
	}

	function mockDeployNoOperation() {
		return nock('https://cloudfunctions.googleapis.com')
			.post(`/v1/projects/${projectId}/locations/us-central1/functions`)
			.reply(200, {});
	}

	function mockPoll() {
		return nock('https://cloudfunctions.googleapis.com')
			.get('/v1/not-a-real-operation')
			.reply(200, { done: true });
	}

	function mockPollError() {
		return nock('https://cloudfunctions.googleapis.com')
			.get('/v1/not-a-real-operation')
			.reply(200, {
				done: true,
				error: { message: 'operation failed', code: 500 },
			});
	}

	function mockExists() {
		return nock('https://cloudfunctions.googleapis.com')
			.get(
				`/v1/projects/${projectId}/locations/us-central1/functions/%F0%9F%A6%84`,
			)
			.reply(200);
	}

	function mockNotExists() {
		return nock('https://cloudfunctions.googleapis.com')
			.get(
				`/v1/projects/${projectId}/locations/us-central1/functions/%F0%9F%A6%84`,
			)
			.reply(404);
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
