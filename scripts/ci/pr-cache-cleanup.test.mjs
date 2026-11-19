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
function fakeGh(entries, { failDelete = {} } = {}) {
  const calls = [];
  const request = async (endpoint, { method = 'GET' } = {}) => {
    calls.push(`${method} ${endpoint}`);
    if (method === 'DELETE') {
      const id = Number(endpoint.split('/').pop());
      const status = failDelete[id];
      if (status) throw Object.assign(new Error(`HTTP ${status}`), { status });
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
    gone: 0,
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

test('a 404 is already gone; a 403 fails without keeping the rest; dry run deletes nothing', async () => {
  const ref = 'refs/pull/3/merge';
  const entries = [cache(1, ref), cache(2, ref), cache(3, ref), cache(4, ref)];
  // Evicted, or deleted by an overlapping cleanup, between list and delete.
  const evicted = fakeGh(entries, { failDelete: { 2: 404 } });
  const evictedResult = await cleanupPrCaches(
    { repo: REPO, pr: 3 },
    { request: evicted.request, ...quiet },
  );
  assert.deepEqual(
    [evictedResult.deleted, evictedResult.gone, evictedResult.failed],
    [3, 1, 0],
  );
  // A permission error on a same-repo PR is never silenced.
  const forbidden = fakeGh(entries, { failDelete: { 2: 403, 3: 404 } });
  const result = await cleanupPrCaches(
    { repo: REPO, pr: 3 },
    { request: forbidden.request, ...quiet },
  );
  assert.deepEqual([result.deleted, result.gone, result.failed], [2, 1, 1]);
  assert.equal(forbidden.calls.filter((c) => c.startsWith('DELETE')).length, 4);

  const dry = fakeGh(entries);
  const dryResult = await cleanupPrCaches(
    { repo: REPO, pr: 3, dryRun: true },
    { request: dry.request, ...quiet },
  );
  assert.ok(dry.calls.every((c) => c.startsWith('GET')));
  assert.equal(dryResult.deleted, 0);
  assert.equal(dryResult.owned, 4);
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
  'the CLI drives the real gh boundary: lists, deletes only the PR ref, reads HTTP status',
  { skip: process.platform === 'win32' },
  () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-gh-'));
    try {
      const callLog = path.join(dir, 'calls.log');
      // Like gh: a failed API call prints "gh: <message> (HTTP <code>)" and exits 1.
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
  { id: 13, ref: 'refs/pull/42/merge', key: 'c', size_in_bytes: 5 },
] }));
else if (args[1].endsWith('/13')) {
  const code = process.env.FAKE_GH_STATUS;
  process.stderr.write('gh: ' + (code === '404' ? 'Not Found' : 'Resource not accessible by integration') + ' (HTTP ' + code + ')\\n');
  process.exit(1);
}
`,
        { mode: 0o755 },
      );
      const cli = (status) =>
        spawnSync(
          process.execPath,
          ['scripts/ci/pr-cache-cleanup.mjs', '--repo', REPO, '--pr', '42'],
          {
            cwd: root,
            encoding: 'utf8',
            env: {
              ...process.env,
              FAKE_GH_STATUS: status,
              PATH: `${dir}${path.delimiter}${process.env.PATH}`,
            },
          },
        );
      const gone = cli('404');
      assert.equal(gone.status, 0, gone.stderr);
      assert.deepEqual(fs.readFileSync(callLog, 'utf8').trim().split('\n'), [
        `api repos/${REPO}/actions/caches?ref=refs%2Fpull%2F42%2Fmerge&per_page=100&page=1 --method GET`,
        `api repos/${REPO}/actions/caches/11 --method DELETE`,
        `api repos/${REPO}/actions/caches/13 --method DELETE`,
      ]);
      assert.match(
        gone.stdout,
        /refs\/pull\/42\/merge: deleted 1 cache\(s\), .* 1 already gone\./,
      );
      const forbidden = cli('403');
      assert.equal(forbidden.status, 1);
      assert.match(forbidden.stderr, /HTTP 403/);
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
  // One cleanup per PR at a time; a second close waits instead of cancelling.
  assert.deepEqual(workflow.concurrency, {
    group: 'pr-cache-cleanup-${{ github.event.pull_request.number }}',
    'cancel-in-progress': false,
  });
  const jobs = Object.values(workflow.jobs);
  assert.equal(jobs.length, 1);
  const [job] = jobs;
  // A fork PR's token is read-only, so its cleanup would only fail red.
  assert.equal(
    job.if,
    'github.event.pull_request.head.repo.full_name == github.repository',
  );
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
