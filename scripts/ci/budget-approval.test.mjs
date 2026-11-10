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
      actions: {
        listWorkflowRuns: async () => ({
          data: {
            workflow_runs: [
              {
                id: 7,
                head_sha: 'a'.repeat(40),
                event: 'pull_request',
                run_attempt: 1,
                check_suite_id: 8,
                status: 'completed',
                conclusion: 'success',
                run_started_at: '2026-11-01T00:00:00Z',
              },
            ],
          },
        }),
      },
      checks: {
        listForRef: async () => ({
          data: {
            check_runs: [
              {
                id: 1,
                check_suite: { id: 8 },
                started_at: '2026-11-01T00:00:01Z',
                name: 'Lint and Test',
                app: { slug: 'github-actions' },
                status: 'completed',
                conclusion: 'success',
              },
            ],
          },
        }),
      },
    },
    paginate: async () => [],
  };
  return { github, pull, statuses };
}

test('owner-authored legacy byte-limit removal needs no size label or approval', async () => {
  const f = fixture();
  f.pull.user = { id: 1, login: 'owner' };
  const read = f.github.rest.repos.getContent;
  f.github.rest.repos.getContent = async (request) => {
    if (
      request.path === 'config/ci/budgets.json' &&
      request.ref === f.pull.base.sha
    ) {
      const head = await read({ ...request, ref: f.pull.head.sha });
      const legacy = JSON.parse(Buffer.from(head.data.content, 'base64'));
      Object.assign(legacy.limits, {
        standaloneStaticBytes: 290000000,
        webZipBytes: 92000000,
        installerBytes: 170000000,
      });
      return {
        data: {
          encoding: 'base64',
          content: Buffer.from(JSON.stringify(legacy)).toString('base64'),
        },
      };
    }
    return read(request);
  };
  const result = await checkBudgetPolicy({
    github: f.github,
    owner: 'o',
    repo: 'r',
    number: 1,
  });
  assert.equal(result.allowed, true, result.message);
  assert.equal(f.statuses.at(-1).state, 'success');
});

test('draft to ready retains successful required statuses on the same exact head and primary suite', async () => {
  const f = fixture();
  const source = f.github.rest.actions.listWorkflowRuns;
  const checks = f.github.rest.checks.listForRef;
  f.github.rest.actions.listWorkflowRuns = async (args) => {
    assert.equal(args.head_sha, f.pull.head.sha);
    assert.equal(args.event, 'pull_request');
    return source();
  };
  f.github.rest.checks.listForRef = async (args) => {
    assert.equal(args.ref, f.pull.head.sha);
    assert.equal(args.check_name, 'Lint and Test');
    return checks();
  };
  const outcomes = [];
  for (const draft of [true, false]) {
    f.pull.draft = draft;
    f.statuses.length = 0;
    assert.equal(
      (
        await checkBudgetPolicy({
          github: f.github,
          owner: 'o',
          repo: 'r',
          number: 1,
        })
      ).allowed,
      true,
    );
    outcomes.push(structuredClone(f.statuses));
    assert.equal(f.statuses.at(-1).context, 'Lint and Test');
    assert.equal(f.statuses.at(-1).state, 'success');
    assert.ok(f.statuses.every((status) => status.sha === f.pull.head.sha));
  }
  assert.deepEqual(outcomes[0], outcomes[1]);
});

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

test('approval alone cannot bless missing, pending or later failed primary checks', async () => {
  const f = fixture(),
    args = { github: f.github, owner: 'o', repo: 'r', number: 1 };
  for (const checks of [
    [],
    [
      {
        id: 2,
        check_suite: { id: 8 },
        started_at: '2026-11-01T00:00:01Z',
        name: 'Lint and Test',
        app: { slug: 'github-actions' },
        status: 'in_progress',
        conclusion: null,
      },
    ],
  ]) {
    f.github.rest.checks.listForRef = async () => ({
      data: { check_runs: checks },
    });
    await checkBudgetPolicy(args);
    assert.equal(f.statuses.at(-1).context, 'Lint and Test');
    assert.equal(f.statuses.at(-1).state, 'pending');
  }
  f.github.rest.checks.listForRef = async () => ({
    data: {
      check_runs: [
        {
          id: 1,
          check_suite: { id: 8 },
          started_at: '2026-11-01T00:00:01Z',
          name: 'Lint and Test',
          app: { slug: 'github-actions' },
          status: 'completed',
          conclusion: 'success',
        },
        {
          id: 2,
          check_suite: { id: 8 },
          started_at: '2026-11-01T00:00:01Z',
          name: 'Lint and Test',
          app: { slug: 'github-actions' },
          status: 'completed',
          conclusion: 'failure',
        },
      ],
    },
  });
  await checkBudgetPolicy(args);
  assert.equal(f.statuses.at(-1).state, 'failure');
  f.github.rest.actions.listWorkflowRuns = async () => ({
    data: {
      workflow_runs: [
        {
          id: 7,
          head_sha: 'a'.repeat(40),
          event: 'pull_request',
          run_attempt: 2,
          check_suite_id: 8,
          status: 'in_progress',
          conclusion: null,
          run_started_at: '2026-11-01T00:00:02Z',
        },
      ],
    },
  });
  await checkBudgetPolicy(args);
  assert.equal(f.statuses.at(-1).state, 'pending');
});

test('primary approval status rejects stale attempts, unrelated suites and unknown run identities', async () => {
  for (const mutate of [
    (run, check) => {
      check.check_suite.id++;
    },
    (run, check) => {
      check.app.slug = 'other-app';
    },
    (run, check) => {
      check.id = null;
    },
    (run, check) => {
      check.started_at = 'invalid';
    },
    (run) => {
      run.run_attempt++;
      run.run_started_at = '2026-11-01T00:00:02Z';
    },
    (run) => {
      run.id = null;
    },
    (run) => {
      run.head_sha = 'b'.repeat(40);
    },
    (run) => {
      run.event = 'workflow_dispatch';
    },
  ]) {
    const f = fixture();
    const { data: runs } = await f.github.rest.actions.listWorkflowRuns();
    const { data: checks } = await f.github.rest.checks.listForRef();
    mutate(runs.workflow_runs[0], checks.check_runs[0]);
    f.github.rest.actions.listWorkflowRuns = async () => ({ data: runs });
    f.github.rest.checks.listForRef = async () => ({ data: checks });
    await checkBudgetPolicy({
      github: f.github,
      owner: 'o',
      repo: 'r',
      number: 1,
    });
    assert.equal(f.statuses.at(-1).context, 'Lint and Test');
    assert.equal(f.statuses.at(-1).state, 'pending');
  }
});
