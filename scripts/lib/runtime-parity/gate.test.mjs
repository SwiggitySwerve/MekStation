// The gate's own tests, one row per case, each with a killed mutant: the case passes against the real rules and
// FAILS against a deliberately wrong copy of them, so every rule is shown to be load-bearing.
//   node --test scripts/lib/runtime-parity/gate.test.mjs
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { FACTS_FILE, FACT_DEFS, serializeFacts } from './facts.mjs';
import {
  GateError,
  buildBaseline,
  defaultRules,
  evaluate,
  main,
  populationHash,
  serializeBaseline,
  validateBaseline,
} from './gate.mjs';

const SHA = 'a'.repeat(40);
const RUN_SHA = 'b'.repeat(40);

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

const baselineText = (units, measure = 'load', over = {}) =>
  JSON.stringify(
    {
      ...buildBaseline({
        measure,
        facts: entries(units, measure),
        sha: SHA,
        note: { sha: SHA, pr: null, reason: 'seed', units: [] },
      }),
      ...over,
    },
    null,
    2,
  ) + '\n';

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
    baselineOverride,
    runOver = {},
  },
  rules = defaultRules,
) =>
  evaluate(
    {
      measure,
      facts: entries(tonight, measure),
      baselineText:
        baselineOverride === undefined
          ? baselineText(base, measure)
          : baselineOverride,
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

// --- each kind of "worse" ---------------------------------------------------------------------------------

killed(
  'bool pass -> fail is a regression, named by unit and fact',
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
  {
    'bools never regress': {
      worse: (kind, base, tonight) =>
        kind === 'bool' ? null : defaultRules.worse(kind, base, tonight),
    },
  },
);

killed(
  'a set that gains members is a regression (inclusion rule)',
  (rules) => {
    const base = two(reopenFacts({ rawIdentityLosses: ['x'] }), reopenFacts());
    const tonight = two(
      reopenFacts({ rawIdentityLosses: ['x', 'y'] }),
      reopenFacts(),
    );
    const r = evaluateWith({ base, tonight, measure: 'reopen' }, rules);
    assert.equal(r.exitCode, 1);
    assert.deepEqual(
      r.regressions.map((x) => [x.unit, x.fact, x.added]),
      [[U1, 'rawIdentityLosses', ['y']]],
    );
  },
  {
    'sets never regress': {
      worse: (kind, base, tonight) =>
        kind === 'set' ? null : defaultRules.worse(kind, base, tonight),
    },
  },
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
    'distances never regress': {
      worse: (kind, base, tonight) =>
        kind === 'distance' ? null : defaultRules.worse(kind, base, tonight),
    },
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
  'a known value that becomes unknown is a regression, for every kind',
  (rules) => {
    const base = two(reopenFacts(), reopenFacts());
    for (const [name] of Object.entries(FACT_DEFS.reopen)) {
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
  const withUnknown = JSON.parse(baselineText(base));
  withUnknown.units[U1].validity = null;
  const r = evaluateWith({
    base,
    baselineOverride: JSON.stringify(withUnknown),
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
  'a removed unit fails: the baseline unit is absent from the run, known -> unknown',
  (rules) => {
    const r = evaluateWith(
      { base: two(loadFacts(), loadFacts()), tonight: { [U1]: loadFacts() } },
      rules,
    );
    assert.equal(r.exitCode, 1);
    assert.deepEqual(r.removed, [U2]);
    assert.match(r.headline, /1 removed or renamed/);
    assert.deepEqual(
      r.regressions.map((x) => [x.unit, x.fact]),
      [[U2, '*']],
    );
  },
  { 'removed units are ignored': { removedUnitsFail: false } },
);

killed(
  'a renamed unit looks like a removal plus an addition, and fails',
  (rules) => {
    const r = evaluateWith(
      {
        base: two(loadFacts(), loadFacts()),
        tonight: { [U1]: loadFacts(), 'battlemechs/b-renamed': loadFacts() },
      },
      rules,
    );
    assert.equal(r.exitCode, 1);
    assert.deepEqual(r.removed, [U2]);
    assert.deepEqual(r.unbaselined, ['battlemechs/b-renamed']);
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
        baselineOverride: null,
      },
      rules,
    );
    assert.equal(r.exitCode, 2);
    assert.equal(r.failClosed[0].reason, 'BASELINE_MISSING');
  },
  { 'no baseline passes': { requireBaseline: false } },
);

test('a malformed baseline fails closed: bad JSON, a fact missing from a unit, a hand-edited unit list, a stale schema', () => {
  const good = JSON.parse(baselineText(two(loadFacts(), loadFacts())));
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
    'unknown extra key': JSON.stringify({ ...good, extra: 1 }),
  };
  for (const [label, text] of Object.entries(cases)) {
    const r = evaluateWith({
      base: {},
      tonight: two(loadFacts(), loadFacts()),
      baselineOverride: text,
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

const greenOf = (units, base, over = {}) => ({
  schemaVersion: 1,
  measure: 'load',
  runSha: 'c'.repeat(40),
  baselineSha256: base,
  units,
  ...over,
});
const sha256Of = (text) =>
  createHash('sha256').update(Buffer.from(text)).digest('hex');

killed(
  'last green tightens an unfolded gain, but only while the committed baseline blob is unchanged',
  (rules) => {
    const baseUnits = two(loadFacts({ bvExact: false }), loadFacts());
    const text = baselineText(baseUnits);
    const tonight = two(loadFacts({ bvExact: false }), loadFacts());
    const lastGreenUnits = two(loadFacts({ bvExact: true }), loadFacts());
    const input = (lastGreen) => ({
      base: baseUnits,
      tonight,
      lastGreen,
      baselineOverride: text,
    });
    // Same blob: the gain from last night is protected, so losing it again fails, by source.
    const tight = evaluateWith(
      input(greenOf(lastGreenUnits, sha256Of(text))),
      rules,
    );
    assert.equal(tight.exitCode, 1);
    assert.deepEqual(
      tight.regressions.map((x) => [x.unit, x.fact, x.source]),
      [[U1, 'bvExact', 'last-green']],
    );
    assert.equal(tight.lastGreen.status, 'applied');
    // A rebaseline changed the blob: the committed baseline wins, nothing is tightened.
    const stale = evaluateWith(
      input(greenOf(lastGreenUnits, 'f'.repeat(64))),
      rules,
    );
    assert.equal(stale.exitCode, 0);
    assert.equal(stale.lastGreen.status, 'stale');
  },
  {
    'tightens against a different baseline blob': {
      requireSameBaselineBlob: false,
    },
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

test('buildBaseline records a complete run with its SHA, population hash and a checked note, and keeps earlier notes', () => {
  const first = buildBaseline({
    measure: 'load',
    facts: entries(two(loadFacts(), loadFacts())),
    sha: SHA,
    note: { sha: SHA, pr: null, reason: 'seed', units: [] },
  });
  assert.equal(first.sha, SHA);
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
    existing: first,
  });
  assert.deepEqual(
    second.notes.map((n) => n.reason),
    ['seed', 'A2 locks in the Mad Cats'],
  );
  assert.throws(
    () =>
      validateBaseline('load', {
        ...second,
        notes: [{ sha: 'nope', pr: 1, reason: '', units: [] }],
      }),
    /BASELINE_MALFORMED/,
  );
});

test('serializeBaseline is valid JSON with one unit per line, and reads back to the same baseline', () => {
  const baseline = buildBaseline({
    measure: 'load',
    facts: entries(two(loadFacts(), loadFacts({ bvExact: false }))),
    sha: SHA,
    note: { sha: SHA, pr: 7, reason: 'seed', units: [U1] },
  });
  const text = serializeBaseline(baseline);
  assert.deepEqual(JSON.parse(text), baseline);
  assert.equal(validateBaseline('load', JSON.parse(text)).populationCount, 2);
  assert.equal(
    text.split('\n').filter((line) => line.includes('"battlemechs/')).length,
    3,
    'two unit lines and the note naming a unit',
  );
  assert.ok(text.endsWith('}\n'));
});

test('buildBaseline refuses a run with a failed, incomplete or unknown unit, and a bad note', () => {
  const ok = entries(two(loadFacts(), loadFacts()));
  const note = { sha: SHA, pr: null, reason: 'seed', units: [] };
  const refuse = (facts, message) =>
    assert.throws(
      () => buildBaseline({ measure: 'load', facts, sha: SHA, note }),
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
    }),
  );
});

// --- the command line, end to end -------------------------------------------------------------------------

test('main reads a run directory and the committed baseline, writes the report files, and exits 0, 1 or 2', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-'));
  try {
    const runDir = path.join(root, 'run');
    fs.mkdirSync(runDir);
    const baselineFile = path.join(root, 'baseline.json');
    const write = (tonight, base = two(loadFacts(), loadFacts())) => {
      fs.writeFileSync(
        path.join(runDir, FACTS_FILE),
        serializeFacts('load', entries(tonight)),
      );
      fs.writeFileSync(
        path.join(runDir, 'receipt.json'),
        JSON.stringify({
          measure: 'load',
          repoSha: RUN_SHA,
          scope: {
            families: ['battlemechs'],
            populationCount: Object.keys(tonight).length,
            unitIds: null,
          },
        }),
      );
      fs.writeFileSync(baselineFile, baselineText(base));
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
              'load',
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
    write(two(loadFacts(), loadFacts()));
    const green = go();
    assert.equal(green.code, 0);
    assert.ok(fs.existsSync(path.join(root, 'out/gate-report.json')));
    assert.ok(fs.existsSync(path.join(root, 'out/last-green.json')));
    assert.match(green.logs.join('\n'), /PASS/);
    assert.match(green.logs.join('\n'), /last green: missing/);
    // Feed the artifact back: same blob, so it applies.
    const again = go(['--last-green', path.join(root, 'out/last-green.json')]);
    assert.equal(again.code, 0);
    assert.match(again.logs.join('\n'), /last green: applied/);
    write(two(loadFacts({ weightOwners: false }), loadFacts()));
    const red = go();
    assert.equal(red.code, 1);
    assert.match(
      red.logs.join('\n'),
      /battlemechs\/a weightOwners: pass -> fail/,
    );
    assert.equal(
      fs.existsSync(path.join(root, 'out/last-green.json')),
      true,
      'a stale artifact from the green run is left alone, not rewritten by a red one',
    );
    fs.rmSync(baselineFile);
    const closedRun = go();
    assert.equal(closedRun.code, 2);
    assert.match(closedRun.logs.join('\n'), /BASELINE_MISSING/);
    fs.rmSync(path.join(runDir, FACTS_FILE));
    assert.equal(go().code, 2);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
