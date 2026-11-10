// Per-unit row contract shared by the two runtime-parity runners:
//   measure "load"   = committed unit -> real loader -> store -> BV/validity (scripts/runtime-path-bv)
//   measure "reopen" = load, real save, reopen, observe again (scripts/runtime-roundtrip)
// This module is the single owner of the schema. rows.schema.json is generated
// from it (node scripts/lib/runtime-parity/rows.mjs --write-schema) and a test fails
// if the committed copy drifts. See ROW-SCHEMA.md.
//
// Rows hold only values that are identical on every run of the same commit, on
// any OS and Node version. Run provenance, timing and memory live in the run
// receipts, never in rows, and nothing here rewrites a value to make two runs
// agree: if a field varies, the byte gate must fail.
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';

export const ROW_SCHEMA_VERSION = 1;

/** Families as the S0b emitter names them. Phase 1 fills battlemechs; the rest follow the scratch harness coverage. */
export const FAMILIES = [
  'battlemechs',
  'vehicles',
  'aerospace',
  'capital',
  'battlearmor',
  'infantry',
  'protomechs',
];

/** Recovery owner buckets from criticalSlotNoticeEffects.ts, plus 'none'. */
export const OWNER_BUCKETS = ['o3a', 'o3b', 'o3b-s', 'Celerity', 'PR-D', 'none'];

const sha256Hex = z.string().regex(/^[a-f0-9]{64}$/);
const gitBlob = z.string().regex(/^[a-f0-9]{40}$/);
const text = z.string();

/** A critical-slot cell as (location, zero-based slot, token text). */
const cell = z.strictObject({
  location: text,
  slot: z.int().min(0),
  text,
});

/**
 * What the app shows for one loaded unit. Same shape for the load row and for
 * each side of a reopen row, so load BV and reopen BV are directly comparable.
 */
const observation = z.strictObject({
  /** BV from the real read point; null = the read point returned none (counts as a miss). */
  bv: z.number().nullable(),
  /** Validation result.isValid at the real read point. */
  validity: z.enum(['valid', 'invalid']),
  /** projectMechWeight(...).allocatedWeight (editor weight). */
  weight: z.number(),
  mp: z.strictObject({ walk: z.number(), run: z.number(), jump: z.number() }),
  /** Phase 2 placeholder: occupied-slot facts. Always null until the occupancy owner is on main. */
  occupancy: z.null(),
});

const issue = z.strictObject({
  ruleId: text,
  /** Which result list the issue came from. */
  channel: z.enum(['errors', 'warnings', 'infos']),
  severity: text,
  /** Raw validation field. Never rewritten; a random id here is a product bug (0c-UUID-001). */
  field: text.nullable(),
  message: text,
});

const failure = z.strictObject({
  /** Last stage entered: load | observe | save | contract-parse | reopen | observe-reopened | compare. */
  stage: text,
  name: text,
  message: text,
});

/**
 * Exactly numericTerms(mechBVTerms(breakdown)): the names MegaMek's BV report
 * uses (structureBV includes the gyro; defensiveEquipmentBV = defEquipBV +
 * armoredComponentBV; weapon.<n>.<LOC>.<id> per mount). Not renamed here.
 * Large-aero aggregates can move ~1 ulp with list order: totals compare
 * exactly, aggregates with tolerance (compare tool, not this schema).
 */
const terms = z.record(z.string(), z.number());

const loadBlock = z.strictObject({
  observed: observation,
  terms,
  issues: z.array(issue),
});

const ownerBucket = z.enum(OWNER_BUCKETS);

/**
 * A source cell absent after reopen. `identity` is the exact-identity test of
 * the cell's token against the system set owned by MTFVocabulary.ts, never a
 * substring. System cells carry no owner/kind; non-system cells always do.
 */
const lostCell = z.union([
  cell.extend({
    identity: z.literal('system'),
    bucket: z.null(),
    kind: z.null(),
  }),
  cell.extend({
    identity: z.literal('non-system'),
    bucket: ownerBucket,
    kind: text,
  }),
]);

const slotPart = z.strictObject({
  location: text,
  slots: z.array(z.int().min(0)),
});

/** A loaded mount as the app holds it, without its (editor-only) instance id. Absent facts stay absent. */
const mountView = z.strictObject({
  equipmentId: text,
  category: text.optional(),
  techBase: text.optional(),
  location: text.optional(),
  slots: z.array(z.int().min(0)).optional(),
  splitSlots: slotPart.optional(),
  spreadSlots: z.array(slotPart).optional(),
  isRearMounted: z.boolean().optional(),
  isOmniPodMounted: z.boolean().optional(),
  weight: z.number().optional(),
  criticalSlots: z.int().min(0).optional(),
  heat: z.number().optional(),
});

/**
 * Every critical-slot cell a mount owns in the reopened unit, across all its
 * locations (a spread mount lists cells in each). For a changed mount these
 * are the cells of its `after` view. Cross-checked against the view's own
 * slots/splitSlots/spreadSlots, so the grouping proof is a row-level check.
 */
const ownedCells = z.array(z.strictObject({ location: text, slot: z.int().min(0) }));

/** Recovery owner of a mount, from its equipment identity (same classifier as cells). */
const mountOwner = {
  bucket: ownerBucket,
  kind: text,
  equipmentCategory: text.nullable(),
};

/** Both ends of a reopen row carry the same observation plus the BV terms. */
const reopenObservation = observation.extend({ terms });

const reopenBlock = z.strictObject({
  before: reopenObservation,
  after: reopenObservation,
  /** Every source cell with no cell at the same (location, slot) after reopen, system or not. */
  lostCells: z.array(lostCell),
  /** Cells present at both ends whose token text changed. */
  tokenChanges: z.array(cell.extend({ reopenedText: text })),
  /**
   * Unfiltered (location, slot, text) comparison: lostCells and tokenChanges
   * as plain triples, no system filter. Must equal their union (checked).
   */
  rawIdentityLosses: z.array(cell),
  /**
   * Notice-residual equality: the loader's unrecoveredCriticalSlots residual
   * (exact triples) against the non-system lostCells. `equal` is true exactly
   * when noticeOnly and roundTripOnly are both empty (checked).
   */
  noticeResidual: z.strictObject({
    residual: z.array(cell),
    noticeOnly: z.array(cell),
    roundTripOnly: z.array(cell),
    equal: z.boolean(),
    reopenedResidualCells: z.int().min(0),
  }),
  /** Mounts the real loader produced before save that no reopened mount matches. */
  loadedMountLosses: z.array(mountView.extend(mountOwner)),
  /**
   * Mounts present at both ends under the same (equipmentId, category, techBase)
   * whose placement or properties differ: a mount can change identity or
   * grouping without any cell being lost.
   */
  changedLoadedMounts: z.array(
    z.strictObject({
      before: mountView,
      after: mountView,
      cells: ownedCells,
      ...mountOwner,
    }),
  ),
  /** Mounts the reopened unit has that no loaded mount accounts for (e.g. marker-recovered). */
  addedLoadedMounts: z.array(mountView.extend({ cells: ownedCells })),
});

const unitKey = {
  schemaVersion: z.literal(ROW_SCHEMA_VERSION),
  family: z.enum(FAMILIES),
  unitId: z.string().min(1),
  /** Source (MTF/BLK) path in mm-data, from the S0b join; with `family` this is the scoreboard's row identity. */
  path: z.string().min(1),
  /** Source SHA-256 after CRLF->LF, from the S0b join (the reference's own hash). */
  sha256: sha256Hex,
  /** Committed catalog object this row measured, from the S0b join. */
  catalog: z.strictObject({ path: z.string().min(1), blob: gitBlob }),
};

export const RowSchema = z.union([
  z.strictObject({
    ...unitKey,
    measure: z.literal('load'),
    status: z.literal('ok'),
    load: loadBlock,
  }),
  z.strictObject({
    ...unitKey,
    measure: z.literal('load'),
    status: z.literal('error'),
    error: failure,
  }),
  z.strictObject({
    ...unitKey,
    measure: z.literal('reopen'),
    status: z.literal('ok'),
    reopen: reopenBlock,
  }),
  z.strictObject({
    ...unitKey,
    measure: z.literal('reopen'),
    status: z.literal('error'),
    error: failure,
  }),
]);

/** File names inside a runner's `--out` directory (the hosted workflow uploads the directory as-is). */
export const OUTPUT_FILES = {
  rows: 'rows.ndjson',
  summary: 'summary.json',
  receipt: 'receipt.json',
};

/**
 * Run receipt: everything about the run that is NOT a per-unit fact. It may
 * differ between hosts (Node version, platform, resources); rows must not.
 * Acceptance compares rows byte for byte and names both sides' `node` here.
 */
export const ReceiptSchema = z.strictObject({
  schemaVersion: z.literal(ROW_SCHEMA_VERSION),
  measure: z.enum(['load', 'reopen']),
  repoSha: gitBlob,
  node: text,
  platform: text,
  /** SHA-256 of config/reference/reference-full.jsonl.gz as read. */
  reference: z.strictObject({ sha256: sha256Hex }),
  /** The S0b join inputs as read: sources.ndjson and its manifest. */
  sources: z.strictObject({ sha256: sha256Hex }),
  manifest: z.strictObject({ sha256: sha256Hex }),
  /** The rows file this receipt describes. */
  rows: z.strictObject({ count: z.int().min(0), sha256: sha256Hex }),
  durationSeconds: z.number(),
  /** process.resourceUsage() at exit. Recorded, never a gate. */
  resources: z.record(z.string(), z.number()),
});

const tripleKey = (c) => JSON.stringify([c.location, c.slot, c.text]);
const sameSet = (a, b) => {
  const left = new Set(a.map(tripleKey));
  const right = new Set(b.map(tripleKey));
  return left.size === right.size && [...left].every((k) => right.has(k));
};

const cellKey = (c) => JSON.stringify([c.location ?? null, c.slot]);

/** The cells a mount view's own slot fields name (primary part, split part, spread parts). */
function viewCells(view) {
  const parts = [];
  if (view.slots) parts.push({ location: view.location, slots: view.slots });
  if (view.splitSlots) parts.push(view.splitSlots);
  for (const part of view.spreadSlots ?? []) parts.push(part);
  return parts.flatMap((p) => p.slots.map((slot) => ({ location: p.location, slot })));
}

/** Cells owned by each added/changed mount of a reopen row, tagged with the owning entry. */
export function ownedCellList(row) {
  if (row.measure !== 'reopen' || row.status !== 'ok') return [];
  const { addedLoadedMounts, changedLoadedMounts } = row.reopen;
  return [
    ...addedLoadedMounts.flatMap((m, i) =>
      m.cells.map((c) => ({ ...c, owner: `added:${i}` })),
    ),
    ...changedLoadedMounts.flatMap((m, i) =>
      m.cells.map((c) => ({ ...c, owner: `changed:${i}` })),
    ),
  ];
}

/**
 * Grouping proof as a pure row-level check: the union of cells the row's
 * added/changed mounts own equals `expected` (cells from the caller, e.g. the
 * lost cells of one bucket from the BEFORE run), and no cell has two owners.
 * Returns {ok, overlaps, missing, extra}; cells are {location, slot}.
 */
export function checkMountOwnership(row, expected) {
  const owners = new Map();
  for (const c of ownedCellList(row))
    owners.set(cellKey(c), [...(owners.get(cellKey(c)) ?? []), c.owner]);
  const want = new Map(expected.map((c) => [cellKey(c), { location: c.location, slot: c.slot }]));
  const cellOf = (k) => {
    const [location, slot] = JSON.parse(k);
    return { location, slot };
  };
  const overlaps = [...owners]
    .filter(([, o]) => o.length > 1)
    .map(([k, o]) => ({ cell: cellOf(k), owners: o }));
  const missing = [...want].filter(([k]) => !owners.has(k)).map(([, c]) => c);
  const extra = [...owners].filter(([k]) => !want.has(k)).map(([k]) => cellOf(k));
  return { ok: !overlaps.length && !missing.length && !extra.length, overlaps, missing, extra };
}

/** Cross-field rules JSON Schema cannot express. Returns a list of problems. */
function crossChecks(row) {
  const problems = [];
  if (row.measure === 'reopen' && row.status === 'ok') {
    const r = row.reopen;
    const n = r.noticeResidual;
    if (n.equal !== (n.noticeOnly.length === 0 && n.roundTripOnly.length === 0))
      problems.push('noticeResidual.equal disagrees with noticeOnly/roundTripOnly');
    const nonSystem = r.lostCells.filter((c) => c.identity === 'non-system');
    if (sameSet(n.residual, nonSystem) !== n.equal)
      problems.push('noticeResidual.equal disagrees with residual vs non-system lostCells');
    const triples = (list) => list.map(({ location, slot, text: t }) => ({ location, slot, text: t }));
    const union = [...triples(r.lostCells), ...triples(r.tokenChanges)];
    if (!sameSet(union, r.rawIdentityLosses) || union.length !== r.rawIdentityLosses.length)
      problems.push('rawIdentityLosses is not exactly lostCells + tokenChanges');
    const ownership = (name, entries, viewOf) =>
      entries.forEach((entry, i) => {
        const named = new Set(viewCells(viewOf(entry)).map(cellKey));
        const listed = new Set(entry.cells.map(cellKey));
        if (listed.size !== entry.cells.length)
          problems.push(`${name}[${i}].cells repeats a cell`);
        else if (named.size !== listed.size || [...named].some((k) => !listed.has(k)))
          problems.push(`${name}[${i}].cells disagrees with the mount's slots/splitSlots/spreadSlots`);
      });
    ownership('addedLoadedMounts', r.addedLoadedMounts, (m) => m);
    ownership('changedLoadedMounts', r.changedLoadedMounts, (m) => m.after);
  }
  return problems;
}

/** Throws on the first invalid row; returns the row. */
export function validateRow(row) {
  const parsed = RowSchema.safeParse(row);
  if (!parsed.success)
    throw new Error(`Invalid row ${row?.family}/${row?.path}: ${parsed.error.message}`);
  const problems = crossChecks(parsed.data);
  if (problems.length) throw new Error(`Invalid row ${row.family}/${row.path}: ${problems.join('; ')}`);
  return parsed.data;
}

/** Sorted keys, undefined dropped, non-finite numbers rejected. Matches the scratch harnesses' canonical(). */
export function canonicalJson(value) {
  const walk = (v) => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object')
      return Object.fromEntries(
        Object.keys(v)
          .sort()
          .filter((k) => v[k] !== undefined)
          .map((k) => [k, walk(v[k])]),
      );
    if (typeof v === 'number' && !Number.isFinite(v)) throw new Error('Non-finite number in row');
    return v;
  };
  return JSON.stringify(walk(value));
}

const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Row identity as the scoreboard's diff uses it. */
export const rowIdentity = (row) => JSON.stringify([row.family, row.path]);

/** Validate, reject duplicate identities, sort by (family, path, unitId) in code-unit order, one canonical JSON line per row. */
export function serializeRows(rows) {
  const seen = new Set();
  const checked = rows.map((row) => {
    const valid = validateRow(row);
    const id = rowIdentity(valid);
    if (seen.has(id)) throw new Error(`Duplicate row identity: ${id}`);
    seen.add(id);
    return valid;
  });
  checked.sort(
    (a, b) =>
      compare(a.family, b.family) || compare(a.path, b.path) || compare(a.unitId, b.unitId),
  );
  return checked.map((row) => canonicalJson(row) + '\n').join('');
}

export function parseRows(textContent) {
  return textContent
    .split('\n')
    .filter(Boolean)
    .map((line) => validateRow(JSON.parse(line)));
}

export const validateReceipt = (receipt) => {
  const parsed = ReceiptSchema.safeParse(receipt);
  if (!parsed.success) throw new Error(`Invalid receipt: ${parsed.error.message}`);
  return parsed.data;
};

export const rowJsonSchema = () => z.toJSONSchema(RowSchema, { target: 'draft-2020-12' });
export const receiptJsonSchema = () =>
  z.toJSONSchema(ReceiptSchema, { target: 'draft-2020-12' });

if (
  process.argv[1] &&
  process.argv.includes('--write-schema') &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const write = (name, schema) =>
    writeFileSync(new URL(name, import.meta.url), JSON.stringify(schema, null, 2) + '\n');
  write('./rows.schema.json', rowJsonSchema());
  write('./receipt.schema.json', receiptJsonSchema());
}
