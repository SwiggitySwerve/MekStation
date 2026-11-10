import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

import {
  CI_SUITES,
  parseInvocation,
  planShards,
  suitesForDataSpecs,
} from './ci-e2e-plan.mjs';
import {
  decodeChangedPaths,
  changedUnitFiles,
  refsForFiles,
  specsForChangedUnits,
} from './unit-spec-refs.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const tripodDir = 'public/data/units/battlemechs/6-dark-age/';
const tripodFiles = [
  "experimental/'Scout Tripod' R-H3L-1X.json",
  ...['Zeus', 'Hera', 'Hades', 'Aphrodite', 'Hephaestus', 'Apollo'].map(
    (name, i) =>
      `experimental/Ares ARS-V1${i ? 'ABCDE'[i - 1] : ''} ${name}.json`,
  ),
  'experimental/Poseidon PSD-V2.json',
  'experimental/Triskelion TRK-4V.json',
  "standard/'Battle Tripod' R-H3L-2X.json",
  "standard/'Harvester Tripod' R-H3L-3X.json",
].map((file) => tripodDir + file);

test('#3305 replay selects crew-roster directly and through its fixture, plus audit-capture', () => {
  assert.equal(tripodFiles.length, 11);
  const report = refsForFiles(root, tripodFiles);
  assert.deepEqual(report.specs, [
    'e2e/audit-capture.spec.ts',
    'e2e/customizer-mech-crew-roster.spec.ts',
  ]);
  const poseidon = report.units.find(({ id }) => id === 'poseidon-psd-v2');
  for (const file of [
    'e2e/customizer-mech-crew-roster.spec.ts',
    'e2e/fixtures/mech-crew-save-losses.json',
  ])
    assert.ok(
      poseidon.hits.some((hit) => hit.file === file),
      file,
    );
  const text = new Map([
    [
      'e2e/fixtures/mech-crew-save-losses.json',
      fs.readFileSync(
        path.join(root, 'e2e/fixtures/mech-crew-save-losses.json'),
        'utf8',
      ),
    ],
    [
      'e2e/customizer-mech-crew-roster.spec.ts',
      "import cases from './fixtures/mech-crew-save-losses.json';",
    ],
  ]);
  assert.deepEqual(specsForChangedUnits([poseidon], text).specs, [
    'e2e/customizer-mech-crew-roster.spec.ts',
  ]);
});

test('NUL-separated non-ASCII paths survive and a forced count mismatch fails', () => {
  const file = 'public/data/units/Mék 日本.json';
  assert.deepEqual(decodeChangedPaths(file + '\0', '"quoted path"\n'), [file]);
  assert.throws(
    () => decodeChangedPaths(file + '\0', 'one\ntwo\n'),
    /count mismatch/,
  );
});

test('git diff counts an actual non-ASCII changed unit path', (t) => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'unit-spec-path-'));
  t.after(() => fs.rmSync(repo, { recursive: true, force: true }));
  const file = 'public/data/units/Mék 日本.json';
  fs.mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
  fs.writeFileSync(path.join(repo, file), JSON.stringify(unit));
  execFileSync('git', ['-C', repo, 'init', '--quiet']);
  execFileSync('git', ['-C', repo, 'add', '--', file]);
  assert.deepEqual(changedUnitFiles('--cached', { repo }), [file]);
  assert.throws(
    () =>
      changedUnitFiles('base...head', {
        git: (args) => (args.includes('-z') ? file + '\0' : ''),
      }),
    /count mismatch/,
  );
});

const unit = { id: 'x-y', chassis: 'X', model: 'Y', name: 'X Y' };
test('fields-near reaches transitive fixture/helper consumers; bare chassis and distant fields do not', () => {
  const text = new Map([
    ['e2e/fixtures/unit.json', "chassis: 'X',\nmodel: 'Y'"],
    ['e2e/helpers/open.ts', "import unit from '../fixtures/unit.json';"],
    ['e2e/open.spec.ts', "import { open } from './helpers/open';"],
    ['e2e/bare.spec.ts', "chassis: 'X'"],
    ['e2e/far.spec.ts', "chassis: 'X'\n\n\n\n\n\nmodel: 'Y'"],
  ]);
  assert.deepEqual(specsForChangedUnits([unit], text).specs, [
    'e2e/open.spec.ts',
  ]);
});

test('id tokens and full names match, and cyclic helper imports terminate', () => {
  const text = new Map([
    ['e2e/id.spec.ts', "'x-y'"],
    ['e2e/prefix.spec.ts', "'x-y-extra'"],
    ['e2e/name.spec.ts', "'Example Long'"],
    ['e2e/helpers/a.ts', "'x-y'; import './b';"],
    ['e2e/helpers/b.ts', "import './a';"],
    ['e2e/cycle.spec.ts', "import './helpers/b';"],
  ]);
  assert.deepEqual(
    specsForChangedUnits([{ ...unit, name: 'Example Long' }], text).specs,
    ['e2e/cycle.spec.ts', 'e2e/id.spec.ts', 'e2e/name.spec.ts'],
  );
});

test('no unit change returns empty without reading a repository and preserves the exact plan bytes', () => {
  assert.deepEqual(refsForFiles('/nonexistent', ['src/example.ts']).specs, []);
  const tests = CI_SUITES.flatMap(({ files }) =>
    files.map((file) => ({ file, project: 'chromium', key: file })),
  );
  const timing = {
    version: 1,
    milliseconds: Object.fromEntries(tests.map(({ key }) => [key, 100])),
  };
  // Captured from the unmodified planner at 3024c37b4, before adding this trigger.
  assert.equal(
    crypto
      .createHash('sha256')
      .update(JSON.stringify(planShards(tests, timing)))
      .digest('hex'),
    'e09366de9ea14efa9e5531e958c5948f1c82939337004809963a4c951700f824',
  );
  assert.equal(
    JSON.stringify(planShards(tests, timing, 2, [])),
    JSON.stringify(planShards(tests, timing)),
  );
  assert.deepEqual(suitesForDataSpecs([]), CI_SUITES);
});

test('fixed PR specs are excluded from the generated list and the dynamic suite', () => {
  const fixed = CI_SUITES.flatMap(({ files }) =>
    files.map((file) => `e2e/${file}`),
  );
  assert.deepEqual(refsForFiles(root, tripodFiles, { exclude: fixed }).specs, [
    'e2e/audit-capture.spec.ts',
  ]);
  assert.deepEqual(
    suitesForDataSpecs([...fixed, 'e2e/audit-capture.spec.ts']).at(-1).files,
    ['audit-capture.spec.ts'],
  );
});

test('data invocation pins its shard, workers, output and configured retry policy', () => {
  const data = ['e2e/audit-capture.spec.ts'];
  const argv = [
    'test',
    '--data-specs',
    '--project=chromium',
    '--workers=1',
    '--shard=2/2',
    '--output=test-results/data',
  ];
  assert.equal(parseInvocation(argv, data).suite.name, 'data');
  assert.throws(() => parseInvocation(argv, []), /Unknown/);
  assert.throws(
    () => parseInvocation([...argv, '--retries=10'], data),
    /invocation changed/,
  );
  assert.deepEqual(suitesForDataSpecs(data).at(-1).options, []);
  for (const invalid of ['e2e/../outside.spec.ts', 'outside.spec.ts', null])
    assert.throws(() => suitesForDataSpecs([invalid]), /Invalid/);
});

test('the workflow transports the generated JSON to all existing shard invocations and skips empty data', () => {
  const { jobs } = parse(
    fs.readFileSync(path.join(root, '.github/workflows/pr-checks.yml'), 'utf8'),
  );
  assert.equal(
    jobs['detect-changes'].outputs['data-specs'],
    '${{ steps.filter.outputs.data-specs }}',
  );
  assert.equal(jobs['detect-changes'].steps[0].with['fetch-depth'], 2);
  assert.equal(
    jobs.e2e.env.CI_E2E_DATA_SPECS,
    "${{ needs.detect-changes.outputs.data-specs || '[]' }}",
  );
  assert.deepEqual(jobs.e2e.strategy.matrix.shard, [1, 2]);
  assert.equal(jobs.e2e['timeout-minutes'], 15);
  const data = jobs.e2e.steps.find(
    ({ name }) => name === 'Run data-keyed unit regression specs',
  );
  assert.equal(
    data.if,
    "${{ !cancelled() && needs.detect-changes.outputs.data-specs != '' && needs.detect-changes.outputs.data-specs != '[]' }}",
  );
  assert.equal(
    data.run,
    'node scripts/playwright/run-ci-e2e.mjs test --data-specs --project=chromium --workers=1 --shard=${{ matrix.shard }}/2 --output=test-results/data',
  );
  assert.equal(
    data.env.MEKSTATION_E2E_SERVER_COMMAND,
    'node .next/standalone/server.js',
  );
  assert.equal(data['continue-on-error'], undefined);
  assert.ok(jobs['lint-and-test'].needs.includes('e2e'));
});

test('data files are allocated by measured file weight; unmeasured tests retain the maximum fallback', () => {
  const fixed = CI_SUITES.flatMap(({ files }) =>
    files.map((file) => ({ file, project: 'chromium', key: file })),
  );
  const data = ['e2e/audit-capture.spec.ts', 'e2e/unknown.spec.ts'];
  const added = [
    'audit-capture.spec.ts',
    'audit-capture.spec.ts',
    'unknown.spec.ts',
  ].map((file, i) => ({ file, project: 'chromium', key: `data ${i}` }));
  const timing = {
    version: 1,
    milliseconds: Object.fromEntries(fixed.map(({ key }) => [key, 100])),
    fileMilliseconds: { 'audit-capture.spec.ts': 153118 },
  };
  const plan = planShards([...fixed, ...added], timing, 2, data);
  const tasks = plan.shards
    .flatMap(({ tasks }) => tasks)
    .filter(({ suite }) => suite === 'data');
  assert.equal(
    tasks.reduce((sum, t) => sum + t.milliseconds, 0),
    153218,
  );
  assert.equal(plan.unknown, 1);
  assert.equal(tasks.flatMap(({ tests }) => tests).length, 3);
  assert.throws(() => planShards(fixed, timing, 2, data), /Missing PR spec/);
  assert.throws(
    () =>
      planShards(
        [...fixed, ...added],
        { ...timing, fileMilliseconds: { 'audit-capture.spec.ts': -1 } },
        2,
        data,
      ),
    /Invalid/,
  );
});
