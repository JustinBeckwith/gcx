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
        assert.deepStrictEqual(files, ['index.js', 'package.json']);
        zip.close();
        resolve();
      });
    });
  });

  it('should PUT the file to Google Cloud Storage', async () => {
    const deployer = new gcx.Deployer({name, targetDir});
    const url = 'https://fake.local';
    const scope = nock(url, {
                    reqheaders: {
                      'Content-Type': 'application/zip',
                      'x-goog-content-length-range': '0,104857600'
                    }
                  })
                      .put('/')
                      .reply(200);
    await deployer._upload(zipFile, 'https://fake.local');
    scope.done();
  });
});
