// What the nightly gate holds a baseline for, derived from a row and the Java reference.
//   node --test scripts/lib/runtime-parity/facts.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FACT_DEFS,
  FACT_FAMILIES,
  REPORTED_DEFS,
  VEHICLE_FACT_DEFS,
  VEHICLE_REPORTED_DEFS,
  decodeCell,
  encodeCell,
  factDefs,
  loadFacts,
  parseFacts,
  reopenFacts,
  serializeFacts,
  validateFacts,
  vehicleLoadFacts,
  vehicleReopenFacts,
} from './facts.mjs';

const identity = (measure) => ({
  measure,
  family: 'battlemechs',
  unitId: 'u',
  path: 'meks/u.mtf',
});
const observed = (over = {}) => ({
  bv: 1000,
  validity: 'valid',
  weight: 50,
  allocatedWeight: 50,
  ...over,
});
// `preview` is what the real PreviewTab hands to the sheet renderer; by default it equals the status BV.
const loadRow = (over = {}, preview = 'same') => ({
  ...identity('load'),
  status: 'ok',
  load: {
    observed: observed(over),
    preview:
      preview === 'same' ? { bv: observed(over).bv ?? 0, cost: 1 } : preview,
  },
});
const ref = (total = 1000, valid = true) => ({
  battleValue: { total },
  construction: { valid },
});
const cell = (location, slot, text) => ({ location, slot, text });
const saveLoss = (over = {}) => ({
  settled: true,
  lossTrackingUnknown: false,
  noticeBefore: [],
  armorSaveLoss: null,
  ...over,
});
const reopenRow = (over = {}) => ({
  ...identity('reopen'),
  status: 'ok',
  reopen: {
    before: observed(),
    after: observed(),
    rawIdentityLosses: [],
    noticeResidual: {
      residual: [],
      noticeOnly: [],
      roundTripOnly: [],
      equal: true,
    },
    loadedMountLosses: [],
    saveLoss: saveLoss(),
    ...over,
  },
});
const error = (measure) => ({
  ...identity(measure),
  status: 'error',
  error: { stage: 'open', name: 'E', message: 'm' },
});

test('load facts: bvExact and its distance, validity, weight owners; an unknown Java value is unknown, a null BV is a miss', () => {
  assert.deepEqual(loadFacts(loadRow(), ref()).facts, {
    bvExact: true,
    bvDistance: 0,
    validity: true,
    weightOwners: true,
    previewEqualsStatus: true,
  });
  assert.deepEqual(loadFacts(loadRow({ bv: 990 }), ref()).facts, {
    bvExact: false,
    bvDistance: 10,
    validity: true,
    weightOwners: true,
    previewEqualsStatus: true,
  });
  assert.deepEqual(loadFacts(loadRow({ bv: 1004 }), ref()).facts.bvDistance, 4);
  assert.equal(
    loadFacts(loadRow({ validity: 'invalid' }), ref(1000, true)).facts.validity,
    false,
  );
  assert.equal(
    loadFacts(loadRow({ validity: 'invalid' }), ref(1000, false)).facts
      .validity,
    true,
  );
  assert.equal(
    loadFacts(loadRow({ allocatedWeight: 55 }), ref()).facts.weightOwners,
    false,
  );
  const miss = loadFacts(loadRow({ bv: null }), ref()).facts;
  assert.deepEqual([miss.bvExact, miss.bvDistance], [false, null]);
  const noJava = loadFacts(loadRow(), undefined).facts;
  assert.deepEqual(
    [noJava.bvExact, noJava.bvDistance, noJava.validity],
    [null, null, null],
  );
});

test('the record sheet: previewEqualsStatus is gated; previewStatusDistance is REPORTED, per unit, not part of the gated facts', () => {
  const f = (preview, over = {}) => loadFacts(loadRow(over, preview), ref());
  const same = f({ bv: 1000, cost: 1 });
  assert.deepEqual(
    [same.facts.previewEqualsStatus, same.reported.previewStatusDistance],
    [true, 0],
  );
  // Lower and higher than the status bar are both unequal, with the distance either way.
  const lower = f({ bv: 909, cost: 1 });
  assert.deepEqual(
    [lower.facts.previewEqualsStatus, lower.reported.previewStatusDistance],
    [false, 91],
  );
  assert.equal(f({ bv: 1268, cost: 1 }).reported.previewStatusDistance, 268);
  // Equality is exact: a 5-point difference (archer-arc-2d prints 1295 for 1290) is unequal.
  assert.equal(f({ bv: 1005, cost: 1 }).facts.previewEqualsStatus, false);
  assert.equal(f({ bv: 1000.5, cost: 1 }).facts.previewEqualsStatus, false);
  // The distance is not a gated fact: it is not in FACT_DEFS and not among the facts.
  assert.equal('previewStatusDistance' in FACT_DEFS.load, false);
  assert.equal('previewStatusDistance' in lower.facts, false);
  assert.deepEqual(REPORTED_DEFS, {
    load: { previewStatusDistance: 'distance' },
    reopen: {},
  });
  // Not captured, or no status BV to compare with: unknown, never a pass.
  const none = f(null);
  assert.deepEqual(
    [none.facts.previewEqualsStatus, none.reported.previewStatusDistance],
    [null, null],
  );
  const noStatus = f({ bv: 0, cost: 1 }, { bv: null });
  assert.deepEqual(
    [
      noStatus.facts.previewEqualsStatus,
      noStatus.reported.previewStatusDistance,
    ],
    [null, null],
  );
  // A row written before the field existed has no preview: also unknown.
  const old = loadRow();
  delete old.load.preview;
  assert.equal(loadFacts(old, ref()).facts.previewEqualsStatus, null);
  // The reported block is part of the facts row and validated with it.
  assert.throws(
    () =>
      validateFacts('load', {
        ...same,
        reported: { previewStatusDistance: -1 },
      }),
    /malformed/,
  );
  assert.throws(
    () => validateFacts('load', { ...same, reported: {} }),
    /malformed/,
  );
});

test('an error row has every fact unknown, in both measures', () => {
  for (const measure of ['load', 'reopen']) {
    const entry = (measure === 'load' ? loadFacts : reopenFacts)(
      error(measure),
      ref(),
    );
    assert.equal(entry.status, 'error');
    assert.deepEqual(
      Object.values(entry.reported),
      Object.keys(REPORTED_DEFS[measure]).map(() => null),
    );
    assert.deepEqual(
      Object.values(entry.facts),
      Object.keys(FACT_DEFS[measure]).map(() => null),
    );
  }
});

test('reopen facts: reopenLoad, reopenJava and distance, reopen validity', () => {
  const same = reopenFacts(reopenRow(), ref()).facts;
  assert.deepEqual(
    [
      same.reopenLoad,
      same.reopenJava,
      same.reopenJavaDistance,
      same.reopenValid,
    ],
    [true, true, 0, true],
  );
  const moved = reopenFacts(
    reopenRow({ after: observed({ bv: 900, validity: 'invalid' }) }),
    ref(),
  ).facts;
  assert.deepEqual(
    [
      moved.reopenLoad,
      moved.reopenJava,
      moved.reopenJavaDistance,
      moved.reopenValid,
    ],
    [false, false, 100, false],
  );
  assert.equal(
    reopenFacts(reopenRow({ after: observed({ bv: null }) }), ref()).facts
      .reopenLoad,
    false,
  );
  assert.equal(reopenFacts(reopenRow(), undefined).facts.reopenJava, null);
});

test('reopenLoadDistance is |reopen BV - load BV|, independent of Java, and unknown when either BV is', () => {
  const d = (before, after, java) =>
    reopenFacts(
      reopenRow({
        before: observed({ bv: before }),
        after: observed({ bv: after }),
      }),
      java,
    ).facts;
  assert.equal(d(1000, 1000, ref()).reopenLoadDistance, 0);
  assert.equal(d(1000, 940, ref()).reopenLoadDistance, 60);
  assert.equal(d(1000, 1060, ref()).reopenLoadDistance, 60);
  assert.equal(
    d(1000, 940, undefined).reopenLoadDistance,
    60,
    'no Java needed',
  );
  assert.equal(d(1000, null, ref()).reopenLoadDistance, null);
  assert.equal(d(null, 1000, ref()).reopenLoadDistance, null);
});

test('cell members are compact, readable and exactly reversible, including unknown locations and colons in the token', () => {
  const cases = [
    { location: 'Left Torso', slot: 4, text: 'AC/10' },
    { location: 'Rear Right Leg', slot: 0, text: 'Heat Sink:Double' },
    { location: 'Odd Place', slot: 11, text: 'x' },
  ];
  assert.deepEqual(cases.map(encodeCell), [
    'LT:4:AC/10',
    'RRL:0:Heat Sink:Double',
    '~Odd Place:11:x',
  ]);
  for (const c of cases) assert.deepEqual(decodeCell(encodeCell(c)), c);
  assert.throws(
    () => encodeCell({ location: 'A:B', slot: 0, text: 'x' }),
    /colon/,
  );
  assert.throws(() => decodeCell('nonsense'), /not a cell member/);
});

test('noLossConfirmationBefore is the dialog predicate, and unknown or unsettled stays unknown, never a pass', () => {
  const f = (loss) =>
    reopenFacts(reopenRow({ saveLoss: saveLoss(loss) }), ref()).facts
      .noLossConfirmationBefore;
  assert.equal(f({}), true);
  assert.equal(f({ noticeBefore: [cell('Left Arm', 1, 'x')] }), false);
  assert.equal(f({ armorSaveLoss: { sourceType: 'PATCHWORK' } }), false);
  assert.equal(f({ lossTrackingUnknown: true, noticeBefore: null }), null);
  assert.equal(f({ settled: false }), null);
});

test('set facts are sorted, duplicate-free triples; mismatch cells are tagged by side; mounts are canonical', () => {
  const row = reopenRow({
    rawIdentityLosses: [
      cell('Right Arm', 3, 'b'),
      cell('Left Arm', 2, 'a'),
      cell('Left Arm', 2, 'a'),
    ],
    noticeResidual: {
      residual: [cell('Left Arm', 2, 'a')],
      noticeOnly: [cell('Head', 0, 'n')],
      roundTripOnly: [cell('Head', 0, 'n')],
      equal: false,
    },
    loadedMountLosses: [
      { location: 'Left Torso', equipmentId: 'ac-10', slots: [1, 2] },
    ],
  });
  const facts = reopenFacts(row, ref()).facts;
  assert.deepEqual(facts.rawIdentityLosses, ['LA:2:a', 'RA:3:b']);
  assert.deepEqual(facts.noticeResidual, ['LA:2:a']);
  assert.deepEqual(facts.noticeMismatch, ['n:HD:0:n', 'r:HD:0:n']);
  // Key order in the mount view does not change its identity.
  const reordered = reopenRow({
    loadedMountLosses: [
      { slots: [1, 2], equipmentId: 'ac-10', location: 'Left Torso' },
    ],
  });
  assert.deepEqual(
    reopenFacts(reordered, ref()).facts.loadedMountLosses,
    facts.loadedMountLosses,
  );
});

test('serializeFacts sorts by unit, validates, and parseFacts refuses malformed lines, unsorted sets and duplicate units', () => {
  const a = { ...loadFacts(loadRow(), ref()), unitId: 'a' };
  const b = { ...loadFacts(loadRow(), ref()), unitId: 'b' };
  const text = serializeFacts('load', [b, a]);
  assert.deepEqual(
    parseFacts('load', text).map((e) => e.unitId),
    ['a', 'b'],
  );
  assert.throws(() => parseFacts('load', text + text), /twice/);
  assert.throws(() => parseFacts('load', '{"nope":1}\n'), /malformed/);
  assert.throws(
    () =>
      validateFacts('load', { ...a, facts: { ...a.facts, bvExact: 'yes' } }),
    /malformed/,
  );
  assert.throws(
    () => validateFacts('load', { ...a, facts: { ...a.facts, extra: true } }),
    /malformed/,
  );
  const r = reopenFacts(reopenRow(), ref());
  assert.throws(
    () =>
      validateFacts('reopen', {
        ...r,
        facts: { ...r.facts, rawIdentityLosses: ['b', 'a'] },
      }),
    /sorted/,
  );
  assert.throws(
    () =>
      validateFacts('reopen', {
        ...r,
        facts: { ...r.facts, rawIdentityLosses: ['a', 'a'] },
      }),
    /sorted|duplicate/,
  );
});

test('facts reject a JSON distance of 1e999 instead of accepting Infinity', () => {
  const row = loadFacts(loadRow(), ref());
  row.facts.bvDistance = 0;
  const text = JSON.stringify(row).replace(
    '"bvDistance":0',
    '"bvDistance":1e999',
  );
  assert.throws(() => parseFacts('load', text), /bvDistance/);
});

// --- vehicles -----------------------------------------------------------------------------------------

const vehicleIdentity = (measure) => ({
  measure,
  family: 'vehicles',
  unitId: 'v',
  path: 'vehicles/v.blk',
});
const vehicleObserved = (over = {}) => ({
  bv: 1353,
  validity: 'valid',
  complete: true,
  reasons: [],
  weight: 95,
  mp: { cruise: 4, flank: 6, jump: 0 },
  crew: 7,
  ...over,
});
const vehicleRef = (total = 1353, valid = true, weightExact = 95) => ({
  battleValue: { total },
  construction: {
    valid,
    verifierQuantities: { weightExact: { unit: 't', value: weightExact } },
  },
});
const vehicleLoadRow = (over = {}, preview = { bv: 1353, cost: 1 }) => ({
  ...vehicleIdentity('load'),
  status: 'ok',
  load: { observed: vehicleObserved(over), preview },
});
const vehicleReopenRow = (before = {}, after = {}, rest = {}) => ({
  ...vehicleIdentity('reopen'),
  status: 'ok',
  reopen: {
    before: vehicleObserved(before),
    after: vehicleObserved(after),
    documentLosses: [],
    mountLosses: [],
    mountAdditions: [],
    ...rest,
  },
});

test('each family has its own fact table; the battlemech table is unchanged', () => {
  assert.deepEqual(FACT_FAMILIES, ['battlemechs', 'vehicles']);
  assert.equal(factDefs('load'), FACT_DEFS.load);
  assert.equal(factDefs('reopen', 'battlemechs'), FACT_DEFS.reopen);
  assert.equal(factDefs('reopen', 'vehicles'), VEHICLE_FACT_DEFS.reopen);
  assert.equal(factDefs('load', 'aerospace'), undefined);
  // Crew is reported only, never gated.
  assert.equal('crewOracle' in VEHICLE_FACT_DEFS.load, false);
  assert.equal(VEHICLE_REPORTED_DEFS.load.crewOracle, 'bool');
});

test('vehicle load facts: BV, validity and the sheet against Java and the status bar; mass and crew are reported', () => {
  const ok = vehicleLoadFacts(vehicleLoadRow(), vehicleRef());
  assert.deepEqual(ok.facts, {
    bvExact: true,
    bvDistance: 0,
    validity: true,
    previewEqualsStatus: true,
  });
  // The crew oracle is not committed: always unknown.
  assert.deepEqual(ok.reported, {
    previewStatusDistance: 0,
    massJavaDistance: 0,
    crewOracle: null,
  });
  const off = vehicleLoadFacts(
    vehicleLoadRow(
      { bv: 1300, validity: 'invalid', weight: 95.5 },
      { bv: 1290, cost: 1 },
    ),
    vehicleRef(),
  );
  assert.deepEqual(off.facts, {
    bvExact: false,
    bvDistance: 53,
    validity: false,
    previewEqualsStatus: false,
  });
  assert.equal(off.reported.massJavaDistance, 0.5);
  assert.equal(off.reported.previewStatusDistance, 10);
  // No Java value is unknown; an unknown mass is an unknown distance; a missing preview is unknown.
  const none = vehicleLoadFacts(
    vehicleLoadRow({ bv: null, weight: null }, null),
    {},
  );
  assert.deepEqual(none.facts, {
    bvExact: null,
    bvDistance: null,
    validity: null,
    previewEqualsStatus: null,
  });
  assert.equal(none.reported.massJavaDistance, null);
  // A null BV against a Java value is a miss, not unknown.
  assert.equal(
    vehicleLoadFacts(vehicleLoadRow({ bv: null }), vehicleRef()).facts.bvExact,
    false,
  );
});

test('vehicle reopen facts: each observed value at both ends, the verdict by rule id, and the two loss sets', () => {
  const same = vehicleReopenFacts(vehicleReopenRow(), vehicleRef()).facts;
  assert.deepEqual(same, {
    reopenLoad: true,
    reopenJava: true,
    reopenJavaDistance: 0,
    reopenLoadDistance: 0,
    reopenMass: true,
    reopenVerdict: true,
    reopenMP: true,
    reopenCrew: true,
    reopenValid: true,
    documentLosses: [],
    mountLosses: [],
  });
  const moved = vehicleReopenFacts(
    vehicleReopenRow(
      { validity: 'invalid', reasons: ['VAL-A'] },
      {
        bv: 1340,
        weight: 94.5,
        validity: 'invalid',
        reasons: ['VAL-A', 'VAL-B'],
        mp: { cruise: 4, flank: 6, jump: 1 },
        crew: null,
      },
      {
        documentLosses: [
          { path: 'fuelType', change: 'lost' },
          { path: 'rulesLevel', change: 'changed' },
        ],
        mountLosses: ['TURRET:X#1'],
        mountAdditions: ['BODY:Y#1'],
      },
    ),
    vehicleRef(),
  ).facts;
  assert.deepEqual(
    [
      moved.reopenLoad,
      moved.reopenJava,
      moved.reopenJavaDistance,
      moved.reopenLoadDistance,
      moved.reopenMass,
      moved.reopenVerdict,
      moved.reopenMP,
      moved.reopenCrew,
      moved.reopenValid,
    ],
    [false, false, 13, 13, false, false, false, false, false],
  );
  assert.deepEqual(moved.documentLosses, [
    'changed:rulesLevel',
    'lost:fuelType',
  ]);
  assert.deepEqual(moved.mountLosses, ['+BODY:Y#1', '-TURRET:X#1']);
  // The same rule ids are the same verdict (messages are not compared).
  assert.equal(
    vehicleReopenFacts(
      vehicleReopenRow(
        { validity: 'invalid', reasons: ['VAL-A'] },
        { validity: 'invalid', reasons: ['VAL-A'] },
      ),
      vehicleRef(),
    ).facts.reopenVerdict,
    true,
  );
  // Completeness is part of the verdict.
  assert.equal(
    vehicleReopenFacts(vehicleReopenRow({}, { complete: false }), vehicleRef())
      .facts.reopenVerdict,
    false,
  );
  // An unknown mass at either end is a miss, never a pass; an explicit null crew at both ends is the same crew.
  const nulls = vehicleReopenFacts(
    vehicleReopenRow(
      { weight: null, crew: null },
      { weight: null, crew: null },
    ),
    vehicleRef(),
  ).facts;
  assert.deepEqual([nulls.reopenMass, nulls.reopenCrew], [false, true]);
});

test('a vehicle error row has every vehicle fact unknown, and facts rows validate against their own family', () => {
  for (const [measure, derive] of [
    ['load', vehicleLoadFacts],
    ['reopen', vehicleReopenFacts],
  ]) {
    const entry = derive(
      {
        ...vehicleIdentity(measure),
        status: 'error',
        error: { stage: 'open', name: 'Error', message: 'boom' },
      },
      vehicleRef(),
    );
    assert.deepEqual(
      Object.keys(entry.facts),
      Object.keys(VEHICLE_FACT_DEFS[measure]),
    );
    assert.ok(Object.values(entry.facts).every((value) => value === null));
    assert.ok(Object.values(entry.reported).every((value) => value === null));
    validateFacts(measure, entry);
  }
  const vehicle = vehicleLoadFacts(vehicleLoadRow(), vehicleRef());
  validateFacts('load', vehicle);
  // A vehicle facts row read with the mech table, or a family with no table, is malformed.
  assert.throws(() =>
    validateFacts('load', { ...vehicle, family: 'battlemechs' }),
  );
  assert.throws(
    () => validateFacts('load', { ...vehicle, family: 'aerospace' }),
    /no load facts for the family aerospace/,
  );
  const { family: _family, ...noFamily } = vehicle;
  assert.throws(
    () => validateFacts('load', noFamily),
    /no load facts for the family undefined/,
  );
});
