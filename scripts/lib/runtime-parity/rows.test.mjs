import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  OUTPUT_FILES,
  checkMountOwnership,
  noSaveLossConfirmation,
  noSaveLossConfirmationAfter,
  ownedCellList,
  parseRows,
  receiptJsonSchema,
  rowJsonSchema,
  serializeRows,
  validateReceipt,
  validateRow,
} from './rows.mjs';

const key = (unitId, path = `meks/${unitId}.mtf`) => ({
  schemaVersion: 1,
  family: 'battlemechs',
  unitId,
  path,
  sha256: 'a'.repeat(64),
  catalog: {
    path: `public/data/units/battlemechs/${unitId}.json`,
    blob: 'b'.repeat(40),
  },
});
const observed = (bv = 1000) => ({
  bv,
  validity: 'valid',
  weight: 50,
  allocatedWeight: 50,
  mp: { walk: 4, run: 6, jump: 0 },
  occupancy: null,
});
const loadRow = (unitId, bv) => ({
  ...key(unitId),
  measure: 'load',
  status: 'ok',
  load: {
    observed: observed(bv),
    terms: { armorBV: 360, structureBV: 40.5625, defensiveEquipmentBV: 9 },
    issues: [
      {
        ruleId: 'VAL-UNIV-015',
        channel: 'errors',
        severity: 'critical_error',
        field: 'criticalSlots.mount:Center Torso:thumper:0',
        message: 'x',
      },
    ],
  },
});
const cellOf = (slot, t = 'Foo') => ({
  location: 'Center Torso',
  slot,
  text: t,
});
const withTerms = (o, terms = { armorBV: 360, structureBV: 40.5625 }) => ({
  ...o,
  terms,
});
const mount = (equipmentId, slots = [1, 2]) => ({
  equipmentId,
  category: 'weapon',
  techBase: 'INNER_SPHERE',
  location: 'Center Torso',
  slots,
  weight: 5,
  criticalSlots: 2,
  heat: 3,
});
const noticeOf = (slot, t = 'Foo') => ({
  ...cellOf(slot, t),
  bucket: 'o3a',
  effectId: 'effect-1',
  kind: 'equipment',
  responsibility: 'o3a',
});
/** The dialog's three inputs and their predicate, as the observer reads them. */
const saveLoss = ({
  entries = [noticeOf(3)],
  settled = true,
  armor = null,
} = {}) => ({
  settled,
  lossTrackingUnknown: entries === null,
  noticeBefore: entries,
  armorSaveLoss: armor !== null,
  armorSaveLossSourceType: armor,
  confirmation: entries === null || entries.length > 0 || armor !== null,
});
/** The same facts for the reopened store (key noticeAfter). */
const saveLossAfter = ({ entries = [], settled = true, armor = null } = {}) => {
  const { noticeBefore, ...rest } = saveLoss({ entries, settled, armor });
  return { ...rest, noticeAfter: noticeBefore };
};
const reopenRow = (unitId, overrides = {}) => ({
  ...key(unitId),
  measure: 'reopen',
  status: 'ok',
  reopen: {
    saveLoss: saveLoss(),
    saveLossAfter: saveLossAfter(),
    before: withTerms(observed(1000)),
    after: withTerms(observed(990), { armorBV: 360, structureBV: 41 }),
    lostCells: [
      {
        ...cellOf(3),
        identity: 'non-system',
        bucket: 'o3a',
        kind: 'equipment',
      },
      { ...cellOf(4, 'Engine'), identity: 'system', bucket: null, kind: null },
    ],
    tokenChanges: [{ ...cellOf(5, 'A'), reopenedText: 'B' }],
    rawIdentityLosses: [cellOf(3), cellOf(4, 'Engine'), cellOf(5, 'A')],
    noticeResidual: {
      residual: [cellOf(3)],
      noticeOnly: [],
      roundTripOnly: [],
      equal: true,
      reopenedResidualCells: 0,
    },
    loadedMountLosses: [],
    changedLoadedMounts: [],
    addedLoadedMounts: [],
    ...overrides,
  },
});
const owner = { bucket: 'o3a', kind: 'weapon', equipmentCategory: 'weapon' };

test('valid load, reopen and error rows pass', () => {
  validateRow(loadRow('a'));
  validateRow(reopenRow('b'));
  validateRow({
    ...key('c'),
    measure: 'load',
    status: 'error',
    error: { stage: 'load', name: 'Error', message: 'boom' },
  });
});

test('saveLoss carries the dialog inputs, and confirmation is their predicate', () => {
  // noticeBefore with attribution, the same list as noticeResidual.residual (one owner).
  validateRow(reopenRow('s1'));
  // Nothing to confirm: empty entries, settled, no armor loss.
  const none = {
    saveLoss: saveLoss({ entries: [] }),
    noticeResidual: {
      residual: [],
      noticeOnly: [],
      roundTripOnly: [],
      equal: true,
      reopenedResidualCells: 0,
    },
    lostCells: [],
    tokenChanges: [],
    rawIdentityLosses: [],
  };
  validateRow(reopenRow('s2', none));
  // Armor loss alone asks for a confirmation, with its source type kept.
  const armor = reopenRow('s3', {
    ...none,
    saveLoss: saveLoss({ entries: [], armor: 'PATCHWORK' }),
  });
  validateRow(armor);
  assert.equal(armor.reopen.saveLoss.confirmation, true);
  assert.equal(noSaveLossConfirmation(armor), false);
  // Unknown tracking asks for a confirmation and is never an empty list.
  const unknown = reopenRow('s4', {
    ...none,
    saveLoss: saveLoss({ entries: null }),
  });
  validateRow(unknown);
  assert.equal(unknown.reopen.saveLoss.noticeBefore, null);
  assert.equal(noSaveLossConfirmation(unknown), false);
  // Not settled is not "no confirmation", even with nothing found yet.
  assert.equal(
    noSaveLossConfirmation(
      reopenRow('s5', {
        ...none,
        saveLoss: saveLoss({ entries: [], settled: false }),
      }),
    ),
    false,
  );
  assert.equal(noSaveLossConfirmation(reopenRow('s6', none)), true);
  // Failed rows and load rows are never "no confirmation".
  assert.equal(
    noSaveLossConfirmation({
      ...key('e'),
      measure: 'reopen',
      status: 'error',
      error: { stage: 'x', name: 'E', message: 'm' },
    }),
    false,
  );
  assert.equal(noSaveLossConfirmation(loadRow('l')), false);
});

test('saveLoss rejects a coerced unknown, a wrong predicate, a stray armor type and a second reading of the cells', () => {
  const emptyNotice = {
    noticeResidual: {
      residual: [],
      noticeOnly: [],
      roundTripOnly: [],
      equal: true,
      reopenedResidualCells: 0,
    },
    lostCells: [],
    tokenChanges: [],
    rawIdentityLosses: [],
  };
  const why = (overrides, pattern) =>
    assert.throws(() => validateRow(reopenRow('x', overrides)), pattern);
  // Unknown coerced to an empty list.
  why(
    {
      ...emptyNotice,
      saveLoss: { ...saveLoss({ entries: [] }), lossTrackingUnknown: true },
    },
    /never coerced to empty/,
  );
  // Null entries without saying unknown.
  why(
    {
      ...emptyNotice,
      saveLoss: { ...saveLoss({ entries: [] }), noticeBefore: null },
    },
    /never coerced to empty/,
  );
  // The confirmation is not the dialog's predicate.
  why(
    {
      ...emptyNotice,
      saveLoss: { ...saveLoss({ entries: [] }), confirmation: true },
    },
    /dialog's predicate/,
  );
  why(
    { saveLoss: { ...saveLoss(), confirmation: false } },
    /dialog's predicate/,
  );
  // armorSaveLoss without its source type, and a source type without the flag.
  why(
    {
      ...emptyNotice,
      saveLoss: {
        ...saveLoss({ entries: [], armor: 'PATCHWORK' }),
        armorSaveLossSourceType: null,
      },
    },
    /armorSaveLossSourceType/,
  );
  why(
    {
      ...emptyNotice,
      saveLoss: {
        ...saveLoss({ entries: [] }),
        armorSaveLossSourceType: 'PATCHWORK',
      },
    },
    /armorSaveLossSourceType/,
  );
  // noticeBefore is the residual, not a second list that can drift from it.
  why(
    { saveLoss: saveLoss({ entries: [noticeOf(9)] }) },
    /noticeBefore differs from the notice residual/,
  );
  // The notice entry needs its attribution, and unknown keys are rejected.
  const noAttribution = saveLoss();
  delete noAttribution.noticeBefore[0].effectId;
  why({ saveLoss: noAttribution }, undefined);
  why({ saveLoss: { ...saveLoss(), armorDetail: {} } }, undefined);
  assert.throws(() => validateRow(reopenRow('x', { saveLoss: undefined })));
});

test('saveLossAfter carries the same facts for the reopened store and ties its entries to the reopened residual', () => {
  const rr = (n, loss) => ({
    noticeResidual: {
      residual: [cellOf(3)],
      noticeOnly: [],
      roundTripOnly: [],
      equal: true,
      reopenedResidualCells: n,
    },
    saveLossAfter: loss,
  });
  validateRow(reopenRow('a1', rr(0, saveLossAfter())));
  validateRow(
    reopenRow('a2', rr(1, saveLossAfter({ entries: [noticeOf(3)] }))),
  );
  // The AFTER entries are the reopened store's list: their count is the row's reopenedResidualCells.
  assert.throws(
    () =>
      validateRow(
        reopenRow('a3', rr(0, saveLossAfter({ entries: [noticeOf(3)] }))),
      ),
    /noticeAfter differs from the notice residual/,
  );
  assert.throws(
    () =>
      validateRow(
        reopenRow('a4', rr(2, saveLossAfter({ entries: [noticeOf(3)] }))),
      ),
    /noticeAfter differs from the notice residual/,
  );
  // Same coupling and predicate rules as BEFORE, under the AFTER names.
  assert.throws(
    () =>
      validateRow(
        reopenRow(
          'a5',
          rr(0, { ...saveLossAfter(), lossTrackingUnknown: true }),
        ),
      ),
    /saveLossAfter.noticeAfter must be null exactly when lossTrackingUnknown/,
  );
  assert.throws(
    () =>
      validateRow(
        reopenRow('a6', rr(0, { ...saveLossAfter(), confirmation: true })),
      ),
    /saveLossAfter.confirmation is not the dialog's predicate/,
  );
  assert.throws(
    () =>
      validateRow(
        reopenRow(
          'a7',
          rr(
            0,
            saveLossAfter({ armor: 'PATCHWORK' }) && {
              ...saveLossAfter({ armor: 'PATCHWORK' }),
              armorSaveLossSourceType: null,
            },
          ),
        ),
      ),
    /saveLossAfter.armorSaveLossSourceType/,
  );
  assert.throws(() =>
    validateRow(reopenRow('a8', { saveLossAfter: undefined })),
  );
  // The AFTER-side number is its own predicate over the AFTER facts (not the BEFORE ones).
  const loaded = reopenRow('a9', rr(0, saveLossAfter({ armor: 'PATCHWORK' })));
  assert.equal(noSaveLossConfirmation(loaded), false); // BEFORE has an entry
  assert.equal(noSaveLossConfirmationAfter(loaded), false); // AFTER has an armor loss
  const clean = reopenRow('a10', {
    ...rr(0, saveLossAfter()),
    saveLoss: saveLoss({ entries: [] }),
    lostCells: [],
    tokenChanges: [],
    rawIdentityLosses: [],
  });
  clean.reopen.noticeResidual.residual = [];
  assert.equal(noSaveLossConfirmationAfter(validateRow(clean)), true);
});

test('rejects values that vary between runs or normalise them away', () => {
  assert.throws(() =>
    validateRow({ ...loadRow('a'), generatedAt: '2026-11-10T00:00:00Z' }),
  );
  assert.throws(() => validateRow({ ...loadRow('a'), nodeVersion: 'v24' }));
  assert.throws(() => validateRow({ ...loadRow('a'), normalized: true }));
  const bad = loadRow('a');
  bad.load.observed.bv = Number.NaN;
  assert.throws(() => validateRow(bad));
});

const cellsOfView = (view) => [
  ...(view.slots ?? []).map((slot) => ({ location: view.location, slot })),
  ...(view.splitSlots
    ? view.splitSlots.slots.map((slot) => ({
        location: view.splitSlots.location,
        slot,
      }))
    : []),
  ...(view.spreadSlots ?? []).flatMap((p) =>
    p.slots.map((slot) => ({ location: p.location, slot })),
  ),
];
const added = (view) => ({ ...view, cells: cellsOfView(view) });
const changed = (before, after) => ({
  before,
  after,
  cells: cellsOfView(after),
  ...owner,
});
/** A spread mount: primary part in the Center Torso, one more part in each of two other locations. */
const spreadMount = (equipmentId = 'ac-20-spread') => ({
  ...mount(equipmentId, [10]),
  criticalSlots: 3,
  spreadSlots: [
    { location: 'Left Torso', slots: [4] },
    { location: 'Right Torso', slots: [4] },
  ],
});

test('reopen rows carry terms on both ends and the mount changes', () => {
  validateRow(
    reopenRow('m', {
      loadedMountLosses: [{ ...mount('ppc'), ...owner }],
      changedLoadedMounts: [changed(mount('ml', [1, 2]), mount('ml', [3, 4]))],
      addedLoadedMounts: [added(mount('ammo', [9]))],
    }),
  );
  for (const end of ['before', 'after']) {
    const row = reopenRow('m');
    delete row.reopen[end].terms;
    assert.throws(
      () => validateRow(row),
      undefined,
      `${end}.terms must be required`,
    );
  }
  const bad = reopenRow('m', {
    changedLoadedMounts: [
      { before: mount('ml'), after: { slots: [1] }, cells: [], ...owner },
    ],
  });
  assert.throws(() => validateRow(bad));
  assert.throws(() =>
    validateRow(reopenRow('m', { addedLoadedMounts: undefined })),
  );
  // `cells` is required on both entry kinds.
  assert.throws(() =>
    validateRow(reopenRow('m', { addedLoadedMounts: [mount('ammo', [9])] })),
  );
  const noCells = changed(mount('ml', [1, 2]), mount('ml', [3, 4]));
  delete noCells.cells;
  assert.throws(() =>
    validateRow(reopenRow('m', { changedLoadedMounts: [noCells] })),
  );
});

test('a spread mount lists its cells in every location it occupies', () => {
  const spread = spreadMount();
  const entry = added(spread);
  assert.deepEqual(
    entry.cells.map((c) => `${c.location}:${c.slot}`),
    ['Center Torso:10', 'Left Torso:4', 'Right Torso:4'],
  );
  validateRow(reopenRow('s', { addedLoadedMounts: [entry] }));
  validateRow(
    reopenRow('s', {
      changedLoadedMounts: [changed(mount('ac-20-spread', [10]), spread)],
    }),
  );
  // Dropping any location's cell, or inventing one, disagrees with the mount's own slot fields.
  assert.throws(
    () =>
      validateRow(
        reopenRow('s', {
          addedLoadedMounts: [{ ...entry, cells: entry.cells.slice(0, 2) }],
        }),
      ),
    /disagrees with the mount's slots/,
  );
  assert.throws(
    () =>
      validateRow(
        reopenRow('s', {
          addedLoadedMounts: [
            {
              ...entry,
              cells: [...entry.cells, { location: 'Head', slot: 1 }],
            },
          ],
        }),
      ),
    /disagrees with the mount's slots/,
  );
  assert.throws(
    () =>
      validateRow(
        reopenRow('s', {
          addedLoadedMounts: [
            { ...entry, cells: [...entry.cells, entry.cells[0]] },
          ],
        }),
      ),
    /repeats a cell/,
  );
  // A changed mount's cells are those of its `after` view, not its `before` view.
  const stale = changed(mount('ml', [1, 2]), mount('ml', [3, 4]));
  stale.cells = cellsOfView(mount('ml', [1, 2]));
  assert.throws(
    () => validateRow(reopenRow('s', { changedLoadedMounts: [stale] })),
    /changedLoadedMounts\[0\]\.cells disagrees/,
  );
});

test('mount ownership: owned cells equal the expected cells with no overlap', () => {
  const row = reopenRow('o', {
    addedLoadedMounts: [added(mount('ml', [1, 2])), added(spreadMount())],
    changedLoadedMounts: [changed(mount('ppc', [5, 6]), mount('ppc', [7, 8]))],
  });
  validateRow(row);
  const owned = ownedCellList(row);
  assert.equal(owned.length, 2 + 3 + 2);
  const expected = owned.map(({ location, slot }) => ({ location, slot }));
  assert.deepEqual(checkMountOwnership(row, expected), {
    ok: true,
    overlaps: [],
    missing: [],
    extra: [],
  });

  // Expected set has a cell no mount owns, and lacks one a mount owns.
  const result = checkMountOwnership(row, [
    ...expected.slice(1),
    { location: 'Head', slot: 0 },
  ]);
  assert.equal(result.ok, false);
  assert.deepEqual(result.missing, [{ location: 'Head', slot: 0 }]);
  assert.deepEqual(result.extra, [
    { location: expected[0].location, slot: expected[0].slot },
  ]);

  // Two mounts owning the same cell is an overlap, whichever entry kinds hold them.
  const overlapping = reopenRow('o', {
    addedLoadedMounts: [added(mount('ml', [1, 2]))],
    changedLoadedMounts: [changed(mount('ppc', [5, 6]), mount('ppc', [2, 3]))],
  });
  const overlap = checkMountOwnership(overlapping, ownedCellList(overlapping));
  assert.equal(overlap.ok, false);
  assert.deepEqual(overlap.overlaps, [
    {
      cell: { location: 'Center Torso', slot: 2 },
      owners: ['added:0', 'changed:0'],
    },
  ]);
  // Rows that are not ok reopen rows own nothing.
  assert.deepEqual(ownedCellList(loadRow('a')), []);
});

test('rejects inconsistent reopen evidence', () => {
  assert.throws(() =>
    validateRow(
      reopenRow('b', {
        noticeResidual: {
          residual: [cellOf(3)],
          noticeOnly: [cellOf(9)],
          roundTripOnly: [],
          equal: true,
          reopenedResidualCells: 0,
        },
      }),
    ),
  );
  assert.throws(() =>
    validateRow(reopenRow('b', { rawIdentityLosses: [cellOf(3)] })),
  );
  assert.throws(() =>
    validateRow(
      reopenRow('b', {
        lostCells: [
          { ...cellOf(3), identity: 'system', bucket: 'o3a', kind: null },
        ],
      }),
    ),
  );
  assert.throws(() =>
    validateRow(
      reopenRow('b', {
        lostCells: [
          { ...cellOf(3), identity: 'non-system', bucket: null, kind: null },
        ],
      }),
    ),
  );
});

test('serialisation is canonical and independent of input order', () => {
  const rows = [loadRow('b'), loadRow('a'), loadRow('c')];
  const forward = serializeRows(rows);
  assert.equal(serializeRows([...rows].reverse()), forward);
  assert.equal(serializeRows(parseRows(forward)), forward);
  assert.deepEqual(
    parseRows(forward).map((r) => r.unitId),
    ['a', 'b', 'c'],
  );
  assert.ok(forward.endsWith('\n') && !forward.includes('\r'));
  assert.throws(
    () => serializeRows([loadRow('a'), loadRow('a')]),
    /Duplicate row identity/,
  );
});

const receipt = () => ({
  schemaVersion: 1,
  measure: 'load',
  repoSha: 'c'.repeat(40),
  node: 'v22.12.0',
  nodeAbi: '127',
  platform: 'linux',
  reference: { sha256: 'd'.repeat(64) },
  sources: { sha256: 'e'.repeat(64) },
  manifest: { sha256: 'f'.repeat(64) },
  rows: { count: 4263, sha256: '1'.repeat(64) },
  durationSeconds: 261.2,
  runs: [
    {
      rowsSha256: '1'.repeat(64),
      durationSeconds: 130.5,
      resources: { maxRSS: 1048576, userCPUTime: 100 },
    },
    {
      rowsSha256: '1'.repeat(64),
      durationSeconds: 128.9,
      resources: { maxRSS: 1040000, userCPUTime: 99 },
    },
  ],
  deterministic: true,
  scope: { families: ['battlemechs'], populationCount: 4263, unitIds: null },
});

test('the receipt proves the population instead of inferring it', () => {
  validateReceipt(receipt());
  const withRows = (count, scope) => ({
    ...receipt(),
    rows: { count, sha256: '1'.repeat(64) },
    scope,
  });
  const whole = (populationCount) => ({
    families: ['battlemechs'],
    populationCount,
    unitIds: null,
  });
  // Whole population: exactly populationCount rows. A short or padded capture cannot publish.
  validateReceipt(withRows(4263, whole(4263)));
  assert.throws(
    () => validateReceipt(withRows(4262, whole(4263))),
    /Population mismatch/,
  );
  assert.throws(
    () => validateReceipt(withRows(4264, whole(4263))),
    /Population mismatch/,
  );
  // Narrowed run: exactly one row per listed id, ids sorted and unique.
  const narrowed = (unitIds, populationCount = 4263) => ({
    families: ['battlemechs'],
    populationCount,
    unitIds,
  });
  validateReceipt(withRows(2, narrowed(['a', 'b'])));
  assert.throws(
    () => validateReceipt(withRows(1, narrowed(['a', 'b']))),
    /Population mismatch/,
  );
  assert.throws(
    () => validateReceipt(withRows(2, narrowed(['a', 'a']))),
    /sorted and free of duplicates/,
  );
  assert.throws(
    () => validateReceipt(withRows(2, narrowed(['b', 'a']))),
    /sorted and free of duplicates/,
  );
  assert.throws(
    () => validateReceipt(withRows(2, narrowed(['a', 'b'], 1))),
    /larger than the population/,
  );
  assert.throws(() => validateReceipt(withRows(0, whole(0))));
  // The count is required, not defaulted.
  const { populationCount: _count, ...noCount } = whole(4263);
  assert.throws(() => validateReceipt(withRows(4263, noCount)));
});

test('rows carry the status-bar weight and the allocated weight side by side', () => {
  const row = loadRow('w');
  row.load.observed.allocatedWeight = 49.5; // a second weight owner is still a valid row: it is reported, not hidden
  validateRow(row);
  const missing = loadRow('w');
  delete missing.load.observed.allocatedWeight;
  assert.throws(() => validateRow(missing));
});

test('run receipt carries the provenance rows must not', () => {
  validateReceipt(receipt());
  // A narrowed run says so; an empty scope or a run-less receipt is invalid.
  validateReceipt({
    ...receipt(),
    rows: { count: 1, sha256: '1'.repeat(64) },
    scope: {
      families: ['battlemechs'],
      populationCount: 4263,
      unitIds: ['atlas-as7-d'],
    },
  });
  assert.throws(() =>
    validateReceipt({
      ...receipt(),
      scope: { families: [], populationCount: 4263, unitIds: null },
    }),
  );
  assert.throws(() => validateReceipt({ ...receipt(), runs: [] }));
  assert.throws(() =>
    validateReceipt({ ...receipt(), resources: { maxRSS: 1 } }),
  );
  const { node: _node, ...noNode } = receipt();
  assert.throws(() => validateReceipt(noNode));
  // The ABI is required and must be the numeric module version, not a free string.
  const { nodeAbi: _abi, ...noAbi } = receipt();
  assert.throws(() => validateReceipt(noAbi));
  assert.throws(() => validateReceipt({ ...receipt(), nodeAbi: 'v127' }));
  assert.throws(() => validateReceipt({ ...receipt(), repoSha: 'abc' }));
  assert.throws(() => validateReceipt({ ...receipt(), normalized: true }));
  // Provenance never rides on a row.
  assert.throws(() =>
    validateRow({ ...loadRow('a'), repoSha: 'c'.repeat(40) }),
  );
  assert.deepEqual(OUTPUT_FILES, {
    rows: 'rows.ndjson',
    summary: 'summary.json',
    receipt: 'receipt.json',
  });
});

test('the committed JSON schemas are generated from the module (no drift)', () => {
  const committed = (name) =>
    JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8'));
  assert.deepEqual(committed('./rows.schema.json'), rowJsonSchema());
  assert.deepEqual(committed('./receipt.schema.json'), receiptJsonSchema());
});
