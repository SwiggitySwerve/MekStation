import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  checkBudgetPolicy,
  guardOutcome,
  STALE_REF_REMEDY,
} from './budget-approval.mjs';
import { loadBudgets } from './budget-config.mjs';
import { DEPENDENCY_GROWTH_LABEL } from './budget-dependencies.mjs';
import { BUDGET_RAISE_LABEL } from './garden-approval.mjs';

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
  f.github.paginate = async () => [
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
    '.github/workflows/ci-budget-approval.yml',
    'utf8',
  );
  assert.match(workflow, /types: \[[^\]]*\bunlabeled\b/);
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
