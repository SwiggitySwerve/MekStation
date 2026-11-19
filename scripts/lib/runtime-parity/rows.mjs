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

import {
  noSaveLossConfirmation,
  noSaveLossConfirmationAfter,
  saveLossConfirms,
  saveLossProblems,
  saveLossSchema,
} from './save-loss.mjs';
import { isEditorOwned } from './vehicle-document.mjs';

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
export const OWNER_BUCKETS = [
  'o3a',
  'o3b',
  'o3b-s',
  'Celerity',
  'PR-D',
  'none',
];

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
  /** The status bar's unitStats.weightUsed, unrounded (never the toFixed(1) text). */
  weight: z.number(),
  /**
   * projectMechWeight(...).allocatedWeight, read beside `weight`. The two must be equal on
   * every unit: a difference means a second weight owner, which is a finding to report,
   * not a tolerance (summaries count it; rows keep both numbers).
   */
  allocatedWeight: z.number(),
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
  /**
   * The BV and cost the real PreviewTab hands to the record-sheet renderer (what extractData returns as
   * header.battleValue and header.cost), read after the status bar in the same store. null = not captured.
   * Optional so rows written before this field existed still parse.
   */
  preview: z
    .strictObject({ bv: z.number(), cost: z.number() })
    .nullable()
    .optional(),
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
const ownedCells = z.array(
  z.strictObject({ location: text, slot: z.int().min(0) }),
);

/** Recovery owner of a mount, from its equipment identity (same classifier as cells). */
const mountOwner = {
  bucket: ownerBucket,
  kind: text,
  equipmentCategory: text.nullable(),
};

/** Both ends of a reopen row carry the same observation plus the BV terms. */
const reopenObservation = observation.extend({ terms });

/** A cell the loader could not place, with the classifier's attribution. */
const noticeEntry = cell.extend({
  bucket: ownerBucket,
  effectId: text,
  kind: text,
  responsibility: text,
});

/**
 * Whether the save dialog asks for a loss confirmation, read where the dialog reads it
 * (useUnitLoadDiagnostics): on the loaded (BEFORE) store and on the reopened (AFTER) store. The shape,
 * the predicate and the third nightly number live in save-loss.mjs, the one file that decides them.
 */
const saveLoss = saveLossSchema(noticeEntry, 'noticeBefore');
const saveLossAfter = saveLossSchema(noticeEntry, 'noticeAfter');

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
  /** The save dialog's loss-confirmation facts on the loaded (BEFORE) store. */
  saveLoss,
  /** The same facts on the reopened (AFTER) store, for a cold-reopen headline. */
  saveLossAfter,
});

/**
 * What the vehicle editor shows for one loaded unit, read where VehicleStatusBar reads it. Same shape on both ends of a
 * vehicle reopen row. Vehicles have no critical-slot cells, no second weight owner and no save-loss dialog, so the
 * mech observation's allocatedWeight, occupancy and the cell/notice blocks have no vehicle counterpart.
 */
const vehicleObservation = z.strictObject({
  /** The status bar's BV (its breakdown's `final`); null = the calculator threw (counts as a miss). */
  bv: z.number().nullable(),
  /** validateVehicleConstruction(...).isValid as the status bar computes it. */
  validity: z.enum(['valid', 'invalid']),
  /** .isComplete: false when an input (mass, equipment) was unknown, so `invalid` was not a decided verdict. */
  complete: z.boolean(),
  /** The reason codes: the error rule ids, sorted and duplicate-free (checked). Messages are in `issues`. */
  reasons: z.array(text),
  /** Unrounded used mass, tonnage - the weight breakdown's `remaining`; null when `remaining` is unknown. */
  weight: z.number().nullable(),
  mp: z.strictObject({
    cruise: z.number(),
    flank: z.number(),
    /** null: the vehicle editor has no jump MP (the store has none; the BV input uses 0). Never written as 0. */
    jump: z.number().nullable(),
  }),
  /** The loaded crew size as the store holds it; an explicit null stays null. */
  crew: z.int().min(0).nullable(),
});

/** A vehicle validation message as recorded (a diagnostic; only `reasons` is compared). Warnings carry no rule id. */
const vehicleIssue = z.strictObject({
  ruleId: text.nullable(),
  channel: z.enum(['errors', 'warnings']),
  message: text,
});

const vehicleLoadBlock = z.strictObject({
  observed: vehicleObservation,
  /** numericTerms(vehicleBVTerms(breakdown)) (src/utils/construction/vehicle/bvTrace.ts), names unchanged. */
  terms,
  issues: z.array(vehicleIssue),
  /** The BV and cost the real vehicle preview hands to the record-sheet renderer; null = not captured. */
  preview: z.strictObject({ bv: z.number(), cost: z.number() }).nullable(),
});

const vehicleReopenObservation = vehicleObservation.extend({ terms });

const vehicleReopenBlock = z.strictObject({
  before: vehicleReopenObservation,
  after: vehicleReopenObservation,
  /**
   * Source-document key paths the saved document lost or changed, outside the editor-owned keys
   * (vehicle-document.mjs documentDiff, the one owner), sorted by path.
   */
  documentLosses: z.array(
    z.strictObject({ path: text, change: z.enum(['lost', 'changed']) }),
  ),
  /** vehicle-document.mjs mountDiff: source mounts the saved document lacks, one numbered entry per copy, sorted. */
  mountLosses: z.array(text),
  /** Saved mounts the source lacks, the same way. */
  mountAdditions: z.array(text),
});

const unitIdentity = {
  schemaVersion: z.literal(ROW_SCHEMA_VERSION),
  unitId: z.string().min(1),
  /** Source (MTF/BLK) path in mm-data, from the S0b join; with `family` this is the scoreboard's row identity. */
  path: z.string().min(1),
  /** Source SHA-256 after CRLF->LF, from the S0b join (the reference's own hash). */
  sha256: sha256Hex,
  /** Committed catalog object this row measured, from the S0b join. */
  catalog: z.strictObject({ path: z.string().min(1), blob: gitBlob }),
};

/** An `ok` row's block is family-shaped; an `error` row is the same for every family. */
const unitKey = { ...unitIdentity, family: z.enum(FAMILIES) };
const mechKey = { ...unitIdentity, family: z.literal('battlemechs') };
const vehicleKey = { ...unitIdentity, family: z.literal('vehicles') };

export const RowSchema = z.union([
  z.strictObject({
    ...mechKey,
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
    ...mechKey,
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
  z.strictObject({
    ...vehicleKey,
    measure: z.literal('load'),
    status: z.literal('ok'),
    load: vehicleLoadBlock,
  }),
  z.strictObject({
    ...vehicleKey,
    measure: z.literal('reopen'),
    status: z.literal('ok'),
    reopen: vehicleReopenBlock,
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
  /**
   * process.versions.modules: the native-module ABI this process ran on. better-sqlite3 (the reopen
   * measure's cold save) must run on the ABI that node_modules was built for, so it is recorded.
   */
  nodeAbi: z.string().regex(/^\d+$/),
  platform: text,
  /** SHA-256 of config/reference/reference-full.jsonl.gz as read. */
  reference: z.strictObject({ sha256: sha256Hex }),
  /** The S0b join inputs as read: sources.ndjson and its manifest. */
  sources: z.strictObject({ sha256: sha256Hex }),
  manifest: z.strictObject({ sha256: sha256Hex }),
  /** The rows file this receipt describes. */
  rows: z.strictObject({ count: z.int().min(0), sha256: sha256Hex }),
  /** Wall time of the whole invocation. */
  durationSeconds: z.number(),
  /**
   * One entry per fresh capture process. `resources` is that process's
   * process.resourceUsage() at exit: recorded, never a gate.
   */
  runs: z
    .array(
      z.strictObject({
        rowsSha256: sha256Hex,
        durationSeconds: z.number(),
        resources: z.record(z.string(), z.number()),
      }),
    )
    .min(1),
  /**
   * Whether the capture processes ran together (the default) or one after another (`--sequential`). It changes each
   * run's wall time and peak memory, never its rows. Optional so receipts written before it existed still validate.
   */
  captureMode: z.enum(['concurrent', 'sequential']).optional(),
  /**
   * How much later each concurrent run started than the one before it (0 for `--sequential`). Runs after the first are
   * staggered so a time-derived value in a row still differs between runs. Optional like captureMode.
   */
  captureOffsetMs: z.int().min(0).optional(),
  /**
   * The time zone each run's capture process ran in, in `runs` order. Concurrent runs after the first get a different
   * zone from the first, so a zone-derived value in a row differs between runs. Optional like captureMode.
   */
  captureTimeZones: z.array(text).optional(),
  /** True when every run produced byte-identical rows (the determinism gate). */
  deterministic: z.boolean(),
  /**
   * What was measured. `populationCount` is the plan length after the family
   * filter and before `--units`. `unitIds: null` is the whole joined population
   * of the listed families; a list (sorted, no duplicates) means a deliberately
   * narrowed run. validateReceipt requires rows.count to equal populationCount
   * (null) or unitIds.length (list): the population is proved, not inferred.
   */
  scope: z.strictObject({
    families: z.array(z.enum(FAMILIES)).min(1),
    populationCount: z.int().min(1),
    unitIds: z.array(z.string()).nullable(),
  }),
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
  return parts.flatMap((p) =>
    p.slots.map((slot) => ({ location: p.location, slot })),
  );
}

/** Cells owned by each added/changed mount of a reopen row, tagged with the owning entry. */
export function ownedCellList(row) {
  if (
    row.measure !== 'reopen' ||
    row.status !== 'ok' ||
    row.family !== 'battlemechs'
  )
    return [];
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
  const want = new Map(
    expected.map((c) => [cellKey(c), { location: c.location, slot: c.slot }]),
  );
  const cellOf = (k) => {
    const [location, slot] = JSON.parse(k);
    return { location, slot };
  };
  const overlaps = [...owners]
    .filter(([, o]) => o.length > 1)
    .map(([k, o]) => ({ cell: cellOf(k), owners: o }));
  const missing = [...want].filter(([k]) => !owners.has(k)).map(([, c]) => c);
  const extra = [...owners]
    .filter(([k]) => !want.has(k))
    .map(([k]) => cellOf(k));
  return {
    ok: !overlaps.length && !missing.length && !extra.length,
    overlaps,
    missing,
    extra,
  };
}

export {
  noSaveLossConfirmation,
  noSaveLossConfirmationAfter,
  saveLossConfirms,
};

const strictlySorted = (list) =>
  list.every((item, i) => i === 0 || list[i - 1] < item);

/** The vehicle rules: sorted, duplicate-free lists, and no loss reported under an editor-owned key. */
function vehicleCrossChecks(row) {
  const problems = [];
  const observations =
    row.measure === 'load'
      ? [['load.observed', row.load.observed]]
      : [
          ['reopen.before', row.reopen.before],
          ['reopen.after', row.reopen.after],
        ];
  for (const [name, observed] of observations)
    if (!strictlySorted(observed.reasons))
      problems.push(`${name}.reasons is not sorted and duplicate-free`);
  if (row.measure === 'reopen') {
    const r = row.reopen;
    if (!strictlySorted(r.documentLosses.map((loss) => loss.path)))
      problems.push('documentLosses is not sorted by unique path');
    const owned = r.documentLosses.filter((loss) => isEditorOwned(loss.path));
    if (owned.length)
      problems.push(
        `documentLosses lists editor-owned key(s): ${owned.map((loss) => loss.path).join(', ')}`,
      );
    if (!strictlySorted(r.mountLosses))
      problems.push('mountLosses is not sorted and duplicate-free');
    if (!strictlySorted(r.mountAdditions))
      problems.push('mountAdditions is not sorted and duplicate-free');
  }
  return problems;
}

/** Cross-field rules JSON Schema cannot express. Returns a list of problems. */
function crossChecks(row) {
  const problems = [];
  if (row.status === 'ok' && row.family === 'vehicles')
    problems.push(...vehicleCrossChecks(row));
  if (
    row.measure === 'reopen' &&
    row.status === 'ok' &&
    row.family === 'battlemechs'
  ) {
    const r = row.reopen;
    const n = r.noticeResidual;
    if (n.equal !== (n.noticeOnly.length === 0 && n.roundTripOnly.length === 0))
      problems.push(
        'noticeResidual.equal disagrees with noticeOnly/roundTripOnly',
      );
    const nonSystem = r.lostCells.filter((c) => c.identity === 'non-system');
    if (sameSet(n.residual, nonSystem) !== n.equal)
      problems.push(
        'noticeResidual.equal disagrees with residual vs non-system lostCells',
      );
    const triples = (list) =>
      list.map(({ location, slot, text: t }) => ({ location, slot, text: t }));
    const union = [...triples(r.lostCells), ...triples(r.tokenChanges)];
    if (
      !sameSet(union, r.rawIdentityLosses) ||
      union.length !== r.rawIdentityLosses.length
    )
      problems.push(
        'rawIdentityLosses is not exactly lostCells + tokenChanges',
      );
    const ownership = (name, entries, viewOf) =>
      entries.forEach((entry, i) => {
        const named = new Set(viewCells(viewOf(entry)).map(cellKey));
        const listed = new Set(entry.cells.map(cellKey));
        if (listed.size !== entry.cells.length)
          problems.push(`${name}[${i}].cells repeats a cell`);
        else if (
          named.size !== listed.size ||
          [...named].some((k) => !listed.has(k))
        )
          problems.push(
            `${name}[${i}].cells disagrees with the mount's slots/splitSlots/spreadSlots`,
          );
      });
    ownership('addedLoadedMounts', r.addedLoadedMounts, (m) => m);
    ownership('changedLoadedMounts', r.changedLoadedMounts, (m) => m.after);
    // BEFORE: the entries are the notice residual itself (same exact triples). AFTER: the reopened
    // store's entries are the reopened residual, of which the row records the count.
    problems.push(
      ...saveLossProblems(r.saveLoss, 'noticeBefore', 'saveLoss', {
        cells: n.residual,
        sameCells: (entries, list) =>
          sameSet(entries, list) && entries.length === list.length,
      }),
      ...saveLossProblems(r.saveLossAfter, 'noticeAfter', 'saveLossAfter', {
        cells: [],
        sameCells: (entries) => entries.length === n.reopenedResidualCells,
      }),
    );
  }
  return problems;
}

/** Throws on the first invalid row; returns the row. */
export function validateRow(row) {
  const parsed = RowSchema.safeParse(row);
  if (!parsed.success)
    throw new Error(
      `Invalid row ${row?.family}/${row?.path}: ${parsed.error.message}`,
    );
  const problems = crossChecks(parsed.data);
  if (problems.length)
    throw new Error(
      `Invalid row ${row.family}/${row.path}: ${problems.join('; ')}`,
    );
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
    if (typeof v === 'number' && !Number.isFinite(v))
      throw new Error('Non-finite number in row');
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
      compare(a.family, b.family) ||
      compare(a.path, b.path) ||
      compare(a.unitId, b.unitId),
  );
  return checked.map((row) => canonicalJson(row) + '\n').join('');
}

export function parseRows(textContent) {
  return textContent
    .split('\n')
    .filter(Boolean)
    .map((line) => validateRow(JSON.parse(line)));
}

/**
 * The population a scope claims, checked against the rows it produced: exactly populationCount
 * rows for the whole population, exactly one per listed id for a narrowed run. Used by the
 * receipt and the summaries, so a short or padded capture cannot publish a count.
 */
export function assertPopulation(scope, rowCount) {
  const { unitIds, populationCount } = scope;
  if (unitIds !== null) {
    if (unitIds.some((id, i) => i > 0 && !(unitIds[i - 1] < id)))
      throw new Error('scope.unitIds must be sorted and free of duplicates');
    if (unitIds.length > populationCount)
      throw new Error('scope.unitIds is larger than the population');
    if (rowCount !== unitIds.length)
      throw new Error(
        `Population mismatch: ${rowCount} rows for ${unitIds.length} requested units`,
      );
  } else if (rowCount !== populationCount)
    throw new Error(
      `Population mismatch: ${rowCount} rows for a population of ${populationCount}`,
    );
}

export const validateReceipt = (receipt) => {
  const parsed = ReceiptSchema.safeParse(receipt);
  if (!parsed.success)
    throw new Error(`Invalid receipt: ${parsed.error.message}`);
  assertPopulation(parsed.data.scope, parsed.data.rows.count);
  const zones = parsed.data.captureTimeZones;
  if (zones && zones.length !== parsed.data.runs.length)
    throw new Error(
      `captureTimeZones names ${zones.length} zone(s) for ${parsed.data.runs.length} run(s)`,
    );
  return parsed.data;
};

export const rowJsonSchema = () =>
  z.toJSONSchema(RowSchema, { target: 'draft-2020-12' });
export const receiptJsonSchema = () =>
  z.toJSONSchema(ReceiptSchema, { target: 'draft-2020-12' });

if (
  process.argv[1] &&
  process.argv.includes('--write-schema') &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const write = (name, schema) =>
    writeFileSync(
      new URL(name, import.meta.url),
      JSON.stringify(schema, null, 2) + '\n',
    );
  write('./rows.schema.json', rowJsonSchema());
  write('./receipt.schema.json', receiptJsonSchema());
}
