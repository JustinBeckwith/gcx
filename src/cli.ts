#!/usr/bin/env node
import meow from 'meow';
import {Deployer, DeployerOptions, ProgressEvent} from './index.js';
import updateNotifier from 'update-notifier';
import ora from 'ora';
import util from 'util';
import fs from 'fs';
import path from 'path';

const pkg = JSON.parse(
  fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf-8')
);
updateNotifier({pkg}).notify();

const cli = meow(
  `
    Usage
      $ gcx deploy FUNCTION_NAME

    Positional arguments

      FUNCTION_NAME
        ID of the function or fully qualified identifier for the function.
        This positional must be specified if any of the other arguments in
        this group are specified.

    Flags

      --description=DESCRIPTION
          User-provided description of a function.

      --region=REGION
          The Cloud region for the function.

      --runtime=RUNTIME
          The runtime in which to run the function. Defaults to nodejs14.
            ◆ nodejs10: Node.js 10
            ◆ nodejs12: Node.js 12
            ◆ nodejs14: Node.js 14
            ◆ python37: Python 3.7
            ◆ python38: Python 3.8
            ◆ python39: Python 3.9
            ◆ go111: Go 1.11
            ◆ go113: Go 1.13
            ◆ java11: Java 11
            ◆ dotnet3: .NET Framework 3
            ◆ ruby26: Ruby 2.6

      --target-dir
          The directory that contains the sources to be deployed.  Defaults
          to the current working directory.

      --retry
          If specified, then the function will be retried in case of a failure.

      --memory=MEMORY
          Limit on the amount of memory the function can use.
          Allowed values are: 128MB, 256MB, 512MB, 1024MB, and 2048MB. By
          default, a new function is limited to 256MB of memory. When deploying
          an update to an existing function, the function will keep its old
          memory limit unless you specify this flag.

      --project=PROJECT_ID
          Project Id of the GCP project.

      --trigger-bucket=BUCKET
          Google Cloud Storage bucket name. Every change in files in this
          bucket will trigger function execution.

      --trigger-http
          Function will be assigned an endpoint, which you can view by using
          the describe command. Any HTTP request (of a supported type) to the
          endpoint will trigger function execution. Supported HTTP request
          types are: POST, PUT, GET, DELETE, and OPTIONS.

      --trigger-topic=TRIGGER_TOPIC
          Name of Pub/Sub topic. Every message published in this topic will
          trigger function execution with message contents passed as input
          data.

      --trigger-event=EVENT_TYPE
          Specifies which action should trigger the function. For a list of
          acceptable values, call functions event-types list.

       --trigger-resource=RESOURCE
          Specifies which resource from --trigger-event is being observed. E.g.
          if --trigger-event is
          providers/cloud.storage/eventTypes/object.change, --trigger-resource
          must be a bucket name. For a list of expected resources, call
          functions event-types list.

      --timeout=TIMEOUT
          The function execution timeout, e.g. 30s for 30 seconds. Defaults to
          original value for existing function or 60 seconds for new functions.
          Cannot be more than 540s.

      --entryPoint=ENTRYPOINT
          By default when a Google Cloud Function is triggered, it executes a
          JavaScript function with the same name. Or, if it cannot find a
          function with the same name, it executes a function named function. You
          can use this flag to override the default behavior, by specifying the
          name of a JavaScript function that will be executed when the Google
          Cloud Function is triggered.

      --network=NETWORK
          The VPC Network that this cloud function can connect to. It can be
          either the fully-qualified URI, or the short name of the network
          resource. If the short network name is used, the network must belong
          to the same project. Otherwise, it must belong to a project within the
          same organization. The format of this field is either
          projects/{project}/global/networks/{network} or {network}, where
          {project} is a project id where the network is defined, and
          {network} is the short name of the network.

      --max-instances=MAX_INSTANCES
          The limit on the maximum number of function instances that may coexist
          at a given time. This feature is currently in alpha, available only
          for whitelisted users.

      --vpc-connector=VPC_CONNECTOR
          Name of VPC connector. Connector name must be in the fully-qualified format of
          projects/{project}/locations/{region}/connectors/{connector_name} or {connector_name}

          Select a VPC connector to access a Serverless VPC network

      --help
          Show this command.

    Examples
      $ gcx deploy some-cloud-function
`,
  {
    importMeta: import.meta,
    flags: {
      description: {type: 'string'},
      entryPoint: {type: 'string'},
      runtime: {type: 'string'},
      timeout: {type: 'string'},
      network: {type: 'string'},
      retry: {type: 'boolean'},
      memory: {type: 'string'},
      project: {type: 'string'},
      projectId: {type: 'string'},
      triggerBucket: {type: 'string'},
      triggerHttp: {type: 'boolean'},
      triggerTopic: {type: 'string'},
      triggerResource: {type: 'string'},
      triggerEvent: {type: 'string'},
      targetDir: {type: 'string'},
      region: {type: 'string'},
      maxInstances: {type: 'string'},
      vpcConnector: {type: 'string'},
    },
  }
);

async function main() {
  if (cli.input.length !== 2) {
    cli.showHelp();
    return;
  }
  switch (cli.input[0]) {
    case 'deploy': {
      const start = Date.now();
      const opts = cli.flags as {} as DeployerOptions;
      opts.name = cli.input[1];
      const targetDir = opts.targetDir || process.cwd();
      const hasIgnore = await hasIgnoreFile(targetDir);
      if (!hasIgnore) {
        await generateIgnoreFile(targetDir);
      }
      const spinny = ora('Initializing deployment...').start();
      const deployinator = new Deployer(opts);
      deployinator
        .on(ProgressEvent.PACKAGING, () => {
          spinny.stopAndPersist({
            symbol: '🤖',
            text: 'Deployment initialized.',
          });
          spinny.start('Packaging sources...');
        })
        .on(ProgressEvent.UPLOADING, () => {
          spinny.stopAndPersist({
            symbol: '📦',
            text: 'Source code packaged.',
          });
          spinny.start('Uploading source...');
        })
        .on(ProgressEvent.DEPLOYING, () => {
          spinny.stopAndPersist({
            symbol: '🛸',
            text: 'Source uploaded to cloud.',
          });
          spinny.start('Deploying function...');
        })
        .on(ProgressEvent.COMPLETE, () => {
          const seconds = (Date.now() - start) / 1000;
          spinny.stopAndPersist({
            symbol: '🚀',
            text: `Function deployed in ${seconds} seconds.`,
          });
        });
      await deployinator.deploy();
      break;
    }
    default:
      cli.showHelp();
  }
}

async function generateIgnoreFile(targetDir: string) {
  console.log(`
    🤖 I generated a '.gcloudignore' file in the target directory.
       This file contains a list of glob patterns that should be ingored
       in your deployment. It works just like a .gitignore file 💜
  `);
  await new Promise((resolve, reject) => {
    fs.createReadStream(path.join(__dirname, '../../src/.gcloudignore'))
      .pipe(fs.createWriteStream(path.join(targetDir, '.gcloudignore')))
      .on('error', reject)
      .on('close', resolve);
  });
}

/**
 * Checks to see if a given directory has a `.gcloudignore` file.
 * @param targetDir The directory with the sources to deploy.
 */
async function hasIgnoreFile(targetDir: string) {
  const ignoreFile = path.join(targetDir, '.gcloudignore');
  try {
    await util.promisify(fs.stat)(ignoreFile);
    return true;
  } catch (e) {
    return false;
  }
}

main().catch(console.error);
