import * as fs from 'fs';
import * as path from 'path';
const unitsDir = 'E:/Projects/MekStation/public/data/units/battlemechs';
const idx = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf-8'));

const targetId = process.argv[2] || 'atlas-as8-k';
const u = idx.units.find((x: any) => x.id === targetId);
if (!u) { console.log('Unit not found:', targetId); process.exit(1); }

const unit = JSON.parse(fs.readFileSync(path.join(unitsDir, u.path), 'utf-8'));
console.log(`=== ${unit.name} (${unit.tonnage}t, ${unit.techBase}) ===`);
console.log('Engine:', unit.engine);
console.log('Movement:', unit.movement);
console.log('Armor type:', unit.armor.type);
console.log('Structure:', unit.structure.type);
console.log('Gyro:', unit.gyro.type);
console.log('Cockpit:', unit.cockpit);
console.log('Heat Sinks:', unit.heatSinks);
console.log('\nCritical Slots:');
for (const [loc, slots] of Object.entries(unit.criticalSlots || {})) {
  const arr = slots as (string|null)[];
  const equip = arr.filter(s => s !== null);
  if (equip.length) console.log(`  ${loc}: ${equip.join(' | ')}`);
}
