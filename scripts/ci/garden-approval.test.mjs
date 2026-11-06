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
