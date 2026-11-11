// Pure timing normalization. A sample always describes one GitHub run attempt.
import { createHash } from 'node:crypto';

import { quantile } from '../lib/statistics.mjs';

export { median, quantile } from '../lib/statistics.mjs';
export const TIMING_GROWTH_RATIO = 1.2;
export const MIN_TIMING_MAIN_SAMPLES = 5;

const timestamp = (value) =>
  typeof value === 'string' && Number.isFinite(Date.parse(value))
    ? Date.parse(value)
    : null;

/** GitHub emits one literal template job when a matrix is gated off. */
export function resolveJobGraph(jobGraph, matrixGroups, jobs) {
  const graph = structuredClone(jobGraph);
  for (const [template, expanded] of Object.entries(matrixGroups)) {
    if (
      !jobs.some((job) => job.name === template && job.conclusion === 'skipped')
    )
      continue;
    if (
      !Array.isArray(expanded) ||
      !expanded.length ||
      expanded.some(
        (name) =>
          !Array.isArray(graph[name]) || jobs.some((job) => job.name === name),
      )
    )
      throw new Error(`Ambiguous skipped matrix: ${template}`);
    const dependencies = graph[expanded[0]];
    if (
      expanded.some(
        (name) =>
          JSON.stringify([...graph[name]].sort()) !==
          JSON.stringify([...dependencies].sort()),
      )
    )
      throw new Error(`Inconsistent skipped matrix dependencies: ${template}`);
    for (const name of expanded) delete graph[name];
    graph[template] = dependencies;
    for (const name of Object.keys(graph))
      graph[name] = [
        ...new Set(
          graph[name].map((dependency) =>
            expanded.includes(dependency) ? template : dependency,
          ),
        ),
      ];
  }
  return graph;
}

export function normalizeRun({
  repository,
  run,
  jobs,
  jobGraph,
  matrixGroups = {},
}) {
  if (
    !/^[\w.-]+\/[\w.-]+$/.test(repository) ||
    !Number.isSafeInteger(run.id) ||
    !Number.isSafeInteger(run.run_attempt) ||
    run.run_attempt < 1 ||
    !Number.isSafeInteger(run.workflow_id) ||
    !/^[a-f\d]{40}$/i.test(run.head_sha) ||
    !Array.isArray(jobs) ||
    !jobGraph ||
    typeof jobGraph !== 'object'
  )
    throw new Error('Invalid run identity, jobs or expanded job graph');
  jobGraph = resolveJobGraph(jobGraph, matrixGroups, jobs);
  const missing = [];
  const start = timestamp(run.run_started_at);
  const created = timestamp(run.created_at);
  // The collector reads this run from the attempts endpoint
  // (GET /actions/runs/{id}/attempts/{n}), which sometimes gives created_at
  // one second after run_started_at, while the run endpoint
  // (GET /actions/runs/{id}) gives the two as equal. Example: run 42898290006
  // attempt 1 reads created 20:44:52Z, started 20:44:51Z; the run endpoint
  // reads 20:44:51Z for both. That is second rounding between two endpoints,
  // not a run that started before it was created, so up to one second is read
  // as zero queue time. This is not a general tolerance: a start more than one
  // second before creation still marks the run incomplete.
  const ENDPOINT_ROUNDING_MS = 1000;
  if (
    start === null ||
    created === null ||
    start < created - ENDPOINT_ROUNDING_MS
  )
    missing.push('Invalid run timestamps');
  if (run.status !== 'completed') missing.push('Run is not completed');
  const names = Object.keys(jobGraph).sort();
  const visiting = new Set();
  const visited = new Set();
  function check(name) {
    if (visiting.has(name)) throw new Error(`Cyclic job graph: ${name}`);
    if (visited.has(name)) return;
    if (!Array.isArray(jobGraph[name]))
      throw new Error(`Unknown job dependency: ${name}`);
    visiting.add(name);
    jobGraph[name].forEach(check);
    visiting.delete(name);
    visited.add(name);
  }
  names.forEach(check);
  const byName = new Map();
  const ids = new Set();
  for (const job of jobs) {
    if (
      job.run_id !== run.id ||
      job.run_attempt !== run.run_attempt ||
      job.head_sha !== run.head_sha
    )
      throw new Error(`Cross-run/head/attempt job: ${job.id}`);
    if (ids.has(job.id) || byName.has(job.name))
      throw new Error(`Duplicate job identity: ${job.name}`);
    ids.add(job.id);
    byName.set(job.name, job);
    if (!Object.hasOwn(jobGraph, job.name))
      missing.push(`Unaccounted job: ${job.name}`);
  }
  for (const name of names)
    if (!byName.has(name)) missing.push(`Missing job: ${name}`);
  const rows = jobs.map((job) => {
    const gaps = [];
    const began = timestamp(job.started_at);
    const ended = timestamp(job.completed_at);
    const skipped = job.conclusion === 'skipped';
    let durationMs = null;
    let queueMs = null;
    if (skipped) durationMs = 0;
    else if (
      job.status === 'completed' &&
      job.runner_id > 0 &&
      began !== null &&
      ended !== null &&
      began >= start &&
      ended >= began
    )
      durationMs = ended - began;
    else gaps.push('Execution timestamps or acquired runner unavailable');
    const dependencies = jobGraph[job.name] ?? [];
    const completions = dependencies.map((name) =>
      timestamp(byName.get(name)?.completed_at),
    );
    if (skipped) queueMs = 0;
    else if (
      durationMs !== null &&
      start !== null &&
      completions.every((n) => n !== null)
    ) {
      const ready = Math.max(start, ...completions);
      if (began >= ready) queueMs = began - ready;
      else gaps.push('Job started before its dependencies completed');
    } else gaps.push('Queue readiness unavailable');
    missing.push(...gaps.map((gap) => `${job.name}: ${gap}`));
    return {
      id: job.id,
      name: job.name,
      conclusion: job.conclusion,
      durationMs,
      queueMs,
      missing: gaps,
    };
  });
  const durations = new Map(rows.map((row) => [row.name, row.durationMs]));
  const paths = new Map();
  function longest(name) {
    if (paths.has(name)) return paths.get(name);
    const own = durations.get(name);
    const parents = jobGraph[name].map(longest);
    const value =
      own === null || own === undefined || parents.includes(null)
        ? null
        : own + Math.max(0, ...parents);
    paths.set(name, value);
    return value;
  }
  const pathLengths = names.map(longest);
  const complete = missing.length === 0 && names.length > 0;
  const endings = jobs.map((job) => timestamp(job.completed_at));
  const metric = (field) =>
    complete && rows.every((row) => row[field] !== null)
      ? rows.reduce((sum, row) => sum + row[field], 0)
      : null;
  const signature = jobs
    .map((job) => [
      job.name,
      [...(job.labels ?? [])].sort(),
      job.conclusion === 'skipped',
    ])
    .sort(([a], [b]) => a.localeCompare(b));
  return {
    schemaVersion: 1,
    identity: {
      repository,
      workflowId: run.workflow_id,
      runId: run.id,
      attempt: run.run_attempt,
      headSha: run.head_sha,
      event: run.event,
      branch: run.head_branch,
      createdAt: run.created_at,
      startedAt: run.run_started_at,
      completedAt:
        endings.length && endings.every((n) => n !== null)
          ? new Date(Math.max(...endings)).toISOString()
          : null,
      conclusion: run.conclusion,
    },
    comparableKey: createHash('sha256')
      .update(
        JSON.stringify({
          repository,
          workflowId: run.workflow_id,
          graph: names.map((name) => [name, [...jobGraph[name]].sort()]),
          signature,
        }),
      )
      .digest('hex'),
    jobs: rows,
    metrics: {
      jobMinutes:
        metric('durationMs') === null ? null : metric('durationMs') / 60000,
      criticalPathMs:
        complete && !pathLengths.includes(null)
          ? Math.max(...pathLengths)
          : null,
      elapsedMs:
        complete && start !== null && endings.every((n) => n !== null)
          ? Math.max(...endings) - start
          : null,
      queueMs: metric('queueMs'),
    },
    complete,
    missing,
  };
}

/** Failed/cancelled/incompatible observations remain in excluded, with reasons. */
export function selectMainObservations(
  observations,
  current,
  valid = () => true,
) {
  const included = [];
  const excluded = [];
  const seen = new Set();
  for (const sample of observations) {
    const id = sample?.identity;
    if (
      !id ||
      !Number.isSafeInteger(id.runId) ||
      !Number.isSafeInteger(id.attempt)
    ) {
      excluded.push({ identity: id ?? null, reason: 'invalid identity' });
      continue;
    }
    const key = `${id.repository}/${id.runId}/${id.attempt}`;
    let reason;
    if (seen.has(key)) reason = 'duplicate attempt';
    else if (!sample.complete) reason = 'incomplete';
    else if (!valid(sample)) reason = 'invalid measurements';
    else if (
      id.event !== 'push' ||
      id.branch !== 'main' ||
      id.conclusion !== 'success'
    )
      reason = 'not successful main push';
    else if (sample.comparableKey !== current.comparableKey)
      reason = 'not comparable';
    else if (
      id.repository !== current.identity.repository ||
      id.workflowId !== current.identity.workflowId
    )
      reason = 'not comparable';
    else if (
      timestamp(id.createdAt) === null ||
      timestamp(id.completedAt) === null ||
      timestamp(current.identity.createdAt) === null ||
      timestamp(id.createdAt) >= timestamp(current.identity.createdAt) ||
      timestamp(id.completedAt) >= timestamp(current.identity.createdAt)
    )
      reason = 'not an earlier baseline';
    if (!reason) seen.add(key);
    if (reason) excluded.push({ identity: id, reason });
    else included.push(sample);
  }
  return { included, excluded };
}

export function mainMedians(observations, current) {
  const { included, excluded } = selectMainObservations(
    observations,
    current,
    (sample) =>
      sample.metrics &&
      Array.isArray(sample.jobs) &&
      Object.values(sample.metrics).every(
        (n) => Number.isFinite(n) && n >= 0,
      ) &&
      sample.jobs.every(
        (job) => Number.isFinite(job.durationMs) && job.durationMs >= 0,
      ),
  );
  const value = (values, probability = 0.5) =>
    values.length && values.every((n) => Number.isFinite(n) && n >= 0)
      ? quantile(values, probability)
      : null;
  return {
    included: included.map((sample) => sample.identity),
    excluded,
    p75: {
      metrics: Object.fromEntries(
        Object.keys(current.metrics).map((key) => [
          key,
          value(
            included.map((sample) => sample.metrics[key]),
            0.75,
          ),
        ]),
      ),
      jobs: Object.fromEntries(
        current.jobs.map(({ name }) => [
          name,
          value(
            included.map(
              (sample) =>
                sample.jobs.find((job) => job.name === name)?.durationMs,
            ),
            0.75,
          ),
        ]),
      ),
    },
    metrics: Object.fromEntries(
      Object.keys(current.metrics).map((key) => [
        key,
        value(included.map((sample) => sample.metrics[key])),
      ]),
    ),
    jobs: Object.fromEntries(
      current.jobs.map(({ name }) => [
        name,
        value(
          included.map(
            (sample) =>
              sample.jobs.find((job) => job.name === name)?.durationMs,
          ),
        ),
      ]),
    ),
  };
}
