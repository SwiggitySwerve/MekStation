import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checkBudgetRaise } from './garden-approval-github.mjs';

function fixture() {
  const owner = { id: 42, login: 'api-owner', type: 'User' };
  const pr = {
    base: { sha: 'b'.repeat(40) },
    head: { sha: 'a'.repeat(40) },
    labels: [{ name: 'ci-budget-raise' }],
    user: { id: 7, login: 'author' },
  };
  const calls = [];
  const reviews = [
    {
      id: 1,
      user: owner,
      state: 'APPROVED',
      commit_id: pr.head.sha,
      submitted_at: '2026-11-05T00:00:00Z',
    },
  ];
  const github = {
    rest: {
      repos: {
        get: async () => ({ data: { owner } }),
        getContent: async (args) => {
          calls.push(args);
          return {
            data: {
              encoding: 'base64',
              content: Buffer.from(JSON.stringify({ ref: args.ref })).toString(
                'base64',
              ),
            },
          };
        },
        createCommitStatus: async (args) => {
          calls.push(args);
        },
      },
      pulls: {
        get: async () => ({ data: structuredClone(pr) }),
        listReviews: () => {},
      },
    },
    paginate: async () => reviews,
  };
  return {
    input: {
      github,
      owner: 'org',
      repo: 'repo',
      number: 1,
      budgetPath: 'config/ci/budgets.json',
      budgetRaises: () => [{ id: 'g1-delta' }],
    },
    calls,
    pr,
    reviews,
  };
}

test('reads owner and both exact-head JSON blobs, paginates reviews, writes a bound status', async () => {
  const f = fixture();
  let seen;
  f.input.budgetRaises = (base, head) => {
    seen = [base.ref, head.ref];
    return [{ id: 'increase' }];
  };
  assert.equal((await checkBudgetRaise(f.input)).allowed, true);
  assert.deepEqual(seen, [f.pr.base.sha, f.pr.head.sha]);
  assert.equal(f.calls.at(-1).sha, f.pr.head.sha);
  assert.equal(f.calls.at(-1).state, 'success');
});

test('malformed JSON/schema and missing or revoked owner approvals write failure', async () => {
  for (const mode of ['json', 'schema', 'missing', 'dismissed']) {
    const f = fixture();
    if (mode === 'json')
      f.input.github.rest.repos.getContent = async () => ({
        data: { encoding: 'base64', content: 'bm90LWpzb24=' },
      });
    if (mode === 'schema')
      f.input.budgetRaises = () => {
        throw new Error('invalid G1 schema');
      };
    if (mode === 'missing') f.reviews.length = 0;
    if (mode === 'dismissed') f.reviews[0].state = 'DISMISSED';
    assert.equal((await checkBudgetRaise(f.input)).allowed, false, mode);
    assert.equal(f.calls.at(-1).state, 'failure', mode);
  }
});

test('head/base/label races fail on the evaluated head and write nothing to a new head', async () => {
  for (const mode of ['head', 'base', 'labels']) {
    const f = fixture();
    let reads = 0;
    f.input.github.rest.pulls.get = async () => {
      const pr = structuredClone(f.pr);
      if (++reads > 1) {
        if (mode === 'labels') pr.labels = [];
        else pr[mode].sha = 'c'.repeat(40);
      }
      return { data: pr };
    };
    const result = await checkBudgetRaise(f.input);
    assert.equal(result.code, 'changed-context');
    // The refusal says exactly what changed, so the caller keeps the evidence.
    assert.deepEqual(
      [result.headChanged, result.baseChanged, result.labelsChanged],
      [mode === 'head', mode === 'base', mode === 'labels'],
    );
    assert.equal(f.calls.at(-1).state, 'failure');
    assert.equal(f.calls.at(-1).sha, f.pr.head.sha);
    assert.ok(f.calls.every((call) => call.sha !== 'c'.repeat(40)));
  }
});

test('G1 alone decides new/deleted budget files and failures remain visible', async () => {
  const f = fixture();
  f.input.github.rest.repos.getContent = async () => {
    throw Object.assign(new Error('missing'), { status: 404 });
  };
  f.input.budgetRaises = (base, head) => {
    assert.equal(base, null);
    assert.equal(head, null);
    return [];
  };
  assert.equal((await checkBudgetRaise(f.input)).code, 'no-raise');
});

test('approval revoked during collection is reread before a successful status', async () => {
  const f = fixture();
  let calls = 0;
  f.input.github.paginate = async () =>
    ++calls === 1 ? f.reviews : [{ ...f.reviews[0], state: 'DISMISSED' }];
  assert.equal((await checkBudgetRaise(f.input)).allowed, false);
  assert.equal(f.calls.at(-1).state, 'failure');
});

// Owner-authored raises read the committed approval record at the PR base.
const RECORD_PATH = 'config/ci/approved-budget-raises.json';
const record = {
  schema: 'mekstation/ci-budget-raise-approvals/v1',
  approvals: [
    {
      pr: 3418,
      key: 'limits.repoWideKeys',
      from: 93,
      to: 94,
      ruling: { section: 'PARITY-PLAN §185', quote: 'Raise to 94 for PR-O.' },
    },
  ],
};
function ownerFixture({ recordAt }) {
  const f = fixture();
  const owner = { id: 42, login: 'api-owner', type: 'User' };
  f.pr.number = 3418;
  f.pr.user = { id: owner.id, login: owner.login };
  f.reviews.length = 0;
  f.input.number = 3418;
  f.input.budgetRaises = () => [
    { id: 'limits.repoWideKeys', before: 93, after: 94 },
  ];
  const blob = (value) => ({
    data: {
      encoding: 'base64',
      content: Buffer.from(JSON.stringify(value)).toString('base64'),
    },
  });
  f.input.github.rest.repos.getContent = async (args) => {
    f.calls.push(args);
    if (args.path !== RECORD_PATH) return blob({ ref: args.ref });
    const at = { base: f.pr.base.sha, head: f.pr.head.sha }[recordAt];
    if (args.ref !== at)
      throw Object.assign(new Error('Not Found'), { status: 404 });
    return blob(record);
  };
  return f;
}

test('an owner-authored raise passes on a matching record read at the PR base', async () => {
  const f = ownerFixture({ recordAt: 'base' });
  const result = await checkBudgetRaise(f.input);
  assert.equal(result.allowed, true, result.message);
  assert.equal(result.code, 'owner-ruling-record');
  assert.deepEqual(
    f.calls.filter((call) => call.path === RECORD_PATH).map((c) => c.ref),
    [f.pr.base.sha],
  );
  assert.equal(f.calls.at(-1).state, 'success');
  assert.equal(f.calls.at(-1).sha, f.pr.head.sha);
});

test('a record entry present only at the PR head cannot approve its own raise', async () => {
  const f = ownerFixture({ recordAt: 'head' });
  const result = await checkBudgetRaise(f.input);
  assert.equal(result.allowed, false);
  assert.equal(result.code, 'self-approval');
  assert.equal(f.calls.at(-1).state, 'failure');
});

test('an unreadable base record fails closed as invalid-approval-record', async () => {
  for (const mode of ['json', 'encoding', 'server']) {
    const f = ownerFixture({ recordAt: 'base' });
    const read = f.input.github.rest.repos.getContent;
    f.input.github.rest.repos.getContent = async (args) => {
      if (args.path !== RECORD_PATH) return read(args);
      if (mode === 'server')
        throw Object.assign(new Error('boom'), { status: 500 });
      return {
        data:
          mode === 'json'
            ? { encoding: 'base64', content: 'bm90LWpzb24=' }
            : { encoding: 'none', content: '' },
      };
    };
    const result = await checkBudgetRaise(f.input);
    assert.equal(result.code, 'invalid-approval-record', mode);
    assert.equal(f.calls.at(-1).state, 'failure', mode);
  }
});

test('a non-owner author never reads the record', async () => {
  const f = fixture();
  assert.equal((await checkBudgetRaise(f.input)).code, 'owner-approved');
  assert.ok(f.calls.every((call) => call.path !== RECORD_PATH));
});
