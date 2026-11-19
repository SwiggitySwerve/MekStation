import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
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

test('all thirteen existing Linux browser legs use supported Ubuntu 24.04', () => {
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
  assert.equal(linux, 13);
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
      (step) => step.uses === './.github/actions/playwright-system-deps',
    );
    assert.ok(
      warm.if.includes("steps.playwright-cache.outputs.cache-hit == 'true'"),
    );
    assert.equal(
      job.steps.filter((step) => /playwright install-deps/.test(step.run))
        .length,
      0,
      `${workflow}/${id} must install system packages through the cached action`,
    );
  }
});

test('system-deps action keys on image + Playwright, installs hits without apt, and falls back visibly', () => {
  const action = readYaml('.github/actions/playwright-system-deps/action.yml');
  const steps = Object.fromEntries(
    action.runs.steps.map((s) => [s.id ?? s.name, s]),
  );
  const key = steps.key.run;
  for (const part of [
    'ImageOS',
    'ImageVersion',
    'playwright${playwright}',
    'PW_DEPS_CACHE_SALT',
  ])
    assert.ok(key.includes(part), `cache key must include ${part}`);
  assert.equal(steps.restore.uses, 'actions/cache/restore@v5');
  assert.ok(steps.cached.run.includes('sudo dpkg -i'));
  assert.ok(
    !/\bapt(-get)? (update|install)|npx playwright/.test(
      steps.cached.run
        .split('\n')
        .filter((line) => !line.trim().startsWith('echo'))
        .join('\n'),
    ),
  );
  assert.ok(steps.cached.run.includes('::warning::'));
  assert.equal(
    steps.full.run.trimEnd().split('\n').at(-1),
    'npx playwright install-deps chromium',
  );
  assert.equal(steps.full.if, "steps.cached.outputs.installed != 'true'");
  assert.ok(steps.full.run.includes('Keep-Downloaded-Packages'));
  // Stage the whole archive, filtered to installed versions, not a diff.
  assert.ok(steps.stage.run.includes('/var/cache/apt/archives/*.deb'));
  assert.ok(
    steps.stage.run.includes('grep -Fxq "$id" "$RUNNER_TEMP/dpkg-ii.txt"'),
  );
  assert.ok(!/debs-before|comm -13/.test(steps.stage.run + steps.full.run));
  for (const step of action.runs.steps) {
    assert.equal(step['continue-on-error'], undefined, step.name);
    assert.equal(step['timeout-minutes'], undefined, step.name);
  }
});

test('system-deps cache key appends -<salt> only when PW_DEPS_CACHE_SALT is non-empty', () => {
  const action = readYaml('.github/actions/playwright-system-deps/action.yml');
  const script = action.runs.steps.find((s) => s.id === 'key').run;
  const playwright = JSON.parse(
    fs.readFileSync(
      path.join(root, 'node_modules/@playwright/test/package.json'),
      'utf8',
    ),
  ).version;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-deps-key-'));
  const runKey = (extraEnv) => {
    const out = path.join(tmp, `out-${Math.random().toString(36).slice(2)}`);
    fs.writeFileSync(out, '');
    const env = { ...process.env, GITHUB_OUTPUT: out, ...extraEnv };
    for (const [name, value] of Object.entries(env))
      if (value === undefined) delete env[name];
    const result = spawnSync('bash', ['-c', script], { cwd: root, env });
    assert.equal(result.status, 0, String(result.stderr));
    return Object.fromEntries(
      fs
        .readFileSync(out, 'utf8')
        .trim()
        .split('\n')
        .map((line) => line.split(/=(.*)/s).slice(0, 2)),
    );
  };
  const image = { ImageOS: 'ubuntu24', ImageVersion: '20261111.370.1' };
  const arch = spawnSync('uname', ['-m'], { encoding: 'utf8' }).stdout.trim();
  const base = `playwright-system-debs-ubuntu24-20261111.370.1-${arch}-playwright${playwright}`;
  try {
    const salted = runKey({ ...image, PW_DEPS_CACHE_SALT: 'salt-proof-1' });
    assert.equal(salted.enabled, 'true');
    assert.equal(salted.key, `${base}-salt-proof-1`);
    assert.equal(runKey({ ...image, PW_DEPS_CACHE_SALT: undefined }).key, base);
    assert.equal(runKey({ ...image, PW_DEPS_CACHE_SALT: '' }).key, base);
    const noImage = runKey({ ImageOS: undefined, ImageVersion: undefined });
    assert.equal(noImage.enabled, 'false');
    assert.equal(noImage.key, undefined);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('no workflow leaves the forced-miss cache salt set', () => {
  for (const file of fs.readdirSync(path.join(root, '.github/workflows'))) {
    assert.ok(
      !fs
        .readFileSync(path.join(root, '.github/workflows', file), 'utf8')
        .includes('PW_DEPS_CACHE_SALT'),
      `${file} sets PW_DEPS_CACHE_SALT`,
    );
  }
});
