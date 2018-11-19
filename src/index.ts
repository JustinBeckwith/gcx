import * as archiver from 'archiver';
import {AxiosResponse} from 'axios';
import {EventEmitter} from 'events';
import * as fs from 'fs';
import * as globby from 'globby';
import {GoogleAuth, GoogleAuthOptions} from 'google-auth-library';
import {cloudfunctions_v1, google} from 'googleapis';
import * as fetch from 'node-fetch';
import * as os from 'os';
import * as path from 'path';
import * as util from 'util';
import * as uuid from 'uuid';

const readFile = util.promisify(fs.readFile);
const stat = util.promisify(fs.stat);

type Bag<T = {}> = {
  [index: string]: T;
};

export enum ProgressEvent {
  STARTING = 'STARTING',
  PACKAGING = 'PACKAGING',
  UPLOADING = 'UPLOADING',
  DEPLOYING = 'DEPLOYING',
  COMPLETE = 'COMPLETE',
}

export interface DeployerOptions extends GoogleAuthOptions {
  name: string;
  description?: string;
  region?: string;
  runtime?: string;
  retry?: boolean;
  memory?: number;
  network?: string;
  maxInstances?: number;
  timeout?: string;
  triggerHTTP?: boolean;
  triggerTopic?: string;
  triggerBucket?: string;
  triggerResource?: string;
  triggerEvent?: string;
  entryPoint?: string;
  project?: string;
  targetDir?: string;
}

/**
 * Class that provides the `deploy` method.
 */
export class Deployer extends EventEmitter {
  _options: DeployerOptions;
  _auth: GoogleAuth;
  _gcf?: cloudfunctions_v1.Cloudfunctions;

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
    this._auth = new GoogleAuth(options);
  }

  /**
   * Deploy the current application using the given opts.
   */
  async deploy() {
    this.emit(ProgressEvent.STARTING);
    const gcf = await this._getGCFClient();
    const projectId = await this._auth.getProjectId();
    const region = this._options.region || 'us-central1';
    const parent = `projects/${projectId}/locations/${region}`;
    const name = `${parent}/functions/${this._options.name}`;
    const fns = gcf.projects.locations.functions;
    const res = await fns.generateUploadUrl({parent});
    const sourceUploadUrl = res.data.uploadUrl!;
    this.emit(ProgressEvent.PACKAGING);
    const zipPath = await this._pack();
    this.emit(ProgressEvent.UPLOADING);
    await this._upload(zipPath, sourceUploadUrl);
    this.emit(ProgressEvent.DEPLOYING);
    const body = this._buildRequest(parent, sourceUploadUrl);
    const exists = await this._exists(name);
    let result: AxiosResponse<cloudfunctions_v1.Schema$Operation>;
    if (exists) {
      const updateMask = this._getUpdateMask();
      result = await fns.patch({name, updateMask, requestBody: body});
    } else {
      result = await fns.create({location: parent, requestBody: body});
    }
    const operation = result.data;
    await this._poll(operation.name!);
    this.emit(ProgressEvent.COMPLETE);
  }

  /**
   * Given an operation, poll it until complete.
   * @private
   * @param name Fully qualified name of the operation.
   */
  async _poll(name: string) {
    const gcf = await this._getGCFClient();
    const res = await gcf.operations.get({name});
    const operation = res.data;
    if (operation.error) {
      const message = JSON.stringify(operation.error);
      throw new Error(message);
    }
    if (operation.done) {
      return;
    }
    await new Promise(r => setTimeout(r, 5000));
    await this._poll(name);
  }

  /**
   * Get a list of fields that have been changed.
   * @private
   */
  _getUpdateMask() {
    const fields = ['sourceUploadUrl'];
    const opts = this._options;
    if (opts.memory) fields.push('availableMemoryMb');
    if (opts.description) fields.push('description');
    if (opts.entryPoint) fields.push('entryPoint');
    if (opts.maxInstances) fields.push('maxInstances');
    if (opts.network) fields.push('network');
    if (opts.runtime) fields.push('runtime');
    if (opts.timeout) fields.push('timeout');
    if (opts.triggerHTTP) fields.push('httpsTrigger');
    if (opts.triggerBucket || opts.triggerTopic) {
      fields.push('eventTrigger.eventType', 'eventTrigger.resource');
    }
    return fields.join();
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
    const triggerCount = ['triggerHTTP', 'triggerBucket', 'triggerTopic']
                             .filter(prop => !!((options as {}) as Bag)[prop])
                             .length;
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
      runtime: this._options.runtime || 'nodejs8',
      timeout: this._options.timeout,
      availableMemoryMb: this._options.memory,
      maxInstances: this._options.maxInstances
    };
    if (this._options.triggerTopic) {
      requestBody.eventTrigger = {
        eventType: this._options.triggerEvent ||
            'providers/cloud.pubsub/eventTypes/topic.publish',
        resource: this._options.triggerTopic
      };
    } else if (this._options.triggerBucket) {
      requestBody.eventTrigger = {
        eventType: this._options.triggerEvent ||
            'providers/cloud.storage/eventTypes/object.change',
        resource: this._options.triggerBucket
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
      await gcf.projects.locations.functions.get({name});
      return true;
    } catch (e) {
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
        'x-goog-content-length-range': '0,104857600'
      }
    });
  }

  /**
   * Package all of the sources into a zip file.
   * @private
   */
  async _pack(): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      const zipPath = path.join(os.tmpdir(), uuid.v4()) + '.zip';
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip');
      output.on('close', () => resolve(zipPath));
      archive.on('error', reject);
      archive.pipe(output);
      const ignorePatterns = await this._getIgnoreRules();
      const files = await globby(
          '**/**', {ignore: ignorePatterns, cwd: this._options.targetDir});
      files.forEach(f => {
        const fullPath = path.join(this._options.targetDir!, f);
        archive.append(fs.createReadStream(fullPath), {name: f});
      });
      archive.finalize();
    });
  }

  /**
   * Look in the CWD for a `.gcloudignore` file.  If one is present, parse it,
   * and return the ignore rules as an array of strings.
   * @private
   */
  async _getIgnoreRules() {
    const ignoreFile = path.join(this._options.targetDir!, '.gcloudignore');
    let ignoreRules = new Array<string>();
    try {
      const contents = await readFile(ignoreFile, 'utf8');
      ignoreRules = contents.split('\n').filter(line => {
        return !line.startsWith('#') && line.trim() !== '';
      });
    } catch (e) {
    }
    return ignoreRules;
  }

  /**
   * Provides an authenticated GCF api client.
   * @private
   */
  async _getGCFClient() {
    if (!this._gcf) {
      const auth = await google.auth.getClient(
          {scopes: ['https://www.googleapis.com/auth/cloud-platform']});
      google.options({auth});
      this._gcf = google.cloudfunctions('v1');
    }
    return this._gcf;
  }
}

export async function deploy(options: DeployerOptions) {
  const deployer = new Deployer(options);
  return deployer.deploy();
}
