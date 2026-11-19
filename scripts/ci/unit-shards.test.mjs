// The PR Checks unit shards partition the unit census: every unit test file
// runs in exactly one `Unit Tests (I/N)` job, with the planner and preload CI uses.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';

import { readWorkflow } from './budget-workflow.mjs';

const require = createRequire(import.meta.url);
const DurationSequencer = require('../../config/jest/duration-sequencer.js');
const { preloadFor } = require('../../config/jest/shard-planner.js');

const root = process.cwd();
const workflow = readWorkflow(root);

/** The unit census exactly as the shard step selects it (same project and env). */
function unitCensus() {
  const stdout = execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules/jest/bin/jest.js'),
      '--listTests',
      '--json',
      '--selectProjects',
      'unit',
    ],
    {
      cwd: root,
      env: {
        ...process.env,
        JEST_SPLIT_CORPUS: 'true',
        JEST_EXCLUDE_PERF_SENSITIVE: 'true',
      },
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      timeout: 120000,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    },
  );
  const files = JSON.parse(
    stdout
      .split('\n')
      .reverse()
      .find((line) => line.startsWith('[')),
  );
  assert.ok(Array.isArray(files) && files.length > 100, 'unit census');
  return files;
}

/** The shard count the job passes to Jest, and the matrix legs that run. */
function shardLayout(jobs) {
  const job = jobs['unit-test-shards'];
  const step = job.steps.find((s) => s.name === 'Run unit test shard');
  const count = Number(
    /--shard \$\{\{ matrix\.shard \}\}\/(\d+) /.exec(step.run)?.[1],
  );
  return { job, count, legs: job.strategy.matrix.shard };
}

/** Each leg's files from the CI sequencer; throws unless they partition `files`. */
function assertPartition(files, { count, legs }) {
  const tests = files.map((file) => ({
    path: file,
    context: { config: { rootDir: root, displayName: { name: 'unit' } } },
  }));
  const owner = new Map();
  for (const shardIndex of legs) {
    const mine = new DurationSequencer().shard(tests, {
      shardIndex,
      shardCount: count,
    });
    assert.ok(mine.length > 0, `shard ${shardIndex}/${count} is empty`);
    for (const t of mine) {
      assert.ok(!owner.has(t.path), `${t.path} runs in two shards`);
      owner.set(t.path, shardIndex);
    }
  }
  const missing = files.filter((file) => !owner.has(file));
  assert.deepEqual(
    missing.slice(0, 5),
    [],
    `${missing.length} files never run`,
  );
  return owner;
}

test('unit tests run in four shards whose name, matrix and Jest shard agree', () => {
  const { job, count, legs } = shardLayout(workflow.jobs);
  assert.equal(count, 4);
  assert.deepEqual(legs, [1, 2, 3, 4]);
  assert.equal(job.name, `Unit Tests (\${{ matrix.shard }}/${count})`);
  // The planner's preload for this layout is the one Jest will apply.
  assert.equal(preloadFor(['unit'], count)?.length, count);
  // Corpus halves stay on shards 1 and 2, the combat suite on shard 3.
  const ifOf = (name) => job.steps.find((s) => s.name === name).if;
  assert.match(ifOf('Run corpus test shard'), /matrix\.shard <= 2 /);
  assert.match(ifOf('Validate Combat Suite'), /matrix\.shard == 3 /);
});

test('the shards partition the unit census, and a dropped shard leaves files unrun', () => {
  const files = unitCensus();
  const layout = shardLayout(workflow.jobs);
  const owner = assertPartition(files, layout);
  assert.equal(owner.size, files.length);
  // Mutant: one matrix leg removed while Jest still splits four ways.
  assert.throws(
    () => assertPartition(files, { ...layout, legs: layout.legs.slice(0, -1) }),
    /files never run/,
  );
});

// The roadmap step's condition while it ran in Static Checks (main cf0c5bb8a
// and earlier). Its gate is kept byte for byte; only the shard clause is added.
const STATIC_ROADMAP_IF =
  "${{ !cancelled() && needs.detect-changes.outputs.roadmap == 'true' }}";

/** Throws unless the roadmap project runs once, on shard 4 only, after its tests. */
function assertRoadmapPlacement(jobs) {
  const runners = Object.entries(jobs).flatMap(([id, job]) =>
    (job.steps ?? [])
      .filter((s) => /--selectProjects roadmap\b/.test(s.run ?? ''))
      .map((step) => ({ id, step })),
  );
  assert.equal(runners.length, 1, 'one step runs the roadmap project');
  const [{ id, step }] = runners;
  assert.equal(id, 'unit-test-shards', 'it runs in the unit job');
  assert.equal(step.name, 'Roadmap tooling tests');
  assert.equal(step.run, 'npx jest --selectProjects roadmap --ci');
  assert.deepEqual(step.env, { JEST_SPLIT_CORPUS: 'true' });
  assert.equal(
    step.if,
    "${{ !cancelled() && matrix.shard == 4 && needs.detect-changes.outputs.roadmap == 'true' }}",
  );
  assert.equal(step.if.replace(' matrix.shard == 4 &&', ''), STATIC_ROADMAP_IF);
  const { job, legs } = shardLayout(jobs);
  const shard = Number(/matrix\.shard == (\d+) /.exec(step.if)?.[1]);
  assert.deepEqual(
    legs.filter((leg) => leg === shard),
    [4],
    'exactly one matrix leg, shard 4',
  );
  const at = (name) => job.steps.findIndex((s) => s.name === name);
  assert.ok(at('Roadmap tooling tests') > at('Run unit test shard'));
  assert.ok(at('Roadmap tooling tests') > at('Validate Combat Suite'));
}

test('the roadmap tooling tests run once, gated as before, on unit shard 4 only', () => {
  assertRoadmapPlacement(workflow.jobs);
  const step = () =>
    workflow.jobs['unit-test-shards'].steps.find(
      (s) => s.name === 'Roadmap tooling tests',
    );
  // Mutants: on every shard, dropped, and left in Static Checks as well.
  const everyShard = structuredClone(workflow.jobs);
  everyShard['unit-test-shards'].steps.find(
    (s) => s.name === 'Roadmap tooling tests',
  ).if = STATIC_ROADMAP_IF;
  assert.throws(() => assertRoadmapPlacement(everyShard));
  const dropped = structuredClone(workflow.jobs);
  dropped['unit-test-shards'].steps = dropped['unit-test-shards'].steps.filter(
    (s) => s.name !== 'Roadmap tooling tests',
  );
  assert.throws(() => assertRoadmapPlacement(dropped), /one step/);
  const inStatic = structuredClone(workflow.jobs);
  inStatic['static-checks'].steps.push({ ...step(), if: STATIC_ROADMAP_IF });
  assert.throws(() => assertRoadmapPlacement(inStatic), /one step/);
});

test('the roadmap project holds exactly the roadmap suites, none of them in the unit census', () => {
  const { roadmapSuites } = require('../../config/jest/corpus-suites.js');
  const list = (project) =>
    JSON.parse(
      execFileSync(
        process.execPath,
        [
          path.join(root, 'node_modules/jest/bin/jest.js'),
          '--listTests',
          '--json',
          '--selectProjects',
          project,
        ],
        {
          cwd: root,
          env: { ...process.env, JEST_SPLIT_CORPUS: 'true' },
          encoding: 'utf8',
          maxBuffer: 64 * 1024 * 1024,
          timeout: 120000,
          stdio: ['ignore', 'pipe', 'pipe'],
          windowsHide: true,
        },
      )
        .split('\n')
        .reverse()
        .find((line) => line.startsWith('[')),
    ).map((file) => path.relative(root, file).split(path.sep).join('/'));
  assert.deepEqual(list('roadmap').sort(), [...roadmapSuites].sort());
  const unit = new Set(
    unitCensus().map((file) =>
      path.relative(root, file).split(path.sep).join('/'),
    ),
  );
  assert.deepEqual(
    roadmapSuites.filter((file) => unit.has(file)),
    [],
  );
});
