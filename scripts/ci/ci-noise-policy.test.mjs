import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as statistics from '../lib/statistics.mjs';
import { normalizeRun } from './ci-metrics.mjs';
import { evaluateReport, renderReport } from './ci-report-evaluate.mjs';
import { compareTestFiles, testObservation } from './ci-test-metrics.mjs';

function observation(seconds = 60, runId = 100, prior = false) {
  const date = prior ? '2026-11-01' : '2026-11-02';
  const run = {
    id: runId,
    run_attempt: 1,
    workflow_id: 1,
    head_sha: 'a'.repeat(40),
    status: 'completed',
    conclusion: 'success',
    event: prior ? 'push' : 'pull_request',
    head_branch: prior ? 'main' : 'feature',
    created_at: `${date}T00:00:00Z`,
    run_started_at: `${date}T00:00:00Z`,
  };
  const jobs = [
    {
      id: runId,
      name: 'tests',
      run_id: runId,
      run_attempt: 1,
      head_sha: run.head_sha,
      status: 'completed',
      conclusion: 'success',
      runner_id: 1,
      labels: ['ubuntu-latest'],
      started_at: run.created_at,
      completed_at: new Date(
        Date.parse(run.created_at) + seconds * 1000,
      ).toISOString(),
    },
  ];
  return normalizeRun({
    repository: 'owner/repo',
    run,
    jobs,
    jobGraph: { tests: [] },
  });
}
const timings = (o, ms) =>
  testObservation({
    observation: o,
    framework: 'jest',
    complete: true,
    files: { file: ms },
  });
const bases = (values) =>
  values.map((ms, index) => timings(observation(60, index + 1, true), ms));
const limits = {
  jobsMs: { tests: 300000 },
  jobMinutes: 1.15,
  criticalPathMs: 69000,
};

test('p75 uses shared R7 interpolation and p50 preserves median', () => {
  assert.equal(typeof statistics.quantile, 'function');
  assert.equal(statistics.quantile([30, 0, 20, 10], 0.75), 22.5);
  assert.equal(
    statistics.quantile([30, 0, 20, 10], 0.5),
    statistics.median([30, 0, 20, 10]),
  );
  assert.equal(statistics.quantile([7], 0.75), 7);
  assert.ok(Number.isNaN(statistics.quantile([], 0.75)));
  assert.throws(() => statistics.quantile([1], -0.1));
  assert.throws(() => statistics.quantile([NaN], 0.75));
});

test('file signal needs five samples, strict 20 percent over p75 and at least 3 seconds', () => {
  const current = observation();
  for (const [values, ms, status] of [
    [[10000, 10000, 10000, 10000], 90000, 'within noise'],
    [[10000, 10000, 10000, 10000, 10000], 12999, 'within noise'],
    [[10000, 10000, 10000, 10000, 10000], 13000, 'growth'],
    [[5000, 10000, 10000, 15000, 20000], 18000, 'within noise'],
    [[5000, 10000, 10000, 15000, 20000], 18001, 'growth'],
    [[5000, 10000, 10000, 15000, 20000], 13000, 'within noise'],
  ])
    assert.equal(
      compareTestFiles(timings(current, ms), bases(values)).files[0].status,
      status,
    );
});

test('missing, malformed or absent file evidence is unavailable rather than noise', () => {
  const current = timings(observation(), 90000);
  assert.equal(compareTestFiles(current, []).files[0].status, 'missing');
  const invalid = bases([10000]);
  invalid[0].files.file = NaN;
  assert.equal(compareTestFiles(current, invalid).files[0].status, 'missing');
  const absent = bases([10000]);
  absent[0].files = { other: 1 };
  assert.equal(compareTestFiles(current, absent).files[0].status, 'missing');
});

test('file growth is informational and cannot label an otherwise healthy report', () => {
  const o = observation(),
    testBaselines = bases([10000, 10000, 10000, 10000, 10000]);
  const report = evaluateReport({
    observation: o,
    limits,
    baselines: testBaselines.map((t, i) => observation(60, i + 1, true)),
    tests: timings(o, 30000),
    testBaselines,
  });
  assert.equal(report.tests.files[0].status, 'growth');
  assert.equal(report.breach, false);
});

test('aggregate display-cap crossings do not label; strict p75 plus20percent does', () => {
  const baselines = Array.from({ length: 5 }, (_, i) =>
    observation(60, i + 1, true),
  );
  for (const [seconds, label] of [
    [70, false],
    [72, false],
    [72.001, true],
  ]) {
    const report = evaluateReport({
      observation: observation(seconds),
      baselines,
      limits,
    });
    assert.equal(report.breach, label);
  }
  assert.equal(
    evaluateReport({
      observation: observation(),
      limits: { jobsMs: { tests: 59999 } },
    }).breach,
    true,
  );
});

test('one comparable main sample makes slower aggregates informational, not review', () => {
  const report = evaluateReport({
    observation: observation(90),
    baselines: [observation(60, 1, true)],
    limits,
  });
  assert.equal(report.main.included.length, 1);
  assert.equal(report.breach, false);
  assert.equal(report.labelComplete, true);
  for (const row of report.rows.filter((r) => r.aggregate)) {
    assert.equal(row.informational, true);
    assert.equal(row.baselineSamples, 1);
    assert.equal(row.minimumBaselineSamples, 5);
    assert.equal(row.mainP75, row.name === 'Job-minutes' ? 1 : 60000);
  }
  assert.match(
    renderReport(report),
    /Job-minutes \(informational; 1\/5 main samples\)/,
  );
});

test('aggregate labels require five distinct valid samples; per-job budgets need no baseline', () => {
  for (const count of [0, 1, 4, 5]) {
    const baselines = Array.from({ length: count }, (_, i) =>
      observation(60, i + 1, true),
    );
    const report = evaluateReport({
      observation: observation(90),
      baselines,
      limits,
    });
    assert.equal(report.breach, count === 5, `sample count ${count}`);
    assert.equal(report.labelComplete, count > 0);
    if (!count) {
      assert.equal(report.rows.find((r) => r.aggregate).mainP75, null);
      assert.match(report.missing.join(), /main p75 unavailable/);
    }
    const jobBreach = evaluateReport({
      observation: observation(90),
      baselines,
      limits: { ...limits, jobsMs: { tests: 89999 } },
    });
    assert.equal(jobBreach.breach, true);
  }
  const four = Array.from({ length: 4 }, (_, i) =>
    observation(60, i + 1, true),
  );
  const failed = observation(60, 10, true);
  failed.identity.conclusion = 'failure';
  assert.equal(
    evaluateReport({
      observation: observation(90),
      baselines: [...four, four[0], failed],
      limits,
    }).breach,
    false,
  );
});

test('report explains all retained baseline exclusions using selector-owned reasons', () => {
  const good = observation(60, 1, true);
  const excluded = [
    'failure',
    'cancelled',
    'incomplete',
    'future',
    'incompatible',
    'invalid',
  ].map((kind, i) => {
    const value = observation(60, i + 2, true);
    if (['failure', 'cancelled'].includes(kind))
      value.identity.conclusion = kind;
    if (kind === 'incomplete') value.complete = false;
    if (kind === 'future') value.identity.completedAt = '2026-11-03T00:00:00Z';
    if (kind === 'incompatible') value.comparableKey = 'other';
    if (kind === 'invalid') value.metrics.jobMinutes = NaN;
    return value;
  });
  const report = evaluateReport({
    observation: observation(90),
    baselines: [good, good, ...excluded],
    limits,
  });
  const markdown = renderReport(report);
  assert.equal(report.main.excluded.length, 7);
  assert.match(
    markdown,
    /1 complete comparable successful pushes; 7 samples retained but excluded/,
  );
  for (const entry of report.main.excluded) {
    assert.ok(
      markdown.includes(
        `| ${entry.identity.runId} | ${entry.identity.attempt} | ${entry.identity.headSha} | ${entry.reason} |`,
      ),
    );
  }
});

test('invalid identity stays an explicit exclusion and unavailable baseline', () => {
  const report = evaluateReport({
    observation: observation(90),
    baselines: [null],
    limits,
  });
  const markdown = renderReport(report);
  assert.equal(report.breach, false);
  assert.equal(report.labelComplete, false);
  assert.match(
    markdown,
    /\| unknown \| unknown \| unknown \| invalid identity \|/,
  );
  assert.match(markdown, /main p75 unavailable/);
});

test('skipped matrix placeholder stays in census but not the presentation or missing budgets', () => {
  const o = observation();
  o.jobs.push({
    id: 200,
    name: 'Build Test / ${{ matrix.platform }}',
    conclusion: 'skipped',
    durationMs: 0,
    queueMs: 0,
    missing: [],
  });
  const report = evaluateReport({
    observation: o,
    baselines: [observation(60, 1, true)],
    limits,
  });
  assert.equal(report.observation.jobs.length, 2);
  assert.equal(renderReport(report).includes('Build Test /'), false);
  assert.equal(
    report.missing.some((reason) => reason.includes('matrix.platform')),
    false,
  );
});
