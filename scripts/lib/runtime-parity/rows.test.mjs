import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  OUTPUT_FILES,
  checkMountOwnership,
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
  catalog: { path: `public/data/units/battlemechs/${unitId}.json`, blob: 'b'.repeat(40) },
});
const observed = (bv = 1000) => ({
  bv,
  validity: 'valid',
  weight: 50,
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
const cellOf = (slot, t = 'Foo') => ({ location: 'Center Torso', slot, text: t });
const withTerms = (o, terms = { armorBV: 360, structureBV: 40.5625 }) => ({ ...o, terms });
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
const reopenRow = (unitId, overrides = {}) => ({
  ...key(unitId),
  measure: 'reopen',
  status: 'ok',
  reopen: {
    before: withTerms(observed(1000)),
    after: withTerms(observed(990), { armorBV: 360, structureBV: 41 }),
    lostCells: [
      { ...cellOf(3), identity: 'non-system', bucket: 'o3a', kind: 'equipment' },
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

test('rejects values that vary between runs or normalise them away', () => {
  assert.throws(() => validateRow({ ...loadRow('a'), generatedAt: '2026-11-10T00:00:00Z' }));
  assert.throws(() => validateRow({ ...loadRow('a'), nodeVersion: 'v24' }));
  assert.throws(() => validateRow({ ...loadRow('a'), normalized: true }));
  const bad = loadRow('a');
  bad.load.observed.bv = Number.NaN;
  assert.throws(() => validateRow(bad));
});

const cellsOfView = (view) =>
  [
    ...(view.slots ?? []).map((slot) => ({ location: view.location, slot })),
    ...(view.splitSlots ? view.splitSlots.slots.map((slot) => ({ location: view.splitSlots.location, slot })) : []),
    ...(view.spreadSlots ?? []).flatMap((p) => p.slots.map((slot) => ({ location: p.location, slot }))),
  ];
const added = (view) => ({ ...view, cells: cellsOfView(view) });
const changed = (before, after) => ({ before, after, cells: cellsOfView(after), ...owner });
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
    assert.throws(() => validateRow(row), undefined, `${end}.terms must be required`);
  }
  const bad = reopenRow('m', {
    changedLoadedMounts: [{ before: mount('ml'), after: { slots: [1] }, cells: [], ...owner }],
  });
  assert.throws(() => validateRow(bad));
  assert.throws(() => validateRow(reopenRow('m', { addedLoadedMounts: undefined })));
  // `cells` is required on both entry kinds.
  assert.throws(() => validateRow(reopenRow('m', { addedLoadedMounts: [mount('ammo', [9])] })));
  const noCells = changed(mount('ml', [1, 2]), mount('ml', [3, 4]));
  delete noCells.cells;
  assert.throws(() => validateRow(reopenRow('m', { changedLoadedMounts: [noCells] })));
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
    reopenRow('s', { changedLoadedMounts: [changed(mount('ac-20-spread', [10]), spread)] }),
  );
  // Dropping any location's cell, or inventing one, disagrees with the mount's own slot fields.
  assert.throws(
    () => validateRow(reopenRow('s', { addedLoadedMounts: [{ ...entry, cells: entry.cells.slice(0, 2) }] })),
    /disagrees with the mount's slots/,
  );
  assert.throws(
    () =>
      validateRow(
        reopenRow('s', { addedLoadedMounts: [{ ...entry, cells: [...entry.cells, { location: 'Head', slot: 1 }] }] }),
      ),
    /disagrees with the mount's slots/,
  );
  assert.throws(
    () =>
      validateRow(
        reopenRow('s', { addedLoadedMounts: [{ ...entry, cells: [...entry.cells, entry.cells[0]] }] }),
      ),
    /repeats a cell/,
  );
  // A changed mount's cells are those of its `after` view, not its `before` view.
  const stale = changed(mount('ml', [1, 2]), mount('ml', [3, 4]));
  stale.cells = cellsOfView(mount('ml', [1, 2]));
  assert.throws(() => validateRow(reopenRow('s', { changedLoadedMounts: [stale] })), /changedLoadedMounts\[0\]\.cells disagrees/);
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
  assert.deepEqual(checkMountOwnership(row, expected), { ok: true, overlaps: [], missing: [], extra: [] });

  // Expected set has a cell no mount owns, and lacks one a mount owns.
  const result = checkMountOwnership(row, [...expected.slice(1), { location: 'Head', slot: 0 }]);
  assert.equal(result.ok, false);
  assert.deepEqual(result.missing, [{ location: 'Head', slot: 0 }]);
  assert.deepEqual(result.extra, [{ location: expected[0].location, slot: expected[0].slot }]);

  // Two mounts owning the same cell is an overlap, whichever entry kinds hold them.
  const overlapping = reopenRow('o', {
    addedLoadedMounts: [added(mount('ml', [1, 2]))],
    changedLoadedMounts: [changed(mount('ppc', [5, 6]), mount('ppc', [2, 3]))],
  });
  const overlap = checkMountOwnership(overlapping, ownedCellList(overlapping));
  assert.equal(overlap.ok, false);
  assert.deepEqual(overlap.overlaps, [
    { cell: { location: 'Center Torso', slot: 2 }, owners: ['added:0', 'changed:0'] },
  ]);
  // Rows that are not ok reopen rows own nothing.
  assert.deepEqual(ownedCellList(loadRow('a')), []);
});

test('rejects inconsistent reopen evidence', () => {
  assert.throws(() =>
    validateRow(reopenRow('b', { noticeResidual: { residual: [cellOf(3)], noticeOnly: [cellOf(9)], roundTripOnly: [], equal: true, reopenedResidualCells: 0 } })),
  );
  assert.throws(() => validateRow(reopenRow('b', { rawIdentityLosses: [cellOf(3)] })));
  assert.throws(() =>
    validateRow(reopenRow('b', { lostCells: [{ ...cellOf(3), identity: 'system', bucket: 'o3a', kind: null }] })),
  );
  assert.throws(() =>
    validateRow(reopenRow('b', { lostCells: [{ ...cellOf(3), identity: 'non-system', bucket: null, kind: null }] })),
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
  assert.throws(() => serializeRows([loadRow('a'), loadRow('a')]), /Duplicate row identity/);
});

const receipt = () => ({
  schemaVersion: 1,
  measure: 'load',
  repoSha: 'c'.repeat(40),
  node: 'v22.12.0',
  platform: 'linux',
  reference: { sha256: 'd'.repeat(64) },
  sources: { sha256: 'e'.repeat(64) },
  manifest: { sha256: 'f'.repeat(64) },
  rows: { count: 4263, sha256: '1'.repeat(64) },
  durationSeconds: 261.2,
  runs: [
    { rowsSha256: '1'.repeat(64), durationSeconds: 130.5, resources: { maxRSS: 1048576, userCPUTime: 100 } },
    { rowsSha256: '1'.repeat(64), durationSeconds: 128.9, resources: { maxRSS: 1040000, userCPUTime: 99 } },
  ],
  deterministic: true,
  scope: { families: ['battlemechs'], unitIds: null },
});

test('run receipt carries the provenance rows must not', () => {
  validateReceipt(receipt());
  // A narrowed run says so; an empty scope or a run-less receipt is invalid.
  validateReceipt({ ...receipt(), scope: { families: ['battlemechs'], unitIds: ['atlas-as7-d'] } });
  assert.throws(() => validateReceipt({ ...receipt(), scope: { families: [], unitIds: null } }));
  assert.throws(() => validateReceipt({ ...receipt(), runs: [] }));
  assert.throws(() => validateReceipt({ ...receipt(), resources: { maxRSS: 1 } }));
  const { node: _node, ...noNode } = receipt();
  assert.throws(() => validateReceipt(noNode));
  assert.throws(() => validateReceipt({ ...receipt(), repoSha: 'abc' }));
  assert.throws(() => validateReceipt({ ...receipt(), normalized: true }));
  // Provenance never rides on a row.
  assert.throws(() => validateRow({ ...loadRow('a'), repoSha: 'c'.repeat(40) }));
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
