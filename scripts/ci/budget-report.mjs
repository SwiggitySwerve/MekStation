// Trusted dependency-free writer: reads artifacts as JSON; executes no producer code.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { mergeFileDurations } from '../jest/test-file-durations.mjs';
import { validateBudgets, WORKFLOW_INPUT_SCHEMA } from './budget-config.mjs';
import {
  validateRepositoryMetrics,
  observedBudgetValues,
  observationProducer,
} from './budget-observation.mjs';
import { observationEnvelope, validateObservation } from './ci-observation.mjs';
import { renderReport } from './ci-report-evaluate.mjs';
import { collectRun, githubApi, publishReport } from './ci-report-github.mjs';
import { buildReport } from './ci-report.mjs';
import { testObservation } from './ci-test-metrics.mjs';
import { decodeObservationArtifact } from './garden-collect.mjs';

/** Advisory timing inputs only; G3 applies its stronger weekly ratchet policy. */
export async function collectReportBaselines(github, inputs) {
  if (
    !/^[\w.-]+\/[\w.-]+$/.test(inputs.source?.repository) ||
    !Array.isArray(inputs.baselines) ||
    inputs.baselines.length > 10 ||
    inputs.baselines.some(
      (row) =>
        ![row.runId, row.attempt].every(
          (n) => Number.isSafeInteger(n) && n > 0,
        ),
    )
  )
    throw new Error('Invalid bounded advisory baseline inputs');
  const [owner, repo] = inputs.source.repository.split('/');
  const envelopes = [],
    diagnostics = [];
  for (const source of inputs.baselines ?? []) {
    const filename = `ci-observation-${source.runId}-${source.attempt}.json`;
    const rows = await github.paginate(
      github.rest.actions.listArtifactsForRepo,
      { owner, repo, name: filename, per_page: 100 },
    );
    for (const artifact of rows.sort((a, b) => b.id - a.id)) {
      try {
        if (
          artifact.name !== filename ||
          artifact.expired ||
          artifact.size_in_bytes > 8 * 1024 * 1024
        )
          continue;
        const { data: bytes } = await github.rest.actions.downloadArtifact({
          owner,
          repo,
          artifact_id: artifact.id,
          archive_format: 'zip',
        });
        const envelope = validateObservation(
            decodeObservationArtifact(bytes, filename),
          ),
          producer = envelope.producer;
        if (
          !producer ||
          producer.runId !== artifact.workflow_run?.id ||
          producer.headSha !== artifact.workflow_run?.head_sha ||
          envelope.observation.identity.runId !== source.runId ||
          envelope.observation.identity.attempt !== source.attempt
        )
          throw new Error('Advisory artifact producer/source mismatch');
        const { data: run } = await github.rest.actions.getWorkflowRunAttempt({
          owner,
          repo,
          run_id: producer.runId,
          attempt_number: producer.attempt,
        });
        if (
          run.event !== 'workflow_run' ||
          run.path?.split('@')[0] !==
            '.github/workflows/lint-and-test-guard.yml' ||
          run.head_repository?.full_name !== inputs.source.repository ||
          run.head_sha !== producer.headSha ||
          run.run_attempt !== producer.attempt ||
          run.status !== 'completed' ||
          run.conclusion !== 'success'
        )
          throw new Error(
            'Advisory artifact is not from a completed trusted producer',
          );
        envelopes.push(
          observationEnvelope(envelope.observation, {
            tests: envelope.tests,
            producer,
          }),
        );
        break;
      } catch (error) {
        diagnostics.push(`${artifact.id}: ${error.message}`);
      }
    }
  }
  return { envelopes, diagnostics };
}

function json(file, optional = false) {
  if (optional && !fs.existsSync(file)) return null;
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 8 * 1024 * 1024)
    throw new Error('Artifact is not bounded ordinary JSON');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function producerEnvelope(observation, inputs, artifacts) {
  const id = observation.identity,
    source = inputs.source;
  if (
    inputs.schema !== WORKFLOW_INPUT_SCHEMA ||
    source.repository !== id.repository ||
    source.runId !== id.runId ||
    source.attempt !== id.attempt ||
    source.headSha !== id.headSha ||
    source.workflowId !== id.workflowId
  )
    throw new Error('Producer/run identity mismatch');
  const config = validateBudgets(JSON.parse(inputs.configText));
  const repositoryMetrics = artifacts.repository?.metrics ?? null;
  let projection = null,
    digest = null;
  const packages = {
    web: artifacts.web ?? null,
    installers: artifacts.installers ?? null,
  };
  if (repositoryMetrics) {
    validateRepositoryMetrics(repositoryMetrics);
    digest = createHash('sha256').update(inputs.configText).digest('hex');
    if (digest !== repositoryMetrics.budgetConfigHash)
      throw new Error('Producer config hash mismatch');
    const observed = observedBudgetValues(config, repositoryMetrics, packages);
    if (observed.complete) projection = observed.values;
  }
  const files = {},
    cacheReports = artifacts.jest ?? [];
  let attempts = 0,
    hits = 0;
  for (const entry of cacheReports) {
    if (
      ![entry.files, entry.hits].every(
        (n) => Number.isSafeInteger(n) && n >= 0,
      ) ||
      entry.hits > entry.files ||
      !entry.timingFiles ||
      !Array.isArray(entry.testFiles)
    )
      throw new Error('Invalid Jest producer');
    attempts += entry.files;
    hits += entry.hits;
    mergeFileDurations(files, entry.timingFiles);
  }
  const expected = repositoryMetrics?.cache.files ?? [];
  const complete =
    expected.length > 0 &&
    JSON.stringify(Object.keys(files).sort()) ===
      JSON.stringify([...expected].sort());
  return observationEnvelope(observation, {
    repositoryMetrics,
    packages,
    budgetConfigHash: digest,
    budgetValues: projection,
    tests: Object.keys(files).length
      ? testObservation({ observation, files, complete, framework: 'jest' })
      : null,
    cache: cacheReports.length
      ? { availability: 'available', attempts, hits }
      : null,
  });
}

export async function reportRun({
  api = githubApi,
  repository,
  runId,
  attempt,
  artifactRoot,
  output,
  dryRun = false,
  baselineProducers = [],
}) {
  const inputs = json(path.join(artifactRoot, 'ci-budget-inputs/inputs.json'));
  const current = await collectRun(api, {
    repository,
    runId,
    attempt,
    graphs: inputs.graphs,
  });
  const artifacts = {
    repository: json(
      path.join(artifactRoot, 'ci-budget-repository/repository.json'),
      true,
    ),
    web: json(path.join(artifactRoot, 'ci-budget-web/web.json'), true),
    installers: json(
      path.join(artifactRoot, 'ci-budget-installers/installers.json'),
      true,
    ),
    jest: [],
  };
  for (const shard of [1, 2, 3]) {
    for (const project of ['unit', 'corpus']) {
      const entry = json(
        path.join(
          artifactRoot,
          `ci-budget-jest-${shard}/jest-results-${project}-${shard}.json`,
        ),
        true,
      );
      if (entry) artifacts.jest.push(entry);
    }
  }
  const producer = producerEnvelope(current.observation, inputs, artifacts);
  producer.producer = observationProducer(
    {
      repository,
      runId: Number(process.env.GITHUB_RUN_ID),
      attempt: Number(process.env.GITHUB_RUN_ATTEMPT),
      headSha: process.env.GITHUB_SHA,
    },
    current.observation.identity,
  );
  const result = await buildReport({
    api,
    repository,
    runId,
    attempt,
    graphs: inputs.graphs,
    limits: inputs.limits,
    producer,
    baselineProducers,
  });
  fs.mkdirSync(output, { recursive: true });
  const save = (name, value) =>
    fs.writeFileSync(
      path.join(output, name),
      `${JSON.stringify(value, null, 2)}\n`,
    );
  save(`ci-observation-${runId}-${attempt}.json`, result.envelope);
  save('evaluation.json', result.report);
  save('source-attempts.json', result.attempts);
  save('baseline-attempts.json', result.baselines);
  const markdown = renderReport(result.report);
  fs.writeFileSync(path.join(output, 'report.md'), markdown);
  if (process.env.GITHUB_STEP_SUMMARY)
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
  const publications = [];
  for (const pull of result.source.run.pull_requests ?? [])
    publications.push(
      await publishReport({
        api,
        repository,
        pullNumber: pull.number,
        expectedWorkflowId: inputs.source.workflowId,
        report: result.report,
        dryRun,
      }),
    );
  save('publication.json', { publications, diagnostics: result.diagnostics });
  return result;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await reportRun({
      repository: process.env.REPO,
      runId: Number(process.env.RUN_ID),
      attempt: Number(process.env.RUN_ATTEMPT),
      artifactRoot: process.env.ARTIFACT_ROOT,
      output: process.env.REPORT_OUTPUT,
      dryRun: process.env.REPORT_DRY_RUN === 'true',
      baselineProducers: process.env.BASELINE_OBSERVATIONS
        ? (json(process.env.BASELINE_OBSERVATIONS, true)?.envelopes ?? [])
        : [],
    });
  } catch (error) {
    console.error(`Advisory reporting unavailable: ${error.message}`);
  }
}
