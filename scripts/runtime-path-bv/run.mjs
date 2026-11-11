#!/usr/bin/env node
// Load = Java, runtime path. Committed unit JSON -> the real loader/mapper/store/status bar -> BV,
// validity, weight, MP and BV terms, one schema row per unit, counted against the committed Java
// reference. Run from the repository root: node scripts/runtime-path-bv/run.mjs --out <dir>
//
// The orchestration (inputs, population proof, fresh captures, byte-identity gate, outputs, exit
// code) is shared with the reopen runner in scripts/lib/runtime-parity/census.mjs; this file is
// only what is specific to the load measure.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { jestCapture, runCensus } from '../lib/runtime-parity/census.mjs';
import { capturedToRow, summarize } from './report.mjs';

export {
  RunError,
  assertOneRecordPerUnit,
  loadReference,
} from '../lib/runtime-parity/census.mjs';

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

/** One fresh Jest process over the plan; returns the captured records and its resource usage. */
export const runJestCapture = jestCapture({
  config: 'config/jest/runtime-path-bv.config.js',
  contextEnv: 'RUNTIME_PATH_BV_CONTEXT',
});

const spec = {
  measure: 'load',
  repoRoot,
  supportedFamilies: ['battlemechs'],
  capture: runJestCapture,
  toRow: capturedToRow,
  summarize,
  differencesFile: 'java-differences.ndjson',
};

export const main = (argv = process.argv.slice(2), deps = {}) =>
  runCensus(argv, deps, spec);

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  process.exitCode = await main();
