/**
 * Trace Cephalus variants to find why weapons aren't resolving.
 */
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

const cephalusIds = [
  'cephalus-prime', 'cephalus-a', 'cephalus-b', 'cephalus-c', 'cephalus-d', 'cephalus-e', 'cephalus-u'
];

for (const uid of cephalusIds) {
  const unit = loadUnit(uid);
  if (!unit) { console.log(`${uid}: NOT FOUND`); continue; }

  console.log(`\n=== ${uid} (${unit.tonnage}t ${unit.techBase}) ===`);
  console.log('Engine:', unit.engine);
  console.log('Movement:', unit.movement);
  console.log('HeatSinks:', unit.heatSinks);

  console.log('Equipment:');
  for (const eq of (unit.equipment || [])) {
    const res = resolveEquipmentBV(eq.id);
    const norm = normalizeEquipmentId(eq.id);
    console.log(`  ${eq.id} @ ${eq.location}: bv=${res.battleValue} heat=${res.heat} resolved=${res.resolved} norm=${norm}`);
  }

  console.log('Critical Slots:');
  for (const [loc, slots] of Object.entries(unit.criticalSlots || {})) {
    const filtered = (slots as any[]).filter(s => s && typeof s === 'string');
    if (filtered.length > 0) console.log(`  [${loc}] ${filtered.join(', ')}`);
  }
}

// Also trace Koshi, Barghest, Osteon
console.log('\n\n=== KOSHI A ===');
const koshi = loadUnit('koshi-a');
if (koshi) {
  console.log(`${koshi.tonnage}t ${koshi.techBase} engine=${JSON.stringify(koshi.engine)} movement=${JSON.stringify(koshi.movement)}`);
  for (const eq of (koshi.equipment || [])) {
    const res = resolveEquipmentBV(eq.id);
    console.log(`  ${eq.id} @ ${eq.location}: bv=${res.battleValue} heat=${res.heat} resolved=${res.resolved}`);
  }
}

console.log('\n=== BARGHEST BGS-3T ===');
const barghest = loadUnit('barghest-bgs-3t');
if (barghest) {
  console.log(`${barghest.tonnage}t ${barghest.techBase} engine=${JSON.stringify(barghest.engine)} movement=${JSON.stringify(barghest.movement)}`);
  for (const eq of (barghest.equipment || [])) {
    const res = resolveEquipmentBV(eq.id);
    console.log(`  ${eq.id} @ ${eq.location}: bv=${res.battleValue} heat=${res.heat} resolved=${res.resolved}`);
  }
  // Show crits for ammo
  for (const [loc, slots] of Object.entries(barghest.criticalSlots || {})) {
    if (!Array.isArray(slots)) continue;
    const ammo = (slots as string[]).filter(s => s && s.toLowerCase().includes('ammo'));
    if (ammo.length > 0) console.log(`  [${loc}] AMMO: ${ammo.join(', ')}`);
  }
}

console.log('\n=== OSTEON U ===');
const osteon = loadUnit('osteon-u');
if (osteon) {
  console.log(`${osteon.tonnage}t ${osteon.techBase} engine=${JSON.stringify(osteon.engine)} movement=${JSON.stringify(osteon.movement)}`);
  for (const eq of (osteon.equipment || [])) {
    const res = resolveEquipmentBV(eq.id);
    console.log(`  ${eq.id} @ ${eq.location}: bv=${res.battleValue} heat=${res.heat} resolved=${res.resolved}`);
  }
}
