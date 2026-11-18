import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { buildLaneInvocations } from '../jest/run-jest-lane.mjs';

const script = fileURLToPath(
  new URL('../jest/run-jest-lane.mjs', import.meta.url),
);

const perfBaseArgs = [
  'jest',
  '--selectProjects',
  'unit',
  '--watchAll=false',
  '--runInBand',
  '--runTestsByPath',
];

test('corpus forwards --maxWorkers after its own args', () => {
  const plan = buildLaneInvocations('corpus', ['--maxWorkers=3']);
  assert.deepEqual(plan.env, { JEST_SPLIT_CORPUS: 'true' });
  assert.deepEqual(
    plan.invocations.map((i) => i.args),
    [
      [
        'jest',
        '--selectProjects',
        'corpus',
        '--watchAll=false',
        '--maxWorkers=3',
      ],
    ],
  );
});

test('stable forwards a test path and -t name in order', () => {
  const plan = buildLaneInvocations('stable', [
    'src/foo.test.ts',
    '-t',
    'some name',
  ]);
  assert.deepEqual(plan.env, { JEST_EXCLUDE_PERF_SENSITIVE: 'true' });
  assert.deepEqual(
    plan.invocations.map((i) => i.args),
    [['jest', '--watchAll=false', 'src/foo.test.ts', '-t', 'some name']],
  );
});

test('roadmap with no extras keeps its args unchanged', () => {
  const plan = buildLaneInvocations('roadmap', []);
  assert.deepEqual(
    plan.invocations.map((i) => i.args),
    [['jest', '--selectProjects', 'roadmap', '--watchAll=false']],
  );
});

test('perf-sensitive refuses any extra argument with exit 2', () => {
  const plan = buildLaneInvocations('perf-sensitive', ['--maxWorkers=3']);
  assert.equal(plan.invocations, undefined);
  assert.equal(plan.exitCode, 2);
  assert.equal(
    plan.error,
    'perf-sensitive runs fixed files --runInBand; extra arguments are not supported: --maxWorkers=3',
  );
});

test('perf-sensitive with no extras runs one invocation per isolated path', () => {
  const plan = buildLaneInvocations('perf-sensitive', []);
  assert.deepEqual(plan.env, { SIMULATION_PERF_ASSERTIONS: 'true' });
  assert.equal(plan.invocations.length, 10);
  for (const { label, args } of plan.invocations) {
    assert.deepEqual(args, [...perfBaseArgs, label]);
  }
  assert.equal(
    plan.invocations[0].label,
    'src/simulation/__tests__/simulation.test.ts',
  );
  assert.equal(
    plan.invocations.at(-1).label,
    'src/__tests__/performance.test.tsx',
  );
});

test('an unknown lane keeps its error and exit 1', () => {
  for (const lane of ['nope', undefined]) {
    const plan = buildLaneInvocations(lane, []);
    assert.equal(plan.exitCode, 1);
    assert.equal(
      plan.error,
      `Unknown Jest lane "${lane ?? ''}". Expected one of: stable, corpus, roadmap, perf-sensitive`,
    );
  }
});

// Spawns node (not Jest): the refusal happens before any Jest process starts.
test('the CLI exits 2 for perf-sensitive plus an extra arg', () => {
  const result = spawnSync(
    process.execPath,
    [script, 'perf-sensitive', '--foo'],
    { encoding: 'utf8' },
  );
  assert.equal(result.status, 2);
  assert.match(
    result.stderr,
    /perf-sensitive runs fixed files --runInBand; extra arguments are not supported: --foo/,
  );
  assert.equal(result.stdout, '');
});
