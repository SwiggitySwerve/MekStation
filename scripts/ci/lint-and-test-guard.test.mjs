import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  AGGREGATOR,
  aggregatorMissing,
  shouldReportMissing,
} from './lint-and-test-guard.mjs';

test('a run whose aggregator ran, in any conclusion, needs no guard', () => {
  assert.equal(
    aggregatorMissing([{ name: 'Static Checks' }, { name: AGGREGATOR }]),
    false,
  );
});

test('a run without the aggregator job is reported as failed', () => {
  // Run 41817202190: every created job green, no Lint and Test job.
  assert.equal(
    aggregatorMissing([
      { name: 'Detect Changes' },
      { name: 'Unit Tests (1/6)' },
    ]),
    true,
  );
  assert.equal(aggregatorMissing([]), true);
});

test('only the exact required check name counts', () => {
  assert.equal(aggregatorMissing([{ name: 'Lint and Test (advisory)' }]), true);
});

test('a completed run without the aggregator is reported (#2660)', () => {
  // Run 41817202190 concluded failure with no Lint and Test job.
  const jobs = [{ name: 'Detect Changes' }, { name: 'Unit Tests (1/6)' }];
  assert.equal(shouldReportMissing({ conclusion: 'failure', jobs }), true);
  assert.equal(shouldReportMissing({ conclusion: 'success', jobs }), true);
});

test('a cancelled or skipped run posts nothing', () => {
  // Run 41902456406: a dispatch cancelled while pending, so it created only
  // Detect Changes; the guard's failure landed on a head that was green.
  const jobs = [{ name: 'Detect Changes' }];
  assert.equal(shouldReportMissing({ conclusion: 'cancelled', jobs }), false);
  assert.equal(shouldReportMissing({ conclusion: 'skipped', jobs: [] }), false);
});

test('a completed run whose aggregator ran posts nothing', () => {
  const jobs = [{ name: 'Detect Changes' }, { name: AGGREGATOR }];
  assert.equal(shouldReportMissing({ conclusion: 'failure', jobs }), false);
});
