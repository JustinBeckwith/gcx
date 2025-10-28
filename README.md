# gcx

> An API and CLI for deploying and calling Google Cloud Functions (1st gen and 2nd gen) in Node.js.

[![NPM Version](https://img.shields.io/npm/v/gcx.svg)](https://npmjs.org/package/gcx)
[![Build Status](https://github.com/JustinBeckwith/gcx/actions/workflows/ci.yaml/badge.svg?branch=main)](https://github.com/JustinBeckwith/gcx/actions)
[![codecov](https://codecov.io/gh/JustinBeckwith/gcx/branch/main/graph/badge.svg)](https://codecov.io/gh/JustinBeckwith/gcx)
[![Known Vulnerabilities](https://snyk.io/test/github/JustinBeckwith/gcx/badge.svg)](https://snyk.io/test/github/JustinBeckwith/gcx)

## Installation

```sh
npm install gcx
```

## Command Line

`gcx` is a convenient way to deploy and call Google Cloud Functions.  To use as a command line application:

```sh
npm install --save-dev gcx
```

Then from your `package.json`, it's super easy to add a deploy script:

```json
"scripts": {
  "deploy": "gcx deploy my-awesome-function"
}
```

### Deploy positional arguments

#### FUNCTION_NAME

ID of the function or fully qualified identifier for the function. This positional must be specified if any of the other arguments in this group are specified.

### Flags

#### --description

User-provided description of a function.

#### --region

The cloud region for the function.  Defaults to `us-central1`.

#### --runtime

The runtime in which to run the function. Defaults to `nodejs20` for both 1st gen and 2nd gen functions.

Supported runtimes:

- nodejs20: Node.js 20 (Recommended)
- nodejs22: Node.js 22 (2nd gen only)
- nodejs24: Node.js 24 (2nd gen preview)
- nodejs18: Node.js 18
- nodejs16: Node.js 16
- nodejs14: Node.js 14 (legacy)
- python312: Python 3.12
- python311: Python 3.11
- python310: Python 3.10
- go121: Go 1.21
- go122: Go 1.22
- java17: Java 17
- java21: Java 21
- dotnet8: .NET 8
- ruby33: Ruby 3.3

#### --retry

If specified, then the function will be retried in case of a failure.

#### --memory

Limit on the amount of memory the function can use.
Allowed values are: 128MB, 256MB, 512MB, 1024MB, and 2048MB. By
default, a new function is limited to 256MB of memory. When deploying
an update to an existing function, the function will keep its old
memory limit unless you specify this flag.

#### --project

Project Id of the GCP project.

#### --target-dir

The directory that contains the sources to be deployed.  Defaults to the
current working directory.

#### --trigger-bucket

Google Cloud Storage bucket name. Every change in files in this
bucket will trigger function execution.

#### --trigger-http

Function will be assigned an endpoint, which you can view by using
the describe command. Any HTTP request (of a supported type) to the
endpoint will trigger function execution. Supported HTTP request
types are: POST, PUT, GET, DELETE, and OPTIONS.

#### --trigger-topic

Name of Pub/Sub topic. Every message published in this topic will
trigger function execution with message contents passed as input
data.

#### --trigger-event

Specifies which action should trigger the function. For a list of
acceptable values, call `gcloud functions event-types list`.

#### --trigger-resource=RESOURCE

Specifies which resource from `--trigger-event` is being observed. E.g.
if `--trigger-event` is `providers/cloud.storage/eventTypes/object.change`,
`--trigger-resource` must be a bucket name. For a list of expected resources,
call `gcloud functions event-types list`.

#### --timeout

The function execution timeout, e.g. 30s for 30 seconds. Defaults to
original value for existing function or 60 seconds for new functions.
Cannot be more than 540s.

#### --entryPoint

By default when a Google Cloud Function is triggered, it executes a
JavaScript function with the same name. Or, if it cannot find a
function with the same name, it executes a function named function. You
can use this flag to override the default behavior, by specifying the
name of a JavaScript function that will be executed when the Google
Cloud Function is triggered.

#### --network

The VPC Network that this cloud function can connect to. It can be
either the fully-qualified URI, or the short name of the network
resource. If the short network name is used, the network must belong
to the same project. Otherwise, it must belong to a project within the
same organization. The format of this field is either
`projects/{project}/global/networks/{network}` or `{network}`, where
`{project}` is a project id where the network is defined, and
`{network}` is the short name of the network.

#### --max-instances

The limit on the maximum number of function instances that may coexist
at a given time.

#### --allow-unauthenticated

Allow unauthenticated invocations of the function. This will set the IAM policy to allow `allUsers` to invoke the function, making it publicly accessible without authentication. Requires the `cloudfunctions.functions.setIamPolicy` permission. Typically used for public HTTP APIs.

### Cloud Functions (2nd gen) Specific Flags

#### --gen2

Deploy as a Cloud Functions (2nd gen) function. This enables access to additional features like concurrency, longer timeouts, traffic splitting, and min instances. 2nd gen functions run on Cloud Run infrastructure.

#### --min-instances

The minimum number of function instances that may exist at a given time. This helps reduce cold start latency by keeping instances warm. Only available for 2nd gen functions.

#### --concurrency

The maximum number of concurrent requests that each function instance can handle. Defaults to 1. Setting this higher allows a single instance to process multiple requests simultaneously, reducing costs and improving performance. Only available for 2nd gen functions.

#### --cpu

The amount of CPU to allocate to each function instance (e.g., '1' for 1 vCPU, '0.5' for half a vCPU). Only available for 2nd gen functions.

#### --ingress-settings

Controls what traffic can reach the function. Options:

- `ALLOW_ALL`: Allow all traffic (default)
- `ALLOW_INTERNAL_ONLY`: Allow only internal traffic
- `ALLOW_INTERNAL_AND_GCLB`: Allow internal traffic and traffic from Google Cloud Load Balancer

Only available for 2nd gen functions.

#### --vpc-connector-egress-settings

Controls which traffic uses the VPC connector. Options:

- `PRIVATE_RANGES_ONLY`: Only private IP ranges use the VPC connector (default)
- `ALL_TRAFFIC`: All traffic uses the VPC connector

Only available for 2nd gen functions.

#### --service-account

The email address of the IAM service account to use for both the build process and runtime execution. Only available for 2nd gen functions.

### Examples

```sh
# Deploy a 1st gen HTTP function
$ gcx deploy my-function --runtime nodejs20 --trigger-http

# Deploy a public HTTP function (no authentication required)
$ gcx deploy my-function --trigger-http --allow-unauthenticated

# Deploy a 2nd gen HTTP function with concurrency
$ gcx deploy my-function --gen2 --runtime nodejs22 --trigger-http --concurrency 10

# Deploy a 2nd gen function with min instances to reduce cold starts
$ gcx deploy my-function --gen2 --trigger-http --min-instances 1 --max-instances 10

# Deploy a 2nd gen Pub/Sub function
$ gcx deploy my-function --gen2 --trigger-topic my-topic --runtime python312

# Deploy a 2nd gen Storage function
$ gcx deploy my-function --gen2 --trigger-bucket my-bucket --runtime go122

# Deploy with custom service account and VPC settings
$ gcx deploy my-function --gen2 --trigger-http --service-account my-sa@project.iam.gserviceaccount.com --vpc-connector my-connector --ingress-settings ALLOW_INTERNAL_ONLY

# Update an existing function with new source code
$ gcx deploy my-function
```

## API

You can also use this as a regular old API.

### Deploying a 1st gen function

```js
const {deploy} = require('gcx');

async function main() {
  await deploy({
    name: 'my-fn-name',
    region: 'us-central1',
    runtime: 'nodejs20',
    triggerHTTP: true,
    allowUnauthenticated: true // Allow public access without authentication
  });
}
main().catch(console.error);
```

### Deploying a 2nd gen function

```js
const {deploy} = require('gcx');

async function main() {
  await deploy({
    name: 'my-fn-name',
    region: 'us-central1',
    runtime: 'nodejs22',
    triggerHTTP: true,
    gen2: true,
    concurrency: 10,
    minInstances: 1,
    maxInstances: 100,
    memory: 512,
    timeout: '60s'
  });
}
main().catch(console.error);
```

### Calling a function

```js
const {call} = require('gcx');

async function main() {
  const res = await call({
    functionName: 'my-fn-name',
    region: 'us-central1',
    data: JSON.stringify({hello: 'world'})
  });
  console.log(res.data);
}
main().catch(console.error);
```

## Authentication

This library uses [google-auth-library](https://www.npmjs.com/package/google-auth-library) under the hood to provide authentication.  That means you can authenticate a few ways.

### Using a service account

One of the reasons this library exists is to provide a nodejs native deployment in environments where you don't want to have the Cloud SDK installed.

For this method, you'll need to [create a service account](https://cloud.google.com/docs/authentication/getting-started), and download a key.

1. In the GCP Console, go to the [Create service account key](https://console.cloud.google.com/apis/credentials/serviceaccountkey?_ga=2.44822625.-475179053.1491320180) page.
1. From the Service account drop-down list, select New service account.
1. In the Service account name field, enter a name.
1. From the Role drop-down list, select Project > Owner.
1. Click Create. A JSON file that contains your key downloads to your computer.

```sh
export GOOGLE_APPLICATION_CREDENTIALS="./keys.json"
gcx deploy YOUR_FUNCTION_NAME
```

#### Using application default credentials

If you plan on only using this from your machine, and you have the Google Cloud SDK installed, you can just use application default credentials like this:

```sh
gcloud auth login
gcloud auth application-default login
gcloud config set project 'YOUR-AWESOME-PROJECT'
gcx deploy YOUR_FUNCTION_NAME
```

## License

[MIT](LICENSE)
