#!/usr/bin/env node
// Load = Java, runtime path. Committed unit JSON -> the real loader/mapper/store/status bar -> BV,
// validity, weight, MP and BV terms, one schema row per unit, counted against the committed Java
// reference. Run from the repository root: node scripts/runtime-path-bv/run.mjs --out <dir>
//
// Exit code: non-zero only when the census did not complete (missing/drifted inputs, a capture
// that did not finish, an infrastructure failure, or two runs that are not byte-identical).
// Parity differences never fail the run; they are the measurement.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import { prepareReference } from '../ci/parity-scoreboard.mjs';
import { sha256 } from '../ci/parity-scoreboard-artifacts.mjs';
import { OUTPUT_FILES, serializeRows, validateReceipt } from '../lib/runtime-parity/rows.mjs';
import { InputError, buildPlan, obtainJoin, verifyAgainstReference } from './join.mjs';
import { capturedToRow, summarize } from './report.mjs';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SUPPORTED_FAMILIES = ['battlemechs'];

/** A run that did not complete. `reason` is named like the input failures. */
export class RunError extends Error {
  constructor(reason, message) {
    super(`${reason}: ${message}`);
    this.name = 'RunError';
    this.reason = reason;
  }
}

/** One fresh Jest process over the plan; returns the captured records and its resource usage. */
export function runJestCapture({ repoRoot, plan, dir }) {
  fs.mkdirSync(dir, { recursive: true });
  const planFile = path.join(dir, 'plan.json');
  const contextFile = path.join(dir, 'context.json');
  fs.writeFileSync(planFile, JSON.stringify(plan));
  fs.writeFileSync(contextFile, JSON.stringify({ planFile, outputDirectory: dir }));
  const log = fs.openSync(path.join(dir, 'jest.log'), 'w');
  const started = process.hrtime.bigint();
  const result = spawnSync(
    process.execPath,
    [
      path.join(repoRoot, 'node_modules/jest/bin/jest.js'),
      '--config',
      path.join(repoRoot, 'config/jest/runtime-path-bv.config.js'),
      '--runInBand',
      '--ci',
    ],
    { cwd: repoRoot, env: { ...process.env, RUNTIME_PATH_BV_CONTEXT: contextFile }, stdio: ['ignore', log, log] },
  );
  fs.closeSync(log);
  const durationSeconds = Number(process.hrtime.bigint() - started) / 1e9;
  const read = (name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
  if (result.error || result.status !== 0 || !fs.existsSync(path.join(dir, 'capture-summary.json')))
    throw new RunError('CAPTURE_INCOMPLETE', `jest exited ${result.status ?? result.signal ?? result.error?.message}; see ${path.join(dir, 'jest.log')}`);
  const counts = read('capture-summary.json');
  if (counts.infrastructureFailures > 0)
    throw new RunError('CAPTURE_INFRASTRUCTURE_FAILURE', `${counts.infrastructureFailures} unit(s) hit a harness failure; see ${path.join(dir, 'captured.jsonl')}`);
  const records = fs
    .readFileSync(path.join(dir, 'captured.jsonl'), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  if (records.length !== plan.length) throw new RunError('CAPTURE_INCOMPLETE', `captured ${records.length} of ${plan.length} units`);
  return { records, durationSeconds, resources: read('resources.json') };
}

const gitHead = (root) => execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

/** The committed Java reference, verified by the scoreboard's own function (gzip, content and sidecar SHA-256). */
export function loadReference(repoRoot, work) {
  // The scoreboard's own call roots the reference paths at config/reference/.
  const referenceDir = path.join(repoRoot, 'config/reference');
  let config;
  let file;
  try {
    config = JSON.parse(fs.readFileSync(path.join(referenceDir, 'parity-scoreboard.json'), 'utf8'));
    file = prepareReference(referenceDir, path.join(work, 'reference'), config.reference);
  } catch (error) {
    throw new InputError(error.code === 'ENOENT' ? 'S0A_REFERENCE_MISSING' : 'INPUT_SHA_DRIFT', String(error.message));
  }
  const rows = fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  return { file, rows, gzipSha256: config.reference.gzipSha256 };
}

/** Rows that differ between runs, by identity, so a nondeterministic unit is named. */
function differingUnits(texts) {
  const identityOf = (line) => {
    const row = JSON.parse(line);
    return JSON.stringify([row.family, row.path]);
  };
  const byRun = texts.map((text) => new Map(text.split('\n').filter(Boolean).map((line) => [identityOf(line), line])));
  const keys = new Set(byRun.flatMap((map) => [...map.keys()]));
  return [...keys].filter((key) => new Set(byRun.map((map) => map.get(key))).size > 1).map((key) => JSON.parse(key));
}

export async function main(argv = process.argv.slice(2), deps = {}) {
  const { values } = parseArgs({
    args: argv,
    options: {
      out: { type: 'string' },
      sources: { type: 'string' },
      mekfiles: { type: 'string' },
      family: { type: 'string', default: 'battlemechs' },
      units: { type: 'string' },
      runs: { type: 'string', default: '2' },
    },
  });
  if (!values.out) throw new Error('Required: --out <dir>');
  const repoRoot = deps.repoRoot ?? defaultRoot;
  const capture = deps.capture ?? runJestCapture;
  const out = path.resolve(values.out);
  const work = path.join(out, 'work');
  fs.mkdirSync(work, { recursive: true });
  const started = process.hrtime.bigint();
  try {
    const families = values.family.split(',').filter(Boolean);
    for (const family of families)
      if (!SUPPORTED_FAMILIES.includes(family)) throw new InputError('UNSUPPORTED_FAMILY', `${family} is not supported yet (battlemechs first)`);
    const runCount = Number(values.runs);
    if (!Number.isInteger(runCount) || runCount < 1) throw new Error('--runs must be a positive integer');

    const repoSha = (deps.gitHead ?? gitHead)(repoRoot);
    const reference = (deps.loadReference ?? loadReference)(repoRoot, work);
    const join = obtainJoin({ repoRoot, sourcesDir: values.sources, mekfiles: values.mekfiles, commit: repoSha, referenceFile: reference.file, workDir: work });
    let plan = buildPlan({ rows: join.rows, manifest: join.manifest, families });
    const referenceByPath = verifyAgainstReference(plan, reference.rows);
    let unitIds = null;
    if (values.units) {
      unitIds = values.units.split(',').filter(Boolean);
      const known = new Set(plan.map((entry) => entry.unitId));
      const unknown = unitIds.filter((id) => !known.has(id));
      if (unknown.length) throw new InputError('MISSING_MANIFEST_ROWS', `--units not in the join: ${unknown.join(', ')}`);
      plan = plan.filter((entry) => unitIds.includes(entry.unitId));
    }
    if (!plan.length) throw new InputError('ZERO_UNITS_MEASURED', 'the join produced no units for the requested families');

    const runs = [];
    for (let index = 1; index <= runCount; index++) {
      const result = capture({ repoRoot, plan, dir: path.join(work, `run-${index}`) });
      const text = serializeRows(result.records.map(capturedToRow));
      runs.push({ text, rowsSha256: sha256(Buffer.from(text)), durationSeconds: result.durationSeconds, resources: result.resources });
    }
    const deterministic = runs.every((run) => run.text === runs[0].text);
    const rows = runs[0].text.split('\n').filter(Boolean).map((line) => JSON.parse(line));
    const scope = { families, unitIds };
    const { summary, differences } = summarize({ rows, referenceByPath, scope, deterministic });

    fs.writeFileSync(path.join(out, OUTPUT_FILES.rows), runs[0].text);
    fs.writeFileSync(path.join(out, OUTPUT_FILES.summary), JSON.stringify(summary, null, 2) + '\n');
    fs.writeFileSync(path.join(out, 'java-differences.ndjson'), differences.map((d) => JSON.stringify(d) + '\n').join(''));
    const receipt = validateReceipt({
      schemaVersion: 1,
      measure: 'load',
      repoSha,
      node: process.version,
      platform: `${process.platform}-${process.arch}`,
      reference: { sha256: reference.gzipSha256 },
      sources: { sha256: join.sourcesSha256 },
      manifest: { sha256: join.manifestSha256 },
      rows: { count: rows.length, sha256: runs[0].rowsSha256 },
      durationSeconds: Number(process.hrtime.bigint() - started) / 1e9,
      runs: runs.map(({ rowsSha256, durationSeconds, resources }) => ({ rowsSha256, durationSeconds, resources })),
      deterministic,
      scope,
    });
    fs.writeFileSync(path.join(out, OUTPUT_FILES.receipt), JSON.stringify(receipt, null, 2) + '\n');
    console.log(summary.headline);
    if (!deterministic) {
      const units = differingUnits(runs.map((run) => run.text));
      fs.writeFileSync(path.join(out, 'failure.json'), JSON.stringify({ reason: 'NONDETERMINISTIC_ROWS', units }, null, 2) + '\n');
      console.error(`NONDETERMINISTIC_ROWS: ${units.length} unit(s) differ between runs; see failure.json`);
      return 1;
    }
    return 0;
  } catch (error) {
    const reason = error.reason ?? 'RUN_FAILED';
    fs.writeFileSync(path.join(out, 'failure.json'), JSON.stringify({ reason, message: String(error.message) }, null, 2) + '\n');
    console.error(error.message);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await main();
