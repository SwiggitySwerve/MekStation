import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  CONCURRENT_START_OFFSET_MS,
  concurrentTimeZone,
  inheritedTimeZone,
  jestCapture,
  selectCaptureMode,
} from '../lib/runtime-parity/census.mjs';
import {
  coreDeriverSha,
  familyDeriverSha,
  parseFactsMeta,
} from '../lib/runtime-parity/facts-provenance.mjs';
import {
  FACTS_SCHEMA_VERSION,
  loadFacts,
  parseFacts,
} from '../lib/runtime-parity/facts.mjs';
import { parseBaseline } from '../lib/runtime-parity/gate.mjs';
import {
  InputError,
  buildPlan,
  emitterCommand,
  obtainJoin,
  readJoinFiles,
  verifyAgainstReference,
} from '../lib/runtime-parity/join.mjs';
import { parseRows, validateReceipt } from '../lib/runtime-parity/rows.mjs';
import { capturedToRow, summarize } from './report.mjs';
import { RunError, loadReference, main } from './run.mjs';

const hex = (c, n = 64) => c.repeat(n);
const unitRow = (id, mtf) => ({
  path: mtf,
  sha256: hex('a'),
  unit: { id, chassis: id, model: '1' },
});
const join = (id, mtf, extra = {}) => ({
  catalogFile: `public/data/units/battlemechs/x/${id}.json`,
  catalogBlob: hex('1', 40),
  path: mtf,
  sha256: hex('a'),
  family: 'battlemechs',
  evaluation: 'committed-unit',
  alias: false,
  ...extra,
});
const emitterOutput = (ids) => ({
  rows: ids.map((id) => unitRow(id, `meks/${id}.mtf`)),
  manifest: {
    committedCatalog: {
      joined: ids.length,
      errors: [],
      joins: ids.map((id) => join(id, `meks/${id}.mtf`)),
    },
  },
});
const writeJoin = (dir, { rows, manifest }) => {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'sources.ndjson'),
    rows.map((r) => JSON.stringify(r) + '\n').join(''),
  );
  fs.writeFileSync(
    path.join(dir, 'sources.ndjson.manifest.json'),
    JSON.stringify(manifest),
  );
};
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'rpbv-'));
const reasonOf = (fn) => {
  try {
    fn();
  } catch (error) {
    return error.reason ?? error.message;
  }
  return null;
};

test('buildPlan lists committed-unit joins sorted by path and fails closed on inconsistency', () => {
  const out = emitterOutput(['zeta', 'alpha']);
  const plan = buildPlan({ ...out, families: ['battlemechs'] });
  assert.deepEqual(
    plan.map((p) => p.unitId),
    ['alpha', 'zeta'],
  );
  assert.deepEqual(plan[0], {
    family: 'battlemechs',
    unitId: 'alpha',
    catalogPath: 'public/data/units/battlemechs/x/alpha.json',
    catalogBlob: hex('1', 40),
    path: 'meks/alpha.mtf',
    sha256: hex('a'),
  });
  assert.deepEqual(buildPlan({ ...out, families: ['vehicles'] }), []);

  const drift = emitterOutput(['alpha']);
  drift.rows[0].sha256 = hex('b');
  assert.equal(
    reasonOf(() => buildPlan({ ...drift, families: ['battlemechs'] })),
    'INPUT_SHA_DRIFT',
  );

  const short = emitterOutput(['alpha', 'zeta']);
  short.manifest.committedCatalog.joins.pop();
  assert.equal(
    reasonOf(() => buildPlan({ ...short, families: ['battlemechs'] })),
    'MISSING_MANIFEST_ROWS',
  );

  // Local mode: a source-text family has unit: null and cannot be captured from a committed object.
  const identityOnly = emitterOutput(['alpha']);
  identityOnly.manifest.committedCatalog.joins[0].evaluation =
    'identity-only/source-text';
  identityOnly.rows[0].unit = null;
  assert.equal(
    reasonOf(() => buildPlan({ ...identityOnly, families: ['battlemechs'] })),
    'MISSING_MANIFEST_ROWS',
  );

  // Repo-only mode labels every family `identity-only/reference` but still carries the committed
  // object, so the label is not what decides: the object is (this is the real emitter's mech shape).
  const referenceOnly = emitterOutput(['alpha', 'beta']);
  for (const j of referenceOnly.manifest.committedCatalog.joins)
    j.evaluation = 'identity-only/reference';
  assert.deepEqual(
    buildPlan({ ...referenceOnly, families: ['battlemechs'] }).map(
      (p) => p.unitId,
    ),
    ['alpha', 'beta'],
  );

  const errors = emitterOutput(['alpha']);
  errors.manifest.committedCatalog.errors = ['zero-source-matches: x'];
  assert.equal(
    reasonOf(() => buildPlan({ ...errors, families: ['battlemechs'] })),
    'S0B_MANIFEST_MISSING',
  );

  const twice = emitterOutput(['alpha']);
  twice.rows.push(unitRow('alpha', 'meks/alpha-2.mtf'));
  twice.manifest.committedCatalog.joins.push(join('alpha', 'meks/alpha-2.mtf'));
  twice.manifest.committedCatalog.joined = 2;
  assert.equal(
    reasonOf(() => buildPlan({ ...twice, families: ['battlemechs'] })),
    'MISSING_MANIFEST_ROWS',
  );
});

test('join input and reference failures are named', () => {
  const dir = tmp();
  assert.equal(
    reasonOf(() => readJoinFiles(dir)),
    'S0B_MANIFEST_MISSING',
  );
  writeJoin(dir, emitterOutput(['alpha']));
  const read = readJoinFiles(dir);
  assert.equal(read.rows.length, 1);
  assert.match(read.sourcesSha256, /^[a-f0-9]{64}$/);
  const plan = buildPlan({ ...read, families: ['battlemechs'] });
  assert.equal(
    verifyAgainstReference(plan, [{ path: 'meks/alpha.mtf', sha256: hex('a') }])
      .size,
    1,
  );
  assert.equal(
    reasonOf(() =>
      verifyAgainstReference(plan, [
        { path: 'meks/alpha.mtf', sha256: hex('b') },
      ]),
    ),
    'INPUT_SHA_DRIFT',
  );
  assert.equal(
    reasonOf(() => verifyAgainstReference(plan, [])),
    'MISSING_MANIFEST_ROWS',
  );
});

test('the committed reference loads through the scoreboard verifier and drift is named', () => {
  const repoRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../..',
  );
  const work = tmp();
  const reference = loadReference(repoRoot, work);
  const config = JSON.parse(
    fs.readFileSync(
      path.join(repoRoot, 'config/reference/parity-scoreboard.json'),
      'utf8',
    ),
  );
  assert.equal(reference.rows.length, config.reference.rows);
  assert.equal(reference.gzipSha256, config.reference.gzipSha256);
  assert.ok(
    reference.rows.every(
      (row) =>
        typeof row.path === 'string' && /^[a-f0-9]{64}$/.test(row.sha256),
    ),
  );
  // A checkout without the reference is a named input failure, not a crash.
  assert.equal(
    reasonOf(() => loadReference(tmp(), work)),
    'S0A_REFERENCE_MISSING',
  );
});

test('the emitter runs as a child step with the pinned arguments', () => {
  const { command, args } = emitterCommand({
    repoRoot: '/r',
    commit: hex('c', 40),
    mekfiles: '/m',
    referenceFile: '/ref.jsonl',
    out: '/o',
  });
  assert.equal(command, process.execPath);
  assert.deepEqual(args.slice(0, 2), ['--require', 'tsx/cjs']);
  for (const flag of [
    '--commit',
    '--mekfiles',
    '--reference',
    '--out',
    '--source-only-families-identity-only',
  ])
    assert.ok(args.includes(flag), flag);
  assert.equal(args[args.indexOf('--mekfiles') + 1], '/m');
  assert.ok(!args.includes('--reference-only'));
});

test('without a mm-data checkout the emitter runs in its repo-only mode (what the hosted job has)', () => {
  const { args } = emitterCommand({
    repoRoot: '/r',
    commit: hex('c', 40),
    referenceFile: '/ref.jsonl',
    out: '/o',
  });
  assert.ok(args.includes('--reference-only'));
  for (const flag of ['--mekfiles', '--reference'])
    assert.ok(!args.includes(flag), `${flag} must not be passed`);
  for (const flag of [
    '--commit',
    '--out',
    '--source-only-families-identity-only',
  ])
    assert.ok(args.includes(flag), flag);
});

test('obtainJoin without --sources or --mekfiles runs the emitter instead of failing on mekfiles', () => {
  const root = tmp();
  fs.mkdirSync(path.join(root, 'scripts/ci'), { recursive: true });
  // A stand-in emitter that proves it was started in repo-only mode and writes the join files.
  fs.writeFileSync(
    path.join(root, 'scripts/ci/committed-catalog-sources.ts'),
    `const fs=require('fs'),path=require('path');const a=process.argv;
if(!a.includes('--reference-only')||a.includes('--mekfiles'))process.exit(3);
const out=a[a.indexOf('--out')+1];fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'sources.ndjson'),'');
fs.writeFileSync(path.join(out,'sources.ndjson.manifest.json'),'{"committedCatalog":{"joined":0,"errors":[],"joins":[]}}');`,
  );
  // The emitter is started as `node --require tsx/cjs <file>` from the temp root, so let the child find tsx.
  const before = process.env.NODE_PATH;
  process.env.NODE_PATH = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../node_modules',
  );
  try {
    const join = obtainJoin({
      repoRoot: root,
      commit: hex('c', 40),
      referenceFile: '',
      workDir: root,
    });
    assert.equal(join.rows.length, 0);
    assert.equal(join.dir, path.join(root, 'join'));
  } finally {
    if (before === undefined) delete process.env.NODE_PATH;
    else process.env.NODE_PATH = before;
  }
});

const record = (
  id,
  {
    bv = 1000,
    validity = 'valid',
    terms = { armorBV: 360 },
    allocatedWeight = 50,
    // What the real PreviewTab hands to the sheet renderer. 'same' = the status BV; null = not captured.
    preview = 'same',
  } = {},
) =>
  ({
    unitId: id,
    family: 'battlemechs',
    path: `meks/${id}.mtf`,
    sha256: hex('a'),
    catalog: {
      path: `public/data/units/battlemechs/x/${id}.json`,
      blob: hex('1', 40),
    },
    error: null,
    infrastructure: false,
    observed: {
      bv,
      validity,
      weight: 50,
      allocatedWeight,
      mp: { walk: 4, run: 6, jump: 0 },
    },
    terms,
    issues: [],
    preview: preview === 'same' ? { bv: bv ?? 0, cost: 100 } : preview,
  });

test('capturedToRow maps ok, no-BV and error records to valid rows', () => {
  const ok = capturedToRow(record('a'));
  assert.equal(ok.load.observed.occupancy, null);
  assert.deepEqual(ok.load.terms, { armorBV: 360 });
  const noBv = capturedToRow(record('b', { bv: null, terms: null }));
  assert.equal(noBv.load.observed.bv, null);
  assert.deepEqual(noBv.load.terms, {});
  const failed = capturedToRow({
    ...record('c'),
    observed: null,
    terms: null,
    issues: null,
    infrastructure: false,
    error: { stage: 'open', name: 'Error', message: 'boom' },
  });
  assert.deepEqual(failed.error, {
    stage: 'open',
    name: 'Error',
    message: 'boom',
  });
  assert.equal(failed.status, 'error');
  assert.equal(
    parseRows([ok, noBv, failed].map((r) => JSON.stringify(r)).join('\n'))
      .length,
    3,
  );
});

const refRow = (id, total, valid = true) => [
  `meks/${id}.mtf`,
  {
    path: `meks/${id}.mtf`,
    sha256: hex('a'),
    battleValue: { total },
    construction: { valid },
  },
];

test('summarize counts agreement with Java and counts every miss', () => {
  const rows = [
    capturedToRow(record('exact', { bv: 1000 })),
    capturedToRow(record('off', { bv: 999 })),
    capturedToRow(record('nobv', { bv: null, terms: null })),
    capturedToRow(record('badvalid', { bv: 1000, validity: 'invalid' })),
    capturedToRow({
      ...record('broken'),
      observed: null,
      terms: null,
      issues: null,
      error: { stage: 'open', name: 'E', message: 'm' },
    }),
  ];
  const referenceByPath = new Map(
    ['exact', 'off', 'nobv', 'badvalid', 'broken'].map((id) =>
      refRow(id, 1000),
    ),
  );
  const whole = {
    families: ['battlemechs'],
    populationCount: 5,
    unitIds: null,
  };
  const { summary, differences } = summarize({
    rows,
    referenceByPath,
    scope: whole,
    deterministic: true,
  });
  assert.deepEqual(summary.bv, { exact: 2, different: 1, missing: 2 });
  assert.deepEqual(summary.validity, { agree: 3, disagree: 1, missing: 1 });
  assert.deepEqual(summary.errorsByStage, { open: 1 });
  assert.equal(summary.units, 5);
  assert.equal(
    summary.headline,
    'load=Java 2/5 · validity 3/5 · weight owners 4/5 · sheet=status 3/5',
  );
  assert.deepEqual(
    differences.filter((d) => d.measure === 'bv').map((d) => [d.unitId, d.why]),
    [
      ['off', 'different'],
      ['nobv', 'no-calculator-result'],
      ['broken', 'error:open'],
    ],
  );
  const narrowed = summarize({
    rows: rows.slice(0, 1),
    referenceByPath,
    scope: {
      families: ['battlemechs'],
      populationCount: 5,
      unitIds: ['exact'],
    },
    deterministic: true,
  });
  assert.match(narrowed.summary.headline, /NARROWED SCOPE/);
});

test('the record sheet BV is counted against the status bar exactly: equal, different (named) and not captured', () => {
  const rows = [
    capturedToRow(record('same')),
    capturedToRow(record('lower', { bv: 1000, preview: { bv: 909, cost: 1 } })),
    capturedToRow(
      record('higher', { bv: 1000, preview: { bv: 1268, cost: 1 } }),
    ),
    capturedToRow(record('uncaptured', { preview: null })),
    capturedToRow({
      ...record('broken'),
      observed: null,
      terms: null,
      issues: null,
      preview: null,
      error: { stage: 'open', name: 'E', message: 'm' },
    }),
  ];
  const referenceByPath = new Map(
    ['same', 'lower', 'higher', 'uncaptured', 'broken'].map((id) =>
      refRow(id, 1000),
    ),
  );
  const { summary, differences } = summarize({
    rows,
    referenceByPath,
    scope: { families: ['battlemechs'], populationCount: 5, unitIds: null },
    deterministic: true,
  });
  assert.deepEqual(summary.preview, {
    equalsStatus: 1,
    different: 2,
    missing: 2,
  });
  assert.match(summary.headline, /sheet=status 1\/5/);
  assert.deepEqual(
    differences
      .filter((d) => d.measure === 'preview')
      .map((d) => [d.unitId, d.observed, d.preview]),
    [
      ['lower', 1000, 909],
      ['higher', 1000, 1268],
    ],
  );
  // Rows written before the field existed still parse, and count as not captured.
  const old = capturedToRow(record('old'));
  delete old.load.preview;
  assert.equal(parseRows(JSON.stringify(old)).length, 1);
  assert.equal(
    capturedToRow({ ...record('old2'), preview: undefined }).load.preview,
    null,
  );
});

test('a failed sheet calculation is a preview-stage infrastructure error: the whole row errors and every load fact is unknown, never previewEqualsStatus false', () => {
  const failedPreview = capturedToRow({
    ...record('sheetfail'),
    observed: null,
    terms: null,
    issues: null,
    preview: null,
    infrastructure: true,
    error: {
      stage: 'preview',
      name: 'Error',
      message: "The sheet's BV calculation threw: mutant",
    },
  });
  assert.equal(failedPreview.status, 'error');
  assert.equal(failedPreview.error.stage, 'preview');
  const entry = loadFacts(failedPreview, undefined);
  assert.equal(entry.status, 'error');
  // Deliberate: every load fact is unknown, bvExact included. The gate reads known -> unknown (the safe direction).
  assert.deepEqual(
    Object.values(entry.facts),
    Object.keys(entry.facts).map(() => null),
  );
  assert.notEqual(entry.facts.previewEqualsStatus, false);
  assert.deepEqual(entry.reported, { previewStatusDistance: null });
  const { summary } = summarize({
    rows: [failedPreview],
    referenceByPath: new Map([refRow('sheetfail', 1000)]),
    scope: { families: ['battlemechs'], populationCount: 1, unitIds: null },
    deterministic: true,
  });
  assert.deepEqual(summary.errorsByStage, { preview: 1 });
  assert.deepEqual(summary.preview, {
    equalsStatus: 0,
    different: 0,
    missing: 1,
  });
});

test('every gated summary key has a direction and resolves to a count', () => {
  const rows = [capturedToRow(record('a')), capturedToRow(record('b'))];
  const referenceByPath = new Map(['a', 'b'].map((id) => refRow(id, 1000)));
  const { summary } = summarize({
    rows,
    referenceByPath,
    scope: { families: ['battlemechs'], populationCount: 2, unitIds: null },
    deterministic: true,
  });
  assert.deepEqual(Object.keys(summary.gates).sort(), [
    'bv.exact',
    'preview.equalsStatus',
    'validity.agree',
    'weightOwners.agree',
  ]);
  for (const [path, gate] of Object.entries(summary.gates)) {
    const [group, key] = path.split('.');
    assert.equal(gate.gated, true, path);
    assert.equal(gate.direction, 'higher-is-better', path);
    assert.equal(typeof summary[group][key], 'number', path);
  }
});

test('summarize refuses rows that are not the population the scope claims', () => {
  const rows = [capturedToRow(record('a')), capturedToRow(record('b'))];
  const referenceByPath = new Map(['a', 'b'].map((id) => refRow(id, 1000)));
  const scope = (populationCount, unitIds = null) => ({
    families: ['battlemechs'],
    populationCount,
    unitIds,
  });
  const run = (r, s) =>
    summarize({ rows: r, referenceByPath, scope: s, deterministic: true });
  run(rows, scope(2));
  assert.throws(() => run(rows, scope(3)), /Population mismatch/);
  assert.throws(() => run(rows.slice(0, 1), scope(2)), /Population mismatch/);
  assert.throws(() => run(rows, scope(2, ['a'])), /Population mismatch/);
  assert.throws(() => run([rows[0], rows[0]], scope(2)), /more than one row/);
});

test('weight owners are compared exactly per unit and a difference is reported, not tolerated', () => {
  const rows = [
    capturedToRow(record('same')),
    capturedToRow(record('near', { allocatedWeight: 50.0000001 })),
    capturedToRow({
      ...record('broken'),
      observed: null,
      terms: null,
      issues: null,
      error: { stage: 'open', name: 'E', message: 'm' },
    }),
  ];
  const referenceByPath = new Map(
    ['same', 'near', 'broken'].map((id) => refRow(id, 1000)),
  );
  const { summary, differences } = summarize({
    rows,
    referenceByPath,
    scope: { families: ['battlemechs'], populationCount: 3, unitIds: null },
    deterministic: true,
  });
  assert.deepEqual(summary.weightOwners, { agree: 1, mismatch: 1, missing: 1 });
  assert.match(summary.headline, /weight owners 1\/3 \(DIFFER 1\)/);
  assert.deepEqual(
    differences
      .filter((d) => d.measure === 'weight-owner')
      .map((d) => [d.unitId, d.observed, d.allocated]),
    [['near', 50, 50.0000001]],
  );
});

// --- main(): the whole flow with an injected capture ---------------------------------------
const ids = ['alpha', 'beta', 'gamma'];
// offsetMs: the start stagger between concurrent runs; 0 keeps these tests fast, null uses the real CONCURRENT_START_OFFSET_MS.
// env: what the census reads for its default capture mode; CI set means concurrent, as on the hosted runner.
function setup({
  capture,
  join: out = emitterOutput(ids),
  offsetMs = 0,
  env = { CI: 'true' },
} = {}) {
  const root = tmp();
  const sources = path.join(root, 'sources');
  writeJoin(sources, out);
  const referenceRows = ids.map((id) => refRow(id, 1000)[1]);
  const deps = {
    repoRoot: root,
    gitHead: () => hex('c', 40),
    loadReference: () => ({
      file: '',
      rows: referenceRows,
      gzipSha256: hex('d'),
    }),
    capture:
      capture ??
      (({ plan }) => ({
        records: plan.map((p) => record(p.unitId)),
        durationSeconds: 1.5,
        resources: { maxRSS: 100 },
      })),
    captureOffsetMs: offsetMs,
    env,
  };
  const outDir = path.join(root, 'out');
  const run = (...extra) =>
    main(['--out', outDir, '--sources', sources, ...extra], deps);
  const read = (name) => fs.readFileSync(path.join(outDir, name), 'utf8');
  return {
    run,
    read,
    outDir,
    exists: (name) => fs.existsSync(path.join(outDir, name)),
  };
}
const quietly = async (fn) => {
  const { log, error } = console;
  console.log = console.error = () => {};
  try {
    return await fn();
  } finally {
    Object.assign(console, { log, error });
  }
};

test('main writes rows, summary and receipt for the whole joined population', async () => {
  const t = setup();
  assert.equal(await quietly(() => t.run()), 0);
  const rows = parseRows(t.read('rows.ndjson'));
  assert.deepEqual(
    rows.map((r) => r.unitId),
    ids,
  );
  const summary = JSON.parse(t.read('summary.json'));
  assert.equal(summary.bv.exact, 3);
  assert.equal(summary.deterministic, true);
  const receipt = validateReceipt(JSON.parse(t.read('receipt.json')));
  assert.equal(receipt.scope.unitIds, null);
  assert.equal(receipt.runs.length, 2);
  assert.equal(receipt.rows.count, 3);
  assert.equal(receipt.repoSha, hex('c', 40));
  assert.equal(t.read('java-differences.ndjson'), '');
  assert.equal(t.exists('failure.json'), false);
});

test('main records a narrowed scope and refuses units the join does not have', async () => {
  const t = setup();
  assert.equal(await quietly(() => t.run('--units', 'beta', '--runs', '1')), 0);
  assert.deepEqual(
    parseRows(t.read('rows.ndjson')).map((r) => r.unitId),
    ['beta'],
  );
  assert.deepEqual(JSON.parse(t.read('receipt.json')).scope.unitIds, ['beta']);
  assert.match(JSON.parse(t.read('summary.json')).headline, /NARROWED SCOPE/);
  const t2 = setup();
  assert.equal(await quietly(() => t2.run('--units', 'nope')), 1);
  assert.equal(
    JSON.parse(t2.read('failure.json')).reason,
    'MISSING_MANIFEST_ROWS',
  );
});

test('--units is sorted and de-duplicated, and the receipt proves the population', async () => {
  const t = setup();
  assert.equal(
    await quietly(() =>
      t.run('--units', 'gamma,alpha,gamma,alpha', '--runs', '1'),
    ),
    0,
  );
  const receipt = validateReceipt(JSON.parse(t.read('receipt.json')));
  assert.deepEqual(receipt.scope, {
    families: ['battlemechs'],
    populationCount: 3,
    unitIds: ['alpha', 'gamma'],
  });
  assert.equal(receipt.rows.count, 2);
  assert.deepEqual(
    parseRows(t.read('rows.ndjson')).map((r) => r.unitId),
    ['alpha', 'gamma'],
  );
  const whole = setup();
  assert.equal(await quietly(() => whole.run()), 0);
  assert.deepEqual(JSON.parse(whole.read('receipt.json')).scope, {
    families: ['battlemechs'],
    populationCount: 3,
    unitIds: null,
  });
});

test('a short, padded or repeating capture cannot publish a count', async () => {
  const records = (plan) => plan.map((p) => record(p.unitId));
  const attempt = async (mutate) => {
    const t = setup({
      capture: ({ plan }) => ({
        records: mutate(records(plan)),
        durationSeconds: 1,
        resources: { maxRSS: 1 },
      }),
    });
    const code = await quietly(() => t.run());
    return {
      code,
      failure: t.exists('failure.json')
        ? JSON.parse(t.read('failure.json'))
        : null,
      wroteRows: t.exists('rows.ndjson'),
    };
  };
  const short = await attempt((r) => r.slice(0, 2));
  assert.deepEqual(
    [short.code, short.failure.reason, short.wroteRows],
    [1, 'POPULATION_MISMATCH', false],
  );
  const repeated = await attempt((r) => [r[0], r[0], r[2]]);
  assert.deepEqual(
    [repeated.code, repeated.failure.reason],
    [1, 'POPULATION_MISMATCH'],
  );
  const unplanned = await attempt((r) => [
    ...r.slice(0, 2),
    record('stranger'),
  ]);
  assert.deepEqual(
    [unplanned.code, unplanned.failure.reason],
    [1, 'POPULATION_MISMATCH'],
  );
  // An error record is the unit's row: it counts toward the population and keeps its status.
  const withError = setup({
    capture: ({ plan }) => ({
      records: plan.map((p) =>
        p.unitId === 'beta'
          ? {
              ...record('beta'),
              observed: null,
              terms: null,
              issues: null,
              error: { stage: 'open', name: 'E', message: 'm' },
            }
          : record(p.unitId),
      ),
      durationSeconds: 1,
      resources: { maxRSS: 1 },
    }),
  });
  assert.equal(await quietly(() => withError.run()), 0);
  const rows = parseRows(withError.read('rows.ndjson'));
  assert.equal(rows.length, 3);
  assert.deepEqual(
    rows.map((r) => r.status),
    ['ok', 'error', 'ok'],
  );
});

test('main fails the run, names the unit and keeps the artifacts when two runs differ', async () => {
  let call = 0;
  const t = setup({
    capture: ({ plan }) => {
      call++;
      return {
        records: plan.map((p) =>
          record(
            p.unitId,
            p.unitId === 'beta' && call === 2 ? { bv: 1001 } : {},
          ),
        ),
        durationSeconds: 1,
        resources: { maxRSS: 1 },
      };
    },
  });
  assert.equal(await quietly(() => t.run()), 1);
  const failure = JSON.parse(t.read('failure.json'));
  assert.equal(failure.reason, 'NONDETERMINISTIC_ROWS');
  assert.deepEqual(failure.units, [['battlemechs', 'meks/beta.mtf']]);
  assert.equal(JSON.parse(t.read('receipt.json')).deterministic, false);
  assert.equal(t.exists('rows.ndjson'), true);
});

// --- concurrent captures: injected async captures, nothing is spawned ----------------------
const runIndex = (dir) => Number(path.basename(dir).replace('run-', ''));
const asyncCapture =
  ({ onStart, onEnd, change = () => ({}) } = {}) =>
  async ({ plan, dir }) => {
    const index = runIndex(dir);
    await onStart?.(index);
    const result = {
      records: plan.map((p) => record(p.unitId, change(index, p.unitId))),
      durationSeconds: index,
      resources: { maxRSS: index },
    };
    await onEnd?.(index);
    return result;
  };
// Resolves once `count` captures have called arrive(); rejects (so a sequential run fails, not hangs) after 2s.
const barrier = (count) => {
  let arrived = 0;
  let release;
  const open = new Promise((resolve) => (release = resolve));
  return () => {
    if (++arrived === count) release();
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error('the other capture never started')),
        2000,
      );
    });
    return Promise.race([open, timeout]).finally(() => clearTimeout(timer));
  };
};

test('by default the captures start together: each waits for the other before finishing, and the runs stay in index order', async () => {
  const arrive = barrier(2);
  const t = setup({
    capture: asyncCapture({
      onStart: arrive,
      // Run 1 finishes after run 2, yet the receipt lists run 1 first.
      onEnd: (index) =>
        index === 1 ? new Promise((resolve) => setTimeout(resolve, 20)) : null,
    }),
  });
  assert.equal(await quietly(() => t.run()), 0);
  const receipt = validateReceipt(JSON.parse(t.read('receipt.json')));
  assert.equal(receipt.captureMode, 'concurrent');
  assert.deepEqual(
    receipt.runs.map((r) => [r.durationSeconds, r.resources.maxRSS]),
    [
      [1, 1],
      [2, 2],
    ],
  );
  assert.equal(receipt.deterministic, true);
});

test('the capture mode defaults to concurrent only on CI; --sequential and --concurrent override it', async () => {
  // The rule itself.
  assert.equal(selectCaptureMode({}, {}), 'sequential');
  assert.equal(selectCaptureMode({}, { CI: 'true' }), 'concurrent');
  assert.equal(selectCaptureMode({ concurrent: true }, {}), 'concurrent');
  assert.equal(
    selectCaptureMode({ sequential: true }, { CI: 'true' }),
    'sequential',
  );
  assert.throws(
    () => selectCaptureMode({ sequential: true, concurrent: true }, {}),
    /cannot both be given/,
  );
  // Only a real CI value counts: CI=false or CI=0 in a shell must not turn on about 6 GB of concurrency.
  for (const ci of ['false', 'FALSE', '0', '', '  '])
    assert.equal(selectCaptureMode({}, { CI: ci }), 'sequential', `CI=${ci}`);
  for (const ci of ['true', '1', 'yes'])
    assert.equal(selectCaptureMode({}, { CI: ci }), 'concurrent', `CI=${ci}`);
  // The conflict fails with the other flag checks, before any input is read.
  await assert.rejects(
    main(['--out', tmp(), '--sequential', '--concurrent'], {
      repoRoot: tmp(),
      env: {},
      loadReference: () => {
        throw new Error('inputs were read before the flag check');
      },
    }),
    /cannot both be given/,
  );
  // Through main(): what a local census without flags does, and the opt-in.
  const local = setup({ env: {} });
  assert.equal(await quietly(() => local.run()), 0);
  assert.equal(
    validateReceipt(JSON.parse(local.read('receipt.json'))).captureMode,
    'sequential',
  );
  const optIn = setup({ env: {} });
  assert.equal(await quietly(() => optIn.run('--concurrent')), 0);
  assert.equal(
    validateReceipt(JSON.parse(optIn.read('receipt.json'))).captureMode,
    'concurrent',
  );
});

test('--sequential finishes each capture before starting the next, as before', async () => {
  const events = [];
  const t = setup({
    capture: asyncCapture({
      onStart: (index) => events.push(`start-${index}`),
      onEnd: async (index) => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        events.push(`end-${index}`);
      },
    }),
  });
  assert.equal(await quietly(() => t.run('--sequential')), 0);
  assert.deepEqual(events, ['start-1', 'end-1', 'start-2', 'end-2']);
  const receipt = validateReceipt(JSON.parse(t.read('receipt.json')));
  assert.equal(receipt.captureMode, 'sequential');
  assert.deepEqual(
    receipt.runs.map((r) => r.durationSeconds),
    [1, 2],
  );
});

test('concurrent runs that differ still fail the run and name the unit', async () => {
  const arrive = barrier(2);
  const t = setup({
    capture: asyncCapture({
      onStart: arrive,
      change: (index, id) => (id === 'beta' && index === 2 ? { bv: 1001 } : {}),
    }),
  });
  assert.equal(await quietly(() => t.run()), 1);
  const failure = JSON.parse(t.read('failure.json'));
  assert.equal(failure.reason, 'NONDETERMINISTIC_ROWS');
  assert.deepEqual(failure.units, [['battlemechs', 'meks/beta.mtf']]);
  assert.equal(JSON.parse(t.read('receipt.json')).deterministic, false);
});

test('a concurrent capture that fails is reported only after the other has finished', async () => {
  let secondFinished = false;
  const t = setup({
    capture: async ({ plan, dir }) => {
      if (runIndex(dir) === 1)
        throw new RunError('CAPTURE_INCOMPLETE', 'jest exited 1');
      await new Promise((resolve) => setTimeout(resolve, 20));
      secondFinished = true;
      return {
        records: plan.map((p) => record(p.unitId)),
        durationSeconds: 1,
        resources: { maxRSS: 1 },
      };
    },
  });
  assert.equal(await quietly(() => t.run()), 1);
  assert.equal(secondFinished, true);
  assert.equal(JSON.parse(t.read('failure.json')).reason, 'CAPTURE_INCOMPLETE');
});

// --- concurrent captures vary the clock and the time zone on purpose ------------------------
const inherited = inheritedTimeZone();

test('a concurrent run after the first gets a different TZ; the first, and every --sequential run, inherit', async () => {
  const seen = {};
  const capture = async (input) => {
    seen[runIndex(input.dir)] = input.env;
    return asyncCapture()(input);
  };
  const concurrent = setup({ capture });
  assert.equal(await quietly(() => concurrent.run()), 0);
  assert.deepEqual(seen[1], {});
  assert.deepEqual(seen[2], { TZ: concurrentTimeZone(inherited) });
  assert.notEqual(seen[2].TZ, inherited);
  const receipt = validateReceipt(JSON.parse(concurrent.read('receipt.json')));
  assert.deepEqual(receipt.captureTimeZones, [
    inherited,
    concurrentTimeZone(inherited),
  ]);
  // Never the same zone twice, whatever the inherited one is.
  assert.equal(concurrentTimeZone('Pacific/Kiritimati'), 'Pacific/Pago_Pago');
  assert.equal(concurrentTimeZone('Europe/London'), 'Pacific/Kiritimati');

  const sequential = setup({ capture });
  assert.equal(await quietly(() => sequential.run('--sequential')), 0);
  assert.deepEqual([seen[1], seen[2]], [{}, {}]);
  const seqReceipt = validateReceipt(
    JSON.parse(sequential.read('receipt.json')),
  );
  assert.equal(seqReceipt.captureOffsetMs, 0);
  assert.deepEqual(seqReceipt.captureTimeZones, [inherited, inherited]);
});

test('concurrent runs start at least CONCURRENT_START_OFFSET_MS apart; --sequential adds no delay', async () => {
  const startedAt = {};
  const capture = async (input) => {
    startedAt[runIndex(input.dir)] = performance.now();
    return asyncCapture()(input);
  };
  const concurrent = setup({ capture, offsetMs: null });
  assert.equal(await quietly(() => concurrent.run()), 0);
  assert.ok(
    startedAt[2] - startedAt[1] >= CONCURRENT_START_OFFSET_MS - 1,
    `run 2 started ${startedAt[2] - startedAt[1]} ms after run 1`,
  );
  assert.equal(
    validateReceipt(JSON.parse(concurrent.read('receipt.json')))
      .captureOffsetMs,
    CONCURRENT_START_OFFSET_MS,
  );

  const sequential = setup({ capture, offsetMs: null });
  const before = performance.now();
  assert.equal(await quietly(() => sequential.run('--sequential')), 0);
  assert.ok(performance.now() - before < CONCURRENT_START_OFFSET_MS);
});

// The captures here run in this process, so they read the zone they were handed (as a capture process would see it in TZ).
const zoneOf = (env) => env.TZ ?? inherited;
const localDigits = (timeZone, at = new Date()) =>
  Number(
    at
      .toLocaleString('sv-SE', { timeZone, hourCycle: 'h23' })
      .replace(/\D/g, '')
      .slice(0, 10),
  );

test('a capture whose rows embed the time zone fails the concurrent run as NONDETERMINISTIC_ROWS', async () => {
  const t = setup({
    capture: async (input) => {
      // The local date and hour (YYYYMMDDHH) in the capture's zone, carried into every row's BV.
      const bv = localDigits(zoneOf(input.env));
      return asyncCapture({ change: () => ({ bv }) })(input);
    },
  });
  assert.equal(await quietly(() => t.run()), 1);
  const failure = JSON.parse(t.read('failure.json'));
  assert.equal(failure.reason, 'NONDETERMINISTIC_ROWS');
  assert.equal(failure.units.length, ids.length);
});

test('a capture whose rows embed the clock fails the concurrent run as NONDETERMINISTIC_ROWS', async () => {
  const t = setup({
    // Whole seconds: two runs started more than a second apart can never agree.
    offsetMs: 1100,
    capture: async (input) => {
      const bv = Math.floor(Date.now() / 1000);
      return asyncCapture({ change: () => ({ bv }) })(input);
    },
  });
  assert.equal(await quietly(() => t.run()), 1);
  assert.equal(
    JSON.parse(t.read('failure.json')).reason,
    'NONDETERMINISTIC_ROWS',
  );
});

test('jestCapture hands the capture process its extra environment on top of this one', async () => {
  // A stand-in for node_modules/jest/bin/jest.js that writes the capture outputs, with TZ in each record.
  const root = tmp();
  fs.mkdirSync(path.join(root, 'node_modules/jest/bin'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'node_modules/jest/bin/jest.js'),
    [
      "const fs = require('node:fs');",
      "const path = require('node:path');",
      "const context = JSON.parse(fs.readFileSync(process.env.STUB_CONTEXT, 'utf8'));",
      "const plan = JSON.parse(fs.readFileSync(context.planFile, 'utf8'));",
      'const out = (name, text) => fs.writeFileSync(path.join(context.outputDirectory, name), text);',
      "out('captured.jsonl', plan.map((p) => JSON.stringify({ unitId: p.unitId, tz: process.env.TZ ?? null, home: process.env.STUB_HOME ?? null }) + '\\n').join(''));",
      "out('capture-summary.json', JSON.stringify({ infrastructureFailures: 0 }));",
      "out('resources.json', JSON.stringify({ maxRSS: 1 }));",
    ].join('\n'),
  );
  const capture = jestCapture({
    config: 'unused.js',
    contextEnv: 'STUB_CONTEXT',
  });
  const plan = [{ unitId: 'alpha' }];
  process.env.STUB_HOME = 'kept';
  try {
    const zoned = await capture({
      repoRoot: root,
      plan,
      dir: path.join(root, 'run-2'),
      env: { TZ: 'Pacific/Kiritimati' },
    });
    assert.deepEqual(zoned.records, [
      { unitId: 'alpha', tz: 'Pacific/Kiritimati', home: 'kept' },
    ]);
    const plain = await capture({
      repoRoot: root,
      plan,
      dir: path.join(root, 'run-1'),
    });
    assert.deepEqual(plain.records, [
      { unitId: 'alpha', tz: process.env.TZ ?? null, home: 'kept' },
    ]);
  } finally {
    delete process.env.STUB_HOME;
  }
});

test('main fails with a named reason when the census cannot complete', async () => {
  const none = setup({
    join: {
      rows: [],
      manifest: { committedCatalog: { joined: 0, errors: [], joins: [] } },
    },
  });
  assert.equal(await quietly(() => none.run()), 1);
  assert.equal(
    JSON.parse(none.read('failure.json')).reason,
    'ZERO_UNITS_MEASURED',
  );
  const broken = setup({
    capture: () => {
      throw new RunError('CAPTURE_INCOMPLETE', 'jest exited 1');
    },
  });
  assert.equal(await quietly(() => broken.run()), 1);
  assert.equal(
    JSON.parse(broken.read('failure.json')).reason,
    'CAPTURE_INCOMPLETE',
  );
  const family = setup();
  assert.equal(await quietly(() => family.run('--family', 'vehicles')), 1);
  assert.equal(
    JSON.parse(family.read('failure.json')).reason,
    'UNSUPPORTED_FAMILY',
  );
  // One family per run: each family has its own facts and baseline files.
  const two = setup();
  assert.equal(
    await quietly(() => two.run('--family', 'battlemechs,vehicles')),
    1,
  );
  assert.match(
    JSON.parse(two.read('failure.json')).message,
    /exactly one family per run/,
  );
});

test('the runner can see a drop: one wrong BV lowers the exact count and names the unit', async () => {
  const t = setup({
    capture: ({ plan }) => ({
      records: plan.map((p) =>
        record(p.unitId, p.unitId === 'gamma' ? { bv: 990 } : {}),
      ),
      durationSeconds: 1,
      resources: { maxRSS: 1 },
    }),
  });
  assert.equal(
    await quietly(() => t.run()),
    0,
    'a parity difference must not fail the run',
  );
  assert.equal(JSON.parse(t.read('summary.json')).bv.exact, 2);
  const diffs = t
    .read('java-differences.ndjson')
    .trim()
    .split('\n')
    .map(JSON.parse);
  assert.deepEqual(
    diffs.map((d) => [d.unitId, d.measure, d.observed, d.java]),
    [['gamma', 'bv', 990, 1000]],
  );
  assert.ok(InputError);
});

// --- the gate's inputs: facts.ndjson and --write-baseline ---------------------------------------
const baselineFile = (t) =>
  path.join(path.dirname(t.outDir), 'config/parity-runtime/baseline-load.json');

test('main writes facts.ndjson beside the rows: bvExact, distance, validity and weight owners per unit', async () => {
  const t = setup();
  assert.equal(await quietly(() => t.run()), 0);
  const facts = parseFacts('load', t.read('facts.ndjson'));
  assert.deepEqual(
    facts.map((f) => f.unitId),
    ids,
  );
  assert.deepEqual(facts[0].facts, {
    bvExact: true,
    bvDistance: 0,
    validity: true,
    weightOwners: true,
    previewEqualsStatus: true,
  });
  assert.deepEqual(facts[0].reported, { previewStatusDistance: 0 });
  assert.equal(t.exists('failure.json'), false);
  // The rows are not changed by the facts: no field of the row schema was added.
  assert.equal('facts' in parseRows(t.read('rows.ndjson'))[0], false);
  // Where the facts came from travels with them: the facts schema, the deriver's blob, the reference sha.
  const meta = parseFactsMeta(t.read('facts-meta.json'));
  assert.deepEqual(
    [meta.measure, meta.family, meta.factsSchemaVersion, meta.referenceSha256],
    ['load', 'battlemechs', FACTS_SCHEMA_VERSION, hex('d')],
  );
  assert.equal(meta.coreDeriverSha, coreDeriverSha());
  assert.equal(meta.familyDeriverSha, familyDeriverSha('battlemechs'));
});

test('--write-baseline writes the baseline of a complete run with its SHA, population hash and note', async () => {
  const t = setup();
  assert.equal(
    await quietly(() =>
      t.run('--write-baseline', '--reason', 'seed from the first green run'),
    ),
    0,
  );
  const baseline = parseBaseline(
    'load',
    fs.readFileSync(baselineFile(t), 'utf8'),
    null,
  );
  assert.equal(baseline.sha, hex('c', 40));
  // Provenance: the facts schema, the deriver's git blob and the reference the facts were derived with.
  assert.equal(baseline.factsSchemaVersion, FACTS_SCHEMA_VERSION);
  assert.equal(baseline.coreDeriverSha, coreDeriverSha());
  assert.equal(baseline.familyDeriverSha, familyDeriverSha('battlemechs'));
  assert.equal(baseline.referenceSha256, hex('d'));
  // The load measure has no set facts, so there is no sidecar.
  assert.equal(
    fs.existsSync(baselineFile(t).replace(/\.json$/, '.sets.ndjson')),
    false,
  );
  assert.equal(baseline.populationCount, 3);
  assert.deepEqual(
    Object.keys(baseline.units),
    ids.map((id) => `battlemechs/${id}`),
  );
  assert.deepEqual(
    baseline.notes.map((n) => [n.reason, n.pr, n.sha]),
    [['seed from the first green run', null, hex('c', 40)]],
  );
  // A second write keeps the earlier note and adds its own.
  assert.equal(
    await quietly(() =>
      t.run(
        '--write-baseline',
        '--reason',
        'A2 locks in the Mad Cats',
        '--pr',
        '3400',
      ),
    ),
    0,
  );
  const again = JSON.parse(fs.readFileSync(baselineFile(t), 'utf8'));
  assert.deepEqual(
    again.notes.map((n) => [n.reason, n.pr]),
    [
      ['seed from the first green run', null],
      ['A2 locks in the Mad Cats', 3400],
    ],
  );
});

test('--write-baseline needs a reason, and refuses a narrowed run, differing runs and any failed unit: nothing is written', async () => {
  const t = setup();
  await assert.rejects(() => t.run('--write-baseline'), /--reason/);
  assert.equal(fs.existsSync(baselineFile(t)), false);

  assert.equal(
    await quietly(() =>
      t.run('--write-baseline', '--reason', 'x', '--units', 'beta'),
    ),
    1,
  );
  assert.equal(JSON.parse(t.read('failure.json')).reason, 'BASELINE_REFUSED');
  assert.match(JSON.parse(t.read('failure.json')).message, /narrowed/);
  assert.equal(fs.existsSync(baselineFile(t)), false);

  let call = 0;
  const differing = setup({
    capture: ({ plan }) => {
      call++;
      return {
        records: plan.map((p) =>
          record(
            p.unitId,
            p.unitId === 'beta' && call === 2 ? { bv: 1001 } : {},
          ),
        ),
        durationSeconds: 1,
        resources: { maxRSS: 1 },
      };
    },
  });
  assert.equal(
    await quietly(() => differing.run('--write-baseline', '--reason', 'x')),
    1,
  );
  assert.match(
    JSON.parse(differing.read('failure.json')).message,
    /not byte-identical/,
  );
  assert.equal(fs.existsSync(baselineFile(differing)), false);

  const failedUnit = setup({
    capture: ({ plan }) => ({
      records: plan.map((p) =>
        p.unitId === 'beta'
          ? {
              ...record('beta'),
              observed: null,
              terms: null,
              issues: null,
              error: { stage: 'open', name: 'E', message: 'm' },
            }
          : record(p.unitId),
      ),
      durationSeconds: 1,
      resources: { maxRSS: 1 },
    }),
  });
  assert.equal(
    await quietly(() => failedUnit.run('--write-baseline', '--reason', 'x')),
    1,
  );
  assert.match(
    JSON.parse(failedUnit.read('failure.json')).message,
    /failed or have an unknown fact \(first: battlemechs\/beta\)/,
  );
  assert.equal(fs.existsSync(baselineFile(failedUnit)), false);
});
