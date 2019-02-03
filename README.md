# gcx
> An API and CLI for deploying and calling Google Cloud Functions in Node.js.

[![NPM Version](https://img.shields.io/npm/v/gcx.svg)](https://npmjs.org/package/gcx)
[![Build Status](https://travis-ci.com/JustinBeckwith/gcx.svg?branch=master)](https://travis-ci.com/JustinBeckwith/gcx)
[![codecov](https://codecov.io/gh/JustinBeckwith/gcx/branch/master/graph/badge.svg)](https://codecov.io/gh/JustinBeckwith/gcx)
[![style badge](https://img.shields.io/badge/code%20style-Google%20%E2%98%82%EF%B8%8F-blue.svg)](https://www.npmjs.com/package/gts)

## Installation
```sh
$ npm install gcx
```

## Command Line
`gcx` is a convenient way to deploy and call Google Cloud Functions.  To use as a command line application:

```sh
$ npm install --save-dev gcx
```

Then from your `package.json`, it's super easy to add a deploy script:

```json
"scripts": {
  "deploy": "gcx deploy my-awesome-function"
}
```

### Deploy positional arguments

##### FUNCTION_NAME
ID of the function or fully qualified identifier for the function. This positional must be specified if any of the other arguments in this group are specified.

### Flags

##### --description
User-provided description of a function.

##### --region
The cloud region for the function.  Defaults to `us-central1`.

##### --runtime
The runtime in which to run the function. Defaults to nodejs8.
  - nodejs6
  - nodejs8
  - nodejs10
  - python37

##### --retry
If specified, then the function will be retried in case of a failure.

##### --memory
Limit on the amount of memory the function can use.
Allowed values are: 128MB, 256MB, 512MB, 1024MB, and 2048MB. By
default, a new function is limited to 256MB of memory. When deploying
an update to an existing function, the function will keep its old
memory limit unless you specify this flag.

##### --project
Project Id of the GCP project.

##### --target-dir
The directory that contains the sources to be deployed.  Defaults to the
current working directory.

##### --trigger-bucket
Google Cloud Storage bucket name. Every change in files in this
bucket will trigger function execution.

##### --trigger-http
Function will be assigned an endpoint, which you can view by using
the describe command. Any HTTP request (of a supported type) to the
endpoint will trigger function execution. Supported HTTP request
types are: POST, PUT, GET, DELETE, and OPTIONS.

##### --trigger-topic
Name of Pub/Sub topic. Every message published in this topic will
trigger function execution with message contents passed as input
data.

##### --trigger-event
Specifies which action should trigger the function. For a list of
acceptable values, call `gcloud functions event-types list`.

##### --trigger-resource=RESOURCE
Specifies which resource from `--trigger-event` is being observed. E.g.
if `--trigger-event` is `providers/cloud.storage/eventTypes/object.change`,
`--trigger-resource` must be a bucket name. For a list of expected resources,
call `gcloud functions event-types list`.

##### --timeout
The function execution timeout, e.g. 30s for 30 seconds. Defaults to
original value for existing function or 60 seconds for new functions.
Cannot be more than 540s.

##### --entryPoint
By default when a Google Cloud Function is triggered, it executes a
JavaScript function with the same name. Or, if it cannot find a
function with the same name, it executes a function named function. You
can use this flag to override the default behavior, by specifying the
name of a JavaScript function that will be executed when the Google
Cloud Function is triggered.

##### --network
The VPC Network that this cloud function can connect to. It can be
either the fully-qualified URI, or the short name of the network
resource. If the short network name is used, the network must belong
to the same project. Otherwise, it must belong to a project within the
same organization. The format of this field is either
`projects/{project}/global/networks/{network}` or `{network}`, where
`{project}` is a project id where the network is defined, and
`{network}` is the short name of the network.

##### --max-instances
The limit on the maximum number of function instances that may coexist
at a given time. This feature is currently in alpha, available only
for whitelisted users.

### Examples

```sh
# Deploy a new function
$ gcx deploy myhook --runtime nodejs10 --trigger-http

# Update the same function with new source code
$ gcx deploy myhook
```

## API
You can also use this as a regular old API.

```js
const {call, deploy} = require('gcx');

async function main() {
  await deploy({
    name: 'my-fn-name',
    region: 'us-central1'
    ...
  });
  const res = await call({
    functionName: 'my-fn-name',
  });
}
main().catch(console.error);
```

## Authentication
This library uses [google-auth-library](https://www.npmjs.com/package/google-auth-library) under the hood to provide authentication.  That means you can authenticate a few ways.

#### Using a service account
One of the reasons this library exists is to provide a nodejs native deployment in environments where you don't want to have the Cloud SDK installed.

For this method, you'll need to [create a service account](https://cloud.google.com/docs/authentication/getting-started), and download a key.

1. In the GCP Console, go to the [Create service account key](https://console.cloud.google.com/apis/credentials/serviceaccountkey?_ga=2.44822625.-475179053.1491320180) page.
1. From the Service account drop-down list, select New service account.
1. In the Service account name field, enter a name.
1. From the Role drop-down list, select Project > Owner.
1. Click Create. A JSON file that contains your key downloads to your computer.

```sh
$ export GOOGLE_APPLICATION_CREDENTIALS="./keys.json"
$ gcx deploy YOUR_FUNCTION_NAME
```

#### Using application default credentials
If you plan on only using this from your machine, and you have the Google Cloud SDK installed, you can just use application default credentials like this:

```sh
$ gcloud auth login
$ gcloud auth application-default login
$ gcloud config set project 'YOUR-AWESOME-PROJECT'
$ gcx deploy YOUR_FUNCTION_NAME
```

## License
[MIT](LICENSE)
