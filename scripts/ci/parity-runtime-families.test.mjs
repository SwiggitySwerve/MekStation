import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { setFactNames } from '../lib/runtime-parity/facts.mjs';
import { baselinePath, baselineSetsPath } from '../lib/runtime-parity/gate.mjs';
import {
  DEFAULT_FAMILY,
  DERIVER_FIELDS,
  deriverChangedMessage,
  MEASURES,
  REGISTRY_PATH,
  enabledFamilies,
  parityRuntimeNames,
  planCensus,
  readRegistry,
  rebaselineNotice,
  resolveLeg,
  validateRegistry,
} from './parity-runtime-families.mjs';

const script = 'scripts/ci/parity-runtime-families.mjs';
const committed = () => JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));

test('the committed registry is valid: battlemechs enabled, vehicles present but disabled', () => {
  const registry = readRegistry();
  assert.deepEqual(Object.keys(registry.families), ['battlemechs', 'vehicles']);
  assert.deepEqual(enabledFamilies(registry), ['battlemechs']);
  assert.equal(registry.families.battlemechs.expectedUnits, 4263);
  assert.equal(registry.families.vehicles.expectedUnits, 1444);
  // Owner-held: a family's timeouts are set by the owner, never by this lane.
  assert.deepEqual(registry.families.battlemechs.timeoutMinutes, {
    load: 15,
    reopen: 20,
  });
  assert.deepEqual(registry.families.vehicles.timeoutMinutes, {
    load: null,
    reopen: null,
  });
  // Nullable until C2's deriver split; the names live in DERIVER_FIELDS only.
  for (const entry of Object.values(registry.families)) {
    assert.equal(entry[DERIVER_FIELDS.core], null);
    assert.equal(entry[DERIVER_FIELDS.family], null);
  }
});

test("registry baseline paths are the gate's own (baselinePath / baselineSetsPath), and they exist", () => {
  const registry = readRegistry();
  for (const [family, entry] of Object.entries(registry.families)) {
    if (entry.baselines === null) {
      assert.equal(
        entry.enabled,
        false,
        `${family} is enabled with no baselines`,
      );
      continue;
    }
    for (const measure of MEASURES) {
      const files = entry.baselines[measure];
      assert.equal(
        files.main,
        baselinePath(measure, family),
        `${family} ${measure}`,
      );
      assert.equal(
        files.sets,
        setFactNames(measure).length ? baselineSetsPath(measure, family) : null,
        `${family} ${measure} sets`,
      );
      for (const file of [files.main, files.sets].filter(Boolean))
        assert.ok(fs.existsSync(file), `${file} is missing`);
    }
  }
});

test("battlemechs keeps today's names; every other family carries its id", () => {
  assert.equal(DEFAULT_FAMILY, 'battlemechs');
  assert.deepEqual(parityRuntimeNames('battlemechs', 'load'), {
    census: 'parity-runtime-load',
    lastGreen: 'parity-runtime-last-green-load',
    outDir: 'parity-runtime',
  });
  assert.deepEqual(parityRuntimeNames('battlemechs', 'reopen'), {
    census: 'parity-runtime-reopen',
    lastGreen: 'parity-runtime-last-green-reopen',
    outDir: 'parity-runtime',
  });
  assert.deepEqual(parityRuntimeNames('vehicles', 'reopen'), {
    census: 'parity-runtime-vehicles-reopen',
    lastGreen: 'parity-runtime-last-green-vehicles-reopen',
    outDir: 'parity-runtime-vehicles',
  });
  assert.throws(() => parityRuntimeNames('Vehicles', 'load'), /invalid family/);
  assert.throws(() => parityRuntimeNames('vehicles', 'both'), /measure/);
});

test('plan: all is every enabled family; unknown and disabled families fail', () => {
  const registry = readRegistry();
  assert.deepEqual(
    planCensus(registry, { families: 'all', measures: 'both' }),
    {
      include: [
        { family: 'battlemechs', measure: 'load', timeout: 15 },
        { family: 'battlemechs', measure: 'reopen', timeout: 20 },
      ],
    },
  );
  assert.deepEqual(
    planCensus(registry, {
      families: ' battlemechs, battlemechs ',
      measures: 'reopen',
    }),
    { include: [{ family: 'battlemechs', measure: 'reopen', timeout: 20 }] },
  );
  assert.throws(
    () => planCensus(registry, { families: 'aerospace', measures: 'both' }),
    /unknown family 'aerospace'/,
  );
  assert.throws(
    () =>
      planCensus(registry, {
        families: 'battlemechs,vehicles',
        measures: 'both',
      }),
    /family 'vehicles' is disabled/,
  );
  assert.throws(
    () => planCensus(registry, { families: ' , ', measures: 'both' }),
    /comma list/,
  );
  assert.throws(
    () => planCensus(registry, { families: 'all', measures: 'all' }),
    /load, reopen or both/,
  );
  // An enabled second family joins "all" with its own timeouts.
  const two = structuredClone(registry);
  Object.assign(two.families.vehicles, {
    enabled: true,
    baselines: structuredClone(two.families.battlemechs.baselines),
    timeoutMinutes: { load: 9, reopen: 11 },
  });
  assert.deepEqual(
    planCensus(validateRegistry(two), { families: 'all', measures: 'load' })
      .include,
    [
      { family: 'battlemechs', measure: 'load', timeout: 15 },
      { family: 'vehicles', measure: 'load', timeout: 9 },
    ],
  );
});

test('resolve: names and flags for a leg; a non-default family must carry its registry timeout', () => {
  const registry = readRegistry();
  for (const timeoutInput of [undefined, '', '0', '15'])
    assert.deepEqual(
      resolveLeg(registry, {
        family: 'battlemechs',
        measure: 'load',
        timeoutInput,
      }),
      {
        census: 'parity-runtime-load',
        lastGreen: 'parity-runtime-last-green-load',
        outDir: 'parity-runtime',
      },
    );
  assert.throws(
    () =>
      resolveLeg(registry, {
        family: 'battlemechs',
        measure: 'load',
        timeoutInput: '20',
      }),
    /15-minute timeout, not 20/,
  );
  assert.throws(
    () => resolveLeg(registry, { family: 'vehicles', measure: 'load' }),
    /disabled/,
  );
  const two = structuredClone(registry);
  Object.assign(two.families.vehicles, {
    enabled: true,
    baselines: structuredClone(two.families.battlemechs.baselines),
    timeoutMinutes: { load: 9, reopen: 11 },
  });
  assert.throws(
    () => resolveLeg(two, { family: 'vehicles', measure: 'reopen' }),
    /11-minute timeout, not none; dispatch it through parity-census\.yml/,
  );
  assert.deepEqual(
    resolveLeg(two, {
      family: 'vehicles',
      measure: 'reopen',
      timeoutInput: '11',
    }),
    {
      census: 'parity-runtime-vehicles-reopen',
      lastGreen: 'parity-runtime-last-green-vehicles-reopen',
      outDir: 'parity-runtime-vehicles',
    },
  );
});

test('the schema refuses malformed entries and names every problem', () => {
  const mutate = (change) => {
    const registry = committed();
    change(registry);
    return () => validateRegistry(registry);
  };
  assert.throws(
    mutate((r) => delete r.families.battlemechs),
    /must include battlemechs/,
  );
  assert.throws(
    mutate((r) => (r.schemaVersion = 2)),
    /schemaVersion must be 1/,
  );
  assert.throws(
    mutate((r) => (r.extra = 1)),
    /unknown extra/,
  );
  assert.throws(
    mutate((r) => delete r.families.vehicles[DERIVER_FIELDS.core]),
    /missing coreDeriverSha/,
  );
  assert.throws(
    mutate((r) => (r.families.vehicles.deriverHash = null)),
    /unknown deriverHash/,
  );
  assert.throws(
    mutate((r) => (r.families.vehicles.enabled = true)),
    /needs its baselines[\s\S]*needs both timeouts/,
  );
  // The family reaches the census as --family from the workflow input only; a flags field is refused.
  assert.throws(
    mutate((r) => (r.families.vehicles.entryFlags = ['--family', 'vehicles'])),
    /unknown entryFlags/,
  );
  assert.throws(
    mutate((r) => (r.families.battlemechs.timeoutMinutes.load = 0)),
    /timeoutMinutes/,
  );
  assert.throws(
    mutate((r) => (r.families.battlemechs.expectedUnits = -1)),
    /expectedUnits/,
  );
  assert.throws(
    mutate((r) => (r.families.battlemechs.baselines.reopen.sets = 'x.json')),
    /baselines\.reopen/,
  );
  assert.throws(
    mutate(
      (r) => (r.families.battlemechs[DERIVER_FIELDS.family] = 'not-a-hash'),
    ),
    /familyDeriverSha: must be null or a git blob hash/,
  );
  assert.throws(
    mutate((r) => (r.families.Mechs = r.families.vehicles)),
    /lowercase/,
  );
  // A real hash is accepted.
  const hashed = committed();
  hashed.families.battlemechs[DERIVER_FIELDS.core] = 'a'.repeat(40);
  validateRegistry(hashed);
});

test("a deriver change adds the registry's rebaseline list; anything else adds nothing", () => {
  const registry = readRegistry();
  assert.equal(rebaselineNotice({ failClosed: [] }, registry), null);
  assert.equal(
    rebaselineNotice(
      { failClosed: [{ reason: 'BASELINE_MISSING', message: 'x' }] },
      registry,
    ),
    null,
  );
  assert.match(
    rebaselineNotice(
      {
        failClosed: [
          { reason: 'FACTS_DERIVER_CHANGED', message: 'gate words' },
        ],
      },
      registry,
    ),
    /^deriver fingerprint changed \(shared core\): every enabled family \(battlemechs\) must be rebaselined before its gate can pass\.$/,
  );
  // The gate says which fingerprint changed: the family's own deriver alone names that family only; the shared core
  // or a pre-split baseline names every enabled family.
  const deriverChanged = (parts, family) => ({
    family,
    failClosed: [{ reason: 'FACTS_DERIVER_CHANGED', message: 'gate words' }],
    provenance: { deriverChangedParts: parts },
  });
  assert.equal(
    rebaselineNotice(deriverChanged(['family'], 'vehicles'), registry),
    'deriver fingerprint changed (vehicles deriver): only vehicles must be rebaselined before its gate can pass.',
  );
  for (const parts of [['core'], ['core', 'family'], ['legacy']])
    assert.match(
      rebaselineNotice(deriverChanged(parts, 'vehicles'), registry),
      /^deriver fingerprint changed \(shared core\): every enabled family/,
      parts.join('+'),
    );
  // The list is every enabled family.
  const two = structuredClone(registry);
  Object.assign(two.families.vehicles, {
    enabled: true,
    baselines: structuredClone(two.families.battlemechs.baselines),
    timeoutMinutes: { load: 9, reopen: 11 },
  });
  assert.match(
    deriverChangedMessage(validateRegistry(two)),
    /every enabled family \(battlemechs, vehicles\) must be rebaselined/,
  );
});

test('CLI: plan writes the matrix output; a disabled family fails the step by name', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'parity-families-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const output = path.join(dir, 'out');
  const run = (...args) =>
    spawnSync(process.execPath, [script, ...args], {
      encoding: 'utf8',
      env: { ...process.env, GITHUB_OUTPUT: output },
    });
  const plan = run('plan', '--families', 'all', '--measures', 'both');
  assert.equal(plan.status, 0, plan.stderr);
  const matrix = fs.readFileSync(output, 'utf8').match(/^matrix=(.*)$/m)[1];
  assert.equal(JSON.parse(matrix).include.length, 2);
  const disabled = run('plan', '--families', 'vehicles', '--measures', 'both');
  assert.equal(disabled.status, 1);
  assert.match(disabled.stderr, /::error::family 'vehicles' is disabled/);
  const resolve = run(
    'resolve',
    '--family',
    'battlemechs',
    '--measure',
    'reopen',
  );
  assert.equal(resolve.status, 0, resolve.stderr);
  assert.match(
    fs.readFileSync(output, 'utf8'),
    /census-artifact=parity-runtime-reopen\nlast-green-artifact=parity-runtime-last-green-reopen\nout-dir=parity-runtime\n$/,
  );
});
