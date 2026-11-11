// The gate's own tests, one row per case, each with a killed mutant: the case passes against the real rules and
// FAILS against a deliberately wrong copy of them, so every rule is shown to be load-bearing.
//   node --test scripts/lib/runtime-parity/gate.test.mjs
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { FACTS_META_FILE } from './facts-provenance.mjs';
import { FACTS_FILE, FACT_DEFS, serializeFacts } from './facts.mjs';
import {
  GateError,
  buildBaseline,
  defaultRules,
  evaluate,
  main,
  parseBaseline,
  populationHash,
  serializeBaseline,
  setHash,
} from './gate.mjs';

const SHA = 'a'.repeat(40);
const RUN_SHA = 'b'.repeat(40);
const PROV = {
  factsSchemaVersion: 1,
  factsDeriverBlob: '1'.repeat(40),
  referenceSha256: '2'.repeat(64),
};

const loadFacts = (over = {}) => ({
  bvExact: true,
  bvDistance: 0,
  validity: true,
  weightOwners: true,
  ...over,
});
const reopenFacts = (over = {}) => ({
  reopenLoad: true,
  reopenJava: true,
  reopenJavaDistance: 0,
  reopenLoadDistance: 0,
  noLossConfirmationBefore: true,
  noticeResidual: [],
  noticeMismatch: [],
  rawIdentityLosses: [],
  loadedMountLosses: [],
  reopenValid: true,
  ...over,
});
const entry = (key, facts, measure = 'load') => {
  const [family, unitId] = key.split('/');
  return {
    schemaVersion: 1,
    measure,
    family,
    unitId,
    path: `meks/${unitId}.mtf`,
    status: 'ok',
    facts,
  };
};
const entries = (units, measure = 'load') =>
  Object.entries(units).map(([k, f]) => entry(k, f, measure));

/** The two committed files for a set of units: `{ main, sets }` texts. */
const baselineFiles = (units, measure = 'load', over = {}) =>
  serializeBaseline(
    buildBaseline({
      measure,
      facts: entries(units, measure),
      sha: SHA,
      note: { sha: SHA, pr: null, reason: 'seed', units: [] },
      provenance: { ...PROV, ...over },
    }),
  );

const run = {
  sha: RUN_SHA,
  scope: { families: ['battlemechs'], populationCount: 2, unitIds: null },
};
const evaluateWith = (
  {
    base,
    tonight,
    measure = 'load',
    lastGreen = null,
    ancestor = true,
    files,
    mainOverride,
    setsOverride,
    provenance = PROV,
    runOver = {},
  },
  rules = defaultRules,
) => {
  const committed = files ?? baselineFiles(base, measure);
  return evaluate(
    {
      measure,
      facts: entries(tonight, measure),
      provenance,
      baselineText: mainOverride === undefined ? committed.main : mainOverride,
      setsText: setsOverride === undefined ? committed.sets : setsOverride,
      lastGreen,
      run: {
        ...run,
        scope: {
          ...run.scope,
          populationCount: Object.keys(tonight).length,
          ...runOver,
        },
      },
      isAncestor: () => ancestor,
    },
    rules,
  );
};

/** The case passes against the real rules and fails against each mutant. */
function killed(name, check, mutants) {
  test(name, () => {
    check(defaultRules);
    for (const [label, mutant] of Object.entries(mutants))
      assert.throws(
        () => check({ ...defaultRules, ...mutant }),
        `mutant "${label}" survived`,
      );
  });
}

const U1 = 'battlemechs/a';
const U2 = 'battlemechs/b';
const two = (a, b) => ({ [U1]: a, [U2]: b });
const ignoring = (kind) => ({
  worse: (k, base, tonight) =>
    k === kind ? null : defaultRules.worse(k, base, tonight),
});

// --- each kind of "worse" ---------------------------------------------------------------------------------

killed(
  'bool pass -> fail is a regression (exit 1), named by unit and fact',
  (rules) => {
    const r = evaluateWith(
      {
        base: two(loadFacts(), loadFacts()),
        tonight: two(loadFacts({ bvExact: false }), loadFacts()),
      },
      rules,
    );
    assert.equal(r.exitCode, 1);
    assert.deepEqual(
      r.regressions.map((x) => [x.unit, x.fact, x.why]),
      [[U1, 'bvExact', 'pass -> fail']],
    );
  },
  { 'bools never regress': ignoring('bool') },
);

killed(
  'a set that gains members is a regression (inclusion rule)',
  (rules) => {
    const base = two(
      reopenFacts({ rawIdentityLosses: ['LT:1:x'] }),
      reopenFacts(),
    );
    const tonight = two(
      reopenFacts({ rawIdentityLosses: ['LT:1:x', 'LT:2:y'] }),
      reopenFacts(),
    );
    const r = evaluateWith({ base, tonight, measure: 'reopen' }, rules);
    assert.equal(r.exitCode, 1);
    assert.deepEqual(
      r.regressions.map((x) => [x.unit, x.fact, x.added]),
      [[U1, 'rawIdentityLosses', ['LT:2:y']]],
    );
  },
  { 'sets never regress': ignoring('set') },
);

killed(
  'a distance that grows beyond tolerance is a regression; growth inside it is not',
  (rules) => {
    const r = evaluateWith(
      {
        base: two(loadFacts({ bvDistance: 3 }), loadFacts()),
        tonight: two(loadFacts({ bvDistance: 4 }), loadFacts()),
      },
      rules,
    );
    assert.equal(r.exitCode, 1);
    assert.deepEqual(
      r.regressions.map((x) => [x.unit, x.fact]),
      [[U1, 'bvDistance']],
    );
    const within = evaluateWith(
      {
        base: two(loadFacts({ bvDistance: 3 }), loadFacts()),
        tonight: two(loadFacts({ bvDistance: 3 + 1e-12 }), loadFacts()),
      },
      rules,
    );
    assert.equal(within.exitCode, 0);
  },
  {
    'distances never regress': ignoring('distance'),
    'no tolerance': {
      worse: (kind, base, tonight) =>
        kind === 'distance' && base !== null && tonight !== null
          ? tonight > base
            ? { why: 'grew' }
            : null
          : defaultRules.worse(kind, base, tonight),
    },
  },
);

killed(
  'a unit that already fails reopen = load and gets worse still regresses, by reopenLoadDistance',
  (rules) => {
    const base = two(
      reopenFacts({ reopenLoad: false, reopenLoadDistance: 5 }),
      reopenFacts(),
    );
    const tonight = two(
      reopenFacts({ reopenLoad: false, reopenLoadDistance: 8 }),
      reopenFacts(),
    );
    const r = evaluateWith({ base, tonight, measure: 'reopen' }, rules);
    assert.equal(r.exitCode, 1);
    assert.deepEqual(
      r.regressions.map((x) => [x.unit, x.fact]),
      [[U1, 'reopenLoadDistance']],
    );
    // Getting better is a gain, not a regression.
    const better = evaluateWith(
      {
        base,
        tonight: two(
          reopenFacts({ reopenLoad: false, reopenLoadDistance: 2 }),
          reopenFacts(),
        ),
        measure: 'reopen',
      },
      rules,
    );
    assert.equal(better.exitCode, 0);
  },
  { 'distances never regress': ignoring('distance') },
);

killed(
  'a known value that becomes unknown is a regression, for every kind',
  (rules) => {
    const base = two(reopenFacts(), reopenFacts());
    for (const name of Object.keys(FACT_DEFS.reopen)) {
      const r = evaluateWith(
        {
          base,
          tonight: two(reopenFacts({ [name]: null }), reopenFacts()),
          measure: 'reopen',
        },
        rules,
      );
      assert.equal(r.exitCode, 1, name);
      assert.deepEqual(
        r.regressions.map((x) => [x.unit, x.fact, x.why]),
        [[U1, name, 'known -> unknown']],
      );
    }
  },
  {
    'unknown counts as a pass': {
      worse: (kind, base, tonight) =>
        tonight === null ? null : defaultRules.worse(kind, base, tonight),
    },
  },
);

killed(
  'a swap with an unchanged count is still a regression',
  (rules) => {
    const base = two(
      reopenFacts({ noticeResidual: ['a', 'b'] }),
      reopenFacts(),
    );
    const tonight = two(
      reopenFacts({ noticeResidual: ['a', 'c'] }),
      reopenFacts(),
    );
    const r = evaluateWith({ base, tonight, measure: 'reopen' }, rules);
    assert.equal(r.exitCode, 1);
    assert.deepEqual(
      r.regressions.map((x) => [x.fact, x.added]),
      [['noticeResidual', ['c']]],
    );
  },
  {
    'compares set sizes only': {
      worse: (kind, base, tonight) =>
        kind === 'set' && base !== null && tonight !== null
          ? tonight.length > base.length
            ? { why: 'bigger' }
            : null
          : defaultRules.worse(kind, base, tonight),
    },
  },
);

test('unknown in the baseline claims nothing, and a bool fail -> pass is a gain that passes', () => {
  const base = two(loadFacts({ bvExact: false }), loadFacts());
  // A baseline can hold an unknown (an older census that could not tell); tonight knowing it is a gain.
  const files = baselineFiles(base);
  const main = JSON.parse(files.main);
  main.units[U1].validity = null;
  const r = evaluateWith({
    base,
    mainOverride: JSON.stringify(main),
    tonight: two(loadFacts({ validity: false, bvExact: true }), loadFacts()),
  });
  assert.equal(r.exitCode, 0);
  assert.deepEqual(r.gains.map((g) => [g.unit, g.fact]).sort(), [
    [U1, 'bvExact'],
    [U1, 'validity'],
  ]);
});

// --- the population ---------------------------------------------------------------------------------------

killed(
  'an added unit is unbaselined: counted in the headline, listed by id, never a fail',
  (rules) => {
    const r = evaluateWith(
      {
        base: { [U1]: loadFacts() },
        tonight: two(loadFacts(), loadFacts({ bvExact: false })),
      },
      rules,
    );
    assert.equal(r.exitCode, 0);
    assert.deepEqual(r.unbaselined, [U2]);
    assert.match(r.headline, /1 unbaselined/);
    assert.deepEqual(r.proposedBaseline.unbaselined, [U2]);
  },
  { 'added units fail the night': { addedUnitsFail: true } },
);

killed(
  'a removed unit fails closed (exit 2, POPULATION_UNIT_REMOVED), naming the id, not a measured regression',
  (rules) => {
    const r = evaluateWith(
      { base: two(loadFacts(), loadFacts()), tonight: { [U1]: loadFacts() } },
      rules,
    );
    assert.equal(r.exitCode, 2);
    assert.deepEqual(r.removed, [U2]);
    assert.equal(r.failClosed[0].reason, 'POPULATION_UNIT_REMOVED');
    assert.match(r.failClosed[0].message, /battlemechs\/b/);
    assert.deepEqual(
      r.regressions,
      [],
      'exit 1 is for measured regressions only',
    );
    assert.match(r.headline, /FAIL CLOSED: POPULATION_UNIT_REMOVED/);
    assert.equal(r.lastGreenOut, undefined);
  },
  { 'removed units are ignored': { removedUnitsFail: false } },
);

killed(
  'a removal together with a measured regression is still exit 2, and names both',
  (rules) => {
    const r = evaluateWith(
      {
        base: two(loadFacts(), loadFacts()),
        tonight: { [U1]: loadFacts({ bvExact: false }) },
      },
      rules,
    );
    assert.equal(r.exitCode, 2);
    assert.deepEqual(r.removed, [U2]);
    assert.deepEqual(
      r.regressions.map((x) => [x.unit, x.fact]),
      [[U1, 'bvExact']],
    );
    assert.match(r.headline, /also worse/);
  },
  { 'removed units are ignored': { removedUnitsFail: false } },
);

killed(
  'a renamed unit looks like a removal plus an addition, and fails closed',
  (rules) => {
    const r = evaluateWith(
      {
        base: two(loadFacts(), loadFacts()),
        tonight: { [U1]: loadFacts(), 'battlemechs/b-renamed': loadFacts() },
      },
      rules,
    );
    assert.equal(r.exitCode, 2);
    assert.deepEqual(r.removed, [U2]);
    assert.deepEqual(r.unbaselined, ['battlemechs/b-renamed']);
    assert.equal(r.failClosed[0].reason, 'POPULATION_UNIT_REMOVED');
  },
  { 'removals ignored, additions free': { removedUnitsFail: false } },
);

// --- fail closed ------------------------------------------------------------------------------------------

killed(
  'a missing baseline fails closed',
  (rules) => {
    const r = evaluateWith(
      {
        base: {},
        tonight: two(loadFacts(), loadFacts()),
        files: { main: null, sets: null },
      },
      rules,
    );
    assert.equal(r.exitCode, 2);
    assert.equal(r.failClosed[0].reason, 'BASELINE_MISSING');
  },
  { 'no baseline passes': { requireBaseline: false } },
);

test('a malformed baseline fails closed: bad JSON, a fact missing from a unit, an edited unit list or count, a stale schema, no provenance', () => {
  const good = JSON.parse(baselineFiles(two(loadFacts(), loadFacts())).main);
  const { factsDeriverBlob, ...noProvenance } = good;
  const cases = {
    'not json': '{nope',
    'a gated fact missing': JSON.stringify({
      ...good,
      units: { ...good.units, [U1]: { bvExact: true } },
    }),
    'unit removed by hand': JSON.stringify({
      ...good,
      units: { [U1]: good.units[U1] },
    }),
    'unit renamed by hand, count unchanged': JSON.stringify({
      ...good,
      units: { [U1]: good.units[U1], 'battlemechs/renamed': good.units[U2] },
    }),
    'count edited by hand': JSON.stringify({ ...good, populationCount: 5 }),
    'wrong measure': JSON.stringify({ ...good, measure: 'reopen' }),
    'no notes': JSON.stringify({ ...good, notes: [] }),
    'no facts provenance': JSON.stringify(noProvenance),
    'unknown extra key': JSON.stringify({ ...good, extra: 1 }),
  };
  assert.ok(factsDeriverBlob);
  for (const [label, text] of Object.entries(cases)) {
    const r = evaluateWith({
      files: { main: null, sets: null },
      tonight: two(loadFacts(), loadFacts()),
      mainOverride: text,
      setsOverride: null,
    });
    assert.equal(r.exitCode, 2, label);
    assert.equal(r.failClosed[0].reason, 'BASELINE_MALFORMED', label);
    if (label === 'a gated fact missing')
      assert.match(r.failClosed[0].message, /no baseline entry for gated fact/);
    if (label === 'count edited by hand')
      assert.match(r.failClosed[0].message, /populationCount/);
    if (label === 'unit renamed by hand, count unchanged')
      assert.match(r.failClosed[0].message, /populationHash/);
  }
});

killed(
  'a baseline at a non-ancestor SHA fails closed',
  (rules) => {
    const r = evaluateWith(
      {
        base: two(loadFacts(), loadFacts()),
        tonight: two(loadFacts(), loadFacts()),
        ancestor: false,
      },
      rules,
    );
    assert.equal(r.exitCode, 2);
    assert.equal(r.failClosed[0].reason, 'BASELINE_SHA_NOT_ANCESTOR');
  },
  { 'ancestry not checked': { requireAncestor: false } },
);

test('a narrowed or short run fails closed instead of reading as removed units', () => {
  const base = two(loadFacts(), loadFacts());
  const narrowed = evaluateWith({
    base,
    tonight: { [U1]: loadFacts() },
    runOver: { unitIds: ['a'], populationCount: 2 },
  });
  assert.equal(narrowed.exitCode, 2);
  assert.equal(narrowed.failClosed[0].reason, 'RUN_NARROWED');
  const short = evaluateWith({
    base,
    tonight: { [U1]: loadFacts() },
    runOver: { populationCount: 2 },
  });
  assert.equal(short.exitCode, 2);
  assert.equal(short.failClosed[0].reason, 'RUN_INCOMPLETE');
});

// --- facts provenance -------------------------------------------------------------------------------------

killed(
  'facts derived by a different facts.mjs fail closed: FACTS_DERIVER_CHANGED, and the fix is a rebaseline',
  (rules) => {
    const r = evaluateWith(
      {
        base: two(loadFacts(), loadFacts()),
        tonight: two(loadFacts(), loadFacts()),
        provenance: { ...PROV, factsDeriverBlob: '9'.repeat(40) },
      },
      rules,
    );
    assert.equal(r.exitCode, 2);
    assert.equal(r.failClosed[0].reason, 'FACTS_DERIVER_CHANGED');
    assert.match(r.failClosed[0].message, /rebaseline/);
    assert.equal(r.provenance.deriverChanged, true);
  },
  { 'deriver not compared': { requireSameDeriver: false } },
);

killed(
  'a different facts schema version fails closed: FACTS_SCHEMA_CHANGED',
  (rules) => {
    const r = evaluateWith(
      {
        base: two(loadFacts(), loadFacts()),
        tonight: two(loadFacts(), loadFacts()),
        provenance: { ...PROV, factsSchemaVersion: 2 },
      },
      rules,
    );
    assert.equal(r.exitCode, 2);
    assert.equal(r.failClosed[0].reason, 'FACTS_SCHEMA_CHANGED');
  },
  { 'deriver not compared': { requireSameDeriver: false } },
);

test('missing provenance fails closed; a different Java reference is reported and does not fail', () => {
  const base = two(loadFacts(), loadFacts());
  const none = evaluateWith({ base, tonight: base, provenance: null });
  assert.equal(none.exitCode, 2);
  assert.equal(none.failClosed[0].reason, 'FACTS_PROVENANCE_MISSING');
  const moved = evaluateWith({
    base,
    tonight: base,
    provenance: { ...PROV, referenceSha256: '3'.repeat(64) },
  });
  assert.equal(moved.exitCode, 0);
  assert.equal(moved.provenance.referenceChanged, true);
});

// --- the sidecar ------------------------------------------------------------------------------------------

const reopenUnits = () =>
  two(
    reopenFacts({
      rawIdentityLosses: ['LT:1:a', 'LT:2:b'],
      noticeResidual: ['LT:1:a'],
    }),
    reopenFacts({ rawIdentityLosses: ['CT:0:c'] }),
  );
const sidecarCase = (name, mutate, expectIds) =>
  killed(
    `sidecar integrity: ${name} fails closed (BASELINE_SIDECAR_MISMATCH), naming the units`,
    (rules) => {
      const files = baselineFiles(reopenUnits(), 'reopen');
      const r = evaluateWith(
        {
          base: reopenUnits(),
          tonight: reopenUnits(),
          measure: 'reopen',
          files: mutate(files),
        },
        rules,
      );
      assert.equal(r.exitCode, 2);
      assert.equal(r.failClosed[0].reason, 'BASELINE_SIDECAR_MISMATCH');
      for (const id of expectIds)
        assert.match(r.failClosed[0].message, new RegExp(id));
    },
    { 'sidecar not checked': { verifySidecar: false } },
  );

const lines = (text) => text.split('\n').filter(Boolean);
sidecarCase(
  'a hand-edited member',
  (f) => ({
    ...f,
    sets: f.sets.replace('"LT:2:b"', '"LT:2:z"'),
  }),
  [U1],
);
sidecarCase(
  'a dropped sidecar line',
  (f) => ({ ...f, sets: lines(f.sets).slice(1).join('\n') + '\n' }),
  [U1],
);
sidecarCase(
  'an extra sidecar unit',
  (f) => ({
    ...f,
    sets:
      f.sets +
      JSON.stringify({
        u: 'battlemechs/ghost',
        rawIdentityLosses: ['LT:1:q'],
      }) +
      '\n',
  }),
  ['battlemechs/ghost'],
);
sidecarCase('a missing sidecar file', (f) => ({ ...f, sets: null }), [
  'is missing',
]);
sidecarCase(
  'a malformed line',
  (f) => ({ ...f, sets: f.sets + '{not json\n' }),
  ['line 3'],
);

killed(
  'a hand-edited member count in the main file is caught by the sidecar check too',
  (rules) => {
    const files = baselineFiles(reopenUnits(), 'reopen');
    const main = JSON.parse(files.main);
    main.units[U2].rawIdentityLosses = {
      n: 5,
      h: main.units[U2].rawIdentityLosses.h,
    };
    const r = evaluateWith(
      {
        base: reopenUnits(),
        tonight: reopenUnits(),
        measure: 'reopen',
        files: { ...files, main: JSON.stringify(main) },
      },
      rules,
    );
    assert.equal(r.exitCode, 2);
    assert.equal(r.failClosed[0].reason, 'BASELINE_SIDECAR_MISMATCH');
    assert.match(r.failClosed[0].message, /battlemechs\/b/);
  },
  { 'sidecar not checked': { verifySidecar: false } },
);

test('the two files: main is one sorted unit per line with set sizes and hashes, the sidecar one sorted line per unit with readable members', () => {
  const { main, sets } = baselineFiles(reopenUnits(), 'reopen');
  const mainLines = main.split('\n');
  const unitLines = mainLines.filter((l) => l.includes('"battlemechs/'));
  assert.equal(unitLines.length, 2);
  assert.ok(unitLines[0].includes(U1) && unitLines[1].includes(U2));
  assert.match(
    unitLines[0],
    /"rawIdentityLosses":\{"n":2,"h":"[a-f0-9]{16}"\}/,
  );
  assert.ok(
    !main.includes('LT:1:a'),
    'members live in the sidecar, not the main file',
  );
  const setLines = lines(sets).map((l) => JSON.parse(l));
  assert.deepEqual(
    setLines.map((l) => l.u),
    [U1, U2],
  );
  assert.deepEqual(setLines[0].rawIdentityLosses, ['LT:1:a', 'LT:2:b']);
  assert.ok(!('loadedMountLosses' in setLines[0]), 'empty sets are omitted');
  // One function hashes members for both files.
  assert.equal(
    JSON.parse(
      mainLines
        .find((l) => l.includes(U1))
        .replace(/^\s*"[^"]+":\s*/, '')
        .replace(/,$/, ''),
    ).rawIdentityLosses.h,
    setHash(['LT:1:a', 'LT:2:b']),
  );
  // Reading both back gives the logical baseline, members exact.
  const back = parseBaseline('reopen', main, sets);
  assert.deepEqual(back.units[U1].rawIdentityLosses, ['LT:1:a', 'LT:2:b']);
  assert.deepEqual(back.units[U2].noticeResidual, []);
  // A load baseline has no sidecar.
  assert.equal(baselineFiles(two(loadFacts(), loadFacts())).sets, null);
});

// --- last green -------------------------------------------------------------------------------------------

killed(
  'a missing last-green artifact passes on the committed baseline alone, and says so',
  (rules) => {
    const r = evaluateWith(
      {
        base: two(loadFacts(), loadFacts()),
        tonight: two(loadFacts(), loadFacts()),
        lastGreen: null,
      },
      rules,
    );
    assert.equal(r.exitCode, 0);
    assert.equal(r.lastGreen.status, 'missing');
    assert.match(r.lastGreen.detail, /committed baseline alone/);
  },
  { 'a missing artifact fails the night': { missingLastGreenFails: true } },
);

const greenOf = (units, base) => ({
  schemaVersion: 1,
  measure: 'load',
  runSha: 'c'.repeat(40),
  baselineSha256: base,
  units,
});
const blobOf = ({ main, sets }) =>
  createHash('sha256')
    .update(
      Buffer.concat([
        Buffer.from(main),
        Buffer.from('\0'),
        Buffer.from(sets ?? ''),
      ]),
    )
    .digest('hex');

test('malformed last-green distance cannot hide the Aquagladius 336 -> 337 regression', () => {
  const unit = 'battlemechs/aquagladius-aqs-5-mam';
  const base = { [unit]: loadFacts({ bvDistance: 336 }), [U2]: loadFacts() };
  const files = baselineFiles(base);
  const r = evaluateWith({
    base,
    files,
    tonight: { ...base, [unit]: loadFacts({ bvDistance: 337 }) },
    lastGreen: greenOf(
      { ...base, [unit]: loadFacts({ bvDistance: 'bad' }) },
      blobOf(files),
    ),
  });
  assert.equal(r.exitCode, 1);
  assert.deepEqual(
    r.regressions.map(({ unit, fact, source }) => [unit, fact, source]),
    [[unit, 'bvDistance', 'baseline']],
  );
  assert.equal(r.lastGreen.status, 'malformed');
  assert.match(
    r.lastGreen.detail,
    /units\.battlemechs\/aquagladius-aqs-5-mam\.bvDistance/,
  );
  assert.deepEqual(r.failClosed, []);
});

for (const [label, override, badPath] of [
  ['non-numeric distance', { bvDistance: 'bad' }, 'bvDistance'],
  ['NaN distance', { bvDistance: NaN }, 'bvDistance'],
  [
    'Infinity distance from JSON 1e999',
    { bvDistance: JSON.parse('1e999') },
    'bvDistance',
  ],
  ['negative distance', { bvDistance: -1 }, 'bvDistance'],
  ['wrong boolean type', { bvExact: 'true' }, 'bvExact'],
  ['unknown fact key', { surprise: true }, 'surprise'],
  ['missing fact', { bvExact: undefined }, 'bvExact'],
])
  test(`last green with ${label} is discarded wholly without failing the night`, () => {
    const base = two(loadFacts({ bvExact: false }), loadFacts());
    const files = baselineFiles(base);
    const r = evaluateWith({
      base,
      files,
      tonight: base,
      lastGreen: greenOf(two(loadFacts(), loadFacts(override)), blobOf(files)),
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.lastGreen.status, 'malformed');
    assert.ok(r.lastGreen.detail.includes(`units.${U2}.${badPath}`));
    assert.match(r.lastGreen.detail, /committed baseline alone/);
    assert.deepEqual(r.regressions, []);
    assert.deepEqual(r.failClosed, []);
  });

for (const [label, override, badPath] of [
  ['wrong measure', { measure: 'other' }, 'measure'],
  ['wrong schema version', { schemaVersion: 2 }, 'schemaVersion'],
  ['wrong run SHA', { runSha: 'bad' }, 'runSha'],
  ['non-string baseline hash', { baselineSha256: 123 }, 'baselineSha256'],
  ['missing units', { units: undefined }, 'units'],
  ['array units', { units: [] }, 'units'],
  ['null unit facts', { units: { [U1]: null } }, `units.${U1}`],
])
  test(`malformed last-green envelope: ${label} is reported and ignored`, () => {
    const base = two(loadFacts(), loadFacts());
    const files = baselineFiles(base);
    const r = evaluateWith({
      base,
      files,
      tonight: base,
      lastGreen: { ...greenOf(base, blobOf(files)), ...override },
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.lastGreen.status, 'malformed');
    assert.ok(r.lastGreen.detail.includes(badPath));
    assert.deepEqual(r.failClosed, []);
  });

test('a falsy scalar last-green artifact is malformed rather than silently missing', () => {
  const base = two(loadFacts(), loadFacts());
  const r = evaluateWith({ base, tonight: base, lastGreen: false });
  assert.equal(r.exitCode, 0);
  assert.equal(r.lastGreen.status, 'malformed');
  assert.match(r.lastGreen.detail, /\(root\)/);
});

for (const value of ['bad', [123], ['b', 'a'], ['a', 'a']])
  test(`malformed last-green set ${JSON.stringify(value)} is discarded`, () => {
    const base = two(reopenFacts(), reopenFacts());
    const files = baselineFiles(base, 'reopen');
    const r = evaluateWith({
      base,
      files,
      tonight: base,
      measure: 'reopen',
      lastGreen: {
        ...greenOf(
          two(reopenFacts({ rawIdentityLosses: value }), reopenFacts()),
          blobOf(files),
        ),
        measure: 'reopen',
      },
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.lastGreen.status, 'malformed');
    assert.ok(r.lastGreen.detail.includes(`units.${U1}.rawIdentityLosses`));
  });

test('a well-formed last green still tightens distances and sets', () => {
  for (const measure of ['load', 'reopen']) {
    const base =
      measure === 'load'
        ? two(loadFacts({ bvDistance: 336 }), loadFacts())
        : two(reopenFacts({ rawIdentityLosses: ['a', 'b'] }), reopenFacts());
    const green =
      measure === 'load'
        ? two(loadFacts({ bvDistance: 335 }), loadFacts())
        : two(reopenFacts({ rawIdentityLosses: ['a'] }), reopenFacts());
    const files = baselineFiles(base, measure);
    const r = evaluateWith({
      base,
      files,
      tonight: base,
      measure,
      lastGreen: { ...greenOf(green, blobOf(files)), measure },
    });
    assert.equal(r.exitCode, 1);
    assert.equal(r.lastGreen.status, 'applied');
    assert.equal(r.regressions[0].source, 'last-green');
  }
});

test('baseline rejects a JSON distance of 1e999 instead of accepting Infinity', () => {
  const base = two(loadFacts(), loadFacts());
  const files = baselineFiles(base);
  const r = evaluateWith({
    base,
    tonight: base,
    files,
    mainOverride: files.main.replace('"bvDistance":0', '"bvDistance":1e999'),
  });
  assert.equal(r.exitCode, 2);
  assert.equal(r.failClosed[0].reason, 'BASELINE_MALFORMED');
  assert.match(r.failClosed[0].message, /bvDistance/);
});

killed(
  'last green tightens an unfolded gain, but only while the committed baseline is byte-unchanged',
  (rules) => {
    const baseUnits = two(loadFacts({ bvExact: false }), loadFacts());
    const files = baselineFiles(baseUnits);
    const tonight = two(loadFacts({ bvExact: false }), loadFacts());
    const lastGreenUnits = two(loadFacts({ bvExact: true }), loadFacts());
    const input = (lastGreen) => ({
      base: baseUnits,
      tonight,
      lastGreen,
      files,
    });
    const tight = evaluateWith(
      input(greenOf(lastGreenUnits, blobOf(files))),
      rules,
    );
    assert.equal(tight.exitCode, 1);
    assert.deepEqual(
      tight.regressions.map((x) => [x.unit, x.fact, x.source]),
      [[U1, 'bvExact', 'last-green']],
    );
    assert.equal(tight.lastGreen.status, 'applied');
    const stale = evaluateWith(
      input(greenOf(lastGreenUnits, 'f'.repeat(64))),
      rules,
    );
    assert.equal(stale.exitCode, 0);
    assert.equal(stale.lastGreen.status, 'stale');
  },
  {
    'tightens against a different baseline': { requireSameBaselineBlob: false },
  },
);

killed(
  'gains pass and are listed as unprotected, with a proposed baseline that folds them in',
  (rules) => {
    const r = evaluateWith(
      {
        base: two(loadFacts({ bvExact: false, bvDistance: 5 }), loadFacts()),
        tonight: two(loadFacts(), loadFacts()),
      },
      rules,
    );
    assert.equal(r.exitCode, 0);
    assert.deepEqual(r.unprotectedGains.map((g) => [g.unit, g.fact]).sort(), [
      [U1, 'bvDistance'],
      [U1, 'bvExact'],
    ]);
    assert.equal(r.proposedBaseline.units[U1].bvExact, true);
    assert.equal(r.proposedBaseline.units[U1].bvDistance, 0);
    assert.ok(
      r.lastGreenOut,
      'a green run writes the artifact the next night tightens to',
    );
  },
  { 'gains are not noticed': { better: () => false } },
);

// --- baselines --------------------------------------------------------------------------------------------

test('buildBaseline records a complete run with its SHA, provenance, population hash and a checked note, and keeps earlier notes', () => {
  const first = buildBaseline({
    measure: 'load',
    facts: entries(two(loadFacts(), loadFacts())),
    sha: SHA,
    note: { sha: SHA, pr: null, reason: 'seed', units: [] },
    provenance: PROV,
  });
  assert.equal(first.sha, SHA);
  assert.equal(first.factsDeriverBlob, PROV.factsDeriverBlob);
  assert.equal(first.factsSchemaVersion, 1);
  assert.equal(first.referenceSha256, PROV.referenceSha256);
  assert.equal(first.populationCount, 2);
  assert.equal(first.populationHash, populationHash([U1, U2]));
  const second = buildBaseline({
    measure: 'load',
    facts: entries(two(loadFacts(), loadFacts())),
    sha: RUN_SHA,
    note: {
      sha: 'd'.repeat(40),
      pr: 3400,
      reason: 'A2 locks in the Mad Cats',
      units: [U1],
    },
    provenance: PROV,
    existing: first,
  });
  assert.deepEqual(
    second.notes.map((n) => n.reason),
    ['seed', 'A2 locks in the Mad Cats'],
  );
});

test('buildBaseline refuses a run with a failed, incomplete or unknown unit, a bad note and missing provenance', () => {
  const ok = entries(two(loadFacts(), loadFacts()));
  const note = { sha: SHA, pr: null, reason: 'seed', units: [] };
  const refuse = (facts, message) =>
    assert.throws(
      () =>
        buildBaseline({
          measure: 'load',
          facts,
          sha: SHA,
          note,
          provenance: PROV,
        }),
      (e) =>
        e instanceof GateError &&
        e.reason === 'BASELINE_REFUSED' &&
        message.test(e.message),
    );
  refuse(
    [ok[0], { ...ok[1], status: 'error' }],
    /failed or have an unknown fact/,
  );
  refuse(
    [ok[0], { ...ok[1], facts: loadFacts({ validity: null }) }],
    /unknown fact/,
  );
  refuse([], /no units/);
  assert.throws(() =>
    buildBaseline({
      measure: 'load',
      facts: ok,
      sha: SHA,
      note: { ...note, reason: '' },
      provenance: PROV,
    }),
  );
  assert.throws(() =>
    buildBaseline({ measure: 'load', facts: ok, sha: SHA, note }),
  );
});

// --- the command line, end to end -------------------------------------------------------------------------

test('main reads a run directory and the committed files, writes the report files, and exits 0, 1 or 2', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-'));
  try {
    const runDir = path.join(root, 'run');
    fs.mkdirSync(runDir);
    const baselineFile = path.join(root, 'baseline-reopen.json');
    const setsFile = path.join(root, 'baseline-reopen.sets.ndjson');
    const write = (tonight, base = reopenUnits(), prov = PROV) => {
      fs.writeFileSync(
        path.join(runDir, FACTS_FILE),
        serializeFacts('reopen', entries(tonight, 'reopen')),
      );
      fs.writeFileSync(
        path.join(runDir, FACTS_META_FILE),
        JSON.stringify({ schemaVersion: 1, measure: 'reopen', ...prov }),
      );
      fs.writeFileSync(
        path.join(runDir, 'receipt.json'),
        JSON.stringify({
          measure: 'reopen',
          repoSha: RUN_SHA,
          scope: {
            families: ['battlemechs'],
            populationCount: Object.keys(tonight).length,
            unitIds: null,
          },
        }),
      );
      const files = baselineFiles(base, 'reopen');
      fs.writeFileSync(baselineFile, files.main);
      fs.writeFileSync(setsFile, files.sets);
    };
    const go = (extra = []) => {
      const logs = [];
      const log = console.log;
      console.log = (...a) => logs.push(a.join(' '));
      try {
        return {
          code: main(
            [
              '--measure',
              'reopen',
              '--run-dir',
              runDir,
              '--baseline',
              baselineFile,
              '--repo',
              root,
              '--out',
              path.join(root, 'out'),
              ...extra,
            ],
            { isAncestor: () => true },
          ),
          logs,
        };
      } finally {
        console.log = log;
      }
    };
    // The facts files are sorted sets, so build tonight from sorted members.
    write(reopenUnits());
    const green = go();
    assert.equal(green.code, 0);
    assert.ok(fs.existsSync(path.join(root, 'out/gate-report.json')));
    assert.ok(fs.existsSync(path.join(root, 'out/last-green.json')));
    assert.match(green.logs.join('\n'), /PASS/);
    assert.match(green.logs.join('\n'), /last green: missing/);
    const again = go(['--last-green', path.join(root, 'out/last-green.json')]);
    assert.equal(again.code, 0);
    assert.match(again.logs.join('\n'), /last green: applied/);
    write(
      two(
        reopenFacts({
          rawIdentityLosses: ['LT:1:a', 'LT:2:b', 'LT:3:new'],
          noticeResidual: ['LT:1:a'],
        }),
        reopenFacts({ rawIdentityLosses: ['CT:0:c'] }),
      ),
    );
    const red = go();
    assert.equal(red.code, 1);
    assert.match(
      red.logs.join('\n'),
      /battlemechs\/a rawIdentityLosses: gained 1 member/,
    );
    // The sidecar is checked at load, through the command line too.
    fs.writeFileSync(
      setsFile,
      fs.readFileSync(setsFile, 'utf8').replace('"LT:2:b"', '"LT:2:z"'),
    );
    const tampered = go();
    assert.equal(tampered.code, 2);
    assert.match(tampered.logs.join('\n'), /BASELINE_SIDECAR_MISMATCH/);
    fs.rmSync(setsFile);
    assert.equal(go().code, 2);
    fs.rmSync(baselineFile);
    const closedRun = go();
    assert.equal(closedRun.code, 2);
    assert.match(closedRun.logs.join('\n'), /BASELINE_MISSING/);
    write(reopenUnits());
    fs.rmSync(path.join(runDir, FACTS_META_FILE));
    const noMeta = go();
    assert.equal(noMeta.code, 2);
    assert.match(noMeta.logs.join('\n'), /FACTS_PROVENANCE_MISSING/);
    fs.rmSync(path.join(runDir, FACTS_FILE));
    assert.equal(go().code, 2);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
