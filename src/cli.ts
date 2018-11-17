#!/usr/bin/env node
import * as meow from 'meow';
import {Deployer} from './';

const cli = meow(
    `
    Usage
      $ gcx deploy

    Options
      --name=NAME
          ID of the function or fully qualified identifier for the function.
          This positional must be specified if any of the other arguments in
          this group are specified.

      --region=REGION
          The Cloud region for the function.

      --runtime=RUNTIME
          The runtime in which to run the function. Defaults to nodejs6.
            ◆ nodejs6
            ◆ nodejs8
            ◆ python37

      --retry
          If specified, then the function will be retried in case of a failure.

      --memory=MEMORY
          Limit on the amount of memory the function can use.
          Allowed values are: 128MB, 256MB, 512MB, 1024MB, and 2048MB. By
          default, a new function is limited to 256MB of memory. When deploying
          an update to an existing function, the function will keep its old
          memory limit unless you specify this flag.

      --projectId=PROJECT_ID
          ProjectId of the GCP project.

      --stageBucket=BUCKET
          When deploying a function from a local directory, this flag's value is
          the name of the Google Cloud Storage bucket in which source code will
          be stored.

      --triggerBucket=BUCKET
          Google Cloud Storage bucket name. Every change in files in this
          bucket will trigger function execution.

      --timeout=TIMEOUT
          The function execution timeout, e.g. 30s for 30 seconds. Defaults to
          original value for existing function or 60 seconds for new functions.
          Cannot be more than 540s.

      --triggerHTTP
          Function will be assigned an endpoint, which you can retrieve by using
          the api. Any HTTP request (of a supported type) to the
          endpoint will trigger function execution. Supported HTTP request
          types are: POST, PUT, GET, DELETE, and OPTIONS.

      --triggerTopic=TRIGGER_TOPIC
          Name of Pub/Sub topic. Every message published in this topic will
          trigger function execution with message contents passed as input
          data.

      --entrypoint=ENTRYPOINT
          By default when a Google Cloud Function is triggered, it executes a
          JavaScript function with the same name. Or, if it cannot find a
          function with the same name, it executes a function named function. You
          can use this flag to override the default behavior, by specifying the
          name of a JavaScript function that will be executed when the Google
          Cloud Function is triggered.

      --help
          Show this command.

    Examples
      $ gcx deploy --projectId el-gato
`,
    {
      flags: {
        name: { type: 'string' },
        runtime: {type: 'string', default: 'nodejs8' },
        retry: { type: 'boolean' },
        memory: { type: 'string' },
        projectId: { type: 'string' },
        stageBucket: { type: 'string' },
        triggerBucket: { type: 'string' },
        region: { type: 'string' },
        timeout: { type: 'string' }
      }
    }
);

async function main() {
  if (cli.input.length !== 1) {
    cli.showHelp();
    return;
  }
  switch (cli.input[0]) {
    case 'deploy':
      const deployer = new Deployer({
        name: cli.flags.name,
        runtime: cli.flags.runtime,
        stageBucket: cli.flags.stageBucket,
        triggerBucket: cli.flags.triggerBucket,
        projectId: cli.flags.projectId
      });
      await deployer.deploy();
      console.log(cli.flags);
      break;
    default:
      cli.showHelp();
      break;
  }
}

main().catch(console.error);
