// The S0b join as the runtime-path runner consumes it. S0b's committed-catalog emitter owns the
// enumeration, the unit-to-source join and the reference verification; this module reads its
// output (sources.ndjson + sources.ndjson.manifest.json) and turns it into the capture plan. It
// builds no second join. Where the output comes from is one function (obtainJoin), so the source
// can change (override directory today, repo-only CI mode later) without touching the runner.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { sha256 } from '../../ci/parity-scoreboard-artifacts.mjs';

export const SOURCES_FILE = 'sources.ndjson';
export const MANIFEST_FILE = 'sources.ndjson.manifest.json';
export const EMITTER = 'scripts/ci/committed-catalog-sources.ts';

/** A named input failure (S0A_REFERENCE_MISSING, S0B_MANIFEST_MISSING, INPUT_SHA_DRIFT, MISSING_MANIFEST_ROWS, ZERO_UNITS_MEASURED, ...). */
export class InputError extends Error {
  constructor(reason, message) {
    super(`${reason}: ${message}`);
    this.name = 'InputError';
    this.reason = reason;
  }
}

/** Read the emitter's output directory. Returns the parsed rows/manifest and the bytes' hashes. */
export function readJoinFiles(dir) {
  const sourcesFile = path.join(dir, SOURCES_FILE);
  const manifestFile = path.join(dir, MANIFEST_FILE);
  for (const file of [sourcesFile, manifestFile])
    if (!fs.existsSync(file))
      throw new InputError(
        'S0B_MANIFEST_MISSING',
        `missing ${path.basename(file)} in the join input`,
      );
  const sourcesBytes = fs.readFileSync(sourcesFile);
  const manifestBytes = fs.readFileSync(manifestFile);
  return {
    rows: sourcesBytes
      .toString('utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line)),
    manifest: JSON.parse(manifestBytes.toString('utf8')),
    sourcesSha256: sha256(sourcesBytes),
    manifestSha256: sha256(manifestBytes),
  };
}

const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * The capture plan for the requested families: one entry per joined unit with a committed
 * catalog object, sorted by (family, path). Fails closed on any inconsistency between the rows and
 * the manifest's join list.
 */
export function buildPlan({ rows, manifest, families }) {
  const catalog = manifest?.committedCatalog;
  if (!catalog || !Array.isArray(catalog.joins))
    throw new InputError(
      'S0B_MANIFEST_MISSING',
      'manifest has no committedCatalog.joins',
    );
  if (catalog.errors?.length)
    throw new InputError(
      'S0B_MANIFEST_MISSING',
      `emitter reported errors: ${catalog.errors.length}`,
    );
  if (catalog.joins.length !== rows.length || catalog.joined !== rows.length)
    throw new InputError(
      'MISSING_MANIFEST_ROWS',
      `joins ${catalog.joins.length}, joined ${catalog.joined}, rows ${rows.length}`,
    );
  const byPath = new Map();
  for (const row of rows) {
    if (byPath.has(row.path))
      throw new InputError(
        'INPUT_SHA_DRIFT',
        `duplicate source path ${row.path}`,
      );
    byPath.set(row.path, row);
  }
  const plan = [];
  for (const join of catalog.joins) {
    if (!families.includes(join.family)) continue;
    const row = byPath.get(join.path);
    if (!row || row.sha256 !== join.sha256)
      throw new InputError(
        'INPUT_SHA_DRIFT',
        `join ${join.catalogFile} disagrees with its source row`,
      );
    // The capture needs the committed catalog object, which a row carries in `unit`. The emitter's
    // `evaluation` label is not the test: local mode says `committed-unit` for the object families,
    // repo-only mode says `identity-only/reference` for every family yet still carries the object.
    // BA/infantry/ProtoMechs in local mode have `unit: null`; their capture is a later phase.
    if (!row.unit || typeof row.unit !== 'object')
      throw new InputError(
        'MISSING_MANIFEST_ROWS',
        `no committed catalog object in the join for ${join.family}: ${join.catalogFile}`,
      );
    if (typeof row.unit.id !== 'string' || !row.unit.id)
      throw new InputError(
        'MISSING_MANIFEST_ROWS',
        `catalog unit without an id: ${join.catalogFile}`,
      );
    plan.push({
      family: join.family,
      unitId: row.unit.id,
      catalogPath: join.catalogFile,
      catalogBlob: join.catalogBlob,
      path: join.path,
      sha256: join.sha256,
    });
  }
  const ids = new Set();
  for (const entry of plan) {
    const key = `${entry.family}\0${entry.unitId}`;
    if (ids.has(key))
      throw new InputError(
        'MISSING_MANIFEST_ROWS',
        `duplicate unit id ${entry.family}/${entry.unitId}`,
      );
    ids.add(key);
  }
  return plan.sort(
    (a, b) => compare(a.family, b.family) || compare(a.path, b.path),
  );
}

/** The reference must agree with every planned source (same path, same SHA). */
export function verifyAgainstReference(plan, referenceRows) {
  const byPath = new Map(referenceRows.map((row) => [row.path, row]));
  for (const entry of plan) {
    const ref = byPath.get(entry.path);
    if (!ref)
      throw new InputError(
        'MISSING_MANIFEST_ROWS',
        `reference has no row for ${entry.path}`,
      );
    if (ref.sha256 !== entry.sha256)
      throw new InputError(
        'INPUT_SHA_DRIFT',
        `reference SHA differs for ${entry.path}`,
      );
  }
  return byPath;
}

/** The command that runs the S0b emitter as a child step. Pure, so it can be tested. */
export function emitterCommand({
  repoRoot,
  commit,
  mekfiles,
  referenceFile,
  out,
}) {
  // Without a mm-data checkout the emitter's repo-only mode is used: only Git, tsx and committed
  // files (the verified reference supplies each source's path and SHA), so the hosted job needs
  // nothing else. With --mekfiles it runs the local source-text mode.
  const mode = mekfiles
    ? ['--mekfiles', mekfiles, '--reference', referenceFile]
    : ['--reference-only'];
  return {
    command: process.execPath,
    args: [
      '--require',
      'tsx/cjs',
      path.join(repoRoot, EMITTER),
      '--repo',
      repoRoot,
      '--commit',
      commit,
      ...mode,
      '--out',
      out,
      '--source-only-families-identity-only',
    ],
  };
}

/**
 * The one place the join comes from. `sourcesDir` (--sources) reads an existing emitter output;
 * otherwise the emitter runs as a child step, in its repo-only mode unless `mekfiles` is given.
 */
export function obtainJoin({
  repoRoot,
  sourcesDir,
  mekfiles,
  commit,
  referenceFile,
  workDir,
}) {
  if (sourcesDir)
    return { dir: path.resolve(sourcesDir), ...readJoinFiles(sourcesDir) };
  if (!fs.existsSync(path.join(repoRoot, EMITTER)))
    throw new InputError(
      'S0B_MANIFEST_MISSING',
      `${EMITTER} is not in this checkout and no --sources directory was given`,
    );
  const out = path.join(workDir, 'join');
  const { command, args } = emitterCommand({
    repoRoot,
    commit,
    mekfiles,
    referenceFile,
    out,
  });
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0)
    throw new InputError(
      'S0B_MANIFEST_MISSING',
      `emitter exited ${result.status}: ${String(result.stderr).split('\n').slice(-3).join(' ')}`,
    );
  return { dir: out, ...readJoinFiles(out) };
}
