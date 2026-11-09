import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

const read = (file) => JSON.parse(readFileSync(file, 'utf8'));
const catalogRoot = resolve(process.cwd(), 'public/data/equipment/official');
const baseline = read(
  resolve(process.cwd(), 'scripts/equipment-catalog/baseline.json'),
);
const pin = '48fcb2f64a1b3f2d575707ce5653dad64927b587';
const java = 'megamek/src/megamek/common/equipment/AmmoType.java';
const facts = [
  ['lrm.json', 'ammo-lrm-5', 7981],
  ['lrm.json', 'ammo-lrm-10', 8017],
  ['lrm.json', 'ammo-lrm-15', 8053],
  ['lrm.json', 'ammo-lrm-20', 8089],
  ['machinegun.json', 'ammo-mg-full', 6606],
  ['machinegun.json', 'machine-gun-ammo-half', 6676],
  ['srm.json', 'ammo-srm-2', 9815],
  ['srm.json', 'ammo-srm-4', 9850],
  ['srm.json', 'ammo-srm-6', 9885],
];

for (const [file, id, line] of facts) {
  test(`${id} retains the pinned introductory rules level`, () => {
    const catalogFile = `ammunition/${file}`;
    const item = read(resolve(catalogRoot, catalogFile)).items.find(
      (entry) => entry.id === id,
    );
    assert.ok(item, `${id} must remain in ${catalogFile}`);
    assert.equal(
      item.rulesLevel,
      'INTRODUCTORY',
      `${java}:${line} at ${pin} explicitly sets SimpleTechLevel.INTRO`,
    );
    const frozen = baseline.find(
      (entry) => entry.file === catalogFile && entry.id === id,
    );
    assert.ok(frozen, `${id} must retain its existing frozen baseline row`);
    assert.equal(frozen.item.rulesLevel, 'INTRODUCTORY');
  });
}
