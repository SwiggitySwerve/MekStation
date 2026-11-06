import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { DAY_MS } from './garden-week.mjs';

export function decodeObservationArtifact(bytes, filename) {
  const output = execFileSync(
    process.platform === 'win32' ? 'python' : 'python3',
    [
      '-B',
      fileURLToPath(new URL('./garden-artifact.py', import.meta.url)),
      filename,
    ],
    {
      input: Buffer.from(bytes),
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
      timeout: 10000,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  );
  return JSON.parse(output);
}

export async function collectGardenObservations({
  github,
  owner,
  repo,
  now,
  validateObservation,
  decode = decodeObservationArtifact,
}) {
  const cutoff = Math.floor(Date.parse(now) / DAY_MS) * DAY_MS - 14 * DAY_MS;
  if (!Number.isFinite(cutoff)) throw new Error('Invalid collection time');
  const envelopes = [],
    diagnostics = [],
    sources = [];
  const { data: metadata } = await github.rest.repos.get({ owner, repo });
  const artifacts = await github.paginate(
    github.rest.actions.listArtifactsForRepo,
    { owner, repo, per_page: 100 },
  );
  const recent = artifacts.filter(
    (artifact) =>
      /^ci-observation-[1-9]\d*-[1-9]\d*\.json$/.test(artifact.name) &&
      Date.parse(artifact.created_at) >= cutoff,
  );
  if (recent.length > 500)
    throw new Error(
      'Observation collection exceeds 500 artifacts; narrow producer retention',
    );
  for (const artifact of recent) {
    try {
      if (artifact.expired || artifact.size_in_bytes > 8 * 1024 * 1024)
        throw new Error('Expired or oversized artifact');
      const [, runId, attempt] = artifact.name
        .match(/^ci-observation-(\d+)-(\d+)\.json$/)
        .map(Number);
      if (artifact.workflow_run?.id !== runId)
        throw new Error('Artifact/run identity mismatch');
      const { data: run } = await github.rest.actions.getWorkflowRunAttempt({
        owner,
        repo,
        run_id: runId,
        attempt_number: attempt,
      });
      // PR artifacts are never a source of budget-lowering evidence.
      if (
        run.event !== 'push' ||
        run.head_branch !== metadata.default_branch ||
        run.head_repository?.full_name !== metadata.full_name ||
        run.path?.split('@')[0] !== '.github/workflows/pr-checks.yml'
      )
        continue;
      const { data: archive } = await github.rest.actions.downloadArtifact({
        owner,
        repo,
        artifact_id: artifact.id,
        archive_format: 'zip',
      });
      const envelope = validateObservation(decode(archive, artifact.name));
      const id = envelope.observation.identity;
      if (
        id.repository !== metadata.full_name ||
        id.runId !== runId ||
        id.attempt !== attempt ||
        id.workflowId !== run.workflow_id ||
        id.headSha !== run.head_sha ||
        id.createdAt !== run.created_at ||
        id.startedAt !== run.run_started_at ||
        id.event !== run.event ||
        id.branch !== run.head_branch ||
        id.conclusion !== run.conclusion ||
        run.id !== runId ||
        run.run_attempt !== attempt ||
        artifact.workflow_run.head_sha !== run.head_sha
      )
        throw new Error('Observation provenance differs from live attempt');
      envelopes.push(envelope);
      sources.push({
        artifactId: artifact.id,
        name: artifact.name,
        runId,
        attempt,
        headSha: id.headSha,
      });
    } catch (error) {
      diagnostics.push(`Artifact ${artifact.id}: ${error.message}`);
    }
  }
  return {
    envelopes,
    diagnostics,
    sources,
    artifactsScanned: artifacts.length,
  };
}
