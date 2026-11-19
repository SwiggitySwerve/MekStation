// The one owner of the runtime-parity family registry (config/parity-runtime/families.json) and of every name
// derived from a (family, measure) leg. parity-runtime.yml reads the names through `resolve`, parity-census.yml and
// Nightly read the matrix through `plan`, and parity-runtime-last-green.mjs imports parityRuntimeNames. Node built-ins
// only: the plan step runs before (and without) npm ci.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

export const REGISTRY_PATH = 'config/parity-runtime/families.json';
export const REGISTRY_SCHEMA_VERSION = 1;
/** The family that keeps the names it had before families (artifacts, last-green chain, output dir). */
export const DEFAULT_FAMILY = 'battlemechs';
export const MEASURES = Object.freeze(['load', 'reopen']);

/**
 * The deriver-fingerprint field names, kept here only. Until C2's split (V1.5) facts-meta and the baseline header
 * carry one shared `factsDeriverBlob` (legacy, not malformed); from the split they carry `coreDeriverSha` (shared core)
 * and `familyDeriverSha` (that family's deriver and fact table). The registry holds both new fields, null until then.
 * Values are read from the gate report or facts-meta, never recomputed here.
 */
export const DERIVER_FIELDS = Object.freeze({
  core: 'coreDeriverSha',
  family: 'familyDeriverSha',
  legacy: 'factsDeriverBlob',
});
/** The gate's reason code for a deriver change; the gate's own message says which part changed. */
export const DERIVER_CHANGED_REASON = 'FACTS_DERIVER_CHANGED';

const FAMILY_ID = /^[a-z][a-z0-9-]*$/;
// Entry flags reach the census command line unquoted in a bash array, so only plain tokens are allowed.
const FLAG_TOKEN = /^[A-Za-z0-9._=/-]+$/;
const GIT_HASH = /^[0-9a-f]{40}(?:[0-9a-f]{24})?$/;
const ENTRY_KEYS = [
  'enabled',
  'expectedUnits',
  'entryFlags',
  'baselines',
  'timeoutMinutes',
  DERIVER_FIELDS.core,
  DERIVER_FIELDS.family,
];

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const isPositiveInteger = (value) => Number.isSafeInteger(value) && value > 0;

function keysProblem(where, value, expected) {
  const keys = Object.keys(value);
  const missing = expected.filter((key) => !keys.includes(key));
  const extra = keys.filter((key) => !expected.includes(key));
  return missing.length || extra.length
    ? `${where}: ${[missing.length && `missing ${missing.join(', ')}`, extra.length && `unknown ${extra.join(', ')}`].filter(Boolean).join('; ')}`
    : null;
}

function entryProblems(family, entry) {
  const where = `families.${family}`;
  if (!FAMILY_ID.test(family))
    return [`${where}: a family id is lowercase letters, digits and dashes`];
  if (!isObject(entry)) return [`${where}: must be an object`];
  const keys = keysProblem(where, entry, ENTRY_KEYS);
  if (keys) return [keys];
  const problems = [];
  if (typeof entry.enabled !== 'boolean')
    problems.push(`${where}.enabled: must be true or false`);
  if (!isPositiveInteger(entry.expectedUnits))
    problems.push(`${where}.expectedUnits: must be a positive integer`);
  if (
    !Array.isArray(entry.entryFlags) ||
    entry.entryFlags.some(
      (flag) => typeof flag !== 'string' || !FLAG_TOKEN.test(flag),
    )
  )
    problems.push(
      `${where}.entryFlags: must be a list of plain tokens (${FLAG_TOKEN})`,
    );
  if (entry.baselines !== null) {
    if (!isObject(entry.baselines))
      problems.push(`${where}.baselines: must be null or an object`);
    else {
      const baselineKeys = keysProblem(
        `${where}.baselines`,
        entry.baselines,
        MEASURES,
      );
      if (baselineKeys) problems.push(baselineKeys);
      else
        for (const measure of MEASURES) {
          const files = entry.baselines[measure];
          const at = `${where}.baselines.${measure}`;
          if (!isObject(files)) {
            problems.push(`${at}: must be { main, sets }`);
            continue;
          }
          const fileKeys = keysProblem(at, files, ['main', 'sets']);
          if (fileKeys) problems.push(fileKeys);
          else if (
            typeof files.main !== 'string' ||
            !files.main.endsWith('.json') ||
            (files.sets !== null &&
              (typeof files.sets !== 'string' ||
                !files.sets.endsWith('.sets.ndjson')))
          )
            problems.push(
              `${at}: main is a .json path, sets is a .sets.ndjson path or null`,
            );
        }
    }
  }
  if (
    !isObject(entry.timeoutMinutes) ||
    keysProblem(`${where}.timeoutMinutes`, entry.timeoutMinutes, MEASURES) ||
    MEASURES.some(
      (measure) =>
        entry.timeoutMinutes[measure] !== null &&
        !isPositiveInteger(entry.timeoutMinutes[measure]),
    )
  )
    problems.push(
      `${where}.timeoutMinutes: { load, reopen }, each a positive integer or null (owner-held)`,
    );
  for (const field of [DERIVER_FIELDS.core, DERIVER_FIELDS.family])
    if (
      entry[field] !== null &&
      (typeof entry[field] !== 'string' || !GIT_HASH.test(entry[field]))
    )
      problems.push(`${where}.${field}: must be null or a git blob hash`);
  if (entry.enabled === true && !problems.length) {
    if (entry.baselines === null)
      problems.push(`${where}: an enabled family needs its baselines`);
    if (MEASURES.some((measure) => entry.timeoutMinutes[measure] === null))
      problems.push(
        `${where}: an enabled family needs both timeouts (set by the owner)`,
      );
  }
  return problems;
}

/** Throws one Error listing every problem; returns the registry unchanged when it is valid. */
export function validateRegistry(registry) {
  const problems = [];
  if (!isObject(registry)) problems.push('the registry must be an object');
  else {
    const keys = keysProblem('registry', registry, [
      'schemaVersion',
      'families',
    ]);
    if (keys) problems.push(keys);
    else {
      if (registry.schemaVersion !== REGISTRY_SCHEMA_VERSION)
        problems.push(`schemaVersion must be ${REGISTRY_SCHEMA_VERSION}`);
      if (!isObject(registry.families))
        problems.push('families must be an object');
      else {
        if (!Object.hasOwn(registry.families, DEFAULT_FAMILY))
          problems.push(`families must include ${DEFAULT_FAMILY}`);
        for (const [family, entry] of Object.entries(registry.families))
          problems.push(...entryProblems(family, entry));
      }
    }
  }
  if (problems.length)
    throw new Error(`${REGISTRY_PATH} is invalid:\n- ${problems.join('\n- ')}`);
  return registry;
}

export function readRegistry(root = process.cwd()) {
  return validateRegistry(
    JSON.parse(fs.readFileSync(path.join(root, REGISTRY_PATH), 'utf8')),
  );
}

export const enabledFamilies = (registry) =>
  Object.keys(registry.families).filter(
    (family) => registry.families[family].enabled,
  );

/**
 * Every name a (family, measure) leg uses. The default family keeps today's names, so its last-green chain and
 * artifacts are unchanged; every other family carries its id.
 */
export function parityRuntimeNames(family, measure) {
  if (typeof family !== 'string' || !FAMILY_ID.test(family))
    throw new Error(`invalid family '${family}'`);
  if (!MEASURES.includes(measure))
    throw new Error(`measure must be one of ${MEASURES.join(', ')}`);
  const isDefault = family === DEFAULT_FAMILY;
  const leg = isDefault ? measure : `${family}-${measure}`;
  return {
    census: `parity-runtime-${leg}`,
    lastGreen: `parity-runtime-last-green-${leg}`,
    outDir: isDefault ? 'parity-runtime' : `parity-runtime-${family}`,
  };
}

function enabledEntry(registry, family) {
  const entry = registry.families[family];
  if (!entry)
    throw new Error(
      `unknown family '${family}'; the registry (${REGISTRY_PATH}) lists ${Object.keys(registry.families).join(', ')}`,
    );
  if (!entry.enabled)
    throw new Error(
      `family '${family}' is disabled in ${REGISTRY_PATH}; it can't be censused until it is enabled there`,
    );
  return entry;
}

/** The matrix of (family, measure, timeout) legs for `families` ("all" or a comma list) × `measures` (load|reopen|both). */
export function planCensus(registry, { families, measures }) {
  const requested = String(families ?? '').trim();
  const selected =
    requested === 'all'
      ? enabledFamilies(registry)
      : [
          ...new Set(
            requested
              .split(',')
              .map((family) => family.trim())
              .filter(Boolean),
          ),
        ];
  if (!selected.length)
    throw new Error(
      requested === 'all'
        ? 'no family is enabled in the registry'
        : 'families must be "all" or a comma list of family ids',
    );
  const measureList =
    measures === 'both'
      ? [...MEASURES]
      : MEASURES.includes(measures)
        ? [measures]
        : null;
  if (!measureList)
    throw new Error(`measures must be load, reopen or both, not '${measures}'`);
  const include = [];
  for (const family of selected) {
    const entry = enabledEntry(registry, family);
    for (const measure of measureList)
      include.push({
        family,
        measure,
        timeout: entry.timeoutMinutes[measure],
      });
  }
  return { include };
}

/**
 * What one parity-runtime.yml job needs from the registry. `timeoutInput` is the workflow's `timeout-minutes` input:
 * the job's limit comes from it, so a family other than the default must be called with its registry value (through
 * parity-census.yml or Nightly). The default family may omit it (0) and fall back to the workflow's own values.
 */
export function resolveLeg(registry, { family, measure, timeoutInput }) {
  const entry = enabledEntry(registry, family);
  const names = parityRuntimeNames(family, measure);
  const expected = entry.timeoutMinutes[measure];
  const given = Number(timeoutInput || 0);
  if (given !== expected && !(family === DEFAULT_FAMILY && given === 0))
    throw new Error(
      `${family} ${measure} must run with the registry's ${expected}-minute timeout, not ${given || 'none'}; dispatch it through parity-census.yml`,
    );
  return { ...names, entryFlags: entry.entryFlags.join(' ') };
}

/**
 * The registry's part of a deriver-change message: which enabled families must be rebaselined. The gate's own
 * fail-closed message (shown verbatim beside this) says what changed, and its report says which fingerprint did
 * (`provenance.deriverChangedParts`). Only the family's own deriver changed: that family alone rebaselines. The shared
 * core, a pre-split baseline, or a report that does not say: every enabled family.
 */
export function rebaselineNotice(report, registry) {
  if (!report?.failClosed?.some((row) => row.reason === DERIVER_CHANGED_REASON))
    return null;
  const parts = report.provenance?.deriverChangedParts ?? [];
  if (parts.length && parts.every((part) => part === 'family'))
    return familyDeriverChangedMessage([report.family ?? DEFAULT_FAMILY]);
  return deriverChangedMessage(registry);
}

/** The one wording of a deriver change, shared by the job summary and the dispatch wrapper's pre-check. */
export const deriverChangedMessage = (registry) =>
  `deriver fingerprint changed (shared core): every enabled family (${enabledFamilies(registry).join(', ')}) must be rebaselined before its gate can pass.`;

/** The wording when only some families' own derivers changed: those families rebaseline, nobody else. */
export const familyDeriverChangedMessage = (families) =>
  `deriver fingerprint changed (${families.join(', ')} deriver): only ${families.join(', ')} must be rebaselined before its gate can pass.`;

function writeOutputs(outputs) {
  const text = Object.entries(outputs)
    .map(([key, value]) => `${key}=${value}\n`)
    .join('');
  if (process.env.GITHUB_OUTPUT)
    fs.appendFileSync(process.env.GITHUB_OUTPUT, text);
  else process.stdout.write(text);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const { positionals, values } = parseArgs({
      allowPositionals: true,
      options: {
        families: { type: 'string' },
        measures: { type: 'string' },
        family: { type: 'string' },
        measure: { type: 'string' },
        'timeout-minutes': { type: 'string' },
      },
    });
    const registry = readRegistry();
    if (positionals[0] === 'plan') {
      const matrix = planCensus(registry, values);
      for (const leg of matrix.include)
        console.log(
          `plan: ${leg.family} ${leg.measure} (timeout ${leg.timeout} min)`,
        );
      writeOutputs({ matrix: JSON.stringify(matrix) });
    } else if (positionals[0] === 'resolve') {
      const leg = resolveLeg(registry, {
        family: values.family,
        measure: values.measure,
        timeoutInput: values['timeout-minutes'],
      });
      writeOutputs({
        'census-artifact': leg.census,
        'last-green-artifact': leg.lastGreen,
        'out-dir': leg.outDir,
        'entry-flags': leg.entryFlags,
      });
    } else
      throw new Error(
        'usage: parity-runtime-families.mjs plan --families <all|a,b> --measures <load|reopen|both> | resolve --family <f> --measure <m> [--timeout-minutes <n>]',
      );
  } catch (error) {
    console.error(`::error::${error.message.split('\n').join('%0A')}`);
    process.exitCode = 1;
  }
}
