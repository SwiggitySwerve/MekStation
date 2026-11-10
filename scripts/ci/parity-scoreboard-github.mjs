// Read-only baseline lookup and artifact preparation for the parity scoreboard.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { gzipSync } from 'node:zlib';

import { githubApi } from './ci-report-github.mjs';
import { buildSnapshot, writeReports } from './parity-scoreboard-diff.mjs';
import { readJson, ROW_FILES } from './parity-scoreboard.mjs';

export async function findBaseline({ api, repository, runId }) {
  if (
    !/^[\w.-]+\/[\w.-]+$/.test(repository) ||
    !Number.isSafeInteger(runId) ||
    runId < 1
  )
    throw new Error('Invalid scoreboard run identity');
  for (let page = 1; ; page++) {
    const response = await api(
      `repos/${repository}/actions/workflows/parity-scoreboard.yml/runs?branch=main&event=push&status=success&per_page=100&page=${page}`,
    );
    if (!Array.isArray(response.workflow_runs))
      throw new Error('Main scoreboard run census unavailable');
    for (const run of response.workflow_runs) {
      if (
        run.id === runId ||
        run.event !== 'push' ||
        run.head_branch !== 'main' ||
        run.conclusion !== 'success'
      )
        continue;
      for (let artifactPage = 1; ; artifactPage++) {
        const result = await api(
          `repos/${repository}/actions/runs/${run.id}/artifacts?per_page=100&page=${artifactPage}`,
        );
        if (!Array.isArray(result.artifacts))
          throw new Error('Scoreboard artifact census unavailable');
        const artifact = result.artifacts.find(
          (item) => item.name === 'parity-scoreboard-reports' && !item.expired,
        );
        if (artifact) return { run, artifact };
        if (result.artifacts.length < 100) break;
      }
    }
    if (response.workflow_runs.length < 100) return null;
  }
}

export async function reportScoreboard({
  out,
  repository,
  runId,
  attempt,
  summaryFile,
  local = false,
}) {
  const provenance = readJson(path.join(out, 'run-provenance.json'));
  const snapshot = buildSnapshot(out, {
    repository: repository ?? null,
    runId: runId ?? null,
    attempt: attempt ?? null,
    head: provenance.head,
  });
  let baseline = null;
  if (!local) {
    const selected = await findBaseline({
      api: (route) => githubApi('GET', route),
      repository,
      runId,
    });
    if (selected) {
      const destination = fs.mkdtempSync(path.join(out, 'baseline-'));
      execFileSync(
        'gh',
        [
          'run',
          'download',
          String(selected.run.id),
          '--repo',
          repository,
          '--name',
          selected.artifact.name,
          '--dir',
          destination,
        ],
        { stdio: 'pipe', timeout: 120000 },
      );
      baseline = readJson(path.join(destination, 'scoreboard-row-index.json'));
      if (
        baseline.identity?.runId !== selected.run.id ||
        baseline.identity?.head !== selected.run.head_sha ||
        baseline.identity?.repository !== repository
      )
        throw new Error('Baseline artifact identity mismatch');
    }
  }
  const summary = writeReports(out, snapshot, baseline);
  if (summaryFile) fs.appendFileSync(summaryFile, summary);
  const rows = path.join(out, 'compressed-rows');
  fs.mkdirSync(rows, { recursive: true });
  for (const file of [
    ...ROW_FILES.map((name) => path.join('terms', name)),
    'sources.ndjson',
  ])
    fs.writeFileSync(
      path.join(rows, path.basename(file) + '.gz'),
      gzipSync(fs.readFileSync(path.join(out, file)), { level: 9 }),
    );
  return snapshot;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({
    options: {
      out: { type: 'string' },
      local: { type: 'boolean', default: false },
    },
  });
  await reportScoreboard({
    ...values,
    repository: process.env.GITHUB_REPOSITORY,
    runId: Number(process.env.GITHUB_RUN_ID),
    attempt: Number(process.env.GITHUB_RUN_ATTEMPT),
    summaryFile: process.env.GITHUB_STEP_SUMMARY,
  });
}
