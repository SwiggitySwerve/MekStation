import {
  METRICS_SCHEMA,
  PACKAGE_METRICS_SCHEMA,
  exactKeys,
  budgetDescriptors,
} from './budget-config.mjs';
import {
  OBSERVATION_PRODUCER_SCHEMA,
  validateObservationProducer,
} from './ci-observation.mjs';
export {
  OBSERVATION_PRODUCER_SCHEMA,
  validateObservationProducer,
} from './ci-observation.mjs';

export function observationProducer(producerRun, source) {
  return validateObservationProducer(
    {
      schema: OBSERVATION_PRODUCER_SCHEMA,
      ...producerRun,
      sourceRunId: source.runId,
      sourceAttempt: source.attempt,
    },
    source,
  );
}

export function validateRepositoryMetrics(metrics) {
  exactKeys(
    metrics,
    ['schema', 'budgetConfigHash', 'workflow', 'dependencies', 'cache'],
    'repository metrics',
  );
  if (
    metrics.schema !== METRICS_SCHEMA ||
    !/^[a-f0-9]{64}$/.test(metrics.budgetConfigHash)
  )
    throw new Error('Repository metric identity missing');
  if (
    !Array.isArray(metrics.workflow?.profiles) ||
    !metrics.workflow.profiles.length ||
    !metrics.workflow.timeouts
  )
    throw new Error('Workflow census missing');
  for (const p of metrics.workflow.profiles) {
    if (
      typeof p.typical !== 'boolean' ||
      !Number.isSafeInteger(p.active) ||
      p.active < 0 ||
      !Array.isArray(p.census) ||
      p.expanded !== p.census.length ||
      p.active !== p.census.filter((j) => j.active === true).length
    )
      throw new Error('Invalid expanded job census');
  }
  const files = metrics.cache?.files;
  if (
    !Array.isArray(files) ||
    !files.length ||
    new Set(files).size !== files.length
  )
    throw new Error('Missing/duplicate Jest census');
  for (const key of ['unkeyable', 'repoWide']) {
    if (
      !Array.isArray(metrics.cache[key]) ||
      new Set(metrics.cache[key].map((e) => e.file)).size !==
        metrics.cache[key].length ||
      metrics.cache[key].some((e) => !files.includes(e.file))
    )
      throw new Error(`Invalid ${key} census`);
  }
  for (const scope of ['root', 'desktop']) {
    exactKeys(
      metrics.dependencies[scope],
      ['lockEntries', 'directDependencies'],
      scope,
    );
    if (
      Object.values(metrics.dependencies[scope]).some(
        (n) => !Number.isSafeInteger(n) || n < 0,
      )
    )
      throw new Error('Invalid dependency census');
  }
  return metrics;
}

/** Projection is observations only. Callers publish null until complete. */
export function observedBudgetValues(config, repository) {
  validateRepositoryMetrics(repository);
  const values = {
    'limits.typicalPrJobs': Math.max(
      ...repository.workflow.profiles
        .filter((p) => p.typical)
        .map((p) => p.active),
    ),
    'limits.unkeyableTests': repository.cache.unkeyable.length,
    'limits.repoWideKeys': repository.cache.repoWide.length,
    ...Object.fromEntries(
      Object.entries(repository.dependencies).flatMap(([scope, counts]) =>
        Object.entries(counts).map(([id, value]) => [
          `dependencies.${scope}.${id}`,
          value,
        ]),
      ),
    ),
  };
  const missing = budgetDescriptors(config)
    .filter((d) => d.ratchet && !Object.hasOwn(values, d.id))
    .map((d) => d.id);
  return { values, complete: missing.length === 0, missing };
}

export function packageContributors(artifact) {
  const metrics = artifact?.metrics ?? artifact;
  if (!metrics)
    return { availability: 'unavailable', unit: 'bytes', files: null };
  if (
    metrics.schema !== PACKAGE_METRICS_SCHEMA ||
    metrics.unit !== 'bytes' ||
    !Array.isArray(metrics.files) ||
    !metrics.files.length ||
    metrics.files.some(
      (f) =>
        typeof f.path !== 'string' ||
        !Number.isSafeInteger(f.bytes) ||
        f.bytes < 0,
    )
  )
    throw new Error('Unknown package contributors');
  return {
    availability: 'available',
    unit: 'bytes',
    files: metrics.files.map(({ path: file, bytes }) => ({
      path: file,
      bytes,
    })),
  };
}
