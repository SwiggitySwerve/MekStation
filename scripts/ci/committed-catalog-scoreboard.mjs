// Presentation of completed emitter/census evidence; never starts calculations.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import {
  compareText,
  readJson,
  sha256,
  verifySha256,
} from './parity-scoreboard-io.cjs';
import { readCensusResults } from './parity-scoreboard.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const catalogNames = readJson(
  path.join(directory, '../megameklab-conversion/catalog-families.json'),
);
const sourceFamily = (family) =>
  Object.entries(catalogNames).find(([, catalog]) => catalog === family)?.[0] ??
  family;
const escape = (value) => String(value).replace(/[|\r\n]/g, ' ');

export function renderCommittedCatalogSummary(report, result) {
  const objects = report.objectParity;
  if (
    !objects ||
    !Array.isArray(report.joins) ||
    !Array.isArray(objects.ledger)
  )
    throw new Error('Emitter object-parity evidence missing');
  const total = Object.values(objects.byFamily).reduce(
    (counts, family) => {
      for (const metric of ['rows', 'equal', 'drifted', 'unavailable'])
        counts[metric] += family[metric];
      return counts;
    },
    { rows: 0, equal: 0, drifted: 0, unavailable: 0 },
  );
  const personnel = [
    ...new Set(
      report.joins
        .filter(
          (join) =>
            join.sourceOnly || join.evaluation === 'identity-only/source-text',
        )
        .map((join) => join.family),
    ),
  ].sort();
  const figures = personnel.map(
    (family) => result?.bv?.families[sourceFamily(family)],
  );
  if (result && figures.some((figure) => !figure))
    throw new Error('Personnel numeric family missing from completed census');
  const exact = result
    ? figures.reduce((sum, figure) => sum + figure.exactTotals, 0)
    : null;
  const rows = result
    ? figures.reduce((sum, figure) => sum + figure.rows, 0)
    : null;
  const lines = [
    `Identity: joined=${report.joined}/${report.indexed}; aliases=${report.aliases}; unjoinable=${report.unjoinables.length}; errors=${report.errors.length}.`,
    `Object parity: ${objects.status}; equal=${total.equal}; drifted=${total.drifted}; unavailable=${total.unavailable}.`,
    result
      ? `Source-text numeric parity: exact=${exact}/${rows}; personnel only; runtime-path BV not measured in CI.`
      : 'Source-text numeric parity: not measured; no completed census supplied.',
    '',
    `Catalog commit: \`${escape(report.catalogCommit)}\`. Object drift is informational data.`,
    '',
    '| Family | Equal | Drifted | Unavailable | BV scope |',
    '| --- | ---: | ---: | ---: | --- |',
  ];
  for (const [family, counts] of Object.entries(objects.byFamily).sort(
    ([a], [b]) => compareText(a, b),
  )) {
    lines.push(
      `| ${escape(family)} | ${counts.equal} | ${counts.drifted} | ${counts.unavailable} | ${personnel.includes(family) ? 'BV from source text; runtime-path BV not measured in CI' : report.inputMode === 'committed-reference' ? 'Identity only; runtime-path BV not measured in CI' : 'Committed-object BV; BLK construction diagnostics still use source text'} |`,
    );
  }
  lines.push(
    '',
    'Known catalog-behind classes from Root’s ruling (historical classification; new differences require review):',
    '',
    '| Class | Fields | Owner | Direction | Measured commit |',
    '| --- | --- | --- | --- | --- |',
  );
  for (const item of objects.knownClasses)
    lines.push(
      `| ${escape(item.name)} | ${escape(item.fields)} | ${escape(item.owner)} | ${escape(item.direction)} | ${escape(item.measuredCommit)} |`,
    );
  lines.push(
    '',
    'Drift ledger (full values and explicit field presence are retained in the JSON report):',
    '',
    '| Family | Catalog file | Source | Fields |',
    '| --- | --- | --- | --- |',
  );
  for (const row of objects.ledger)
    lines.push(
      `| ${escape(row.family)} | ${escape(row.catalogFile)} | ${escape(row.path)} | ${row.fields.map((field) => escape(field.path)).join(', ')} |`,
    );
  return lines.join('\n') + '\n';
}

export function writeCommittedCatalogScoreboard(emitted, census) {
  const report = readJson(path.join(emitted, 'committed-catalog-report.json'));
  const receipt = readJson(path.join(emitted, 'sources.ndjson.manifest.json'));
  const bytes = fs.readFileSync(path.join(emitted, 'sources.ndjson'));
  verifySha256(bytes, receipt.sourcesSha256, 'Committed sources');
  if (
    report.errors.length ||
    JSON.stringify(report) !== JSON.stringify(receipt.committedCatalog)
  )
    throw new Error('Emitter report does not match successful receipt');
  let result;
  if (census) {
    if (report.inputMode === 'committed-reference')
      throw new Error(
        'Identity-only reference output cannot supply a numerical census',
      );
    const run = readJson(path.join(census, 'run-provenance.json'));
    if (
      !run.finished ||
      run.failure ||
      run.status === 'interrupted' ||
      run.head !== report.catalogCommit
    )
      throw new Error('Census is incomplete or belongs to another commit');
    if (run.sourcesSha256 !== sha256(bytes))
      throw new Error('Census did not evaluate these committed sources');
    result = readCensusResults(census, run);
  }
  const summary = renderCommittedCatalogSummary(report, result);
  fs.writeFileSync(path.join(emitted, 'committed-catalog-summary.md'), summary);
  return summary;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({
    options: { emitted: { type: 'string' }, census: { type: 'string' } },
  });
  if (!values.emitted)
    throw new Error('Required: --emitted <completed-emitter-directory>');
  process.stdout.write(
    writeCommittedCatalogScoreboard(values.emitted, values.census),
  );
}
