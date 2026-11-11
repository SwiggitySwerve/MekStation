#!/usr/bin/env node
// The nightly runtime gate: the one owner of the comparison between tonight's per-unit facts and the
// committed baseline (config/parity-runtime/baseline-<measure>.json plus, for set facts, its
// baseline-<measure>.sets.ndjson sidecar), optionally tightened by the last green nightly. The workflow only
// runs this; nothing else decides what "worse" means.
//
//   node scripts/lib/runtime-parity/gate.mjs --measure load --run-dir <port out dir> \
//        [--baseline config/parity-runtime/baseline-load.json] [--last-green <last-green.json>] \
//        [--repo <root>] [--out <dir>]
//
// Rule (agreed by C1, C3, C5 and approved by Root, 2026-11-11), in a few lines:
//   - A unit that gets WORSE on any gated fact fails the night (exit 1), by name: a bool pass -> fail, a set that
//     gains members, a distance that grows beyond tolerance, or a known value that becomes UNKNOWN.
//   - Gains pass. An intended gain rebaselines in its own PR (the port's --write-baseline).
//   - Population: units only in tonight's run are UNBASELINED (counted, never a fail); a baseline unit absent from
//     tonight's run (removed or renamed) FAILS CLOSED (exit 2, POPULATION_UNIT_REMOVED), naming the ids.
//   - FAIL CLOSED (exit 2): baseline missing or malformed, a sidecar that does not match it, any gated fact missing
//     from a baseline unit, a baseline SHA that is not an ancestor of the run, facts derived by a different
//     facts.mjs than the baseline's, malformed facts, a narrowed or incomplete run, a removed or renamed unit.
//   - Last-green tightening is optional: while the committed baseline (both files) is byte-unchanged since that green
//     run the gate takes the best of each fact; a missing artifact means the committed baseline alone, reported.
// Exit: 0 pass, 1 measured regression, 2 fail closed.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { z } from 'zod';

import {
  FACTS_META_FILE,
  ProvenanceSchema,
  parseFactsMeta,
} from './facts-provenance.mjs';
import {
  FACTS_FILE,
  FACT_DEFS,
  parseFacts,
  setFactNames,
  unitKey,
} from './facts.mjs';

export const BASELINE_SCHEMA_VERSION = 1;
export const BASELINE_DIR = 'config/parity-runtime';
export const baselinePath = (measure) =>
  `${BASELINE_DIR}/baseline-${measure}.json`;
export const baselineSetsPath = (measure) =>
  `${BASELINE_DIR}/baseline-${measure}.sets.ndjson`;

/** A distance that grows by no more than this (relative to max(1, baseline)) is not worse. The term rule's tolerance. */
export const DISTANCE_TOLERANCE = 1e-9;

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const hex = (min, max) =>
  z.string().regex(new RegExp(`^[a-f0-9]{${min},${max}}$`));

export const NoteSchema = z.strictObject({
  /** The merge or head SHA the change is recorded against (7 to 40 hex). */
  sha: hex(7, 40),
  /** The PR number, or null for a seed. */
  pr: z.int().positive().nullable(),
  reason: z.string().min(1),
  /** Unit keys (`family/unitId`) the change names; may be empty for a seed. */
  units: z.array(z.string().min(1)),
});

export class GateError extends Error {
  constructor(reason, message) {
    super(`${reason}: ${message}`);
    this.name = 'GateError';
    this.reason = reason;
  }
}

export const populationHash = (keys) =>
  sha256([...keys].sort().join('\n') + '\n');

/**
 * The member-set hash. ONE function, used by --write-baseline (both files) and by the integrity check at load:
 * the first 16 hex of the sha256 of the sorted members joined by newlines. It is an integrity and review aid
 * (the main file shows a unit's set size and hash, so a changed set is visible in both files); the sets
 * themselves are compared exactly, member by member.
 */
export const setHash = (members) =>
  sha256([...members].join('\n')).slice(0, 16);

const factValue = z.union([
  z.boolean(),
  z.number().min(0),
  z.array(z.string()),
  z.null(),
]);

/** The logical baseline: every fact in full, sets as arrays. */
export const BaselineSchema = z.strictObject({
  schemaVersion: z.literal(BASELINE_SCHEMA_VERSION),
  measure: z.enum(Object.keys(FACT_DEFS)),
  /** The commit the run was made at: must be an ancestor of any run the baseline gates. */
  sha: hex(40, 40),
  ...ProvenanceSchema.shape,
  populationCount: z.int().min(0),
  /** sha256 of the sorted unit keys, newline-terminated: proves the unit list was not edited by hand. */
  populationHash: hex(64, 64),
  notes: z.array(NoteSchema).min(1),
  units: z.record(z.string(), z.record(z.string(), factValue)),
});

/** Throws `GateError('BASELINE_MALFORMED', ...)` on anything that is not a well-formed baseline of `measure`. */
export function validateBaseline(measure, baseline) {
  const parsed = BaselineSchema.safeParse(baseline);
  if (!parsed.success)
    throw new GateError(
      'BASELINE_MALFORMED',
      parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; '),
    );
  const value = parsed.data;
  if (value.measure !== measure)
    throw new GateError(
      'BASELINE_MALFORMED',
      `baseline is for ${value.measure}, not ${measure}`,
    );
  const defs = FACT_DEFS[measure];
  for (const [key, facts] of Object.entries(value.units)) {
    for (const [name, kind] of Object.entries(defs)) {
      if (!(name in facts))
        throw new GateError(
          'BASELINE_MALFORMED',
          `${key} has no baseline entry for gated fact ${name}`,
        );
      const v = facts[name];
      const ok =
        v === null ||
        (kind === 'bool' && typeof v === 'boolean') ||
        (kind === 'distance' && typeof v === 'number') ||
        (kind === 'set' && Array.isArray(v));
      if (!ok)
        throw new GateError(
          'BASELINE_MALFORMED',
          `${key}.${name} is not a ${kind} or unknown`,
        );
    }
    for (const name of Object.keys(facts))
      if (!(name in defs))
        throw new GateError(
          'BASELINE_MALFORMED',
          `${key} has an unknown fact ${name}`,
        );
  }
  const keys = Object.keys(value.units);
  if (value.populationCount !== keys.length)
    throw new GateError(
      'BASELINE_MALFORMED',
      `populationCount ${value.populationCount} is not the ${keys.length} units listed`,
    );
  if (value.populationHash !== populationHash(keys))
    throw new GateError(
      'BASELINE_MALFORMED',
      'populationHash does not match the units listed',
    );
  return value;
}

// --- the two committed files ----------------------------------------------------------------------------
//
// baseline-<measure>.json: text, valid JSON, one unit per line, sorted. A set fact is `{ "n": size, "h": hash }`.
// baseline-<measure>.sets.ndjson (measures with set facts): text, one line per unit, sorted:
//   {"u":"<family>/<unitId>","<setFact>":["<member>",...]}   (a set with no members is omitted; every unit has a line)

/** The committed text of a baseline: `{ main, sets }` (`sets` is null for a measure with no set facts). */
export function serializeBaseline(baseline) {
  const { units, notes, ...header } = baseline;
  const setNames = setFactNames(baseline.measure);
  const keys = Object.keys(units).sort();
  const mainUnits = keys.map((key) => {
    const facts = Object.fromEntries(
      Object.entries(units[key]).map(([name, value]) => [
        name,
        setNames.includes(name) && Array.isArray(value)
          ? { n: value.length, h: setHash(value) }
          : value,
      ]),
    );
    return `    ${JSON.stringify(key)}: ${JSON.stringify(facts)}`;
  });
  const head = Object.entries(header).map(
    ([key, value]) => `  ${JSON.stringify(key)}: ${JSON.stringify(value)}`,
  );
  const noteLines = notes
    .map((note) => `    ${JSON.stringify(note)}`)
    .join(',\n');
  const main = `{\n${head.join(',\n')},\n  "notes": [\n${noteLines}\n  ],\n  "units": {\n${mainUnits.join(',\n')}\n  }\n}\n`;
  if (!setNames.length) return { main, sets: null };
  const sets = keys
    .map((key) => {
      const line = { u: key };
      for (const name of setNames) {
        const members = units[key][name];
        if (Array.isArray(members) && members.length) line[name] = members;
      }
      return JSON.stringify(line) + '\n';
    })
    .join('');
  return { main, sets };
}

const mismatch = (message, ids) =>
  new GateError(
    'BASELINE_SIDECAR_MISMATCH',
    ids?.length ? `${message}: ${ids.join(', ')}` : message,
  );

/**
 * Read both committed files back into the logical baseline, checking the sidecar against the main file FIRST:
 * every unit's set size and hash, and that the two files list exactly the same units. Throws
 * BASELINE_SIDECAR_MISMATCH (naming unit ids) or BASELINE_MALFORMED.
 */
export function parseBaseline(
  measure,
  mainText,
  setsText,
  { verify = true } = {},
) {
  let main;
  try {
    main = JSON.parse(mainText);
  } catch (error) {
    throw new GateError(
      'BASELINE_MALFORMED',
      `not valid JSON: ${error.message}`,
    );
  }
  const setNames = FACT_DEFS[measure] ? setFactNames(measure) : [];
  if (
    main === null ||
    typeof main !== 'object' ||
    !main.units ||
    !setNames.length
  )
    return validateBaseline(measure, main);

  if (verify && (setsText === null || setsText === undefined))
    throw mismatch(
      `the sidecar ${baselineSetsPath(measure)} is missing; the baseline cannot be checked`,
    );
  const sidecar = new Map();
  const malformed = [];
  (setsText ?? '')
    .split('\n')
    .filter(Boolean)
    .forEach((line, index) => {
      try {
        const entry = JSON.parse(line);
        const valid =
          entry &&
          typeof entry.u === 'string' &&
          Object.keys(entry).every(
            (k) =>
              k === 'u' ||
              (setNames.includes(k) &&
                Array.isArray(entry[k]) &&
                entry[k].every((m) => typeof m === 'string')),
          );
        if (!valid) throw new Error('not a sidecar line');
        if (sidecar.has(entry.u)) throw new Error('unit listed twice');
        sidecar.set(entry.u, entry);
      } catch {
        malformed.push(`line ${index + 1}`);
      }
    });
  if (verify && malformed.length)
    throw mismatch('the sidecar has malformed line(s)', malformed);

  const mainKeys = Object.keys(main.units);
  const missingFromSidecar = mainKeys.filter((key) => !sidecar.has(key));
  const extraInSidecar = [...sidecar.keys()].filter(
    (key) => !(key in main.units),
  );
  if (verify && (missingFromSidecar.length || extraInSidecar.length))
    throw mismatch(
      `the files list different units (${missingFromSidecar.length} only in the main file, ${extraInSidecar.length} only in the sidecar)`,
      [...missingFromSidecar, ...extraInSidecar],
    );

  const bad = [];
  const units = {};
  for (const key of mainKeys) {
    const facts = { ...main.units[key] };
    for (const name of setNames) {
      const declared = facts[name];
      if (declared === null) continue; // an unknown baseline value claims nothing
      const members = sidecar.get(key)?.[name] ?? [];
      const wellFormed =
        !verify ||
        (declared &&
          typeof declared === 'object' &&
          declared.n === members.length &&
          declared.h === setHash(members) &&
          members.every((m, i) => i === 0 || members[i - 1] < m));
      if (!wellFormed) {
        bad.push(key);
        break;
      }
      facts[name] = members;
    }
    units[key] = facts;
  }
  if (bad.length)
    throw mismatch(
      "a unit's members do not match the size and hash recorded in the main file",
      bad,
    );
  return validateBaseline(measure, { ...main, units });
}

/**
 * Build a baseline from a complete run's facts. Refuses a run with any failed, incomplete or unknown unit, so
 * a baseline can never record a hole. `existing` (a parsed baseline) keeps its notes; `note` is required.
 */
export function buildBaseline({
  measure,
  facts,
  sha,
  note,
  provenance,
  existing = null,
}) {
  if (!facts.length)
    throw new GateError('BASELINE_REFUSED', 'the run has no units');
  const bad = facts.filter(
    (entry) =>
      entry.status !== 'ok' ||
      Object.values(entry.facts).some((value) => value === null),
  );
  if (bad.length)
    throw new GateError(
      'BASELINE_REFUSED',
      `${bad.length} unit(s) failed or have an unknown fact (first: ${unitKey(bad[0])}); a baseline records only a complete run`,
    );
  const checkedNote = NoteSchema.parse(note);
  const checkedProvenance = ProvenanceSchema.parse(provenance);
  const units = Object.fromEntries(
    facts
      .map((entry) => [unitKey(entry), entry.facts])
      .sort(([a], [b]) => (a < b ? -1 : 1)),
  );
  return validateBaseline(measure, {
    schemaVersion: BASELINE_SCHEMA_VERSION,
    measure,
    sha,
    ...checkedProvenance,
    populationCount: facts.length,
    populationHash: populationHash(Object.keys(units)),
    notes: [...(existing?.notes ?? []), checkedNote],
    units,
  });
}

// --- the rules (replaceable only so the test suite can prove each one is load-bearing) -------------------

const tolerance = (base) => DISTANCE_TOLERANCE * Math.max(1, Math.abs(base));

/** Why `tonight` is worse than `base` for a fact of `kind`, or null if it is not. null = unknown on either side. */
function worse(kind, base, tonight) {
  if (base === null) return null; // the baseline claims nothing
  if (tonight === null) return { why: 'known -> unknown' };
  if (kind === 'bool')
    return base === true && tonight === false ? { why: 'pass -> fail' } : null;
  if (kind === 'distance')
    return tonight > base + tolerance(base)
      ? { why: `distance grew ${base} -> ${tonight}` }
      : null;
  const baseSet = new Set(base);
  const added = tonight.filter((member) => !baseSet.has(member));
  return added.length
    ? { why: `gained ${added.length} member(s)`, added }
    : null;
}

/** Strictly better than `base`: used to list gains the committed baseline does not protect yet. */
function better(kind, base, tonight) {
  if (tonight === null) return false;
  if (base === null) return true;
  if (kind === 'bool') return base === false && tonight === true;
  if (kind === 'distance') return tonight < base - tolerance(base);
  return (
    tonight.length < base.length &&
    tonight.every((member) => base.includes(member))
  );
}

/** The best of two values of a fact (an unknown loses to a known value). */
function bestOf(kind, a, b) {
  if (a === null) return b;
  if (b === null) return a;
  if (kind === 'bool') return a || b;
  if (kind === 'distance') return Math.min(a, b);
  const other = new Set(b);
  return a.filter((member) => other.has(member));
}

export const defaultRules = {
  worse,
  better,
  bestOf,
  /** A missing or malformed committed baseline fails closed. */
  requireBaseline: true,
  /** The baseline's SHA must be an ancestor of the run. */
  requireAncestor: true,
  /** Units only in tonight's run are unbaselined and never fail; true would fail the night on them. */
  addedUnitsFail: false,
  /** A baseline unit absent from tonight's run fails closed (POPULATION_UNIT_REMOVED); false would ignore it. */
  removedUnitsFail: true,
  /** A missing last-green artifact is reported and never fails; true would fail the night. */
  missingLastGreenFails: false,
  /** Tighten to last green only while the committed baseline is byte-unchanged since that run. */
  requireSameBaselineBlob: true,
  /** Tonight's facts must come from the same facts.mjs (and facts schema) as the baseline's. */
  requireSameDeriver: true,
  /** The sidecar is checked against the main file at load (hashes, units, lines, presence). */
  verifySidecar: true,
};

// --- the evaluation -------------------------------------------------------------------------------------

/**
 * Pure comparison. `facts` is tonight's parsed facts (array), `provenance` where they came from, `baselineText` /
 * `setsText` the committed files' text (null if missing), `lastGreen` the parsed artifact or null, `run`
 * { sha, scope } from the receipt. `isAncestor(sha)` answers git's question. Returns the full report;
 * `exitCode` is 0, 1 or 2.
 */
export function evaluate(
  {
    measure,
    facts,
    provenance,
    baselineText,
    setsText = null,
    lastGreen,
    run,
    isAncestor,
  },
  rules = defaultRules,
) {
  const defs = FACT_DEFS[measure];
  const report = {
    schemaVersion: 1,
    measure,
    runSha: run?.sha ?? null,
    exitCode: 0,
    failClosed: [],
    regressions: [],
    gains: [],
    unprotectedGains: [],
    unbaselined: [],
    removed: [],
    population: { baseline: null, tonight: facts.length, overlap: 0 },
    provenance: { deriverChanged: false, referenceChanged: false },
    lastGreen: { status: 'not-used', detail: '' },
    headline: '',
  };
  const fail = (reason, message) => {
    report.failClosed.push({ reason, message });
    report.exitCode = 2;
  };

  // Tonight's run must be the whole population the receipt claims.
  if (run?.scope && run.scope.unitIds !== null)
    fail(
      'RUN_NARROWED',
      `the run measured ${run.scope.unitIds.length} units by --units, not the population`,
    );
  if (
    run?.scope &&
    typeof run.scope.populationCount === 'number' &&
    run.scope.populationCount !== facts.length
  )
    fail(
      'RUN_INCOMPLETE',
      `${facts.length} facts for a population of ${run.scope.populationCount}`,
    );

  // The committed baseline, checked against its sidecar before anything is compared.
  let baseline = null;
  if (baselineText === null || baselineText === undefined) {
    if (rules.requireBaseline)
      fail('BASELINE_MISSING', `no committed baseline for ${measure}`);
  } else {
    try {
      baseline = parseBaseline(measure, baselineText, setsText, {
        verify: rules.verifySidecar,
      });
    } catch (error) {
      if (rules.requireBaseline)
        fail(
          error.reason ?? 'BASELINE_MALFORMED',
          error.message.replace(/^[A-Z_]+: /, ''),
        );
    }
  }
  if (baseline && rules.requireAncestor) {
    let ancestor = false;
    try {
      ancestor = isAncestor(baseline.sha);
    } catch (error) {
      fail(
        'BASELINE_SHA_UNCHECKABLE',
        `could not check ${baseline.sha}: ${error.message}`,
      );
      ancestor = true; // already failed closed; do not double-report
    }
    if (!ancestor)
      fail(
        'BASELINE_SHA_NOT_ANCESTOR',
        `${baseline.sha} is not an ancestor of the run ${run?.sha ?? '?'}`,
      );
  }
  // Facts derived by a different facts.mjs cannot be compared with this baseline: rebaseline.
  if (baseline) {
    if (!provenance)
      fail('FACTS_PROVENANCE_MISSING', `no ${FACTS_META_FILE} for the facts`);
    else {
      if (provenance.referenceSha256 !== baseline.referenceSha256)
        report.provenance.referenceChanged = true;
      if (
        rules.requireSameDeriver &&
        provenance.factsSchemaVersion !== baseline.factsSchemaVersion
      ) {
        report.provenance.deriverChanged = true;
        fail(
          'FACTS_SCHEMA_CHANGED',
          `the facts are schema ${provenance.factsSchemaVersion}, the baseline's are ${baseline.factsSchemaVersion}; a rebaseline PR is the fix`,
        );
      }
      if (
        rules.requireSameDeriver &&
        provenance.factsDeriverBlob !== baseline.factsDeriverBlob
      ) {
        report.provenance.deriverChanged = true;
        fail(
          'FACTS_DERIVER_CHANGED',
          `facts.mjs is ${provenance.factsDeriverBlob} but the baseline's facts came from ${baseline.factsDeriverBlob}; a rebaseline PR is the fix`,
        );
      }
    }
  }
  if (report.exitCode === 2 || !baseline) {
    report.headline = report.failClosed.length
      ? `FAIL CLOSED: ${report.failClosed.map((f) => f.reason).join(', ')}`
      : 'NO BASELINE (the rule that requires one is switched off)';
    return report;
  }

  const baselineSha256 = sha256(
    Buffer.concat([
      Buffer.from(baselineText),
      Buffer.from('\0'),
      Buffer.from(setsText ?? ''),
    ]),
  );
  report.population.baseline = Object.keys(baseline.units).length;
  const tonight = new Map(facts.map((entry) => [unitKey(entry), entry]));

  // Last-green: tighten only while the committed baseline is byte-unchanged since that green run.
  let tightening = null;
  if (!lastGreen) {
    report.lastGreen = {
      status: 'missing',
      detail:
        'no last-green artifact (missing or expired): the committed baseline alone was used',
    };
    if (rules.missingLastGreenFails) {
      fail('LAST_GREEN_MISSING', report.lastGreen.detail);
      report.headline = 'FAIL CLOSED: LAST_GREEN_MISSING';
      return report;
    }
  } else if (
    lastGreen.measure !== measure ||
    (rules.requireSameBaselineBlob &&
      lastGreen.baselineSha256 !== baselineSha256)
  ) {
    report.lastGreen = {
      status: 'stale',
      detail: `last green (${lastGreen.runSha ?? '?'}) was measured against a different baseline: the committed baseline alone was used`,
    };
  } else {
    tightening = lastGreen.units;
    report.lastGreen = {
      status: 'applied',
      detail: `tightened to the last green nightly (${lastGreen.runSha ?? '?'})`,
    };
  }

  const proposed = {};
  for (const [key, baseFacts] of Object.entries(baseline.units)) {
    const now = tonight.get(key);
    if (!now) {
      report.removed.push(key);
      continue;
    }
    report.population.overlap++;
    const proposedFacts = {};
    for (const [name, kind] of Object.entries(defs)) {
      const committed = baseFacts[name];
      const value = now.facts[name];
      let effective = committed;
      let source = 'baseline';
      const lg = tightening?.[key]?.[name];
      if (tightening && lg !== undefined) {
        const tighter = rules.bestOf(kind, committed, lg);
        if (JSON.stringify(tighter) !== JSON.stringify(committed))
          source = 'last-green';
        effective = tighter;
      }
      const bad = rules.worse(kind, effective, value);
      if (bad)
        report.regressions.push({
          unit: key,
          fact: name,
          source,
          base: effective,
          tonight: value,
          ...bad,
        });
      else if (rules.better(kind, committed, value)) {
        report.gains.push({
          unit: key,
          fact: name,
          from: committed,
          to: value,
        });
        report.unprotectedGains.push({
          unit: key,
          fact: name,
          from: committed,
          to: value,
        });
      }
      proposedFacts[name] = rules.bestOf(kind, committed, value);
    }
    proposed[key] = proposedFacts;
  }
  for (const [key, entry] of tonight)
    if (!(key in baseline.units)) {
      report.unbaselined.push(key);
      proposed[key] = entry.facts;
      if (rules.addedUnitsFail)
        report.regressions.push({
          unit: key,
          fact: '*',
          source: 'baseline',
          why: 'not in the baseline',
        });
    }
  report.unbaselined.sort();
  report.removed.sort();
  if (report.removed.length && rules.removedUnitsFail)
    fail(
      'POPULATION_UNIT_REMOVED',
      `${report.removed.length} baseline unit(s) are absent from the run (removed or renamed): ${report.removed.slice(0, 50).join(', ')}${report.removed.length > 50 ? ', ...' : ''}. A PR that removes or renames units regenerates the baseline.`,
    );
  report.proposedBaseline = {
    proposal: true,
    note: 'Unfolded gains and unbaselined units; a rebaseline PR writes the real baseline with the port --write-baseline.',
    measure,
    runSha: run?.sha ?? null,
    unprotectedGains: report.unprotectedGains,
    unbaselined: report.unbaselined,
    units: Object.fromEntries(
      Object.entries(proposed).sort(([a], [b]) => (a < b ? -1 : 1)),
    ),
  };
  if (report.exitCode !== 2)
    report.exitCode = report.regressions.length ? 1 : 0;
  const worseUnits = new Set(report.regressions.map((r) => r.unit));
  report.headline =
    report.exitCode === 2
      ? `FAIL CLOSED: ${report.failClosed.map((f) => f.reason).join(', ')}` +
        (report.regressions.length
          ? `; ${worseUnits.size} unit(s) also worse`
          : '')
      : report.exitCode === 1
        ? `REGRESSION: ${worseUnits.size} unit(s) worse`
        : `PASS: ${report.population.overlap} units gated, ${report.gains.length} unprotected gain(s), ${report.unbaselined.length} unbaselined`;
  if (report.exitCode === 0)
    report.lastGreenOut = {
      schemaVersion: 1,
      measure,
      runSha: run?.sha ?? null,
      baselineSha256,
      units: Object.fromEntries(
        [...tonight].map(([key, entry]) => [key, entry.facts]),
      ),
    };
  return report;
}

// --- command line ---------------------------------------------------------------------------------------

const gitIsAncestor = (repo, ancestor, descendant) => {
  try {
    execFileSync(
      'git',
      ['-C', repo, 'merge-base', '--is-ancestor', ancestor, descendant],
      { stdio: 'ignore' },
    );
    return true;
  } catch (error) {
    if (error.status === 1) return false;
    throw error;
  }
};

export function main(argv = process.argv.slice(2), deps = {}) {
  const { values } = parseArgs({
    args: argv,
    options: {
      measure: { type: 'string' },
      'run-dir': { type: 'string' },
      baseline: { type: 'string' },
      'last-green': { type: 'string' },
      repo: { type: 'string', default: process.cwd() },
      out: { type: 'string' },
    },
  });
  if (!values.measure || !values['run-dir'])
    throw new Error(
      'Required: --measure <load|reopen> --run-dir <port output dir>',
    );
  const measure = values.measure;
  if (!FACT_DEFS[measure])
    throw new Error(
      `--measure must be one of ${Object.keys(FACT_DEFS).join(', ')}`,
    );
  const repo = path.resolve(values.repo);
  const runDir = path.resolve(values['run-dir']);
  const out = path.resolve(values.out ?? path.join(runDir, 'gate'));
  const baselineFile = path.resolve(
    repo,
    values.baseline ?? baselinePath(measure),
  );
  // The sidecar sits beside the main file: baseline-<measure>.json -> baseline-<measure>.sets.ndjson.
  const setsFile = baselineFile.replace(/\.json$/, '.sets.ndjson');

  const read = (file) =>
    fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  fs.mkdirSync(out, { recursive: true });
  const write = (name, value) =>
    fs.writeFileSync(
      path.join(out, name),
      typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n',
    );

  let report;
  try {
    const receiptText = read(path.join(runDir, 'receipt.json'));
    const factsText = read(path.join(runDir, FACTS_FILE));
    const metaText = read(path.join(runDir, FACTS_META_FILE));
    if (receiptText === null || factsText === null)
      throw new GateError(
        'RUN_INCOMPLETE',
        `${runDir} has no receipt.json and ${FACTS_FILE}`,
      );
    const receipt = JSON.parse(receiptText);
    if (receipt.measure !== measure)
      throw new GateError(
        'RUN_INCOMPLETE',
        `the run is ${receipt.measure}, not ${measure}`,
      );
    let facts;
    try {
      facts = parseFacts(measure, factsText);
    } catch (error) {
      throw new GateError('FACTS_MALFORMED', error.message);
    }
    let provenance = null;
    if (metaText !== null)
      try {
        const meta = parseFactsMeta(metaText);
        if (meta.measure !== measure)
          throw new Error(`${FACTS_META_FILE} is for ${meta.measure}`);
        provenance = {
          factsSchemaVersion: meta.factsSchemaVersion,
          factsDeriverBlob: meta.factsDeriverBlob,
          referenceSha256: meta.referenceSha256,
        };
      } catch (error) {
        throw new GateError('FACTS_MALFORMED', error.message);
      }
    const lastGreenText = values['last-green']
      ? read(path.resolve(values['last-green']))
      : null;
    let lastGreen = null;
    if (lastGreenText !== null)
      try {
        lastGreen = JSON.parse(lastGreenText);
      } catch {
        lastGreen = null; // an unreadable artifact is treated as missing, and reported as such
      }
    report = evaluate(
      {
        measure,
        facts,
        provenance,
        baselineText: read(baselineFile),
        setsText: read(setsFile),
        lastGreen,
        run: { sha: receipt.repoSha, scope: receipt.scope },
        isAncestor: (sha) =>
          (deps.isAncestor ?? ((a) => gitIsAncestor(repo, a, receipt.repoSha)))(
            sha,
          ),
      },
      deps.rules,
    );
  } catch (error) {
    if (!(error instanceof GateError)) throw error;
    report = {
      schemaVersion: 1,
      measure,
      exitCode: 2,
      failClosed: [
        {
          reason: error.reason,
          message: error.message.replace(/^[A-Z_]+: /, ''),
        },
      ],
      regressions: [],
      headline: `FAIL CLOSED: ${error.reason}`,
    };
  }
  const { proposedBaseline, lastGreenOut, ...summary } = report;
  write('gate-report.json', summary);
  write(
    'gate-units.ndjson',
    [
      ...report.regressions.map((r) => ({ verdict: 'regression', ...r })),
      ...(report.removed ?? []).map((unit) => ({ verdict: 'removed', unit })),
      ...(report.gains ?? []).map((g) => ({ verdict: 'gain', ...g })),
      ...(report.unbaselined ?? []).map((unit) => ({
        verdict: 'unbaselined',
        unit,
      })),
    ]
      .map((line) => JSON.stringify(line) + '\n')
      .join(''),
  );
  if (proposedBaseline) write('proposed-baseline.json', proposedBaseline);
  if (lastGreenOut) write('last-green.json', lastGreenOut);
  console.log(report.headline);
  if (report.lastGreen)
    console.log(
      `last green: ${report.lastGreen.status}${report.lastGreen.detail ? ` (${report.lastGreen.detail})` : ''}`,
    );
  if (report.provenance?.referenceChanged)
    console.log(
      'note: the Java reference differs from the one the baseline was derived with (not a failure)',
    );
  for (const r of report.regressions.slice(0, 50))
    console.log(`  ${r.unit} ${r.fact}: ${r.why}`);
  if (report.regressions.length > 50)
    console.log(
      `  ... ${report.regressions.length - 50} more in gate-units.ndjson`,
    );
  for (const f of report.failClosed) console.log(`  ${f.reason}: ${f.message}`);
  return report.exitCode;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  process.exitCode = main();
