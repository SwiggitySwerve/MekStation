import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { parse } from 'yaml';

import { assertJobResults } from '../ci/budget-aggregate.mjs';
import { CI_SUITES, parseInvocation } from './ci-e2e-plan.mjs';

const source = fs.readFileSync('.github/workflows/pr-checks.yml', 'utf8');
function verify(workflow) {
  assert.deepEqual(Object.keys(workflow.on), ['workflow_dispatch']);
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  assert.deepEqual(workflow.on.workflow_dispatch.inputs.shards.options, [
    '2',
    '3',
  ]);
  assert.deepEqual(Object.keys(workflow.jobs).sort(), ['e2e', 'lint-and-test']);
  const job = workflow.jobs.e2e;
  assert.equal(job['runs-on'], 'ubuntu-latest');
  assert.equal(job['timeout-minutes'], 15);
  assert.equal(job.strategy['fail-fast'], false);
  assert.equal(job.env.MEKSTATION_E2E_MEMORY_SHARDS, '${{ inputs.shards }}');
  for (const suite of CI_SUITES) {
    const step = job.steps.find((s) => s.name === `Run ${suite.name}`);
    assert.ok(step && step.if.includes('!cancelled()'));
    for (const count of [2, 3]) {
      const command = step.run
        .replaceAll('${{ matrix.shard }}', '1')
        .replaceAll('${{ inputs.shards }}', String(count));
      assert.equal(
        parseInvocation(command.split(/\s+/).slice(2), count).suite.name,
        suite.name,
      );
    }
  }
  const upload = job.steps.find(
    (s) => s.name === 'Archive every diagnostic observation',
  );
  assert.equal(upload.if, 'always()');
  assert.equal(upload.with['include-hidden-files'], true);
  assert.ok(upload.with['retention-days'] <= 3);
  for (const folder of [
    'renderer-memory',
    'e2e-timings',
    'test-results',
    'playwright-report-gates',
    'playwright-report-library',
    'playwright-report-smoke',
  ])
    assert.ok(upload.with.path.split('\n').includes(folder), folder);
  assert.equal(workflow.jobs['lint-and-test'].if, 'always()');
  assert.deepEqual(workflow.jobs['lint-and-test'].needs, ['e2e']);
  assert.ok(
    workflow.jobs['lint-and-test'].steps.some((s) =>
      s.run?.includes('assertJobResults'),
    ),
  );
}

test('scratch harness is manual, bounded, read-only and preserves suite/report contracts', () =>
  verify(parse(source)));
test('missing smoke report or automatic CI cannot pass the scratch contract', () => {
  const missing = parse(source);
  missing.jobs.e2e.steps.find(
    (s) => s.name === 'Archive every diagnostic observation',
  ).with.path = 'test-results\nplaywright-report';
  assert.throws(() => verify(missing));
  const automatic = parse(source);
  automatic.on.pull_request = {};
  assert.throws(() => verify(automatic));
});
test('required failure, cancellation, skip or unknown result fails the diagnostic aggregator', () => {
  assert.doesNotThrow(() =>
    assertJobResults(['e2e'], {}, { e2e: { result: 'success' } }),
  );
  for (const result of ['failure', 'cancelled', 'skipped', undefined])
    assert.throws(() => assertJobResults(['e2e'], {}, { e2e: { result } }));
});
