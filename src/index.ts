import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import archiver from 'archiver';
import { globby } from 'globby';
// eslint-disable-next-line import/no-extraneous-dependencies
import { GoogleAuth, type GoogleAuthOptions } from 'google-auth-library';
import { type cloudfunctions_v1, google } from 'googleapis';
import fetch from 'node-fetch';
import { v4 as uuid } from 'uuid';

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
} & GoogleAuthOptions;

/**
 * A generic client for GCX.
 */
// eslint-disable-next-line @typescript-eslint/naming-convention, unicorn/prefer-event-target
export class GCXClient extends EventEmitter {
	public auth: GoogleAuth;
	_gcf?: cloudfunctions_v1.Cloudfunctions;

	constructor(options?: GoogleAuthOptions) {
		super();
		this.auth = new GoogleAuth(options);
	}

	/**
	 * Provides an authenticated GCF api client.
	 * @private
	 */
	// eslint-disable-next-line @typescript-eslint/naming-convention
	async _getGCFClient() {
		if (!this._gcf) {
			google.options({ auth: this.auth });
			this._gcf = google.cloudfunctions('v1');
		}

		return this._gcf;
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
		this.emit(ProgressEvent.STARTING);
		const gcf = await this._getGCFClient();
		const projectId = await this.auth.getProjectId();
		const region = this._options.region || 'us-central1';
		const parent = `projects/${projectId}/locations/${region}`;
		const name = `${parent}/functions/${this._options.name}`;
		const fns = gcf.projects.locations.functions;
		const response = await fns.generateUploadUrl({ parent });
		const sourceUploadUrl = response.data.uploadUrl;
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
		let operation: cloudfunctions_v1.Schema$Operation;
		if (exists) {
			const updateMask = this._getUpdateMask();
			const result = await fns.patch({ name, updateMask, requestBody: body });
			operation = result.data;
		} else {
			const result = await fns.create({ location: parent, requestBody: body });
			operation = result.data;
		}

		if (operation.name == null) {
			throw new Error('Operation name not available.');
		}

		await this._poll(operation.name);
		this.emit(ProgressEvent.COMPLETE);
	}

	/**
	 * Given an operation, poll it until complete.
	 * @private
	 * @param name Fully qualified name of the operation.
	 */
	async _poll(name: string) {
		const gcf = await this._getGCFClient();
		const response = await gcf.operations.get({ name });
		const operation = response.data;
		if (operation.error) {
			const message = JSON.stringify(operation.error);
			throw new Error(message);
		}

		if (operation.done) {
			return;
		}

		await new Promise((r) => {
			setTimeout(r, 5000);
		});
		await this._poll(name);
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
	_buildRequest(parent: string, sourceUploadUrl: string) {
		const requestBody: cloudfunctions_v1.Schema$CloudFunction = {
			name: `${parent}/functions/${this._options.name}`,
			description: this._options.description,
			sourceUploadUrl,
			entryPoint: this._options.entryPoint,
			network: this._options.network,
			runtime: this._options.runtime || 'nodejs14',
			timeout: this._options.timeout,
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
			await gcf.projects.locations.functions.get({ name });
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Upload a local file to GCS given a signed url
	 * @private
	 * @param localPath Fully qualified path to the zip on disk.
	 * @param remotePath Signed url used to put the file to
	 */
	async _upload(localPath: string, remotePath: string) {
		const stream = fs.createReadStream(localPath);
		await fetch(remotePath, {
			method: 'PUT',
			body: stream,
			headers: {
				'Content-Type': 'application/zip',
				'x-goog-content-length-range': '0,104857600',
			},
		});
	}

	/**
	 * Package all of the sources into a zip file.
	 * @private
	 */
	async _pack(): Promise<string> {
		// biome-ignore lint/suspicious/noAsyncPromiseExecutor: <explanation>
		return new Promise<string>(async (resolve, reject) => {
			const zipPath = `${path.join(os.tmpdir(), uuid())}.zip`;
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
		let ignoreRules = new Array<string>();
		try {
			const contents = await fs.promises.readFile(ignoreFile, 'utf8');
			ignoreRules = contents.split('\n').filter((line) => {
				return !line.startsWith('#') && line.trim() !== '';
			});
		} catch {
			// Blergh
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
		const name = `projects/${projectId}/locations/${region}/function/${options.functionName}`;
		const fns = gcf.projects.locations.functions;
		this.emit(ProgressEvent.CALLING);
		const response = await fns.call({
			name,
			requestBody: {
				data: options.data,
			},
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
