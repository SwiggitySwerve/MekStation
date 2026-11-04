import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AGGREGATOR, aggregatorMissing } from './lint-and-test-guard.mjs';

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
