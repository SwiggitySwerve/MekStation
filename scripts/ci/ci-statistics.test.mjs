import assert from 'node:assert/strict';
import { test } from 'node:test';

import { median } from '../lib/statistics.mjs';

test('shared median preserves scheduling results and input order', () => {
  const values = [9, 1, 5];
  assert.equal(median(values), 5);
  assert.deepEqual(values, [9, 1, 5]);
  assert.equal(median([8, 2]), 5);
  assert.equal(median([3]), 3);
});
