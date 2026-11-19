import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { parse } from 'yaml';

import { cleanupPrCaches, prCacheRef } from './pr-cache-cleanup.mjs';

const root = process.cwd();
const REPO = 'owner/repo';
const cache = (id, ref, key = `key-${id}`) => ({
  id,
  ref,
  key,
  size_in_bytes: 1e6,
});

/** A fake gh API: serves the listing pages and records every call. */
function fakeGh(entries, { failDelete = [] } = {}) {
  const calls = [];
  const request = async (endpoint, { method = 'GET' } = {}) => {
    calls.push(`${method} ${endpoint}`);
    if (method === 'DELETE') {
      const id = Number(endpoint.split('/').pop());
      if (failDelete.includes(id)) throw new Error('HTTP 404');
      return null;
    }
    const page = Number(
      new URL(`https://x/${endpoint}`).searchParams.get('page'),
    );
    return { actions_caches: entries.slice((page - 1) * 100, page * 100) };
  };
  return { calls, request };
}
const quiet = { log: () => {}, warn: () => {} };

test('deletes every cache of the closed PR across pages and nothing else', async () => {
  const ref = 'refs/pull/7/merge';
  const entries = [
    ...Array.from({ length: 100 }, (_, i) => cache(i + 1, ref)),
    cache(101, ref),
    // The ref filter is trusted only after an exact check.
    cache(900, 'refs/heads/main'),
    cache(901, 'refs/pull/70/merge'),
    cache(902, 'refs/pull/7/head'),
  ];
  const gh = fakeGh(entries);
  const result = await cleanupPrCaches(
    { repo: REPO, pr: 7 },
    { request: gh.request, ...quiet },
  );
  assert.deepEqual(
    gh.calls.filter((c) => c.startsWith('GET')),
    [1, 2].map(
      (page) =>
        `GET repos/${REPO}/actions/caches?ref=refs%2Fpull%2F7%2Fmerge&per_page=100&page=${page}`,
    ),
  );
  const deletes = gh.calls.filter((c) => c.startsWith('DELETE'));
  assert.equal(deletes.length, 101);
  for (const id of [900, 901, 902])
    assert.ok(!deletes.includes(`DELETE repos/${REPO}/actions/caches/${id}`));
  assert.deepEqual(result, {
    ref,
    listed: 104,
    owned: 101,
    deleted: 101,
    failed: 0,
  });
});

test('rejects anything but a positive PR number before calling gh', async () => {
  for (const pr of [undefined, '', '0', '-1', '7a', '../1', '1/merge', 1.5]) {
    const gh = fakeGh([cache(1, 'refs/heads/main')]);
    await assert.rejects(
      cleanupPrCaches({ repo: REPO, pr }, { request: gh.request, ...quiet }),
    );
    assert.deepEqual(gh.calls, [], String(pr));
  }
  assert.equal(prCacheRef('12'), 'refs/pull/12/merge');
});

test('one failed delete does not keep the rest; dry run deletes nothing', async () => {
  const ref = 'refs/pull/3/merge';
  const entries = [cache(1, ref), cache(2, ref), cache(3, ref)];
  const failing = fakeGh(entries, { failDelete: [2] });
  const result = await cleanupPrCaches(
    { repo: REPO, pr: 3 },
    { request: failing.request, ...quiet },
  );
  assert.equal(result.deleted, 2);
  assert.equal(result.failed, 1);
  assert.equal(failing.calls.filter((c) => c.startsWith('DELETE')).length, 3);

  const dry = fakeGh(entries);
  const dryResult = await cleanupPrCaches(
    { repo: REPO, pr: 3, dryRun: true },
    { request: dry.request, ...quiet },
  );
  assert.ok(dry.calls.every((c) => c.startsWith('GET')));
  assert.equal(dryResult.deleted, 0);
  assert.equal(dryResult.owned, 3);
});

test('an invalid listing fails instead of reporting nothing to delete', async () => {
  await assert.rejects(
    cleanupPrCaches(
      { repo: REPO, pr: 1 },
      { request: async () => ({ message: 'Not Found' }), ...quiet },
    ),
    /Invalid cache listing/,
  );
});

// libuv resolves a bare `gh` to an executable without a shell; a .cmd fake
// cannot stand in on Windows. Linux CI runs this end to end.
test(
  'the CLI drives the real gh boundary: lists, then deletes only the PR ref',
  { skip: process.platform === 'win32' },
  () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-gh-'));
    try {
      const callLog = path.join(dir, 'calls.log');
      fs.writeFileSync(
        path.join(dir, 'gh'),
        `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(callLog)}, args.join(' ') + '\\n');
const method = args[args.indexOf('--method') + 1];
if (method === 'GET') process.stdout.write(JSON.stringify({ actions_caches: [
  { id: 11, ref: 'refs/pull/42/merge', key: 'a', size_in_bytes: 5 },
  { id: 12, ref: 'refs/heads/main', key: 'b', size_in_bytes: 5 },
] }));
`,
        { mode: 0o755 },
      );
      const run = spawnSync(
        process.execPath,
        ['scripts/ci/pr-cache-cleanup.mjs', '--repo', REPO, '--pr', '42'],
        {
          cwd: root,
          encoding: 'utf8',
          env: {
            ...process.env,
            PATH: `${dir}${path.delimiter}${process.env.PATH}`,
          },
        },
      );
      assert.equal(run.status, 0, run.stderr);
      assert.deepEqual(fs.readFileSync(callLog, 'utf8').trim().split('\n'), [
        `api repos/${REPO}/actions/caches?ref=refs%2Fpull%2F42%2Fmerge&per_page=100&page=1 --method GET`,
        `api repos/${REPO}/actions/caches/11 --method DELETE`,
      ]);
      assert.match(run.stdout, /refs\/pull\/42\/merge: deleted 1 cache/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },
);

test('PR Cache Cleanup runs on close only, with actions:write, from main', () => {
  const workflow = parse(
    fs.readFileSync(
      path.join(root, '.github/workflows/pr-cache-cleanup.yml'),
      'utf8',
    ),
  );
  assert.deepEqual(Object.keys(workflow.on), ['pull_request']);
  assert.deepEqual(workflow.on.pull_request.types, ['closed']);
  assert.deepEqual(workflow.permissions, {});
  const jobs = Object.values(workflow.jobs);
  assert.equal(jobs.length, 1);
  const [job] = jobs;
  assert.deepEqual(job.permissions, { actions: 'write', contents: 'read' });
  const checkout = job.steps.find((s) =>
    s.uses?.startsWith('actions/checkout'),
  );
  // Trusted code: the script from main, never the closed PR's merge ref.
  assert.equal(checkout.with.ref, 'main');
  assert.equal(checkout.with['persist-credentials'], false);
  const step = job.steps.find((s) => s.run?.includes('pr-cache-cleanup.mjs'));
  assert.equal(
    step.run,
    'node scripts/ci/pr-cache-cleanup.mjs --repo "$REPO" --pr "$PR"',
  );
  assert.equal(step.env.PR, '${{ github.event.pull_request.number }}');
  assert.equal(step.env.GH_TOKEN, '${{ github.token }}');
});
