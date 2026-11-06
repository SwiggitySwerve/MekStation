// Public artifact boundary for PR reporting and the weekly garden consumer.
const record = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const nonnegative = (value) => Number.isFinite(value) && value >= 0;
const fail = (field) => {
  throw new Error(`Invalid CI observation: ${field}`);
};
const sha = (value) =>
  typeof value === 'string' && /^[a-f\d]{40}$/i.test(value);

export function validateTestFiles(files, complete = false) {
  if (!record(files) || (complete && !Object.keys(files).length))
    fail('tests.files');
  for (const [file, ms] of Object.entries(files))
    if (
      !file ||
      file.startsWith('/') ||
      file.includes('\\') ||
      file.split('/').includes('..') ||
      /^[A-Za-z]:/.test(file) ||
      !nonnegative(ms)
    )
      fail('tests.files');
  return files;
}

export function validateObservation(envelope) {
  if (!record(envelope) || envelope.schemaVersion !== 1) fail('schemaVersion');
  const o = envelope.observation;
  if (!record(o) || o.schemaVersion !== 1 || !record(o.identity))
    fail('observation');
  const id = o.identity;
  if (
    !/^[\w.-]+\/[\w.-]+$/.test(id.repository) ||
    ![id.workflowId, id.runId, id.attempt].every(
      (n) => Number.isSafeInteger(n) && n > 0,
    ) ||
    !sha(id.headSha) ||
    !['event', 'branch', 'conclusion'].every(
      (key) => typeof id[key] === 'string',
    ) ||
    !['createdAt', 'startedAt'].every(
      (key) =>
        typeof id[key] === 'string' && Number.isFinite(Date.parse(id[key])),
    )
  )
    fail('identity');
  if (
    !(id.completedAt === null && !o.complete) &&
    (typeof id.completedAt !== 'string' ||
      !Number.isFinite(Date.parse(id.completedAt)))
  )
    fail('identity.completedAt');
  if (
    typeof o.comparableKey !== 'string' ||
    !/^[a-f\d]{64}$/.test(o.comparableKey) ||
    typeof o.complete !== 'boolean' ||
    !Array.isArray(o.missing) ||
    !o.missing.every((value) => typeof value === 'string') ||
    (o.complete && o.missing.length) ||
    !Array.isArray(o.jobs) ||
    (o.complete && !o.jobs.length) ||
    !record(o.metrics)
  )
    fail('completeness');
  for (const key of ['jobMinutes', 'criticalPathMs', 'elapsedMs', 'queueMs'])
    if (
      !(o.metrics[key] === null && !o.complete) &&
      !nonnegative(o.metrics[key])
    )
      fail(`metrics.${key}`);
  const names = new Set();
  for (const job of o.jobs) {
    if (
      !record(job) ||
      typeof job.name !== 'string' ||
      names.has(job.name) ||
      !Number.isSafeInteger(job.id) ||
      !Array.isArray(job.missing) ||
      (o.complete && job.missing.length) ||
      typeof job.conclusion !== 'string'
    )
      fail('jobs');
    names.add(job.name);
    for (const key of ['durationMs', 'queueMs'])
      if (!(job[key] === null && !o.complete) && !nonnegative(job[key]))
        fail(`jobs.${key}`);
  }
  if (envelope.tests !== null) {
    const tests = envelope.tests;
    if (
      !record(tests) ||
      tests.schemaVersion !== 1 ||
      tests.availability !== 'available' ||
      !['jest', 'playwright'].includes(tests.framework) ||
      tests.comparableKey !== `${o.comparableKey}/${tests.framework}` ||
      !record(tests.identity) ||
      Object.keys(id).some((key) => tests.identity[key] !== id[key]) ||
      typeof tests.complete !== 'boolean' ||
      !record(tests.files) ||
      (tests.complete && !Object.keys(tests.files).length)
    )
      fail('tests');
    validateTestFiles(tests.files, tests.complete);
  }
  // G1 owns these schema facts; preserve its collector output without reinterpreting it.
  if (
    envelope.repositoryMetrics !== null &&
    !record(envelope.repositoryMetrics)
  )
    fail('repositoryMetrics');
  if (
    envelope.packages !== null &&
    (!record(envelope.packages) ||
      !['web', 'installers'].every(
        (key) =>
          envelope.packages[key] === null || record(envelope.packages[key]),
      ))
  )
    fail('packages');
  if (
    envelope.budgetConfigHash !== null &&
    (typeof envelope.budgetConfigHash !== 'string' ||
      !/^[a-f\d]{64}$/.test(envelope.budgetConfigHash))
  )
    fail('budgetConfigHash');
  if (
    envelope.budgetValues !== null &&
    (!record(envelope.budgetValues) ||
      !Object.values(envelope.budgetValues).every(nonnegative))
  )
    fail('budgetValues');
  if (envelope.cache !== null) {
    const cache = envelope.cache;
    if (
      !record(cache) ||
      cache.availability !== 'available' ||
      ![cache.attempts, cache.hits].every(
        (n) => Number.isSafeInteger(n) && n >= 0,
      ) ||
      cache.hits > cache.attempts
    )
      fail('cache');
  }
  if (envelope.attribution !== null) {
    const a = envelope.attribution;
    if (
      !record(a) ||
      a.method !== 'github-associated-pulls' ||
      !Array.isArray(a.pullRequests) ||
      !a.pullRequests.every(
        (pr) =>
          Number.isSafeInteger(pr.number) &&
          pr.number > 0 &&
          pr.url === `https://github.com/${id.repository}/pull/${pr.number}` &&
          sha(pr.headSha),
      )
    )
      fail('attribution');
  }
  return envelope;
}

export function observationEnvelope(observation, extra = {}) {
  return validateObservation({
    schemaVersion: 1,
    observation,
    tests: null,
    repositoryMetrics: null,
    packages: null,
    budgetConfigHash: null,
    budgetValues: null,
    cache: null,
    attribution: null,
    ...extra,
  });
}
