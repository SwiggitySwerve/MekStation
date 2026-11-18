import assert from 'node:assert/strict';
import { test } from 'node:test';

import { evaluateBudgetRaiseApproval } from './garden-approval.mjs';

const owner = { id: 42, login: 'live-owner', type: 'User' };
const head = 'a'.repeat(40);
const review = {
  id: 100,
  user: owner,
  state: 'APPROVED',
  commit_id: head,
  submitted_at: '2026-11-05T12:00:00Z',
};
const context = () => ({
  raises: [{ id: 'from-g1' }],
  repositoryOwner: owner,
  pullRequest: {
    user: { id: 7, login: 'contributor', type: 'User' },
    head: { sha: head },
    labels: [{ name: 'ci-budget-raise' }],
  },
  reviews: [review],
});

test('a raise requires both label and explicit current-head human owner approval', () => {
  assert.equal(evaluateBudgetRaiseApproval(context()).allowed, true);
  const input = context();
  input.pullRequest.labels = [];
  assert.equal(evaluateBudgetRaiseApproval(input).code, 'missing-label');
  input.pullRequest.labels = [{ name: 'ci-budget-raise' }];
  input.reviews = [];
  assert.equal(
    evaluateBudgetRaiseApproval(input).code,
    'owner-approval-required',
  );
});

test('G1 no-raise delta passes and a missing delta fails closed', () => {
  assert.equal(evaluateBudgetRaiseApproval({ raises: [] }).code, 'no-raise');
  assert.equal(evaluateBudgetRaiseApproval({}).allowed, false);
});

test('nonowner, bot, self, stale and malformed approvals cannot authorize a raise', () => {
  const cases = [
    { reviews: [{ ...review, user: { ...owner, id: 9 } }] },
    { reviews: [{ ...review, user: { ...owner, type: 'Bot' } }] },
    { repositoryOwner: { ...owner, type: 'Organization' } },
    { repositoryOwner: null },
    { reviews: [{ ...review, commit_id: 'b'.repeat(40) }] },
    { reviews: [{ ...review, submitted_at: null }] },
    { reviews: [{ ...review, id: null }] },
    { reviews: null },
  ];
  for (const change of cases) {
    assert.equal(
      evaluateBudgetRaiseApproval({ ...context(), ...change }).allowed,
      false,
      JSON.stringify(change),
    );
  }
  const self = context();
  self.pullRequest.user = owner;
  assert.equal(evaluateBudgetRaiseApproval(self).code, 'self-approval');
});

test('latest owner review wins even when API pages arrive in reverse order', () => {
  for (const state of [
    'CHANGES_REQUESTED',
    'DISMISSED',
    'COMMENTED',
    'PENDING',
  ]) {
    const input = context();
    input.reviews = [{ ...review, id: 101, state }, review];
    assert.equal(evaluateBudgetRaiseApproval(input).allowed, false, state);
  }
  const input = context();
  input.reviews = [{ ...review, id: 101, commit_id: 'b'.repeat(40) }, review];
  assert.equal(evaluateBudgetRaiseApproval(input).code, 'stale-approval');
});

test('a newer owner approval can authorize the current head after an older rejection', () => {
  const input = context();
  input.reviews = [{ ...review, id: 99, state: 'CHANGES_REQUESTED' }, review];
  assert.equal(evaluateBudgetRaiseApproval(input).allowed, true);
});

// Owner-authored raises: a committed record of owner rulings (PARITY-PLAN §186.2).
const ruling = {
  section: 'PARITY-PLAN §185',
  quote: 'Raise the limit to 94 for PR-O.',
};
const entry = (change = {}) => ({
  pr: 3418,
  key: 'limits.repoWideKeys',
  from: 93,
  to: 94,
  ruling,
  ...change,
});
const recordOf = (...approvals) => ({
  schema: 'mekstation/ci-budget-raise-approvals/v1',
  approvals,
});
const ownerContext = () => ({
  raises: [{ id: 'limits.repoWideKeys', before: 93, after: 94 }],
  repositoryOwner: owner,
  pullRequest: {
    number: 3418,
    user: { id: 42, login: 'live-owner', type: 'User' },
    head: { sha: head },
    labels: [{ name: 'ci-budget-raise' }],
  },
  reviews: [],
  approvalRecord: recordOf(entry()),
});

test('an owner-authored raise passes with the label and a matching base record entry', () => {
  const result = evaluateBudgetRaiseApproval(ownerContext());
  assert.equal(result.allowed, true, result.message);
  assert.equal(result.code, 'owner-ruling-record');
  assert.match(result.message, /PARITY-PLAN §185/);
  assert.match(result.message, /limits\.repoWideKeys/);
});

test('an owner-authored raise with no record at the base keeps the self-approval refusal', () => {
  const input = ownerContext();
  input.approvalRecord = null;
  assert.equal(evaluateBudgetRaiseApproval(input).code, 'self-approval');
  delete input.approvalRecord;
  assert.equal(evaluateBudgetRaiseApproval(input).code, 'self-approval');
  input.approvalRecord = recordOf();
  assert.equal(
    evaluateBudgetRaiseApproval(input).code,
    'missing-approval-record',
  );
});

test('every raise needs its own entry with the same pr, key, from and to', () => {
  const cases = [
    [entry({ to: 95 }), 'approval-record-mismatch'],
    [entry({ from: 92 }), 'approval-record-mismatch'],
    [entry({ pr: 3399 }), 'missing-approval-record'],
    [entry({ key: 'limits.unkeyableTests' }), 'missing-approval-record'],
  ];
  for (const [changed, code] of cases) {
    const input = ownerContext();
    input.approvalRecord = recordOf(changed);
    const result = evaluateBudgetRaiseApproval(input);
    assert.equal(result.allowed, false, JSON.stringify(changed));
    assert.equal(result.code, code, JSON.stringify(changed));
    assert.match(result.message, /limits\.repoWideKeys/);
  }
  const two = ownerContext();
  two.raises.push({ id: 'limits.unkeyableTests', before: 57, after: 58 });
  const result = evaluateBudgetRaiseApproval(two);
  assert.equal(result.code, 'missing-approval-record');
  assert.match(result.message, /limits\.unkeyableTests/);
  two.approvalRecord.approvals.push(
    entry({ key: 'limits.unkeyableTests', from: 57, to: 58 }),
  );
  assert.equal(evaluateBudgetRaiseApproval(two).allowed, true);
});

test('a malformed record fails closed', () => {
  const malformed = [
    { ...recordOf(entry()), schema: 'mekstation/ci-budget-raise-approvals/v0' },
    recordOf(entry({ ruling: { ...ruling, section: '§185' } })),
    recordOf(entry({ ruling: { ...ruling, section: 'PARITY-PLAN §185 ' } })),
    recordOf(entry({ ruling: { ...ruling, quote: '' } })),
    recordOf(entry({ ruling: { ...ruling, quote: '   ' } })),
    recordOf(entry({ ruling: { section: ruling.section } })),
    recordOf(entry({ pr: '3418' })),
    recordOf(entry({ pr: 0 })),
    recordOf(entry({ key: '' })),
    recordOf(entry({ to: '94' })),
    recordOf(entry({ extra: true })),
    recordOf(entry(), entry()),
    { ...recordOf(entry()), extra: true },
    { schema: 'mekstation/ci-budget-raise-approvals/v1' },
    [],
    'not-a-record',
  ];
  for (const approvalRecord of malformed) {
    const result = evaluateBudgetRaiseApproval({
      ...ownerContext(),
      approvalRecord,
    });
    assert.equal(
      result.code,
      'invalid-approval-record',
      JSON.stringify(approvalRecord),
    );
  }
});

test('the record path still requires the ci-budget-raise label', () => {
  const input = ownerContext();
  input.pullRequest.labels = [];
  assert.equal(evaluateBudgetRaiseApproval(input).code, 'missing-label');
});

test('a record never replaces owner review for a non-owner author', () => {
  const input = context();
  input.approvalRecord = recordOf(entry());
  input.raises = [{ id: 'limits.repoWideKeys', before: 93, after: 94 }];
  input.pullRequest.number = 3418;
  input.reviews = [];
  assert.equal(
    evaluateBudgetRaiseApproval(input).code,
    'owner-approval-required',
  );
});

test('validateApprovalRecord accepts the committed record', async () => {
  const { readFileSync } = await import('node:fs');
  const { validateApprovalRecord, BUDGET_RAISE_RECORD_PATH } =
    await import('./garden-approval.mjs');
  assert.equal(
    BUDGET_RAISE_RECORD_PATH,
    'config/ci/approved-budget-raises.json',
  );
  const record = JSON.parse(
    readFileSync(new URL(`../../${BUDGET_RAISE_RECORD_PATH}`, import.meta.url)),
  );
  assert.equal(validateApprovalRecord(record), null);
  assert.deepEqual(
    record.approvals.map(({ pr, key, from, to, ruling: { section } }) => [
      pr,
      key,
      from,
      to,
      section,
    ]),
    [[3418, 'limits.repoWideKeys', 93, 94, 'PARITY-PLAN §185']],
  );
});
