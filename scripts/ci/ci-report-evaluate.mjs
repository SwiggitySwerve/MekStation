// Soft timing budgets have no authority over test/workflow conclusions.
import { median } from '../lib/statistics.mjs';
import { PACKAGE_METRIC_IDS, packageMetricValues } from './budget-config.mjs';
import {
  mainMedians,
  TIMING_GROWTH_RATIO,
  MIN_TIMING_MAIN_SAMPLES,
} from './ci-metrics.mjs';
import { compareTestFiles } from './ci-test-metrics.mjs';
import { markdownCell as cell } from './markdown.mjs';

export const REPORT_MARKER = '<!-- mekstation-ci-budget-report:v1 -->';
export const REVIEW_LABEL = 'ci-budget-review';

export function evaluateReport({
  observation,
  baselines = [],
  limits = {},
  tests,
  testBaselines = [],
  packages = null,
  packageBaselines = [],
  workflowProfiles = [],
}) {
  const main = mainMedians(baselines, observation);
  const missing = [...observation.missing];
  const rows = [];
  function row(
    name,
    value,
    budget,
    baseline,
    mainP75,
    unit,
    aggregate = false,
  ) {
    const known = Number.isFinite(value) && value >= 0;
    const validBudget = Number.isFinite(budget) && budget > 0;
    if (!known) missing.push(`${name}: measurement unavailable`);
    if (!validBudget) missing.push(`${name}: budget unavailable`);
    const validP75 = Number.isFinite(mainP75) && mainP75 >= 0;
    const informational =
      aggregate && main.included.length < MIN_TIMING_MAIN_SAMPLES;
    if (aggregate && !validP75) missing.push(`${name}: main p75 unavailable`);
    rows.push({
      name,
      value: known ? value : null,
      budget: validBudget ? budget : null,
      mainMedian: baseline ?? null,
      mainP75: validP75 ? mainP75 : null,
      unit,
      aggregate,
      ...(aggregate
        ? {
            informational,
            baselineSamples: main.included.length,
            minimumBaselineSamples: MIN_TIMING_MAIN_SAMPLES,
          }
        : {}),
      budgetBreach: known && validBudget && value > budget,
      breach: aggregate
        ? !informational &&
          known &&
          validP75 &&
          value > mainP75 * TIMING_GROWTH_RATIO
        : known && validBudget && value > budget,
      investigate:
        !aggregate &&
        known &&
        Number.isFinite(baseline) &&
        baseline > 0 &&
        value > baseline * TIMING_GROWTH_RATIO,
    });
  }
  for (const job of observation.jobs) {
    if (job.conclusion === 'skipped' && job.name.includes('${{')) continue;
    row(
      job.name,
      job.durationMs,
      limits.jobsMs?.[job.name],
      main.jobs[job.name],
      main.p75.jobs[job.name],
      'ms',
    );
  }
  row(
    'Job-minutes',
    observation.metrics.jobMinutes,
    limits.jobMinutes,
    main.metrics.jobMinutes,
    main.p75.metrics.jobMinutes,
    'minutes',
    true,
  );
  row(
    'Critical path (execution)',
    observation.metrics.criticalPathMs,
    limits.criticalPathMs,
    main.metrics.criticalPathMs,
    main.p75.metrics.criticalPathMs,
    'ms',
    true,
  );
  const testComparison = compareTestFiles(tests, testBaselines);
  missing.push(...testComparison.missing);
  if (!main.included.length)
    missing.push('Comparable successful main timing baseline unavailable');
  const breaches = rows.filter((item) => item.breach);
  const breach = breaches.length > 0;
  const labelComplete =
    observation.complete &&
    rows.every(
      (item) =>
        item.value !== null &&
        (item.aggregate ? item.mainP75 !== null : item.budget !== null),
    );
  return {
    schemaVersion: 1,
    identity: observation.identity,
    observation,
    main,
    rows,
    packages: packageRows(packages, packageBaselines, main.included),
    workflowProfiles,
    tests: testComparison,
    breach,
    labelComplete,
    complete: missing.length === 0,
    status: breach ? 'review' : missing.length ? 'missing' : 'within',
    missing,
  };
}

/** Byte trends do not participate in verdicts, labels, approvals or ratchets. */
function packageRows(packages, baselines, included) {
  const key = (identity) =>
    `${identity.runId}/${identity.attempt}/${identity.headSha}`;
  const allowed = new Set(included.map(key));
  const read = (all, kind) => {
    try {
      const metrics = all?.[kind]?.metrics ?? all?.[kind];
      return metrics ? packageMetricValues({ ...metrics, kind }) : {};
    } catch {
      return {}; // Invalid advisory telemetry remains explicitly unavailable.
    }
  };
  return Object.entries(PACKAGE_METRIC_IDS).flatMap(([kind, ids]) => {
    const current = read(packages, kind);
    return ids.map((id) => {
      const samples = baselines
        .filter((entry) => allowed.has(key(entry.observation.identity)))
        .map((entry) => ({
          identity: entry.observation.identity,
          value: read(entry.packages, kind)[id],
        }))
        .filter((entry) => Number.isSafeInteger(entry.value));
      const mainMedian = samples.length
        ? median(samples.map((entry) => entry.value))
        : null;
      const value = current[id] ?? null;
      return {
        id,
        value,
        mainMedian,
        deltaBytes:
          value === null || mainMedian === null ? null : value - mainMedian,
        sources: samples.map(({ identity }) => identity),
      };
    });
  });
}

const measured = (value, unit) =>
  value === null
    ? 'missing'
    : unit === 'ms'
      ? `${(value / 1000).toFixed(2)}s`
      : `${value.toFixed(2)}min`;

export function renderReport(report) {
  const id = report.identity;
  const lines = [
    REPORT_MARKER,
    `<!-- source:${id.runId}:${id.attempt}:${id.headSha} -->`,
    `CI budget report: **${report.status}**. Advisory; test conclusions are unchanged.`,
    '',
    `Run [${id.runId}, attempt ${id.attempt}](https://github.com/${id.repository}/actions/runs/${id.runId}/attempts/${id.attempt}), head \`${id.headSha}\`.`,
    '',
    '| Job / metric | Measured | Budget | Main median | Main p75 |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...report.rows.map(
      (row) =>
        `| ${cell(row.name)}${row.informational ? ` (informational; ${row.baselineSamples}/${row.minimumBaselineSamples} main samples)` : row.breach ? ' (review)' : row.budgetBreach ? ' (over display cap)' : row.investigate ? (row.budget === null ? ' (investigate; budget unavailable)' : ' (investigate; within budget)') : ''} | ${measured(row.value, row.unit)} | ${measured(row.budget, row.unit)} | ${measured(row.mainMedian, row.unit)} | ${measured(row.mainP75, row.unit)} |`,
    ),
    '',
    `Elapsed since attempt start: ${measured(report.observation.metrics.elapsedMs, 'ms')}; total job queue wait: ${measured(report.observation.metrics.queueMs, 'ms')}.`,
    'Job-minutes sum acquired job execution; queue wait is excluded. Critical path is the longest dependency chain of execution durations, excluding queue wait.',
    '',
    `Main baseline: ${report.main.included.length} complete comparable successful pushes; ${report.main.excluded.length} samples retained but excluded.`,
    `Review labels use per-job budget breaches or aggregate timings more than 20% over main p75 with at least ${MIN_TIMING_MAIN_SAMPLES} comparable main samples. Below that count, aggregates are informational. Aggregate display caps and test-file growth are informational. Investigations do not establish regression or cause.`,
  ];
  if (report.workflowProfiles?.length) {
    lines.push(
      '',
      '<details>',
      '<summary>Workflows outside each typical PR profile (not charged to typicalPrJobs)</summary>',
      '',
      '| Profile | Workflow | File | Event | Types (all when omitted) |',
      '| --- | --- | --- | --- | --- |',
      ...report.workflowProfiles.flatMap((profile) =>
        (profile.otherEvents ?? []).flatMap((workflow) =>
          workflow.events.map(
            (event) =>
              `| ${cell(profile.id)} | ${cell(workflow.name ?? workflow.file)} | ${cell(workflow.file)} | ${cell(event)} | ${cell(workflow.types?.[event]?.join(', ') ?? 'all')} |`,
          ),
        ),
      ),
      '',
      '</details>',
    );
  }
  if (report.packages?.length) {
    const bytes = (value) => (value === null ? 'unavailable' : `${value} B`);
    lines.push(
      '',
      'Package bytes (advisory; no size limits or approval requirements):',
      '| Metric | Measured | Main median | Signed delta | Baseline run/attempt/head |',
      '| --- | ---: | ---: | ---: | --- |',
      ...report.packages.map(
        (row) =>
          `| ${cell(row.id)} | ${bytes(row.value)} | ${bytes(row.mainMedian)} | ${row.deltaBytes === null ? 'unavailable' : `${row.deltaBytes >= 0 ? '+' : ''}${row.deltaBytes} B`} | ${row.sources.length ? row.sources.map((id) => `${id.runId}/${id.attempt}/\`${id.headSha}\``).join(', ') : 'unavailable'} |`,
      ),
    );
  }
  if (report.main.excluded.length)
    lines.push(
      '',
      '<details>',
      '<summary>Excluded main timing samples</summary>',
      '',
      '| Run | Attempt | Head | Exclusion reason |',
      '| --- | ---: | --- | --- |',
      ...report.main.excluded.map(
        ({ identity, reason }) =>
          `| ${cell(identity?.runId ?? 'unknown')} | ${cell(identity?.attempt ?? 'unknown')} | ${cell(identity?.headSha ?? 'unknown')} | ${cell(reason)} |`,
      ),
      '',
      '`not comparable` means the repository/workflow identity or normalized DAG, runner labels, job census or skip pattern differs. Selection and timing arithmetic are unchanged.',
      '</details>',
    );
  if (report.tests.files.length)
    lines.push(
      '',
      `Test-file growth requires >20% over main p75, at least 3 seconds increase and at least ${MIN_TIMING_MAIN_SAMPLES} main samples. Other valid comparisons are within noise; unavailable evidence stays missing.`,
      '| Test file | Duration | Main p75 | Main samples | Result (informational) |',
      '| --- | ---: | ---: | ---: | --- |',
      ...report.tests.files.map(
        (row) =>
          `| ${cell(row.file)} | ${measured(row.durationMs, 'ms')} | ${measured(row.baselineP75Ms ?? null, 'ms')} | ${row.baselineSamples ?? 0} | ${row.status} |`,
      ),
    );
  if (report.missing.length)
    lines.push(
      '',
      'Missing data:',
      ...[...new Set(report.missing)].map((item) => `- ${cell(item)}`),
    );
  return `${lines.join('\n')}\n`;
}

/** Main-only garden investigations; policy selection remains with its caller. */
export function jobInvestigations(current, baselines, limits = {}) {
  const names = [
    ...new Set(current.flatMap((o) => o.jobs?.map((j) => j.name) ?? [])),
  ];
  const values = (samples, name) =>
    samples
      .map((o) => o.jobs?.find((j) => j.name === name)?.durationMs)
      .filter((value) => Number.isFinite(value) && value >= 0);
  return names.flatMap((name) => {
    const observed = values(current, name),
      before = values(baselines, name);
    if (!observed.length || !before.length) return [];
    const measuredMs = median(observed),
      baselineMs = median(before);
    if (baselineMs <= 0 || measuredMs <= baselineMs * TIMING_GROWTH_RATIO)
      return [];
    const budgetMs =
      Number.isFinite(limits.jobsMs?.[name]) && limits.jobsMs[name] > 0
        ? limits.jobsMs[name]
        : null;
    return [
      {
        name,
        measuredMs,
        baselineMs,
        budgetMs,
        samples: observed.length,
        withinBudget: budgetMs === null ? null : measuredMs <= budgetMs,
        status: 'investigate',
        sourceRuns: current.map((o) => o.identity),
      },
    ];
  });
}
