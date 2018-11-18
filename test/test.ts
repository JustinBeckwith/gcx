import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import * as gcx from '../src';
const assertRejects = require('assert-rejects');

const unlink = util.promisify(fs.unlink);

const name = '🦄';
const gcloudignore = path.resolve('test/fixtures/.gcloudignore');
console.log(gcloudignore);

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
  it('should pack all of the files in the target dir', async () => {
    // const deployer = new gcx.Deployer({name});
    // const res = await deployer._pack();
    assert.ok('getting there');
  });
});
