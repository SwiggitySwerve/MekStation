import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseRows, validateReceipt } from '../lib/runtime-parity/rows.mjs';
import {
  InputError,
  buildPlan,
  emitterCommand,
  readJoinFiles,
  verifyAgainstReference,
} from './join.mjs';
import { capturedToRow, summarize } from './report.mjs';
import { RunError, loadReference, main } from './run.mjs';

const hex = (c, n = 64) => c.repeat(n);
const unitRow = (id, mtf) => ({ path: mtf, sha256: hex('a'), unit: { id, chassis: id, model: '1' } });
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
  fs.writeFileSync(path.join(dir, 'sources.ndjson'), rows.map((r) => JSON.stringify(r) + '\n').join(''));
  fs.writeFileSync(path.join(dir, 'sources.ndjson.manifest.json'), JSON.stringify(manifest));
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
  assert.deepEqual(plan.map((p) => p.unitId), ['alpha', 'zeta']);
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
  assert.equal(reasonOf(() => buildPlan({ ...drift, families: ['battlemechs'] })), 'INPUT_SHA_DRIFT');

  const short = emitterOutput(['alpha', 'zeta']);
  short.manifest.committedCatalog.joins.pop();
  assert.equal(reasonOf(() => buildPlan({ ...short, families: ['battlemechs'] })), 'MISSING_MANIFEST_ROWS');

  const identityOnly = emitterOutput(['alpha']);
  identityOnly.manifest.committedCatalog.joins[0].evaluation = 'identity-only/source-text';
  assert.equal(reasonOf(() => buildPlan({ ...identityOnly, families: ['battlemechs'] })), 'MISSING_MANIFEST_ROWS');

  const errors = emitterOutput(['alpha']);
  errors.manifest.committedCatalog.errors = ['zero-source-matches: x'];
  assert.equal(reasonOf(() => buildPlan({ ...errors, families: ['battlemechs'] })), 'S0B_MANIFEST_MISSING');

  const twice = emitterOutput(['alpha']);
  twice.rows.push(unitRow('alpha', 'meks/alpha-2.mtf'));
  twice.manifest.committedCatalog.joins.push(join('alpha', 'meks/alpha-2.mtf'));
  twice.manifest.committedCatalog.joined = 2;
  assert.equal(reasonOf(() => buildPlan({ ...twice, families: ['battlemechs'] })), 'MISSING_MANIFEST_ROWS');
});

test('join input and reference failures are named', () => {
  const dir = tmp();
  assert.equal(reasonOf(() => readJoinFiles(dir)), 'S0B_MANIFEST_MISSING');
  writeJoin(dir, emitterOutput(['alpha']));
  const read = readJoinFiles(dir);
  assert.equal(read.rows.length, 1);
  assert.match(read.sourcesSha256, /^[a-f0-9]{64}$/);
  const plan = buildPlan({ ...read, families: ['battlemechs'] });
  assert.equal(verifyAgainstReference(plan, [{ path: 'meks/alpha.mtf', sha256: hex('a') }]).size, 1);
  assert.equal(reasonOf(() => verifyAgainstReference(plan, [{ path: 'meks/alpha.mtf', sha256: hex('b') }])), 'INPUT_SHA_DRIFT');
  assert.equal(reasonOf(() => verifyAgainstReference(plan, [])), 'MISSING_MANIFEST_ROWS');
});

test('the committed reference loads through the scoreboard verifier and drift is named', () => {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const work = tmp();
  const reference = loadReference(repoRoot, work);
  const config = JSON.parse(fs.readFileSync(path.join(repoRoot, 'config/reference/parity-scoreboard.json'), 'utf8'));
  assert.equal(reference.rows.length, config.reference.rows);
  assert.equal(reference.gzipSha256, config.reference.gzipSha256);
  assert.ok(reference.rows.every((row) => typeof row.path === 'string' && /^[a-f0-9]{64}$/.test(row.sha256)));
  // A checkout without the reference is a named input failure, not a crash.
  assert.equal(reasonOf(() => loadReference(tmp(), work)), 'S0A_REFERENCE_MISSING');
});

test('the emitter runs as a child step with the pinned arguments', () => {
  const { command, args } = emitterCommand({ repoRoot: '/r', commit: hex('c', 40), mekfiles: '/m', referenceFile: '/ref.jsonl', out: '/o' });
  assert.equal(command, process.execPath);
  assert.deepEqual(args.slice(0, 2), ['--require', 'tsx/cjs']);
  for (const flag of ['--commit', '--mekfiles', '--reference', '--out', '--source-only-families-identity-only'])
    assert.ok(args.includes(flag), flag);
  assert.equal(args[args.indexOf('--mekfiles') + 1], '/m');
});

const planEntry = (id) => ({
  family: 'battlemechs',
  unitId: id,
  catalogPath: `public/data/units/battlemechs/x/${id}.json`,
  catalogBlob: hex('1', 40),
  path: `meks/${id}.mtf`,
  sha256: hex('a'),
});
const record = (id, { bv = 1000, validity = 'valid', terms = { armorBV: 360 }, allocatedWeight = 50 } = {}) => ({
  unitId: id,
  family: 'battlemechs',
  path: `meks/${id}.mtf`,
  sha256: hex('a'),
  catalog: { path: `public/data/units/battlemechs/x/${id}.json`, blob: hex('1', 40) },
  error: null,
  infrastructure: false,
  observed: { bv, validity, weight: 50, allocatedWeight, mp: { walk: 4, run: 6, jump: 0 } },
  terms,
  issues: [],
});

test('capturedToRow maps ok, no-BV and error records to valid rows', () => {
  const ok = capturedToRow(record('a'));
  assert.equal(ok.load.observed.occupancy, null);
  assert.deepEqual(ok.load.terms, { armorBV: 360 });
  const noBv = capturedToRow(record('b', { bv: null, terms: null }));
  assert.equal(noBv.load.observed.bv, null);
  assert.deepEqual(noBv.load.terms, {});
  const failed = capturedToRow({ ...record('c'), observed: null, terms: null, issues: null, infrastructure: false, error: { stage: 'open', name: 'Error', message: 'boom' } });
  assert.deepEqual(failed.error, { stage: 'open', name: 'Error', message: 'boom' });
  assert.equal(failed.status, 'error');
  assert.equal(parseRows([ok, noBv, failed].map((r) => JSON.stringify(r)).join('\n')).length, 3);
});

const refRow = (id, total, valid = true) => [`meks/${id}.mtf`, { path: `meks/${id}.mtf`, sha256: hex('a'), battleValue: { total }, construction: { valid } }];

test('summarize counts agreement with Java and counts every miss', () => {
  const rows = [
    capturedToRow(record('exact', { bv: 1000 })),
    capturedToRow(record('off', { bv: 999 })),
    capturedToRow(record('nobv', { bv: null, terms: null })),
    capturedToRow(record('badvalid', { bv: 1000, validity: 'invalid' })),
    capturedToRow({ ...record('broken'), observed: null, terms: null, issues: null, error: { stage: 'open', name: 'E', message: 'm' } }),
  ];
  const referenceByPath = new Map(['exact', 'off', 'nobv', 'badvalid', 'broken'].map((id) => refRow(id, 1000)));
  const whole = { families: ['battlemechs'], populationCount: 5, unitIds: null };
  const { summary, differences } = summarize({ rows, referenceByPath, scope: whole, deterministic: true });
  assert.deepEqual(summary.bv, { exact: 2, different: 1, missing: 2 });
  assert.deepEqual(summary.validity, { agree: 3, disagree: 1, missing: 1 });
  assert.deepEqual(summary.errorsByStage, { open: 1 });
  assert.equal(summary.units, 5);
  assert.equal(summary.headline, 'load=Java 2/5 · validity 3/5 · weight owners 4/5');
  assert.deepEqual(
    differences.filter((d) => d.measure === 'bv').map((d) => [d.unitId, d.why]),
    [['off', 'different'], ['nobv', 'no-calculator-result'], ['broken', 'error:open']],
  );
  const narrowed = summarize({ rows: rows.slice(0, 1), referenceByPath, scope: { families: ['battlemechs'], populationCount: 5, unitIds: ['exact'] }, deterministic: true });
  assert.match(narrowed.summary.headline, /NARROWED SCOPE/);
});

test('summarize refuses rows that are not the population the scope claims', () => {
  const rows = [capturedToRow(record('a')), capturedToRow(record('b'))];
  const referenceByPath = new Map(['a', 'b'].map((id) => refRow(id, 1000)));
  const scope = (populationCount, unitIds = null) => ({ families: ['battlemechs'], populationCount, unitIds });
  const run = (r, s) => summarize({ rows: r, referenceByPath, scope: s, deterministic: true });
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
    capturedToRow({ ...record('broken'), observed: null, terms: null, issues: null, error: { stage: 'open', name: 'E', message: 'm' } }),
  ];
  const referenceByPath = new Map(['same', 'near', 'broken'].map((id) => refRow(id, 1000)));
  const { summary, differences } = summarize({ rows, referenceByPath, scope: { families: ['battlemechs'], populationCount: 3, unitIds: null }, deterministic: true });
  assert.deepEqual(summary.weightOwners, { agree: 1, mismatch: 1, missing: 1 });
  assert.match(summary.headline, /weight owners 1\/3 \(DIFFER 1\)/);
  assert.deepEqual(
    differences.filter((d) => d.measure === 'weight-owner').map((d) => [d.unitId, d.observed, d.allocated]),
    [['near', 50, 50.0000001]],
  );
});

// --- main(): the whole flow with an injected capture ---------------------------------------
const ids = ['alpha', 'beta', 'gamma'];
function setup({ capture, join: out = emitterOutput(ids) } = {}) {
  const root = tmp();
  const sources = path.join(root, 'sources');
  writeJoin(sources, out);
  const referenceRows = ids.map((id) => refRow(id, 1000)[1]);
  const deps = {
    repoRoot: root,
    gitHead: () => hex('c', 40),
    loadReference: () => ({ file: '', rows: referenceRows, gzipSha256: hex('d') }),
    capture:
      capture ??
      (({ plan }) => ({ records: plan.map((p) => record(p.unitId)), durationSeconds: 1.5, resources: { maxRSS: 100 } })),
  };
  const outDir = path.join(root, 'out');
  const run = (...extra) => main(['--out', outDir, '--sources', sources, ...extra], deps);
  const read = (name) => fs.readFileSync(path.join(outDir, name), 'utf8');
  return { run, read, outDir, exists: (name) => fs.existsSync(path.join(outDir, name)) };
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
  assert.deepEqual(rows.map((r) => r.unitId), ids);
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
  assert.deepEqual(parseRows(t.read('rows.ndjson')).map((r) => r.unitId), ['beta']);
  assert.deepEqual(JSON.parse(t.read('receipt.json')).scope.unitIds, ['beta']);
  assert.match(JSON.parse(t.read('summary.json')).headline, /NARROWED SCOPE/);
  const t2 = setup();
  assert.equal(await quietly(() => t2.run('--units', 'nope')), 1);
  assert.equal(JSON.parse(t2.read('failure.json')).reason, 'MISSING_MANIFEST_ROWS');
});

test('--units is sorted and de-duplicated, and the receipt proves the population', async () => {
  const t = setup();
  assert.equal(await quietly(() => t.run('--units', 'gamma,alpha,gamma,alpha', '--runs', '1')), 0);
  const receipt = validateReceipt(JSON.parse(t.read('receipt.json')));
  assert.deepEqual(receipt.scope, { families: ['battlemechs'], populationCount: 3, unitIds: ['alpha', 'gamma'] });
  assert.equal(receipt.rows.count, 2);
  assert.deepEqual(parseRows(t.read('rows.ndjson')).map((r) => r.unitId), ['alpha', 'gamma']);
  const whole = setup();
  assert.equal(await quietly(() => whole.run()), 0);
  assert.deepEqual(JSON.parse(whole.read('receipt.json')).scope, { families: ['battlemechs'], populationCount: 3, unitIds: null });
});

test('a short, padded or repeating capture cannot publish a count', async () => {
  const records = (plan) => plan.map((p) => record(p.unitId));
  const attempt = async (mutate) => {
    const t = setup({ capture: ({ plan }) => ({ records: mutate(records(plan)), durationSeconds: 1, resources: { maxRSS: 1 } }) });
    const code = await quietly(() => t.run());
    return { code, failure: t.exists('failure.json') ? JSON.parse(t.read('failure.json')) : null, wroteRows: t.exists('rows.ndjson') };
  };
  const short = await attempt((r) => r.slice(0, 2));
  assert.deepEqual([short.code, short.failure.reason, short.wroteRows], [1, 'POPULATION_MISMATCH', false]);
  const repeated = await attempt((r) => [r[0], r[0], r[2]]);
  assert.deepEqual([repeated.code, repeated.failure.reason], [1, 'POPULATION_MISMATCH']);
  const unplanned = await attempt((r) => [...r.slice(0, 2), record('stranger')]);
  assert.deepEqual([unplanned.code, unplanned.failure.reason], [1, 'POPULATION_MISMATCH']);
  // An error record is the unit's row: it counts toward the population and keeps its status.
  const withError = setup({
    capture: ({ plan }) => ({
      records: plan.map((p) => (p.unitId === 'beta' ? { ...record('beta'), observed: null, terms: null, issues: null, error: { stage: 'open', name: 'E', message: 'm' } } : record(p.unitId))),
      durationSeconds: 1,
      resources: { maxRSS: 1 },
    }),
  });
  assert.equal(await quietly(() => withError.run()), 0);
  const rows = parseRows(withError.read('rows.ndjson'));
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((r) => r.status), ['ok', 'error', 'ok']);
});

test('main fails the run, names the unit and keeps the artifacts when two runs differ', async () => {
  let call = 0;
  const t = setup({
    capture: ({ plan }) => {
      call++;
      return {
        records: plan.map((p) => record(p.unitId, p.unitId === 'beta' && call === 2 ? { bv: 1001 } : {})),
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

test('main fails with a named reason when the census cannot complete', async () => {
  const none = setup({ join: { rows: [], manifest: { committedCatalog: { joined: 0, errors: [], joins: [] } } } });
  assert.equal(await quietly(() => none.run()), 1);
  assert.equal(JSON.parse(none.read('failure.json')).reason, 'ZERO_UNITS_MEASURED');
  const broken = setup({
    capture: () => {
      throw new RunError('CAPTURE_INCOMPLETE', 'jest exited 1');
    },
  });
  assert.equal(await quietly(() => broken.run()), 1);
  assert.equal(JSON.parse(broken.read('failure.json')).reason, 'CAPTURE_INCOMPLETE');
  const family = setup();
  assert.equal(await quietly(() => family.run('--family', 'vehicles')), 1);
  assert.equal(JSON.parse(family.read('failure.json')).reason, 'UNSUPPORTED_FAMILY');
});

test('the runner can see a drop: one wrong BV lowers the exact count and names the unit', async () => {
  const t = setup({
    capture: ({ plan }) => ({
      records: plan.map((p) => record(p.unitId, p.unitId === 'gamma' ? { bv: 990 } : {})),
      durationSeconds: 1,
      resources: { maxRSS: 1 },
    }),
  });
  assert.equal(await quietly(() => t.run()), 0, 'a parity difference must not fail the run');
  assert.equal(JSON.parse(t.read('summary.json')).bv.exact, 2);
  const diffs = t.read('java-differences.ndjson').trim().split('\n').map(JSON.parse);
  assert.deepEqual(diffs.map((d) => [d.unitId, d.measure, d.observed, d.java]), [['gamma', 'bv', 990, 1000]]);
  assert.ok(InputError);
});
