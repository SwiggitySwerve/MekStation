import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  closeEnough,
  compareTermsToJava,
  diffTerms,
  issueSignature,
  sameTotal,
} from '../lib/runtime-parity/compare.mjs';
import { serializeRows } from '../lib/runtime-parity/rows.mjs';
import { compareToScratch, javaTermReport, main } from './compare.mjs';
import { capturedToRow } from './report.mjs';

const hex = (c, n = 64) => c.repeat(n);
const issue = (field, message = 'm', severity = 'error') => ({ ruleId: 'R', channel: 'errors', severity, field, message });
const record = (id, { bv = 1000, validity = 'valid', terms = { armorBV: 360, weaponBV: 100 }, issues = [] } = {}) => ({
  unitId: id,
  family: 'battlemechs',
  path: `meks/${id}.mtf`,
  sha256: hex('a'),
  catalog: { path: `public/data/units/battlemechs/x/${id}.json`, blob: hex('1', 40) },
  error: null,
  infrastructure: false,
  observed: { bv, validity, weight: 50, allocatedWeight: 50, mp: { walk: 4, run: 6, jump: 0 } },
  terms,
  issues,
});
// The scratch harness's schema-v3 row for the same unit.
const scratch = (id, { bv = 1000, validity = 'valid', terms = { armorBV: 360, weaponBV: 100 }, issues = [], bvStatus = 'available', loadStatus = 'loaded', validationStatus = 'available' } = {}) => ({
  schemaVersion: 3,
  family: 'battlemechs',
  unitId: id,
  sourcePath: `meks/${id}.mtf`,
  sourceSHA256: hex('a'),
  loadStatus,
  validationStatus,
  bvStatus,
  bv,
  validity,
  terms,
  validationIssues: issues.map(({ severity, field, message }) => ({ severity, field, message })),
});
const ids = ['alpha', 'beta', 'gamma'];
const portRows = (overrides = {}) => ids.map((id) => capturedToRow(record(id, overrides[id])));
const scratchRows = (overrides = {}) => ids.map((id) => scratch(id, overrides[id]));

test('shared rules: totals exact, terms within C1 tolerance, absent is never a match', () => {
  assert.equal(sameTotal(1000, 1000), true);
  assert.equal(sameTotal(1000.0000001, 1000), false);
  assert.equal(sameTotal(null, null), false);
  assert.equal(closeEnough(566.3874999999999, 566.3875), true);
  assert.equal(closeEnough(1000, 1001), false);
  assert.equal(closeEnough(undefined, 0), false);
  assert.deepEqual(diffTerms({ a: 1, b: 2 }, { a: 1, b: 2 }), []);
  assert.deepEqual(diffTerms({ a: 1, b: 2 }, { a: 1, c: 3 }), [
    { key: 'b', a: 2, b: null },
    { key: 'c', a: null, b: 3 },
  ]);
  assert.deepEqual(issueSignature([issue('f', 'x', 'error')]), [['error', 'f', 'x']]);
  const java = compareTermsToJava(
    { armorBV: 360, structureBV: 41, 'weapon.0.LA.heavy-ppc': 370 },
    { armorBV: 360, structureBV: 40, 'weapon.6.LA.Heavy PPC': 370, label: 'text' },
  );
  assert.deepEqual([java.javaKeys, java.equal, java.unequal, java.absent], [3, 1, 1, 1]);
  assert.deepEqual(java.absentByCategory, { weapon: 1 });
  assert.deepEqual(java.unequalTerms, [{ key: 'structureBV', observed: 41, java: 40 }]);
});

test('acceptance: identical rows are equal unit by unit', () => {
  const { summary, differences } = compareToScratch(portRows(), scratchRows());
  assert.deepEqual([summary.matched, summary.identical, summary.differing, summary.equal], [3, 3, 0, true]);
  assert.deepEqual(differences, []);
  assert.deepEqual(summary.notComparable, ['weight', 'allocatedWeight', 'mp']);
});

test('acceptance names every field that differs, and unmatched units on both sides', () => {
  const port = portRows({ beta: { bv: 999, terms: { armorBV: 360, weaponBV: 101 }, validity: 'invalid', issues: [issue('criticalSlots.x')] } });
  const { summary, differences } = compareToScratch([...port, capturedToRow(record('extra'))], [...scratchRows(), scratch('lost')]);
  assert.equal(summary.equal, false);
  assert.deepEqual([summary.matched, summary.identical, summary.differing, summary.portOnly, summary.scratchOnly], [3, 2, 1, 1, 1]);
  assert.deepEqual(
    differences.filter((d) => d.unitId === 'beta').map((d) => d.field),
    ['bv', 'validity', 'term:weaponBV', 'issues'],
  );
  assert.deepEqual(differences.find((d) => d.field === 'bv'), { family: 'battlemechs', unitId: 'beta', path: 'meks/beta.mtf', field: 'bv', port: 999, scratch: 1000 });
  assert.deepEqual(differences.filter((d) => d.field === 'unmatched').map((d) => [d.unitId, d.scratch ?? d.port]), [['extra', 'port-only'], ['lost', 'scratch-only']]);
});

test('acceptance maps the scratch fallback and failures into the port vocabulary', () => {
  // Scratch shows BV through the displayed fallback: the port says null, so they agree.
  const fallbackPort = [capturedToRow(record('alpha', { bv: null, terms: null }))];
  assert.equal(compareToScratch(fallbackPort, [scratch('alpha', { bvStatus: 'displayed-fallback', bv: 0, terms: null })]).summary.equal, true);
  // Both sides failing is agreement on status; one side failing is a difference.
  const failedPort = capturedToRow({ ...record('alpha'), observed: null, terms: null, issues: null, error: { stage: 'open', name: 'E', message: 'm' } });
  assert.equal(compareToScratch([failedPort], [scratch('alpha', { loadStatus: 'failed', bv: null })]).summary.equal, true);
  const mismatch = compareToScratch([failedPort], [scratch('alpha')]);
  assert.deepEqual(mismatch.differences.map((d) => [d.field, d.port, d.scratch]), [['status', 'error', 'ok']]);
});

test('java terms: C1 raw-key mapping over the port rows, error rows counted not skipped', () => {
  const rows = [
    capturedToRow(record('alpha', { terms: { armorBV: 360, structureBV: 40, 'weapon.0.LA.heavy-ppc': 370 } })),
    capturedToRow(record('beta', { terms: { armorBV: 361, structureBV: 40 } })),
    capturedToRow({ ...record('gamma'), observed: null, terms: null, issues: null, error: { stage: 'open', name: 'E', message: 'm' } }),
  ];
  const javaTerms = { armorBV: 360, structureBV: 40, 'weapon.6.LA.Heavy PPC': 370 };
  const reference = new Map(ids.map((id) => [`meks/${id}.mtf`, { battleValue: { terms: javaTerms } }]));
  const { summary, unequalTerms } = javaTermReport(rows, reference);
  assert.deepEqual(
    [summary.units, summary.withTerms, summary.noTerms, summary.javaKeys, summary.equal, summary.unequal, summary.absent, summary.unitsAllJavaTermsEqual],
    [3, 2, 1, 6, 3, 1, 2, 0],
  );
  assert.deepEqual(summary.absentByCategory, { weapon: 2 });
  assert.deepEqual(unequalTerms.map((t) => [t.unitId, t.key, t.observed, t.java]), [['beta', 'armorBV', 361, 360]]);
});

test('main writes the report, exits 1 on any acceptance difference and 0 when equal', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rpbv-cmp-'));
  const write = (name, text) => {
    fs.writeFileSync(path.join(dir, name), text);
    return path.join(dir, name);
  };
  const rowsFile = write('rows.ndjson', serializeRows(portRows()));
  const same = write('same.jsonl', scratchRows().map((r) => JSON.stringify(r) + '\n').join(''));
  const off = write('off.jsonl', scratchRows({ gamma: { bv: 7 } }).map((r) => JSON.stringify(r) + '\n').join(''));
  const quiet = async (fn) => {
    const { log } = console;
    console.log = () => {};
    try {
      return await fn();
    } finally {
      console.log = log;
    }
  };
  assert.equal(await quiet(() => main(['--rows', rowsFile, '--scratch', same, '--out', path.join(dir, 'ok')])), 0);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'ok/compare-summary.json'), 'utf8')).acceptance.equal, true);
  assert.equal(await quiet(() => main(['--rows', rowsFile, '--scratch', off, '--out', path.join(dir, 'bad')])), 1);
  const lines = fs.readFileSync(path.join(dir, 'bad/compare-differences.ndjson'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.deepEqual(lines.map((d) => [d.unitId, d.field]), [['gamma', 'bv']]);
  // Java terms mode alone never fails the run: those counts are the measurement.
  const reference = { rows: ids.map((id) => ({ path: `meks/${id}.mtf`, battleValue: { terms: { armorBV: 1 } } })) };
  assert.equal(await quiet(() => main(['--rows', rowsFile, '--java-terms', '--out', path.join(dir, 'java')], { loadReference: () => reference })), 0);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'java/compare-summary.json'), 'utf8')).javaTerms.unequal, 3);
  await assert.rejects(() => main(['--rows', rowsFile, '--out', path.join(dir, 'none')]), /Required/);
});
