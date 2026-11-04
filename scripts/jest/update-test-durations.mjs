#!/usr/bin/env node
import * as fs from 'node:fs';
/**
 * Refresh config/jest/test-durations.json (the weights behind the Jest shard
 * sequencer) from one or more `jest --json --outputFile=<file>` reports.
 *
 *   npx jest --json --outputFile=jest-shard-1.json --shard=1/6 ...
 *   node scripts/jest/update-test-durations.mjs jest-shard-*.json
 *
 * Pass the reports of a COMPLETE run (every shard, every project): the output
 * replaces the file, so files absent from the inputs are dropped. Only files
 * that took at least --min-ms (default 1000) are recorded; the sequencer gives
 * every other file a small default weight, which keeps the committed file
 * small and stable.
 */
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { parseArgs } from 'node:util';

const require = createRequire(import.meta.url);
const {
  DEFAULT_DURATIONS_FILE,
  toRepoPath,
} = require('../../config/jest/shard-planner.js');

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: 'string', default: DEFAULT_DURATIONS_FILE },
    root: { type: 'string', default: process.cwd() },
    'min-ms': { type: 'string', default: '1000' },
  },
});

const minMs = Number(values['min-ms']);
if (positionals.length === 0 || !Number.isFinite(minMs) || minMs < 0) {
  console.error(
    'usage: update-test-durations.mjs [--out file] [--root dir] [--min-ms 1000] <jest-json-report>...',
  );
  process.exit(1);
}

const root = path.resolve(values.root);
const durations = {};
let filesSeen = 0;
for (const report of positionals) {
  const parsed = JSON.parse(fs.readFileSync(report, 'utf8'));
  if (!Array.isArray(parsed.testResults)) {
    console.error(
      `${report}: no testResults array; is it a jest --json report?`,
    );
    process.exit(1);
  }
  for (const result of parsed.testResults) {
    const { start, end, runtime } = result.perfStats ?? {};
    const ms =
      runtime ?? (end !== undefined && start !== undefined ? end - start : NaN);
    if (!Number.isFinite(ms)) continue;
    filesSeen += 1;
    const file = toRepoPath(root, result.name);
    // A file seen twice (overlapping reports) keeps its slower measurement.
    durations[file] = Math.max(durations[file] ?? 0, ms);
  }
}

const sorted = Object.fromEntries(
  Object.entries(durations)
    .filter(([, ms]) => ms >= minMs)
    .map(([file, ms]) => [file, Math.round(ms / 10) * 10])
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
);

let previous = {};
try {
  previous = JSON.parse(fs.readFileSync(values.out, 'utf8'));
} catch {
  // first write
}
const added = Object.keys(sorted).filter((file) => !(file in previous)).length;
const removed = Object.keys(previous).filter(
  (file) => !(file in sorted),
).length;

fs.mkdirSync(path.dirname(values.out), { recursive: true });
fs.writeFileSync(values.out, `${JSON.stringify(sorted, null, 2)}\n`);
console.log(
  `${filesSeen} files in ${positionals.length} report(s); recorded ${Object.keys(sorted).length} ` +
    `(>= ${minMs} ms): +${added} -${removed} vs previous -> ${values.out}`,
);
