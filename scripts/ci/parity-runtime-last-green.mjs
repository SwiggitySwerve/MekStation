// Optional GitHub artifact transport. The gate owns baseline validity/tightening.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { githubApi, paginate } from './ci-report-github.mjs';

async function findLastGreen({ api, repository, runId, measure }) {
  let sawExpired = false;
  const name = `parity-runtime-last-green-${measure}`;
  // GitHub returns newest runs first. Do not filter on conclusion: another
  // lane (or the other measure) may have failed. Reuse the CI pagination owner.
  const runs = await paginate(
    api,
    `repos/${repository}/actions/workflows/nightly-validation.yml/runs?branch=main`,
    'workflow_runs',
  );
  for (const run of runs) {
    if (run.id === runId || run.head_branch !== 'main') continue;
    const artifacts = await paginate(
      api,
      `repos/${repository}/actions/runs/${run.id}/artifacts`,
      'artifacts',
    );
    for (const artifact of artifacts.filter((item) => item.name === name)) {
      if (!artifact.expired) return { run, artifact };
      sawExpired = true;
    }
  }
  return {
    // Until this measure has a retained green artifact, there is no main
    // nightly to tighten against (older Nightlies predate this gate).
    reason: sawExpired ? 'last-green artifact expired' : 'no main nightly yet',
  };
}

function downloadArtifact({ repository, runId, name, destination }) {
  execFileSync(
    'gh',
    [
      'run',
      'download',
      String(runId),
      '--repo',
      repository,
      '--name',
      name,
      '--dir',
      destination,
    ],
    {
      stdio: 'pipe',
      timeout: 30000,
    },
  );
}

export async function retrieveLastGreen({
  out,
  repository,
  measure,
  runId,
  api = githubApi,
  download = downloadArtifact,
}) {
  fs.mkdirSync(out, { recursive: true });
  const target = path.join(out, 'last-green.json');
  fs.rmSync(target, { force: true });
  let result;
  let temporary;
  try {
    if (
      !/^[\w.-]+\/[\w.-]+$/.test(repository) ||
      !['load', 'reopen'].includes(measure) ||
      !Number.isSafeInteger(runId) ||
      runId < 1
    )
      throw new Error('invalid last-green lookup identity');
    const selected = await findLastGreen({ api, repository, runId, measure });
    if (!selected.run) result = { sha: null, reason: selected.reason };
    else {
      temporary = fs.mkdtempSync(path.join(out, 'download-'));
      await download({
        repository,
        runId: selected.run.id,
        name: selected.artifact.name,
        destination: temporary,
      });
      const source = path.join(temporary, 'last-green.json');
      const green = JSON.parse(fs.readFileSync(source, 'utf8'));
      if (green.runSha !== selected.run.head_sha || green.measure !== measure)
        throw new Error('last-green artifact identity mismatch');
      // Publish only a complete download. Failed/partial downloads are never
      // passed to the gate; its committed baseline remains authoritative.
      fs.renameSync(source, target);
      result = { sha: green.runSha, reason: null };
    }
  } catch (error) {
    result = {
      sha: null,
      reason: `lookup/download unavailable: ${error.message}`,
    };
  } finally {
    if (temporary) fs.rmSync(temporary, { recursive: true, force: true });
  }
  fs.writeFileSync(
    path.join(out, 'retrieval.json'),
    `${JSON.stringify(result)}\n`,
  );
  return result;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({
    options: { out: { type: 'string' }, measure: { type: 'string' } },
  });
  const result = await retrieveLastGreen({
    ...values,
    repository: process.env.GH_REPO,
    runId: Number(process.env.RUN_ID),
  });
  const line = result.sha
    ? `last green: ${result.sha}`
    : `last green: none (${result.reason})`;
  console.log(line);
  if (process.env.GITHUB_STEP_SUMMARY)
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n\n`);
}
