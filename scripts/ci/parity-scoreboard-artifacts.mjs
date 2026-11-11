// Public census artifact inventory and byte-level serialization helpers.
import fs from 'node:fs';
import path from 'node:path';

import io from './parity-scoreboard-io.cjs';
export const { readJson, readRows, sha256, verifySha256 } = io;

export const ROW_FILES = [
  'delta-rows.jsonl',
  'construction-validity-rows.jsonl',
  'construction-weight-rows.jsonl',
  'construction-quantity-rows.jsonl',
];
export const REPORT_FILES = [
  'delta-report.json',
  'construction-validity-report.json',
  'construction-weight-report.json',
  'construction-quantity-report.json',
  'reference-provenance-report.json',
  ...ROW_FILES,
];
const completenessFile = 'scoreboard-completeness.json';
const inventory = {
  pipeline: [
    'sources.ndjson',
    'sources.ndjson.manifest.json',
    'delta-report.json',
    'delta-rows.jsonl',
    'execution.json',
    'reference-provenance-report.json',
  ],
  detailed: REPORT_FILES.map((file) => 'terms/' + file),
  result: ['RESULTS.json'],
};

function countJsonRows(bytes) {
  return bytes
    .toString('utf8')
    .split(/\r?\n/)
    .reduce((count, line) => {
      if (!line) return count;
      JSON.parse(line);
      return count + 1;
    }, 0);
}

export function verifySourceReceipt(out, expectedRows) {
  const receipt = readJson(path.join(out, 'sources.ndjson.manifest.json'));
  const bytes = fs.readFileSync(path.join(out, 'sources.ndjson'));
  if (
    receipt.sourceCount !== expectedRows ||
    countJsonRows(bytes) !== expectedRows
  )
    throw new Error('Source receipt row count mismatch');
  verifySha256(bytes, receipt.sourcesSha256, 'Sources producer receipt');
}

function describeArtifact(out, file, expectedCorpusRows) {
  const bytes = fs.readFileSync(path.join(out, file));
  const name = path.posix.basename(file);
  let rows, rowCountKind;
  if (name.endsWith('.jsonl') || name.endsWith('.ndjson')) {
    rows = countJsonRows(bytes);
    rowCountKind = 'corpus';
  } else {
    const data = JSON.parse(bytes.toString('utf8'));
    if (name === 'RESULTS.json') {
      rows = data.bv?.rows;
      rowCountKind = 'corpus';
    } else if (
      name.endsWith('-report.json') &&
      name !== 'reference-provenance-report.json'
    ) {
      const counts = Object.values(data.byFamily ?? {}).map(
        (family) => family.rows,
      );
      if (
        !counts.length ||
        counts.some((count) => !Number.isSafeInteger(count) || count < 0)
      )
        throw new Error(`${file} invalid family row count`);
      rows = counts.reduce((sum, count) => sum + count, 0);
      rowCountKind = 'corpus';
    } else {
      // Trust reports, the producer receipt and execution marker are each one
      // metadata document; they do not claim to contain corpus rows.
      if (!data || typeof data !== 'object' || Array.isArray(data))
        throw new Error(`${file} invalid metadata`);
      rows = 1;
      rowCountKind = 'metadata';
    }
  }
  const expectedRows = rowCountKind === 'corpus' ? expectedCorpusRows : 1;
  if (rows !== expectedRows)
    throw new Error(`${file} row count ${rows}; expected ${expectedRows}`);
  return { sha256: sha256(bytes), expectedRows, rows, rowCountKind };
}

export function recordCompletionStage(out, stage, expectedCorpusRows) {
  if (
    !Number.isSafeInteger(expectedCorpusRows) ||
    expectedCorpusRows < 1 ||
    !Object.hasOwn(inventory, stage)
  )
    throw new Error('Invalid completion inventory');
  const file = path.join(out, completenessFile);
  const manifest = fs.existsSync(file)
    ? readJson(file)
    : { schemaVersion: 1, expectedCorpusRows, files: {} };
  if (manifest.expectedCorpusRows !== expectedCorpusRows)
    throw new Error('Completion corpus count changed');
  if (stage === 'pipeline') verifySourceReceipt(out, expectedCorpusRows);
  for (const name of inventory[stage])
    manifest.files[name] = describeArtifact(out, name, expectedCorpusRows);
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

export function verifyCompletion(out) {
  const manifest = readJson(path.join(out, completenessFile));
  const required = Object.values(inventory).flat().sort();
  if (
    manifest.schemaVersion !== 1 ||
    !Number.isSafeInteger(manifest.expectedCorpusRows) ||
    manifest.expectedCorpusRows < 1 ||
    JSON.stringify(Object.keys(manifest.files ?? {}).sort()) !==
      JSON.stringify(required)
  )
    throw new Error('Incomplete artifact inventory');
  verifySourceReceipt(out, manifest.expectedCorpusRows);
  for (const file of required) {
    const recorded = manifest.files[file];
    verifySha256(fs.readFileSync(path.join(out, file)), recorded.sha256, file);
    const observed = describeArtifact(out, file, manifest.expectedCorpusRows);
    if (
      ['rows', 'expectedRows', 'rowCountKind'].some(
        (key) => observed[key] !== recorded[key],
      )
    )
      throw new Error(`${file} completion evidence mismatch`);
  }
  return manifest;
}
