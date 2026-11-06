import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertSameTests, collectTests, censusHash } from './ci-e2e-plan.mjs';

export function assertExecutedUnion(captures, count) {
  assert.deepEqual(
    captures.map((c) => c.index).sort((a, b) => a - b),
    Array.from({ length: count }, (_, i) => i + 1),
  );
  const reference = captures[0].plan;
  assert.equal(reference.shards.length, count);
  const planned = reference.shards.flatMap((s) =>
    s.tasks.flatMap((t) => t.tests),
  );
  assert.equal(planned.length, reference.count);
  assert.equal(new Set(planned.map((t) => t.key)).size, planned.length);
  assert.equal(censusHash(planned), reference.censusHash);
  const observed = [];
  for (const capture of captures) {
    assert.deepEqual(
      capture.plan,
      reference,
      'Shard plans must agree on the entire live census',
    );
    for (const task of reference.shards[capture.index - 1].tasks) {
      const tests = collectTests(capture.reports[task.suite]);
      assertSameTests(task.tests, tests);
      assert.ok(
        tests.every((t) => t.results.length > 0),
        'Every selected test must execute',
      );
      observed.push(...tests);
    }
  }
  assertSameTests(planned, observed);
  return {
    tests: observed.length,
    censusHash: reference.censusHash,
    shards: count,
    stabilityClearance: false,
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = path.resolve(process.argv[2]);
  const count = Number(process.env.MEKSTATION_E2E_MEMORY_SHARDS);
  assert.ok([2, 3].includes(count));
  const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
  const captures = Array.from({ length: count }, (_, i) => {
    const dir = path.join(
      root,
      `renderer-diagnostic-${count}-${i + 1}`,
      'e2e-timings',
    );
    const plan = read(path.join(dir, 'plan-gates.json'));
    const reports = Object.fromEntries(
      plan.shards[i].tasks.map((t) => [
        t.suite,
        read(path.join(dir, `${t.suite}.json`)),
      ]),
    );
    return { index: i + 1, plan, reports };
  });
  const result = assertExecutedUnion(captures, count);
  assert.equal(result.tests, 136);
  assert.equal(
    result.censusHash,
    'aa0826f716f4e6a3c92679edbfd6d83e256a85e3de89c9ed631bb81c0ee1eca0',
  );
  console.log(JSON.stringify(result));
}
