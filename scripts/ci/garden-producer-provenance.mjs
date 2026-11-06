import {
  collectSourceHeadRun,
  GUARD_WORKFLOW_PATH,
} from './garden-run-provenance.mjs';

function assertRepository(run, metadata) {
  if (
    !Number.isSafeInteger(metadata.id) ||
    metadata.id <= 0 ||
    run.repository?.id !== metadata.id ||
    run.repository.full_name !== metadata.full_name ||
    run.head_repository?.id !== metadata.id ||
    run.head_repository.full_name !== metadata.full_name
  )
    throw new Error('Run repository differs from the live owning repository');
}

function assertArtifactRun(artifact, run, metadata) {
  const actual = artifact.workflow_run;
  if (
    actual?.id !== run.id ||
    actual.head_sha !== run.head_sha ||
    actual.head_branch !== run.head_branch ||
    actual.repository_id !== metadata.id ||
    actual.head_repository_id !== metadata.id
  )
    throw new Error('Artifact producer metadata differs from the live run');
}

function assertStamp(stamp, run, source, metadata) {
  // G2 owns the producer schema. These are bindings to independently read facts.
  if (
    stamp.repository !== metadata.full_name ||
    stamp.runId !== run.id ||
    stamp.attempt !== run.run_attempt ||
    stamp.headSha !== run.head_sha ||
    stamp.sourceRunId !== source.runId ||
    stamp.sourceAttempt !== source.attempt
  )
    throw new Error(
      'Producer stamp differs from live producer/source identities',
    );
}

function assertArtifactAttemptTime(artifact, observation) {
  const created = Date.parse(artifact.created_at);
  const began = Date.parse(observation.identity.startedAt);
  const completed = Date.parse(observation.identity.completedAt);
  // GitHub job completion timestamps have second precision; compare the final
  // second at that precision rather than rejecting millisecond artifact times.
  if (
    ![created, began, completed].every(Number.isFinite) ||
    created < began ||
    Math.floor(created / 1000) > Math.floor(completed / 1000)
  )
    throw new Error(
      'Artifact creation is outside the verified producer attempt',
    );
}

export async function verifyArtifactProducer({
  github,
  owner,
  repo,
  metadata,
  artifact,
  envelope,
  sourceRun,
  sourceObservation,
  collectRun,
  workflowGraphFromSource,
}) {
  assertRepository(sourceRun, metadata);
  const source = sourceObservation.identity;
  if (artifact.workflow_run?.id === sourceRun.id) {
    assertArtifactRun(artifact, sourceRun, metadata);
    if (envelope.producer != null)
      assertStamp(envelope.producer, sourceRun, source, metadata);
    assertArtifactAttemptTime(artifact, sourceObservation);
    return {
      kind: 'direct-source',
      runId: sourceRun.id,
      attempt: sourceRun.run_attempt,
      headSha: sourceRun.head_sha,
      completedAt: source.completedAt,
    };
  }
  const stamp = envelope.producer;
  if (stamp == null)
    throw new Error(
      'A distinct artifact producer requires a canonical producer stamp',
    );
  if (stamp.runId !== artifact.workflow_run?.id)
    throw new Error('Producer stamp run differs from artifact producer run');
  const { data: producer } = await github.rest.actions.getWorkflowRunAttempt({
    owner,
    repo,
    run_id: artifact.workflow_run.id,
    attempt_number: stamp.attempt,
  });
  assertRepository(producer, metadata);
  assertArtifactRun(artifact, producer, metadata);
  assertStamp(stamp, producer, source, metadata);
  if (
    producer.status !== 'completed' ||
    producer.conclusion !== 'success' ||
    producer.event !== 'workflow_run' ||
    producer.head_branch !== metadata.default_branch ||
    producer.path?.split('@')[0] !== GUARD_WORKFLOW_PATH
  )
    throw new Error(
      'Artifact producer is not a completed trusted Guard workflow_run',
    );

  // A branch name in JSON does not establish trust. Pin the live default tip,
  // prove the producer commit is its ancestor, and read Guard YAML at that SHA.
  const { data: branch } = await github.rest.repos.getBranch({
    owner,
    repo,
    branch: metadata.default_branch,
  });
  const defaultHeadSha = branch.commit.sha;
  const { data: comparison } =
    await github.rest.repos.compareCommitsWithBasehead({
      owner,
      repo,
      basehead: `${producer.head_sha}...${defaultHeadSha}`,
    });
  if (
    !['identical', 'ahead'].includes(comparison.status) ||
    comparison.base_commit?.sha !== producer.head_sha ||
    comparison.merge_base_commit?.sha !== producer.head_sha
  )
    throw new Error(
      'Guard producer head is not on the pinned default-branch history',
    );
  const fresh = await collectSourceHeadRun({
    github,
    owner,
    repo,
    run: producer,
    workflowPath: GUARD_WORKFLOW_PATH,
    collectRun,
    workflowGraphFromSource,
  });
  const id = fresh.observation.identity;
  if (
    !fresh.observation.complete ||
    id.repository !== metadata.full_name ||
    id.runId !== producer.id ||
    id.attempt !== producer.run_attempt ||
    id.workflowId !== producer.workflow_id ||
    id.headSha !== producer.head_sha ||
    id.event !== producer.event ||
    id.branch !== producer.head_branch ||
    id.createdAt !== producer.created_at ||
    id.startedAt !== producer.run_started_at ||
    id.conclusion !== producer.conclusion
  )
    throw new Error(
      'Fresh Guard attempt normalization differs from producer identity',
    );
  const sourceCompleted = Date.parse(source.completedAt);
  if (
    !Number.isFinite(sourceCompleted) ||
    sourceCompleted > Date.parse(id.startedAt)
  )
    throw new Error(
      'Guard producer attempt started before its source completed',
    );
  assertArtifactAttemptTime(artifact, fresh.observation);
  return {
    kind: 'trusted-guard',
    runId: id.runId,
    attempt: id.attempt,
    headSha: id.headSha,
    workflowId: id.workflowId,
    defaultHeadSha,
    workflowBlobSha: fresh.workflowBlobSha,
    completedAt: id.completedAt,
  };
}
