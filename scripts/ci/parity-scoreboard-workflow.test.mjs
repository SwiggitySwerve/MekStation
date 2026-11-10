import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { parse } from 'yaml';

import { inducedWorkflowCensus, readWorkflow } from './budget-workflow.mjs';

const file = '.github/workflows/parity-scoreboard.yml';

test('scoreboard is main-push/dispatch only, read-only, coalesced, and bounded', () => {
  const workflow = parse(fs.readFileSync(file, 'utf8'));
  assert.deepEqual(Object.keys(workflow.on).sort(), [
    'push',
    'workflow_dispatch',
  ]);
  assert.deepEqual(workflow.on.push.branches, ['main']);
  assert.equal(workflow.on.workflow_dispatch.inputs.ref.required, true);
  assert.deepEqual(workflow.permissions, { contents: 'read', actions: 'read' });
  assert.deepEqual(workflow.concurrency, {
    group: 'parity-scoreboard-${{ inputs.ref || github.ref }}',
    'cancel-in-progress': true,
  });
  assert.equal(workflow.jobs.scoreboard['timeout-minutes'], 30);
  const steps = workflow.jobs.scoreboard.steps;
  assert.equal(
    steps.find((step) => step.uses?.startsWith('actions/setup-python@')).with[
      'python-version'
    ],
    '3.12',
  );
  assert.ok(
    steps.some((step) => /pip install --require-hashes/.test(step.run ?? '')),
  );
  const checkouts = steps.filter((step) =>
    step.uses?.startsWith('actions/checkout@'),
  );
  assert.equal(checkouts.length, 2);
  assert.equal(checkouts[1].with.ref, '${{ inputs.ref || github.sha }}');
  for (const checkout of checkouts)
    assert.equal(checkout.with['persist-credentials'], false);
  assert.deepEqual(
    steps
      .filter((step) => step.uses?.startsWith('actions/upload-artifact@'))
      .map((step) => step.with['retention-days']),
    [30, 14],
  );
  assert.ok(!steps.some((step) => step['continue-on-error']));
  assert.ok(
    steps.some(
      (step) =>
        /parity-scoreboard\.mjs.*run/.test(step.run ?? '') &&
        /--report-mode/.test(step.run),
    ),
  );
});

test('scoreboard is classified outside the PR census and required aggregator', () => {
  const census = inducedWorkflowCensus(process.cwd(), [file]);
  assert.ok(!census.files.includes('parity-scoreboard.yml'));
  assert.ok(
    census.otherEvents.some((item) => item.file === 'parity-scoreboard.yml'),
  );
  assert.ok(
    !readWorkflow(process.cwd()).jobs['lint-and-test'].needs.includes(
      'scoreboard',
    ),
  );
});
