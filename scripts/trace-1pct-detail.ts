/**
 * Detailed trace of 1-2% band units to find the actual BV components causing the gap.
 * For each unit, show the exact BV components and what they'd need to be.
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

// Check overcalculated 1-2% first: what's the consistent excess?
const over1to2 = valid.filter((x: any) => x.percentDiff > 1 && x.percentDiff <= 2);
console.log(`=== OVERCALCULATED 1-2% (${over1to2.length} units) ===\n`);

// Track excess patterns
let totalOverExcess = 0;
let defExcessArr: number[] = [];
let offExcessArr: number[] = [];

for (const u of over1to2) {
  const b = u.breakdown;
  const cockpit = b.cockpitModifier ?? 1;
  const refBase = u.indexBV / cockpit;
  const excess = (b.defensiveBV + b.offensiveBV) - refBase;

  // Try to identify if the excess is in defense or offense
  // Assume both contribute proportionally
  const defFrac = b.defensiveBV / (b.defensiveBV + b.offensiveBV);
  const defExcess = excess * defFrac;
  const offExcess = excess * (1 - defFrac);

  totalOverExcess += excess;
  defExcessArr.push(defExcess);
  offExcessArr.push(offExcess);
}

const avgOverExcess = totalOverExcess / over1to2.length;
console.log(`Average total excess: ${avgOverExcess.toFixed(1)} BV`);
console.log(`Average def excess: ${(defExcessArr.reduce((a, b) => a + b, 0) / defExcessArr.length).toFixed(1)} BV`);
console.log(`Average off excess: ${(offExcessArr.reduce((a, b) => a + b, 0) / offExcessArr.length).toFixed(1)} BV`);

// Detailed breakdown of first 15 overcalculated units
console.log('\n=== DETAILED OVERCALCULATED 1-2% ===');
for (const u of over1to2.sort((a: any, b: any) => b.percentDiff - a.percentDiff).slice(0, 15)) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const b = u.breakdown;
  const cockpit = b.cockpitModifier ?? 1;
  const refBase = u.indexBV / cockpit;
  const excess = (b.defensiveBV + b.offensiveBV) - refBase;

  console.log(`${u.unitId.padEnd(45)} +${u.percentDiff.toFixed(1)}% excess=${excess.toFixed(0)} cockpit=${cockpit}`);
  console.log(`  DEF: armor=${b.armorBV?.toFixed(0)} struct=${b.structureBV?.toFixed(0)} gyro=${b.gyroBV?.toFixed(0)} defEq=${b.defEquipBV} expPen=${b.explosivePenalty} DF=${b.defensiveFactor} → ${b.defensiveBV?.toFixed(0)}`);
  console.log(`  OFF: weap=${b.weaponBV?.toFixed(0)} ammo=${b.ammoBV} wt=${b.weightBonus?.toFixed(0)} phys=${b.physicalWeaponBV?.toFixed(0)} offEq=${b.offEquipBV} SF=${b.speedFactor} HE=${b.heatEfficiency} halved=${b.halvedWeaponCount}/${b.weaponCount} → ${b.offensiveBV?.toFixed(0)}`);
  console.log(`  run=${b.runMP} jump=${b.jumpMP || 0} TMM=${b.maxTMM} eng=${unit.engine?.type}`);
}

// Now check undercalculated 1-2%
const under1to2 = valid.filter((x: any) => x.percentDiff < -1 && x.percentDiff >= -2);
console.log(`\n=== UNDERCALCULATED 1-2% (${under1to2.length} units) ===\n`);

let totalUnderDeficit = 0;
for (const u of under1to2) {
  const b = u.breakdown;
  const cockpit = b.cockpitModifier ?? 1;
  const refBase = u.indexBV / cockpit;
  totalUnderDeficit += refBase - (b.defensiveBV + b.offensiveBV);
}
console.log(`Average deficit: ${(totalUnderDeficit / under1to2.length).toFixed(1)} BV`);

console.log('\n=== DETAILED UNDERCALCULATED 1-2% ===');
for (const u of under1to2.sort((a: any, b: any) => a.percentDiff - b.percentDiff).slice(0, 15)) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const b = u.breakdown;
  const cockpit = b.cockpitModifier ?? 1;
  const refBase = u.indexBV / cockpit;
  const deficit = refBase - (b.defensiveBV + b.offensiveBV);

  console.log(`${u.unitId.padEnd(45)} ${u.percentDiff.toFixed(1)}% deficit=${deficit.toFixed(0)} cockpit=${cockpit}`);
  console.log(`  DEF: armor=${b.armorBV?.toFixed(0)} struct=${b.structureBV?.toFixed(0)} gyro=${b.gyroBV?.toFixed(0)} defEq=${b.defEquipBV} expPen=${b.explosivePenalty} DF=${b.defensiveFactor} → ${b.defensiveBV?.toFixed(0)}`);
  console.log(`  OFF: weap=${b.weaponBV?.toFixed(0)} ammo=${b.ammoBV} wt=${b.weightBonus?.toFixed(0)} phys=${b.physicalWeaponBV?.toFixed(0)} offEq=${b.offEquipBV} SF=${b.speedFactor} HE=${b.heatEfficiency} halved=${b.halvedWeaponCount}/${b.weaponCount} → ${b.offensiveBV?.toFixed(0)}`);
  console.log(`  run=${b.runMP} jump=${b.jumpMP || 0} TMM=${b.maxTMM} eng=${unit.engine?.type} tech=${unit.techBase}`);
}

// Summary: what's the average speed factor, defensive factor, heat efficiency for overcalculated vs undercalculated?
console.log('\n=== AVERAGES ===');
const overSF = over1to2.map((u: any) => u.breakdown.speedFactor);
const underSF = under1to2.map((u: any) => u.breakdown.speedFactor);
const overDF = over1to2.map((u: any) => u.breakdown.defensiveFactor);
const underDF = under1to2.map((u: any) => u.breakdown.defensiveFactor);
const overHE = over1to2.map((u: any) => u.breakdown.heatEfficiency);
const underHE = under1to2.map((u: any) => u.breakdown.heatEfficiency);
console.log(`Over SF avg: ${(overSF.reduce((a: number, b: number) => a + b) / overSF.length).toFixed(3)}`);
console.log(`Under SF avg: ${(underSF.reduce((a: number, b: number) => a + b) / underSF.length).toFixed(3)}`);
console.log(`Over DF avg: ${(overDF.reduce((a: number, b: number) => a + b) / overDF.length).toFixed(3)}`);
console.log(`Under DF avg: ${(underDF.reduce((a: number, b: number) => a + b) / underDF.length).toFixed(3)}`);
console.log(`Over HE avg: ${(overHE.reduce((a: number, b: number) => a + b) / overHE.length).toFixed(1)}`);
console.log(`Under HE avg: ${(underHE.reduce((a: number, b: number) => a + b) / underHE.length).toFixed(1)}`);
