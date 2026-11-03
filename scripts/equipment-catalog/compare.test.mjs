import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { compareFields, sweep } from './compare.mjs';

test('detects a known difference and preserves its source evidence', () => {
  const rows = compareFields(
    { weight: 1 },
    { weight: 0.2 },
    'AmmoType.java:12382',
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].java, 0.2);
  assert.equal(rows[0].source, 'AmmoType.java:12382');
});
test('equal values and variable Java quantities are not differences', () => {
  const item = { weight: 0.2, flags: ['B', 'A'] };
  assert.deepEqual(compareFields(item, item, 'source:1'), []);
  assert.deepEqual(compareFields(item, { weight: -1 }, 'source:1'), []);
  const ancient = { introductionYear: -400 };
  assert.equal(compareFields({}, ancient, 'source:1').length, 1);
  assert.deepEqual(compareFields(item, { flags: ['A', 'B'] }, 'source:1'), []);
});
test('ambiguous and unmatched owner mappings are listed, never compared', () => {
  const registry = ['A', 'B'].map((internalName) => ({
    internalName,
    aliases: [],
  }));
  const catalog = ['shared', 'missing'].map((id) => ({ item: { id } }));
  const report = sweep({
    registry,
    catalog,
    facts: {},
    sources: {},
    units: [],
    resolveAlias: () => 'shared',
  });
  assert.equal(report.unmatched[0].reason, 'ambiguous');
  assert.equal(report.unmatched[1].reason, 'unmatched');
  assert.deepEqual(report.differences, []);
});
test('four known catalog values match pinned Java', () => {
  const root = 'public/data/equipment/official/';
  const load = (file) =>
    Object.fromEntries(
      JSON.parse(readFileSync(root + file)).items.map((item) => [
        item.id,
        item,
      ]),
    );
  const ammo = load('ammunition/gauss.json'),
    lasers = load('weapons/energy-laser.json');
  // AmmoType.java:12382/12410; laser constructors :86-87 and TechAdvancement.java:731.
  assert.equal(ammo['ammo-light-n-gauss'].weight, 0.2);
  assert.equal(ammo['ammo-medium-n-gauss'].weight, 0.4);
  assert.equal(lasers['medium-re-engineered-laser'].introductionYear, 3115);
  assert.equal(lasers['small-re-engineered-laser'].introductionYear, 3115);
});
