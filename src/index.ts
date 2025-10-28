import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { Readable } from 'node:stream';
import type { protos } from '@google-cloud/functions';
import { v1, v2 } from '@google-cloud/functions';
import archiver from 'archiver';
import { globby } from 'globby';
import { GoogleAuth, type GoogleAuthOptions } from 'google-auth-library';

export enum ProgressEvent {
	STARTING = 'STARTING',
	PACKAGING = 'PACKAGING',
	UPLOADING = 'UPLOADING',
	DEPLOYING = 'DEPLOYING',
	CALLING = 'CALLING',
	COMPLETE = 'COMPLETE',
}

export type CallerOptions = {
	region?: string;
	functionName: string;
	data?: string;
} & GoogleAuthOptions;

export type DeployerOptions = {
	name: string;
	description?: string;
	region?: string;
	runtime?: string;
	retry?: boolean;
	memory?: number;
	network?: string;
	maxInstances?: number;
	vpcConnector?: string;
	timeout?: string;
	triggerHTTP?: boolean;
	triggerTopic?: string;
	triggerBucket?: string;
	triggerResource?: string;
	triggerEvent?: string;
	entryPoint?: string;
	project?: string;
	targetDir?: string;
	allowUnauthenticated?: boolean;
	// v2 (gen2) specific options
	gen2?: boolean;
	minInstances?: number;
	concurrency?: number;
	cpu?: string;
	ingressSettings?:
		| 'ALLOW_ALL'
		| 'ALLOW_INTERNAL_ONLY'
		| 'ALLOW_INTERNAL_AND_GCLB';
	vpcConnectorEgressSettings?: 'PRIVATE_RANGES_ONLY' | 'ALL_TRAFFIC';
	serviceAccount?: string;
	environmentVariables?: Record<string, string>;
	labels?: Record<string, string>;
} & GoogleAuthOptions;

/**
 * A generic client for GCX.
 */
export class GCXClient extends EventEmitter {
	public auth: GoogleAuth;
	_authOptions?: GoogleAuthOptions;
	_gcf?: v1.CloudFunctionsServiceClient;
	_gcfv2?: v2.FunctionServiceClient;

	constructor(options?: GoogleAuthOptions) {
		super();
		this._authOptions = options;
		this.auth = new GoogleAuth(options);
	}

	/**
	 * Provides an authenticated GCF v1 api client.
	 * @private
	 */
	async _getGCFClient() {
		if (!this._gcf) {
			this._gcf = new v1.CloudFunctionsServiceClient(
				this._authOptions as Record<
					string,
					string | number | object | undefined
				>,
			);
		}

		return this._gcf;
	}

	/**
	 * Provides an authenticated GCF v2 api client.
	 * @private
	 */
	async _getGCFV2Client() {
		if (!this._gcfv2) {
			this._gcfv2 = new v2.FunctionServiceClient(
				this._authOptions as Record<
					string,
					string | number | object | undefined
				>,
			);
		}

		return this._gcfv2;
	}
}

/**
 * Class that provides the `deploy` method.
 */
export class Deployer extends GCXClient {
	_options: DeployerOptions;

	constructor(options: DeployerOptions) {
		super();
		this._validateOptions(options);
		if (options.project) {
			options.projectId = options.project;
		}

		this._options = options;
		if (!options.targetDir) {
			this._options.targetDir = process.cwd();
		}

		options.scopes = ['https://www.googleapis.com/auth/cloud-platform'];
		this.auth = new GoogleAuth(options);
	}

	/**
	 * Deploy the current application using the given opts.
	 */
	async deploy() {
		if (this._options.gen2) {
			return this._deployV2();
		}
		return this._deployV1();
	}

	/**
	 * Deploy using Cloud Functions v1 API.
	 * @private
	 */
	async _deployV1() {
		this.emit(ProgressEvent.STARTING);
		const gcf = await this._getGCFClient();
		const projectId = await this.auth.getProjectId();
		const region = this._options.region || 'us-central1';
		const parent = `projects/${projectId}/locations/${region}`;
		const name = `${parent}/functions/${this._options.name}`;
		const [uploadUrlResponse] = await gcf.generateUploadUrl({ parent });
		const sourceUploadUrl = uploadUrlResponse.uploadUrl;
		if (!sourceUploadUrl) {
			throw new Error('Source Upload URL not available.');
		}

		this.emit(ProgressEvent.PACKAGING);
		const zipPath = await this._pack();
		this.emit(ProgressEvent.UPLOADING);
		await this._upload(zipPath, sourceUploadUrl);
		this.emit(ProgressEvent.DEPLOYING);
		const body = this._buildRequest(parent, sourceUploadUrl);
		const exists = await this._exists(name);
		if (exists) {
			const updateMask = this._getUpdateMask();
			const [updateOperation] = await gcf.updateFunction({
				function: body,
				updateMask: { paths: updateMask.split(',') },
			});
			// Wait for the long-running operation to complete
			await updateOperation.promise();
		} else {
			const [createOperation] = await gcf.createFunction({
				location: parent,
				function: body,
			});
			// Wait for the long-running operation to complete
			await createOperation.promise();
		}

		// Set IAM policy if allowUnauthenticated is specified
		if (this._options.allowUnauthenticated) {
			await this._setInvokerAccess(name);
		}

		this.emit(ProgressEvent.COMPLETE);
	}

	/**
	 * Deploy using Cloud Functions v2 API.
	 * @private
	 */
	async _deployV2() {
		this.emit(ProgressEvent.STARTING);
		const gcf = await this._getGCFV2Client();
		const projectId = await this.auth.getProjectId();
		const region = this._options.region || 'us-central1';
		const parent = `projects/${projectId}/locations/${region}`;
		const name = `${parent}/functions/${this._options.name}`;
		const [uploadUrlResponse] = await gcf.generateUploadUrl({ parent });
		const sourceUploadUrl = uploadUrlResponse.uploadUrl;
		if (!sourceUploadUrl) {
			throw new Error('Source Upload URL not available.');
		}

		this.emit(ProgressEvent.PACKAGING);
		const zipPath = await this._pack();
		this.emit(ProgressEvent.UPLOADING);
		await this._upload(zipPath, sourceUploadUrl);
		this.emit(ProgressEvent.DEPLOYING);
		const body = this._buildRequestV2(sourceUploadUrl);
		const exists = await this._existsV2(name);
		if (exists) {
			const updateMask = this._getUpdateMaskV2();
			const [updateOperation] = await gcf.updateFunction({
				function: body,
				updateMask: { paths: updateMask.split(',') },
			});
			// Wait for the long-running operation to complete
			await updateOperation.promise();
		} else {
			const functionId = this._options.name;
			const [createOperation] = await gcf.createFunction({
				parent,
				functionId,
				function: body,
			});
			// Wait for the long-running operation to complete
			await createOperation.promise();
		}

		// Set IAM policy if allowUnauthenticated is specified
		if (this._options.allowUnauthenticated) {
			await this._setInvokerAccess(name);
		}

		this.emit(ProgressEvent.COMPLETE);
	}

	/**
	 * Get a list of fields that have been changed.
	 * @private
	 */
	_getUpdateMask() {
		const fields = ['sourceUploadUrl'];
		const options = this._options;
		if (options.memory) fields.push('availableMemoryMb');
		if (options.description) fields.push('description');
		if (options.entryPoint) fields.push('entryPoint');
		if (options.maxInstances) fields.push('maxInstances');
		if (options.vpcConnector) fields.push('vpcConnector');
		if (options.network) fields.push('network');
		if (options.runtime) fields.push('runtime');
		if (options.timeout) fields.push('timeout');
		if (options.triggerHTTP) fields.push('httpsTrigger');
		if (options.triggerBucket || options.triggerTopic) {
			fields.push('eventTrigger.eventType', 'eventTrigger.resource');
		}

		return fields.join(',');
	}

	/**
	 * Validate the options passed in by the user.
	 * @private
	 * @param options
	 */
	private _validateOptions(options: DeployerOptions) {
		if (!options.name) {
			throw new Error('The `name` option is required.');
		}
		const trigggerProps: Array<keyof DeployerOptions> = [
			'triggerHTTP',
			'triggerBucket',
			'triggerTopic',
		];
		const triggerCount = trigggerProps.filter((property) =>
			Boolean(options[property]),
		).length;
		if (triggerCount > 1) {
			throw new Error('At most 1 trigger may be defined.');
		}
	}

	/**
	 * Build a request schema that can be used to create or patch the function
	 * @private
	 * @param parent Path to the cloud function resource container
	 * @param sourceUploadUrl Url where the blob was pushed
	 */
	_buildRequest(
		parent: string,
		sourceUploadUrl: string,
	): protos.google.cloud.functions.v1.ICloudFunction {
		const requestBody: protos.google.cloud.functions.v1.ICloudFunction = {
			name: `${parent}/functions/${this._options.name}`,
			description: this._options.description,
			sourceUploadUrl,
			entryPoint: this._options.entryPoint,
			network: this._options.network,
			runtime: this._options.runtime || 'nodejs20',
			...(this._options.timeout && {
				timeout: {
					seconds: Number.parseInt(this._options.timeout.replace('s', ''), 10),
				},
			}),
			availableMemoryMb: this._options.memory,
			maxInstances: this._options.maxInstances,
			vpcConnector: this._options.vpcConnector,
		};
		if (this._options.triggerTopic) {
			requestBody.eventTrigger = {
				eventType:
					this._options.triggerEvent ||
					'providers/cloud.pubsub/eventTypes/topic.publish',
				resource: this._options.triggerTopic,
			};
		} else if (this._options.triggerBucket) {
			requestBody.eventTrigger = {
				eventType:
					this._options.triggerEvent ||
					'providers/cloud.storage/eventTypes/object.change',
				resource: this._options.triggerBucket,
			};
		} else {
			requestBody.httpsTrigger = {};
		}

		return requestBody;
	}

	/**
	 * Check to see if a cloud function already exists.
	 * @private
	 * @param name Fully qualified name of the function.
	 */
	async _exists(name: string) {
		const gcf = await this._getGCFClient();
		try {
			await gcf.getFunction({ name });
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Check to see if a v2 cloud function already exists.
	 * @private
	 * @param name Fully qualified name of the function.
	 */
	async _existsV2(name: string) {
		const gcf = await this._getGCFV2Client();
		try {
			await gcf.getFunction({ name });
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Set IAM policy to allow unauthenticated access to the function.
	 * This adds the allUsers member with the cloudfunctions.invoker role.
	 * @private
	 * @param name Fully qualified name of the function.
	 */
	async _setInvokerAccess(name: string) {
		const gcf = this._options.gen2
			? await this._getGCFV2Client()
			: await this._getGCFClient();

		await gcf.setIamPolicy({
			resource: name,
			policy: {
				bindings: [
					{
						role: 'roles/cloudfunctions.invoker',
						members: ['allUsers'],
					},
				],
			},
		} as never);
	}

	/**
	 * Build a v2 request schema that can be used to create or patch the function
	 * @private
	 * @param sourceUploadUrl Url where the blob was pushed
	 */
	_buildRequestV2(
		sourceUploadUrl: string,
	): protos.google.cloud.functions.v2.IFunction {
		const options = this._options;
		const requestBody: protos.google.cloud.functions.v2.IFunction = {
			description: options.description,
			buildConfig: {
				runtime: options.runtime || 'nodejs20',
				entryPoint: options.entryPoint,
				source: {
					storageSource: {},
				},
				environmentVariables: options.environmentVariables,
				serviceAccount: options.serviceAccount,
			},
			serviceConfig: {
				timeoutSeconds: options.timeout
					? Number.parseInt(options.timeout.replace('s', ''), 10)
					: undefined,
				availableMemory: options.memory ? `${options.memory}M` : undefined,
				availableCpu: options.cpu,
				minInstanceCount: options.minInstances,
				maxInstanceCount: options.maxInstances,
				maxInstanceRequestConcurrency: options.concurrency,
				vpcConnector: options.vpcConnector,
				vpcConnectorEgressSettings: options.vpcConnectorEgressSettings,
				ingressSettings: options.ingressSettings,
				environmentVariables: options.environmentVariables,
				serviceAccountEmail: options.serviceAccount,
			},
			labels: options.labels,
		};

		// Parse the storage source from the uploadUrl
		// Format: https://storage.googleapis.com/gcf-v2-uploads-{region}-{hash}/...
		const urlMatch = sourceUploadUrl.match(
			/https:\/\/storage\.googleapis\.com\/([^/]+)\/(.+)\?/,
		);
		if (!urlMatch) {
			throw new Error(
				`Failed to parse storage source from upload URL: ${sourceUploadUrl}`,
			);
		}
		if (requestBody.buildConfig?.source?.storageSource) {
			requestBody.buildConfig.source.storageSource.bucket = urlMatch[1];
			requestBody.buildConfig.source.storageSource.object = urlMatch[2];
		}

		// Configure triggers
		if (options.triggerTopic) {
			requestBody.eventTrigger = {
				eventType:
					options.triggerEvent ||
					'google.cloud.pubsub.topic.v1.messagePublished',
				pubsubTopic: options.triggerTopic,
				retryPolicy: options.retry ? 'RETRY_POLICY_RETRY' : undefined,
			};
		} else if (options.triggerBucket) {
			requestBody.eventTrigger = {
				eventType:
					options.triggerEvent || 'google.cloud.storage.object.v1.finalized',
				retryPolicy: options.retry ? 'RETRY_POLICY_RETRY' : undefined,
			};
		}
		// If no event trigger, it's an HTTP function (default)

		return requestBody;
	}

	/**
	 * Get a list of fields that have been changed for v2.
	 * @private
	 */
	_getUpdateMaskV2() {
		const fields: string[] = ['buildConfig.source'];
		const options = this._options;
		if (options.description) fields.push('description');
		if (options.runtime) fields.push('buildConfig.runtime');
		if (options.entryPoint) fields.push('buildConfig.entryPoint');
		if (options.environmentVariables)
			fields.push(
				'buildConfig.environmentVariables',
				'serviceConfig.environmentVariables',
			);
		if (options.serviceAccount)
			fields.push(
				'buildConfig.serviceAccount',
				'serviceConfig.serviceAccountEmail',
			);
		if (options.timeout) fields.push('serviceConfig.timeoutSeconds');
		if (options.memory) fields.push('serviceConfig.availableMemory');
		if (options.cpu) fields.push('serviceConfig.availableCpu');
		if (options.minInstances !== undefined)
			fields.push('serviceConfig.minInstanceCount');
		if (options.maxInstances) fields.push('serviceConfig.maxInstanceCount');
		if (options.concurrency)
			fields.push('serviceConfig.maxInstanceRequestConcurrency');
		if (options.vpcConnector) fields.push('serviceConfig.vpcConnector');
		if (options.vpcConnectorEgressSettings)
			fields.push('serviceConfig.vpcConnectorEgressSettings');
		if (options.ingressSettings) fields.push('serviceConfig.ingressSettings');
		if (options.labels) fields.push('labels');
		if (options.triggerBucket || options.triggerTopic) {
			fields.push('eventTrigger');
		}

		return fields.join(',');
	}

	/**
	 * Upload a local file to GCS given a signed url
	 * @private
	 * @param localPath Fully qualified path to the zip on disk.
	 * @param remotePath Signed url used to put the file to
	 */
	async _upload(localPath: string, remotePath: string) {
		const stream = fs.createReadStream(localPath);
		const options: RequestInit & { duplex: 'half' } = {
			method: 'PUT',
			body: Readable.toWeb(stream) as ReadableStream,
			duplex: 'half',
			headers: {
				'Content-Type': 'application/zip',
				'x-goog-content-length-range': '0,104857600',
			},
		};
		const response = await fetch(remotePath, options);
		if (!response.ok) {
			throw new Error(
				`Upload failed with status ${response.status}: ${response.statusText}`,
			);
		}
	}

	/**
	 * Package all of the sources into a zip file.
	 * @private
	 */
	async _pack(): Promise<string> {
		// biome-ignore lint/suspicious/noAsyncPromiseExecutor: it needs to be async
		return new Promise<string>(async (resolve, reject) => {
			const zipPath = `${path.join(os.tmpdir(), randomUUID())}.zip`;
			const output = fs.createWriteStream(zipPath);
			const archive = archiver('zip');
			output.on('close', () => {
				resolve(zipPath);
			});
			archive.on('error', reject);
			archive.pipe(output);
			const ignorePatterns = await this._getIgnoreRules();
			const files = await globby('**/**', {
				ignore: ignorePatterns,
				cwd: this._options.targetDir,
			});
			for (const f of files) {
				if (this._options.targetDir == null) {
					throw new Error('targetDir is required');
				}
				const fullPath = path.join(this._options.targetDir, f);
				archive.append(fs.createReadStream(fullPath), { name: f });
			}

			await archive.finalize();
		});
	}

	/**
	 * Look in the CWD for a `.gcloudignore` file.  If one is present, parse it,
	 * and return the ignore rules as an array of strings.
	 * @private
	 */
	async _getIgnoreRules() {
		if (this._options.targetDir == null) {
			throw new Error('targetDir is required');
		}
		const ignoreFile = path.join(this._options.targetDir, '.gcloudignore');
		let ignoreRules: string[] = [];
		try {
			const contents = await fs.promises.readFile(ignoreFile, 'utf8');
			ignoreRules = contents.split('\n').filter((line) => {
				return !line.startsWith('#') && line.trim() !== '';
			});
		} catch {
			// No .gcloudignore file found, return empty rules
		}

		return ignoreRules;
	}
}

/**
 * Class that provides the `call` method.
 */
export class Caller extends GCXClient {
	/**
	 * Synchronously call a function.
	 * @param {string} functionName The function to call.
	 */
	async call(options: CallerOptions) {
		this.emit(ProgressEvent.STARTING);
		const gcf = await this._getGCFClient();
		const projectId = await this.auth.getProjectId();
		const region = options.region || 'us-central1';
		const name = `projects/${projectId}/locations/${region}/functions/${options.functionName}`;
		this.emit(ProgressEvent.CALLING);
		const [response] = await gcf.callFunction({
			name,
			data: options.data,
		});
		this.emit(ProgressEvent.COMPLETE);
		return response;
	}
}

export async function deploy(options: DeployerOptions) {
	const deployer = new Deployer(options);
	return deployer.deploy();
}

export async function call(options: CallerOptions) {
	const caller = new Caller(options);
	return caller.call(options);
}
