import { collectGardenObservations } from './garden-collect.mjs';
import { renderGarden } from './garden-render.mjs';
import { buildGarden } from './garden-week.mjs';

export function projectGardenEvidence(envelope, config, api) {
  if (envelope.repositoryMetrics === null) {
    return { budgetValues: null, budgetConfigHash: null, contributors: null };
  }
  const metrics = api.validateRepositoryMetrics(envelope.repositoryMetrics);
  const packages = envelope.packages ?? {};
  const observed = api.observedBudgetValues(config, metrics, packages);
  const contributors = Object.values(packages).flatMap(
    (artifact) => api.packageContributors(artifact).files ?? [],
  );
  return {
    budgetValues: observed.complete ? observed.values : null,
    budgetConfigHash: metrics.budgetConfigHash,
    contributors,
  };
}

/**
 * Trusted workflow boundary. G1 supplies its schema/projection APIs and G2 its
 * telemetry/statistics APIs. No schema ownership or default caps live here.
 * projectEvidence(envelope,config) is G1's port, returning validated observed
 * {budgetValues, budgetConfigHash, contributors:[{path,bytes}]} or null fields.
 */
export async function prepareGarden({
  github,
  owner,
  repo,
  now,
  config,
  budgetConfigHash,
  expectedBaseSha,
  api,
  projectEvidence,
}) {
  if (
    !/^[a-f\d]{40}$/.test(expectedBaseSha) ||
    !/^[a-f\d]{64}$/.test(budgetConfigHash) ||
    typeof projectEvidence !== 'function'
  )
    throw new Error(
      'Pinned base SHA, budget digest and G1 evidence projection required',
    );
  const collected = await collectGardenObservations({
    github,
    owner,
    repo,
    now,
    validateObservation: api.validateObservation,
  });
  const projected = [],
    contributors = [];
  for (const envelope of collected.envelopes) {
    try {
      const evidence = projectEvidence(envelope, config);
      if (
        evidence.budgetConfigHash !== null &&
        evidence.budgetConfigHash !== envelope.budgetConfigHash
      )
        throw new Error('G1 metric digest differs from envelope');
      projected.push(
        api.validateObservation({
          ...envelope,
          budgetValues: evidence.budgetValues,
          budgetConfigHash: evidence.budgetConfigHash,
        }),
      );
      for (const row of evidence.contributors ?? [])
        contributors.push({
          runId: envelope.observation.identity.runId,
          ...row,
        });
    } catch (error) {
      collected.diagnostics.push(`G1 evidence rejected: ${error.message}`);
    }
  }
  const report = buildGarden({
    envelopes: projected,
    descriptors: api.budgetDescriptors(config),
    budgetConfigHash,
    now,
    api,
    diagnostics: collected.diagnostics,
  });
  const includedRuns = new Set(
    report.included.map((identity) => identity.runId),
  );
  const baselineRuns = new Set(
    report.baselineIncluded.map((identity) => identity.runId),
  );
  const members = new Map();
  for (const row of contributors.filter((row) => includedRuns.has(row.runId))) {
    if (!members.has(row.path)) members.set(row.path, []);
    members.get(row.path).push(row);
  }
  const packageRows = [...members]
    .map(([path, rows]) => {
      const prior = contributors.filter(
        (row) => baselineRuns.has(row.runId) && row.path === path,
      );
      return {
        path,
        bytes: api.median(rows.map((row) => row.bytes)),
        previousBytes: prior.length
          ? api.median(prior.map((row) => row.bytes))
          : null,
        runIds: [...new Set(rows.map((row) => row.runId))],
      };
    })
    .sort((a, b) => b.bytes - a.bytes || a.path.localeCompare(b.path))
    .slice(0, 10);
  const body = renderGarden(report, { contributors: packageRows });
  const content = report.proposals.length
    ? api.serializeBudgets(api.ratchetBudgets(config, report.proposals))
    : null;
  return {
    schemaVersion: 1,
    expectedBaseSha,
    budgetConfigHash,
    report,
    body,
    ratchetContent: content,
    ratchetBody: content
      ? `${body}\nThis draft lowers only the budget file. Source observations are associated with the runs above. Owner review and CI are required before merging.\n\nCreated with GPT-6.1 Sol in Codex via T3 Code.\n`
      : null,
    sources: collected.sources,
    artifactsScanned: collected.artifactsScanned,
  };
}
