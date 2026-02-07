#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const basePath = path.resolve(process.cwd(), 'public/data/units/battlemechs');
const indexData = JSON.parse(fs.readFileSync(path.join(basePath, 'index.json'), 'utf-8'));

const target = process.argv[2] || 'Shadow Hawk IIC 11';
const iu = indexData.units.find((u: any) => `${u.chassis} ${u.model}` === target);
if (!iu) { console.log('Not found:', target); process.exit(1); }

const ud = JSON.parse(fs.readFileSync(path.join(basePath, iu.path), 'utf-8'));
console.log(`=== ${iu.chassis} ${iu.model} ===`);
console.log(`Index BV: ${iu.bv}, Tech: ${ud.techBase}, Tonnage: ${ud.tonnage}`);
console.log(`Engine: ${ud.engine.type}/${ud.engine.rating}, Walk: ${ud.movement.walk}, Jump: ${ud.movement.jump}`);
console.log(`HS: ${ud.heatSinks.count} ${ud.heatSinks.type}`);
console.log(`Armor: ${ud.armor.type}`);

console.log('\nEquipment:');
console.warn = () => {};
for (const eq of ud.equipment || []) {
  const r = resolveEquipmentBV(eq.id);
  const norm = normalizeEquipmentId(eq.id);
  console.log(`  ${eq.id.padEnd(35)} @ ${eq.location.padEnd(15)} → norm=${norm.padEnd(25)} BV=${r.battleValue} heat=${r.heat} resolved=${r.resolved}`);
}

console.log('\nCrit slots (non-structural):');
for (const [loc, slots] of Object.entries(ud.criticalSlots || {})) {
  for (const slot of (slots as (string|null)[])) {
    if (!slot) continue;
    if (/endo|ferro|engine|gyro|cockpit|life support|sensors|shoulder|upper arm|lower arm|hand|hip|upper leg|lower leg|foot|actuator/i.test(slot)) continue;
    console.log(`  [${loc}] ${slot}`);
  }
}
