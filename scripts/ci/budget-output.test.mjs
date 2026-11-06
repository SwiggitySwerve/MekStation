import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { budgetOutputDirectory } from './budget-output.mjs';

test('default reporting outputs use runner temp and reject workspace pollution', () => {
  const original = process.env.RUNNER_TEMP;
  try {
    process.env.RUNNER_TEMP = os.tmpdir();
    assert.equal(
      budgetOutputDirectory(),
      path.resolve(os.tmpdir(), 'budget-output'),
    );
    process.env.RUNNER_TEMP = process.cwd();
    assert.throws(() => budgetOutputDirectory(), /outside the workspace/);
    process.env.RUNNER_TEMP = path.join(process.cwd(), 'scratch');
    assert.throws(() => budgetOutputDirectory(), /outside the workspace/);
  } finally {
    if (original === undefined) delete process.env.RUNNER_TEMP;
    else process.env.RUNNER_TEMP = original;
  }
});
