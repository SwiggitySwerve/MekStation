import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

import { verifyArtifactProducer } from './garden-producer-provenance.mjs';
import {
  collectSourceHeadRun,
  SOURCE_WORKFLOW_PATH,
} from './garden-run-provenance.mjs';
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
  collectRun,
  workflowGraphFromSource,
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
  const recent = artifacts.filter((artifact) => {
    if (!/^ci-observation-[1-9]\d*-[1-9]\d*\.json$/.test(artifact.name))
      return false;
    const created = Date.parse(artifact.created_at);
    if (typeof artifact.created_at !== 'string' || !Number.isFinite(created)) {
      diagnostics.push(`Artifact ${artifact.id}: invalid creation timestamp`);
      return false;
    }
    return created >= cutoff;
  });
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
        run.status !== 'completed' ||
        run.path?.split('@')[0] !== SOURCE_WORKFLOW_PATH
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
        run.run_attempt !== attempt
      )
        throw new Error('Observation provenance differs from live attempt');
      const fresh = await collectSourceHeadRun({
        github,
        owner,
        repo,
        run,
        workflowPath: SOURCE_WORKFLOW_PATH,
        collectRun,
        workflowGraphFromSource,
      });
      if (!isDeepStrictEqual(envelope.observation, fresh.observation))
        throw new Error(
          'Artifact observation differs from fresh source-head API normalization',
        );
      const producer = await verifyArtifactProducer({
        github,
        owner,
        repo,
        metadata,
        artifact,
        envelope,
        sourceRun: run,
        sourceObservation: fresh.observation,
        collectRun,
        workflowGraphFromSource,
      });
      envelopes.push(envelope);
      sources.push({
        artifactId: artifact.id,
        name: artifact.name,
        runId,
        attempt,
        headSha: id.headSha,
        completedAt: id.completedAt,
        workflowBlobSha: fresh.workflowBlobSha,
        producer,
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
