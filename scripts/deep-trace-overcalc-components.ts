/**
 * Deep-trace component-by-component BV for the worst overcalculated units.
 * Goal: find which BV component is inflated relative to reference.
 */
import * as fs from 'fs';
import * as path from 'path';
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null && x.breakdown);
const big = valid.filter((x: any) => x.percentDiff > 5).sort((a: any, b: any) => b.percentDiff - a.percentDiff);

console.log(`=== OVERCALCULATED 5%+ (${big.length} units) ===\n`);

// For each unit, compute expected components
for (const u of big.slice(0, 20)) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const b = u.breakdown;
  const cockpit = b.cockpitModifier ?? 1;

  // What offBV should be if defBV is correct
  const expectedOff = (u.indexBV / cockpit) - b.defensiveBV;
  const offExcess = b.offensiveBV - expectedOff;
  // What defBV should be if offBV is correct
  const expectedDef = (u.indexBV / cockpit) - b.offensiveBV;
  const defExcess = b.defensiveBV - expectedDef;

  console.log(`${u.unitId} ref=${u.indexBV} calc=${u.calculatedBV} diff=${u.difference} (+${u.percentDiff.toFixed(1)}%)`);
  console.log(`  DEF=${b.defensiveBV?.toFixed(0)} (expectedDef=${expectedDef.toFixed(0)} excess=${defExcess.toFixed(0)})`);
  console.log(`    armor=${b.armorBV?.toFixed(1)} struct=${b.structureBV?.toFixed(1)} gyro=${b.gyroBV?.toFixed(1)} defEq=${b.defEquipBV} expPen=${b.explosivePenalty} DF=${b.defensiveFactor}`);
  console.log(`  OFF=${b.offensiveBV?.toFixed(0)} (expectedOff=${expectedOff.toFixed(0)} excess=${offExcess.toFixed(0)})`);
  console.log(`    weap=${b.weaponBV?.toFixed(1)} ammo=${b.ammoBV} wt=${b.weightBonus?.toFixed(1)} phys=${b.physicalWeaponBV?.toFixed(1)} offEq=${b.offEquipBV} SF=${b.speedFactor} HE=${b.heatEfficiency} halved=${b.halvedWeaponCount}/${b.weaponCount}`);
  console.log(`    run=${b.runMP} jump=${b.jumpMP||0} walk=${b.walkMP||unit.movement?.walk} eng=${unit.engine?.type} tech=${unit.techBase}`);

  // List weapons and their BV
  console.log('  WEAPONS:');
  for (const eq of (unit.equipment || [])) {
    const lo = eq.id.toLowerCase();
    if (lo.includes('ammo') || lo.includes('heat-sink') || lo.includes('case') ||
        lo.includes('tsm') || lo.includes('jump-jet') || lo.includes('masc') ||
        lo.includes('targeting-computer')) continue;
    const res = resolveEquipmentBV(eq.id);
    if (!res.resolved && res.battleValue === 0) continue;
    console.log(`    ${eq.id} @ ${eq.location}: bv=${res.battleValue} heat=${res.heat}`);
  }
  console.log('');
}

// Summary: how many have offense excess vs defense excess?
console.log('\n=== EXCESS SOURCE ANALYSIS ===');
let offHigher = 0, defHigher = 0, both = 0;
for (const u of big) {
  const b = u.breakdown;
  const cockpit = b.cockpitModifier ?? 1;
  const total = u.indexBV / cockpit;
  const offFrac = b.offensiveBV / (b.defensiveBV + b.offensiveBV);
  const defFrac = b.defensiveBV / (b.defensiveBV + b.offensiveBV);
  const offExcess = b.offensiveBV - (total * offFrac);
  const defExcess = b.defensiveBV - (total * defFrac);
  // The excess is proportional. Just check total excess.
  const totalExcess = (b.defensiveBV + b.offensiveBV) - total;
  console.log(`  ${u.unitId.padEnd(42)} totalExcess=${totalExcess.toFixed(0)} off=${b.offensiveBV?.toFixed(0)} def=${b.defensiveBV?.toFixed(0)} offFrac=${(offFrac*100).toFixed(0)}%`);
}
