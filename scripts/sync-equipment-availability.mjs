#!/usr/bin/env node
/** Sync official catalog availability from pinned MegaMek; --check is read-only.
 * Optional --report=<path> writes complete coverage, changes, and identity gaps.
 * The pinned archive is cached in .cache/equipment-availability/<revision>.json.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { format } from 'oxfmt';

import { matchSource } from './equipment-availability/matching.mjs';
import {
  availabilityFor,
  loadSources,
  parseSources,
  revision,
  sourceRoot,
} from './equipment-availability/sources.mjs';

const root = new URL('./', import.meta.url);
const directory = new URL('../public/data/equipment/official/', root);
const index = JSON.parse(
  await readFile(new URL('index.json', directory), 'utf8'),
);
const formatOptions = JSON.parse(
  await readFile(new URL('../.oxfmtrc.json', root), 'utf8'),
);
const records = parseSources(await loadSources(root));
const report = {
  revision,
  total: 0,
  matched: 0,
  updated: [],
  missingDates: [],
  mismatches: [],
  sources: [],
  formatting: [],
};
for (const file of Object.values(index.files).flatMap((group) =>
  Object.values(group),
)) {
  const path = new URL(file, directory);
  const original = await readFile(path, 'utf8');
  const catalog = JSON.parse(original);
  for (const item of catalog.items) {
    report.total++;
    const result = matchSource(item, file, records);
    if (!result.source) {
      report.mismatches.push({ file, id: item.id, name: item.name, ...result });
      report.missingDates.push({ file, id: item.id, reason: result.reason });
      continue;
    }
    report.matched++;
    const source = result.source;
    const updates = availabilityFor(source, item);
    const provenance = {
      file,
      id: item.id,
      source: `${sourceRoot}${source.path}`,
      factory: source.key,
      advancements: source.advancements,
    };
    report.sources.push({ ...provenance, updates });
    if (!updates) {
      report.missingDates.push({
        ...provenance,
        reason: 'no source dates for tech base',
      });
      continue;
    }
    const before = Object.fromEntries(
      Object.keys(updates).map((key) => [key, item[key]]),
    );
    if (Object.keys(updates).some((key) => item[key] !== updates[key])) {
      report.updated.push({ ...provenance, before, after: updates });
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined) delete item[key];
        else item[key] = value;
      }
    }
  }
  const generated = await format(file, JSON.stringify(catalog), formatOptions);
  if (generated.errors.length)
    throw new Error(
      `Cannot format ${file}: ${JSON.stringify(generated.errors)}`,
    );
  if (generated.code !== original) {
    report.formatting.push(file);
    if (!process.argv.includes('--check'))
      await writeFile(path, generated.code);
  }
}
const reportPath = process.argv
  .find((argument) => argument.startsWith('--report='))
  ?.slice('--report='.length);
if (reportPath)
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(
  JSON.stringify({
    revision,
    total: report.total,
    matched: report.matched,
    updated: report.updated.length,
    missingDates: report.missingDates.length,
    mismatches: report.mismatches.length,
    formattedFiles: report.formatting.length,
  }),
);
if (
  process.argv.includes('--check') &&
  (report.updated.length || report.formatting.length)
) {
  throw new Error(
    'Equipment availability differs from pinned source; run without --check',
  );
}
