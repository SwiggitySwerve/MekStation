import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { setImmediate as settleMicrotasks } from 'node:timers/promises';
import { parse } from 'yaml';

import {
  checkBudgetPolicy,
  guardOutcome,
  STALE_REF_REMEDY,
} from './budget-approval.mjs';
import { loadBudgets } from './budget-config.mjs';
import { DEPENDENCY_GROWTH_LABEL } from './budget-dependencies.mjs';
import { reconcileBudgetStatuses } from './budget-reconcile.mjs';
import { BUDGET_RAISE_LABEL } from './garden-approval.mjs';
import { summaryFixture } from './test-helpers/summary.mjs';

// Every caller binds the run to a head. These rows run for the fixture's head
// unless they name another; the binding rows call checkBudgetPolicy directly.
const RUN_HEAD = 'a'.repeat(40);
const policy = (args) =>
  checkBudgetPolicy({ expectedHead: RUN_HEAD, eventPath: undefined, ...args });

function fixture() {
  const statuses = [],
    config = structuredClone(loadBudgets());
  config.dependencies = {
    root: { lockEntries: 1, directDependencies: 1 },
    desktop: { lockEntries: 1, directDependencies: 1 },
  };
  const budgets = { base: null, head: config };
  const pull = {
    number: 1,
    state: 'open',
    head: { sha: 'a'.repeat(40) },
    base: { sha: 'b'.repeat(40), ref: 'main', repo: { full_name: 'o/r' } },
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
        listPullRequestsAssociatedWithCommit: () => {},
        get: async () => ({
          data: { owner: { login: 'owner', type: 'User', id: 1 } },
        }),
        getContent: async ({ path, ref }) => {
          if (
            path === 'config/ci/budgets.json' &&
            ref === pull.base.sha &&
            budgets.base === null
          )
            throw Object.assign(new Error('Missing initial baseline'), {
              status: 404,
            });
          const data =
            path === 'config/ci/budgets.json'
              ? ref === pull.base.sha
                ? budgets.base
                : budgets.head
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
    paginate: async (method) =>
      method === github.rest.repos.listPullRequestsAssociatedWithCommit
        ? [structuredClone(pull)]
        : [],
  };
  return { github, pull, statuses, budgets };
}

test('legacy byte fields on the PR head are allowed with no raise or status writes', async () => {
  for (const [onBase, onHead] of [
    [false, true],
    [true, false],
    [true, true],
  ]) {
    const f = fixture();
    f.budgets.base = structuredClone(f.budgets.head);
    for (const config of [
      ...(onBase ? [f.budgets.base] : []),
      ...(onHead ? [f.budgets.head] : []),
    ]) {
      Object.assign(config.limits, {
        standaloneStaticBytes: 290_000_000,
        webZipBytes: 92_000_000,
        installerBytes: 170_000_000,
      });
    }
    if (onBase && onHead) f.budgets.head.limits.installerBytes++;
    const result = await policy({
      github: f.github,
      owner: 'o',
      repo: 'r',
      number: 1,
      publish: false,
    });
    assert.equal(result.allowed, true, result.message);
    assert.equal(result.code, 'no-raise');
    assert.deepEqual(f.statuses, []);
  }
});

test('legacy fields cannot mask unknown fields or a count raise requiring approval', async () => {
  for (const side of ['base', 'head']) {
    const f = fixture();
    f.budgets.base = structuredClone(f.budgets.head);
    f.budgets.head.limits.standaloneStaticBytes = 290_000_000;
    f.budgets[side].limits.fooBytes = 1;
    const result = await policy({
      github: f.github,
      owner: 'o',
      repo: 'r',
      number: 1,
      publish: false,
    });
    assert.equal(result.allowed, false);
    assert.equal(result.code, 'invalid-budget');
  }
  const f = fixture();
  f.pull.user = { id: 2, login: 'contributor' };
  f.budgets.base = structuredClone(f.budgets.head);
  Object.assign(f.budgets.head.limits, {
    standaloneStaticBytes: 290_000_000,
    webZipBytes: 92_000_000,
    installerBytes: 170_000_000,
    repoWideKeys: f.budgets.base.limits.repoWideKeys + 1,
  });
  const args = {
    github: f.github,
    owner: 'o',
    repo: 'r',
    number: 1,
    publish: false,
  };
  assert.equal((await policy(args)).code, 'missing-label');
  f.pull.labels.push({ name: 'ci-budget-raise' });
  assert.equal((await policy(args)).code, 'owner-approval-required');
  const paginate = f.github.paginate;
  f.github.paginate = async (method, args) =>
    method !== f.github.rest.pulls.listReviews
      ? paginate(method, args)
      : [
          {
            id: 1,
            user: { id: 1, login: 'owner', type: 'User' },
            state: 'APPROVED',
            commit_id: f.pull.head.sha,
            submitted_at: '2026-11-01T00:00:00Z',
          },
        ];
  assert.equal((await policy(args)).code, 'owner-approved');
  assert.deepEqual(f.statuses, []);
});

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
  const result = await policy({
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
        await policy({
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
  assert.equal((await policy(args)).allowed, true);
  assert.equal(fixture_.statuses.at(-1).state, 'success');
  fixture_.pull.labels = [];
  const result = await policy(args);
  assert.equal(result.allowed, false);
  assert.equal(result.code, 'dependency-growth');
  assert.equal(fixture_.statuses.at(-1).state, 'failure');
  assert.equal(fixture_.statuses.at(-1).sha, fixture_.pull.head.sha);
});

test('primary policy gate reads live rules without a write token; unknown JSON is red', async () => {
  const { github, statuses } = fixture();
  const args = { github, owner: 'o', repo: 'r', number: 1, publish: false };
  assert.equal((await policy(args)).allowed, true);
  assert.equal(statuses.length, 0);
  const original = github.rest.repos.getContent;
  github.rest.repos.getContent = async (args_) =>
    args_.path.endsWith('package.json')
      ? { data: { encoding: 'unknown' } }
      : original(args_);
  assert.equal((await policy(args)).allowed, false);
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
    await policy(args);
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
  await policy(args);
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
  await policy(args);
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
    await policy({
      github: f.github,
      owner: 'o',
      repo: 'r',
      number: 1,
    });
    assert.equal(f.statuses.at(-1).context, 'Lint and Test');
    assert.equal(f.statuses.at(-1).state, 'pending');
  }
});

// ---------------------------------------------------------------------------
// A run writes statuses only to the SHA it evaluated (§107). Branch protection
// requires `Lint and Test` only; `CI Budget Raise Approval` is advisory, and the
// gate for budget policy is the check inside the required aggregator job.
// ---------------------------------------------------------------------------
const NEW_HEAD = 'c'.repeat(40);
const OLD_HEAD = 'd'.repeat(40);

// Reads after the first `after` return the changed context (head, base or labels).
function changeAfterFirstRead(f, mode, after = 1) {
  let reads = 0;
  f.github.rest.pulls.get = async () => {
    const pr = structuredClone(f.pull);
    if (++reads > after) {
      if (mode === 'head') pr.head.sha = NEW_HEAD;
      if (mode === 'base') pr.base.sha = 'e'.repeat(40);
      if (mode === 'labels') pr.labels = [];
    }
    return { data: pr };
  };
}
// How many PR reads the evaluation itself makes (initial read plus the nested
// approval reads), measured: the first status write follows the post-evaluation
// read and that write's own read.
async function evaluationReads() {
  const f = fixture();
  let reads = 0;
  let atFirstWrite;
  const get = f.github.rest.pulls.get;
  f.github.rest.pulls.get = async (args) => (reads++, get(args));
  const write = f.github.rest.repos.createCommitStatus;
  f.github.rest.repos.createCommitStatus = async (s) => {
    atFirstWrite ??= reads;
    return write(s);
  };
  await policy({ github: f.github, owner: 'o', repo: 'r', number: 1 });
  return atFirstWrite - 2;
}
// The last status per (sha, context): what GitHub shows for that context.
const finalState = (statuses, sha, context) =>
  statuses.filter((s) => s.sha === sha && s.context === context).at(-1)?.state;

test('pure head change after the evaluation: failure on the evaluated head only; the job is not failed', async () => {
  const f = fixture();
  const after = await evaluationReads();
  assert.ok(after >= 5, `evaluation reads: ${after}`);
  changeAfterFirstRead(f, 'head', after);
  const result = await policy({
    github: f.github,
    owner: 'o',
    repo: 'r',
    number: 1,
  });
  assert.equal(result.code, 'changed-context');
  assert.equal(result.headChanged, true);
  assert.equal(result.snapshotMismatch, false);
  assert.equal(result.evaluatedHead, f.pull.head.sha);
  assert.equal(result.currentHead, NEW_HEAD);
  assert.ok(f.statuses.length > 0);
  assert.ok(f.statuses.every((s) => s.sha === f.pull.head.sha));
  assert.ok(f.statuses.every((s) => s.sha !== NEW_HEAD));
  assert.equal(
    finalState(f.statuses, f.pull.head.sha, 'Lint and Test'),
    'failure',
  );
  // A superseded head is not a failure of the job; the log names both heads.
  const outcome = guardOutcome(7, result);
  assert.equal(outcome.fail, false);
  assert.match(outcome.line, /PR #7/);
  assert.ok(
    outcome.line.includes(f.pull.head.sha) && outcome.line.includes(NEW_HEAD),
  );
});

// Before Sol's delta read this row expected `outcome.fail === false`: the head
// moved while the nested approval check was reading, so the approval evaluated
// the new head, and a later read overwrote that evidence. The mismatch is now
// sticky, so the job fails.
test('head change during the evaluation: the job fails and says so in words', async () => {
  const f = fixture();
  changeAfterFirstRead(f, 'head');
  const result = await policy({
    github: f.github,
    owner: 'o',
    repo: 'r',
    number: 1,
  });
  assert.equal(result.code, 'changed-context');
  assert.equal(result.headChanged, true);
  assert.equal(result.snapshotMismatch, true);
  assert.ok(f.statuses.every((s) => s.sha === f.pull.head.sha));
  assert.equal(
    finalState(f.statuses, f.pull.head.sha, 'Lint and Test'),
    'failure',
  );
  assert.equal(result.supersededHead, false);
  assert.equal(result.latestHead, NEW_HEAD);
  // This job is listed on main's tip: the line must make it a five-second read.
  const outcome = guardOutcome(7, result);
  assert.equal(outcome.fail, true);
  assert.ok(
    outcome.line.startsWith(
      'PR #7: the PR head changed while this run was still evaluating',
    ),
  );
  assert.ok(
    outcome.line.includes(
      `(evaluated ${f.pull.head.sha}; also seen ${NEW_HEAD}; now ${NEW_HEAD})`,
    ),
  );
  assert.ok(
    outcome.line.includes(`It wrote failure to ${f.pull.head.sha} only;`),
  );
  assert.ok(
    outcome.line.includes(
      `the run for the PR's current head (${NEW_HEAD}) decides`,
    ),
  );
  assert.match(outcome.line, /This job concerns PR #7, not main\./);
});

for (const mode of ['labels', 'base']) {
  test(`${mode} change on the same head: failure on that head and the job fails`, async () => {
    const f = fixture();
    changeAfterFirstRead(f, mode);
    const result = await policy({
      github: f.github,
      owner: 'o',
      repo: 'r',
      number: 1,
    });
    assert.equal(result.code, 'changed-context');
    assert.equal(result.headChanged, false);
    assert.ok(f.statuses.every((s) => s.sha === f.pull.head.sha));
    assert.equal(
      finalState(f.statuses, f.pull.head.sha, 'Lint and Test'),
      'failure',
    );
    const outcome = guardOutcome(7, result);
    assert.equal(outcome.fail, true);
    assert.match(outcome.line, /PR #7/);
  });
}

test('race: the new head reports success, then the stale run writes last; the new head stays success', async () => {
  const statuses = [];
  // Run for the new head: completes green on `a…` (the fixture's head).
  const fresh = fixture();
  fresh.github.rest.repos.createCommitStatus = async (s) => {
    statuses.push(s);
    return { data: s };
  };
  // Stale run: evaluated OLD_HEAD; every later read already shows the new head.
  const stale = fixture();
  stale.pull.head.sha = OLD_HEAD;
  let reads = 0;
  stale.github.rest.pulls.get = async () => {
    const pr = structuredClone(stale.pull);
    if (++reads > 1) pr.head.sha = fresh.pull.head.sha;
    return { data: pr };
  };
  stale.github.rest.repos.createCommitStatus = async (s) => {
    statuses.push(s);
    return { data: s };
  };
  const args = { owner: 'o', repo: 'r', number: 1 };
  assert.equal((await policy({ github: fresh.github, ...args })).allowed, true);
  assert.equal(
    finalState(statuses, fresh.pull.head.sha, 'Lint and Test'),
    'success',
  );
  const late = await policy({
    github: stale.github,
    ...args,
    expectedHead: OLD_HEAD,
  });
  assert.equal(late.code, 'changed-context');
  assert.equal(
    finalState(statuses, fresh.pull.head.sha, 'Lint and Test'),
    'success',
  );
  assert.equal(finalState(statuses, OLD_HEAD, 'Lint and Test'), 'failure');
});

// A budget raise the owner approved on the exact head, with the raise label.
function approvedRaise() {
  const f = fixture();
  const base = structuredClone(f.budgets.head);
  const head = structuredClone(base);
  head.limits.typicalPrJobs += 1;
  f.budgets.base = base;
  f.budgets.head = head;
  f.pull.user = { login: 'author', id: 2 };
  f.pull.labels = [
    { name: DEPENDENCY_GROWTH_LABEL },
    { name: BUDGET_RAISE_LABEL },
  ];
  const paginate = f.github.paginate;
  f.github.paginate = async (method, args) =>
    method !== f.github.rest.pulls.listReviews
      ? paginate(method, args)
      : [
          {
            id: 5,
            submitted_at: '2026-11-01T00:00:00Z',
            user: { id: 1, type: 'User', login: 'owner' },
            commit_id: f.pull.head.sha,
            state: 'APPROVED',
          },
        ];
  return f;
}

test('raise label removed after a success: the unlabeled re-evaluation fails that head', async () => {
  // Re-evaluating event: pull_request_target `unlabeled` runs
  // ci-budget-label-approval.yml, which calls checkBudgetPolicy for the current head.
  const f = approvedRaise();
  const args = { github: f.github, owner: 'o', repo: 'r', number: 1 };
  const before = await policy(args);
  assert.equal(before.allowed, true, before.message);
  assert.equal(
    finalState(f.statuses, f.pull.head.sha, 'Lint and Test'),
    'success',
  );
  f.pull.labels = f.pull.labels.filter((l) => l.name !== BUDGET_RAISE_LABEL);
  const after = await policy(args);
  assert.equal(after.allowed, false);
  assert.equal(after.code, 'missing-label');
  assert.equal(
    finalState(f.statuses, f.pull.head.sha, 'Lint and Test'),
    'failure',
  );
  assert.equal(guardOutcome(1, after).fail, true);
  const workflow = readFileSync(
    '.github/workflows/ci-budget-label-approval.yml',
    'utf8',
  );
  assert.match(workflow, /types: \[[^\]]*\bunlabeled\b/);
});

async function runBudgetWorkflow(github, context, file, job) {
  const workflow = parse(readFileSync(`.github/workflows/${file}`, 'utf8'));
  const script = workflow.jobs[job].steps[1].with.script.replace(
    /^.*const \{ .* \} = await import.*;\n/m,
    '',
  );
  const run = new (Object.getPrototypeOf(async function () {}).constructor)(
    'github',
    'context',
    'core',
    'checkBudgetPolicy',
    'guardOutcome',
    'reconcileBudgetStatuses',
    script,
  );
  const failures = [],
    lines = [],
    results = [];
  const core = {
    summary: summaryFixture(),
    info: (line) => lines.push(line),
    setFailed: (line) => failures.push(line),
  };
  const checkedPolicy = async (args) => {
    const result = await checkBudgetPolicy(args);
    results.push(result);
    return result;
  };
  let reconciliation;
  await run(github, context, core, checkedPolicy, guardOutcome, (args) =>
    reconcileBudgetStatuses({ ...args, checkPolicy: checkedPolicy }).then(
      (result) => {
        reconciliation = result;
        return result;
      },
    ),
  );
  return { failures, lines, results, reconciliation, summary: core.summary };
}

async function runApprovalEvent(github, pull, action, changes) {
  const { failures } = await runBudgetWorkflow(
    github,
    {
      repo: { owner: 'o', repo: 'r' },
      payload: { action, changes, pull_request: structuredClone(pull) },
    },
    'ci-budget-label-approval.yml',
    'approval',
  );
  return failures;
}

function reconciliationCensus(f, installTransport) {
  const pulls = f.fixtures?.map((entry) => entry.pull) ?? [f.pull];
  f.github.rest.pulls.list = () => {};
  f.github.rest.rateLimit = {
    get: async () => ({ data: { resources: { core: { remaining: 1000 } } } }),
  };
  f.github.hook = { wrap: () => {}, remove: () => {} };
  f.github.rest.repos.getCombinedStatusForRef = async ({ ref }) => {
    const contexts = new Set();
    const statuses = f.statuses
      .slice()
      .reverse()
      .filter((status) => {
        if (status.sha !== ref || contexts.has(status.context)) return false;
        contexts.add(status.context);
        return true;
      });
    return { data: { statuses } };
  };
  const paginate = f.github.paginate;
  f.github.paginate = async (method, args) => {
    if (method !== f.github.rest.pulls.list) return paginate(method, args);
    assert.deepEqual(args, {
      owner: 'o',
      repo: 'r',
      state: 'open',
      base: 'main',
      per_page: 100,
    });
    return structuredClone(
      pulls.filter((pr) => pr.state === 'open' && pr.base.ref === 'main'),
    );
  };
  installTransport?.(f.github);
  return () =>
    runBudgetWorkflow(
      f.github,
      { repo: { owner: 'o', repo: 'r' }, runNumber: 1 },
      'ci-budget-reconcile.yml',
      'reconcile',
    );
}

// Real checkBudgetPolicy and the production request hook, with only HTTP
// responses replaced. Paginated requests pass through that same hook too.
function policyRequestTransport(github, beforeRequest) {
  const state = { remaining: 1000, requests: [] };
  let requestHook;
  github.hook = {
    wrap: (_name, callback) => {
      requestHook = callback;
    },
    remove: () => {
      requestHook = undefined;
    },
  };
  github.rest.rateLimit.get = async () => ({
    data: { resources: { core: { remaining: state.remaining } } },
  });
  const call = (serve, group, method, args) => {
    const request = async () => {
      beforeRequest?.({ state, group, method, args });
      state.remaining--;
      state.requests.push({ group, method, args });
      const response = await serve();
      return {
        ...response,
        headers: { 'x-ratelimit-remaining': String(state.remaining) },
      };
    };
    return requestHook
      ? requestHook(request, { group, method, args })
      : request();
  };
  const markers = new Set([
    github.rest.pulls.list,
    github.rest.pulls.listReviews,
    github.rest.repos.listPullRequestsAssociatedWithCommit,
  ]);
  for (const [group, endpoints] of Object.entries(github.rest)) {
    if (group === 'rateLimit') continue;
    for (const [method, endpoint] of Object.entries(endpoints)) {
      if (!markers.has(endpoint))
        endpoints[method] = (args) =>
          call(() => endpoint(args), group, method, args);
    }
  }
  const paginate = github.paginate;
  github.paginate = async (method, args) =>
    (
      await call(
        async () => ({ data: await paginate(method, args) }),
        'paginate',
        'page',
        args,
      )
    ).data;
  return state;
}

test('reconciliation logs a correct refusal and writes failure without making the job red', async () => {
  const f = approvedRaise();
  await policy({ github: f.github, owner: 'o', repo: 'r', number: 1 });
  f.pull.labels = [];
  const result = await reconciliationCensus(f)();
  assert.equal(finalState(f.statuses, RUN_HEAD, 'Lint and Test'), 'failure');
  assert.deepEqual(result.failures, []);
  assert.match(result.summary.text, /missing-label/);
  assert.match(result.summary.text, /success.*failure/);
});

test('an uncorrectable post-write verification failure is the case that makes reconciliation red', async () => {
  const f = approvedRaise();
  await policy({ github: f.github, owner: 'o', repo: 'r', number: 1 });
  f.statuses.push({
    sha: RUN_HEAD,
    context: 'Lint and Test',
    state: 'failure',
  });
  const write = f.github.rest.repos.createCommitStatus;
  let successWritten = false;
  f.github.rest.repos.createCommitStatus = async (status) => {
    if (status.context === 'Lint and Test' && status.state === 'success') {
      successWritten = true;
      f.pull.labels = [];
    } else if (
      successWritten &&
      status.context === 'Lint and Test' &&
      status.state === 'failure'
    )
      throw Object.assign(new Error('correction unavailable'), { status: 503 });
    return write(status);
  };
  const result = await reconciliationCensus(f)();
  assert.ok(successWritten);
  assert.equal(result.failures.length, 1);
  assert.match(result.failures[0], /unverified|uncorrected/);
  assert.match(result.summary.text, /correction unavailable/);
});

for (const current of ['missing', 'pending', 'failure', 'error', 'success']) {
  test(`passing policy with ${current} aggregator and primary in progress leaves it untouched and summarizes the skip`, async () => {
    const f = approvedRaise();
    await policy({ github: f.github, owner: 'o', repo: 'r', number: 1 });
    if (current === 'missing')
      f.statuses.splice(
        0,
        f.statuses.length,
        ...f.statuses.filter((status) => status.context !== 'Lint and Test'),
      );
    else
      f.statuses.push({
        sha: RUN_HEAD,
        context: 'Lint and Test',
        state: current,
      });
    const before = f.statuses.length;
    const runs = f.github.rest.actions.listWorkflowRuns;
    f.github.rest.actions.listWorkflowRuns = async (args) => {
      const result = await runs(args);
      result.data.workflow_runs[0].status = 'in_progress';
      return result;
    };
    const result = await reconciliationCensus(f)();
    assert.deepEqual(f.statuses.slice(before), []);
    assert.deepEqual(result.failures, []);
    assert.match(result.summary.text, /skipped: checks in progress/);
    assert.equal(
      finalState(f.statuses, RUN_HEAD, 'Lint and Test'),
      current === 'missing' ? undefined : current,
    );
  });
}

test('reconciliation transition table covers both contexts, all current states, and policy/primary verdicts', async () => {
  const transitions = {
    missing: { success: [], failure: ['failure'] },
    pending: { success: [], failure: ['failure'] },
    failure: { success: ['success'], failure: [] },
    error: { success: ['success'], failure: ['failure'] },
    success: { success: [], failure: ['failure'] },
  };
  for (const context of ['CI Budget Raise Approval', 'Lint and Test']) {
    for (const [current, expected] of Object.entries(transitions)) {
      for (const verdict of [
        'refused',
        'passed',
        ...(context === 'Lint and Test' ? ['primary-failed'] : []),
      ]) {
        const f = approvedRaise();
        for (const name of ['CI Budget Raise Approval', 'Lint and Test']) {
          if (name !== context || current !== 'missing')
            f.statuses.push({
              sha: RUN_HEAD,
              context: name,
              state: name === context ? current : 'success',
            });
        }
        if (verdict === 'refused') f.pull.labels = [];
        if (verdict === 'primary-failed') {
          const runs = f.github.rest.actions.listWorkflowRuns;
          f.github.rest.actions.listWorkflowRuns = async (args) => {
            const result = await runs(args);
            result.data.workflow_runs[0].conclusion = 'failure';
            return result;
          };
        }
        const before = f.statuses.length;
        const result = await reconciliationCensus(f)();
        assert.deepEqual(
          f.statuses
            .slice(before)
            .filter((status) => status.context === context)
            .map((status) => status.state),
          expected[verdict === 'passed' ? 'success' : 'failure'],
          `${context}/${current}/${verdict}`,
        );
        assert.deepEqual(result.failures, []);
        assert.ok(f.statuses.every((status) => status.sha === RUN_HEAD));
      }
    }
  }
});

test('an acknowledged correction whose status is still wrong makes the job red', async () => {
  const f = approvedRaise();
  await policy({ github: f.github, owner: 'o', repo: 'r', number: 1 });
  f.statuses.push({
    sha: RUN_HEAD,
    context: 'Lint and Test',
    state: 'failure',
  });
  const write = f.github.rest.repos.createCommitStatus;
  let successWritten = false;
  f.github.rest.repos.createCommitStatus = async (status) => {
    if (status.context === 'Lint and Test' && status.state === 'success') {
      successWritten = true;
      f.pull.labels = [];
    }
    if (
      successWritten &&
      status.context === 'Lint and Test' &&
      status.state === 'failure'
    )
      return { data: status };
    return write(status);
  };
  const result = await reconciliationCensus(f)();
  assert.equal(result.failures.length, 1);
  assert.match(result.failures[0], /unverified or uncorrected/);
  assert.equal(finalState(f.statuses, RUN_HEAD, 'Lint and Test'), 'success');
});

test('a policy-verified success replaced by an event publisher pending does not create a false failure', async () => {
  const f = approvedRaise();
  await policy({ github: f.github, owner: 'o', repo: 'r', number: 1 });
  f.statuses.push({
    sha: RUN_HEAD,
    context: 'Lint and Test',
    state: 'failure',
  });
  const write = f.github.rest.repos.createCommitStatus;
  f.github.rest.repos.createCommitStatus = async (status) => {
    const result = await write(status);
    if (status.context === 'Lint and Test' && status.state === 'success')
      f.statuses.push({ ...status, state: 'pending' });
    return result;
  };
  const result = await reconciliationCensus(f)();
  assert.deepEqual(result.failures, []);
  assert.equal(finalState(f.statuses, RUN_HEAD, 'Lint and Test'), 'pending');
  assert.match(result.summary.text, /verified; superseded by pending/);
});

test('a 5xx caught inside policy before any write is unreached and cannot manufacture a failure verdict', async () => {
  const f = approvedRaise();
  await policy({ github: f.github, owner: 'o', repo: 'r', number: 1 });
  const before = structuredClone(f.statuses);
  f.github.rest.repos.getContent = async () => {
    throw Object.assign(new Error('budget read unavailable'), { status: 503 });
  };
  const result = await reconciliationCensus(f, (github) =>
    policyRequestTransport(github),
  )();
  assert.deepEqual(f.statuses, before);
  assert.deepEqual(result.failures, []);
  assert.deepEqual(result.reconciliation.unreached, [1]);
  assert.match(result.summary.text, /API 503: budget read unavailable/);
});

for (const accepted of [false, true]) {
  test(`a 5xx status POST with accepted=${accepted} reports only an observable unverified write as red`, async () => {
    const f = approvedRaise();
    await policy({ github: f.github, owner: 'o', repo: 'r', number: 1 });
    f.statuses.push({
      sha: RUN_HEAD,
      context: 'Lint and Test',
      state: 'failure',
    });
    const write = f.github.rest.repos.createCommitStatus;
    f.github.rest.repos.createCommitStatus = async (status) => {
      if (status.context === 'Lint and Test' && status.state === 'success') {
        if (accepted) await write(status);
        throw Object.assign(new Error('write acknowledgement unavailable'), {
          status: 503,
        });
      }
      return write(status);
    };
    const result = await reconciliationCensus(f, (github) =>
      policyRequestTransport(github),
    )();
    assert.equal(result.failures.length, accepted ? 1 : 0);
    assert.equal(
      finalState(f.statuses, RUN_HEAD, 'Lint and Test'),
      accepted ? 'success' : 'failure',
    );
    assert.match(result.summary.text, /write acknowledgement unavailable/);
    if (accepted) assert.match(result.failures[0], /unverified or uncorrected/);
  });
}

test('real-policy hook completes verification and failure correction when an admitted write leaves 150 requests', async () => {
  const f = approvedRaise();
  await policy({ github: f.github, owner: 'o', repo: 'r', number: 1 });
  f.statuses.push({
    sha: RUN_HEAD,
    context: 'Lint and Test',
    state: 'failure',
  });
  let admitted = false,
    verified = false,
    corrected = false,
    transport;
  const run = reconciliationCensus(f, (github) => {
    transport = policyRequestTransport(
      github,
      ({ state, group, method, args }) => {
        if (
          method === 'createCommitStatus' &&
          args.context === 'Lint and Test' &&
          args.state === 'success'
        ) {
          // Admission saw ample quota. Another publisher spends it immediately
          // before our actual POST; 151 remain, and the write consumes one.
          state.remaining = 151;
          f.pull.labels = [];
          admitted = true;
        } else if (admitted && group === 'pulls' && method === 'get')
          verified = true;
        if (
          admitted &&
          method === 'createCommitStatus' &&
          args.context === 'Lint and Test' &&
          args.state === 'failure'
        )
          corrected = true;
      },
    );
  });
  const result = await run();
  assert.ok(admitted);
  assert.ok(
    verified,
    'The production hook must not block the verify GET at the floor',
  );
  assert.ok(
    corrected,
    'The production hook must permit the failure correction below the floor',
  );
  assert.equal(finalState(f.statuses, RUN_HEAD, 'Lint and Test'), 'failure');
  assert.deepEqual(result.failures, []);
  assert.ok(
    result.lines.some((line) => line.includes('corrected successfully')),
  );
  assert.ok(result.results[0].reads.some((read) => read.phase === 'verify'));
  assert.ok(transport.remaining < 150);
});

test('real-policy success admission below floor plus verification reserve writes nothing and reports unreached', async () => {
  const f = approvedRaise();
  await policy({ github: f.github, owner: 'o', repo: 'r', number: 1 });
  f.statuses.push({
    sha: RUN_HEAD,
    context: 'Lint and Test',
    state: 'failure',
  });
  const before = f.statuses.length;
  let statusReads = 0,
    transport;
  const run = reconciliationCensus(f, (github) => {
    transport = policyRequestTransport(github, ({ state, method }) => {
      // Approval is already green; the second lookup is the stale required red.
      if (method === 'getCombinedStatusForRef' && ++statusReads === 2)
        state.remaining = 152;
    });
  });
  const result = await run();
  assert.equal(
    f.statuses.length,
    before,
    '151 remaining cannot admit success plus verification/correction',
  );
  assert.deepEqual(result.reconciliation.unreached, [1]);
  assert.equal(result.reconciliation.stopReason, 'request budget');
  assert.deepEqual(result.failures, []);
  const reservation = result.lines.find((line) =>
    line.includes('success not admitted'),
  );
  const counted = Number(
    reservation.match(/\+ (\d+) verify\/correction requests/)[1],
  );
  // One census request precedes this evaluation; the remaining observed
  // prefix plus four cleanup requests is the named reservation.
  assert.equal(counted, transport.requests.length - 1 + 4);
});

test('one hundred green reconciliation confirmations write no statuses, then still withdraw revocation', async () => {
  const f = approvedRaise();
  await policy({ github: f.github, owner: 'o', repo: 'r', number: 1 });
  const before = f.statuses.length;
  const run = reconciliationCensus(f);
  for (let i = 0; i < 100; i++) {
    const result = await run();
    assert.deepEqual(result.failures, []);
    assert.ok(
      result.lines.some((line) => line.includes('confirmed, no write')),
    );
  }
  assert.equal(f.statuses.length, before);
  f.pull.labels = [];
  await run();
  assert.equal(f.statuses.length, before + 2);
  for (const context of ['Lint and Test', 'CI Budget Raise Approval'])
    assert.equal(finalState(f.statuses, RUN_HEAD, context), 'failure');
});

test('reconciliation clears a stale context with exactly one success followed by live verification', async () => {
  const f = approvedRaise();
  await policy({ github: f.github, owner: 'o', repo: 'r', number: 1 });
  f.statuses.push({
    sha: RUN_HEAD,
    context: 'Lint and Test',
    state: 'failure',
  });
  const before = f.statuses.length;
  const writes = f.github.rest.repos.createCommitStatus;
  const reads = f.github.rest.pulls.get;
  let verified = false,
    written = false;
  f.github.rest.repos.createCommitStatus = async (status) => {
    written = true;
    return writes(status);
  };
  f.github.rest.pulls.get = async (args) => {
    if (written) verified = true;
    return reads(args);
  };
  const run = reconciliationCensus(f);
  await run();
  assert.deepEqual(
    f.statuses.slice(before).map(({ context, state }) => ({ context, state })),
    [{ context: 'Lint and Test', state: 'success' }],
  );
  assert.ok(verified);
  await run();
  assert.equal(f.statuses.length, before + 1);
});

test('reconciliation only clears stale reds and never grants a missing or pending success', async () => {
  for (const state of [undefined, 'pending']) {
    const f = approvedRaise();
    if (state)
      for (const context of ['Lint and Test', 'CI Budget Raise Approval'])
        f.statuses.push({ sha: RUN_HEAD, context, state });
    const before = f.statuses.length;
    await reconciliationCensus(f)();
    assert.equal(f.statuses.length, before);
  }
});

test('a reconciliation success that clears a stale red is corrected after a post-write revocation', async () => {
  const f = approvedRaise();
  await policy({ github: f.github, owner: 'o', repo: 'r', number: 1 });
  f.statuses.push({
    sha: RUN_HEAD,
    context: 'Lint and Test',
    state: 'failure',
  });
  const write = f.github.rest.repos.createCommitStatus;
  f.github.rest.repos.createCommitStatus = async (status) => {
    const response = await write(status);
    if (status.context === 'Lint and Test' && status.state === 'success')
      f.pull.labels = [];
    return response;
  };
  const result = await reconciliationCensus(f)();
  assert.equal(result.results[0].allowed, false);
  assert.deepEqual(result.failures, []);
  assert.ok(
    result.lines.some((line) => line.includes('corrected successfully')),
  );
  assert.match(result.summary.text, /corrected and verified/);
  assert.equal(finalState(f.statuses, RUN_HEAD, 'Lint and Test'), 'failure');
  assert.ok(result.results[0].reads.some((read) => read.phase === 'verify'));
});

test('hourly reconciliation withdraws a green after main lowers a cap without any PR event or label', async () => {
  const f = approvedRaise();
  f.budgets.head = structuredClone(f.budgets.base);
  f.pull.labels = [{ name: DEPENDENCY_GROWTH_LABEL }];
  assert.equal(
    (await policy({ github: f.github, owner: 'o', repo: 'r', number: 1 }))
      .allowed,
    true,
  );
  assert.equal(finalState(f.statuses, RUN_HEAD, 'Lint and Test'), 'success');
  f.budgets.base.limits.typicalPrJobs--;
  const result = await reconciliationCensus(f)();
  assert.equal(result.results[0].code, 'missing-label');
  for (const name of ['Lint and Test', 'CI Budget Raise Approval'])
    assert.equal(finalState(f.statuses, RUN_HEAD, name), 'failure');
  const expected = guardOutcome(1, result.results[0]).line;
  assert.deepEqual(result.failures, []);
  assert.ok(
    result.lines.includes(expected),
    'withdrawal must be visible in the job log',
  );
  assert.match(
    expected,
    new RegExp(
      `PR #1: missing-label \\(evaluated ${RUN_HEAD}, current ${RUN_HEAD}\\)`,
    ),
  );
});

test('hourly reconciliation corrects a paths-filtered label revocation', async () => {
  const f = approvedRaise();
  await policy({ github: f.github, owner: 'o', repo: 'r', number: 1 });
  f.pull.labels = [];
  f.github.rest.pulls.listFiles = () =>
    assert.fail('Reconciliation must not consult changed paths');
  const result = await reconciliationCensus(f)();
  assert.equal(result.results[0].code, 'missing-label');
  assert.equal(finalState(f.statuses, RUN_HEAD, 'Lint and Test'), 'failure');
});

test('hourly reconciliation repairs an interrupted success only according to the live policy', async () => {
  for (const approved of [false, true]) {
    const f = approvedRaise();
    // A dead publisher left successes without any following verification reads.
    for (const context of ['Lint and Test', 'CI Budget Raise Approval'])
      f.statuses.push({ sha: RUN_HEAD, context, state: 'success' });
    if (!approved) f.pull.labels = [];
    const result = await reconciliationCensus(f)();
    assert.equal(result.results[0].allowed, approved);
    for (const context of ['Lint and Test', 'CI Budget Raise Approval'])
      assert.equal(
        finalState(f.statuses, RUN_HEAD, context),
        approved ? 'success' : 'failure',
      );
    if (approved)
      assert.ok(
        result.results[0].reads.some((read) => read.phase === 'verify'),
      );
  }
});

for (const departure of ['closed', 'retargeted']) {
  test(`hourly reconciliation clears the shared-head red after the refusing peer is ${departure}`, async () => {
    const f = sharedHeadApprovals();
    const peer = f.fixtures[1].pull;
    peer.labels = [];
    await policy({ github: f.github, owner: 'o', repo: 'r', number: 2 });
    assert.equal(finalState(f.statuses, RUN_HEAD, 'Lint and Test'), 'failure');
    if (departure === 'closed') peer.state = 'closed';
    else peer.base.ref = 'release';
    const result = await reconciliationCensus(f)();
    assert.deepEqual(result.failures, []);
    assert.equal(result.results.length, 1);
    for (const context of ['Lint and Test', 'CI Budget Raise Approval'])
      assert.equal(finalState(f.statuses, RUN_HEAD, context), 'success');
  });
}

test('the next hourly reconciliation clears a red from a mid-evaluation peer retarget', async () => {
  const f = sharedHeadApprovals();
  const peer = f.fixtures[1].pull;
  const read = f.github.rest.pulls.get;
  let peerReads = 0;
  f.github.rest.pulls.get = async (args) => {
    if (args.pull_number === 2 && ++peerReads === 2) {
      peer.base.ref = 'release';
      peer.base.sha = 'c'.repeat(40);
    }
    return read(args);
  };
  const raced = await policy({
    github: f.github,
    owner: 'o',
    repo: 'r',
    number: 2,
  });
  assert.equal(raced.allowed, false);
  assert.equal(finalState(f.statuses, RUN_HEAD, 'Lint and Test'), 'failure');
  const result = await reconciliationCensus(f)();
  assert.deepEqual(result.failures, []);
  assert.equal(finalState(f.statuses, RUN_HEAD, 'Lint and Test'), 'success');
});

test('reconciliation cannot grant a missing approval or upgrade incomplete primary checks', async () => {
  for (const primary of ['in_progress', 'failure', 'success']) {
    const f = approvedRaise();
    for (const context of ['Lint and Test', 'CI Budget Raise Approval'])
      f.statuses.push({ sha: RUN_HEAD, context, state: 'failure' });
    const runs = f.github.rest.actions.listWorkflowRuns;
    f.github.rest.actions.listWorkflowRuns = async (args) => {
      const response = await runs(args);
      response.data.workflow_runs[0].status =
        primary === 'in_progress' ? 'in_progress' : 'completed';
      response.data.workflow_runs[0].conclusion =
        primary === 'failure' ? 'failure' : 'success';
      return response;
    };
    const run = reconciliationCensus(f);
    await run();
    assert.equal(
      finalState(f.statuses, RUN_HEAD, 'Lint and Test'),
      primary === 'in_progress' ? 'failure' : primary,
    );
    f.pull.labels = [];
    await run();
    await run();
    for (const context of ['Lint and Test', 'CI Budget Raise Approval'])
      assert.equal(finalState(f.statuses, RUN_HEAD, context), 'failure');
  }
});

test('reconciliation skips draft and non-main targets and rechecks eligibility after listing', async () => {
  for (const excluded of [
    'draft',
    'base',
    'closed',
    'retargeted-after-list',
    'draft-after-list',
  ]) {
    const f = approvedRaise();
    const run = reconciliationCensus(f);
    if (excluded === 'draft') f.pull.draft = true;
    if (excluded === 'base') f.pull.base.ref = 'release';
    if (excluded === 'closed') f.pull.state = 'closed';
    const read = f.github.rest.pulls.get;
    f.github.rest.pulls.get = async (args) => {
      if (excluded === 'retargeted-after-list') f.pull.base.ref = 'release';
      if (excluded === 'draft-after-list') f.pull.draft = true;
      return read(args);
    };
    const result = await run();
    assert.deepEqual(f.statuses, [], excluded);
    assert.deepEqual(result.results, [], excluded);
    assert.deepEqual(result.failures, [], excluded);
  }
});

test('reconciliation binds the freshly read head, not the potentially stale list snapshot', async () => {
  const f = approvedRaise();
  const run = reconciliationCensus(f);
  const paginate = f.github.paginate;
  f.github.paginate = async (method, args) => {
    const rows = await paginate(method, args);
    if (method === f.github.rest.pulls.list) rows[0].head.sha = OLD_HEAD;
    return rows;
  };
  const result = await run();
  assert.equal(result.results[0].allowed, true);
  assert.equal(result.results[0].evaluatedHead, RUN_HEAD);
  assert.ok(f.statuses.every((status) => status.sha === RUN_HEAD));
});

test('head movement after reconciliation binds writes nothing to the new head', async () => {
  for (const moment of [
    'before-policy',
    'during-policy',
    'after-evaluation',
    'after-success',
  ]) {
    const f = approvedRaise();
    const run = reconciliationCensus(f);
    let reads = 0;
    for (const context of ['Lint and Test', 'CI Budget Raise Approval'])
      f.statuses.push({ sha: RUN_HEAD, context, state: 'failure' });
    const read = f.github.rest.pulls.get;
    const moveAt = {
      'before-policy': 2,
      'during-policy': 3,
      'after-evaluation': 7,
    }[moment];
    f.github.rest.pulls.get = async (args) => {
      if (++reads === moveAt) f.pull.head.sha = OLD_HEAD;
      return read(args);
    };
    const write = f.github.rest.repos.createCommitStatus;
    f.github.rest.repos.createCommitStatus = async (status) => {
      const response = await write(status);
      if (moment === 'after-success' && status.state === 'success')
        f.pull.head.sha = OLD_HEAD;
      return response;
    };
    const result = await run();
    const checked = result.results[0];
    assert.equal(checked.evaluatedHead, RUN_HEAD, moment);
    assert.equal(checked.allowed, false, moment);
    assert.ok(
      f.statuses.every((status) => status.sha === RUN_HEAD),
      moment,
    );
    assert.equal(
      checked.supersededHead,
      ['before-policy', 'after-evaluation'].includes(moment),
      moment,
    );
    assert.equal(result.failures.length, 0, moment);
  }
});

test('API errors caught inside shared-head policy remain unreached rather than fabricated verdicts', async () => {
  const f = sharedHeadApprovals();
  const read = f.github.rest.pulls.get;
  f.github.rest.pulls.get = async (args) => {
    if (args.pull_number === 1) throw new Error('API unavailable');
    return read(args);
  };
  const run = reconciliationCensus(f, (github) =>
    policyRequestTransport(github),
  );
  const result = await run();
  assert.ok(result.lines.some((line) => /PR #1.*API unavailable/.test(line)));
  assert.deepEqual(result.failures, []);
  assert.deepEqual(result.reconciliation.unreached, [1, 2]);
  assert.deepEqual(f.statuses, []);
  assert.match(result.summary.text, /API unavailable/);
});

test('label workflow fails an unchanged budget head after main lowered the cap and the owner revoked approval', async () => {
  const f = approvedRaise();
  // No budget change on this branch: its budget remains the merge-base value.
  const mergeBaseBudget = structuredClone(f.budgets.base);
  f.budgets.head = structuredClone(mergeBaseBudget);
  f.budgets.base.limits.typicalPrJobs -= 1;
  assert.deepEqual(f.budgets.head, mergeBaseBudget);
  f.github.rest.pulls.listFiles = () =>
    assert.fail('File diffs must not gate label reevaluation');
  const before = await runApprovalEvent(f.github, f.pull, 'labeled');
  assert.equal(finalState(f.statuses, RUN_HEAD, 'Lint and Test'), 'success');
  assert.deepEqual(before, []);
  f.pull.labels = f.pull.labels.filter(
    (label) => label.name !== BUDGET_RAISE_LABEL,
  );
  const failures = await runApprovalEvent(f.github, f.pull, 'unlabeled');
  for (const name of ['Lint and Test', 'CI Budget Raise Approval'])
    assert.equal(finalState(f.statuses, RUN_HEAD, name), 'failure');
  assert.equal(failures.length, 1);
  assert.ok(f.statuses.every((status) => status.sha === RUN_HEAD));
});

test('a queued direct evaluation after close or merge still reads live labels and writes only its bound head', async () => {
  for (const merged of [false, true]) {
    const f = approvedRaise();
    f.pull.state = 'closed';
    f.pull.merged = merged;
    const args = { github: f.github, owner: 'o', repo: 'r', number: 1 };
    assert.equal((await policy(args)).allowed, true);
    assert.equal(finalState(f.statuses, RUN_HEAD, 'Lint and Test'), 'success');
    f.pull.labels = f.pull.labels.filter(
      (label) => label.name !== BUDGET_RAISE_LABEL,
    );
    assert.equal((await policy(args)).code, 'missing-label');
    assert.equal(finalState(f.statuses, RUN_HEAD, 'Lint and Test'), 'failure');
    assert.ok(f.statuses.every((status) => status.sha === RUN_HEAD));
  }
});

test('a budget raise with no label cannot obtain a successful required Lint and Test by any path', async () => {
  const f = approvedRaise();
  f.pull.labels = [{ name: DEPENDENCY_GROWTH_LABEL }];
  // Path 1: the guard and approval workflows publish statuses.
  const published = await policy({
    github: f.github,
    owner: 'o',
    repo: 'r',
    number: 1,
  });
  assert.equal(published.allowed, false);
  assert.ok(
    !f.statuses.some(
      (s) => s.context === 'Lint and Test' && s.state === 'success',
    ),
  );
  // Path 2: the aggregator job evaluates without publishing and throws on refusal.
  const gate = await policy({
    github: f.github,
    owner: 'o',
    repo: 'r',
    number: 1,
    publish: false,
  });
  assert.equal(gate.allowed, false);
  const prChecks = readFileSync('.github/workflows/pr-checks.yml', 'utf8');
  assert.match(
    prChecks,
    /publish: false,[\s\S]{0,120}\}\);[\s\S]{0,80}if \(!result\.allowed\) throw new Error/,
  );
  // The status publishers fail their job on every refusal except a superseded head.
  for (const file of ['lint-and-test-guard.yml', 'ci-budget-approval.yml']) {
    const text = readFileSync(`.github/workflows/${file}`, 'utf8');
    assert.match(text, /guardOutcome\(/);
    assert.match(text, /if \(outcome\.fail\) core\.setFailed\(outcome\.line\)/);
    assert.doesNotMatch(text, /if \(!result\.allowed\) core\.setFailed/);
  }
});

test('head change together with a label or base change is a refusal and fails the job', async () => {
  for (const extra of ['labels', 'base']) {
    const f = fixture();
    let reads = 0;
    f.github.rest.pulls.get = async () => {
      const pr = structuredClone(f.pull);
      if (++reads > 1) {
        pr.head.sha = NEW_HEAD;
        if (extra === 'labels') pr.labels = [];
        else pr.base.sha = 'e'.repeat(40);
      }
      return { data: pr };
    };
    const result = await policy({
      github: f.github,
      owner: 'o',
      repo: 'r',
      number: 1,
    });
    assert.equal(result.code, 'changed-context');
    assert.equal(result.headChanged, true);
    assert.ok(f.statuses.every((s) => s.sha === f.pull.head.sha));
    assert.equal(guardOutcome(1, result).fail, true, extra);
  }
});

test('X then Y then X: an approval evaluated on another head never publishes success to X', async () => {
  // The run starts on X (a raise, no label). The nested approval check reads
  // Y (no raise) twice; every later read is back on X.
  const f = approvedRaise();
  const X = f.pull.head.sha;
  const Y = 'f'.repeat(40);
  f.pull.labels = [{ name: DEPENDENCY_GROWTH_LABEL }];
  const noRaise = structuredClone(f.budgets.base);
  const content = f.github.rest.repos.getContent;
  f.github.rest.repos.getContent = async (args) =>
    args.path === 'config/ci/budgets.json' && args.ref === Y
      ? {
          data: {
            encoding: 'base64',
            content: Buffer.from(JSON.stringify(noRaise)).toString('base64'),
          },
        }
      : content(args);
  let reads = 0;
  f.github.rest.pulls.get = async () => {
    const pr = structuredClone(f.pull);
    reads += 1;
    if (reads === 2 || reads === 3) pr.head.sha = Y;
    return { data: pr };
  };
  const result = await policy({
    github: f.github,
    owner: 'o',
    repo: 'r',
    number: 1,
  });
  assert.equal(result.allowed, false);
  assert.equal(result.snapshotMismatch, true);
  assert.ok(!f.statuses.some((s) => s.sha === X && s.state === 'success'));
  assert.ok(f.statuses.every((s) => s.sha === X));
  // The message reports the head seen during evaluation (Y) separately from
  // the latest head (back at X); it never reads "from X to X".
  const outcome = guardOutcome(1, result);
  assert.equal(outcome.fail, true);
  assert.equal(result.latestHead, X);
  assert.deepEqual(result.otherHeads, [Y]);
  assert.ok(
    outcome.line.includes(`(evaluated ${X}; also seen ${Y}; now ${X})`),
  );
  assert.ok(outcome.line.includes(`It wrote failure to ${X} only;`));
  assert.ok(!outcome.line.includes(`from ${X} to ${X}`));
  assert.ok(!outcome.line.includes(`nothing to ${X}`));
});

test('the aggregator refuses when the PR head is no longer the head its run is for', async () => {
  const f = fixture();
  const args = {
    github: f.github,
    owner: 'o',
    repo: 'r',
    number: 1,
    publish: false,
  };
  assert.equal(
    (await policy({ ...args, expectedHead: f.pull.head.sha })).allowed,
    true,
  );
  const stale = await policy({ ...args, expectedHead: OLD_HEAD });
  assert.equal(stale.allowed, false);
  assert.equal(stale.code, 'changed-context');
  const prChecks = readFileSync('.github/workflows/pr-checks.yml', 'utf8');
  assert.match(
    prChecks,
    /expectedHead: context\.payload\.pull_request\.head\.sha \}\);/,
  );
});

// ---------------------------------------------------------------------------
// Sol's delta read of #3381: the binding is mandatory (P1) and disqualifying
// evidence is sticky across the whole evaluation (P2).
// ---------------------------------------------------------------------------
const tmp = mkdtempSync(path.join(os.tmpdir(), 'budget-approval-'));
const eventFile = (payload) => {
  const file = path.join(
    tmp,
    `event-${Math.random().toString(16).slice(2)}.json`,
  );
  writeFileSync(file, JSON.stringify(payload));
  return file;
};

test('a run with no valid head binding is refused, writes nothing, fails the job and names the remedy', async () => {
  for (const publish of [false, true]) {
    for (const binding of [
      { eventPath: undefined },
      { eventPath: path.join(tmp, 'missing.json') },
      { eventPath: eventFile({ workflow_run: { head_sha: RUN_HEAD } }) },
      {
        eventPath: eventFile({
          pull_request: { number: 2, head: { sha: RUN_HEAD } },
        }),
      },
      {
        eventPath: eventFile({
          pull_request: { number: 1, head: { sha: 'short' } },
        }),
      },
      { expectedHead: null },
      { expectedHead: '' },
      { expectedHead: 'A'.repeat(40) },
      { expectedHead: 'a'.repeat(39) },
      { expectedHead: 42 },
    ]) {
      const f = fixture();
      const result = await checkBudgetPolicy({
        github: f.github,
        owner: 'o',
        repo: 'r',
        number: 1,
        publish,
        ...binding,
      });
      const label = `${publish} ${JSON.stringify(binding)}`;
      assert.equal(result.allowed, false, label);
      assert.equal(result.code, 'unbound-run', label);
      assert.ok(result.message.includes(STALE_REF_REMEDY), label);
      assert.deepEqual(f.statuses, [], label);
      assert.equal(guardOutcome(1, result).fail, true, label);
    }
  }
});

test('an old pr-checks.yml that passes no head is bound to its own pull_request event', async () => {
  // The stale-ref case: a re-run, or a run whose aggregator starts after this
  // merges, carries a pr-checks.yml without expectedHead but loads this
  // validator from main. It binds to the head of the event that started it.
  const call = (f, head) =>
    checkBudgetPolicy({
      github: f.github,
      owner: 'o',
      repo: 'r',
      number: 1,
      publish: false,
      eventPath: eventFile({
        pull_request: { number: 1, head: { sha: head } },
      }),
    });
  assert.equal((await call(fixture(), RUN_HEAD)).allowed, true);
  const superseded = await call(fixture(), OLD_HEAD);
  assert.equal(superseded.allowed, false);
  assert.equal(superseded.code, 'changed-context');
  assert.equal(superseded.evaluatedHead, OLD_HEAD);
  // An explicit head wins over the event.
  const f = fixture();
  const explicit = await checkBudgetPolicy({
    github: f.github,
    owner: 'o',
    repo: 'r',
    number: 1,
    publish: false,
    expectedHead: RUN_HEAD,
    eventPath: eventFile({
      pull_request: { number: 1, head: { sha: OLD_HEAD } },
    }),
  });
  assert.equal(explicit.allowed, true);
});

test('a publisher bound to a superseded head writes nothing and is not failed', async () => {
  const f = fixture();
  const result = await policy({
    github: f.github,
    owner: 'o',
    repo: 'r',
    number: 1,
    expectedHead: OLD_HEAD,
  });
  assert.equal(result.code, 'changed-context');
  assert.deepEqual(f.statuses, []);
  assert.equal(guardOutcome(1, result).fail, false);
});

// Sol's read of d31ea0e0a: the message for several heads, and for a nested
// result that names no head. otherHeads lists read heads in read order, then
// heads named by nested results.
test('the head-changed message lists every other head seen, and a nested result with no head', async () => {
  const X = RUN_HEAD;
  const Y = 'f'.repeat(40);
  const Z = 'e'.repeat(40);
  // X -> Y -> Z: the nested check reads Y then Z; every later read is Z.
  const f = fixture();
  let reads = 0;
  f.github.rest.pulls.get = async () => {
    const pr = structuredClone(f.pull);
    reads += 1;
    if (reads === 2) pr.head.sha = Y;
    if (reads >= 3) pr.head.sha = Z;
    return { data: pr };
  };
  const result = await policy({
    github: f.github,
    owner: 'o',
    repo: 'r',
    number: 1,
  });
  assert.deepEqual(result.otherHeads, [Y, Z]);
  const line = guardOutcome(1, result).line;
  assert.ok(line.includes(`(evaluated ${X}; also seen ${Y}, ${Z}; now ${Z})`));
  assert.ok(line.includes(`the run for the PR's current head (${Z}) decides`));
  // A nested result that names no head, then the head moves after evaluation.
  const g = fixture();
  changeAfterFirstRead(g, 'head');
  const unnamed = await policy({
    github: g.github,
    owner: 'o',
    repo: 'r',
    number: 1,
    checkRaise: async () => ({
      allowed: true,
      code: 'no-raise',
      message: 'ok',
    }),
  });
  assert.deepEqual(unnamed.otherHeads, [NEW_HEAD, '(none)']);
  const outcome = guardOutcome(1, unnamed);
  assert.equal(outcome.fail, true);
  assert.ok(
    outcome.line.includes(
      `(evaluated ${X}; also seen ${NEW_HEAD}, (none); now ${NEW_HEAD})`,
    ),
  );
});

test('a nested approval that names no head is a refusal and fails the job', async () => {
  const f = fixture();
  for (const evaluatedHead of [undefined, null, '']) {
    f.statuses.length = 0;
    const result = await policy({
      github: f.github,
      owner: 'o',
      repo: 'r',
      number: 1,
      checkRaise: async () => ({
        allowed: true,
        code: 'no-raise',
        message: 'ok',
        evaluatedHead,
      }),
    });
    assert.equal(result.allowed, false, String(evaluatedHead));
    assert.equal(result.snapshotMismatch, true);
    assert.ok(!f.statuses.some((s) => s.state === 'success'));
    assert.equal(guardOutcome(1, result).fail, true);
  }
});

test('a mismatch during the refreshed approval evaluation is sticky and fails the job', async () => {
  // The first approval evaluation and the dependency reads are on X; from the
  // refreshed approval evaluation on, every read shows Y (where approval passes).
  const after = await evaluationReads();
  const f = fixture();
  const X = f.pull.head.sha;
  const Y = 'f'.repeat(40);
  let reads = 0;
  f.github.rest.pulls.get = async () => {
    const pr = structuredClone(f.pull);
    reads += 1;
    if (reads >= after - 1) pr.head.sha = Y;
    return { data: pr };
  };
  const result = await policy({
    github: f.github,
    owner: 'o',
    repo: 'r',
    number: 1,
  });
  assert.equal(result.allowed, false);
  assert.equal(result.snapshotMismatch, true);
  assert.ok(f.statuses.every((s) => s.sha === X));
  assert.ok(!f.statuses.some((s) => s.state === 'success'));
  assert.equal(guardOutcome(1, result).fail, true);
});

test('a label or base change survives a later pure head change, even if it reverts', async () => {
  for (const extra of ['labels', 'base']) {
    const after = await evaluationReads();
    const f = fixture();
    let reads = 0;
    f.github.rest.pulls.get = async () => {
      const pr = structuredClone(f.pull);
      reads += 1;
      if (reads > after) pr.head.sha = NEW_HEAD;
      // Only the post-evaluation read sees the label/base change; every later
      // read (before each status write) shows it reverted.
      if (reads === after + 1) {
        if (extra === 'labels') pr.labels = [];
        else pr.base.sha = 'e'.repeat(40);
      }
      return { data: pr };
    };
    const result = await policy({
      github: f.github,
      owner: 'o',
      repo: 'r',
      number: 1,
    });
    assert.equal(result.code, 'changed-context', extra);
    assert.equal(
      extra === 'labels' ? result.labelsChanged : result.baseChanged,
      true,
      extra,
    );
    assert.ok(f.statuses.every((s) => s.sha === f.pull.head.sha));
    assert.equal(guardOutcome(1, result).fail, true, extra);
  }
});

// Sol's re-read of bf613ef9f: the nested approval check saw a base (or label)
// change on the same head; it reverted and the head moved before the outer
// reads, which see only a head change. The nested evidence must survive.
test('a base or label change seen only by the nested approval check still fails the job', async () => {
  for (const extra of ['base', 'labels']) {
    const f = fixture();
    let reads = 0;
    f.github.rest.pulls.get = async () => {
      const pr = structuredClone(f.pull);
      reads += 1;
      // 1: outer initial (X/B). 2: nested initial (X/B). 3: nested final
      // (X/C, or labels changed). 4+: reverted, head moved to Y.
      if (reads === 3) {
        if (extra === 'base') pr.base.sha = 'e'.repeat(40);
        else pr.labels = [];
      }
      if (reads >= 4) pr.head.sha = NEW_HEAD;
      return { data: pr };
    };
    const result = await policy({
      github: f.github,
      owner: 'o',
      repo: 'r',
      number: 1,
    });
    assert.equal(result.allowed, false, extra);
    assert.equal(
      extra === 'base' ? result.baseChanged : result.labelsChanged,
      true,
      extra,
    );
    assert.ok(f.statuses.every((s) => s.sha === f.pull.head.sha));
    assert.ok(!f.statuses.some((s) => s.state === 'success'));
    assert.equal(guardOutcome(1, result).fail, true, extra);
  }
});

test('any nested changed-context refusal is not proof of a superseded head', async () => {
  // The stubbed nested check makes no PR reads, so every outer read after the
  // first shows a new head. Whatever the nested refusal says changed, it is not
  // a clean evaluation, so the job is not exempt.
  for (const flags of [
    {},
    { headChanged: true },
    { headChanged: true, baseChanged: false, labelsChanged: false },
  ]) {
    const f = fixture();
    changeAfterFirstRead(f, 'head');
    const result = await policy({
      github: f.github,
      owner: 'o',
      repo: 'r',
      number: 1,
      checkRaise: async () => ({
        allowed: false,
        code: 'changed-context',
        message: 'changed',
        evaluatedHead: RUN_HEAD,
        ...flags,
      }),
    });
    const label = JSON.stringify(flags);
    assert.equal(result.nestedChanged, true, label);
    assert.equal(result.supersededHead, false, label);
    assert.equal(guardOutcome(1, result).fail, true, label);
  }
});

// Round 4 (Sol's re-read of d8512a550): each nested check sees a stable but
// different snapshot, so neither refuses, and the outer reads never see it.
test('a base or label seen only inside one nested check, stable there, still fails the job', async () => {
  for (const extra of ['base', 'labels']) {
    const after = await evaluationReads();
    const f = fixture();
    let reads = 0;
    f.github.rest.pulls.get = async () => {
      const pr = structuredClone(f.pull);
      reads += 1;
      // 1: outer X/B. 2-3: first nested check, X/C both times. 4-5: refreshed
      // nested check, X/B. After the evaluation: head Y, base B.
      if (reads === 2 || reads === 3) {
        if (extra === 'base') pr.base.sha = 'e'.repeat(40);
        else pr.labels = [];
      }
      if (reads > after) pr.head.sha = NEW_HEAD;
      return { data: pr };
    };
    const result = await policy({
      github: f.github,
      owner: 'o',
      repo: 'r',
      number: 1,
    });
    assert.equal(result.allowed, false, extra);
    assert.equal(result.supersededHead, false, extra);
    assert.equal(guardOutcome(1, result).fail, true, extra);
  }
});

// A small deterministic generator, so the sweep below is reproducible.
function lcg(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

test('every PR read, outer and nested, is in the log in order', async () => {
  const random = lcg(3381);
  for (let run = 0; run < 200; run += 1) {
    const f = fixture();
    const served = [];
    f.github.rest.pulls.get = async () => {
      const pr = structuredClone(f.pull);
      if (served.length > 0) {
        if (random() < 0.2) pr.head.sha = NEW_HEAD;
        if (random() < 0.1) pr.base.sha = 'e'.repeat(40);
        if (random() < 0.1) pr.labels = [];
      }
      served.push({
        head: pr.head.sha,
        base: pr.base.sha,
        labels: JSON.stringify(pr.labels.map((l) => l.name).sort()),
      });
      return { data: pr };
    };
    const result = await policy({
      github: f.github,
      owner: 'o',
      repo: 'r',
      number: 1,
    });
    assert.deepEqual(
      result.reads.map(({ head, base, labels }) => ({ head, base, labels })),
      served,
      `run ${run}`,
    );
  }
});

test('sweep: an exempt job always means every read kept the base and labels and the evaluation saw one head', async () => {
  // Safety, checked against what the stub served, not against the validator's
  // own evidence: if the job is exempt, every served read had the initial base
  // and labels, and the head changed only after the reads the evaluation made.
  const random = lcg(1107);
  const evaluation = await evaluationReads();
  let exempt = 0;
  for (let run = 0; run < 2000; run += 1) {
    const f = fixture();
    const served = [];
    const changeAt = 1 + Math.floor(random() * (evaluation + 4));
    const p = random();
    f.github.rest.pulls.get = async () => {
      const pr = structuredClone(f.pull);
      const index = served.length;
      if (index >= changeAt) pr.head.sha = NEW_HEAD;
      if (index > 0 && random() < p * 0.15) pr.base.sha = 'e'.repeat(40);
      if (index > 0 && random() < p * 0.15) pr.labels = [];
      served.push(pr);
      return { data: pr };
    };
    const result = await policy({
      github: f.github,
      owner: 'o',
      repo: 'r',
      number: 1,
    });
    if (guardOutcome(1, result).fail) continue;
    if (result.allowed) continue;
    exempt += 1;
    const labels = JSON.stringify(f.pull.labels.map((l) => l.name).sort());
    for (const pr of served) {
      assert.equal(pr.base.sha, f.pull.base.sha, `run ${run}`);
      assert.equal(
        JSON.stringify(pr.labels.map((l) => l.name).sort()),
        labels,
        `run ${run}`,
      );
    }
    for (const pr of served.slice(0, evaluation))
      assert.equal(pr.head.sha, f.pull.head.sha, `run ${run}`);
  }
  // The sweep must exercise the exemption, not only refusals.
  assert.ok(exempt > 50, `exempt runs: ${exempt}`);
});

test('every status publisher binds its run to the head it is for', () => {
  const guard = readFileSync(
    '.github/workflows/lint-and-test-guard.yml',
    'utf8',
  );
  assert.match(
    guard,
    /checkBudgetPolicy\(\{[^}]*expectedHead: source\.head_sha \}\)/,
  );
  const approval = readFileSync(
    '.github/workflows/ci-budget-approval.yml',
    'utf8',
  );
  assert.match(approval, /checkBudgetPolicy\(\{[^}]*expectedHead: head \}\)/);
  assert.match(approval, /head: signal\.head_sha/);
  assert.match(approval, /head: context\.payload\.pull_request\.head\.sha/);
  assert.match(approval, /targets = \[\{ number, head: pr\.head\.sha \}\]/);
  for (const text of [guard, approval])
    assert.doesNotMatch(
      text,
      /checkBudgetPolicy\(\{ github, [^}]*number(: pull\.number)? \}\)/,
    );
});

test('every real success write is followed by a verify read in the complete read log', async () => {
  const f = approvedRaise();
  const served = [];
  const successes = [];
  const get = f.github.rest.pulls.get;
  f.github.rest.pulls.get = async (args) => {
    const response = await get(args);
    served.push({
      head: response.data.head.sha,
      base: response.data.base.sha,
      labels: JSON.stringify(
        response.data.labels.map((label) => label.name).sort(),
      ),
    });
    return response;
  };
  const write = f.github.rest.repos.createCommitStatus;
  f.github.rest.repos.createCommitStatus = async (status) => {
    if (status.state === 'success')
      successes.push({ context: status.context, nextRead: served.length });
    return write(status);
  };
  const result = await policy({
    github: f.github,
    owner: 'o',
    repo: 'r',
    number: 1,
  });
  assert.equal(result.allowed, true);
  // Nested approval writes use the sink, so these are the only real successes.
  assert.deepEqual(
    successes.map((write) => write.context),
    ['CI Budget Raise Approval', 'Lint and Test'],
  );
  assert.deepEqual(
    result.reads.map(({ head, base, labels }) => ({ head, base, labels })),
    served,
  );
  for (const success of successes) {
    assert.ok(result.reads.length > success.nextRead, success.context);
    assert.equal(
      result.reads[success.nextRead].phase,
      'verify',
      success.context,
    );
  }
});

for (const context of ['CI Budget Raise Approval', 'Lint and Test']) {
  for (const field of ['labels', 'base', 'head']) {
    test(`verify after ${context} success corrects a changed ${field} on the evaluated head and fails the job`, async () => {
      const f = approvedRaise();
      const write = f.github.rest.repos.createCommitStatus;
      f.github.rest.repos.createCommitStatus = async (status) => {
        const response = await write(status);
        if (status.context === context && status.state === 'success') {
          // Even a label change that leaves policy allowed must invalidate the
          // original snapshot; required-label removals have separate rows.
          if (field === 'labels')
            f.pull.labels.push({ name: 'context-changed' });
          if (field === 'base') f.pull.base.sha = 'e'.repeat(40);
          if (field === 'head') f.pull.head.sha = NEW_HEAD;
        }
        return response;
      };
      const result = await policy({
        github: f.github,
        owner: 'o',
        repo: 'r',
        number: 1,
      });
      assert.equal(result.allowed, false);
      assert.equal(result.supersededHead, false);
      assert.equal(guardOutcome(1, result).fail, true);
      assert.equal(finalState(f.statuses, RUN_HEAD, context), 'failure');
      assert.ok(f.statuses.every((status) => status.sha === RUN_HEAD));
      assert.ok(result.reads.some((read) => read.phase === 'verify'));
    });
  }
}

test('a stale success written after the revocation failure is corrected by its own verify', async () => {
  const f = approvedRaise();
  const write = f.github.rest.repos.createCommitStatus;
  let interleaved = false;
  f.github.rest.repos.createCommitStatus = async (status) => {
    if (
      !interleaved &&
      status.state === 'success' &&
      status.context === 'Lint and Test'
    ) {
      interleaved = true;
      f.pull.labels = f.pull.labels.filter(
        (label) => label.name !== BUDGET_RAISE_LABEL,
      );
      const revoked = await policy({
        github: f.github,
        owner: 'o',
        repo: 'r',
        number: 1,
      });
      assert.equal(revoked.allowed, false);
      assert.equal(
        finalState(f.statuses, RUN_HEAD, 'Lint and Test'),
        'failure',
      );
    }
    return write(status);
  };
  const stale = await policy({
    github: f.github,
    owner: 'o',
    repo: 'r',
    number: 1,
  });
  assert.ok(interleaved);
  assert.equal(stale.allowed, false);
  assert.equal(guardOutcome(1, stale).fail, true);
  assert.equal(finalState(f.statuses, RUN_HEAD, 'Lint and Test'), 'failure');
});

function sharedHeadApprovals(count = 2) {
  const fixtures = Array.from({ length: count }, () => approvedRaise());
  fixtures.forEach((f, index) => {
    f.pull.number = index + 1;
  });
  const statuses = [];
  const github = fixtures[0].github;
  github.rest.pulls.get = async ({ pull_number }) => ({
    data: structuredClone(fixtures[pull_number - 1].pull),
  });
  github.paginate = async (method, args) =>
    method === github.rest.repos.listPullRequestsAssociatedWithCommit
      ? fixtures.map((f) => structuredClone(f.pull))
      : [
          {
            id: 5,
            submitted_at: '2026-11-01T00:00:00Z',
            user: { id: 1, type: 'User', login: 'owner' },
            commit_id: fixtures[args.pull_number - 1].pull.head.sha,
            state: 'APPROVED',
          },
        ];
  github.rest.repos.createCommitStatus = async (status) => {
    statuses.push(status);
    return { data: status };
  };
  return { fixtures, github, statuses };
}

test('an out-of-scope publishing target evaluates nothing, writes nothing and does not fail', async () => {
  for (const outside of ['branch', 'repository']) {
    const f = sharedHeadApprovals();
    const target = f.fixtures[1].pull;
    if (outside === 'branch') target.base.ref = 'release';
    else target.base.repo.full_name = 'foreign/repo';
    target.labels = [];
    assert.equal(
      (await policy({ github: f.github, owner: 'o', repo: 'r', number: 1 }))
        .allowed,
      true,
    );
    const before = structuredClone(f.statuses);
    const result = await policy({
      github: f.github,
      owner: 'o',
      repo: 'r',
      number: 2,
      checkRaise: () =>
        assert.fail('An ineligible target must not evaluate policy'),
    });
    assert.equal(result.code, 'not-main', outside);
    assert.equal(
      result.allowed,
      true,
      'Read-only aggregators must also skip without failing',
    );
    assert.equal(result.evaluatedHead, null);
    assert.equal(result.reads.length, 1);
    assert.deepEqual(f.statuses, before, outside);
    const outcome = guardOutcome(2, result);
    assert.equal(outcome.fail, false);
    assert.match(outcome.line, /not-main/);
    assert.doesNotMatch(outcome.line, /evaluated null/);
  }
});

test('a peer retargeted out of main after association listing is skipped by the shared policy', async () => {
  const f = sharedHeadApprovals();
  const paginate = f.github.paginate;
  f.github.paginate = async (method, args) => {
    const listed = await paginate(method, args);
    if (method === f.github.rest.repos.listPullRequestsAssociatedWithCommit) {
      f.fixtures[1].pull.base.ref = 'release';
      f.fixtures[1].pull.labels = [];
    }
    return listed;
  };
  const result = await policy({
    github: f.github,
    owner: 'o',
    repo: 'r',
    number: 1,
  });
  assert.equal(result.allowed, true);
  assert.equal(finalState(f.statuses, RUN_HEAD, 'Lint and Test'), 'success');
});

test('a base-change event retargeting an unapproved same-head PR into main fails that head without a budget diff', async () => {
  const f = sharedHeadApprovals();
  const target = f.fixtures[1].pull;
  target.base.ref = 'release';
  target.labels = [];
  f.github.rest.pulls.listFiles = () =>
    assert.fail('Retarget evaluation must not depend on file diffs');
  assert.equal(
    (await policy({ github: f.github, owner: 'o', repo: 'r', number: 1 }))
      .allowed,
    true,
  );
  assert.equal(finalState(f.statuses, RUN_HEAD, 'Lint and Test'), 'success');
  target.base.ref = 'main';
  const failures = await runApprovalEvent(f.github, target, 'edited', {
    base: { ref: { from: 'release' } },
  });
  assert.equal(failures.length, 1);
  for (const context of ['Lint and Test', 'CI Budget Raise Approval'])
    assert.equal(finalState(f.statuses, RUN_HEAD, context), 'failure');
  assert.ok(f.statuses.every((status) => status.sha === RUN_HEAD));
});

test('a non-main peer is ignored before and after its label removal on the shared SHA', async () => {
  const f = sharedHeadApprovals();
  const peer = f.fixtures[1].pull;
  peer.base.ref = 'release';
  const get = f.github.rest.pulls.get;
  const peerReads = [];
  f.github.rest.pulls.get = (args) => {
    if (args.pull_number === 2) peerReads.push(args);
    return get(args);
  };
  const args = { github: f.github, owner: 'o', repo: 'r', number: 1 };
  assert.equal((await policy(args)).allowed, true);
  peer.labels = peer.labels.filter(
    (label) => label.name !== BUDGET_RAISE_LABEL,
  );
  const after = await policy(args);
  assert.equal(
    after.allowed,
    true,
    'A non-main peer cannot invalidate main approval',
  );
  for (const context of ['Lint and Test', 'CI Budget Raise Approval'])
    assert.equal(finalState(f.statuses, RUN_HEAD, context), 'success');
  assert.deepEqual(peerReads, [], 'Non-main peer policy must not be evaluated');
});

for (const context of ['CI Budget Raise Approval', 'Lint and Test']) {
  test(`verify of ${context} success refreshes a dismissed owner review on the shared SHA`, async () => {
    const f = sharedHeadApprovals();
    const paginate = f.github.paginate;
    const write = f.github.rest.repos.createCommitStatus;
    let dismissed = false;
    let freshReviewReads = 0;
    f.github.paginate = async (method, args) => {
      const result = await paginate(method, args);
      if (
        dismissed &&
        method === f.github.rest.pulls.listReviews &&
        args.pull_number === 1
      ) {
        freshReviewReads += 1;
        return result.map((review) => ({ ...review, state: 'DISMISSED' }));
      }
      return result;
    };
    f.github.rest.repos.createCommitStatus = async (status) => {
      const result = await write(status);
      if (status.state === 'success' && status.context === context)
        dismissed = true;
      return result;
    };
    const before = f.fixtures.map((fixture) => structuredClone(fixture.pull));
    const result = await policy({
      github: f.github,
      owner: 'o',
      repo: 'r',
      number: 2,
    });
    assert.ok(dismissed, 'The success must reach GitHub before dismissal');
    assert.ok(
      freshReviewReads > 0,
      'Verify must fetch live reviews after success',
    );
    assert.equal(result.allowed, false);
    assert.equal(guardOutcome(2, result).fail, true);
    assert.equal(finalState(f.statuses, RUN_HEAD, context), 'failure');
    assert.ok(f.statuses.every((status) => status.sha === RUN_HEAD));
    assert.deepEqual(
      f.fixtures.map((fixture) => fixture.pull),
      before,
      'Labels, bases and heads remained unchanged',
    );
  });
}

test('shared SHA: a revoked A and approved B leave failure in both publisher orders', async () => {
  for (const order of [
    [1, 2],
    [2, 1],
  ]) {
    const f = sharedHeadApprovals();
    f.fixtures[0].pull.labels = f.fixtures[0].pull.labels.filter(
      (label) => label.name !== BUDGET_RAISE_LABEL,
    );
    for (const number of order) {
      const result = await policy({
        github: f.github,
        owner: 'o',
        repo: 'r',
        number,
      });
      assert.equal(result.allowed, false, `order ${order}, PR ${number}`);
      assert.equal(guardOutcome(number, result).fail, true);
    }
    for (const context of ['Lint and Test', 'CI Budget Raise Approval'])
      assert.notEqual(
        finalState(f.statuses, RUN_HEAD, context),
        'success',
        `${order}: ${context}`,
      );
  }
});

for (const context of ['CI Budget Raise Approval', 'Lint and Test']) {
  test(`verify of ${context} success rechecks the other PR sharing the SHA`, async () => {
    const f = sharedHeadApprovals();
    const write = f.github.rest.repos.createCommitStatus;
    f.github.rest.repos.createCommitStatus = async (status) => {
      const response = await write(status);
      if (status.context === context && status.state === 'success')
        f.fixtures[0].pull.labels = f.fixtures[0].pull.labels.filter(
          (label) => label.name !== BUDGET_RAISE_LABEL,
        );
      return response;
    };
    const result = await policy({
      github: f.github,
      owner: 'o',
      repo: 'r',
      number: 2,
    });
    assert.equal(result.allowed, false);
    assert.equal(guardOutcome(2, result).fail, true);
    assert.equal(finalState(f.statuses, RUN_HEAD, context), 'failure');
    assert.ok(
      result.reads.some((read) => read.number === 1 && read.phase === 'verify'),
    );
  });
}

test('associated approval read failures and superseded peer bindings refuse success', async () => {
  for (const fault of ['read', 'head', 'association']) {
    const f = sharedHeadApprovals();
    const get = f.github.rest.pulls.get;
    const paginate = f.github.paginate;
    f.github.rest.pulls.get = async (args) => {
      if (args.pull_number === 1) {
        if (fault === 'read') throw new Error('Associated PR read unavailable');
        const response = await get(args);
        if (fault === 'head') response.data.head.sha = NEW_HEAD;
        return response;
      }
      return get(args);
    };
    f.github.paginate = async (method, args) => {
      if (
        fault === 'association' &&
        method === f.github.rest.repos.listPullRequestsAssociatedWithCommit
      )
        throw new Error('Association list unavailable');
      return paginate(method, args);
    };
    const result = await policy({
      github: f.github,
      owner: 'o',
      repo: 'r',
      number: 2,
    });
    assert.equal(result.allowed, false, fault);
    assert.equal(guardOutcome(2, result).fail, true, fault);
    assert.ok(!f.statuses.some((status) => status.state === 'success'), fault);
  }
});

test('only open exact-head PRs into this base repository gate a shared SHA', async () => {
  for (const excluded of ['closed', 'head', 'repository']) {
    const f = sharedHeadApprovals();
    const peer = f.fixtures[0].pull;
    peer.labels = [];
    if (excluded === 'closed') peer.state = 'closed';
    if (excluded === 'head') peer.head.sha = NEW_HEAD;
    if (excluded === 'repository') peer.base.repo.full_name = 'foreign/repo';
    const get = f.github.rest.pulls.get;
    f.github.rest.pulls.get = (args) => {
      assert.notEqual(
        args.pull_number,
        1,
        'Excluded peer must not be evaluated',
      );
      return get(args);
    };
    const result = await policy({
      github: f.github,
      owner: 'o',
      repo: 'r',
      number: 2,
    });
    assert.equal(result.allowed, true, excluded);
    assert.equal(
      finalState(f.statuses, RUN_HEAD, 'Lint and Test'),
      'success',
      excluded,
    );
  }
});

test('a closed triggering PR cannot override an open peer revocation on the same SHA', async () => {
  const f = sharedHeadApprovals();
  f.fixtures[1].pull.state = 'closed';
  f.fixtures[0].pull.labels = f.fixtures[0].pull.labels.filter(
    (label) => label.name !== BUDGET_RAISE_LABEL,
  );
  const result = await policy({
    github: f.github,
    owner: 'o',
    repo: 'r',
    number: 2,
  });
  assert.equal(result.allowed, false);
  assert.equal(guardOutcome(2, result).fail, true);
  assert.ok(!f.statuses.some((status) => status.state === 'success'));
});

test('associated snapshots stay in the recording log without conflating different PR labels', async () => {
  const f = sharedHeadApprovals();
  f.fixtures[0].pull.labels.push({ name: 'peer-only-label' });
  const result = await policy({
    github: f.github,
    owner: 'o',
    repo: 'r',
    number: 2,
  });
  assert.equal(result.allowed, true);
  assert.equal(result.labelsChanged, false);
  assert.ok(
    result.reads.some(
      (read) => read.number === 1 && read.labels.includes('peer-only-label'),
    ),
  );
  assert.ok(
    result.reads.some((read) => read.number === 1 && read.phase === 'verify'),
  );
});

test('a failed post-success read is corrected to failure when the status API is available', async () => {
  const f = approvedRaise();
  const get = f.github.rest.pulls.get;
  const write = f.github.rest.repos.createCommitStatus;
  let successWritten = false;
  f.github.rest.pulls.get = (args) => {
    if (successWritten) throw new Error('PR verification unavailable');
    return get(args);
  };
  f.github.rest.repos.createCommitStatus = async (status) => {
    const response = await write(status);
    if (status.state === 'success') successWritten = true;
    return response;
  };
  const result = await policy({
    github: f.github,
    owner: 'o',
    repo: 'r',
    number: 1,
  });
  assert.equal(result.allowed, false);
  assert.equal(guardOutcome(1, result).fail, true);
  assert.equal(
    finalState(f.statuses, RUN_HEAD, 'CI Budget Raise Approval'),
    'failure',
  );
});

test('interruption after an accepted success leaves it until a later completed evaluation', async () => {
  const f = approvedRaise();
  const write = f.github.rest.repos.createCommitStatus;
  f.github.rest.repos.createCommitStatus = async (status) => {
    const response = await write(status);
    if (status.state === 'success' && status.context === 'Lint and Test') {
      f.pull.labels = f.pull.labels.filter(
        (label) => label.name !== BUDGET_RAISE_LABEL,
      );
      throw new Error('Job interrupted before verify');
    }
    return response;
  };
  await assert.rejects(
    policy({ github: f.github, owner: 'o', repo: 'r', number: 1 }),
    /Job interrupted before verify/,
  );
  assert.equal(finalState(f.statuses, RUN_HEAD, 'Lint and Test'), 'success');
  f.github.rest.repos.createCommitStatus = write;
  await policy({ github: f.github, owner: 'o', repo: 'r', number: 1 });
  assert.equal(finalState(f.statuses, RUN_HEAD, 'Lint and Test'), 'failure');
});

test('seeded interleavings: a quiescent current head with any revoked associated PR has no final success', async () => {
  const random = lcg(338502);
  let successWrites = 0;
  let sharedRevocations = 0;
  let revokedHeads = 0;
  let overlappingRuns = 0;
  for (let ordering = 0; ordering < 2000; ordering += 1) {
    const pair = ordering % 2 === 0;
    const f = sharedHeadApprovals(pair ? 2 : 1);
    // Every head budget raises the cap over either possible base. Thus the
    // independent oracle needs only the label snapshots served by the stub.
    const originalContent = f.github.rest.repos.getContent;
    f.github.rest.repos.getContent = async (args) =>
      args.path === 'config/ci/budgets.json'
        ? {
            data: {
              encoding: 'base64',
              content: Buffer.from(
                JSON.stringify(
                  ['b'.repeat(40), 'e'.repeat(40)].includes(args.ref)
                    ? f.fixtures[0].budgets.base
                    : f.fixtures[0].budgets.head,
                ),
              ).toString('base64'),
            },
          }
        : originalContent(args);
    const source = f.github.rest.actions.listWorkflowRuns;
    f.github.rest.actions.listWorkflowRuns = async (args) => {
      const result = await source(args);
      result.data.workflow_runs[0].head_sha = args.head_sha;
      return result;
    };
    const pending = [];
    const served = [];
    const completed = [];
    const errors = [];
    let active = 0;
    let nextRun = 0;
    let overlapped = false;
    const start = (number) => {
      const run = nextRun++;
      const expectedHead = f.fixtures[number - 1].pull.head.sha;
      active += 1;
      if (active > 1) overlapped = true;
      const gate = (kind, call, args) =>
        new Promise((resolve, reject) => {
          pending.push({
            run,
            kind,
            state: args?.state,
            context: args?.context,
            serve: async () => {
              try {
                const result = await call();
                if (kind === 'pr')
                  served.push({
                    run,
                    number: result.data.number,
                    head: result.data.head.sha,
                    base: result.data.base.sha,
                    labels: JSON.stringify(
                      result.data.labels.map((label) => label.name).sort(),
                    ),
                  });
                resolve(result);
              } catch (error) {
                reject(error);
              }
            },
          });
        });
      const originals = new Map();
      const client = {
        rest: {},
        paginate: (method, args) =>
          gate('paginate', () =>
            f.github.paginate(originals.get(method), args),
          ),
      };
      for (const [area, methods] of Object.entries(f.github.rest)) {
        client.rest[area] = {};
        for (const [method, call] of Object.entries(methods)) {
          const kind =
            area === 'pulls' && method === 'get'
              ? 'pr'
              : area === 'repos' && method === 'createCommitStatus'
                ? 'status'
                : 'api';
          const wrapped = (args) => gate(kind, () => call(args), args);
          originals.set(wrapped, call);
          client.rest[area][method] = wrapped;
        }
      }
      policy({ github: client, owner: 'o', repo: 'r', number, expectedHead })
        .then(
          (result) => completed.push({ run, result }),
          (error) => errors.push(error),
        )
        .finally(() => {
          active -= 1;
        });
    };
    const label = (number, approved) => {
      const pull = f.fixtures[number - 1].pull;
      pull.labels = pull.labels.filter(
        (label) => label.name !== BUDGET_RAISE_LABEL,
      );
      if (approved) pull.labels.push({ name: BUDGET_RAISE_LABEL });
    };
    const actions = [
      () => label(1, false),
      () => label(1, true),
      () => {
        f.fixtures[0].pull.head.sha = NEW_HEAD;
      },
      () => {
        f.fixtures[0].pull.head.sha = RUN_HEAD;
      },
      () => {
        f.fixtures[0].pull.base.sha = 'e'.repeat(40);
      },
      () => {
        f.fixtures[0].pull.base.sha = 'b'.repeat(40);
      },
    ];
    for (let i = actions.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [actions[i], actions[j]] = [actions[j], actions[i]];
    }
    // Final event evaluations cover each current PR. Historical SHAs that no
    // longer head a PR retain the separately disclosed force-push exposure.
    actions.push(() => {
      label(1, false);
      if (pair) {
        if (ordering % 4 === 0)
          f.fixtures[1].pull.head.sha = f.fixtures[0].pull.head.sha;
        label(2, ordering % 3 !== 0);
      }
      start(1);
      if (pair) start(2);
    });
    start(pair ? 2 : 1);
    let steps = 0;
    while (active || pending.length || actions.length) {
      await settleMicrotasks();
      assert.ok(
        ++steps < 3000,
        `ordering ${ordering}: scheduler did not drain`,
      );
      // One fifth first completes a real success, ensuring the safety sweep
      // cannot pass just because every evaluation refuses before publishing.
      // One eighth delays the first run's final success in the transport until
      // the final event evaluations finish. This deliberately includes stale
      // success writes landing after a newer revocation failure, with the
      // remaining API reads/start times still chosen by the seeded scheduler.
      const delayed = (item) =>
        ordering % 8 === 0 &&
        item.run === 0 &&
        item.kind === 'status' &&
        item.state === 'success' &&
        item.context === 'Lint and Test';
      const holdSuccess =
        actions.length > 0 || completed.length < f.fixtures.length;
      const eligible = pending
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => !(holdSuccess && delayed(item)));
      const allowMutation =
        (ordering % 5 !== 0 && ordering % 8 !== 0) ||
        completed.length > 0 ||
        pending.some(delayed);
      if (
        actions.length &&
        (!eligible.length || (allowMutation && random() < 0.14))
      ) {
        actions.shift()();
      } else if (eligible.length) {
        const { index } = eligible[Math.floor(random() * eligible.length)];
        const [item] = pending.splice(index, 1);
        await item.serve();
      }
    }
    assert.deepEqual(errors, [], `ordering ${ordering}`);
    for (const { run, result } of completed) {
      assert.deepEqual(
        result.reads.map(({ number, head, base, labels }) => ({
          number,
          head,
          base,
          labels,
        })),
        served
          .filter((read) => read.run === run)
          .map(({ number, head, base, labels }) => ({
            number,
            head,
            base,
            labels,
          })),
        `ordering ${ordering}, run ${run}: incomplete recording client`,
      );
    }
    // Oracle: only snapshots served by the stub and actual status writes. No
    // allowed/evidence/guardOutcome field from the implementation decides it.
    const latest = new Map(served.map((read) => [read.number, read]));
    const heads = new Set(
      [...latest.values()]
        .filter((read) => !JSON.parse(read.labels).includes(BUDGET_RAISE_LABEL))
        .map((read) => read.head),
    );
    for (const head of heads) {
      revokedHeads += 1;
      for (const context of ['Lint and Test', 'CI Budget Raise Approval'])
        assert.notEqual(
          finalState(f.statuses, head, context),
          'success',
          `ordering ${ordering}: revoked ${head}, ${context}`,
        );
    }
    if (
      pair &&
      new Set([...latest.values()].map((read) => read.head)).size === 1
    )
      sharedRevocations += 1;
    if (overlapped) overlappingRuns += 1;
    successWrites += f.statuses.filter(
      (status) => status.state === 'success',
    ).length;
  }
  assert.ok(successWrites >= 500, `success path floor: ${successWrites}`);
  assert.ok(sharedRevocations >= 500, `shared-SHA floor: ${sharedRevocations}`);
  assert.ok(overlappingRuns >= 1000, `overlap floor: ${overlappingRuns}`);
  assert.ok(revokedHeads >= 2000, `revocation floor: ${revokedHeads}`);
  process.stdout.write(
    `Interleave sweep: 2000 orderings, ${successWrites} success writes, ${sharedRevocations} shared-SHA revocations, ${overlappingRuns} overlapping runs, ${revokedHeads} revoked current heads\n`,
  );
});
