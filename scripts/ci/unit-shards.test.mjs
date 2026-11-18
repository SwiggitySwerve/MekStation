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
