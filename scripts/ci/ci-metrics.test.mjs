import assert from 'node:assert/strict';
import { test } from 'node:test';

import { mainMedians, normalizeRun } from './ci-metrics.mjs';
import { observationEnvelope, validateObservation } from './ci-observation.mjs';
import { evaluateReport, renderReport } from './ci-report-evaluate.mjs';
import { compareTestFiles, testObservation } from './ci-test-metrics.mjs';

const time = (seconds) =>
  new Date(Date.UTC(2026, 10, 1, 0, 0, seconds)).toISOString();
const graph = { detect: [], a: ['detect'], b: ['detect'], final: ['a', 'b'] };
function raw() {
  const run = {
    id: 100,
    run_attempt: 1,
    workflow_id: 10,
    head_sha: 'a'.repeat(40),
    event: 'pull_request',
    head_branch: 'feature',
    conclusion: 'success',
    status: 'completed',
    created_at: time(0),
    run_started_at: time(5),
  };
  const jobs = [
    ['detect', 10, 20],
    ['a', 22, 52],
    ['b', 25, 45],
    ['final', 55, 60],
  ].map(([name, start, end], index) => ({
    id: index + 1,
    name,
    run_id: run.id,
    run_attempt: 1,
    head_sha: run.head_sha,
    status: 'completed',
    conclusion: 'success',
    runner_id: 1,
    labels: ['ubuntu-latest'],
    started_at: time(start),
    completed_at: time(end),
  }));
  return {
    repository: 'owner/repo',
    run,
    jobs,
    jobGraph: structuredClone(graph),
  };
}
const sample = () => normalizeRun(raw());
function baseline(current, id = 99) {
  const result = structuredClone(current);
  Object.assign(result.identity, {
    runId: id,
    event: 'push',
    branch: 'main',
    createdAt: time(-100),
    startedAt: time(-100),
    completedAt: time(-40),
  });
  return result;
}
const limits = {
  jobsMs: { detect: 10000, a: 30000, b: 20000, final: 5000 },
  jobMinutes: 65 / 60,
  criticalPathMs: 45000,
};

test('job-minutes, DAG critical path and queue waits exclude dependency execution', () => {
  const o = sample();
  assert.equal(o.complete, true);
  assert.equal(o.metrics.jobMinutes, 65 / 60);
  assert.equal(o.metrics.criticalPathMs, 45000);
  assert.equal(o.metrics.elapsedMs, 55000);
  assert.equal(o.metrics.queueMs, 15000);
  assert.deepEqual(
    o.jobs.map((j) => j.queueMs),
    [5000, 2000, 5000, 3000],
  );
});

// Observed on run 42898290006 attempt 1: the attempts endpoint gave created_at
// one second after run_started_at (the run endpoint gave them equal).
function withRunTimes(createdAt, startedAt) {
  const input = raw();
  const shift = Date.parse(startedAt) - Date.parse(input.run.run_started_at);
  const move = (iso) => new Date(Date.parse(iso) + shift).toISOString();
  input.run.created_at = createdAt;
  input.run.run_started_at = startedAt;
  for (const job of input.jobs) {
    job.started_at = move(job.started_at);
    job.completed_at = move(job.completed_at);
  }
  return normalizeRun(input);
}

test('a one-second endpoint rounding between created and started is not an invalid run', () => {
  const o = withRunTimes('2026-11-10T20:44:52Z', '2026-11-10T20:44:51Z');
  assert.ok(!o.missing.includes('Invalid run timestamps'));
  assert.equal(o.complete, true);
});

test('a start more than one second before creation still marks the run incomplete', () => {
  const o = withRunTimes('2026-11-10T20:44:53Z', '2026-11-10T20:44:51Z');
  assert.ok(o.missing.includes('Invalid run timestamps'));
  assert.equal(o.complete, false);
});

test('reject cross-head, cross-run, cross-attempt, duplicate and cyclic jobs', () => {
  for (const change of [
    (x) => (x.jobs[0].head_sha = 'b'.repeat(40)),
    (x) => x.jobs[0].run_id++,
    (x) => x.jobs[0].run_attempt++,
    (x) => x.jobs.push(x.jobs[0]),
    (x) => (x.jobGraph.detect = ['final']),
    (x) => (x.jobGraph.detect = ['unknown']),
  ]) {
    const input = raw();
    change(input);
    assert.throws(() => normalizeRun(input));
  }
});

test('missing, unexpected, running and never acquired jobs stay unknown', () => {
  for (const change of [
    (x) => x.jobs.pop(),
    (x) => (x.jobGraph.extra = []),
    (x) => (x.jobs[1].runner_id = null),
    (x) => (x.jobs[1].completed_at = null),
    (x) => (x.run.status = 'in_progress'),
    (x) => (x.jobs[1].started_at = time(15)),
  ]) {
    const input = raw();
    change(input);
    const o = normalizeRun(input);
    assert.equal(o.complete, false);
    assert.equal(o.metrics.criticalPathMs, null);
    assert.equal(o.metrics.jobMinutes, null);
    assert.ok(o.missing.length);
  }
});

test('skipped jobs cost zero; failed and cancelled acquired jobs retain measured duration', () => {
  const input = raw();
  input.jobs[1].conclusion = 'failure';
  input.jobs[2].conclusion = 'cancelled';
  input.jobs[3].conclusion = 'skipped';
  input.jobs[3].runner_id = null;
  input.run.conclusion = 'failure';
  const o = normalizeRun(input);
  assert.equal(o.complete, true);
  assert.equal(o.jobs[1].durationMs, 30000);
  assert.equal(o.jobs[2].durationMs, 20000);
  assert.equal(o.jobs[3].durationMs, 0);
  assert.equal(o.identity.conclusion, 'failure');
});

test('main medians exclude failures, cancellations, partial, duplicate, future and incompatible baselines', () => {
  const o = sample();
  const good = baseline(o);
  const excluded = [
    'failure',
    'cancelled',
    'incomplete',
    'future',
    'incompatible',
    'invalid',
  ].map((kind, index) => {
    const value = baseline(o, 80 + index);
    if (['failure', 'cancelled'].includes(kind))
      value.identity.conclusion = kind;
    if (kind === 'incomplete') value.complete = false;
    if (kind === 'future') value.identity.createdAt = time(100);
    if (kind === 'incompatible') value.comparableKey = 'other';
    if (kind === 'invalid') value.metrics.jobMinutes = NaN;
    return value;
  });
  const result = mainMedians([good, good, ...excluded], o);
  assert.equal(result.included.length, 1);
  assert.equal(result.excluded.length, 7);
  assert.equal(result.jobs.a, 30000);
  assert.equal(mainMedians([], o).metrics.jobMinutes, null);
});

test('runner labels, skip pattern and DAG change comparability; input order does not', () => {
  const original = sample();
  const input = raw();
  input.jobs.reverse();
  assert.equal(normalizeRun(input).comparableKey, original.comparableKey);
  input.jobs[0].labels = ['macos-15'];
  assert.notEqual(normalizeRun(input).comparableKey, original.comparableKey);
});

test('only declared skipped matrices collapse to a literal GitHub job', () => {
  const input = raw();
  input.jobGraph = {
    detect: [],
    'pack / win': ['detect'],
    'pack / mac': ['detect'],
    final: ['pack / win', 'pack / mac'],
  };
  input.matrixGroups = {
    'pack / ${{ matrix.platform }}': ['pack / win', 'pack / mac'],
  };
  input.jobs = [
    input.jobs[0],
    {
      ...input.jobs[1],
      name: 'pack / ${{ matrix.platform }}',
      conclusion: 'skipped',
      runner_id: null,
    },
    input.jobs[3],
  ];
  assert.equal(normalizeRun(input).complete, true);
  assert.equal(normalizeRun({ ...input, matrixGroups: {} }).complete, false);
  input.jobs[1].conclusion = 'success';
  assert.equal(normalizeRun(input).complete, false);
});

test('baselines still executing when the PR was created are excluded', () => {
  const o = sample();
  const before = baseline(o);
  const concurrent = baseline(o, 98);
  concurrent.identity.completedAt = time(10);
  assert.equal(mainMedians([before, concurrent], o).included.length, 1);
});

test('an invalid baseline does not suppress a later valid copy of the same attempt', () => {
  const o = sample();
  const good = baseline(o);
  const invalid = structuredClone(good);
  invalid.metrics.jobMinutes = null;
  assert.equal(mainMedians([invalid, good], o).included.length, 1);
  const wrongRepository = structuredClone(good);
  wrongRepository.identity.repository = 'other/repo';
  assert.equal(mainMedians([wrongRepository], o).included.length, 0);
});

test('one-sample comparisons stay within noise and absent file evidence stays missing', () => {
  const o = sample();
  const current = testObservation({
    observation: o,
    framework: 'jest',
    complete: true,
    files: { equal: 12000, growth: 12001, newEqual: 20000, newSlow: 20001 },
  });
  const base = testObservation({
    observation: baseline(o),
    framework: 'jest',
    complete: true,
    files: { equal: 10000, growth: 10000 },
  });
  assert.deepEqual(
    compareTestFiles(current, [base]).breaches.map((x) => x.file),
    [],
  );
  assert.equal(
    compareTestFiles(current, [base]).files[0].status,
    'within noise',
  );
  assert.equal(compareTestFiles(current, [base]).files[2].status, 'missing');
  assert.equal(
    compareTestFiles(current, [{ ...base, complete: false }]).breaches.length,
    0,
  );
  assert.equal(compareTestFiles(current, []).complete, false);
  assert.equal(compareTestFiles(null, []).complete, false);
  assert.throws(() =>
    testObservation({
      observation: o,
      framework: 'jest',
      files: { '../escape': 10 },
    }),
  );
});

test('soft budgets distinguish breach, within and missing and render all measured jobs', () => {
  const observation = sample();
  const base = baseline(observation);
  const tests = testObservation({
    observation,
    framework: 'jest',
    complete: true,
    files: { file: 100 },
  });
  const testBase = { ...tests, identity: base.identity };
  const within = evaluateReport({
    observation,
    limits,
    baselines: [base],
    tests,
    testBaselines: [testBase],
  });
  assert.equal(within.status, 'within');
  assert.equal(within.complete, true);
  const breach = evaluateReport({
    observation,
    limits: { ...limits, jobsMs: { ...limits.jobsMs, detect: 9999 } },
  });
  assert.equal(breach.status, 'review');
  assert.equal(breach.breach, true);
  const missing = evaluateReport({ observation });
  assert.equal(missing.status, 'missing');
  assert.equal(missing.breach, false);
  const markdown = renderReport(within);
  for (const name of Object.keys(graph))
    assert.ok(markdown.includes(`| ${name} |`));
  assert.match(markdown, /queue wait/);
});

test('artifact boundary validates identity, file census, config hash and cache counts', () => {
  const envelope = observationEnvelope(sample());
  assert.equal(validateObservation(envelope), envelope);
  for (const change of [
    (x) => x.schemaVersion++,
    (x) => (x.observation.metrics.jobMinutes = -1),
    (x) => (x.observation.identity.headSha = 'wrong'),
    (x) => (x.cache = { availability: 'available', attempts: 1, hits: 2 }),
    (x) => (x.budgetConfigHash = 'wrong'),
    (x) => (x.budgetValues = { count: null }),
    (x) =>
      (x.tests = {
        ...testObservation({
          observation: x.observation,
          framework: 'jest',
          complete: false,
          files: {},
        }),
        complete: true,
      }),
    (x) => {
      x.tests = testObservation({
        observation: x.observation,
        framework: 'jest',
        files: { file: 1 },
      });
      x.tests.identity = { ...x.tests.identity, attempt: 2 };
    },
  ]) {
    const changed = structuredClone(envelope);
    change(changed);
    assert.throws(() => validateObservation(changed));
  }
});
