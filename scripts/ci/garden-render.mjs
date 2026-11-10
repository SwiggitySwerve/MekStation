import { GARDEN_MARKER } from './garden-publish.mjs';

const cell = (value) =>
  String(value)
    .replace(/[|`<>\r\n]/g, ' ')
    .replace(/@/g, '\\@');
const number = (value) =>
  value === null || value === undefined
    ? 'unknown'
    : Number(value.toFixed(2)).toLocaleString('en-US');
const percent = (value) =>
  value === null ? 'unknown' : `${number(value * 100)}%`;
const table = (headers, rows) =>
  [
    headers.join(' | '),
    headers.map(() => '---').join(' | '),
    ...rows.map((row) => row.map(cell).join(' | ')),
  ].join('\n');

export function renderGarden(report, { contributors = null } = {}) {
  const text = [
    GARDEN_MARKER,
    '# CI garden',
    '',
    `Window: ${report.start} through ${report.end} (end exclusive; seven complete UTC days).`,
    `${report.observations} complete comparable main observations; ${report.baselineObservations} in the previous week.`,
    `Comparison regime: ${report.comparableKey ?? 'unknown'}.`,
    '',
    '## Seven-day medians',
    '',
    table(
      ['Metric', 'This week', 'Previous week'],
      Object.entries(report.metrics).map(([name, values]) => [
        name,
        number(values.median),
        number(values.previousMedian),
      ]),
    ),
    '',
    '## Main job investigations',
    '',
    'Only upward main trends are investigated. Within-budget increases are informational and do not establish regression or cause. PR outliers stay in their own budget comments.',
    report.investigations?.length
      ? table(
          [
            'Job',
            'Main median seconds',
            'Prior main median seconds',
            'Budget seconds',
            'Investigation',
          ],
          report.investigations.map((row) => [
            row.name,
            number(row.measuredMs / 1000),
            number(row.baselineMs / 1000),
            number(row.budgetMs === null ? null : row.budgetMs / 1000),
            row.withinBudget === null
              ? 'budget unavailable'
              : row.withinBudget
                ? 'within budget'
                : 'over budget',
          ]),
        )
      : 'No qualifying upward main trend; unavailable comparisons cannot establish a trend.',
    '',
    '## Ten slowest test files',
    '',
    report.slowest.length
      ? table(
          ['File', 'Median ms', 'Main baseline p75 ms', 'Result', 'Samples'],
          report.slowest.map((row) => [
            row.file,
            number(row.durationMs),
            number(row.baselineP75Ms ?? null),
            row.status,
            row.samples,
          ]),
        )
      : 'Unknown: executed test timing census unavailable.',
    '',
    '## Ten largest informational test-file increases',
    '',
    report.growth.length
      ? table(
          ['File', 'Median ms', 'Main baseline p75 ms', 'Growth over p75'],
          report.growth.map((row) => [
            row.file,
            number(row.durationMs),
            number(row.baselineP75Ms ?? null),
            percent(row.growth),
          ]),
        )
      : 'No measured increases with a comparable baseline. Unavailable baselines remain unknown.',
    ...report.testMissing.map((reason) => `- ${cell(reason)}`),
    '',
    '## Package contributors',
    '',
    contributors?.length
      ? table(
          ['Member', 'Median bytes', 'Previous median bytes', 'Source runs'],
          contributors.map((row) => [
            row.path,
            number(row.bytes),
            number(row.previousBytes),
            row.runIds.join(', '),
          ]),
        )
      : 'Unknown: complete package member census unavailable.',
    '',
    '## Cache hit rate',
    '',
    `${percent(report.cache.hitRate)} (${report.cache.hits}/${report.cache.attempts} measured attempts; coverage ${report.cache.observations}/${report.cache.totalObservations} observations). Missing attempts are unknown.`,
    '',
    '## Associated PRs',
    '',
    'These PRs are associated with source commits by GitHub. Association does not establish that a PR caused a change.',
    report.associations.length
      ? report.associations
          .map((pr) => `- [#${pr.number}](${pr.url})`)
          .join('\n')
      : 'Unknown: no source PR association evidence.',
    '',
    '## Enforced baselines and tracked targets',
    '',
    'Enforced caps and configured gaps are policy values. Observed medians and their gaps remain unknown without canonical telemetry. A configured baseline is not a measured seven-day result.',
    report.targetGaps?.length
      ? table(
          [
            'Budget',
            'Enforced cap',
            'Target',
            'Configured gap',
            'Observed median',
            'Observed gap',
            'Unit',
          ],
          report.targetGaps.map((row) => [
            row.id,
            number(row.enforced),
            number(row.target),
            number(row.configuredGap),
            number(row.observed),
            number(row.gapToTarget),
            row.unit,
          ]),
        )
      : 'Unknown: target policy projection unavailable.',
    '',
    '## Budget ratchet',
    '',
    'Eligibility requires at least three distinct complete comparable main runs per UTC day, the current budget digest, and more than 15% daily median headroom for seven full days. A proposed limit also retains 15% headroom above the largest observed value. Malformed or missing telemetry cannot authorize a proposal.',
    table(
      ['Budget', 'Proposal', 'Evidence'],
      report.ratchet.map((row) => [
        row.id,
        row.eligible ? row.value : 'none',
        row.reason,
      ]),
    ),
    '',
    '## Excluded and rejected evidence',
    '',
    `${report.excluded.length} observations excluded by the canonical comparator; ${report.rejected.length} collection or validation diagnostics.`,
    ...report.excluded.map(
      (row) =>
        `- ${cell(row.identity?.runId ?? 'unknown run')}: ${cell(row.reason)}`,
    ),
    ...report.rejected.map((reason) => `- ${cell(reason)}`),
  ];
  const body = `${text.join('\n')}\n`;
  if (body.length > 60000)
    return `${body.slice(0, 58000)}\n\nAdvisory report truncated for GitHub publication. Full evidence remains in the ci-garden-prepared artifact (weekly.json).\n`;
  return body;
}
