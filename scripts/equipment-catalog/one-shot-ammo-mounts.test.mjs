import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { generate, writeOrCheck } from './one-shot-ammo-mounts.mjs';

const revision = '48fcb2f64a1b3f2d575707ce5653dad64927b587';
const row = (name, count) => ({
  name,
  internalName: name,
  aliases: [],
  tech: 'CLAN',
  directFire: false,
  artemis: false,
  riscLaser: false,
  apollo: false,
  infantry: false,
  oneShotAmmoMounts: count,
});

test('native insertion facts remain separate and deterministic', () => {
  const facts = {
    revision,
    weapons: {
      Single: row('Single', 1),
      Double: row('Double', 2),
      Dry: row('Dry', 0),
    },
  };
  const catalog = Object.keys(facts.weapons).map((name) => ({
    id: name.toLowerCase(),
    name,
    subType: name,
    techBase: 'CLAN',
  }));
  const source = generate(facts, catalog);
  assert.equal(generate(facts, catalog), source);
  assert.match(source, /"double": 2/);
  assert.match(source, /"single": 1/);
  assert.doesNotMatch(source, /"dry":/);
  assert.doesNotMatch(source, /infantryCanonical|hasNativeWeaponBVFlag/);
  delete facts.weapons.Double.oneShotAmmoMounts;
  assert.throws(() => generate(facts, catalog), /Regenerate pinned facts/);
});

test('check mode detects stale output without writing it', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'one-shot-ammo-'));
  const file = path.join(dir, 'facts.ts');
  try {
    writeOrCheck(file, 'exact\n', false);
    writeOrCheck(file, 'exact\n', true);
    assert.throws(() => writeOrCheck(file, 'stale\n', true), /stale/);
    assert.equal(fs.readFileSync(file, 'utf8'), 'exact\n');
    writeOrCheck(file, 'exact\r\n', false);
    assert.throws(() => writeOrCheck(file, 'exact\n', true), /stale/);
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});
