import * as archiver from 'archiver';
import {AxiosResponse} from 'axios';
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

type Bag<T = {}> = {
  [index: string]: T;
};

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
}

/**
 * Class that provides the `deploy` method.
 */
export class Deployer {
  private options: DeployerOptions;
  private auth: GoogleAuth;
  private gcf?: cloudfunctions_v1.Cloudfunctions;

  constructor(options: DeployerOptions) {
    this.validateOptions(options);
    this.options = options;
    this.auth = new GoogleAuth(options);
  }

  /**
   * Deploy the current application using the given opts.
   */
  async deploy() {
    const gcf = await this.getGCFClient();
    const projectId = await this.auth.getProjectId();
    const region = this.options.region || 'us-central1';
    const parent = `projects/${projectId}/locations/${region}`;
    const name = `${parent}/functions/${this.options.name}`;
    const fns = gcf.projects.locations.functions;
    const res = await fns.generateUploadUrl({parent});
    const sourceUploadUrl = res.data.uploadUrl!;
    const zipPath = await this.pack();
    await this.upload(zipPath, sourceUploadUrl);
    const body = this.buildRequest(parent, sourceUploadUrl);
    const exists = await this.exists(name);
    let result: AxiosResponse<cloudfunctions_v1.Schema$Operation>;
    if (exists) {
      const updateMask = this.getUpdateMask();
      result = await fns.patch({name, updateMask, requestBody: body});
    } else {
      result = await fns.create({location: parent, requestBody: body});
    }
    const operation = result.data;
    await this.poll(operation.name!);
  }

  /**
   * Given an operation, poll it until complete.
   * @param name Fully qualified name of the operation.
   */
  private async poll(name: string) {
    const gcf = await this.getGCFClient();
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
    await this.poll(name);
  }

  /**
   * Get a list of fields that have been changed.
   */
  private getUpdateMask() {
    const fields = ['sourceUploadUrl'];
    const opts = this.options;
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
   */
  private validateOptions(options: DeployerOptions) {
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
   * @param parent Path to the cloud function resource container
   * @param sourceUploadUrl Url where the blob was pushed
   */
  private buildRequest(parent: string, sourceUploadUrl: string) {
    const requestBody: cloudfunctions_v1.Schema$CloudFunction = {
      name: `${parent}/functions/${this.options.name}`,
      description: this.options.description,
      sourceUploadUrl,
      entryPoint: this.options.entryPoint,
      network: this.options.network,
      runtime: this.options.runtime || 'nodejs8',
      timeout: this.options.timeout,
      availableMemoryMb: this.options.memory,
      maxInstances: this.options.maxInstances
    };
    if (this.options.triggerTopic) {
      requestBody.eventTrigger = {
        eventType: this.options.triggerEvent ||
            'providers/cloud.pubsub/eventTypes/topic.publish',
        resource: this.options.triggerTopic
      };
    } else if (this.options.triggerBucket) {
      requestBody.eventTrigger = {
        eventType: this.options.triggerEvent ||
            'providers/cloud.storage/eventTypes/object.change',
        resource: this.options.triggerBucket
      };
    } else {
      requestBody.httpsTrigger = {};
    }
    return requestBody;
  }

  /**
   * Check to see if a cloud function already exists.
   * @param name Fully qualified name of the function.
   */
  private async exists(name: string) {
    const gcf = await this.getGCFClient();
    try {
      await gcf.projects.locations.functions.get({name});
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Upload a local file to GCS given a signed url
   * @param localPath Fully qualified path to the zip on disk.
   * @param remotePath Signed url used to put the file to
   */
  private async upload(localPath: string, remotePath: string) {
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
   */
  private async pack(): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      const zipPath = path.join(os.tmpdir(), uuid.v4()) + '.zip';
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip');
      output.on('close', () => resolve(zipPath));
      archive.on('error', reject);
      archive.pipe(output);
      const ignorePatterns = await this.getIgnoreRules();
      const files = await globby('**/**', {ignore: ignorePatterns});
      files.forEach(f => {
        const fullPath = path.join(process.cwd(), f);
        archive.append(fs.createReadStream(fullPath), {name: f});
      });
      archive.finalize();
    });
  }

  /**
   * Look in the CWD for a `.gcloudignore` file.  If one is present, parse it,
   * and return the ignore rules as an array of strings.
   */
  private async getIgnoreRules() {
    const ignoreFile = path.join(process.cwd(), '.gcloudignore');
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
   */
  private async getGCFClient() {
    if (!this.gcf) {
      const auth = await google.auth.getClient(
          {scopes: ['https://www.googleapis.com/auth/cloud-platform']});
      google.options({auth});
      this.gcf = google.cloudfunctions('v1');
    }
    return this.gcf;
  }
}
