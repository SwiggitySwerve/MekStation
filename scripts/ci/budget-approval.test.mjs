import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checkBudgetPolicy } from './budget-approval.mjs';
import { loadBudgets } from './budget-config.mjs';
import { DEPENDENCY_GROWTH_LABEL } from './budget-dependencies.mjs';

function fixture() {
  const statuses = [],
    config = structuredClone(loadBudgets());
  config.dependencies = {
    root: { lockEntries: 1, directDependencies: 1 },
    desktop: { lockEntries: 1, directDependencies: 1 },
  };
  const pull = {
    number: 1,
    head: { sha: 'a'.repeat(40) },
    base: { sha: 'b'.repeat(40) },
    labels: [{ name: DEPENDENCY_GROWTH_LABEL }],
  };
  const manifest = { dependencies: { x: '1' } },
    lock = {
      lockfileVersion: 3,
      packages: { '': manifest, 'node_modules/x': {}, 'node_modules/y': {} },
    };
  const github = {
    rest: {
      repos: {
        get: async () => ({
          data: { owner: { login: 'owner', type: 'User', id: 1 } },
        }),
        getContent: async ({ path, ref }) => {
          if (path === 'config/ci/budgets.json' && ref === pull.base.sha)
            throw Object.assign(new Error('Missing initial baseline'), {
              status: 404,
            });
          const data =
            path === 'config/ci/budgets.json'
              ? config
              : path.endsWith('package-lock.json')
                ? lock
                : manifest;
          return {
            data: {
              encoding: 'base64',
              content: Buffer.from(JSON.stringify(data)).toString('base64'),
            },
          };
        },
        createCommitStatus: async (status) => {
          statuses.push(status);
          return { data: status };
        },
      },
      pulls: {
        get: async () => ({ data: structuredClone(pull) }),
        listReviews: () => {},
      },
    },
    paginate: async () => [],
  };
  return { github, pull, statuses };
}

test('live policy rejects dependency-label removal and publishes a failed current-head status', async () => {
  const fixture_ = fixture(),
    args = { github: fixture_.github, owner: 'o', repo: 'r', number: 1 };
  assert.equal((await checkBudgetPolicy(args)).allowed, true);
  assert.equal(fixture_.statuses.at(-1).state, 'success');
  fixture_.pull.labels = [];
  const result = await checkBudgetPolicy(args);
  assert.equal(result.allowed, false);
  assert.equal(result.code, 'dependency-growth');
  assert.equal(fixture_.statuses.at(-1).state, 'failure');
  assert.equal(fixture_.statuses.at(-1).sha, fixture_.pull.head.sha);
});

test('primary policy gate reads live rules without a write token; unknown JSON is red', async () => {
  const { github, statuses } = fixture();
  const args = { github, owner: 'o', repo: 'r', number: 1, publish: false };
  assert.equal((await checkBudgetPolicy(args)).allowed, true);
  assert.equal(statuses.length, 0);
  const original = github.rest.repos.getContent;
  github.rest.repos.getContent = async (args_) =>
    args_.path.endsWith('package.json')
      ? { data: { encoding: 'unknown' } }
      : original(args_);
  assert.equal((await checkBudgetPolicy(args)).allowed, false);
  assert.equal(statuses.length, 0);
});
