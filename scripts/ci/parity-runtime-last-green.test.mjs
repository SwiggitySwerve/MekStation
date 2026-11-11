import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { retrieveLastGreen } from './parity-runtime-last-green.mjs';

const sha = 'a'.repeat(40);
const run = (id, extra = {}) => ({
  id,
  head_branch: 'main',
  head_sha: sha,
  conclusion: 'failure',
  ...extra,
});
const artifact = (extra = {}) => ({
  name: 'parity-runtime-last-green-load',
  expired: false,
  ...extra,
});
function fixture(t) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-green-'));
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  return {
    out,
    repository: 'owner/repo',
    measure: 'load',
    runId: 9,
    download: async ({ destination, runId, name, repository }) => {
      assert.equal(runId, 5);
      assert.equal(name, artifact().name);
      assert.equal(repository, 'owner/repo');
      fs.writeFileSync(
        path.join(destination, 'last-green.json'),
        JSON.stringify({ runSha: sha, measure: 'load' }),
      );
    },
  };
}

test('chooses latest main nightly artifact regardless of overall conclusion, skipping current/branch runs', async (t) => {
  const calls = [];
  const options = fixture(t);
  options.api = async (method, route) => {
    assert.equal(method, 'GET');
    calls.push(route);
    if (route.includes('/workflows/'))
      return {
        workflow_runs: [
          run(9),
          run(8, { head_branch: 'feature' }),
          run(7),
          run(6),
          run(5),
        ],
      };
    if (route.includes('/7/'))
      return {
        artifacts: [artifact({ name: 'parity-runtime-last-green-reopen' })],
      };
    if (route.includes('/6/'))
      return { artifacts: [artifact({ expired: true })] };
    assert.match(route, /\/runs\/5\/artifacts/);
    return { artifacts: [artifact()] };
  };
  const result = await retrieveLastGreen(options);
  assert.equal(result.sha, sha);
  assert.equal(
    JSON.parse(fs.readFileSync(path.join(options.out, 'last-green.json')))
      .runSha,
    sha,
  );
  assert.match(
    calls[0],
    /workflows\/nightly-validation.yml\/runs\?branch=main/,
  );
  assert.doesNotMatch(calls[0], /status=success|conclusion=/);
});

test('run and artifact pagination find older main green instead of stopping on a full page', async (t) => {
  const options = fixture(t);
  options.api = async (_method, route) => {
    if (route.includes('/workflows/'))
      return {
        workflow_runs: route.endsWith('page=1')
          ? Array.from({ length: 100 }, (_, i) =>
              run(1000 + i, { head_branch: 'feature' }),
            )
          : [run(5)],
      };
    return {
      artifacts: route.endsWith('page=1')
        ? Array.from({ length: 100 }, () => artifact({ name: 'other' }))
        : [artifact()],
    };
  };
  assert.equal((await retrieveLastGreen(options)).sha, sha);
});

for (const [label, api, reason] of [
  ['no nightly', async () => ({ workflow_runs: [] }), 'no main nightly yet'],
  [
    'expired',
    async (_method, route) =>
      route.includes('/workflows/')
        ? { workflow_runs: [run(5)] }
        : { artifacts: [artifact({ expired: true })] },
    'expired',
  ],
  [
    'no artifact',
    async (_method, route) =>
      route.includes('/workflows/')
        ? { workflow_runs: [run(5)] }
        : { artifacts: [] },
    'no main nightly yet',
  ],
  [
    'API error',
    async () => {
      throw new Error('API unavailable');
    },
    'API unavailable',
  ],
])
  test(`${label} falls back without failing and records a reason`, async (t) => {
    const options = { ...fixture(t), api };
    const result = await retrieveLastGreen(options);
    assert.equal(result.sha, null);
    assert.ok(result.reason.includes(reason));
    assert.equal(
      fs.existsSync(path.join(options.out, 'last-green.json')),
      false,
    );
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(options.out, 'retrieval.json'))),
      result,
    );
  });

test('download failure or invalid artifact leaves no usable partial last green', async (t) => {
  for (const failure of ['download', 'json', 'identity']) {
    const options = fixture(t);
    options.api = async (_method, route) =>
      route.includes('/workflows/')
        ? { workflow_runs: [run(5)] }
        : { artifacts: [artifact()] };
    options.download = async ({ destination }) => {
      fs.writeFileSync(
        path.join(destination, 'last-green.json'),
        failure === 'json'
          ? '{'
          : JSON.stringify({ runSha: 'wrong', measure: 'load' }),
      );
      if (failure === 'download') throw new Error('download failed');
    };
    const result = await retrieveLastGreen(options);
    assert.equal(result.sha, null);
    assert.ok(result.reason);
    assert.equal(
      fs.existsSync(path.join(options.out, 'last-green.json')),
      false,
    );
  }
});
