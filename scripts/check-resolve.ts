#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';

const target = process.argv[2] || 'Ryoken III Prime';
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));
const u = idx.units.find((u: any) => `${u.chassis} ${u.model}` === target);
if (!u) {
  console.log('Not found:', target);
  process.exit(1);
}
const ud = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', u.path), 'utf-8'));
console.log(`\n=== ${u.chassis} ${u.model} ===`);
console.log('Index BV:', u.bv, ' MUL BV:', '(check cache)');
console.log('TechBase:', ud.techBase);
console.log('Tonnage:', ud.tonnage);
console.log('Engine:', ud.engine?.type, ud.engine?.rating);
console.log('Gyro:', ud.gyro?.type);
console.log('Cockpit:', ud.cockpit);
console.log('Structure:', ud.structure?.type);
console.log('Armor:', ud.armor?.type);
console.log('Movement: walk=', ud.movement?.walk, 'jump=', ud.movement?.jump);
console.log('HeatSinks:', ud.heatSinks?.type, ud.heatSinks?.count);
console.log('\nEquipment:');
for (const eq of ud.equipment || []) console.log(`  "${eq.id}" @ ${eq.location}`);
console.log('\nAll crit slots:');
for (const [loc, slots] of Object.entries(ud.criticalSlots || {})) {
  const filled = (slots as any[]).filter((s: any) => s && typeof s === 'string');
  if (filled.length > 0) {
    console.log(`  ${loc}:`);
    for (const s of filled) console.log(`    "${s}"`);
  }
}
