import {Storage, Bucket} from '@google-cloud/storage';
import {google} from 'googleapis';
import { GoogleAuthOptions, GoogleAuth } from 'google-auth-library';
import * as pack from 'npm-packlist';
import * as uuid from 'uuid';
import * as path from 'path';

export interface DeployerOptions extends GoogleAuthOptions {
  bucketName?: string;
  region?: string;
  name?: string;
}

/**
 * Class that provides the `deploy` method.
 */
export class Deployer {
  private storage: Storage;
  private options: DeployerOptions;
  private auth: GoogleAuth;
  private isAuthenticated = false;

  constructor(options?: DeployerOptions) {
    this.options = options || {};
    this.storage = new Storage(options);
    this.auth = new GoogleAuth(options);
  }

  /**
   * Deploy the current application using the given opts.
   */
  async deploy() {
    const bucket = await this.getBucket();
    const files = await this.uploadToBucket(bucket);
    const gcf = await this.getGCFClient();
    const region = this.options.region || 'us-central1';
    const projectId = await this.auth.getProjectId();
    const location = `projects/${projectId}/locations/${region}`;
    const createRes = await gcf.projects.locations.functions.create({
      location,
      requestBody:  {
        name: `${location}/${this.options.name}`,
        entryPoint: 'string',
        runtime: 'string',
        timeout: 'string',
        availableMemoryMb: 10,
        serviceAccountEmail: string,
        updateTime": string,
        versionId": string,
        labels": {
          string: string,
          ...
        },
        "environmentVariables": {
          string: string,
          ...
        },
        "network": string,
        "maxInstances": number,

        // Union field source_code can be only one of the following:
        "sourceArchiveUrl": string,
        "sourceRepository": {
          object(SourceRepository)
        },
        "sourceUploadUrl": string
        // End of list of possible types for union field source_code.

        // Union field trigger can be only one of the following:
        "httpsTrigger": {
          object(HttpsTrigger)
        },
        "eventTrigger": {
          object(EventTrigger)
        }
        // End of list of possible types for union field trigger.
      }
    });
  }

  /**
   * Upload all of the relevant files for this module to a GCS bucket path
   * @param bucket GCS bucket object to which the files will be uploaded
   */
  private async uploadToBucket(bucket: Bucket) {
    const files = await pack();
    const buildId = uuid.v4();
    return Promise.all(
      files.map(async relativeLocalPath => {
        console.log(`Uploading ${relativeLocalPath}...`);
        const destination = path.join(buildId, relativeLocalPath);
        const [file] = await bucket.upload(relativeLocalPath, {
          destination,
          resumable: false
        });
        console.log(`${relativeLocalPath} complete.`);
        return file;
      })
    );
  }

  /**
   * Provides an authenticated GCF api client.
   */
  private async getGCFClient() {
    if (!this.isAuthenticated) {
      const auth = await google.auth.getClient({
        scopes: [
          "https://www.googleapis.com/auth/cloud-platform"
        ]
      });
      google.options({auth});
      this.isAuthenticated = true;
    }
    return google.cloudfunctions('v1');
  }

  /**
   * Acquire a reference to the GCS bucket that will be used to stage the
   * deployment.  Create the bucket if it does not exist.
   */
  private async getBucket() {
    let bucketName = this.options.bucketName;
    if (!bucketName) {
      const projectId = await this.auth.getProjectId();
      bucketName = `${projectId}-gcx-staging-bbq`;
    }
    let bukkit = this.storage.bucket(bucketName);
    const [exists] = await bukkit.exists();
    if(!exists) {
      [bukkit] = await this.storage.createBucket(bucketName);
    }
    return bukkit;
  }
}
