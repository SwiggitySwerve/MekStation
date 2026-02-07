/**
 * Trace PPC Capacitor outlier units — check weapon name matching and BV values.
 */
import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null && x.breakdown);

// PPC Capacitor outlier IDs
const ppcCapIds = [
  'great-turtle-gtr-2', 'galahad-glh-3d-laodices', 'minsk-2',
  'vandal-li-oa', 'scorpion-c', 'gladiator-gld-9sf', 'goliath-gol-7k',
  'anzu-zu-g60', 'blackjack-bj2-ox', 'wolfhound-wlf-2x', 'gladiator-gld-1r-keller'
];

for (const unitId of ppcCapIds) {
  const r = valid.find((x: any) => x.unitId === unitId);
  const unit = loadUnit(unitId);
  if (!r || !unit) { console.log(`${unitId}: NOT FOUND`); continue; }
  const b = r.breakdown;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`${unitId} — ref=${r.indexBV} calc=${r.calculatedBV} diff=${r.difference} (${r.percentDiff?.toFixed(1)}%)`);
  console.log(`  ${unit.tonnage}t ${unit.techBase} walk=${unit.movement?.walk} jump=${unit.movement?.jump||0}`);

  // Count PPC capacitors in crits
  let capCount = 0;
  for (const [loc, slots] of Object.entries(unit.criticalSlots || {})) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      if (typeof s === 'string' && s.toLowerCase().includes('ppc capacitor')) capCount++;
    }
  }

  // Show PPC weapons in equipment
  const ppcEquip = (unit.equipment || []).filter((e: any) => e.id.toLowerCase().includes('ppc'));
  console.log(`  PPC Capacitor crits: ${capCount}`);
  console.log(`  PPC Equipment: ${ppcEquip.map((e: any) => `${e.id}@${e.location}`).join(', ')}`);

  // Show weapon breakdown
  if (b?.weapons?.length) {
    console.log('  --- Weapons ---');
    for (const w of b.weapons) {
      const isPPC = (w.name || w.id || '').toLowerCase().includes('ppc');
      console.log(`    ${(w.name||w.id).padEnd(35)} h=${String(w.heat).padStart(2)} bv=${String(w.bv).padStart(4)}${isPPC ? ' ← PPC' : ''}${w.rear?' (R)':''}`);
    }
  }

  // BV components
  console.log(`  DEF: armor=${b?.armorBV?.toFixed(0)} struct=${b?.structureBV?.toFixed(0)} gyro=${b?.gyroBV?.toFixed(0)} exp=${b?.explosivePenalty?.toFixed(0)} DF=${b?.defensiveFactor} → ${b?.defensiveBV?.toFixed(0)}`);
  console.log(`  OFF: wBV=${b?.weaponBV?.toFixed(0)} ammo=${b?.ammoBV} phys=${b?.physicalWeaponBV?.toFixed(0)} wt=${b?.weightBonus?.toFixed(0)} HE=${b?.heatEfficiency} SF=${b?.speedFactor} → ${b?.offensiveBV?.toFixed(0)}`);
  console.log(`  cockpit=${b?.cockpitModifier}`);

  // Show PPC-related crit slots
  console.log('  --- PPC-related crits ---');
  for (const [loc, slots] of Object.entries(unit.criticalSlots || {})) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      if (typeof s !== 'string') continue;
      const lo = s.toLowerCase();
      if (lo.includes('ppc') || lo.includes('capacitor')) {
        console.log(`    ${loc}: "${s}"`);
      }
    }
  }
}
