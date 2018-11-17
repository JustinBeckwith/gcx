import {Storage, Bucket} from '@google-cloud/storage';
import {google, cloudfunctions_v1} from 'googleapis';
import { GoogleAuthOptions, GoogleAuth } from 'google-auth-library';
import * as archiver from 'archiver';
import * as fs from 'fs';
import * as path from 'path';

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
  private storage: Storage;
  private options: DeployerOptions;
  private auth: GoogleAuth;
  private gcf?: cloudfunctions_v1.Cloudfunctions;

  constructor(options?: DeployerOptions) {
    this.options = options || {};
    this.storage = new Storage(options);
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
    //const res = await gcf.projects.locations.functions.generateUploadUrl({ parent });
    //const sourceUploadUrl = res.data.uploadUrl!;
    //console.log(sourceUploadUrl);
    await this.pack();
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
   * Package all of the sources into a zip file.
   */
  private async pack() {
    return new Promise((resolve, reject) => {
      const zipPath = path.join(process.cwd(), 'butterball.zip');
      console.log(`dumping archive to ${zipPath}`);
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip');
      output.on('close', () => resolve());
      archive.on('error', reject);
      archive.pipe(output);
      archive.directory(process.cwd(), false);
      //archive.glob('subdir/*.txt');
      archive.finalize();
    });
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
