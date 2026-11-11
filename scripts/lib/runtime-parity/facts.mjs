// Per-unit gated facts, derived from a schema row and the Java reference: the one place that says which
// facts the nightly gate holds a baseline for and how each is read. Rows are not changed; this is a
// derived output (`facts.ndjson`) written beside them, so the rows' bytes and every accepted run stay
// as they are.
//
// A fact is one of three kinds, and every one can also be UNKNOWN (null). Unknown is never a pass.
//   bool      true = pass. Worse: true -> false.
//   distance  a non-negative distance from the target (|runtime - Java|). Worse: it grows beyond tolerance.
//   set       a sorted, duplicate-free list of strings (cells, mounts). Worse: it gains members.
// This file is the single, pure deriver: a row and the unit's Java reference row in, facts out. Its git
// blob sha is recorded in every baseline (facts-provenance.mjs), so changing how a fact is read fails the
// gate closed until the baseline is regenerated.
// An error row has every fact unknown.
import { z } from 'zod';

import { canonicalJson } from './rows.mjs';

export const FACTS_FILE = 'facts.ndjson';
export const FACTS_SCHEMA_VERSION = 1;

/** The gated facts per measure: name -> kind. This is the whole list; the baseline and the gate read it. */
export const FACT_DEFS = {
  load: {
    bvExact: 'bool',
    bvDistance: 'distance',
    validity: 'bool',
    weightOwners: 'bool',
  },
  reopen: {
    reopenLoad: 'bool',
    reopenJava: 'bool',
    reopenJavaDistance: 'distance',
    // How far reopen moved BV from load, so a unit that already fails reopen = load and gets worse still shows.
    reopenLoadDistance: 'distance',
    noLossConfirmationBefore: 'bool',
    noticeResidual: 'set',
    noticeMismatch: 'set',
    rawIdentityLosses: 'set',
    loadedMountLosses: 'set',
    reopenValid: 'bool',
  },
};

const unknownFacts = (measure) =>
  Object.fromEntries(
    Object.keys(FACT_DEFS[measure]).map((name) => [name, null]),
  );

const identity = (row) => ({
  schemaVersion: FACTS_SCHEMA_VERSION,
  measure: row.measure,
  family: row.family,
  unitId: row.unitId,
  path: row.path,
});

/** The unit's key in a baseline. Unit ids are unique per family. */
export const setFactNames = (measure) =>
  Object.entries(FACT_DEFS[measure])
    .filter(([, kind]) => kind === 'set')
    .map(([name]) => name);

export const unitKey = (entry) => `${entry.family}/${entry.unitId}`;

const distance = (a, b) =>
  a === null || b === null || a === undefined || b === undefined
    ? null
    : Math.abs(a - b);
const sortedSet = (items) => [...new Set(items)].sort();

// Set members are compact, readable text, so a baseline diff can be read. A cell is `LT:4:<token text>`:
// a short location code, the zero-based slot, then the token (which may contain colons). Locations
// outside the table are kept as `~<name>`, so the encoding is total and exactly reversible.
const LOCATION_CODES = {
  Head: 'HD',
  'Center Torso': 'CT',
  'Left Torso': 'LT',
  'Right Torso': 'RT',
  'Left Arm': 'LA',
  'Right Arm': 'RA',
  'Left Leg': 'LL',
  'Right Leg': 'RL',
  'Center Leg': 'CL',
  'Front Left Leg': 'FLL',
  'Front Right Leg': 'FRL',
  'Rear Left Leg': 'RLL',
  'Rear Right Leg': 'RRL',
};
const CODE_LOCATIONS = Object.fromEntries(
  Object.entries(LOCATION_CODES).map(([name, code]) => [code, name]),
);

export function encodeCell({ location, slot, text }) {
  const code = LOCATION_CODES[location];
  if (code === undefined && String(location).includes(':'))
    throw new Error(
      `cannot encode the location ${location}: it contains a colon`,
    );
  return `${code ?? `~${location}`}:${slot}:${text}`;
}

export function decodeCell(member) {
  const first = member.indexOf(':');
  const second = member.indexOf(':', first + 1);
  if (first < 0 || second < 0) throw new Error(`not a cell member: ${member}`);
  const code = member.slice(0, first);
  return {
    location: code.startsWith('~') ? code.slice(1) : CODE_LOCATIONS[code],
    slot: Number(member.slice(first + 1, second)),
    text: member.slice(second + 1),
  };
}

const cellMember = encodeCell;
/** A notice/round-trip disagreement: `n:` = only the notice has the cell, `r:` = only the round trip does. */
const taggedCell = (tag, c) => `${tag}:${encodeCell(c)}`;

/** Load row + the unit's Java reference row -> facts. */
export function loadFacts(row, ref) {
  if (row.status !== 'ok')
    return { ...identity(row), status: 'error', facts: unknownFacts('load') };
  const { observed } = row.load;
  const javaBv = ref?.battleValue?.total;
  const javaValid = ref?.construction?.valid;
  return {
    ...identity(row),
    status: 'ok',
    facts: {
      // A null BV (no calculator result) is a miss, not unknown: the unit ran and had no BV.
      bvExact: typeof javaBv === 'number' ? observed.bv === javaBv : null,
      bvDistance:
        typeof javaBv === 'number' ? distance(observed.bv, javaBv) : null,
      validity:
        typeof javaValid === 'boolean'
          ? (observed.validity === 'valid') === javaValid
          : null,
      weightOwners: observed.weight === observed.allocatedWeight,
    },
  };
}

/** The save dialog would not ask: settled, tracking known, no notice entries, no armor loss. Unknown stays null. */
function noLossConfirmationBefore(loss) {
  if (!loss.settled || loss.lossTrackingUnknown) return null;
  return loss.noticeBefore.length === 0 && !loss.armorSaveLoss;
}

/** Reopen row + the unit's Java reference row -> facts. */
export function reopenFacts(row, ref) {
  if (row.status !== 'ok')
    return { ...identity(row), status: 'error', facts: unknownFacts('reopen') };
  const r = row.reopen;
  const javaBv = ref?.battleValue?.total;
  const hasJava = typeof javaBv === 'number';
  return {
    ...identity(row),
    status: 'ok',
    facts: {
      reopenLoad:
        r.before.bv !== null && r.after.bv !== null
          ? r.after.bv === r.before.bv
          : false,
      reopenJava: hasJava ? r.after.bv === javaBv : null,
      reopenJavaDistance: hasJava ? distance(r.after.bv, javaBv) : null,
      reopenLoadDistance: distance(r.after.bv, r.before.bv),
      noLossConfirmationBefore: noLossConfirmationBefore(r.saveLoss),
      noticeResidual: sortedSet(r.noticeResidual.residual.map(cellMember)),
      // What the summary's noticeResidual.equal holds: any cell the notice and the round trip disagree on.
      noticeMismatch: sortedSet([
        ...r.noticeResidual.noticeOnly.map((c) => taggedCell('n', c)),
        ...r.noticeResidual.roundTripOnly.map((c) => taggedCell('r', c)),
      ]),
      rawIdentityLosses: sortedSet(r.rawIdentityLosses.map(cellMember)),
      loadedMountLosses: sortedSet(
        r.loadedMountLosses.map((m) => canonicalJson(m)),
      ),
      reopenValid: r.after.validity === 'valid',
    },
  };
}

const factSchema = (kind) =>
  kind === 'bool'
    ? z.boolean().nullable()
    : kind === 'distance'
      ? z.number().min(0).nullable()
      : z
          .array(z.string())
          .refine(
            (list) => list.every((item, i) => i === 0 || list[i - 1] < item),
            {
              message: 'a set fact must be sorted and duplicate-free',
            },
          )
          .nullable();

const factsSchemaFor = (measure) =>
  z.strictObject({
    schemaVersion: z.literal(FACTS_SCHEMA_VERSION),
    measure: z.literal(measure),
    family: z.string().min(1),
    unitId: z.string().min(1),
    path: z.string().min(1),
    status: z.enum(['ok', 'error']),
    facts: z.strictObject(
      Object.fromEntries(
        Object.entries(FACT_DEFS[measure]).map(([name, kind]) => [
          name,
          factSchema(kind),
        ]),
      ),
    ),
  });

/** Throws with the unit named when an entry is not a facts row of the measure. */
export function validateFacts(measure, entry) {
  const result = factsSchemaFor(measure).safeParse(entry);
  if (!result.success)
    throw new Error(
      `facts row for ${entry?.unitId ?? '?'} is malformed: ${result.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')}`,
    );
  return result.data;
}

/** Sorted by (family, unitId), one JSON line each, validated. */
export function serializeFacts(measure, entries) {
  return [...entries]
    .map((entry) => validateFacts(measure, entry))
    .sort((a, b) =>
      unitKey(a) < unitKey(b) ? -1 : unitKey(a) > unitKey(b) ? 1 : 0,
    )
    .map((entry) => JSON.stringify(entry) + '\n')
    .join('');
}

export function parseFacts(measure, text) {
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
