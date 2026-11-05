import assert from 'node:assert/strict';
import { test } from 'node:test';

import { generate } from './weapon-bv-flags.mjs';

const revision = '48fcb2f64a1b3f2d575707ce5653dad64927b587';
const row = (infantry) => ({
  name: 'Shared name',
  internalName: infantry ? 'InfantryMG' : 'BAMG',
  aliases: ['Shared name'],
  tech: 'INNER_SPHERE',
  directFire: true,
  artemis: true,
  riscLaser: true,
  apollo: true,
  infantry,
});
test('inherited infantry bit stays separate from the four existing bits', () => {
  const input = {
    revision,
    weapons: { InfantryMG: row(true), BAMG: row(false) },
  };
  const catalog = ['InfantryMG', 'BAMG'].map((subType, i) => ({
    id: i ? 'ba' : 'infantry',
    name: 'Shared name',
    techBase: 'BOTH',
    subType,
  }));
  const a = generate(input, catalog),
    b = generate(input, catalog);
  assert.equal(a.source, b.source);
  assert.match(a.source, /ba:15 infantry:15/);
  assert.match(a.source, /bamg:0 infantrymg:16/);
  assert.doesNotMatch(a.source.split('const infantryNative')[1], /sharedname:/);
});
test('old flag envelopes fail instead of silently dropping infantry facts', () => {
  const old = row(true);
  delete old.infantry;
  assert.throws(
    () => generate({ revision, weapons: { Old: old } }, []),
    /Regenerate pinned facts/,
  );
});
