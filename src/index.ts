import {google, cloudfunctions_v1} from 'googleapis';
import { GoogleAuthOptions, GoogleAuth } from 'google-auth-library';
import * as archiver from 'archiver';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import * as globby from 'globby';
import * as os from 'os';
import * as uuid from 'uuid';
import * as fetch from 'node-fetch';

const readFile = util.promisify(fs.readFile);

export interface DeployerOptions extends GoogleAuthOptions {
  name?: string;
  region?: string;
  runtime?: string;
  retry?: boolean;
  memory?: number;
  stageBucket?: string;
  triggerBucket?: string;
  timeout?: string;
  triggerHttp?: boolean;
  triggerTopic?: string;
  entrypoint?: string;
}

/**
 * Class that provides the `deploy` method.
 */
export class Deployer {
  private options: DeployerOptions;
  private auth: GoogleAuth;
  private gcf?: cloudfunctions_v1.Cloudfunctions;

  constructor(options?: DeployerOptions) {
    this.options = options || {};
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
    const res = await gcf.projects.locations.functions.generateUploadUrl({ parent });
    const sourceUploadUrl = res.data.uploadUrl!;
    console.log(sourceUploadUrl);
    const zipPath = await this.pack();
    await this.upload(zipPath, sourceUploadUrl);

    // const createRes = await gcf.projects.locations.functions.create({
    //   location: parent,
    //   requestBody: {
    //     name: `${parent}/${this.options.name}`,
    //     sourceUploadUrl,
    //     entryPoint: this.options.entrypoint,
    //     runtime: this.options.runtime,
    //     timeout: this.options.timeout,
    //     availableMemoryMb: this.options.memory,
    //   }
    // });
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
      console.log(`dumping archive to ${zipPath}`);
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip');
      output.on('close', () => resolve(zipPath));
      archive.on('error', reject);
      archive.pipe(output);
      const ignorePatterns = await this.getIgnoreRules();
      const files = await globby('**/**', { ignore: ignorePatterns });
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
      ignoreRules = contents.split('\n')
        .filter(line => {
          return !line.startsWith('#') && line.trim() !== '';
        });
    } catch (e) {}
    return ignoreRules;
  }

  /**
   * Provides an authenticated GCF api client.
   */
  private async getGCFClient() {
    if (!this.gcf) {
      const auth = await google.auth.getClient({
        scopes: [
          "https://www.googleapis.com/auth/cloud-platform"
        ]
      });
      google.options({auth});
      this.gcf = google.cloudfunctions('v1');
    }
    return this.gcf;
  }
}
