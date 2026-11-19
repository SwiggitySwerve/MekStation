// The shared core of the per-unit facts: what every family's facts depend on. The fact kinds and their value contract,
// the facts-row identity, the shared helpers, and reading/writing facts.ndjson against a family's fact table.
// Its git blob is `coreDeriverSha` (facts-provenance.mjs): changing this file rebaselines EVERY family. A family's
// own table and derivers live in facts-<family>.mjs (`familyDeriverSha`), so changing them rebaselines that family only.
//
// A fact is one of three kinds, and every one can also be UNKNOWN (null). Unknown is never a pass.
//   bool      true = pass. Worse: true -> false.
//   distance  a non-negative distance from the target (|runtime - Java|). Worse: it grows beyond tolerance.
//   set       a sorted, duplicate-free list of strings (cells, mounts). Worse: it gains members.
// An error row has every fact unknown.
import { z } from 'zod';

export const FACTS_FILE = 'facts.ndjson';
// 2: the load measure gained previewEqualsStatus (gated) and a per-unit `reported` block (previewStatusDistance,
// reported and NOT gated), both about the record sheet's BV.
export const FACTS_SCHEMA_VERSION = 2;

/** The identity fields of a facts row, in their written order. */
export const identity = (row) => ({
  schemaVersion: FACTS_SCHEMA_VERSION,
  measure: row.measure,
  family: row.family,
  unitId: row.unitId,
  path: row.path,
});

/** The unit's key in a baseline. Unit ids are unique per family. */
export const unitKey = (entry) => `${entry.family}/${entry.unitId}`;

/** Every fact of a table, unknown: what an error row carries. */
export const unknownOf = (defs) =>
  Object.fromEntries(Object.keys(defs).map((name) => [name, null]));

export const distance = (a, b) =>
  a === null || b === null || a === undefined || b === undefined
    ? null
    : Math.abs(a - b);
export const sortedSet = (items) => [...new Set(items)].sort();

/** One value contract for run facts, committed baselines and optional last green. */
export function isFactValue(kind, value) {
  return (
    value === null ||
    (kind === 'bool' && typeof value === 'boolean') ||
    (kind === 'distance' && Number.isFinite(value) && value >= 0) ||
    (kind === 'set' &&
      Array.isArray(value) &&
      value.every(
        (item, i) =>
          typeof item === 'string' && (i === 0 || value[i - 1] < item),
      ))
  );
}

const factSchema = (kind) =>
  z.unknown().refine((value) => isFactValue(kind, value), {
    message:
      kind === 'set'
        ? 'a set fact must be sorted, duplicate-free strings or unknown'
        : `a ${kind} fact must have a valid value or be unknown`,
  });

const factsSchemaFor = (measure, family, { facts, reported }) =>
  z.strictObject({
    schemaVersion: z.literal(FACTS_SCHEMA_VERSION),
    measure: z.literal(measure),
    family: z.literal(family),
    unitId: z.string().min(1),
    path: z.string().min(1),
    status: z.enum(['ok', 'error']),
    reported: z.strictObject(
      Object.fromEntries(
        Object.entries(reported).map(([name, kind]) => [
          name,
          factSchema(kind),
        ]),
      ),
    ),
    facts: z.strictObject(
      Object.fromEntries(
        Object.entries(facts).map(([name, kind]) => [name, factSchema(kind)]),
      ),
    ),
  });

/**
 * Reading and writing facts.ndjson against the fact tables `tables(measure, family)` returns ({facts, reported}, or
 * undefined for a family or measure with none). The registry (facts.mjs) supplies it.
 */
export function factsIO(tables) {
  /** Throws with the unit named when an entry is not a facts row of the measure (read with its own family's fact table). */
  function validateFacts(measure, entry) {
    const family = entry?.family;
    const table =
      typeof family === 'string' ? tables(measure, family) : undefined;
    if (!table)
      throw new Error(
        `facts row for ${entry?.unitId ?? '?'} is malformed: no ${measure} facts for the family ${family}`,
      );
    const result = factsSchemaFor(measure, family, table).safeParse(entry);
    if (!result.success)
      throw new Error(
        `facts row for ${entry?.unitId ?? '?'} is malformed: ${result.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; ')}`,
      );
    return result.data;
  }

  /** Sorted by (family, unitId), one JSON line each, validated. */
  function serializeFacts(measure, entries) {
    return [...entries]
      .map((entry) => validateFacts(measure, entry))
      .sort((a, b) =>
        unitKey(a) < unitKey(b) ? -1 : unitKey(a) > unitKey(b) ? 1 : 0,
      )
      .map((entry) => JSON.stringify(entry) + '\n')
      .join('');
  }

  function parseFacts(measure, text) {
    const entries = text
      .split('\n')
      .filter(Boolean)
      .map((line, index) => {
        try {
          return validateFacts(measure, JSON.parse(line));
        } catch (error) {
          throw new Error(`facts.ndjson line ${index + 1}: ${error.message}`);
        }
      });
    const seen = new Set();
    for (const entry of entries) {
      const key = unitKey(entry);
      if (seen.has(key)) throw new Error(`facts.ndjson has ${key} twice`);
      seen.add(key);
    }
    return entries;
  }

  return { validateFacts, serializeFacts, parseFacts };
}
