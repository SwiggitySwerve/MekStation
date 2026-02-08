#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

const basePath = path.resolve(process.cwd(), 'public/data/units/battlemechs');
const indexData = JSON.parse(fs.readFileSync(path.resolve(basePath, 'index.json'), 'utf-8'));

const targetName = process.argv[2] || 'Albatross ALB-5U';
const iu = indexData.units.find((u: any) => `${u.chassis} ${u.model}` === targetName);
if (!iu) { console.log(`Unit not found: ${targetName}`); process.exit(1); }

const unitPath = path.join(basePath, iu.path);
const ud = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));

console.log(`=== ${iu.chassis} ${iu.model} ===`);
console.log(`Index BV: ${iu.bv}`);
console.log(`Tonnage: ${ud.tonnage}, TechBase: ${ud.techBase}`);
console.log(`Engine: ${ud.engine.type} ${ud.engine.rating}`);
console.log(`Cockpit: ${ud.cockpit}`);
console.log(`Gyro: ${ud.gyro.type}`);
console.log(`Structure: ${ud.structure.type}`);
console.log(`Armor: ${ud.armor.type}`);
console.log(`HeatSinks: ${ud.heatSinks.type} x${ud.heatSinks.count}`);
console.log(`Movement: walk=${ud.movement.walk} jump=${ud.movement.jump || 0}`);

console.log(`\nEquipment:`);
for (const eq of ud.equipment || []) {
  console.log(`  ${eq.id} @ ${eq.location}`);
}

console.log(`\nCritical Slots:`);
for (const [loc, slots] of Object.entries(ud.criticalSlots || {})) {
  const items = (slots as any[]).filter((s: any) => s && typeof s === 'string');
  if (items.length > 0) {
    console.log(`  ${loc}: ${items.join(', ')}`);
  }
}

console.log(`\nArmor Allocation:`);
let totalArmor = 0;
for (const [loc, val] of Object.entries(ud.armor.allocation)) {
  if (typeof val === 'number') { console.log(`  ${loc}: ${val}`); totalArmor += val; }
  else if (val && typeof val === 'object') { 
    const v = val as { front: number; rear: number };
    console.log(`  ${loc}: front=${v.front} rear=${v.rear}`); 
    totalArmor += v.front + v.rear; 
  }
}
console.log(`  Total: ${totalArmor}`);
