#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const target = process.argv[2] || 'Atlas AS8-K';
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));
const u = idx.units.find((u: any) => `${u.chassis} ${u.model}` === target);
if (!u) {
  console.log('Not found:', target);
  const partial = idx.units.filter((u: any) => `${u.chassis} ${u.model}`.includes(target)).slice(0, 5);
  for (const p of partial) console.log('  Did you mean:', p.chassis, p.model);
  process.exit(1);
}
const ud = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', u.path), 'utf-8'));
console.log(`\n=== ${u.chassis} ${u.model} ===`);
console.log('Index BV:', u.bv, ' Tech:', ud.techBase);
console.log('Tonnage:', ud.tonnage);
console.log('Engine:', ud.engine.type, ud.engine.rating);
console.log('Gyro:', ud.gyro.type);
console.log('Cockpit:', ud.cockpit || 'STANDARD');
console.log('Structure:', ud.structure.type);
console.log('Armor type:', ud.armor.type);
console.log('Movement: walk=', ud.movement.walk, 'jump=', ud.movement.jump || 0);
console.log('HeatSinks:', ud.heatSinks.type, 'x', ud.heatSinks.count);

// MUL BV
const mulPath = path.join('scripts/data-migration/mul-bv-cache.json');
if (fs.existsSync(mulPath)) {
  const mulCache = JSON.parse(fs.readFileSync(mulPath, 'utf-8'));
  const key = `${u.chassis} ${u.model}`;
  const mulEntry = mulCache[key];
  if (mulEntry) console.log('MUL BV:', mulEntry.bv, '(match:', mulEntry.matchType + ')');
}

console.log('\nEquipment:');
for (const eq of ud.equipment || []) {
  const res = resolveEquipmentBV(eq.id);
  const norm = normalizeEquipmentId(eq.id);
  console.log(`  "${eq.id}" @ ${eq.location} -> norm="${norm}" BV=${res.battleValue} Heat=${res.heat} Resolved=${res.resolved}`);
}

console.log('\nCrit slots (rear weapons):');
for (const [loc, slots] of Object.entries(ud.criticalSlots || {})) {
  for (const s of (slots as any[])) {
    if (s && typeof s === 'string' && s.includes('(R)')) {
      console.log(`  ${loc}: "${s}"`);
    }
  }
}

console.log('\nAmmo in crits:');
for (const [loc, slots] of Object.entries(ud.criticalSlots || {})) {
  for (const s of (slots as any[])) {
    if (s && typeof s === 'string' && s.toLowerCase().includes('ammo')) {
      console.log(`  ${loc}: "${s}"`);
    }
  }
}

// Armor allocation
let totalArmor = 0;
for (const [, val] of Object.entries(ud.armor.allocation)) {
  if (typeof val === 'number') totalArmor += val;
  else { const v = val as any; totalArmor += (v.front || 0) + (v.rear || 0); }
}
console.log('\nTotal armor:', totalArmor);

// Detected armor from crits
const allSlots = Object.values(ud.criticalSlots || {}).flat().filter((s): s is string => !!s && typeof s === 'string');
const allSlotsLo = allSlots.map(s => s.toLowerCase());
let detectedArmor = 'standard';
if (allSlotsLo.some(s => s.includes('ferro-lamellor'))) detectedArmor = 'ferro-lamellor';
else if (allSlotsLo.some(s => s.includes('ballistic-reinforced') || s.includes('ballistic reinforced'))) detectedArmor = 'ballistic-reinforced';
else if (allSlotsLo.some(s => (s.includes('reactive') && !s.includes('ferro')))) detectedArmor = 'reactive';
else if (allSlotsLo.some(s => (s.includes('reflective') || s.includes('laser-reflective')) && !s.includes('ferro'))) detectedArmor = 'reflective';
else if (allSlotsLo.some(s => s.includes('hardened armor') || s.includes('is hardened'))) detectedArmor = 'hardened';
console.log('Detected armor type:', detectedArmor);

// All crit slots summary
console.log('\nAll crits:');
for (const [loc, slots] of Object.entries(ud.criticalSlots || {})) {
  const filled = (slots as any[]).filter((s: any) => s && typeof s === 'string');
  if (filled.length > 0) {
    console.log(`  ${loc}: ${filled.map((s: string) => `"${s}"`).join(', ')}`);
  }
}
