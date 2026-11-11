// What the nightly gate holds a baseline for, derived from a row and the Java reference.
//   node --test scripts/lib/runtime-parity/facts.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FACT_DEFS,
  decodeCell,
  encodeCell,
  loadFacts,
  parseFacts,
  reopenFacts,
  serializeFacts,
  validateFacts,
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
const loadRow = (over = {}) => ({
  ...identity('load'),
  status: 'ok',
  load: { observed: observed(over) },
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
  });
  assert.deepEqual(loadFacts(loadRow({ bv: 990 }), ref()).facts, {
    bvExact: false,
    bvDistance: 10,
    validity: true,
    weightOwners: true,
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

test('an error row has every fact unknown, in both measures', () => {
  for (const measure of ['load', 'reopen']) {
    const entry = (measure === 'load' ? loadFacts : reopenFacts)(
      error(measure),
      ref(),
    );
    assert.equal(entry.status, 'error');
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
