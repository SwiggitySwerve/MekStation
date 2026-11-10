import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { parseRows, serializeRows, validateReceipt } from '../lib/runtime-parity/rows.mjs';
import { capturedToRow, summarize } from './report.mjs';
import { main } from './run.mjs';

const hex = (c, n = 64) => c.repeat(n);
const cell = (slot, text = 'Foo') => ({ location: 'Center Torso', slot, text });
const observation = (bv, extra = {}) => ({
  observed: { bv, validity: 'valid', weight: 50, allocatedWeight: 50, mp: { walk: 4, run: 6, jump: 0 }, ...extra },
  terms: { armorBV: 360 },
  issues: [],
});
const record = (id, { before = 1000, after = 1000, beforeExtra, afterExtra, lost = [], equal = true, mounts = {} } = {}) => ({
  unitId: id,
  family: 'battlemechs',
  path: `meks/${id}.mtf`,
  sha256: hex('a'),
  catalog: { path: `public/data/units/battlemechs/x/${id}.json`, blob: hex('1', 40) },
  error: null,
  infrastructure: false,
  before: observation(before, beforeExtra),
  after: observation(after, afterExtra),
  lostCells: lost,
  tokenChanges: [],
  rawIdentityLosses: lost.map(({ location, slot, text }) => ({ location, slot, text })),
  noticeResidual: {
    residual: equal ? lost.filter((c) => c.identity === 'non-system').map(({ location, slot, text }) => ({ location, slot, text })) : [],
    noticeOnly: [],
    roundTripOnly: equal ? [] : lost.filter((c) => c.identity === 'non-system').map(({ location, slot, text }) => ({ location, slot, text })),
    equal,
    reopenedResidualCells: 0,
  },
  loadedMountLosses: [],
  changedLoadedMounts: [],
  addedLoadedMounts: [],
  ...mounts,
});
const lostCell = (slot, bucket = 'o3a') => ({ ...cell(slot), identity: 'non-system', bucket, kind: 'armor_structure' });
const systemCell = (slot) => ({ ...cell(slot, 'Engine'), identity: 'system', bucket: null, kind: null });
const failed = (id, stage = 'sqlite-write') => ({ ...record(id), before: null, after: null, error: { stage, name: 'Error', message: 'boom' } });

test('capturedToRow maps ok and error records to valid reopen rows', () => {
  const ok = capturedToRow(record('a', { lost: [lostCell(3), systemCell(4)] }));
  assert.equal(ok.measure, 'reopen');
  assert.equal(ok.reopen.before.occupancy, null);
  assert.deepEqual(ok.reopen.before.terms, { armorBV: 360 });
  const noBv = capturedToRow({ ...record('b'), before: { ...observation(null), terms: null } });
  assert.deepEqual(noBv.reopen.before.terms, {});
  const bad = capturedToRow(failed('c'));
  assert.deepEqual(bad.error, { stage: 'sqlite-write', name: 'Error', message: 'boom' });
  assert.equal(parseRows(serializeRows([ok, noBv, bad])).length, 3);
});

const refRow = (id, total) => [`meks/${id}.mtf`, { battleValue: { total } }];
const scope = (populationCount, unitIds = null) => ({ families: ['battlemechs'], populationCount, unitIds });

test('summarize counts reopen = load, reopen = Java and load = Java, and every miss', () => {
  const rows = [
    capturedToRow(record('same')),
    capturedToRow(record('lost', { after: 900, lost: [lostCell(3), lostCell(5, 'PR-D'), systemCell(6)] })),
    capturedToRow(record('javaOff', { before: 999, after: 999 })),
    capturedToRow({ ...record('nobv'), after: { ...observation(null), terms: null } }),
    capturedToRow(failed('broken')),
  ];
  const referenceByPath = new Map(['same', 'lost', 'javaOff', 'nobv', 'broken'].map((id) => refRow(id, 1000)));
  const { summary, differences } = summarize({ rows, referenceByPath, scope: scope(5), deterministic: true });
  assert.deepEqual(summary.reopenLoad, { equal: 2, different: 1, missing: 2 });
  assert.deepEqual(summary.loadJava, { equal: 3, different: 1, missing: 1 });
  assert.deepEqual(summary.reopenJava, { equal: 1, different: 2, missing: 2 });
  assert.deepEqual(summary.cells.byBucket, { 'PR-D': { lostCells: 1, units: 1 }, o3a: { lostCells: 1, units: 1 } });
  assert.deepEqual([summary.cells.unitsWithLoss, summary.cells.lostCells, summary.cells.systemCellsLost], [1, 2, 1]);
  assert.deepEqual(summary.errorsByStage, { 'sqlite-write': 1 });
  assert.equal(summary.headline, 'reopen=load 2/5 · reopen=Java 1/5 · load=Java 3/5 · notice residual equal 4/5 · weight owners 4/5');
  assert.deepEqual(
    differences.filter((d) => d.measure === 'reopen=load').map((d) => [d.unitId, d.loadBV, d.reopenBV, d.why]),
    [['lost', 1000, 900, 'different'], ['nobv', 1000, null, 'no-calculator-result'], ['broken', null, null, 'error:sqlite-write']],
  );
});

test('summarize reports a notice mismatch, a weight owner split at either end, and refuses a wrong population', () => {
  const rows = [
    capturedToRow(record('notice', { lost: [lostCell(3)], equal: false })),
    capturedToRow(record('beforeSplit', { beforeExtra: { allocatedWeight: 49.5 } })),
    capturedToRow(record('afterSplit', { afterExtra: { allocatedWeight: 49.5 } })),
  ];
  const referenceByPath = new Map(['notice', 'beforeSplit', 'afterSplit'].map((id) => refRow(id, 1000)));
  const { summary, differences } = summarize({ rows, referenceByPath, scope: scope(3), deterministic: true });
  assert.deepEqual(summary.noticeResidual, { equal: 2, different: 1, missing: 0 });
  assert.deepEqual(summary.weightOwners, { agree: 1, mismatch: 2, missing: 0 });
  assert.match(summary.headline, /weight owners 1\/3 \(DIFFER 2\)/);
  assert.deepEqual(differences.filter((d) => d.measure === 'weight-owner').map((d) => d.unitId), ['beforeSplit', 'afterSplit']);
  assert.throws(() => summarize({ rows, referenceByPath, scope: scope(4), deterministic: true }), /Population mismatch/);
  assert.throws(() => summarize({ rows: [rows[0], rows[0]], referenceByPath, scope: scope(2), deterministic: true }), /more than one row/);
});

// --- main(): the whole flow through the shared orchestrator, with an injected capture ----------
const ids = ['alpha', 'beta', 'gamma'];
const emitterOutput = () => ({
  rows: ids.map((id) => ({ path: `meks/${id}.mtf`, sha256: hex('a'), unit: { id, chassis: id, model: '1' } })),
  manifest: {
    committedCatalog: {
      joined: ids.length,
      errors: [],
      joins: ids.map((id) => ({
        catalogFile: `public/data/units/battlemechs/x/${id}.json`,
        catalogBlob: hex('1', 40),
        path: `meks/${id}.mtf`,
        sha256: hex('a'),
        family: 'battlemechs',
        evaluation: 'committed-unit',
        alias: false,
      })),
    },
  },
});
function setup({ capture } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rprt-'));
  const sources = path.join(root, 'sources');
  fs.mkdirSync(sources);
  const { rows, manifest } = emitterOutput();
  fs.writeFileSync(path.join(sources, 'sources.ndjson'), rows.map((r) => JSON.stringify(r) + '\n').join(''));
  fs.writeFileSync(path.join(sources, 'sources.ndjson.manifest.json'), JSON.stringify(manifest));
  const deps = {
    repoRoot: root,
    gitHead: () => hex('c', 40),
    loadReference: () => ({ file: '', rows: ids.map((id) => ({ path: `meks/${id}.mtf`, sha256: hex('a'), battleValue: { total: 1000 } })), gzipSha256: hex('d') }),
    capture: capture ?? (({ plan }) => ({ records: plan.map((p) => record(p.unitId)), durationSeconds: 1, resources: { maxRSS: 1 } })),
  };
  const outDir = path.join(root, 'out');
  return {
    run: (...extra) => main(['--out', outDir, '--sources', sources, ...extra], deps),
    read: (name) => fs.readFileSync(path.join(outDir, name), 'utf8'),
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

test('main writes reopen rows, summary and a receipt that proves the population', async () => {
  const t = setup();
  assert.equal(await quietly(() => t.run()), 0);
  assert.deepEqual(parseRows(t.read('rows.ndjson')).map((r) => r.unitId), ids);
  const summary = JSON.parse(t.read('summary.json'));
  assert.equal(summary.measure, 'reopen');
  assert.equal(summary.reopenLoad.equal, 3);
  const receipt = validateReceipt(JSON.parse(t.read('receipt.json')));
  assert.equal(receipt.measure, 'reopen');
  assert.deepEqual(receipt.scope, { families: ['battlemechs'], populationCount: 3, unitIds: null });
  assert.equal(t.read('reopen-differences.ndjson'), '');
  const narrowed = setup();
  assert.equal(await quietly(() => narrowed.run('--units', 'gamma,alpha,gamma', '--runs', '1')), 0);
  assert.deepEqual(JSON.parse(narrowed.read('receipt.json')).scope.unitIds, ['alpha', 'gamma']);
});

test('main fails the run for a short capture and for two runs that differ, keeping the artifacts', async () => {
  const short = setup({ capture: ({ plan }) => ({ records: plan.slice(0, 2).map((p) => record(p.unitId)), durationSeconds: 1, resources: { maxRSS: 1 } }) });
  assert.equal(await quietly(() => short.run()), 1);
  assert.equal(JSON.parse(short.read('failure.json')).reason, 'POPULATION_MISMATCH');
  let call = 0;
  const flaky = setup({
    capture: ({ plan }) => {
      call++;
      return { records: plan.map((p) => record(p.unitId, p.unitId === 'beta' && call === 2 ? { after: 1001 } : {})), durationSeconds: 1, resources: { maxRSS: 1 } };
    },
  });
  assert.equal(await quietly(() => flaky.run()), 1);
  const failure = JSON.parse(flaky.read('failure.json'));
  assert.deepEqual([failure.reason, failure.units], ['NONDETERMINISTIC_ROWS', [['battlemechs', 'meks/beta.mtf']]]);
  assert.equal(JSON.parse(flaky.read('receipt.json')).deterministic, false);
  assert.equal(flaky.exists('rows.ndjson'), true);
});

test('the runner can see a drop: a reopen BV that moves lowers reopen = load and names the unit', async () => {
  const t = setup({
    capture: ({ plan }) => ({ records: plan.map((p) => record(p.unitId, p.unitId === 'gamma' ? { after: 700 } : {})), durationSeconds: 1, resources: { maxRSS: 1 } }),
  });
  assert.equal(await quietly(() => t.run()), 0, 'a parity difference must not fail the run');
  assert.equal(JSON.parse(t.read('summary.json')).reopenLoad.equal, 2);
  const diffs = t.read('reopen-differences.ndjson').trim().split('\n').map(JSON.parse);
  assert.deepEqual(diffs.map((d) => [d.unitId, d.loadBV, d.reopenBV]), [['gamma', 1000, 700]]);
});
