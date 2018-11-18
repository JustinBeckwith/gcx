# gcx
> An API and CLI for deploying Google Cloud Functions in Node.js.

[![Build Status](https://travis-ci.com/JustinBeckwith/gcx.svg?branch=master)](https://travis-ci.com/JustinBeckwith/gcx)

## Project status
Nascent, barely tested, and like 1/2 done.  I 💜 pull requests. Please don't use this in production yet.

## Installation
```
$ npm install gcx
```

## Command Line
`gcx` is a convenient way to deploy Google Cloud Functions.  To use as a command line application:

```
$ npm install --save-dev gcx
```

Then from your `package.json`, it's super easy to add a deploy script:

```json
"scripts": {
  "deploy": "gcx deploy"
}
```

### Flags

#### --name
ID of the function or fully qualified identifier for the function.
This positional must be specified if any of the other arguments in
this group are specified.

#### --description
    User-provided description of a function.

#### --region
The cloud region for the function.  Defaults to `us-central1`.

#### --runtime
The runtime in which to run the function. Defaults to nodejs8.
  - nodejs6
  - nodejs8
  - nodejs10
  - python37

#### --retry
If specified, then the function will be retried in case of a failure.

#### --memory
Limit on the amount of memory the function can use.
Allowed values are: 128MB, 256MB, 512MB, 1024MB, and 2048MB. By
default, a new function is limited to 256MB of memory. When deploying
an update to an existing function, the function will keep its old
memory limit unless you specify this flag.

#### --projectId
ProjectId of the GCP project.

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
at a given time. This feature is currently in alpha, available only
for whitelisted users.

### Examples

```
# Deploy a new function
$ gcx deploy --name myhook --runtime nodejs10 --trigger-http

# Update the same function with new source code
$ gcx deploy --name myhook

```

## API

You can also use this as a regular old API.

```js
const {deploy} = require('gcx');

async function main() {
  await deploy({
    name: 'my-fn-name',
    region: 'us-central1'
    ....
  });
}
main().catch(console.error);
```

# License
[MIT](LICENSE)
