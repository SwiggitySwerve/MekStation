import { markdownCell } from './markdown.mjs';

const cell = (value) => markdownCell(value ?? '');

/** A durable summary distinguishes policy outcomes from incomplete work. */
export async function writeReconciliationSummary(core, report) {
  const lines = [
    '## Budget reconciliation',
    '',
    `Requests used: ${report.requestsUsed}.`,
    `Stop reason: ${cell(report.stopReason ?? 'bucket complete')}.`,
    '',
    '### PRs evaluated',
    '',
  ];
  if (!report.evaluated.length) lines.push('Nothing was evaluated.');
  else {
    lines.push('| PR | Head | Outcome |', '| --- | --- | --- |');
    for (const row of report.evaluated)
      lines.push(
        `| #${row.number} | ${cell(row.head)} | ${cell(row.outcome)} |`,
      );
  }
  lines.push(
    '',
    '### Statuses written (before → after)',
    '',
    '| PR | Head | Context | Transition | Verification |',
    '| --- | --- | --- | --- | --- |',
  );
  const written = report.writes.filter((write) => write.acknowledged);
  for (const row of written)
    lines.push(
      `| #${row.number} | ${cell(row.sha)} | ${cell(row.context)} | ${cell(row.before)} → ${cell(row.after)} | ${row.verified ? (row.supersededBy ? `verified; superseded by ${cell(row.supersededBy)}` : row.corrected ? 'corrected and verified' : 'verified') : cell(row.problem ?? 'unverified')} |`,
    );
  if (!written.length) lines.push('| — | — | — | No statuses written | — |');
  lines.push('', '### PRs unreached', '', '| PR | Reason |', '| --- | --- |');
  for (const row of report.unreachedReasons)
    lines.push(`| #${row.number} | ${cell(row.reason)} |`);
  if (!report.unreachedReasons.length) lines.push('| — | None |');
  if (report.censusIncomplete)
    lines.push(
      '',
      'PR census unavailable or incomplete; additional unlisted PRs may remain.',
    );
  try {
    await core.summary.addRaw(`${lines.join('\n')}\n`).write();
  } catch (error) {
    core.info(`Unable to write reconciliation summary: ${error.message}`);
  }
}
