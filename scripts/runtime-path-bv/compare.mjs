#!/usr/bin/env node
// Compare tool for the load port. Two jobs, both reading rows from both sides:
//
//   acceptance  --rows <port rows.ndjson> --scratch <C3 scratch rows.jsonl>
//               proves the port's per-unit output equals the scratch harness's on the same SHA,
//               unit by unit (BV exactly; terms with C1's tolerance; validity; issue sequence),
//               and lists every differing or unmatched unit. Weight and MP are not in the scratch
//               load rows, so they are reported as not comparable rather than skipped silently.
//   --java-terms  term-wise against the committed Java reference with C1's mapping
//               (parity-0c/compare/compare-family.cjs): raw keys, no folding, absent counted.
//
// Exit 1 when acceptance finds any difference or unmatched unit. Rules live in
// scripts/lib/runtime-parity/compare.mjs (one owner, shared with the reopen port).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import {
  compareTermsToJava,
  diffTerms,
  issueSignature,
  sameSequence,
  sameTotal,
} from '../lib/runtime-parity/compare.mjs';
import { parseRows } from '../lib/runtime-parity/rows.mjs';
import { loadReference } from './run.mjs';

const defaultRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const readLines = (file) =>
  fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
const key = (path_, sha) => `${path_}\0${sha}`;

/** What the scratch row says the status bar produced, in the port's vocabulary. */
function scratchView(record) {
  const ok =
    record.loadStatus === 'loaded' &&
    record.validationStatus === 'available' &&
    Number.isFinite(record.bv);
  return {
    ok,
    bv: ok && record.bvStatus === 'available' ? record.bv : null,
    validity: record.validity,
    terms: record.terms ?? {},
    issues: record.validationIssues ?? [],
  };
}

/** Port rows against scratch records. Returns counts and every difference, with unmatched units on both sides. */
export function compareToScratch(rows, scratchRecords) {
  const scratch = new Map(
    scratchRecords.map((record) => [
      key(record.sourcePath, record.sourceSHA256),
      record,
    ]),
  );
  const seen = new Set();
  const differences = [];
  const summary = {
    portRows: rows.length,
    scratchRows: scratchRecords.length,
    matched: 0,
    identical: 0,
    differing: 0,
    portOnly: 0,
    scratchOnly: 0,
    notComparable: ['weight', 'allocatedWeight', 'mp'],
    differingByField: {},
  };
  const note = (row, field, port, scratchValue) => {
    differences.push({
      family: row.family,
      unitId: row.unitId,
      path: row.path,
      field,
      port,
      scratch: scratchValue,
    });
    summary.differingByField[field] =
      (summary.differingByField[field] ?? 0) + 1;
  };
  for (const row of rows) {
    const record = scratch.get(key(row.path, row.sha256));
    if (!record) {
      summary.portOnly++;
      note(row, 'unmatched', 'port-only', null);
      continue;
    }
    seen.add(key(row.path, row.sha256));
    summary.matched++;
    const before = differences.length;
    const theirs = scratchView(record);
    if (record.unitId !== row.unitId)
      note(row, 'unitId', row.unitId, record.unitId);
    if ((row.status === 'ok') !== theirs.ok)
      note(row, 'status', row.status, theirs.ok ? 'ok' : 'error');
    else if (row.status === 'ok') {
      const mine = row.load;
      if (
        !(mine.observed.bv === null
          ? theirs.bv === null
          : sameTotal(mine.observed.bv, theirs.bv))
      )
        note(row, 'bv', mine.observed.bv, theirs.bv);
      if (mine.observed.validity !== theirs.validity)
        note(row, 'validity', mine.observed.validity, theirs.validity);
      for (const diff of diffTerms(mine.terms, theirs.terms))
        note(row, `term:${diff.key}`, diff.a, diff.b);
      if (
        !sameSequence(
          issueSignature(mine.issues),
          issueSignature(theirs.issues),
        )
      )
        note(
          row,
          'issues',
          issueSignature(mine.issues),
          issueSignature(theirs.issues),
        );
    }
    if (differences.length === before) summary.identical++;
    else summary.differing++;
  }
  for (const record of scratchRecords)
    if (!seen.has(key(record.sourcePath, record.sourceSHA256))) {
      summary.scratchOnly++;
      differences.push({
        family: record.family,
        unitId: record.unitId,
        path: record.sourcePath,
        field: 'unmatched',
        port: null,
        scratch: 'scratch-only',
      });
    }
  summary.equal = differences.length === 0;
  return { summary, differences };
}

/** Term-wise against Java over the port's ok rows (C1's raw-key mapping). Error rows have no terms and are counted. */
export function javaTermReport(rows, referenceByPath) {
  const total = {
    units: rows.length,
    withTerms: 0,
    noTerms: 0,
    javaKeys: 0,
    equal: 0,
    unequal: 0,
    absent: 0,
    absentByCategory: {},
    unitsAllJavaTermsEqual: 0,
  };
  const unequalTerms = [];
  for (const row of rows) {
    const javaTerms = referenceByPath.get(row.path)?.battleValue?.terms;
    if (
      row.status !== 'ok' ||
      !Object.keys(row.load.terms).length ||
      !javaTerms
    ) {
      total.noTerms++;
      continue;
    }
    total.withTerms++;
    const result = compareTermsToJava(row.load.terms, javaTerms);
    total.javaKeys += result.javaKeys;
    total.equal += result.equal;
    total.unequal += result.unequal;
    total.absent += result.absent;
    for (const [category, count] of Object.entries(result.absentByCategory))
      total.absentByCategory[category] =
        (total.absentByCategory[category] ?? 0) + count;
    if (result.unequal === 0 && result.absent === 0)
      total.unitsAllJavaTermsEqual++;
    for (const term of result.unequalTerms)
      unequalTerms.push({
        family: row.family,
        unitId: row.unitId,
        path: row.path,
        ...term,
      });
  }
  return { summary: total, unequalTerms };
}

export async function main(argv = process.argv.slice(2), deps = {}) {
  const { values } = parseArgs({
    args: argv,
    options: {
      rows: { type: 'string' },
      scratch: { type: 'string' },
      out: { type: 'string' },
      'java-terms': { type: 'boolean', default: false },
    },
  });
  if (!values.rows || !values.out || (!values.scratch && !values['java-terms']))
    throw new Error(
      'Required: --rows <rows.ndjson> --out <dir> and --scratch <file> and/or --java-terms',
    );
  const rows = parseRows(fs.readFileSync(values.rows, 'utf8'));
  fs.mkdirSync(values.out, { recursive: true });
  const report = {};
  let code = 0;
  if (values.scratch) {
    const { summary, differences } = compareToScratch(
      rows,
      readLines(values.scratch),
    );
    report.acceptance = summary;
    fs.writeFileSync(
      path.join(values.out, 'compare-differences.ndjson'),
      differences.map((d) => JSON.stringify(d) + '\n').join(''),
    );
    if (!summary.equal) code = 1;
  }
  if (values['java-terms']) {
    const reference = (deps.loadReference ?? loadReference)(
      deps.repoRoot ?? defaultRoot,
      path.join(values.out, 'work'),
    );
    const { summary, unequalTerms } = javaTermReport(
      rows,
      new Map(reference.rows.map((row) => [row.path, row])),
    );
    report.javaTerms = summary;
    fs.writeFileSync(
      path.join(values.out, 'java-term-differences.ndjson'),
      unequalTerms.map((d) => JSON.stringify(d) + '\n').join(''),
    );
  }
  fs.writeFileSync(
    path.join(values.out, 'compare-summary.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(JSON.stringify(report));
  return code;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  process.exitCode = await main();
