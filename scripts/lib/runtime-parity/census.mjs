// The census orchestrator shared by the two runtime-parity runners (load: scripts/runtime-path-bv,
// reopen: scripts/runtime-roundtrip). One owner for what is common: the inputs (reference, S0b
// join, plan), the population proof, fresh capture processes, the byte-identity gate, the rows /
// summary / receipt files and the failure mapping. A runner supplies only what differs: its
// capture, how a captured record becomes a row, and how rows are counted.
//
// Exit code: non-zero only when the census did not complete (missing/drifted inputs, a capture that
// did not finish, an infrastructure failure, a short or padded capture, or two runs that are not
// byte-identical). Parity differences never fail the run; they are the measurement.
import { execFileSync, spawnSync } from 'node:child_process';
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
import {
  GateError,
  baselinePath,
  baselineSetsPath,
  buildBaseline,
  parseBaseline,
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
 * A capture that is one fresh Jest process over the plan. `config` is the Jest config, `contextEnv`
 * the environment variable that carries the context file to the capture, and `extraContext({dir})`
 * adds capture-specific fields (the reopen capture gets its fresh database path this way).
 */
export function jestCapture({ config, contextEnv, extraContext = () => ({}) }) {
  return ({ repoRoot, plan, dir }) => {
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
    const result = spawnSync(
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
        env: { ...process.env, [contextEnv]: contextFile },
        stdio: ['ignore', log, log],
      },
    );
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
 * spec: { measure, repoRoot, supportedFamilies, capture, toRow, summarize, differencesFile, facts }
 *   toRow(record) -> row; summarize({rows, referenceByPath, scope, deterministic}) -> {summary, differences};
 *   facts(row, javaReferenceRow) -> the unit's gated facts (scripts/lib/runtime-parity/facts.mjs), written to
 *   facts.ndjson beside the rows for the nightly gate.
 *
 * `--write-baseline --reason <text> [--pr <n>] [--baseline-dir <dir>]` also writes config/parity-runtime/baseline-<measure>.json (and its .sets.ndjson sidecar) from
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
      family: { type: 'string', default: 'battlemechs' },
      units: { type: 'string' },
      runs: { type: 'string', default: '2' },
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
  const repoRoot = deps.repoRoot ?? spec.repoRoot;
  const capture = deps.capture ?? spec.capture;
  const out = path.resolve(values.out);
  const work = path.join(out, 'work');
  fs.mkdirSync(work, { recursive: true });
  const started = process.hrtime.bigint();
  try {
    const families = values.family.split(',').filter(Boolean);
    for (const family of families)
      if (!spec.supportedFamilies.includes(family))
        throw new InputError(
          'UNSUPPORTED_FAMILY',
          `${family} is not supported yet (battlemechs first)`,
        );
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

    const runs = [];
    for (let index = 1; index <= runCount; index++) {
      const result = capture({
        repoRoot,
        plan,
        dir: path.join(work, `run-${index}`),
      });
      assertOneRecordPerUnit(result.records, plan);
      const text = serializeRows(result.records.map(spec.toRow));
      runs.push({
        text,
        rowsSha256: sha256(Buffer.from(text)),
        durationSeconds: result.durationSeconds,
        resources: result.resources,
      });
    }
    const deterministic = runs.every((run) => run.text === runs[0].text);
    const rows = runs[0].text
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    const scope = { families, populationCount, unitIds };
    const { summary, differences } = spec.summarize({
      rows,
      referenceByPath,
      scope,
      deterministic,
    });

    const facts = spec.facts
      ? rows.map((row) => spec.facts(row, referenceByPath.get(row.path)))
      : null;
    if (facts) {
      fs.writeFileSync(
        path.join(out, FACTS_FILE),
        serializeFacts(spec.measure, facts),
      );
      // Where the facts came from: the gate fails closed if facts.mjs changed since the baseline.
      fs.writeFileSync(
        path.join(out, FACTS_META_FILE),
        JSON.stringify(
          factsMeta({
            measure: spec.measure,
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
      path.join(out, spec.differencesFile),
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
          : path.join(repoRoot, path.dirname(baselinePath(spec.measure)));
        const target = path.join(
          dir,
          path.basename(baselinePath(spec.measure)),
        );
        const setsTarget = path.join(
          dir,
          path.basename(baselineSetsPath(spec.measure)),
        );
        let existing = null;
        if (fs.existsSync(target))
          existing = parseBaseline(
            spec.measure,
            fs.readFileSync(target, 'utf8'),
            fs.existsSync(setsTarget)
              ? fs.readFileSync(setsTarget, 'utf8')
              : null,
          );
        const baseline = buildBaseline({
          measure: spec.measure,
          facts,
          sha: repoSha,
          note: {
            sha: repoSha,
            pr: values.pr === undefined ? null : Number(values.pr),
            reason: values.reason,
            units: [],
          },
          provenance: factsProvenance({
            referenceSha256: reference.gzipSha256,
          }),
          existing,
        });
        // Both files come from the one serializer, so they share the one member-set hash function.
        const { main, sets } = serializeBaseline(baseline);
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
