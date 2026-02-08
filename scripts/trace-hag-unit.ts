/**
 * Trace a HAG unit's weapon breakdown.
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

const units = ['amarok-3', 'boreas-a', 'thunder-stallion-3', 'marauder-iic-4', 'rifleman-iic-6'];
for (const unitId of units) {
  const r = report.allResults.find((x: any) => x.unitId === unitId);
  const unit = loadUnit(unitId);
  if (!r || !unit) { console.log(`${unitId}: not found`); continue; }
  const b = r.breakdown;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`${unitId} — ref=${r.indexBV} calc=${r.calculatedBV} diff=${r.difference} (${r.percentDiff?.toFixed(1)}%)`);
  console.log(`  ${unit.tonnage}t ${unit.techBase} walk=${unit.movement?.walk} jump=${unit.movement?.jump||0}`);

  // All weapons from breakdown
  if (b?.weapons?.length) {
    console.log('  --- Weapons ---');
    for (const w of b.weapons) {
      console.log(`    ${(w.name||w.id).padEnd(35)} h=${String(w.heat).padStart(2)} bv=${String(w.bv).padStart(4)}${w.rear?' (R)':''}`);
    }
  }

  // Ammo
  if (b?.ammo?.length) {
    console.log(`  --- Ammo --- total=${b.ammoBV}`);
  }

  // BV components
  console.log(`  DEF: armor=${b?.armorBV?.toFixed(0)} struct=${b?.structureBV?.toFixed(0)} gyro=${b?.gyroBV?.toFixed(0)} defEq=${b?.defEquipBV?.toFixed(0)} exp=${b?.explosivePenalty?.toFixed(0)} DF=${b?.defensiveFactor} → ${b?.defensiveBV?.toFixed(0)}`);
  console.log(`  OFF: wBV=${b?.weaponBV?.toFixed(0)} raw=${b?.rawWeaponBV?.toFixed(0)} halved=${b?.halvedWeaponBV?.toFixed(0)} ammo=${b?.ammoBV} phys=${b?.physicalWeaponBV?.toFixed(0)} wt=${b?.weightBonus?.toFixed(0)} offEq=${b?.offEquipBV?.toFixed(0)} HE=${b?.heatEfficiency} SF=${b?.speedFactor} → ${b?.offensiveBV?.toFixed(0)}`);
  console.log(`  cockpit=${b?.cockpitModifier}`);

  // Crit slots with HAG or hag
  console.log('  --- HAG crits ---');
  for (const [loc, slots] of Object.entries(unit.criticalSlots || {})) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      if (typeof s !== 'string') continue;
      if (s.toLowerCase().includes('hag')) {
        console.log(`    ${loc}: "${s}"`);
      }
    }
  }

  // Equipment entries
  console.log('  --- Equipment ---');
  for (const eq of (unit.equipment || [])) {
    console.log(`    id="${eq.id}" loc="${eq.location}"`);
  }
}
