// The census orchestrator shared by the two runtime-parity runners (load: scripts/runtime-path-bv,
// reopen: scripts/runtime-roundtrip). One owner for what is common: the inputs (reference, S0b
// join, plan), the population proof, fresh capture processes, the byte-identity gate, the rows /
// summary / receipt files and the failure mapping. A runner supplies only what differs: its
// capture, how a captured record becomes a row, and how rows are counted.
//
// Exit code: non-zero only when the census did not complete (missing/drifted inputs, a capture that
// did not finish, an infrastructure failure, a short or padded capture, or two runs that are not
// byte-identical). Parity differences never fail the run; they are the measurement.
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { sha256 } from '../../ci/parity-scoreboard-artifacts.mjs';
import { prepareReference } from '../../ci/parity-scoreboard.mjs';
import {
  FACTS_META_FILE,
  factsMeta,
  factsProvenance,
} from './facts-provenance.mjs';
import { FACTS_FILE, serializeFacts } from './facts.mjs';
import { DEFAULT_FAMILY } from './family-names.mjs';
import {
  GateError,
  baselinePath,
  baselineSetsPath,
  buildBaseline,
  readBaselineNotes,
  serializeBaseline,
} from './gate.mjs';
import {
  InputError,
  buildPlan,
  obtainJoin,
  verifyAgainstReference,
} from './join.mjs';
import { OUTPUT_FILES, serializeRows, validateReceipt } from './rows.mjs';

/** A run that did not complete. `reason` is named like the input failures. */
export class RunError extends Error {
  constructor(reason, message) {
    super(`${reason}: ${message}`);
    this.name = 'RunError';
    this.reason = reason;
  }
}

/**
 * Concurrent captures share a wall clock and a time zone, so a row that carries a time-derived value would agree between
 * them where two sequential runs (minutes apart) would not. To keep that detectable, every concurrent run after the first
 * starts this much later than the one before it and runs under a different time zone (concurrentTimeZone).
 */
export const CONCURRENT_START_OFFSET_MS = 4000;

/** The time zone this process (and so a capture that inherits its environment) runs in. */
export const inheritedTimeZone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * Concurrent captures roughly double peak memory (a local load capture peaks at about 2.9 GB). On CI the
 * runner has the headroom, so the default there is concurrent. Locally the default stays sequential, so a
 * census under the shared machine's two census slots keeps its old footprint unless asked:
 * `--concurrent` opts in, `--sequential` opts out, and the two together are an error.
 */
export function selectCaptureMode(values, env) {
  if (values.sequential && values.concurrent)
    throw new Error('--sequential and --concurrent cannot both be given');
  if (values.sequential) return 'sequential';
  if (values.concurrent) return 'concurrent';
  return isCi(env) ? 'concurrent' : 'sequential';
}

/** `CI` counts only when set to something other than empty, `false` or `0`, so `CI=false` in a shell stays local. */
export const isCi = (env) => {
  const value = String(env.CI ?? '')
    .trim()
    .toLowerCase();
  return value !== '' && value !== 'false' && value !== '0';
};

/** UTC+14, so its calendar date differs from most zones' for most of the day; UTC-11 if that is already the inherited one. */
export const concurrentTimeZone = (inherited) =>
  inherited === 'Pacific/Kiritimati'
    ? 'Pacific/Pago_Pago'
    : 'Pacific/Kiritimati';

/**
 * A capture that is one fresh Jest process over the plan. `config` is the Jest config, `contextEnv`
 * the environment variable that carries the context file to the capture, and `extraContext({dir})`
 * adds capture-specific fields (the reopen capture gets its fresh database path this way).
 *
 * A capture is `({repoRoot, plan, dir, env}) => {records, durationSeconds, resources}` or a promise of that;
 * runCensus awaits it, so a synchronous capture (a test's injected one) is just as valid. Everything a
 * capture writes goes under its own `dir`, which is what lets runCensus run several at once. `env` holds
 * the variables the capture process gets on top of this process's environment (a concurrent run's `TZ`).
 */
export function jestCapture({ config, contextEnv, extraContext = () => ({}) }) {
  return async ({ repoRoot, plan, dir, env = {} }) => {
    fs.mkdirSync(dir, { recursive: true });
    const planFile = path.join(dir, 'plan.json');
    const contextFile = path.join(dir, 'context.json');
    fs.writeFileSync(planFile, JSON.stringify(plan));
    fs.writeFileSync(
      contextFile,
      JSON.stringify({
        planFile,
        outputDirectory: dir,
        ...extraContext({ dir }),
      }),
    );
    const log = fs.openSync(path.join(dir, 'jest.log'), 'w');
    const started = process.hrtime.bigint();
    const result = await new Promise((resolve) => {
      const child = spawn(
        process.execPath,
        [
          path.join(repoRoot, 'node_modules/jest/bin/jest.js'),
          '--config',
          path.join(repoRoot, config),
          '--runInBand',
          '--ci',
        ],
        {
          cwd: repoRoot,
          env: { ...process.env, ...env, [contextEnv]: contextFile },
          stdio: ['ignore', log, log],
        },
      );
      child.once('error', (error) => resolve({ error }));
      child.once('close', (status, signal) => resolve({ status, signal }));
    });
    fs.closeSync(log);
    const durationSeconds = Number(process.hrtime.bigint() - started) / 1e9;
    const read = (name) =>
      JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
    if (
      result.error ||
      result.status !== 0 ||
      !fs.existsSync(path.join(dir, 'capture-summary.json'))
    )
      throw new RunError(
        'CAPTURE_INCOMPLETE',
        `jest exited ${result.status ?? result.signal ?? result.error?.message}; see ${path.join(dir, 'jest.log')}`,
      );
    const counts = read('capture-summary.json');
    if (counts.infrastructureFailures > 0)
      throw new RunError(
        'CAPTURE_INFRASTRUCTURE_FAILURE',
        `${counts.infrastructureFailures} unit(s) hit a harness failure; see ${path.join(dir, 'captured.jsonl')}`,
      );
    const records = fs
      .readFileSync(path.join(dir, 'captured.jsonl'), 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    if (records.length !== plan.length)
      throw new RunError(
        'CAPTURE_INCOMPLETE',
        `captured ${records.length} of ${plan.length} units`,
      );
    return { records, durationSeconds, resources: read('resources.json') };
  };
}

export const gitHead = (root) =>
  execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim();

/** The committed Java reference, verified by the scoreboard's own function (gzip, content and sidecar SHA-256). */
export function loadReference(repoRoot, work) {
  // The scoreboard's own call roots the reference paths at config/reference/.
  const referenceDir = path.join(repoRoot, 'config/reference');
  let config;
  let file;
  try {
    config = JSON.parse(
      fs.readFileSync(
        path.join(referenceDir, 'parity-scoreboard.json'),
        'utf8',
      ),
    );
    file = prepareReference(
      referenceDir,
      path.join(work, 'reference'),
      config.reference,
    );
  } catch (error) {
    throw new InputError(
      error.code === 'ENOENT' ? 'S0A_REFERENCE_MISSING' : 'INPUT_SHA_DRIFT',
      String(error.message),
    );
  }
  const rows = fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  return { file, rows, gzipSha256: config.reference.gzipSha256 };
}

/**
 * Exactly one record per planned unit: no unit missing, none repeated, none unplanned. Error records
 * count (they are the unit's row, carrying its status). A capture that is short or padded cannot
 * become a published count.
 */
export function assertOneRecordPerUnit(records, plan) {
  const planned = new Set(
    plan.map((entry) => `${entry.family}\0${entry.unitId}`),
  );
  const seen = new Set();
  for (const record of records) {
    const key = `${record.family}\0${record.unitId}`;
    if (!planned.has(key))
      throw new RunError(
        'POPULATION_MISMATCH',
        `captured a unit that is not in the plan: ${record.unitId}`,
      );
    if (seen.has(key))
      throw new RunError(
        'POPULATION_MISMATCH',
        `captured ${record.unitId} more than once`,
      );
    seen.add(key);
  }
  if (seen.size !== planned.size)
    throw new RunError(
      'POPULATION_MISMATCH',
      `captured ${seen.size} of ${planned.size} planned units`,
    );
}

/** Rows that differ between runs, by identity, so a nondeterministic unit is named. */
export function differingUnits(texts) {
  const identityOf = (line) => {
    const row = JSON.parse(line);
    return JSON.stringify([row.family, row.path]);
  };
  const byRun = texts.map(
    (text) =>
      new Map(
        text
          .split('\n')
          .filter(Boolean)
          .map((line) => [identityOf(line), line]),
      ),
  );
  const keys = new Set(byRun.flatMap((map) => [...map.keys()]));
  return [...keys]
    .filter((key) => new Set(byRun.map((map) => map.get(key))).size > 1)
    .map((key) => JSON.parse(key));
}

/**
 * spec: { measure, repoRoot, families: { <family>: { capture, toRow, summarize, differencesFile, facts } } }
 *   One entry per supported family; a run measures exactly one family (`--family`, default battlemechs).
 *   toRow(record) -> row; summarize({rows, referenceByPath, scope, deterministic}) -> {summary, differences};
 *   facts(row, javaReferenceRow) -> the unit's gated facts (the family's deriver, imported by the port from its own
 *   facts-<family>.mjs), written to
 *   facts.ndjson beside the rows for the nightly gate.
 *
 * `--write-baseline --reason <text> [--pr <n>] [--baseline-dir <dir>]` also writes the family's baseline (gate.mjs baselinePath:
 * config/parity-runtime/baseline-<measure>.json for battlemechs, baseline-<family>-<measure>.json otherwise, and its .sets.ndjson sidecar) from
 * the run's facts, with its SHA, population hash and a `notes[]` entry. It REFUSES (nothing written, exit 1,
 * failure.json BASELINE_REFUSED) for a narrowed run, nondeterministic rows, or any failed, incomplete or unknown unit.
 */
export async function runCensus(argv, deps, spec) {
  const { values } = parseArgs({
    args: argv,
    options: {
      out: { type: 'string' },
      sources: { type: 'string' },
      mekfiles: { type: 'string' },
      family: { type: 'string', default: DEFAULT_FAMILY },
      units: { type: 'string' },
      runs: { type: 'string', default: '2' },
      sequential: { type: 'boolean', default: false },
      concurrent: { type: 'boolean', default: false },
      'write-baseline': { type: 'boolean', default: false },
      'baseline-dir': { type: 'string' },
      reason: { type: 'string' },
      pr: { type: 'string' },
    },
  });
  if (!values.out) throw new Error('Required: --out <dir>');
  if (values['write-baseline'] && !values.reason)
    throw new Error(
      '--write-baseline requires --reason <why this baseline is being recorded>',
    );
  if (values.pr !== undefined && !/^[1-9][0-9]*$/.test(values.pr))
    throw new Error('--pr must be a positive integer');
  // Decided with the other flag checks, so a --sequential/--concurrent conflict fails before any input is read.
  const captureMode = selectCaptureMode(values, deps.env ?? process.env);
  const repoRoot = deps.repoRoot ?? spec.repoRoot;
  const out = path.resolve(values.out);
  const work = path.join(out, 'work');
  fs.mkdirSync(work, { recursive: true });
  const started = process.hrtime.bigint();
  try {
    // One family per run: each family has its own fact table and baseline files.
    const families = values.family.split(',').filter(Boolean);
    if (families.length !== 1)
      throw new InputError(
        'UNSUPPORTED_FAMILY',
        `--family takes exactly one family per run, not ${families.length}`,
      );
    const [family] = families;
    const familySpec = Object.hasOwn(spec.families, family)
      ? spec.families[family]
      : null;
    if (!familySpec)
      throw new InputError(
        'UNSUPPORTED_FAMILY',
        `${family} is not supported yet (battlemechs first)`,
      );
    const capture = deps.capture ?? familySpec.capture;
    const runCount = Number(values.runs);
    if (!Number.isInteger(runCount) || runCount < 1)
      throw new Error('--runs must be a positive integer');

    const repoSha = (deps.gitHead ?? gitHead)(repoRoot);
    const reference = (deps.loadReference ?? loadReference)(repoRoot, work);
    const join = obtainJoin({
      repoRoot,
      sourcesDir: values.sources,
      mekfiles: values.mekfiles,
      commit: repoSha,
      referenceFile: reference.file,
      workDir: work,
    });
    let plan = buildPlan({
      rows: join.rows,
      manifest: join.manifest,
      families,
    });
    const referenceByPath = verifyAgainstReference(plan, reference.rows);
    // The population as the join defines it: the plan after the family filter, before --units.
    const populationCount = plan.length;
    let unitIds = null;
    if (values.units) {
      // Sorted and de-duplicated, so `--units a,a` is one unit and the scope is canonical.
      unitIds = [...new Set(values.units.split(',').filter(Boolean))].sort();
      const known = new Set(plan.map((entry) => entry.unitId));
      const unknown = unitIds.filter((id) => !known.has(id));
      if (unknown.length)
        throw new InputError(
          'MISSING_MANIFEST_ROWS',
          `--units not in the join: ${unknown.join(', ')}`,
        );
      const wanted = new Set(unitIds);
      plan = plan.filter((entry) => wanted.has(entry.unitId));
    }
    if (!plan.length)
      throw new InputError(
        'ZERO_UNITS_MEASURED',
        'the join produced no units for the requested families',
      );

    // Every capture is its own fresh process over the whole plan in its own work/run-<n>, so they can run
    // together. Either way the runs are kept in index order. Concurrent runs after the first start later and
    // in another time zone (CONCURRENT_START_OFFSET_MS); sequential runs all inherit this process's
    // environment, as before.
    const sequential = captureMode === 'sequential';
    const captureOffsetMs = sequential
      ? 0
      : (deps.captureOffsetMs ?? CONCURRENT_START_OFFSET_MS);
    const inherited = inheritedTimeZone();
    const staggered = (index) => !sequential && index > 1;
    const timeZoneOf = (index) =>
      staggered(index) ? concurrentTimeZone(inherited) : inherited;
    const captureRun = async (index) => {
      if (staggered(index))
        await new Promise((resolve) =>
          setTimeout(resolve, (index - 1) * captureOffsetMs),
        );
      return capture({
        repoRoot,
        plan,
        dir: path.join(work, `run-${index}`),
        env: staggered(index) ? { TZ: timeZoneOf(index) } : {},
      });
    };
    const toRun = (result) => {
      assertOneRecordPerUnit(result.records, plan);
      const text = serializeRows(result.records.map(familySpec.toRow));
      return {
        text,
        rowsSha256: sha256(Buffer.from(text)),
        durationSeconds: result.durationSeconds,
        resources: result.resources,
      };
    };
    const indices = Array.from({ length: runCount }, (_, i) => i + 1);
    let runs;
    if (sequential) {
      runs = [];
      for (const index of indices) runs.push(toRun(await captureRun(index)));
    } else {
      // Wait for every capture to settle before reporting a failure, so none outlives the run.
      const settled = await Promise.allSettled(indices.map(captureRun));
      const failed = settled.find((outcome) => outcome.status === 'rejected');
      if (failed) throw failed.reason;
      runs = settled.map((outcome) => toRun(outcome.value));
    }
    const deterministic = runs.every((run) => run.text === runs[0].text);
    const rows = runs[0].text
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    const scope = { families, populationCount, unitIds };
    const { summary, differences } = familySpec.summarize({
      rows,
      referenceByPath,
      scope,
      deterministic,
    });

    const facts = familySpec.facts
      ? rows.map((row) => familySpec.facts(row, referenceByPath.get(row.path)))
      : null;
    if (facts) {
      fs.writeFileSync(
        path.join(out, FACTS_FILE),
        serializeFacts(spec.measure, facts),
      );
      // Where the facts came from: the gate fails closed if the shared core or this family's deriver changed since the baseline.
      fs.writeFileSync(
        path.join(out, FACTS_META_FILE),
        JSON.stringify(
          factsMeta({
            measure: spec.measure,
            family,
            referenceSha256: reference.gzipSha256,
          }),
          null,
          2,
        ) + '\n',
      );
    }
    fs.writeFileSync(path.join(out, OUTPUT_FILES.rows), runs[0].text);
    fs.writeFileSync(
      path.join(out, OUTPUT_FILES.summary),
      JSON.stringify(summary, null, 2) + '\n',
    );
    fs.writeFileSync(
      path.join(out, familySpec.differencesFile),
      differences.map((d) => JSON.stringify(d) + '\n').join(''),
    );
    const receipt = validateReceipt({
      schemaVersion: 1,
      measure: spec.measure,
      repoSha,
      node: process.version,
      nodeAbi: process.versions.modules,
      platform: `${process.platform}-${process.arch}`,
      reference: { sha256: reference.gzipSha256 },
      sources: { sha256: join.sourcesSha256 },
      manifest: { sha256: join.manifestSha256 },
      rows: { count: rows.length, sha256: runs[0].rowsSha256 },
      durationSeconds: Number(process.hrtime.bigint() - started) / 1e9,
      runs: runs.map(({ rowsSha256, durationSeconds, resources }) => ({
        rowsSha256,
        durationSeconds,
        resources,
      })),
      captureMode,
      captureOffsetMs,
      captureTimeZones: indices.map(timeZoneOf),
      deterministic,
      scope,
    });
    fs.writeFileSync(
      path.join(out, OUTPUT_FILES.receipt),
      JSON.stringify(receipt, null, 2) + '\n',
    );
    console.log(summary.headline);
    if (values['write-baseline']) {
      try {
        if (!facts)
          throw new GateError(
            'BASELINE_REFUSED',
            `${spec.measure} has no facts to baseline`,
          );
        if (unitIds !== null)
          throw new GateError(
            'BASELINE_REFUSED',
            'the run was narrowed by --units; a baseline records the whole population',
          );
        if (!deterministic)
          throw new GateError(
            'BASELINE_REFUSED',
            'the runs were not byte-identical',
          );
        // The committed config/parity-runtime/ unless --baseline-dir names another (a smoke writes to a temp dir).
        const dir = values['baseline-dir']
          ? path.resolve(values['baseline-dir'])
          : path.join(
              repoRoot,
              path.dirname(baselinePath(spec.measure, family)),
            );
        const target = path.join(
          dir,
          path.basename(baselinePath(spec.measure, family)),
        );
        const setsTarget = path.join(
          dir,
          path.basename(baselineSetsPath(spec.measure, family)),
        );
        // Only the notes carry over: the units and facts are replaced by this run, so a baseline that predates a new fact
        // (the very rebaseline that adds it) must still be readable.
        const existingNotes = fs.existsSync(target)
          ? readBaselineNotes(fs.readFileSync(target, 'utf8'), spec.measure)
          : [];
        const baseline = buildBaseline({
          measure: spec.measure,
          family,
          facts,
          sha: repoSha,
          note: {
            sha: repoSha,
            pr: values.pr === undefined ? null : Number(values.pr),
            reason: values.reason,
            units: [],
          },
          provenance: factsProvenance({
            family,
            referenceSha256: reference.gzipSha256,
          }),
          existingNotes,
        });
        // Both files come from the one serializer, so they share the one member-set hash function.
        const { main, sets } = serializeBaseline(baseline, family);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, main);
        if (sets !== null) fs.writeFileSync(setsTarget, sets);
        else fs.rmSync(setsTarget, { force: true });
        console.log(
          `baseline written: ${target} (${baseline.populationCount} units at ${repoSha})`,
        );
      } catch (error) {
        const reason =
          error instanceof GateError ? error.reason : 'BASELINE_REFUSED';
        fs.writeFileSync(
          path.join(out, 'failure.json'),
          JSON.stringify({ reason, message: String(error.message) }, null, 2) +
            '\n',
        );
        console.error(
          `BASELINE_REFUSED: ${String(error.message).replace(/^[A-Z_]+: /, '')}`,
        );
        return 1;
      }
    }
    if (!deterministic) {
      const units = differingUnits(runs.map((run) => run.text));
      fs.writeFileSync(
        path.join(out, 'failure.json'),
        JSON.stringify({ reason: 'NONDETERMINISTIC_ROWS', units }, null, 2) +
          '\n',
      );
      console.error(
        `NONDETERMINISTIC_ROWS: ${units.length} unit(s) differ between runs; see failure.json`,
      );
      return 1;
    }
    return 0;
  } catch (error) {
    const reason = error.reason ?? 'RUN_FAILED';
    fs.writeFileSync(
      path.join(out, 'failure.json'),
      JSON.stringify({ reason, message: String(error.message) }, null, 2) +
        '\n',
    );
    console.error(error.message);
    return 1;
  }
}
