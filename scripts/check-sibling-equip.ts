import * as fs from 'fs';

const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json','utf8'));
const targets = ['vulture-b', 'vulture-prime', 'gladiator-f', 'gladiator-a', 'jenner-jr10-x', 'jenner-jr7-d-webster'];
for (const id of targets) {
  const e = idx.units.find((u: any) => u.id === id);
  if (!e) { console.log(id + ': NOT FOUND'); continue; }
  const d = JSON.parse(fs.readFileSync('public/data/units/battlemechs/' + e.path, 'utf8'));
  console.log(`${id} [mulBV=${e.mulBV} bv=${e.bv}]:`);
  console.log(`  equip: ${JSON.stringify(d.equipment)}`);
  console.log(`  hs: ${JSON.stringify(d.heatSinks)}`);
  console.log();
}
