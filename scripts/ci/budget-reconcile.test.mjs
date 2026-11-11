import assert from 'node:assert/strict';
import { test } from 'node:test';

function apiFixture(count = 60, allowance = 1000) {
  let remaining = allowance,
    hook;
  const requests = [],
    lines = [],
    failures = [];
  const pulls = Array.from({ length: count }, (_, i) => ({
    number: i + 1,
    state: 'open',
    draft: false,
    head: { sha: (i + 1).toString(16).padStart(40, '0') },
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
        get: endpoint('pull', ({ pull_number }) =>
          structuredClone(pulls[pull_number - 1]),
        ),
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

test('even one-visit capacity rotates within batches instead of starving their later PRs', async () => {
  const { reconcileBudgetStatuses } = await import('./budget-reconcile.mjs');
  const visited = new Set();
  for (let runNumber = 1; runNumber <= 60; runNumber++) {
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

test('request floor stops cleanly, reports every unreached PR, and does not spend the reserve', async () => {
  const { reconcileBudgetStatuses } = await import('./budget-reconcile.mjs');
  const f = apiFixture(60, 165);
  const result = await reconcileBudgetStatuses({
    ...f,
    owner: 'o',
    repo: 'r',
    runNumber: 1,
    checkPolicy: async ({ github }) => {
      for (let i = 0; i < 50; i++)
        await github.rest.pulls.get({ pull_number: 1 });
      assert.fail('The API floor must interrupt this evaluation');
    },
  });
  assert.equal(result.stopReason, 'request budget');
  assert.equal(result.unreached.length, 60);
  assert.equal(f.remaining(), 150);
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
