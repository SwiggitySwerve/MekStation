// Optional GitHub artifact transport. The gate owns baseline validity/tightening.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { githubApi, paginate } from './ci-report-github.mjs';

// The single owner of the last-green artifact's retention. The workflow's
// upload step must use the same value (parity-runtime-workflow.test.mjs pins it).
// No run created before the retention window can still hold an unexpired
// artifact, so the scan stops there instead of walking every main Nightly.
export const LAST_GREEN_RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

async function findLastGreen({ api, repository, runId, measure, now }) {
  let expired = 0;
  const name = `parity-runtime-last-green-${measure}`;
  const cutoff = now() - LAST_GREEN_RETENTION_DAYS * DAY_MS;
  const created = encodeURIComponent(`>=${new Date(cutoff).toISOString()}`);
  // GitHub returns newest runs first. Do not filter on conclusion: another
  // lane (or the other measure) may have failed. Reuse the CI pagination owner.
  // The created filter bounds the list server-side; the cutoff check below
  // bounds the artifact reads even if the filter were ignored.
  const runs = await paginate(
    api,
    `repos/${repository}/actions/workflows/nightly-validation.yml/runs?branch=main&created=${created}`,
    'workflow_runs',
  );
  for (const run of runs) {
    const createdAt = Date.parse(run.created_at);
    if (!Number.isFinite(createdAt))
      throw new Error(`run ${run.id} has no readable created_at`);
    if (createdAt < cutoff) break;
    if (run.id === runId || run.head_branch !== 'main') continue;
    const artifacts = await paginate(
      api,
      `repos/${repository}/actions/runs/${run.id}/artifacts`,
      'artifacts',
    );
    for (const artifact of artifacts.filter((item) => item.name === name)) {
      if (!artifact.expired) return { run, artifact };
      expired += 1;
    }
  }
  // The scan completed. Until this measure has a retained green artifact there
  // is no main nightly to tighten against (older Nightlies predate this gate).
  return {
    reason: `within retention (${LAST_GREEN_RETENTION_DAYS} days)${expired ? `; ${expired} expired artifact(s) seen` : ''}`,
  };
}

/**
 * The one wording of the last-green result, shared by the lookup step and the
 * job summary. A completed scan that found nothing and a lookup that failed
 * print different lines; neither fails the job.
 */
export function lastGreenLine(retrieval) {
  if (retrieval?.status === 'found' && retrieval.sha)
    return `last green: ${retrieval.sha}`;
  if (retrieval?.status === 'none')
    return `last green: none ${retrieval.reason}`;
  return `last green: lookup failed (${retrieval?.reason ?? 'no retrieval record'})`;
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
  now = Date.now,
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
    const selected = await findLastGreen({
      api,
      repository,
      runId,
      measure,
      now,
    });
    if (!selected.run)
      result = { status: 'none', sha: null, reason: selected.reason };
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
      result = { status: 'found', sha: green.runSha, reason: null };
    }
  } catch (error) {
    // A failed lookup is reported as failed, never as "none".
    result = { status: 'failed', sha: null, reason: error.message };
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
  const line = lastGreenLine(result);
  console.log(line);
  if (process.env.GITHUB_STEP_SUMMARY)
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n\n`);
}
