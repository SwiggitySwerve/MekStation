/**
 * Trace the component-by-component BV for near-miss (1-2%) units
 * to identify which specific component is consistently off.
 */
import * as fs from 'fs';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null && x.breakdown);

// 1-2% under
const under12 = valid.filter((x: any) => x.percentDiff < -1 && x.percentDiff >= -2).sort((a: any, b: any) => a.percentDiff - b.percentDiff);
// 1-2% over
const over12 = valid.filter((x: any) => x.percentDiff > 1 && x.percentDiff <= 2).sort((a: any, b: any) => b.percentDiff - a.percentDiff);

console.log('=== SAMPLE UNDERCALCULATED 1-2% ===\n');
for (const u of under12.slice(0, 10)) {
  const b = u.breakdown;
  const totalCalc = u.calculatedBV;
  const totalRef = u.indexBV;
  const diff = totalCalc - totalRef;
  // Estimate what component needs to change
  const defBV = b.defensiveBV || 0;
  const offBV = b.offensiveBV || 0;
  const cockMod = b.cockpitModifier || 1;
  console.log(`${u.unitId.padEnd(42)} ref=${totalRef} calc=${totalCalc} diff=${diff} (${u.percentDiff.toFixed(1)}%)`);
  console.log(`  DEF=${defBV.toFixed(0)} OFF=${offBV.toFixed(0)} cockpit=${cockMod}`);
  console.log(`  armorBV=${b.armorBV?.toFixed(0)} structBV=${b.structureBV?.toFixed(0)} gyroBV=${b.gyroBV?.toFixed(0)} defEq=${b.defEquipBV?.toFixed(0)} expPen=${b.explosivePenalty?.toFixed(0)} DF=${b.defensiveFactor}`);
  console.log(`  weapBV=${b.weaponBV?.toFixed(0)} ammoBV=${b.ammoBV} physBV=${b.physicalWeaponBV?.toFixed(0)} wtBonus=${b.weightBonus?.toFixed(0)} offEq=${b.offEquipBV?.toFixed(0)} SF=${b.speedFactor}`);
  console.log(`  HE=${b.heatEfficiency} run=${b.runMP} jump=${b.jumpMP}`);
  // What if defBV or offBV were adjusted?
  const neededTotal = totalRef / cockMod;
  const neededDefAdjust = neededTotal - defBV - offBV; // How much total needs to increase
  console.log(`  Need +${Math.abs(diff).toFixed(0)} BV total. If all in DEF: +${(Math.abs(diff) / cockMod / b.defensiveFactor).toFixed(0)} base-DEF. If all in OFF: +${(Math.abs(diff) / cockMod / b.speedFactor).toFixed(0)} base-OFF`);
  console.log('');
}

console.log('\n=== SAMPLE OVERCALCULATED 1-2% ===\n');
for (const u of over12.slice(0, 10)) {
  const b = u.breakdown;
  const totalCalc = u.calculatedBV;
  const totalRef = u.indexBV;
  const diff = totalCalc - totalRef;
  const defBV = b.defensiveBV || 0;
  const offBV = b.offensiveBV || 0;
  const cockMod = b.cockpitModifier || 1;
  console.log(`${u.unitId.padEnd(42)} ref=${totalRef} calc=${totalCalc} diff=${diff} (${u.percentDiff.toFixed(1)}%)`);
  console.log(`  DEF=${defBV.toFixed(0)} OFF=${offBV.toFixed(0)} cockpit=${cockMod}`);
  console.log(`  armorBV=${b.armorBV?.toFixed(0)} structBV=${b.structureBV?.toFixed(0)} gyroBV=${b.gyroBV?.toFixed(0)} defEq=${b.defEquipBV?.toFixed(0)} expPen=${b.explosivePenalty?.toFixed(0)} DF=${b.defensiveFactor}`);
  console.log(`  weapBV=${b.weaponBV?.toFixed(0)} ammoBV=${b.ammoBV} physBV=${b.physicalWeaponBV?.toFixed(0)} wtBonus=${b.weightBonus?.toFixed(0)} offEq=${b.offEquipBV?.toFixed(0)} SF=${b.speedFactor}`);
  console.log(`  HE=${b.heatEfficiency} run=${b.runMP} jump=${b.jumpMP}`);
  console.log(`  Need -${Math.abs(diff).toFixed(0)} BV total. If all in DEF: -${(Math.abs(diff) / cockMod / b.defensiveFactor).toFixed(0)} base-DEF. If all in OFF: -${(Math.abs(diff) / cockMod / b.speedFactor).toFixed(0)} base-OFF`);
  console.log('');
}

// Overall: what's the mean/std of components for under vs over?
console.log('\n=== COMPONENT MEANS FOR NEAR-MISS UNITS ===\n');
function stats(arr: number[]): { mean: number; std: number } {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const std = Math.sqrt(arr.map(x => (x - mean) ** 2).reduce((a, b) => a + b, 0) / arr.length);
  return { mean, std };
}

for (const [label, group] of [['Under 1-2%', under12], ['Over 1-2%', over12]] as const) {
  const heatEffs = group.map((u: any) => u.breakdown.heatEfficiency || 0);
  const sfs = group.map((u: any) => u.breakdown.speedFactor || 0);
  const dfs = group.map((u: any) => u.breakdown.defensiveFactor || 0);
  const defRatio = group.map((u: any) => (u.breakdown.defensiveBV || 0) / Math.max(u.calculatedBV, 1));
  const offRatio = group.map((u: any) => (u.breakdown.offensiveBV || 0) / Math.max(u.calculatedBV, 1));

  console.log(`${label} (${group.length} units):`);
  console.log(`  HeatEff: mean=${stats(heatEffs).mean.toFixed(1)}, std=${stats(heatEffs).std.toFixed(1)}`);
  console.log(`  SF: mean=${stats(sfs).mean.toFixed(2)}, std=${stats(sfs).std.toFixed(2)}`);
  console.log(`  DF: mean=${stats(dfs).mean.toFixed(2)}, std=${stats(dfs).std.toFixed(2)}`);
  console.log(`  DEF/total: mean=${stats(defRatio).mean.toFixed(2)}`);
  console.log(`  OFF/total: mean=${stats(offRatio).mean.toFixed(2)}`);
}
