/**
 * Deep trace of the biggest overcalculated units (5%+) to find fixable bugs.
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
const big = valid.filter((x: any) => x.percentDiff > 5).sort((a: any, b: any) => b.percentDiff - a.percentDiff);

console.log(`=== OVERCALCULATED 5%+ (${big.length} units) ===\n`);

for (const u of big) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const b = u.breakdown;
  const cockpit = b.cockpitModifier ?? 1;
  const refBase = u.indexBV / cockpit;
  const excess = (b.defensiveBV + b.offensiveBV) - refBase;

  // Check for patterns
  const hasTSM = unit.criticalSlots && Object.values(unit.criticalSlots).some((slots: any) =>
    Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' &&
      (s.toLowerCase() === 'tsm' || s.toLowerCase().includes('triple strength'))));
  const hasMASC = unit.criticalSlots && Object.values(unit.criticalSlots).some((slots: any) =>
    Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' && s.toLowerCase().includes('masc')));

  console.log(`${u.unitId.padEnd(42)} +${u.percentDiff.toFixed(1)}% diff=${u.difference} excess=${excess.toFixed(0)} cockpit=${cockpit}`);
  console.log(`  DEF: armor=${b.armorBV?.toFixed(0)} struct=${b.structureBV?.toFixed(0)} gyro=${b.gyroBV?.toFixed(0)} defEq=${b.defEquipBV} expPen=${b.explosivePenalty} DF=${b.defensiveFactor} → ${b.defensiveBV?.toFixed(0)}`);
  console.log(`  OFF: weap=${b.weaponBV?.toFixed(0)} ammo=${b.ammoBV} wt=${b.weightBonus?.toFixed(0)} phys=${b.physicalWeaponBV?.toFixed(0)} offEq=${b.offEquipBV} SF=${b.speedFactor} HE=${b.heatEfficiency} halved=${b.halvedWeaponCount}/${b.weaponCount} → ${b.offensiveBV?.toFixed(0)}`);
  console.log(`  move: run=${b.runMP} jump=${b.jumpMP || 0} TMM=${b.maxTMM} eng=${unit.engine?.type} tech=${unit.techBase} tonnage=${unit.tonnage} tsm=${hasTSM} masc=${hasMASC}`);
  console.log(`  cockpit=${unit.cockpit || 'standard'} structure=${unit.structure?.type || 'standard'} armor=${unit.armor?.type || 'standard'}`);
  console.log('');
}

// Also check overcalculated 2-5%
const over2to5 = valid.filter((x: any) => x.percentDiff > 2 && x.percentDiff <= 5);
console.log(`\n=== OVERCALCULATED 2-5% (${over2to5.length} units) ===\n`);

for (const u of over2to5.sort((a: any, b: any) => b.percentDiff - a.percentDiff).slice(0, 20)) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const b = u.breakdown;
  const cockpit = b.cockpitModifier ?? 1;
  const refBase = u.indexBV / cockpit;
  const excess = (b.defensiveBV + b.offensiveBV) - refBase;

  const hasTSM = unit.criticalSlots && Object.values(unit.criticalSlots).some((slots: any) =>
    Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' &&
      (s.toLowerCase() === 'tsm' || s.toLowerCase().includes('triple strength'))));

  console.log(`${u.unitId.padEnd(42)} +${u.percentDiff.toFixed(1)}% diff=${u.difference} excess=${excess.toFixed(0)} cockpit=${cockpit}`);
  console.log(`  DEF: armor=${b.armorBV?.toFixed(0)} struct=${b.structureBV?.toFixed(0)} gyro=${b.gyroBV?.toFixed(0)} defEq=${b.defEquipBV} expPen=${b.explosivePenalty} DF=${b.defensiveFactor} → ${b.defensiveBV?.toFixed(0)}`);
  console.log(`  OFF: weap=${b.weaponBV?.toFixed(0)} ammo=${b.ammoBV} wt=${b.weightBonus?.toFixed(0)} phys=${b.physicalWeaponBV?.toFixed(0)} offEq=${b.offEquipBV} SF=${b.speedFactor} HE=${b.heatEfficiency} halved=${b.halvedWeaponCount}/${b.weaponCount} → ${b.offensiveBV?.toFixed(0)}`);
  console.log(`  move: run=${b.runMP} jump=${b.jumpMP || 0} TMM=${b.maxTMM} eng=${unit.engine?.type} tsm=${hasTSM} tonnage=${unit.tonnage}`);
  console.log('');
}
