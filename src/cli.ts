#!/usr/bin/env node
import * as meow from 'meow';
import {Deployer, DeployerOptions} from './';
import * as updateNotifier from 'update-notifier';

const pkg = require('../../package.json');
updateNotifier({pkg}).notify();

const cli = meow(
    `
    Usage
      $ gcx deploy

    Options
      --name=NAME
          ID of the function or fully qualified identifier for the function.
          This positional must be specified if any of the other arguments in
          this group are specified.

      --description=DESCRIPTION
          User-provided description of a function.

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

      --help
          Show this command.

    Examples
      $ gcx deploy some-cloud-function
`,
    {
      flags: {
        name: {type: 'string'},
        description: {type: 'string'},
        entryPoint: {type: 'string'},
        runtime: {type: 'string', default: 'nodejs8'},
        timeout: {type: 'string'},
        network: {type: 'string'},
        retry: {type: 'boolean'},
        memory: {type: 'string'},
        projectId: {type: 'string'},
        triggerBucket: {type: 'string'},
        triggerHttp: {type: 'boolean'},
        triggerTopic: {type: 'string'},
        triggerResource: {type: 'string'},
        triggerEvent: {type: 'string'},
        region: {type: 'string'},
        maxInstances: {type: 'string'}
      }
    });

async function main() {
  if (cli.input.length !== 1) {
    cli.showHelp();
    return;
  }
  switch (cli.input[0]) {
    case 'deploy':
      const deployer = new Deployer(cli.flags as DeployerOptions);
      await deployer.deploy();
      console.log(cli.flags);
      break;
    default:
      cli.showHelp();
  }
}

main().catch(console.error);
