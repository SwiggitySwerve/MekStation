// Fail this diagnostic when the new observations are absent; never clear #2868.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { collectTests, assertSameTests } from './ci-e2e-plan.mjs';
import {
  parseKernelReceipt,
  verifyRendererCoverage,
} from './renderer-memory.mjs';

const root = process.env.MEKSTATION_E2E_MEMORY_ROOT;
assert.ok(root && path.isAbsolute(root));
function audit() {
  const output = path.resolve('e2e-timings');
  const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
  const plan = read(path.join(output, 'plan-gates.json'));
  const shard =
    plan.shards[Number(process.env.MEKSTATION_E2E_MEMORY_SHARD_INDEX) - 1];
  assert.ok(shard);
  assert.equal(plan.count, 136);
  assert.equal(
    plan.censusHash,
    'aa0826f716f4e6a3c92679edbfd6d83e256a85e3de89c9ed631bb81c0ee1eca0',
  );
  const kernelDirectory = path.join(root, 'kernel');
  const kernels = fs.readdirSync(kernelDirectory).map((file) => {
    const match = /^(gates|library|smoke)-(\d+)\.jsonl$/.exec(file);
    assert.ok(match, `Unexpected kernel receipt ${file}`);
    return {
      file,
      suite: match[1],
      wrapperPid: Number(match[2]),
      receipt: parseKernelReceipt(
        fs.readFileSync(path.join(kernelDirectory, file), 'utf8'),
      ),
    };
  });
  const rows = fs
    .readdirSync(root)
    .filter((f) => /^(gates|library|smoke)-\d+\.jsonl$/.test(f))
    .flatMap((file) =>
      fs
        .readFileSync(path.join(root, file), 'utf8')
        .trim()
        .split('\n')
        .map(JSON.parse),
    );
  for (const task of shard.tasks) {
    assertSameTests(
      task.tests,
      collectTests(read(path.join(output, `${task.suite}.json`))),
    );
    assert.ok(
      kernels.some((k) => k.suite === task.suite),
      `Kernel exit receipt missing for ${task.suite}`,
    );
    const suiteRows = rows.filter((r) => r.suite === task.suite);
    assert.ok(
      suiteRows.some((r) => r.phase === 'suite-begin') &&
        suiteRows.some((r) => r.phase === 'suite-end'),
    );
  }
  const focus = shard.tasks.some((t) =>
    t.tests.some(
      (test) => test.file === 'seam-roster-materialization-handoff.spec.ts',
    ),
  );
  const focusRows = rows.filter((row) =>
    row.location?.file
      .replaceAll('\\', '/')
      .endsWith('/seam-roster-materialization-handoff.spec.ts'),
  );
  const result = {
    schema: 'mekstation-renderer-observability/v1',
    shard: shard.shard,
    tests: plan.count,
    censusHash: plan.censusHash,
    kernels,
    focusSelected: focus,
    coverage: focus
      ? verifyRendererCoverage(focusRows, kernels)
      : { status: 'FOCUS_ON_ANOTHER_SHARD' },
    stabilityClearance: false,
  };
  fs.writeFileSync(
    path.join(root, 'observability.json'),
    JSON.stringify(result, null, 2),
  );
  console.log(
    JSON.stringify({
      shard: shard.shard,
      focusSelected: focus,
      coverage: result.coverage.status,
      stabilityClearance: false,
    }),
  );
}
try {
  audit();
} catch (error) {
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(
    path.join(root, 'observability.json'),
    JSON.stringify(
      {
        schema: 'mekstation-renderer-observability/v1',
        coverage: { status: 'NOT_OBSERVABLE', error: error.message },
        stabilityClearance: false,
      },
      null,
      2,
    ),
  );
  console.error(error);
  process.exitCode = 1;
}
