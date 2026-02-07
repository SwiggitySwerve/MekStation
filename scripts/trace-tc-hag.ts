import * as fs from 'fs';
import * as path from 'path';
const r = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

// Check if Osteon-D has TC in crits or equipment
const unitIds = ['osteon-d', 'osteon-c', 'osteon-a', 'mad-cat-u', 'loki-mk-ii-a', 'cougar-t'];
for (const uid of unitIds) {
  const ie = idx.units.find((e: any) => e.id === uid);
  if (!ie?.path) continue;
  const d = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8'));

  // Check equipment array for TC
  const equipTC = d.equipment.filter((e: any) => e.id.toLowerCase().includes('targeting'));

  // Check crit slots for TC
  const critTC: string[] = [];
  for (const [loc, slots] of Object.entries(d.criticalSlots || {})) {
    for (const s of (slots as string[])) {
      if (s && s.toLowerCase().includes('targeting')) {
        critTC.push(`${loc}:${s}`);
      }
    }
  }

  // Check for HAG weapons
  const equipHAG = d.equipment.filter((e: any) => e.id.toLowerCase().includes('hag'));
  const critHAG: string[] = [];
  for (const [loc, slots] of Object.entries(d.criticalSlots || {})) {
    for (const s of (slots as string[])) {
      if (s && s.toLowerCase().includes('hag')) {
        critHAG.push(`${loc}:${s}`);
      }
    }
  }

  console.log(`\n=== ${uid} (${d.tonnage}t ${d.techBase}) ===`);
  console.log(`  Equip TC: ${equipTC.length > 0 ? equipTC.map((e: any) => e.id).join(', ') : 'NONE'}`);
  console.log(`  Crit TC: ${critTC.length > 0 ? critTC.join(', ') : 'NONE'}`);
  console.log(`  Equip HAG: ${equipHAG.length > 0 ? equipHAG.map((e: any) => `${e.id}@${e.location}`).join(', ') : 'NONE'}`);
  console.log(`  Crit HAG: ${critHAG.length > 0 ? critHAG.join(', ') : 'NONE'}`);
  console.log(`  All equip: ${d.equipment.map((e: any) => e.id).join(', ')}`);

  // Check BV result
  const res = r.allResults.find((x: any) => x.unitId === uid);
  if (res) {
    console.log(`  BV: calc=${res.calculatedBV} diff=${res.difference} (${res.percentDiff?.toFixed(1)}%)`);
    if (res.issues?.length) console.log(`  Issues: ${res.issues.join('; ')}`);
  }
}

// Now trace overcalculated patterns (no ammo, no penalty)
console.log('\n\n=== OVERCALCULATED (no ammo, no penalty) PATTERNS ===');
const minor = r.allResults.filter((x: any) =>
  x.percentDiff > 1 && x.percentDiff <= 5 && x.breakdown && x.breakdown.explosivePenalty === 0
);
const overNoAmmo = minor.filter((u: any) => u.breakdown.ammoBV === 0);
console.log(`Total: ${overNoAmmo.length}`);

// Check what equipment these have in common
const overEquipCounts: Record<string, number> = {};
const overCritEquip: Record<string, number> = {};
for (const u of overNoAmmo) {
  const ie = idx.units.find((e: any) => e.id === u.unitId);
  if (!ie?.path) continue;
  try {
    const d = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8'));
    for (const eq of d.equipment) {
      overEquipCounts[eq.id.toLowerCase()] = (overEquipCounts[eq.id.toLowerCase()] || 0) + 1;
    }
    for (const [loc, slots] of Object.entries(d.criticalSlots || {})) {
      for (const s of (slots as string[])) {
        if (!s) continue;
        const sLo = s.toLowerCase();
        if (['endosteel','ferrofibrous','engine','gyro','life support','sensor','cockpit',
             'shoulder','upper arm','lower arm','hand','hip','upper leg','lower leg','foot',
             'endo steel','ferro fibrous','double heat sink','jump jet','improved jump jet',
             'heat sink','isdoubleheatsink','cldoubleheatsink'].some(sk => sLo.includes(sk))) continue;
        overCritEquip[sLo] = (overCritEquip[sLo] || 0) + 1;
      }
    }
  } catch {}
}
const overSorted = Object.entries(overCritEquip).sort((a, b) => b[1] - a[1]).filter(([_, c]) => c >= 3);
console.log('Crit equipment (≥3):');
for (const [eid, count] of overSorted.slice(0, 15)) {
  console.log(`  ${eid}: ${count}`);
}
