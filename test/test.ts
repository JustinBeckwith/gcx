import * as assert from 'assert';
import * as fs from 'fs';
import * as nock from 'nock';
import * as path from 'path';
import * as util from 'util';

import * as gcx from '../src';

// tslint:disable-next-line variable-name
const Zip = require('node-stream-zip');
const assertRejects = require('assert-rejects');

nock.disableNetConnect();

const unlink = util.promisify(fs.unlink);

const name = '🦄';
const targetDir = path.resolve('test/fixtures/');
const gcloudignore = path.resolve('test/fixtures/.gcloudignore');

describe('validation', () => {
  it('should throw if a name is not provided', () => {
    assertRejects(gcx.deploy({} as gcx.DeployerOptions));
  });

  it('should throw if multiple triggers are provided', () => {
    assertRejects(
        gcx.deploy({name, triggerBucket: 'bukkit', triggerTopic: 'toppi'}));
  });
});

describe('ignore rules', () => {
  it('should return 0 rules if no .gcloudignore is availabe', async () => {
    const deployer = new gcx.Deployer({name});
    const rules = await deployer._getIgnoreRules();
    assert.deepStrictEqual(rules, []);
  });

  it('should return expected rules if .gcloudignore is availabe', async () => {
    const expected =
        ['.gcloudignore', '.git', '.gitignore', 'node_modules', 'test/'];
    await new Promise((resolve, reject) => {
      fs.createReadStream(gcloudignore)
          .pipe(fs.createWriteStream('.gcloudignore'))
          .on('close', resolve)
          .on('error', reject);
    });
    const deployer = new gcx.Deployer({name});
    const rules = await deployer._getIgnoreRules();
    await unlink('.gcloudignore');
    assert.deepStrictEqual(rules, expected);
  });
});

describe('pack & upload', () => {
  let zipFile: string;

  it('should pack all of the files in the target dir', async () => {
    const deployer = new gcx.Deployer({name, targetDir});
    zipFile = await deployer._pack();
    const zip = new Zip({file: zipFile, storeEntries: true});
    await new Promise((resolve, reject) => {
      zip.on('error', reject).on('ready', () => {
        const files = Object.keys(zip.entries());
        assert.strictEqual(files.length, 2);
        assert.deepStrictEqual(files.sort(), ['index.js', 'package.json'].sort());
        zip.close();
        resolve();
      });
    });
  });

  it('should PUT the file to Google Cloud Storage', async () => {
    const deployer = new gcx.Deployer({name, targetDir});
    const scope = mockUpload();
    await deployer._upload(zipFile, 'https://fake.local');
    scope.done();
  });
});

describe('cloud functions api', () => {
  it('should check to see if the function exists', async () => {
    const scopes = [mockGCE(), mockToken(), mockExists()];
    const deployer = new gcx.Deployer({name});
    const fullName = `projects/el-gato/locations/us-central1/functions/${name}`;
    const exists = await deployer._exists(fullName);
    assert.strictEqual(exists, true);
    scopes.forEach(s => s.done());
  });
});

describe('end to end', () => {
  it('should deploy end to end', async () => {
    const scopes = [mockUploadUrl(), mockUpload(), mockDeploy(), mockPoll()];
    const projectId = 'el-gato';
    const deployer = new gcx.Deployer({name, targetDir, projectId});
    await deployer.deploy();
    scopes.forEach(s => s.done());
  });

  it('should call end to end', async () => {
    mockUploadUrl(), mockUpload(), mockDeploy(), mockPoll();
    const c = new gcx.Caller();
    c.call(name);
  });
});

function mockGCE() {
  return nock('http://metadata.google.internal')
      .get('/computeMetadata/v1/instance')
      .reply(200, {}, {'Metadata-Flavor': 'Google'});
}

function mockToken() {
  return nock('http://metadata.google.internal')
      .get('/computeMetadata/v1/instance/service-accounts/default/token')
      .reply(200, {access_token: '12345'}, {'Metadata-Flavor': 'Google'});
}

function mockUpload() {
  return nock('https://fake.local', {
           reqheaders: {
             'Content-Type': 'application/zip',
             'x-goog-content-length-range': '0,104857600'
           }
         })
      .put('/')
      .reply(200);
}

function mockUploadUrl() {
  return nock('https://cloudfunctions.googleapis.com')
      .post(
          '/v1/projects/el-gato/locations/us-central1/functions:generateUploadUrl')
      .reply(200, {uploadUrl: 'https://fake.local'});
}

function mockDeploy() {
  return nock('https://cloudfunctions.googleapis.com')
      .post('/v1/projects/el-gato/locations/us-central1/functions')
      .reply(200, {name: 'not-a-real-operation'});
}

function mockPoll() {
  return nock('https://cloudfunctions.googleapis.com')
      .get('/v1/not-a-real-operation')
      .reply(200, {done: true});
}

function mockExists() {
  return nock('https://cloudfunctions.googleapis.com')
      .get('/v1/projects/el-gato/locations/us-central1/functions/%F0%9F%A6%84')
      .reply(200);
}
