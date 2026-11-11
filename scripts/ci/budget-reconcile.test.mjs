import assert from 'node:assert/strict';
import { test } from 'node:test';

function apiFixture(count = 60, allowance = 1000, drafts = []) {
  let remaining = allowance,
    hook;
  const requests = [],
    requestedPulls = [],
    lines = [],
    failures = [];
  const numbers = Array.isArray(count)
    ? count
    : Array.from({ length: count }, (_, i) => i + 1);
  const pulls = numbers.map((number) => ({
    number,
    state: 'open',
    draft: drafts.includes(number),
    head: { sha: number.toString(16).padStart(40, '0') },
    base: { ref: 'main' },
  }));
  const endpoint = (name, serve) => async (args) => {
    const request = async () => {
      requests.push(name);
      remaining--;
      return {
        data: serve(args),
        headers: { 'x-ratelimit-remaining': String(remaining) },
      };
    };
    return hook ? hook(request, {}) : request();
  };
  const github = {
    hook: {
      wrap: (_name, callback) => {
        hook = callback;
      },
      remove: () => {
        hook = undefined;
      },
    },
    rest: {
      rateLimit: {
        get: async () => ({ data: { resources: { core: { remaining } } } }),
      },
      pulls: {
        list: endpoint('list', () => structuredClone(pulls)),
        get: endpoint('pull', ({ pull_number }) => {
          requestedPulls.push(pull_number);
          return structuredClone(
            pulls.find((pull) => pull.number === pull_number),
          );
        }),
      },
      repos: {
        get: endpoint('metadata', () => ({ owner: { id: 1 } })),
        getContent: endpoint('blob', () => ({ content: 'immutable' })),
        getCombinedStatusForRef: endpoint('statuses', () => ({ statuses: [] })),
        createCommitStatus: endpoint('write', (args) => args),
      },
    },
    paginate: async (method, args) => (await method(args)).data,
  };
  return {
    github,
    requests,
    requestedPulls,
    lines,
    failures,
    remaining: () => remaining,
    spend: (count) => {
      remaining -= count;
    },
    core: {
      info: (line) => lines.push(line),
      setFailed: (line) => failures.push(line),
    },
  };
}

test('PR-own sweep priorities visit #3 within five one-visit runs in the exact #2/#6 churn counterexample', async () => {
  const { reconcileBudgetStatuses } = await import('./budget-reconcile.mjs');
  const visited = [];
  for (let runNumber = 1; runNumber <= 5; runNumber++) {
    const turn = runNumber - 1;
    const f = apiFixture([1, 3, 4, 5, turn % 5 === 1 ? 2 : 6], 155);
    const result = await reconcileBudgetStatuses({
      ...f,
      owner: 'o',
      repo: 'r',
      runNumber,
      checkPolicy: async ({ github, number, expectedHead }) => {
        for (let i = 0; i < 3; i++)
          await github.rest.pulls.get({ pull_number: number });
        visited.push(number);
        return {
          allowed: true,
          code: 'approved',
          evaluatedHead: expectedHead,
          currentHead: expectedHead,
          message: 'approved',
        };
      },
    });
    assert.equal(result.visited.length, 1);
    assert.deepEqual(f.failures, []);
  }
  assert.ok(visited.includes(3), `#3 was starved: ${visited.join(', ')}`);
});

test('relative order of continuously eligible PRs is independent of other bucket members', async () => {
  const { reconcileBudgetStatuses } = await import('./budget-reconcile.mjs');
  const orders = [];
  for (const peer of [2, 6]) {
    const f = apiFixture([1, 3, 4, 5, peer]);
    const result = await reconcileBudgetStatuses({
      ...f,
      owner: 'o',
      repo: 'r',
      runNumber: 3,
      checkPolicy: async ({ expectedHead }) => ({
        allowed: true,
        code: 'approved',
        evaluatedHead: expectedHead,
        currentHead: expectedHead,
        message: 'approved',
      }),
    });
    assert.deepEqual(f.failures, []);
    orders.push(result.visited.filter((number) => number !== peer));
  }
  assert.deepEqual(orders[0], orders[1]);
});

test('list-time drafts do not affect S, receive any PR requests, or count as visited', async () => {
  const { reconcileBudgetStatuses } = await import('./budget-reconcile.mjs');
  const f = apiFixture(6, 1000, [6]);
  const result = await reconcileBudgetStatuses({
    ...f,
    owner: 'o',
    repo: 'r',
    runNumber: 1,
    checkPolicy: async ({ expectedHead }) => ({
      allowed: true,
      code: 'approved',
      evaluatedHead: expectedHead,
      currentHead: expectedHead,
      message: 'approved',
    }),
  });
  assert.deepEqual(
    result.visited.slice().sort((a, b) => a - b),
    [1, 2, 3, 4, 5],
    'Five non-drafts give S=1; the draft must not raise it to S=2',
  );
  assert.deepEqual(
    f.requestedPulls.slice().sort((a, b) => a - b),
    [1, 2, 3, 4, 5],
  );
  assert.equal(f.requestedPulls.includes(6), false);
  assert.deepEqual(result.unreached, []);
  assert.deepEqual(f.failures, []);
});

test('PR-number buckets visit #6 despite the exact alternating #5/#11 churn counterexample', async () => {
  const { reconcileBudgetStatuses } = await import('./budget-reconcile.mjs');
  const visited = new Set();
  for (const runNumber of [1, 2]) {
    const numbers = [1, 2, 3, 4, 6, 7, 8, 9, 10, runNumber % 2 ? 5 : 11];
    const f = apiFixture(numbers);
    await reconcileBudgetStatuses({
      ...f,
      owner: 'o',
      repo: 'r',
      runNumber,
      checkPolicy: async ({ number, expectedHead }) => {
        visited.add(number);
        return {
          allowed: true,
          code: 'approved',
          evaluatedHead: expectedHead,
          currentHead: expectedHead,
          message: 'approved',
        };
      },
    });
    assert.deepEqual(f.failures, []);
  }
  assert.ok(visited.has(6), '#6 must not fall between positional batches');
  for (const number of [1, 2, 3, 4, 6, 7, 8, 9, 10])
    assert.ok(visited.has(number));
});

test('manual dispatch advancing run_number only shifts the PR-number bucket phase', async () => {
  const { reconcileBudgetStatuses } = await import('./budget-reconcile.mjs');
  const visited = new Set();
  for (const runNumber of [38, 39]) {
    const f = apiFixture(10);
    const result = await reconcileBudgetStatuses({
      ...f,
      owner: 'o',
      repo: 'r',
      runNumber,
      checkPolicy: async ({ number, expectedHead }) => {
        assert.equal(number % 2, (runNumber - 1) % 2);
        visited.add(number);
        return {
          allowed: true,
          code: 'approved',
          evaluatedHead: expectedHead,
          currentHead: expectedHead,
          message: 'approved',
        };
      },
    });
    assert.equal(result.visited.length, 5);
    assert.deepEqual(f.failures, []);
  }
  assert.equal(visited.size, 10);
});

test('an uneven large PR-number bucket still reports budget-limited unreached PRs cleanly', async () => {
  const { reconcileBudgetStatuses } = await import('./budget-reconcile.mjs');
  const f = apiFixture([2, 4, 6, 8, 10, 12, 14, 16, 18, 20], 165);
  const result = await reconcileBudgetStatuses({
    ...f,
    owner: 'o',
    repo: 'r',
    runNumber: 1,
    checkPolicy: async ({ github, number, expectedHead }) => {
      for (let i = 0; i < 5; i++)
        await github.rest.pulls.get({ pull_number: number });
      return {
        allowed: true,
        code: 'approved',
        evaluatedHead: expectedHead,
        currentHead: expectedHead,
        message: 'approved',
      };
    },
  });
  assert.equal(result.stopReason, 'request budget');
  assert.equal(result.visited.length, 3);
  assert.equal(result.unreached.length, 7);
  assert.deepEqual(f.failures, []);
  assert.ok(
    f.lines.includes(
      `Unreached PRs: ${result.unreached.map((number) => `#${number}`).join(', ')}`,
    ),
  );
});

test('60 PRs with five completed visits per run are all reached in twelve budgeted runs', async () => {
  const { reconcileBudgetStatuses } = await import('./budget-reconcile.mjs');
  const visited = new Set();
  for (let runNumber = 1; runNumber <= 12; runNumber++) {
    const f = apiFixture();
    const result = await reconcileBudgetStatuses({
      ...f,
      owner: 'o',
      repo: 'r',
      runNumber,
      checkPolicy: async ({ github, number, expectedHead }) => {
        assert.equal(expectedHead, number.toString(16).padStart(40, '0'));
        for (let i = 0; i < 100; i++)
          await github.rest.pulls.get({ pull_number: number });
        visited.add(number);
        return {
          allowed: true,
          code: 'approved',
          evaluatedHead: expectedHead,
          currentHead: expectedHead,
          message: 'approved',
        };
      },
    });
    assert.equal(result.visited.length, 5);
    assert.equal(result.unreached.length, 55);
    assert.ok(f.remaining() >= 150);
    assert.deepEqual(f.failures, []);
  }
  assert.equal(
    visited.size,
    60,
    'A fixed starting order must not starve older PRs',
  );
});

test('one-visit capacity reaches a fixed 60-PR census within the modeled 99.99 percent coverage horizon', async () => {
  const { reconcileBudgetStatuses } = await import('./budget-reconcile.mjs');
  const visited = new Set();
  // S=12, B=5: after 60 bucket visits (720 runs), the independent-rank
  // model's union bound is 60*(4/5)^60 < 0.0001. This fixed trace is
  // regression evidence, not a worst-case bound for deterministic hashes.
  for (let runNumber = 1; runNumber <= 720; runNumber++) {
    const f = apiFixture(60, 155);
    const result = await reconcileBudgetStatuses({
      ...f,
      owner: 'o',
      repo: 'r',
      runNumber,
      checkPolicy: async ({ github, number, expectedHead }) => {
        await github.rest.pulls.get({ pull_number: number });
        await github.rest.pulls.get({ pull_number: number });
        await github.rest.pulls.get({ pull_number: number });
        visited.add(number);
        return {
          allowed: true,
          code: 'approved',
          evaluatedHead: expectedHead,
          currentHead: expectedHead,
          message: 'approved',
        };
      },
    });
    assert.equal(result.visited.length, 1);
    assert.deepEqual(f.failures, []);
  }
  assert.equal(visited.size, 60);
});

test('request floor stops admission cleanly and reports unreached PRs after an admitted evaluation finishes', async () => {
  const { reconcileBudgetStatuses } = await import('./budget-reconcile.mjs');
  const f = apiFixture(60, 165);
  const result = await reconcileBudgetStatuses({
    ...f,
    owner: 'o',
    repo: 'r',
    runNumber: 1,
    checkPolicy: async ({ github, expectedHead }) => {
      for (let i = 0; i < 50; i++)
        await github.rest.pulls.get({ pull_number: 1 });
      return {
        allowed: true,
        code: 'approved',
        evaluatedHead: expectedHead,
        currentHead: expectedHead,
        message: 'approved',
      };
    },
  });
  assert.equal(result.stopReason, 'request budget');
  assert.equal(result.visited.length, 1);
  assert.equal(result.unreached.length, 59);
  assert.equal(f.remaining(), 113);
  assert.deepEqual(f.failures, []);
  assert.ok(
    f.lines.some(
      (line) => line.includes('Unreached PRs: #1, #2') && line.includes('#60'),
    ),
  );
});

test('time budget reports the remaining census before the hard job timeout', async () => {
  const { reconcileBudgetStatuses } = await import('./budget-reconcile.mjs');
  const f = apiFixture();
  let elapsed = 0;
  const result = await reconcileBudgetStatuses({
    ...f,
    owner: 'o',
    repo: 'r',
    runNumber: 1,
    now: () => elapsed,
    checkPolicy: async ({ expectedHead }) => {
      elapsed = 8 * 60 * 1000;
      return {
        allowed: true,
        code: 'approved',
        evaluatedHead: expectedHead,
        currentHead: expectedHead,
        message: 'approved',
      };
    },
  });
  assert.equal(result.stopReason, 'time budget');
  assert.equal(result.visited.length, 1);
  assert.equal(result.unreached.length, 59);
  assert.deepEqual(f.failures, []);
});

test('response headers account for quota spent by other repository publishers', async () => {
  const { reconcileBudgetStatuses } = await import('./budget-reconcile.mjs');
  const f = apiFixture();
  const result = await reconcileBudgetStatuses({
    ...f,
    owner: 'o',
    repo: 'r',
    runNumber: 1,
    checkPolicy: async ({ github, number, expectedHead }) => {
      f.spend(847);
      await github.rest.pulls.get({ pull_number: number });
      return {
        allowed: true,
        code: 'approved',
        evaluatedHead: expectedHead,
        currentHead: expectedHead,
        message: 'approved',
      };
    },
  });
  assert.equal(result.visited.length, 1);
  assert.equal(result.stopReason, 'request budget');
  assert.equal(result.unreached.length, 59);
  assert.deepEqual(f.failures, []);
});

test('reconciliation caches metadata and immutable SHA blobs but never live PR reads', async () => {
  const { reconcileBudgetStatuses } = await import('./budget-reconcile.mjs');
  const f = apiFixture(2);
  await reconcileBudgetStatuses({
    ...f,
    owner: 'o',
    repo: 'r',
    runNumber: 1,
    checkPolicy: async ({ github, number, expectedHead }) => {
      for (let i = 0; i < 3; i++) {
        await github.rest.repos.get({ owner: 'o', repo: 'r' });
        await github.rest.repos.getContent({
          owner: 'o',
          repo: 'r',
          path: 'config/ci/budgets.json',
          ref: 'a'.repeat(40),
        });
        await github.rest.pulls.get({ pull_number: number });
      }
      return {
        allowed: true,
        code: 'approved',
        evaluatedHead: expectedHead,
        currentHead: expectedHead,
        message: 'approved',
      };
    },
  });
  assert.equal(f.requests.filter((name) => name === 'metadata').length, 1);
  assert.equal(f.requests.filter((name) => name === 'blob').length, 1);
  assert.equal(f.requests.filter((name) => name === 'pull').length, 8);
});
