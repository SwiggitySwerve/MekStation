import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  REPORT_FILES,
  ROW_FILES,
  recordCompletionStage,
  sha256,
} from './parity-scoreboard-artifacts.mjs';
import { findBaseline, reportScoreboard } from './parity-scoreboard-github.mjs';

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

test('reporting checks completion before writing a numeric first-line summary and compressing rows', async (t) => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'parity-report-'));
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  fs.mkdirSync(path.join(out, 'terms'));
  const write = (name, value) =>
    fs.writeFileSync(path.join(out, name), JSON.stringify(value) + '\n');
  const rows = [
    { family: 'mek', path: 'one', ours: { total: 1 }, java: { total: 1 } },
  ];
  const lines = rows.map(JSON.stringify).join('\n') + '\n';
  const head = 'a'.repeat(40);
  fs.writeFileSync(path.join(out, 'sources.ndjson'), lines);
  write('sources.ndjson.manifest.json', {
    sourceCount: 1,
    sourcesSha256: sha256(lines),
  });
  write('execution.json', {
    families: [{ family: 'mek', production: 'fresh' }],
  });
  const counts = {
    rows: 1,
    matched: 1,
    different: 0,
    missingLocal: 0,
    failedLocal: 0,
  };
  for (const file of REPORT_FILES) {
    if (ROW_FILES.includes(file)) {
      fs.writeFileSync(path.join(out, 'terms', file), lines);
      if (file === 'delta-rows.jsonl')
        fs.writeFileSync(path.join(out, file), lines);
    } else {
      const report =
        file === 'reference-provenance-report.json'
          ? { ok: true }
          : { byFamily: { mek: counts }, settings: { cells: [] } };
      write('terms/' + file, report);
      if (
        ['delta-report.json', 'reference-provenance-report.json'].includes(file)
      )
        write(file, report);
    }
  }
  write('RESULTS.json', {
    head,
    bv: { rows: 1, families: { mek: { rows: 1, exactTotals: 1, missing: 0 } } },
    validity: { byFamily: { mek: counts } },
    weight: { byFamily: { mek: counts } },
  });
  write('run-provenance.json', {
    head,
    reportMode: true,
    pythonVersion: 'Python 3.12.13',
    extraSha256: null,
  });
  const summaryFile = path.join(out, 'step-summary.md');
  fs.writeFileSync(summaryFile, 'stale heading\n');
  const options = { out, local: true, summaryFile };
  await assert.rejects(reportScoreboard(options), /ENOENT/);
  assert.equal(fs.existsSync(path.join(out, 'compressed-rows')), false);
  for (const stage of ['pipeline', 'detailed', 'result'])
    recordCompletionStage(out, stage, 1);
  await reportScoreboard(options);
  assert.equal(
    fs.readFileSync(summaryFile, 'utf8').split('\n')[0],
    'BV exact=1/1; missing terms=0; validity matched=1/1 different=0 missing-local=0 failed-local=0; weight different=0; baseline: null',
  );
  assert.equal(fs.readdirSync(path.join(out, 'compressed-rows')).length, 5);
  write('terms/construction-validity-report.json', {
    byFamily: { mek: counts },
    altered: true,
  });
  await assert.rejects(reportScoreboard(options), /SHA-256 mismatch/);
});
