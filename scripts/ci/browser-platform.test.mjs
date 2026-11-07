import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

import { cachePlatform } from '../../.github/actions/setup-node-and-install/cache-platform.mjs';
import { expandJob, readWorkflow } from './budget-workflow.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const readYaml = (file) =>
  parse(fs.readFileSync(path.join(root, file), 'utf8'));
const workflows = {
  pr: readWorkflow(root),
  nightly: readYaml('.github/workflows/nightly-validation.yml'),
  camp: readYaml('.github/workflows/camp01-live-adversarial.yml'),
};
const browserJobs = [
  ['pr', 'e2e'],
  ['nightly', 'e2e-full'],
  ['nightly', 'scenario-pack-recapture'],
  ['nightly', 'subsystem-lanes'],
  ['camp', 'publish-live-evidence'],
];

test('Linux native/browser namespaces separate both OS releases and architectures', () => {
  const platform = (release, arch = 'X64') =>
    cachePlatform({ os: 'Linux', arch, release });
  assert.equal(
    platform('NAME="Ubuntu"\nID=ubuntu\nVERSION_ID="24.04"\n'),
    'Linux-ubuntu-24.04-X64',
  );
  assert.equal(
    platform("ID='ubuntu'\nVERSION_ID=26.04\n"),
    'Linux-ubuntu-26.04-X64',
  );
  assert.equal(
    platform('ID=ubuntu\r\nVERSION_ID="24.04"\r\n', 'ARM64'),
    'Linux-ubuntu-24.04-ARM64',
  );
  assert.equal(platform('ID=debian\nVERSION_ID=13'), 'Linux-debian-13-X64');
});

test('missing or invalid Linux evidence fails without generic cache fallback or shell evaluation', () => {
  for (const release of [
    null,
    '',
    'ID=ubuntu',
    'VERSION_ID=24.04',
    'ID=ubuntu\nVERSION_ID=""',
    'ID=ubuntu\nVERSION_ID="24.04',
    'ID=$(uname)\nVERSION_ID=24.04',
    'ID=ubuntu\nVERSION_ID=24.04\nID=debian',
    'ID=ubuntu\nVERSION_ID=24.04\nVERSION_ID=26.04',
  ]) {
    assert.throws(
      () => cachePlatform({ os: 'Linux', arch: 'X64', release }),
      /Linux/,
    );
  }
  assert.throws(
    () =>
      cachePlatform({
        os: 'Linux',
        arch: 'unknown',
        release: 'ID=ubuntu\nVERSION_ID=24.04',
      }),
    /architecture/,
  );
  assert.throws(() => cachePlatform({ os: 'unknown' }), /Unknown runner OS/);
});

test('Windows and macOS keep existing namespaces without reading Linux metadata', () => {
  assert.equal(cachePlatform({ os: 'Windows' }), 'Windows');
  assert.equal(cachePlatform({ os: 'macOS' }), 'macOS');
});

test('all eleven existing Linux browser legs use supported Ubuntu 24.04', () => {
  let linux = 0;
  let windows = 0;
  for (const [workflow, id] of browserJobs) {
    const job = workflows[workflow].jobs[id];
    for (const row of expandJob(id, job)) {
      const runner = row.matrix.os ?? job['runs-on'];
      if (runner === 'windows-latest') windows++;
      else {
        assert.equal(runner, 'ubuntu-24.04', `${workflow}/${id}`);
        linux++;
      }
    }
  }
  assert.equal(linux, 11);
  assert.equal(windows, 1);
});

test('browser caches consume the same release-scoped namespace as native modules', () => {
  const action = readYaml('.github/actions/setup-node-and-install/action.yml');
  assert.equal(
    action.outputs['cache-platform']?.value,
    '${{ steps.cache-platform.outputs.key }}',
  );
  const platform = action.runs.steps.find(
    (step) => step.id === 'cache-platform',
  );
  assert.equal(platform.run, 'node "$ACTION_PATH/cache-platform.mjs"');
  assert.equal(platform.env.ACTION_PATH, '${{ github.action_path }}');
  const modules = action.runs.steps.find(
    (step) => step.id === 'node-modules-cache',
  );
  assert.equal(
    modules.with.key,
    "${{ steps.cache-platform.outputs.key }}-node${{ inputs.node-version }}-modules-${{ hashFiles('package-lock.json', 'desktop/package-lock.json') }}",
  );
  assert.equal(modules.with['restore-keys'], undefined);
  const native = action.runs.steps.find(
    (step) => step.name === 'Verify native SQLite module',
  );
  assert.equal(native.if, "inputs.verify-native-modules == 'true'");
  assert.ok(native.run.includes('require("better-sqlite3")'));
  assert.ok(
    native.run.includes('db.prepare("SELECT 42 AS value").get().value !== 42'),
  );
  for (const [workflow, id] of browserJobs) {
    const job = workflows[workflow].jobs[id];
    const setup = job.steps.find(
      (step) => step.uses === './.github/actions/setup-node-and-install',
    );
    assert.equal(setup.id, 'setup');
    assert.equal(
      setup.with['verify-native-modules'],
      workflow === 'camp' ? "${{ runner.os == 'Linux' }}" : 'true',
    );
    const cache = job.steps.find((step) => step.id === 'playwright-cache');
    assert.equal(
      cache.with.key,
      '${{ steps.setup.outputs.cache-platform }}-playwright-${{ steps.playwright-version.outputs.version }}',
    );
    assert.equal(cache.with['restore-keys'], undefined);
    const cold = job.steps.find((step) =>
      /playwright install (?:--with-deps chromium|chromium --with-deps)/.test(
        step.run,
      ),
    );
    assert.ok(
      cold.if.includes("steps.playwright-cache.outputs.cache-hit != 'true'"),
    );
    const warm = job.steps.find(
      (step) => step.run === 'npx playwright install-deps chromium',
    );
    assert.ok(
      warm.if.includes("steps.playwright-cache.outputs.cache-hit == 'true'"),
    );
  }
});
