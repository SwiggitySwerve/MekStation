import assert from 'node:assert/strict';
import { test } from 'node:test';

import { findBaseline } from './parity-scoreboard-github.mjs';

const run = (id, extra = {}) => ({
  id,
  run_attempt: 1,
  event: 'push',
  head_branch: 'main',
  conclusion: 'success',
  head_sha: String(id).padStart(40, 'a'),
  ...extra,
});
const artifact = (id, extra = {}) => ({
  id,
  name: 'parity-scoreboard-reports',
  expired: false,
  ...extra,
});

test('baseline selection excludes current, dispatch, failed and non-main runs', async () => {
  const calls = [];
  const api = async (route) => {
    calls.push(route);
    if (route.includes('/workflows/'))
      return {
        workflow_runs: [
          run(8),
          run(7, { event: 'workflow_dispatch' }),
          run(6, { conclusion: 'failure' }),
          run(5, { head_branch: 'feature' }),
          run(4),
        ],
      };
    assert.match(route, /\/runs\/4\/artifacts/);
    return { artifacts: [artifact(44)] };
  };
  const result = await findBaseline({
    api,
    repository: 'owner/repo',
    runId: 8,
  });
  assert.equal(result.run.id, 4);
  assert.equal(result.artifact.id, 44);
  assert.match(calls[0], /branch=main.*event=push.*status=success/);
});

test('no runs or no retained artifact yields baseline null', async () => {
  assert.equal(
    await findBaseline({
      api: async () => ({ workflow_runs: [] }),
      repository: 'owner/repo',
      runId: 8,
    }),
    null,
  );
  const api = async (route) =>
    route.includes('/workflows/')
      ? { workflow_runs: [run(4)] }
      : { artifacts: [artifact(44, { expired: true })] };
  assert.equal(
    await findBaseline({ api, repository: 'owner/repo', runId: 8 }),
    null,
  );
});

test('baseline API errors propagate instead of masquerading as baseline null', async () => {
  await assert.rejects(
    findBaseline({
      api: async () => {
        throw new Error('HTTP 503');
      },
      repository: 'owner/repo',
      runId: 8,
    }),
    /HTTP 503/,
  );
});

test('pagination finds the last successful retained main artifact', async () => {
  const api = async (route) => {
    if (route.includes('/workflows/'))
      return {
        workflow_runs: route.endsWith('page=1')
          ? Array.from({ length: 100 }, (_, n) => run(200 - n))
          : [run(99)],
      };
    return { artifacts: route.includes('/runs/99/') ? [artifact(9)] : [] };
  };
  assert.equal(
    (await findBaseline({ api, repository: 'owner/repo', runId: 300 })).run.id,
    99,
  );
});
