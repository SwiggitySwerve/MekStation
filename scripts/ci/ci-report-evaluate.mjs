// Soft timing budgets have no authority over test/workflow conclusions.
import { mainMedians } from './ci-metrics.mjs';
import { compareTestFiles } from './ci-test-metrics.mjs';

export const REPORT_MARKER = '<!-- mekstation-ci-budget-report:v1 -->';
export const REVIEW_LABEL = 'ci-budget-review';

export function evaluateReport({
  observation,
  baselines = [],
  limits = {},
  tests,
  testBaselines = [],
}) {
  const main = mainMedians(baselines, observation);
  const missing = [...observation.missing];
  const rows = [];
  function row(name, value, budget, baseline, unit) {
    const known = Number.isFinite(value) && value >= 0;
    const validBudget = Number.isFinite(budget) && budget > 0;
    if (!known) missing.push(`${name}: measurement unavailable`);
    if (!validBudget) missing.push(`${name}: budget unavailable`);
    rows.push({
      name,
      value: known ? value : null,
      budget: validBudget ? budget : null,
      mainMedian: baseline ?? null,
      unit,
      breach: known && validBudget && value > budget,
    });
  }
  for (const job of observation.jobs)
    row(
      job.name,
      job.durationMs,
      limits.jobsMs?.[job.name],
      main.jobs[job.name],
      'ms',
    );
  row(
    'Job-minutes',
    observation.metrics.jobMinutes,
    limits.jobMinutes,
    main.metrics.jobMinutes,
    'minutes',
  );
  row(
    'Critical path (execution)',
    observation.metrics.criticalPathMs,
    limits.criticalPathMs,
    main.metrics.criticalPathMs,
    'ms',
  );
  const testComparison = compareTestFiles(tests, testBaselines);
  missing.push(...testComparison.missing);
  if (!main.included.length)
    missing.push('Comparable successful main timing baseline unavailable');
  const breaches = rows.filter((item) => item.breach);
  const breach = breaches.length > 0 || testComparison.breaches.length > 0;
  return {
    schemaVersion: 1,
    identity: observation.identity,
    observation,
    main,
    rows,
    tests: testComparison,
    breach,
    complete: missing.length === 0,
    status: breach ? 'review' : missing.length ? 'missing' : 'within',
    missing,
  };
}

const cell = (value) =>
  String(value)
    .replaceAll('|', '\\|')
    .replace(/[\r\n]/g, ' ')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
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
    '| Job / metric | Measured | Budget | Main median |',
    '| --- | ---: | ---: | ---: |',
    ...report.rows.map(
      (row) =>
        `| ${cell(row.name)}${row.breach ? ' (review)' : ''} | ${measured(row.value, row.unit)} | ${measured(row.budget, row.unit)} | ${measured(row.mainMedian, row.unit)} |`,
    ),
    '',
    `Elapsed since attempt start: ${measured(report.observation.metrics.elapsedMs, 'ms')}; total job queue wait: ${measured(report.observation.metrics.queueMs, 'ms')}.`,
    'Job-minutes sum acquired job execution; queue wait is excluded. Critical path is the longest dependency chain of execution durations, excluding queue wait.',
    '',
    `Main baseline: ${report.main.included.length} complete comparable successful pushes; ${report.main.excluded.length} samples retained but excluded.`,
  ];
  if (report.tests.files.length)
    lines.push(
      '',
      '| Test file | Duration | Main median | Result |',
      '| --- | ---: | ---: | --- |',
      ...report.tests.files.map(
        (row) =>
          `| ${cell(row.file)} | ${measured(row.durationMs, 'ms')} | ${measured(row.baselineMs, 'ms')} | ${row.status} |`,
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
