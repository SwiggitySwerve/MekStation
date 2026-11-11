#!/usr/bin/env node
// Reopen = load after save. Committed unit JSON -> the real canonical open -> a cold SQLite save and
// reopen -> the real loader, observed at both ends by the same status-bar observer; one schema row
// per unit, counted against the committed Java reference.
// Run from the repository root: node scripts/runtime-roundtrip/run.mjs --out <dir>
//
// The orchestration (inputs, population proof, fresh captures, byte-identity gate, outputs, exit
// code) is shared with the load runner in scripts/lib/runtime-parity/census.mjs; this file is only
// what is specific to the reopen measure. Each capture process gets its own fresh database file.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { jestCapture, runCensus } from '../lib/runtime-parity/census.mjs';
import { capturedToRow, summarize } from './report.mjs';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

/** One fresh Jest process over the plan, with a fresh SQLite file at <run dir>/reopen.db. */
export const runJestCapture = jestCapture({
  config: 'config/jest/runtime-roundtrip.config.js',
  contextEnv: 'RUNTIME_ROUNDTRIP_CONTEXT',
  extraContext: ({ dir }) => ({ dbPath: path.join(dir, 'reopen.db') }),
});

const spec = {
  measure: 'reopen',
  repoRoot,
  supportedFamilies: ['battlemechs'],
  capture: runJestCapture,
  toRow: capturedToRow,
  summarize,
  differencesFile: 'reopen-differences.ndjson',
};

export const main = (argv = process.argv.slice(2), deps = {}) =>
  runCensus(argv, deps, spec);

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  process.exitCode = await main();
