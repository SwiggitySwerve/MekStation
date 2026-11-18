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

/**
 * Whether tonight's green result may become the new last green. Last green is
 * enforcement, not a report: while the committed baseline is unchanged the
 * gate takes the best of each fact against it. So only a lookup that completed
 * (found, or none within retention) may be followed by an upload. After a
 * failed lookup the gate ran on the committed baseline alone; uploading that
 * untightened result would replace the chain and release every unit that had
 * improved past the baseline. The workflow's upload condition reads the
 * `status` step output this script writes, and lists exactly these statuses.
 */
export const LAST_GREEN_UPLOAD_STATUSES = Object.freeze(['found', 'none']);

async function findLastGreen({ api, repository, runId, measure, now, accept }) {
  let expired = 0;
  const badArtifacts = [];
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
      if (artifact.expired) {
        expired += 1;
        continue;
      }
      // A transient failure (API, download) throws and fails the whole lookup.
      // A bad artifact (unreadable, wrong identity) fails the same way every
      // night, so it is named by run id and the scan moves on to the next
      // older run: it can neither block the chain nor stand in for a good one.
      const verdict = await accept(run, artifact);
      if (verdict.bad)
        badArtifacts.push({ runId: run.id, reason: verdict.bad });
      else return { run, green: verdict.green, badArtifacts };
    }
  }
  // The scan completed. Until this measure has a retained green artifact there
  // is no main nightly to tighten against (older Nightlies predate this gate).
  return {
    badArtifacts,
    reason: `within retention (${LAST_GREEN_RETENTION_DAYS} days)${expired ? `; ${expired} expired artifact(s) seen` : ''}`,
  };
}

/**
 * The one wording of the last-green result, shared by the lookup step and the
 * job summary. A completed scan that found nothing and a lookup that failed
 * print different lines. Neither fails the job, but a failed lookup blocks
 * tonight's last-green upload (LAST_GREEN_UPLOAD_STATUSES).
 */
export function lastGreenLine(retrieval) {
  const bad = retrieval?.badArtifacts?.length
    ? `; skipped bad artifact(s): ${retrieval.badArtifacts.map((item) => `run ${item.runId} (${item.reason})`).join(', ')}`
    : '';
  if (retrieval?.status === 'found' && retrieval.sha)
    return `last green: ${retrieval.sha}${bad}`;
  if (retrieval?.status === 'none')
    return `last green: none ${retrieval.reason}${bad}`;
  return `last green: lookup failed (${retrieval?.reason ?? 'no retrieval record'}); no last green is uploaded tonight`;
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
  const temporaries = [];
  // Each candidate downloads into its own temporary directory. Only a complete,
  // readable artifact whose identity matches its run is renamed into place for
  // the gate; otherwise the committed baseline stays authoritative.
  const accept = async (run, artifact) => {
    const temporary = fs.mkdtempSync(path.join(out, 'download-'));
    temporaries.push(temporary);
    await download({
      repository,
      runId: run.id,
      name: artifact.name,
      destination: temporary,
    });
    const source = path.join(temporary, 'last-green.json');
    let green;
    try {
      green = JSON.parse(fs.readFileSync(source, 'utf8'));
    } catch (error) {
      return { bad: `unreadable last-green.json: ${error.message}` };
    }
    if (green?.runSha !== run.head_sha || green?.measure !== measure)
      return { bad: 'identity mismatch' };
    return { green: { runSha: green.runSha, source } };
  };
  let result;
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
      accept,
    });
    if (!selected.run)
      result = {
        status: 'none',
        sha: null,
        reason: selected.reason,
        badArtifacts: selected.badArtifacts,
      };
    else {
      fs.renameSync(selected.green.source, target);
      result = {
        status: 'found',
        sha: selected.green.runSha,
        reason: null,
        badArtifacts: selected.badArtifacts,
      };
    }
  } catch (error) {
    // A failed lookup is reported as failed, never as "none", and blocks
    // tonight's upload so the previous last green stays the newest.
    fs.rmSync(target, { force: true });
    result = { status: 'failed', sha: null, reason: error.message };
  } finally {
    for (const temporary of temporaries)
      fs.rmSync(temporary, { recursive: true, force: true });
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
  // The upload condition reads this. A missing output (the step died before
  // writing it) blocks the upload too.
  if (process.env.GITHUB_OUTPUT)
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `status=${result.status}\n`);
}
