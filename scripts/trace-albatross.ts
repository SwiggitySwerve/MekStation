#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));

const target = 'Albatross ALB-5W';
const iu = idx.units.find((u: any) => `${u.chassis} ${u.model}` === target);
const fp = path.resolve('public/data/units/battlemechs', iu.path);
const ud = JSON.parse(fs.readFileSync(fp, 'utf-8'));

console.log(`=== ${target} ===`);
console.log(`Tonnage: ${ud.tonnage}, Tech: ${ud.techBase}`);
console.log(`Engine: ${ud.engine.type} ${ud.engine.rating}`);
console.log(`Move: Walk=${ud.movement.walk} Jump=${ud.movement.jump || 0}`);
console.log(`HS: ${ud.heatSinks.count} ${ud.heatSinks.type}`);

console.log('\nEquipment:');
for (const eq of ud.equipment) {
  const res = resolveEquipmentBV(eq.id);
  console.log(`  ${eq.id.padEnd(30)} loc=${eq.location.padEnd(15)} BV=${res.battleValue} heat=${res.heat} resolved=${res.resolved}`);
}

console.log('\nCritical Slots:');
if (ud.criticalSlots) {
  for (const [loc, slots] of Object.entries(ud.criticalSlots)) {
    const filled = (slots as any[]).filter(s => s !== null && s !== '');
    if (filled.length > 0) console.log(`  ${loc}: ${filled.join(', ')}`);
  }
}

// Check for TSM, PPC Cap, ECM from crits
const critItems: string[] = [];
if (ud.criticalSlots) {
  for (const slots of Object.values(ud.criticalSlots)) {
    if (Array.isArray(slots)) for (const s of slots) if (s && typeof s === 'string') critItems.push(s);
  }
}

const hasTSM = critItems.some(s => s.toLowerCase().includes('tsm') || s.toLowerCase().includes('triple strength'));
const hasPPCCap = critItems.some(s => s.toLowerCase().includes('ppc capacitor'));
const hasECM = critItems.some(s => s.toLowerCase().includes('guardian') || s.toLowerCase().includes('ecm'));
const hasBloodhound = critItems.some(s => s.toLowerCase().includes('bloodhound'));

console.log(`\nCrit detection: TSM=${hasTSM}, PPC_Cap=${hasPPCCap}, ECM=${hasECM}, Bloodhound=${hasBloodhound}`);

// Manual BV calc
console.log('\nManual weapon BV:');
let totalWeapBV = 0;
for (const eq of ud.equipment) {
  const res = resolveEquipmentBV(eq.id);
  if (res.resolved && res.battleValue > 0) {
    totalWeapBV += res.battleValue;
  }
}
console.log(`  Sum of equipment weapon BV: ${totalWeapBV}`);

// If PPC Cap is present, it should add BV to the PPC
if (hasPPCCap) {
  console.log('  PPC Cap detected: should add ~114 BV to ER PPC (+5 heat)');
  totalWeapBV += 114;
  console.log(`  Adjusted weapon BV: ${totalWeapBV}`);
}

// Weight bonus with TSM
const weightBonus = hasTSM ? ud.tonnage * 1.5 : ud.tonnage;
console.log(`  Weight bonus: ${weightBonus} (TSM=${hasTSM})`);

// Defensive equipment BV
const defEquipBV = hasECM ? 61 : 0;
console.log(`  Def equipment BV: ${defEquipBV}`);
