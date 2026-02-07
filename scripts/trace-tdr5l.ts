import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));
const ie = idx.units.find((e: any) => e.id === 'thunderbolt-tdr-5l');
const unit = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8'));

console.log('=== THUNDERBOLT TDR-5L ===');
console.log('Tonnage:', unit.tonnage, 'TechBase:', unit.techBase);
console.log('Engine:', unit.engine);
console.log('Armor:', unit.armor?.type, 'Structure:', unit.structure?.type);
console.log('Cockpit:', unit.cockpit, 'Gyro:', unit.gyro);
console.log('Movement:', unit.movement);
console.log('HeatSinks:', unit.heatSinks);
console.log('');

console.log('=== EQUIPMENT ===');
for (const eq of unit.equipment || []) {
  const res = resolveEquipmentBV(eq.id);
  const norm = normalizeEquipmentId(eq.id);
  console.log(`  ${eq.id} @ ${eq.location} → norm=${norm} bv=${res.battleValue} heat=${res.heat} resolved=${res.resolved}`);
}
console.log('');

console.log('=== CRITICAL SLOTS ===');
for (const [loc, slots] of Object.entries(unit.criticalSlots || {})) {
  const filtered = (slots as any[]).filter(s => s && typeof s === 'string');
  if (filtered.length > 0) console.log(`  [${loc}] ${filtered.join(', ')}`);
}
console.log('');

// Manual weapon BV calculation
console.log('=== WEAPON BV CALCULATION ===');
let totalWeaponBV = 0;
for (const eq of unit.equipment || []) {
  const lo = eq.id.toLowerCase();
  if (lo.includes('ammo') || lo.includes('targeting-computer') || lo.includes('heat-sink') ||
      lo.includes('case') || lo.includes('tsm') || lo.includes('jump-jet') ||
      lo.includes('masc') || lo.includes('ecm') || lo.includes('artemis') ||
      lo.includes('probe') || lo.includes('c3') || lo.includes('streak') && lo.includes('ammo')) continue;

  const res = resolveEquipmentBV(eq.id);
  if (!res.resolved || res.battleValue === 0) continue;
  totalWeaponBV += res.battleValue;
  console.log(`  ${eq.id}: BV=${res.battleValue} heat=${res.heat}`);
}
console.log(`Total raw weapon BV: ${totalWeaponBV}`);

// Also do similar for a few other overcalculated units
const others = ['griffin-grf-2n2', 'wyvern-wve-5nsl', 'battle-cobra-btl-c-2oc'];
for (const uid of others) {
  const ie2 = idx.units.find((e: any) => e.id === uid);
  if (!ie2?.path) continue;
  const u2 = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie2.path), 'utf8'));
  console.log(`\n=== ${uid} (${u2.tonnage}t ${u2.techBase}) ===`);
  let twbv = 0;
  for (const eq of u2.equipment || []) {
    const lo = eq.id.toLowerCase();
    if (lo.includes('ammo') || lo.includes('targeting-computer') || lo.includes('heat-sink') ||
        lo.includes('case') || lo.includes('tsm') || lo.includes('jump-jet') ||
        lo.includes('masc') || lo.includes('ecm') || lo.includes('artemis') ||
        lo.includes('probe') || lo.includes('c3') || lo.includes('streak') && lo.includes('ammo')) continue;
    const res = resolveEquipmentBV(eq.id);
    if (!res.resolved || res.battleValue === 0) continue;
    twbv += res.battleValue;
    console.log(`  ${eq.id} @ ${eq.location}: BV=${res.battleValue} heat=${res.heat}`);
  }
  console.log(`Total raw weapon BV: ${twbv}`);
}
