import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { checkBudgetPolicy, guardOutcome } from './budget-approval.mjs';
import { loadBudgets } from './budget-config.mjs';
import { DEPENDENCY_GROWTH_LABEL } from './budget-dependencies.mjs';
import { BUDGET_RAISE_LABEL } from './garden-approval.mjs';

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
    paginate: async () => [],
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
    const result = await checkBudgetPolicy({
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
    const result = await checkBudgetPolicy({
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
  assert.equal((await checkBudgetPolicy(args)).code, 'missing-label');
  f.pull.labels.push({ name: 'ci-budget-raise' });
  assert.equal((await checkBudgetPolicy(args)).code, 'owner-approval-required');
  f.github.paginate = async () => [
    {
      id: 1,
      user: { id: 1, login: 'owner', type: 'User' },
      state: 'APPROVED',
      commit_id: f.pull.head.sha,
      submitted_at: '2026-11-01T00:00:00Z',
    },
  ];
  assert.equal((await checkBudgetPolicy(args)).code, 'owner-approved');
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

// ---------------------------------------------------------------------------
// A run writes statuses only to the SHA it evaluated (§107). Branch protection
// requires `Lint and Test` only; `CI Budget Raise Approval` is advisory, and the
// gate for budget policy is the check inside the required aggregator job.
// ---------------------------------------------------------------------------
const NEW_HEAD = 'c'.repeat(40);
const OLD_HEAD = 'd'.repeat(40);

// Reads after the first return the changed context (head, base or labels).
function changeAfterFirstRead(f, mode) {
  let reads = 0;
  f.github.rest.pulls.get = async () => {
    const pr = structuredClone(f.pull);
    if (++reads > 1) {
      if (mode === 'head') pr.head.sha = NEW_HEAD;
      if (mode === 'base') pr.base.sha = 'e'.repeat(40);
      if (mode === 'labels') pr.labels = [];
    }
    return { data: pr };
  };
}
// The last status per (sha, context): what GitHub shows for that context.
const finalState = (statuses, sha, context) =>
  statuses.filter((s) => s.sha === sha && s.context === context).at(-1)?.state;

test('head change: failure is written to the evaluated head and nothing to the new head', async () => {
  const f = fixture();
  changeAfterFirstRead(f, 'head');
  const result = await checkBudgetPolicy({
    github: f.github,
    owner: 'o',
    repo: 'r',
    number: 1,
  });
  assert.equal(result.code, 'changed-context');
  assert.equal(result.headChanged, true);
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

for (const mode of ['labels', 'base']) {
  test(`${mode} change on the same head: failure on that head and the job fails`, async () => {
    const f = fixture();
    changeAfterFirstRead(f, mode);
    const result = await checkBudgetPolicy({
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
  assert.equal(
    (await checkBudgetPolicy({ github: fresh.github, ...args })).allowed,
    true,
  );
  assert.equal(
    finalState(statuses, fresh.pull.head.sha, 'Lint and Test'),
    'success',
  );
  const late = await checkBudgetPolicy({ github: stale.github, ...args });
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
  f.github.paginate = async () => [
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
  // ci-budget-approval.yml, which calls checkBudgetPolicy for the current head.
  const f = approvedRaise();
  const args = { github: f.github, owner: 'o', repo: 'r', number: 1 };
  const before = await checkBudgetPolicy(args);
  assert.equal(before.allowed, true, before.message);
  assert.equal(
    finalState(f.statuses, f.pull.head.sha, 'Lint and Test'),
    'success',
  );
  f.pull.labels = f.pull.labels.filter((l) => l.name !== BUDGET_RAISE_LABEL);
  const after = await checkBudgetPolicy(args);
  assert.equal(after.allowed, false);
  assert.equal(after.code, 'missing-label');
  assert.equal(
    finalState(f.statuses, f.pull.head.sha, 'Lint and Test'),
    'failure',
  );
  assert.equal(guardOutcome(1, after).fail, true);
  const workflow = readFileSync(
    '.github/workflows/ci-budget-approval.yml',
    'utf8',
  );
  assert.match(workflow, /types: \[[^\]]*\bunlabeled\b/);
});

test('a budget raise with no label cannot obtain a successful required Lint and Test by any path', async () => {
  const f = approvedRaise();
  f.pull.labels = [{ name: DEPENDENCY_GROWTH_LABEL }];
  // Path 1: the guard and approval workflows publish statuses.
  const published = await checkBudgetPolicy({
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
  const gate = await checkBudgetPolicy({
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
    const result = await checkBudgetPolicy({
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
  const result = await checkBudgetPolicy({
    github: f.github,
    owner: 'o',
    repo: 'r',
    number: 1,
  });
  assert.equal(result.allowed, false);
  assert.equal(result.snapshotMismatch, true);
  assert.ok(!f.statuses.some((s) => s.sha === X && s.state === 'success'));
  assert.ok(f.statuses.every((s) => s.sha === X));
  assert.equal(guardOutcome(1, result).fail, true);
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
    (await checkBudgetPolicy({ ...args, expectedHead: f.pull.head.sha }))
      .allowed,
    true,
  );
  const stale = await checkBudgetPolicy({ ...args, expectedHead: OLD_HEAD });
  assert.equal(stale.allowed, false);
  assert.equal(stale.code, 'changed-context');
  const prChecks = readFileSync('.github/workflows/pr-checks.yml', 'utf8');
  assert.match(
    prChecks,
    /expectedHead: context\.payload\.pull_request\.head\.sha \}\);/,
  );
});
