import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  GARDEN_MARKER,
  proposeRatchet,
  updateGardenIssue,
} from './garden-publish.mjs';

function fixture() {
  const writes = [];
  const metadata = {
    full_name: 'owner/repo',
    default_branch: 'main',
    owner: { id: 42 },
  };
  const lists = { issues: [], pulls: [], prior: [] };
  const github = {
    rest: {
      repos: {
        get: async () => ({ data: metadata }),
        getBranch: async () => ({ data: { commit: { sha: 'a'.repeat(40) } } }),
      },
      issues: {
        listForRepo: 'issues',
        create: async (args) => {
          writes.push(args);
          return { data: { number: 1, html_url: 'issue-url' } };
        },
        update: async (args) => {
          writes.push(args);
          return { data: { number: args.issue_number, html_url: 'issue-url' } };
        },
      },
      pulls: {
        list: 'pulls',
        create: async (args) => {
          writes.push(args);
          return { data: { number: 2, html_url: 'pr-url' } };
        },
      },
      git: {
        getRef: async () => {
          throw Object.assign(new Error('absent'), { status: 404 });
        },
        getCommit: async () => ({ data: { tree: { sha: 'base-tree' } } }),
        ...Object.fromEntries(
          ['createBlob', 'createTree', 'createCommit', 'createRef'].map(
            (name) => [
              name,
              async (args) => {
                writes.push({ name, ...args });
                return { data: { sha: name } };
              },
            ],
          ),
        ),
      },
    },
    paginate: async (method, args) =>
      method === 'issues'
        ? lists.issues
        : args.state === 'all'
          ? lists.prior
          : lists.pulls,
  };
  return { github, lists, writes, owner: 'owner', repo: 'repo' };
}

test('one bot-owned sticky issue is created, reused or reopened, without touching PRs or user marker copies', async () => {
  const f = fixture();
  const body = `${GARDEN_MARKER}\nEvidence`;
  assert.equal((await updateGardenIssue({ ...f, body })).action, 'create');
  assert.equal(f.writes.length, 0);
  f.lists.issues = [
    {
      number: 5,
      body,
      state: 'closed',
      user: { login: 'github-actions[bot]', type: 'Bot' },
    },
  ];
  assert.equal(
    (await updateGardenIssue({ ...f, body, dryRun: false })).issue,
    5,
  );
  assert.equal(f.writes[0].state, 'open');
  f.lists.issues.push({ ...f.lists.issues[0], number: 6 });
  await assert.rejects(updateGardenIssue({ ...f, body }), /Multiple/);
});

const proposal = () => ({
  budgetPath: 'config/ci/budgets.json',
  expectedBaseSha: 'a'.repeat(40),
  content: '{"validated":"G1"}\n',
  body: 'Measured evidence',
});

test('ratchet dry run makes no writes and publication creates one draft from current main with one file', async () => {
  const f = fixture();
  assert.equal(
    (await proposeRatchet({ ...f, ...proposal() })).action,
    'create-draft',
  );
  assert.equal(f.writes.length, 0);
  const result = await proposeRatchet({ ...f, ...proposal(), dryRun: false });
  assert.equal(result.action, 'created-draft');
  assert.deepEqual(f.writes.find((w) => w.name === 'createCommit').parents, [
    'a'.repeat(40),
  ]);
  assert.equal(f.writes.find((w) => w.name === 'createTree').tree.length, 1);
  assert.equal(f.writes.at(-1).draft, true);
});

test('live owner issue is reused while an unrelated user marker copy is ignored', async () => {
  const f = fixture();
  const body = `${GARDEN_MARKER}\nEvidence`;
  f.lists.issues = [
    { number: 5, body, user: { id: 9, login: 'unrelated', type: 'User' } },
    { number: 6, body, user: { id: 42, login: 'owner', type: 'User' } },
  ];
  assert.equal((await updateGardenIssue({ ...f, body })).issue, 6);
  assert.equal(f.writes.length, 0);
});

test('existing open/closed proposals and orphan branches are preserved; a changed main is refused', async () => {
  for (const state of ['open', 'closed', 'branch']) {
    const f = fixture();
    const pr = {
      number: 9,
      html_url: 'prior',
      head: {
        ref: 'automation/ci-ratchet-abc',
        repo: { full_name: 'owner/repo' },
      },
    };
    if (state === 'open') f.lists.pulls = [pr];
    if (state === 'closed') f.lists.prior = [pr];
    if (state === 'branch')
      f.github.rest.git.getRef = async () => ({ data: {} });
    assert.match(
      (await proposeRatchet({ ...f, ...proposal(), dryRun: false })).action,
      /^preserve-/,
    );
    assert.equal(f.writes.length, 0);
  }
  await assert.rejects(
    proposeRatchet({
      ...fixture(),
      ...proposal(),
      expectedBaseSha: 'b'.repeat(40),
    }),
    /Main moved/,
  );
});
