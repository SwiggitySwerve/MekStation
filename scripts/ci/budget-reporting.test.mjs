import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

import { quantile } from '../lib/statistics.mjs';
import * as budgets from './budget-config.mjs';
import { projectTimingLimits, readWorkflow } from './budget-workflow.mjs';
import { evaluateBudgetRaiseApproval } from './garden-approval.mjs';

const original = budgets.loadBudgets();
// Keep legacy-schema coverage independent of the deployed reporting caps.
delete original.reporting;
const configured = () => ({
  ...structuredClone(original),
  reporting: { jobMinutes: 60.25, criticalPathMs: 650000.5 },
});

test('deployed reporting caps stay within the measured bootstrap ceiling', () => {
  const evidence = JSON.parse(
    fs.readFileSync(
      new URL('./fixtures/reporting-bootstrap.json', import.meta.url),
      'utf8',
    ),
  );
  const deployed = budgets.reportingLimits(budgets.loadBudgets());
  assert.equal(evidence.included.length, 5);
  assert.equal(new Set(evidence.included.map((s) => s.identity.runId)).size, 5);
  for (const sample of evidence.included) {
    assert.equal(sample.identity.event, 'push');
    assert.equal(sample.identity.branch, 'main');
    assert.equal(sample.identity.conclusion, 'success');
  }
  for (const id of Object.keys(budgets.REPORTING_UNITS)) {
    const ceiling =
      quantile(
        evidence.included.map((sample) => sample.metrics[id]),
        0.75,
      ) * evidence.headroomMultiplier;
    // Later explicit lowering is permitted; an upward reset is not.
    assert.ok(
      deployed[id] > 0 && deployed[id] <= ceiling,
      `${id}: missing or above measured ceiling`,
    );
  }
  assert.deepEqual(budgets.budgetRaises(original, budgets.loadBudgets()), []);
});

test('optional reporting caps support old configs and finite positive fractions only', () => {
  assert.equal(typeof budgets.reportingLimits, 'function');
  assert.deepEqual(budgets.reportingLimits(original), {});
  const next = configured();
  assert.equal(budgets.validateBudgets(next), next);
  assert.deepEqual(budgets.reportingLimits(next), next.reporting);
  for (const reporting of [
    null,
    [],
    {},
    { jobMinutes: 1 },
    { criticalPathMs: 1 },
    { jobMinutes: 1, criticalPathMs: 1, extra: 1 },
    ...[-1, 0, NaN, Infinity, '60'].map((value) => ({
      jobMinutes: value,
      criticalPathMs: 1,
    })),
  ])
    assert.throws(() =>
      budgets.validateBudgets({ ...structuredClone(original), reporting }),
    );
});

test('initial reporting addition is scoped bootstrap, while increases/removals remain raises', () => {
  assert.deepEqual(budgets.budgetRaises(original, configured()), []);
  const mixed = configured();
  mixed.limits.repoWideKeys++;
  assert.deepEqual(
    budgets.budgetRaises(original, mixed).map((r) => r.id),
    ['limits.repoWideKeys'],
  );
  const next = configured();
  next.reporting.jobMinutes++;
  assert.equal(
    budgets.budgetRaises(configured(), next)[0].id,
    'reporting.jobMinutes',
  );
  assert.deepEqual(
    budgets
      .budgetRaises(configured(), original)
      .map((r) => r.id)
      .sort(),
    ['reporting.criticalPathMs', 'reporting.jobMinutes'],
  );
});

test('manual timing ratchets lower existing fractions only; automatic timing proposals stay disabled', () => {
  const result = budgets.ratchetBudgets(configured(), [
    { id: 'reporting.jobMinutes', value: 59.125 },
  ]);
  assert.equal(result.reporting.jobMinutes, 59.125);
  assert.deepEqual(budgets.budgetRaises(configured(), result), []);
  for (const [config, proposals] of [
    [original, [{ id: 'reporting.jobMinutes', value: 1 }]],
    [configured(), [{ id: 'reporting.jobMinutes', value: 61 }]],
    [configured(), [{ id: 'reporting.jobMinutes', value: 0 }]],
    [configured(), [{ id: 'reporting.unknown', value: 1 }]],
    [
      configured(),
      [
        { id: 'reporting.jobMinutes', value: 59 },
        { id: 'reporting.jobMinutes', value: 58 },
      ],
    ],
  ])
    assert.throws(() => budgets.ratchetBudgets(config, proposals));
  const descriptors = budgets
    .budgetDescriptors(configured())
    .filter((d) => d.id.startsWith('reporting.'));
  assert.deepEqual(
    descriptors.map((d) => d.unit),
    ['minutes', 'ms'],
  );
  assert.ok(descriptors.every((d) => !d.ratchet));
  assert.throws(() =>
    budgets.ratchetBudgets(original, [
      { id: 'limits.repoWideKeys', value: 80.5 },
    ]),
  );
});

test('canonical timing projection adds configured aggregates without inventing absent values', () => {
  const workflow = readWorkflow(process.cwd());
  const before = projectTimingLimits(original, workflow),
    after = projectTimingLimits(configured(), workflow);
  assert.deepEqual(after.jobsMs, before.jobsMs);
  assert.equal(before.jobMinutes, undefined);
  assert.equal(before.criticalPathMs, undefined);
  assert.equal(after.jobMinutes, 60.25);
  assert.equal(after.criticalPathMs, 650000.5);
});

test('timing relaxations still require the owner label and current-head approval', () => {
  const next = configured();
  next.reporting.jobMinutes++;
  const args = {
    raises: budgets.budgetRaises(configured(), next),
    repositoryOwner: { id: 1, login: 'owner', type: 'User' },
    pullRequest: {
      user: { id: 2, login: 'contributor' },
      head: { sha: 'a'.repeat(40) },
      labels: [],
    },
    reviews: [],
  };
  assert.equal(evaluateBudgetRaiseApproval(args).code, 'missing-label');
  args.pullRequest.labels = [{ name: 'ci-budget-raise' }];
  assert.equal(evaluateBudgetRaiseApproval(args).allowed, false);
  args.reviews = [
    {
      id: 1,
      user: args.repositoryOwner,
      state: 'APPROVED',
      commit_id: 'a'.repeat(40),
      submitted_at: '2026-11-06T00:00:00Z',
    },
  ];
  assert.equal(evaluateBudgetRaiseApproval(args).allowed, true);
  args.reviews[0].commit_id = 'b'.repeat(40);
  assert.equal(evaluateBudgetRaiseApproval(args).code, 'stale-approval');
});
