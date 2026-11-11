import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  LAST_GREEN_RETENTION_DAYS,
  lastGreenLine,
  retrieveLastGreen,
} from './parity-runtime-last-green.mjs';

const sha = 'a'.repeat(40);
const NOW = Date.parse('2026-11-11T09:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (days) => new Date(NOW - days * DAY).toISOString();
const run = (id, extra = {}) => ({
  id,
  head_branch: 'main',
  head_sha: sha,
  conclusion: 'failure',
  created_at: daysAgo(1),
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
    now: () => NOW,
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
    /workflows\/nightly-validation.yml\/runs\?branch=main&created=%3E%3D2026-10-12T09%3A00%3A00.000Z&/,
  );
  assert.equal(result.status, 'found');
  assert.equal(lastGreenLine(result), `last green: ${sha}`);
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

const NONE = `within retention (${LAST_GREEN_RETENTION_DAYS} days)`;
for (const [label, api, status, reason] of [
  ['no nightly', async () => ({ workflow_runs: [] }), 'none', NONE],
  [
    'expired',
    async (_method, route) =>
      route.includes('/workflows/')
        ? { workflow_runs: [run(5)] }
        : { artifacts: [artifact({ expired: true })] },
    'none',
    `${NONE}; 1 expired artifact(s) seen`,
  ],
  [
    'no artifact',
    async (_method, route) =>
      route.includes('/workflows/')
        ? { workflow_runs: [run(5)] }
        : { artifacts: [] },
    'none',
    NONE,
  ],
  [
    'API error',
    async () => {
      throw new Error('API unavailable');
    },
    'failed',
    'API unavailable',
  ],
  [
    'rate limit',
    async () => {
      throw new Error('API rate limit exceeded');
    },
    'failed',
    'API rate limit exceeded',
  ],
])
  test(`${label} falls back without failing and records status ${status}`, async (t) => {
    const options = { ...fixture(t), api };
    const result = await retrieveLastGreen(options);
    assert.equal(result.sha, null);
    assert.equal(result.status, status);
    assert.equal(result.reason, reason);
    assert.equal(
      fs.existsSync(path.join(options.out, 'last-green.json')),
      false,
    );
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(options.out, 'retrieval.json'))),
      result,
    );
    // A completed scan that found nothing and a failed lookup print different
    // lines; a failed lookup never prints "none".
    const line = lastGreenLine(result);
    if (status === 'none') assert.equal(line, `last green: none ${reason}`);
    else {
      assert.equal(line, `last green: lookup failed (${reason})`);
      assert.doesNotMatch(line, /none/);
    }
  });

test('scan stops at the first main run older than the retention window', async (t) => {
  const calls = [];
  const options = fixture(t);
  options.api = async (_method, route) => {
    calls.push(route);
    if (route.includes('/workflows/'))
      return {
        workflow_runs: [
          run(7, { created_at: daysAgo(2) }),
          run(6, { created_at: daysAgo(LAST_GREEN_RETENTION_DAYS + 1) }),
          run(5, { created_at: daysAgo(LAST_GREEN_RETENTION_DAYS + 10) }),
        ],
      };
    return { artifacts: [] };
  };
  const result = await retrieveLastGreen(options);
  assert.equal(result.status, 'none');
  assert.equal(lastGreenLine(result), `last green: none ${NONE}`);
  // Run 7 is read; 6 and 5 are outside retention and never read, even though
  // the server returned them (the created filter is not trusted alone).
  assert.ok(calls.some((route) => route.includes('/runs/7/artifacts')));
  assert.ok(!calls.some((route) => /\/runs\/[56]\/artifacts/.test(route)));
});

test('a run without a readable created_at is a failed lookup, not "none"', async (t) => {
  const options = fixture(t);
  options.api = async () => ({ workflow_runs: [run(5, { created_at: null })] });
  const result = await retrieveLastGreen(options);
  assert.equal(result.status, 'failed');
  assert.match(lastGreenLine(result), /^last green: lookup failed \(run 5 /);
});

test('lastGreenLine without a retrieval record reports a failed lookup', () => {
  assert.equal(
    lastGreenLine(undefined),
    'last green: lookup failed (no retrieval record)',
  );
  assert.equal(
    lastGreenLine({ reason: 'retrieval unavailable' }),
    'last green: lookup failed (retrieval unavailable)',
  );
});

test('CLI: a failed lookup prints the failed line and exits 0 (informational)', (t) => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-green-cli-'));
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  const script = fileURLToPath(
    new URL('./parity-runtime-last-green.mjs', import.meta.url),
  );
  const result = spawnSync(
    process.execPath,
    [script, '--measure', 'load', '--out', out],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        GH_REPO: 'owner/repo',
        RUN_ID: '0',
        GITHUB_STEP_SUMMARY: '',
      },
    },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stdout.trim(),
    'last green: lookup failed (invalid last-green lookup identity)',
  );
  assert.equal(
    JSON.parse(fs.readFileSync(path.join(out, 'retrieval.json'))).status,
    'failed',
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
    assert.equal(result.status, 'failed', failure);
    assert.match(lastGreenLine(result), /^last green: lookup failed \(/);
    assert.equal(
      fs.existsSync(path.join(options.out, 'last-green.json')),
      false,
    );
  }
});
