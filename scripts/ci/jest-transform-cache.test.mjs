import assert from 'node:assert/strict';
import { test } from 'node:test';

import { readWorkflow } from './budget-workflow.mjs';

// The unit shards' Jest transform cache (.jest-cache). Jest keys every
// transform by file content and transformer config, so a restored entry can
// never stand in for changed source; the Actions key only decides which
// snapshot is restored and how often a new one is saved.
const job = readWorkflow(process.cwd()).jobs['unit-test-shards'];
const step = (name) => {
  const found = job.steps.find((s) => s.name === name);
  assert.ok(found, name);
  return found;
};
const NAMESPACE =
  "${{ runner.os }}-jest-transform-${{ hashFiles('package-lock.json', 'jest.config.js') }}";
const KEY = `${NAMESPACE}-unit-\${{ matrix.shard }}-\${{ steps.jest-transform-day.outputs.day }}`;

test('the transform cache key names only transform inputs and a UTC day', () => {
  const day = step('Pick the Jest transform cache day');
  assert.equal(day.id, 'jest-transform-day');
  assert.equal(day.run, 'echo "day=$(date -u +%Y%m%d)" >> "$GITHUB_OUTPUT"');
  const restore = step('Restore Jest transform cache');
  assert.equal(restore.id, 'jest-transform');
  assert.equal(restore.with.path, '.jest-cache');
  assert.equal(restore.with.key, KEY);
  // Newest snapshot of this shard, then of any shard (shared src transforms).
  assert.deepEqual(restore.with['restore-keys'].trim().split('\n'), [
    `${NAMESPACE}-unit-\${{ matrix.shard }}-`,
    `${NAMESPACE}-unit-`,
  ]);
  for (const s of [day, restore])
    assert.ok(
      job.steps.indexOf(s) < job.steps.indexOf(step('Run unit test shard')),
    );
});

test('main and nightly save one snapshot per shard per day; PRs never save', () => {
  const save = step('Save Jest transform cache');
  assert.equal(save.with.key, KEY);
  assert.equal(save.with.path, '.jest-cache');
  assert.equal(
    save.if,
    "${{ !cancelled() && github.event_name != 'pull_request' && steps.jest-transform.outputs.cache-hit != 'true' }}",
  );
});

test('no per-commit or per-run uniqueness in the transform key', () => {
  for (const s of job.steps.filter((s) => s.with?.path === '.jest-cache')) {
    const text = JSON.stringify(s.with);
    assert.doesNotMatch(text, /github\.(sha|run_id|run_number|run_attempt)/);
    // Shard planning and durations change daily; they never change a transform.
    assert.doesNotMatch(text, /config\/jest|jest\.setup/);
  }
});

test('the Jest result caches keep their keys (a separate system)', () => {
  const keys = job.steps
    .filter((s) => /^\.jest-result-cache/.test(s.with?.path ?? ''))
    .map((s) => s.with.key);
  assert.deepEqual(keys, [
    '${{ runner.os }}-jest-results-unit-${{ matrix.shard }}-main-${{ github.run_id }}',
    '${{ runner.os }}-jest-results-unit-${{ matrix.shard }}-pr-${{ github.run_id }}',
    "${{ runner.os }}-jest-results-unit-${{ matrix.shard }}-${{ github.event_name == 'pull_request' && 'pr' || 'main' }}-${{ github.run_id }}",
    '${{ runner.os }}-jest-results-corpus-${{ matrix.shard }}-main-${{ github.run_id }}',
    '${{ runner.os }}-jest-results-corpus-${{ matrix.shard }}-pr-${{ github.run_id }}',
    "${{ runner.os }}-jest-results-corpus-${{ matrix.shard }}-${{ github.event_name == 'pull_request' && 'pr' || 'main' }}-${{ github.run_id }}",
  ]);
});
