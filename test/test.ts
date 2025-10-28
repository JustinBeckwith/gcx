import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
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
			const deployer = new gcx.Deployer({ name });
			const fullName = `projects/${projectId}/locations/us-central1/functions/${name}`;
			sinon.stub(deployer.auth, 'getProjectId').resolves(projectId);

			// Stub the gRPC client to return a function
			const gcfClient = await deployer._getGCFClient();
			sinon
				.stub(gcfClient, 'getFunction')
				.resolves([{ name: fullName }] as never);

			const exists = await deployer._exists(fullName);
			assert.strictEqual(exists, true);
		});

		it('should return false if function does not exist', async () => {
			const deployer = new gcx.Deployer({ name });
			const fullName = `projects/${projectId}/locations/us-central1/functions/${name}`;
			sinon.stub(deployer.auth, 'getProjectId').resolves(projectId);

			// Stub the gRPC client to throw (function doesn't exist)
			const gcfClient = await deployer._getGCFClient();
			sinon.stub(gcfClient, 'getFunction').rejects(new Error('Not found'));

			const exists = await deployer._exists(fullName);
			assert.strictEqual(exists, false);
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

	describe('v2 (gen2) deployment', () => {
		it('should deploy v2 function end to end', async () => {
			// Mock the v2 upload URL (uses storage.googleapis.com)
			const uploadScope = nock('https://storage.googleapis.com', {
				reqheaders: {
					'Content-Type': 'application/zip',
					'x-goog-content-length-range': '0,104857600',
				},
			})
				.put('/gcf-v2-uploads-us-central1-abc123/function.zip')
				.query({ token: 'xyz' })
				.reply(200);

			const deployer = new gcx.Deployer({
				name,
				targetDir,
				projectId,
				gen2: true,
			});
			sinon.stub(deployer.auth, 'getProjectId').resolves(projectId);

			// Stub gRPC client methods
			const gcfClient = await deployer._getGCFV2Client();
			sinon.stub(gcfClient, 'generateUploadUrl').resolves([
				{
					uploadUrl:
						'https://storage.googleapis.com/gcf-v2-uploads-us-central1-abc123/function.zip?token=xyz',
				},
			] as never);
			sinon.stub(gcfClient, 'getFunction').rejects(new Error('Not found'));

			// Mock long-running operation
			const mockOperation = {
				promise: sinon.stub().resolves([{ name: 'test-function', done: true }]),
			};
			sinon
				.stub(gcfClient, 'createFunction')
				.resolves([mockOperation as never] as never);

			await deployer.deploy();
			uploadScope.done();
		});

		it('should update existing v2 function', async () => {
			// Mock the v2 upload URL (uses storage.googleapis.com)
			const uploadScope = nock('https://storage.googleapis.com', {
				reqheaders: {
					'Content-Type': 'application/zip',
					'x-goog-content-length-range': '0,104857600',
				},
			})
				.put('/gcf-v2-uploads-us-central1-abc123/function.zip')
				.query({ token: 'xyz' })
				.reply(200);

			const deployer = new gcx.Deployer({
				name,
				targetDir,
				projectId,
				gen2: true,
			});
			sinon.stub(deployer.auth, 'getProjectId').resolves(projectId);

			// Stub gRPC client methods
			const gcfClient = await deployer._getGCFV2Client();
			sinon.stub(gcfClient, 'generateUploadUrl').resolves([
				{
					uploadUrl:
						'https://storage.googleapis.com/gcf-v2-uploads-us-central1-abc123/function.zip?token=xyz',
				},
			] as never);
			sinon
				.stub(gcfClient, 'getFunction')
				.resolves([{ name: 'existing-function' }] as never);

			// Mock long-running operation
			const mockOperation = {
				promise: sinon.stub().resolves([{ name: 'test-function', done: true }]),
			};
			sinon
				.stub(gcfClient, 'updateFunction')
				.resolves([mockOperation as never] as never);

			await deployer.deploy();
			uploadScope.done();
		});

		it('should build v2 request with topic trigger', () => {
			const deployer = new gcx.Deployer({
				name,
				triggerTopic: 'my-topic',
				gen2: true,
			});
			const request = deployer._buildRequestV2(
				'https://storage.googleapis.com/bucket/object?token=xyz',
			);
			assert.ok(request.eventTrigger);
			assert.strictEqual(
				request.eventTrigger?.eventType,
				'google.cloud.pubsub.topic.v1.messagePublished',
			);
			assert.strictEqual(request.eventTrigger?.pubsubTopic, 'my-topic');
		});

		it('should build v2 request with bucket trigger', () => {
			const deployer = new gcx.Deployer({
				name,
				triggerBucket: 'my-bucket',
				gen2: true,
			});
			const request = deployer._buildRequestV2(
				'https://storage.googleapis.com/bucket/object?token=xyz',
			);
			assert.ok(request.eventTrigger);
			assert.strictEqual(
				request.eventTrigger?.eventType,
				'google.cloud.storage.object.v1.finalized',
			);
		});

		it('should build v2 request with custom trigger event', () => {
			const deployer = new gcx.Deployer({
				name,
				triggerTopic: 'my-topic',
				triggerEvent: 'custom.event.type',
				gen2: true,
			});
			const request = deployer._buildRequestV2(
				'https://storage.googleapis.com/bucket/object?token=xyz',
			);
			assert.ok(request.eventTrigger);
			assert.strictEqual(request.eventTrigger?.eventType, 'custom.event.type');
		});

		it('should include all v2 options in update mask', () => {
			const deployer = new gcx.Deployer({
				name,
				memory: 512,
				description: 'test description',
				entryPoint: 'myFunction',
				maxInstances: 10,
				minInstances: 1,
				concurrency: 5,
				cpu: '1',
				vpcConnector: 'my-connector',
				runtime: 'nodejs22',
				timeout: '60s',
				triggerHTTP: true,
				environmentVariables: { KEY: 'value' },
				serviceAccount: 'my-sa@project.iam.gserviceaccount.com',
				ingressSettings: 'ALLOW_INTERNAL_ONLY',
				vpcConnectorEgressSettings: 'ALL_TRAFFIC',
				labels: { env: 'test' },
				gen2: true,
			});
			const mask = deployer._getUpdateMaskV2();
			assert.ok(mask.includes('description'));
			assert.ok(mask.includes('buildConfig.runtime'));
			assert.ok(mask.includes('buildConfig.entryPoint'));
			assert.ok(mask.includes('serviceConfig.availableMemory'));
			assert.ok(mask.includes('serviceConfig.availableCpu'));
			assert.ok(mask.includes('serviceConfig.minInstanceCount'));
			assert.ok(mask.includes('serviceConfig.maxInstanceCount'));
			assert.ok(mask.includes('serviceConfig.maxInstanceRequestConcurrency'));
			assert.ok(mask.includes('serviceConfig.vpcConnector'));
			assert.ok(mask.includes('serviceConfig.timeoutSeconds'));
			assert.ok(mask.includes('buildConfig.environmentVariables'));
			assert.ok(mask.includes('serviceConfig.environmentVariables'));
			assert.ok(mask.includes('buildConfig.serviceAccount'));
			assert.ok(mask.includes('serviceConfig.serviceAccountEmail'));
			assert.ok(mask.includes('serviceConfig.ingressSettings'));
			assert.ok(mask.includes('serviceConfig.vpcConnectorEgressSettings'));
			assert.ok(mask.includes('labels'));
		});

		it('should check if v2 function exists', async () => {
			const deployer = new gcx.Deployer({ name, gen2: true });
			const fullName = `projects/${projectId}/locations/us-central1/functions/${name}`;
			sinon.stub(deployer.auth, 'getProjectId').resolves(projectId);

			const gcfClient = await deployer._getGCFV2Client();
			sinon
				.stub(gcfClient, 'getFunction')
				.resolves([{ name: fullName }] as never);

			const exists = await deployer._existsV2(fullName);
			assert.strictEqual(exists, true);
		});

		it('should return false if v2 function does not exist', async () => {
			const deployer = new gcx.Deployer({ name, gen2: true });
			const fullName = `projects/${projectId}/locations/us-central1/functions/${name}`;
			sinon.stub(deployer.auth, 'getProjectId').resolves(projectId);

			const gcfClient = await deployer._getGCFV2Client();
			sinon.stub(gcfClient, 'getFunction').rejects(new Error('Not found'));

			const exists = await deployer._existsV2(fullName);
			assert.strictEqual(exists, false);
		});

		it('should set IAM policy when allowUnauthenticated is true', async () => {
			const uploadScope = nock('https://storage.googleapis.com', {
				reqheaders: {
					'Content-Type': 'application/zip',
					'x-goog-content-length-range': '0,104857600',
				},
			})
				.put('/gcf-v2-uploads-us-central1-abc123/function.zip')
				.query({ token: 'xyz' })
				.reply(200);

			const deployer = new gcx.Deployer({
				name,
				targetDir,
				projectId,
				gen2: true,
				allowUnauthenticated: true,
			});
			sinon.stub(deployer.auth, 'getProjectId').resolves(projectId);

			const gcfClient = await deployer._getGCFV2Client();
			sinon.stub(gcfClient, 'generateUploadUrl').resolves([
				{
					uploadUrl:
						'https://storage.googleapis.com/gcf-v2-uploads-us-central1-abc123/function.zip?token=xyz',
				},
			] as never);
			sinon.stub(gcfClient, 'getFunction').rejects(new Error('Not found'));

			const mockOperation = {
				promise: sinon.stub().resolves([{ name: 'test-function', done: true }]),
			};
			sinon
				.stub(gcfClient, 'createFunction')
				.resolves([mockOperation as never] as never);

			// Stub setIamPolicy to verify it's called
			const setIamPolicyStub = sinon
				.stub(gcfClient, 'setIamPolicy')
				.resolves([{}] as never);

			await deployer.deploy();

			// Verify setIamPolicy was called with correct parameters
			assert.ok(setIamPolicyStub.calledOnce);
			const callArgs = setIamPolicyStub.firstCall.args[0];
			assert.ok(callArgs.resource.includes(name));
			assert.ok(
				callArgs.policy?.bindings?.[0].role === 'roles/cloudfunctions.invoker',
			);
			assert.ok(callArgs.policy?.bindings?.[0].members?.includes('allUsers'));

			uploadScope.done();
		});
	});

	describe('end to end', () => {
		it('should deploy end to end', async () => {
			const scope = mockUpload();
			const deployer = new gcx.Deployer({ name, targetDir, projectId });
			sinon.stub(deployer.auth, 'getProjectId').resolves(projectId);

			// Stub gRPC client methods
			const gcfClient = await deployer._getGCFClient();
			sinon
				.stub(gcfClient, 'generateUploadUrl')
				.resolves([{ uploadUrl: 'https://fake.local' }] as never);
			sinon.stub(gcfClient, 'getFunction').rejects(new Error('Not found')); // Function doesn't exist

			// Mock long-running operation
			const mockOperation = {
				promise: sinon.stub().resolves([{ name: 'test-function', done: true }]),
			};
			sinon
				.stub(gcfClient, 'createFunction')
				.resolves([mockOperation as never] as never);

			await deployer.deploy();
			scope.done();
		});

		it('should update existing function', async () => {
			const scope = mockUpload();
			const deployer = new gcx.Deployer({ name, targetDir, projectId });
			sinon.stub(deployer.auth, 'getProjectId').resolves(projectId);

			// Stub gRPC client methods
			const gcfClient = await deployer._getGCFClient();
			sinon
				.stub(gcfClient, 'generateUploadUrl')
				.resolves([{ uploadUrl: 'https://fake.local' }] as never);
			sinon
				.stub(gcfClient, 'getFunction')
				.resolves([{ name: 'existing-function' }] as never); // Function exists

			// Mock long-running operation
			const mockOperation = {
				promise: sinon.stub().resolves([{ name: 'test-function', done: true }]),
			};
			sinon
				.stub(gcfClient, 'updateFunction')
				.resolves([mockOperation as never] as never);

			await deployer.deploy();
			scope.done();
		});

		it('should call end to end', async () => {
			const c = new gcx.Caller();
			sinon.stub(c.auth, 'getProjectId').resolves(projectId);

			// Stub gRPC client call method
			const gcfClient = await c._getGCFClient();
			sinon.stub(gcfClient, 'callFunction').resolves([
				{
					executionId: 'my-execution-id',
					result: '{ "data": 42 }',
					error: null,
				},
			] as never);

			const response = await c.call({ functionName: name });
			assert.strictEqual(response.result, '{ "data": 42 }');
		});

		it('should call end to end with data', async () => {
			const c = new gcx.Caller();
			sinon.stub(c.auth, 'getProjectId').resolves(projectId);

			// Stub gRPC client call method
			const gcfClient = await c._getGCFClient();
			sinon.stub(gcfClient, 'callFunction').resolves([
				{
					executionId: 'my-execution-id',
					result: '{ "data": 142 }',
					error: null,
				},
			] as never);

			const response = await c.call({ functionName: name, data: '142' });
			assert.strictEqual(response.result, '{ "data": 142 }');
		});

		it('should handle poll errors', async () => {
			const scope = mockUpload();
			const deployer = new gcx.Deployer({ name, targetDir, projectId });
			sinon.stub(deployer.auth, 'getProjectId').resolves(projectId);

			// Stub gRPC client methods
			const gcfClient = await deployer._getGCFClient();
			sinon
				.stub(gcfClient, 'generateUploadUrl')
				.resolves([{ uploadUrl: 'https://fake.local' }] as never);
			sinon.stub(gcfClient, 'getFunction').rejects(new Error('Not found'));

			// Mock long-running operation that fails
			const mockOperation = {
				promise: sinon.stub().rejects(new Error('operation failed')),
			};
			sinon
				.stub(gcfClient, 'createFunction')
				.resolves([mockOperation as never] as never);

			await assert.rejects(deployer.deploy(), /operation failed/);
			scope.done();
		});

		it('should throw error if sourceUploadUrl is not available', async () => {
			const deployer = new gcx.Deployer({ name, targetDir, projectId });
			sinon.stub(deployer.auth, 'getProjectId').resolves(projectId);

			// Stub gRPC client to return empty upload URL
			const gcfClient = await deployer._getGCFClient();
			sinon.stub(gcfClient, 'generateUploadUrl').resolves([{}] as never);

			await assert.rejects(
				deployer.deploy(),
				/Source Upload URL not available/,
			);
		});

		it('should throw error if operation name is not available', async () => {
			const scope = mockUpload();
			const deployer = new gcx.Deployer({ name, targetDir, projectId });
			sinon.stub(deployer.auth, 'getProjectId').resolves(projectId);

			// Stub gRPC client methods
			const gcfClient = await deployer._getGCFClient();
			sinon
				.stub(gcfClient, 'generateUploadUrl')
				.resolves([{ uploadUrl: 'https://fake.local' }] as never);
			sinon.stub(gcfClient, 'getFunction').rejects(new Error('Not found'));

			// Mock operation without name - no promise method will cause the error
			const mockBadOperation = {} as never;
			sinon
				.stub(gcfClient, 'createFunction')
				.resolves([mockBadOperation] as never);

			await assert.rejects(deployer.deploy(), /promise is not a function/);
			scope.done();
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
});
