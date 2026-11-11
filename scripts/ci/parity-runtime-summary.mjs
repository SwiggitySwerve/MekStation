// Presentation only: gate.mjs decides pass/fail; counts come from port metadata.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const code = (value) =>
  `\`${String(value).replaceAll('`', '&#96;').replaceAll('\n', ' ').replaceAll('\r', ' ')}\``;

export function renderRuntimeSummary(report, summary, retrieval = {}) {
  // Early input failures produce only measure, exitCode, regressions and
  // failClosed. Preserve that diagnosis without inventing a population count.
  report = {
    unprotectedGains: [],
    unbaselined: [],
    removed: [],
    lastGreen: {
      status: 'not-used',
      detail: 'gate stopped before last-green comparison',
    },
    ...report,
  };
  if (!summary.gates || typeof summary.gates !== 'object')
    throw new Error('summary gates missing');
  const counts = [];
  for (const [key, gate] of Object.entries(summary.gates)) {
    if (gate.gated === false) continue;
    if (
      gate.gated !== true ||
      !['higher-is-better', 'lower-is-better'].includes(gate.direction)
    )
      throw new Error(`Unknown direction for gated count ${key}`);
    const value = key
      .split('.')
      .reduce((value, part) => value?.[part], summary);
    if (typeof value !== 'number' || !Number.isFinite(value))
      throw new Error(`Gated count ${key} must resolve to a number`);
    counts.push(`- ${code(key)}: ${value} (${gate.direction})`);
  }
  const lines = [
    `## Runtime parity: ${report.measure}`,
    '',
    `**${report.population?.overlap ?? 'unknown'} gated units · ${report.regressions.length} regressions · ${report.failClosed.length} fail-closed reasons · ${report.unbaselined.length} unbaselined · ${report.removed.length} removed**`,
    '',
    `Gate exit: ${report.exitCode}.`,
  ];
  const reason =
    report.lastGreen.status === 'stale'
      ? report.lastGreen.detail
      : (retrieval.reason ??
        report.lastGreen.detail ??
        'retrieval unavailable');
  lines.push(
    '',
    report.lastGreen.status === 'applied'
      ? `last green: ${code(retrieval.sha ?? 'unknown')}`
      : `last green: none (${reason})`,
  );
  lines.push(
    `Previous-nightly range (informational only): ${retrieval.sha ? code(retrieval.sha) : `none (${reason})`} → ${code(report.runSha ?? 'unknown')}`,
    '',
  );
  lines.push('### Regressions', '');
  for (const row of report.regressions.slice(0, 50))
    lines.push(
      `- ${code(row.unit)} / ${code(row.fact)} (${row.source}): ${row.why}`,
    );
  if (report.regressions.length > 50)
    lines.push(
      `- ${report.regressions.length - 50} more; see gate-units.ndjson.`,
    );
  if (!report.regressions.length) lines.push('None.');
  lines.push('', '### Fail-closed reasons', '');
  for (const row of report.failClosed)
    lines.push(`- ${code(row.reason)}: ${row.message}`);
  if (!report.failClosed.length) lines.push('None.');
  lines.push(
    '',
    `### Unprotected gains (${report.unprotectedGains.length})`,
    '',
  );
  for (const row of report.unprotectedGains)
    lines.push(`- ${code(row.unit)} / ${code(row.fact)}`);
  if (!report.unprotectedGains.length) lines.push('None.');
  lines.push('', `### Unbaselined (${report.unbaselined.length})`, '');
  for (const unit of report.unbaselined) lines.push(`- ${code(unit)}`);
  lines.push('', `### Removed (${report.removed.length})`, '');
  for (const unit of report.removed) lines.push(`- ${code(unit)}`);
  lines.push('', '### Census counts (informational only)', '', ...counts, '');
  return `${lines.join('\n')}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const { values } = parseArgs({
      options: { 'run-dir': { type: 'string' } },
    });
    const read = (name) =>
      JSON.parse(fs.readFileSync(path.join(values['run-dir'], name), 'utf8'));
    let retrieval = { reason: 'retrieval unavailable' };
    try {
      retrieval = read('previous/retrieval.json');
    } catch {
      /* Optional lookup may have failed before writing metadata. */
    }
    const text = renderRuntimeSummary(
      read('gate/gate-report.json'),
      read('summary.json'),
      retrieval,
    );
    if (process.env.GITHUB_STEP_SUMMARY)
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text);
    else process.stdout.write(text);
  } catch (error) {
    console.error(`Runtime parity summary wiring error: ${error.message}`);
    process.exitCode = 1;
  }
}
