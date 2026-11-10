import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  buildSnapshot,
  compareRows,
  diffScoreboards,
  renderSummary,
} from './parity-scoreboard-diff.mjs';
import { ROW_FILES } from './parity-scoreboard.mjs';

const identity = { runId: 7, attempt: 1, head: 'a'.repeat(40) };
const snapshot = (value = 3) => ({
  schemaVersion: 1,
  identity,
  pythonVersion: 'Python 3.12.13',
  families: {
    mek: {
      bv: { rows: 5, exact: value, finite: 2, missing: 1 },
      validity: { matched: value, different: 1 },
      weight: {
        matched: value,
        different: 2,
        incomplete: 1,
        'missing-local': 1,
      },
      settings: { matched: value, different: 1 },
    },
  },
  rows: { 'delta-rows.jsonl': { old: '1', changed: 'before', same: 'same' } },
});

test('row comparison counts added, removed, changed and unchanged keys', () => {
  assert.deepEqual(
    compareRows(
      { old: '1', changed: 'before', same: 'same' },
      { added: '2', changed: 'after', same: 'same' },
    ),
    { added: 1, removed: 1, changed: 1, unchanged: 1 },
  );
});

test('diff contains baseline identity, all family metrics and row changes', () => {
  const previous = snapshot(2),
    current = snapshot(3);
  current.identity = { ...identity, runId: 8, head: 'b'.repeat(40) };
  current.rows['delta-rows.jsonl'] = {
    added: '2',
    changed: 'after',
    same: 'same',
  };
  const diff = diffScoreboards(current, previous);
  assert.deepEqual(diff.baseline, identity);
  for (const key of ['bv', 'validity', 'weight', 'settings'])
    assert.equal(
      diff.families.mek[key][key === 'bv' ? 'exact' : 'matched'].delta,
      1,
    );
  assert.equal(diff.families.mek.bv.finite.current, 2);
  assert.equal(diff.families.mek.weight['missing-local'].current, 1);
  assert.deepEqual(diff.rows['delta-rows.jsonl'], {
    added: 1,
    removed: 1,
    changed: 1,
    unchanged: 1,
  });
  const summary = renderSummary(diff);
  assert.match(summary, /7/);
  assert.match(summary, /W2.*omitted/);
  assert.match(summary, /3\.12\.13/);
});

test('no baseline is explicit and does not invent zero deltas or row changes', () => {
  const diff = diffScoreboards(snapshot(), null);
  assert.equal(diff.baseline, null);
  assert.equal(diff.families.mek.bv.exact.previous, null);
  assert.equal(diff.families.mek.bv.exact.delta, null);
  assert.equal(diff.rows['delta-rows.jsonl'], null);
  assert.match(renderSummary(diff), /No previous main.*baseline/i);
});

test('families missing on one side keep their metric unavailable', () => {
  const previous = snapshot(),
    current = snapshot();
  previous.families.vehicle = previous.families.mek;
  const diff = diffScoreboards(current, previous);
  assert.equal(diff.families.vehicle.bv.exact.current, null);
  assert.equal(diff.families.vehicle.bv.exact.delta, null);
});

test('snapshot derives family finite differences and rejects duplicate row identities', (t) => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'parity-snapshot-'));
  t.after(() => fs.rmSync(out, { recursive: true, force: true }));
  fs.mkdirSync(path.join(out, 'terms'));
  const write = (file, value) =>
    fs.writeFileSync(path.join(out, file), JSON.stringify(value));
  write('RESULTS.json', {
    head: identity.head,
    bv: { families: { mek: { rows: 1, exactTotals: 0, missing: 1 } } },
    validity: { byFamily: { mek: { matched: 1 } } },
    weight: { byFamily: { mek: { missingLocal: 1 } } },
  });
  write('run-provenance.json', {
    head: identity.head,
    pythonVersion: 'Python 3.12.13',
    extraSha256: null,
  });
  write('terms/construction-quantity-report.json', {
    settings: {
      cells: [{ family: 'mek', results: [{ status: 'different' }] }],
    },
  });
  const row = {
    family: 'mek',
    path: 'meks/test.mtf',
    ours: { total: 2 },
    java: { total: 1 },
    termDifferences: [
      { term: 'offense', issues: ['different', 'missingLocal'] },
    ],
  };
  for (const file of ROW_FILES)
    fs.writeFileSync(path.join(out, 'terms', file), JSON.stringify(row) + '\n');
  const value = buildSnapshot(out, identity);
  assert.equal(value.families.mek.bv.finite, 1);
  assert.equal(value.families.mek.weight['missing-local'], 1);
  assert.equal(value.families.mek.settings.different, 1);
  assert.equal(value.compatibilityExtra, false);
  assert.throws(
    () => buildSnapshot(out, { ...identity, head: 'b'.repeat(40) }),
    /identity/,
  );
  const duplicate = path.join(out, 'terms', ROW_FILES[0]);
  fs.appendFileSync(duplicate, JSON.stringify(row) + '\n');
  assert.throws(() => buildSnapshot(out, identity), /Duplicate row identity/);
});
