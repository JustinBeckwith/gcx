#!/usr/bin/env node
import * as meow from 'meow';
import {Deployer} from './';

const cli = meow(
    `
    Usage
      $ gcx deploy

    Options
      --name          Human friendly name for the function.
      --projectId     ProjectId of the GCP project.
      --bucketName    Name of the GCS bucket in your project to use.
      --region        The region to which the function should be deployed.
      --help          Get some help.

    Examples
      $ gcx deploy --projectId el-gato
`,
    {
      flags: {
        name: { type: 'string' },
        projectId: { type: 'string' },
        bucketName: { type: 'string' },
        region: {type: 'string' }
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
        bucketName: cli.flags.bucketName,
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
