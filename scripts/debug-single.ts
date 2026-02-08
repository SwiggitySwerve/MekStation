#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

// Load a specific unit and compute BV manually with debugging
const indexData = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));
const target = process.argv[2] || 'Atlas AS7-D';
const iu = indexData.units.find((u: any) => `${u.chassis} ${u.model}` === target);
if (!iu) { console.log('Not found:', target); process.exit(1); }

const ud = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', iu.path), 'utf-8'));

console.log(`=== ${iu.chassis} ${iu.model} ===`);
console.log(`Index BV: ${iu.bv}`);
console.log(`Tonnage: ${ud.tonnage}`);
console.log(`Engine: ${ud.engine.type} (${ud.engine.rating})`);
console.log(`Walk: ${ud.movement.walk}, Jump: ${ud.movement.jump}`);
console.log(`Armor type: ${ud.armor.type}`);
console.log(`Structure: ${ud.structure.type}`);
console.log(`Gyro: ${ud.gyro.type}`);
console.log(`Cockpit: ${ud.cockpit}`);
console.log(`TechBase: ${ud.techBase}`);
console.log(`HeatSinks: ${ud.heatSinks.type} x${ud.heatSinks.count}`);

// Show equipment
console.log('\nEquipment:');
for (const eq of ud.equipment || []) {
  console.log(`  ${eq.id} @ ${eq.location}`);
}

// Show crit slots
console.log('\nCritical Slots:');
for (const [loc, slots] of Object.entries(ud.criticalSlots || {})) {
  const filled = (slots as any[]).filter((s: any) => s);
  if (filled.length > 0) {
    console.log(`  ${loc}:`);
    for (const s of filled) {
      console.log(`    ${s}`);
    }
  }
}

// Total armor
let totalArmor = 0;
for (const v of Object.values(ud.armor.allocation || {})) {
  if (typeof v === 'number') totalArmor += v;
  else if (v && typeof v === 'object') totalArmor += ((v as any).front || 0) + ((v as any).rear || 0);
}
console.log(`\nTotal Armor: ${totalArmor}`);
