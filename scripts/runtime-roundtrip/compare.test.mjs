import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { serializeRows } from '../lib/runtime-parity/rows.mjs';
import { compareToReference, main } from './compare.mjs';
import { capturedToRow } from './report.mjs';

const hex = (c, n = 64) => c.repeat(n);
const record = (id, load, reopen) => ({
  unitId: id,
  family: 'battlemechs',
  path: `meks/${id}.mtf`,
  sha256: hex('a'),
  catalog: { path: `public/data/units/battlemechs/x/${id}.json`, blob: hex('1', 40) },
  error: null,
  infrastructure: false,
  before: { observed: { bv: load, validity: 'valid', weight: 50, allocatedWeight: 50, mp: { walk: 4, run: 6, jump: 0 } }, terms: { armorBV: 1 }, issues: [] },
  after: { observed: { bv: reopen, validity: 'valid', weight: 50, allocatedWeight: 50, mp: { walk: 4, run: 6, jump: 0 } }, terms: { armorBV: 1 }, issues: [] },
  lostCells: [],
  tokenChanges: [],
  rawIdentityLosses: [],
  noticeResidual: { residual: [], noticeOnly: [], roundTripOnly: [], equal: true, reopenedResidualCells: 0 },
  loadedMountLosses: [],
  changedLoadedMounts: [],
  addedLoadedMounts: [],
  saveLoss: { settled: true, lossTrackingUnknown: false, noticeBefore: [], armorSaveLoss: false, armorSaveLossSourceType: null },
});
const unit = (id, loadBV, reopenBV, javaBV = loadBV) => ({
  unitId: id,
  sourcePath: `public/data/units/battlemechs/x/${id}.json`,
  loadBV,
  reopenBV,
  javaBV,
});
const ref = (units, runtimeSHA = hex('c', 40)) => ({ runtimeSHA, units });
const rows = (specs) => specs.map(([id, load, reopen]) => capturedToRow(record(id, load, reopen)));

test('identical per-unit BVs are equal, and the counts match the reference counts', () => {
  const { summary, differences } = compareToReference(
    rows([['a', 1000, 1000], ['b', 900, 800]]),
    ref([unit('a', 1000, 1000), unit('b', 900, 800)]),
  );
  assert.deepEqual([summary.matched, summary.identical, summary.differing, summary.equal], [2, 2, 0, true]);
  assert.deepEqual(differences, []);
  assert.deepEqual(summary.ours, summary.reference);
  assert.deepEqual(summary.ours, { reopenEqualsLoad: 1, loadEqualsJava: 2, reopenEqualsJava: 1, nullReopen: 0 });
});

test('every differing BV is listed, and both unit sets must be identical', () => {
  const { summary, differences } = compareToReference(
    rows([['a', 1000, 999], ['b', 901, 800], ['extra', 5, 5]]),
    ref([unit('a', 1000, 1000), unit('b', 900, 800), unit('lost', 7, 7)]),
  );
  assert.equal(summary.equal, false);
  assert.deepEqual([summary.matched, summary.differing, summary.portOnly, summary.referenceOnly], [2, 2, 1, 1]);
  assert.deepEqual(
    differences.map((d) => [d.unitId, d.field, d.port, d.reference]),
    [['a', 'reopenBV', 999, 1000], ['b', 'loadBV', 901, 900], ['extra', 'unmatched', 'port-only', null], ['lost', 'unmatched', null, 'reference-only']],
  );
  // A deliberately narrowed run is only checked one way, and says so.
  const narrowed = compareToReference(rows([['a', 1000, 1000]]), ref([unit('a', 1000, 1000), unit('b', 900, 800)]), { subset: true });
  assert.deepEqual([narrowed.summary.equal, narrowed.summary.subset, narrowed.summary.referenceOnly], [true, true, 0]);
  // A null reopen BV never equals a number.
  const nulls = compareToReference(rows([['a', 1000, null]]), ref([unit('a', 1000, 1000)]));
  assert.equal(nulls.summary.equal, false);
  assert.equal(nulls.summary.ours.nullReopen, 1);
});

test('main exits 1 on a difference, and on a different runtime SHA only when required', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rprt-cmp-'));
  const write = (name, value) => {
    fs.writeFileSync(path.join(dir, name), typeof value === 'string' ? value : JSON.stringify(value));
    return path.join(dir, name);
  };
  const rowsFile = write('rows.ndjson', serializeRows(rows([['a', 1000, 1000]])));
  const same = write('same.json', ref([unit('a', 1000, 1000)]));
  const off = write('off.json', ref([unit('a', 1000, 1)]));
  const receipt = (sha) => write(`receipt-${sha[0]}.json`, { repoSha: sha, node: 'v22.0.0', platform: 'linux-x64' });
  const quiet = async (fn) => {
    const { log } = console;
    console.log = () => {};
    try {
      return await fn();
    } finally {
      console.log = log;
    }
  };
  const run = (refFile, extra = []) => quiet(() => main(['--rows', rowsFile, '--ref', refFile, '--out', path.join(dir, 'out'), ...extra]));
  assert.equal(await run(same), 0);
  assert.equal(await run(same, ['--receipt', receipt(hex('c', 40))]), 0);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'out/compare-summary.json'), 'utf8')).sameRuntimeSha, true);
  // A different SHA is recorded, and only fails the run when it is required to match.
  assert.equal(await run(same, ['--receipt', receipt(hex('d', 40))]), 0);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'out/compare-summary.json'), 'utf8')).sameRuntimeSha, false);
  assert.equal(await run(same, ['--receipt', receipt(hex('d', 40)), '--require-same-sha']), 1);
  assert.equal(await run(same, ['--receipt', receipt(hex('c', 40)), '--require-same-sha']), 0);
  assert.equal(await run(off), 1);
  assert.deepEqual(
    fs.readFileSync(path.join(dir, 'out/compare-differences.ndjson'), 'utf8').trim().split('\n').map((l) => JSON.parse(l).field),
    ['reopenBV'],
  );
  await assert.rejects(() => main(['--rows', rowsFile]), /Required/);
});
