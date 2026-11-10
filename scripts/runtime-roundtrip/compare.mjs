#!/usr/bin/env node
// Acceptance compare for the reopen port: rows from the port against a reference census of the same
// SHA (C3's postmerge-4db6eca2b/A-units.json: {runtimeSHA, units: [{unitId, sourcePath, loadBV,
// reopenBV, javaBV}]}), unit by unit. Load BV and reopen BV are compared exactly; the unit sets must
// be identical (a narrowed run says so with --subset and is then only checked in one direction).
//
//   node scripts/runtime-roundtrip/compare.mjs --rows <rows.ndjson> --ref <A-units.json> --out <dir>
//        [--receipt <receipt.json>] [--subset]
//
// Exit 1 on any differing or unmatched unit (and, with --require-same-sha, when the receipt's repo
// SHA is not the reference's runtimeSHA). Counts use the reference's javaBV so they are directly
// comparable with C3's.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import { sameTotal } from '../lib/runtime-parity/compare.mjs';
import { parseRows } from '../lib/runtime-parity/rows.mjs';

/** Join by the committed catalog path (the reference's `sourcePath`). */
export function compareToReference(rows, ref, { subset = false } = {}) {
  const byPath = new Map(ref.units.map((unit) => [unit.sourcePath, unit]));
  const seen = new Set();
  const differences = [];
  const summary = {
    portRows: rows.length,
    referenceRows: ref.units.length,
    matched: 0,
    identical: 0,
    differing: 0,
    portOnly: 0,
    referenceOnly: 0,
    subset,
    ours: { reopenEqualsLoad: 0, loadEqualsJava: 0, reopenEqualsJava: 0, nullReopen: 0 },
    reference: { reopenEqualsLoad: 0, loadEqualsJava: 0, reopenEqualsJava: 0, nullReopen: 0 },
  };
  const tally = (target, load, reopen, java) => {
    if (reopen === null || reopen === undefined) target.nullReopen++;
    if (sameTotal(reopen, load)) target.reopenEqualsLoad++;
    if (sameTotal(load, java)) target.loadEqualsJava++;
    if (sameTotal(reopen, java)) target.reopenEqualsJava++;
  };
  for (const row of rows) {
    const unit = byPath.get(row.catalog.path);
    if (!unit) {
      summary.portOnly++;
      differences.push({ unitId: row.unitId, catalogPath: row.catalog.path, field: 'unmatched', port: 'port-only', reference: null });
      continue;
    }
    seen.add(unit.sourcePath);
    summary.matched++;
    const load = row.status === 'ok' ? row.reopen.before.bv : null;
    const reopen = row.status === 'ok' ? row.reopen.after.bv : null;
    tally(summary.ours, load, reopen, unit.javaBV);
    tally(summary.reference, unit.loadBV, unit.reopenBV, unit.javaBV);
    let differs = false;
    for (const [field, port, theirs] of [
      ['unitId', row.unitId, unit.unitId],
      ['loadBV', load, unit.loadBV],
      ['reopenBV', reopen, unit.reopenBV],
    ])
      if (field === 'unitId' ? port !== theirs : !(port === null ? theirs === null : sameTotal(port, theirs))) {
        differs = true;
        differences.push({ unitId: row.unitId, catalogPath: row.catalog.path, field, port, reference: theirs });
      }
    if (differs) summary.differing++;
    else summary.identical++;
  }
  if (!subset)
    for (const unit of ref.units)
      if (!seen.has(unit.sourcePath)) {
        summary.referenceOnly++;
        differences.push({ unitId: unit.unitId, catalogPath: unit.sourcePath, field: 'unmatched', port: null, reference: 'reference-only' });
      }
  summary.equal = differences.length === 0;
  return { summary, differences };
}

export async function main(argv = process.argv.slice(2)) {
  const { values } = parseArgs({
    args: argv,
    options: {
      rows: { type: 'string' },
      ref: { type: 'string' },
      out: { type: 'string' },
      receipt: { type: 'string' },
      subset: { type: 'boolean', default: false },
      'require-same-sha': { type: 'boolean', default: false },
    },
  });
  if (!values.rows || !values.ref || !values.out) throw new Error('Required: --rows <rows.ndjson> --ref <A-units.json> --out <dir>');
  const ref = JSON.parse(fs.readFileSync(values.ref, 'utf8'));
  const rows = parseRows(fs.readFileSync(values.rows, 'utf8'));
  const { summary, differences } = compareToReference(rows, ref, { subset: values.subset });
  let code = summary.equal ? 0 : 1;
  if (values.receipt) {
    const receipt = JSON.parse(fs.readFileSync(values.receipt, 'utf8'));
    summary.sameRuntimeSha = receipt.repoSha === ref.runtimeSHA;
    summary.receiptSha = receipt.repoSha;
    summary.referenceSha = ref.runtimeSHA;
    summary.node = { version: receipt.node, platform: receipt.platform };
    // A port branch's HEAD is never the reference's SHA (it adds the port's own files), so this is
    // information unless asked for; product-tree identity is proved with `git diff <runtimeSHA> HEAD -- src public`.
    if (values['require-same-sha'] && !summary.sameRuntimeSha) code = 1;
  }
  fs.mkdirSync(values.out, { recursive: true });
  fs.writeFileSync(path.join(values.out, 'compare-summary.json'), JSON.stringify(summary, null, 2) + '\n');
  fs.writeFileSync(path.join(values.out, 'compare-differences.ndjson'), differences.map((d) => JSON.stringify(d) + '\n').join(''));
  console.log(JSON.stringify(summary));
  return code;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await main();
