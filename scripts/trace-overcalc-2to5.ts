/**
 * Detailed trace of overcalculated 2-5% units to find systematic patterns.
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
const overBand = valid.filter((x: any) => x.percentDiff > 2 && x.percentDiff <= 5);

// For each overcalculated unit, calculate what the error source might be
// by computing how much each component would need to change to match reference
console.log('=== OVERCALCULATED 2-5% DETAILED TRACE ===\n');

const excessPatterns: { defExcess: number; offExcess: number; count: number } = { defExcess: 0, offExcess: 0, count: 0 };

for (const u of overBand.sort((a: any, b: any) => b.percentDiff - a.percentDiff).slice(0, 15)) {
  const b = u.breakdown;
  const defBV = b.defensiveBV || 0;
  const offBV = b.offensiveBV || 0;
  const totalBV = Math.round((defBV + offBV) * (b.cockpitModifier || 1));
  const refBV = u.indexBV;
  const excess = totalBV - refBV;

  // Estimate: if the excess were entirely in def vs off
  const defFraction = defBV / (defBV + offBV);
  const offFraction = offBV / (defBV + offBV);

  console.log(`${u.unitId}`);
  console.log(`  REF=${refBV} CALC=${u.calculatedBV} excess=${excess} (${u.percentDiff.toFixed(1)}%)`);
  console.log(`  DEF=${defBV.toFixed(0)} (${(defFraction*100).toFixed(0)}%) OFF=${offBV.toFixed(0)} (${(offFraction*100).toFixed(0)}%) cockpit=${b.cockpitModifier}`);
  console.log(`  armorBV=${b.armorBV?.toFixed(0)} struct=${b.structureBV?.toFixed(0)} gyro=${b.gyroBV?.toFixed(0)} defEq=${b.defEquipBV?.toFixed(0)} expPenalty=${b.explosivePenalty?.toFixed(0)} defFactor=${b.defensiveFactor}`);
  console.log(`  wepBV=${b.weaponBV?.toFixed(0)} ammo=${b.ammoBV} phys=${b.physicalWeaponBV?.toFixed(0)} weight=${b.weightBonus?.toFixed(0)} offEq=${b.offEquipBV?.toFixed(0)} SF=${b.speedFactor}`);
  console.log(`  HE=${b.heatEfficiency} run=${b.runMP} jump=${b.jumpMP}`);
  console.log('');

  excessPatterns.defExcess += excess * defFraction;
  excessPatterns.offExcess += excess * offFraction;
  excessPatterns.count++;
}

console.log(`\n=== AVERAGE EXCESS DISTRIBUTION ===`);
console.log(`  Defensive excess: ${(excessPatterns.defExcess / excessPatterns.count).toFixed(1)} BV`);
console.log(`  Offensive excess: ${(excessPatterns.offExcess / excessPatterns.count).toFixed(1)} BV`);

// Check: do overcalculated units have high defEquipBV?
console.log('\n=== defEquipBV in overcalculated 2-5% ===');
const defEquipValues: number[] = [];
for (const u of overBand) {
  const b = u.breakdown;
  defEquipValues.push(b.defEquipBV || 0);
}
defEquipValues.sort((a, b) => b - a);
console.log(`  Max: ${defEquipValues[0]}, Median: ${defEquipValues[Math.floor(defEquipValues.length/2)]}, Min: ${defEquipValues[defEquipValues.length-1]}`);
console.log(`  With defEquipBV > 0: ${defEquipValues.filter(v => v > 0).length}/${defEquipValues.length}`);

// Check: breakdown of exact-match units for comparison
const exactUnits = valid.filter((x: any) => x.status === 'exact');
const exactDefEquip: number[] = [];
for (const u of exactUnits.slice(0, 500)) {
  const b = u.breakdown;
  exactDefEquip.push(b.defEquipBV || 0);
}
console.log(`\n  Exact units defEquipBV: max=${Math.max(...exactDefEquip)}, median=${exactDefEquip.sort((a,b) => a-b)[Math.floor(exactDefEquip.length/2)]}`);
