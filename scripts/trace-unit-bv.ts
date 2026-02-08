import * as fs from 'fs';
import * as path from 'path';

const unitId = process.argv[2] || 'koshi-a';
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));
const entry = idx.units.find((u: any) => u.id === unitId);
if (!entry) { console.log('Not found:', unitId); process.exit(1); }
const unit = JSON.parse(fs.readFileSync(path.resolve('public/data/units/battlemechs', entry.path), 'utf-8'));

console.log(`=== ${unit.chassis} ${unit.model} (${unit.id}) ===`);
console.log(`Tech Base: ${unit.techBase}`);
console.log(`Tonnage: ${unit.tonnage}`);
console.log(`Engine: ${unit.engine.type} ${unit.engine.rating}`);
console.log(`Cockpit: ${unit.cockpit}`);
console.log(`Gyro: ${unit.gyro?.type}`);

console.log(`\n--- Equipment Array ---`);
for (const eq of unit.equipment) {
  console.log(`  ${eq.id} @ ${eq.location}`);
}

console.log(`\n--- Crit Slots (non-structural) ---`);
const structural = ['shoulder','upper arm actuator','lower arm actuator','hand actuator','hip','upper leg actuator','lower leg actuator','foot actuator','fusion engine','gyro','life support','sensors','cockpit','endo steel','endo-steel','endo steel','ferro-fibrous','clan endo steel','clan ferro-fibrous','is endo steel','is ferro-fibrous','heat sink','double heat sink','cldoubleheatsinK','isdoubleheatsinK','jump jet','improved jump jet'];
for (const [loc, slots] of Object.entries(unit.criticalSlots || {})) {
  if (!Array.isArray(slots)) continue;
  for (const s of slots) {
    if (!s) continue;
    const lo = s.toLowerCase();
    if (structural.some(st => lo === st || lo.startsWith(st))) continue;
    console.log(`  ${loc}: ${s}`);
  }
}

// Check which crit items resolve via equipment resolver
import { resolveEquipmentBV } from '../src/utils/construction/equipmentBVResolver';

console.log(`\n--- Defensive Equipment Resolution ---`);
const defItems: string[] = [];
for (const [loc, slots] of Object.entries(unit.criticalSlots || {})) {
  if (!Array.isArray(slots)) continue;
  let prev: string | null = null;
  for (const s of slots) {
    if (!s) { prev = null; continue; }
    const clean = s.replace(/\s*\(omnipod\)/gi, '').trim();
    const lo = clean.toLowerCase();

    // Check defensive patterns
    const isAMS = lo.includes('anti-missile') || lo.includes('antimissile') || (lo.includes('ams') && !lo.includes('ammo'));
    const isECM = (lo.includes('ecm') || lo.includes('guardian') || lo.includes('angel') || lo.includes('watchdog')) && !lo.includes('ammo');
    const isProbe = (lo.includes('beagle') || lo.includes('bloodhound') || (lo.includes('active') && lo.includes('probe'))) && !lo.includes('ammo');
    const isShield = lo.includes('shield') && !lo.includes('blue-shield') && !lo.includes('chameleon');
    const isAPod = (lo.includes('a-pod') || lo === 'isapod' || lo === 'clapod') && !lo.includes('ammo');
    const isAPodNew = lo.includes('antipersonnel') && !lo.includes('ammo');
    const isAPDS = lo === 'isapds' || (lo.includes('risc') && lo.includes('apds')) || lo.includes('advanced point defense');

    if ((isAMS || isECM || isProbe || isShield || isAPod || isAPodNew || isAPDS) && clean !== prev) {
      const res = resolveEquipmentBV(clean);
      defItems.push(clean);
      console.log(`  ${loc}: ${clean} → resolved=${res.resolved} bv=${res.battleValue}${isAPod ? '' : isAPodNew ? ' (needs antipersonnel pattern)' : ''}`);
    }
    prev = clean;
  }
}

console.log(`\n--- AMS Ammo ---`);
for (const [loc, slots] of Object.entries(unit.criticalSlots || {})) {
  if (!Array.isArray(slots)) continue;
  for (const s of slots) {
    if (!s) continue;
    const lo = s.toLowerCase();
    if (lo.includes('ammo') && (lo.includes('ams') || lo.includes('anti-missile') || lo.includes('apds'))) {
      console.log(`  ${loc}: ${s}`);
    }
  }
}
