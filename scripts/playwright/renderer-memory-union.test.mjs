import assert from 'node:assert/strict';
import test from 'node:test';

import { censusHash, collectTests } from './ci-e2e-plan.mjs';
import { assertExecutedUnion } from './renderer-memory-union.mjs';

const report = (title) => ({
  suites: [
    {
      title: 'roster.spec.ts',
      specs: [
        {
          title,
          file: 'roster.spec.ts',
          tests: [
            {
              projectName: 'chromium',
              results: [{ retry: 0, status: 'passed' }],
            },
          ],
        },
      ],
    },
  ],
});
const reports = [report('first'), report('second')];
const tests = reports.flatMap(collectTests);
const plan = {
  count: 2,
  censusHash: censusHash(tests),
  shards: tests.map((t, i) => ({
    shard: i + 1,
    tasks: [{ suite: 'gates', tests: [t] }],
  })),
};
const captures = reports.map((report, i) => ({
  index: i + 1,
  plan,
  reports: { gates: report },
}));

test('executed union retains every census test exactly once across shard artifacts', () => {
  assert.equal(assertExecutedUnion(captures, 2).tests, 2);
  assert.throws(() => assertExecutedUnion(captures.slice(0, 1), 2));
  const duplicate = structuredClone(captures);
  duplicate[1].reports = duplicate[0].reports;
  assert.throws(() => assertExecutedUnion(duplicate, 2));
  const unexecuted = structuredClone(captures);
  unexecuted[1].reports.gates.suites[0].specs[0].tests[0].results = [];
  assert.throws(() => assertExecutedUnion(unexecuted, 2));
});
