/**
 * Correlate BV error with individual components to find the systematic source.
 */
import * as fs from 'fs';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null && x.breakdown);

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b) / n;
  const my = ys.reduce((a, b) => a + b) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i] - mx;
    const y = ys[i] - my;
    num += x * y;
    dx += x * x;
    dy += y * y;
  }
  return num / Math.sqrt(dx * dy);
}

const errors = valid.map((x: any) => x.calculatedBV - x.indexBV);
const pctErrors = valid.map((x: any) => x.percentDiff);

const components = {
  'armorBV': valid.map((x: any) => x.breakdown.armorBV || 0),
  'structureBV': valid.map((x: any) => x.breakdown.structureBV || 0),
  'gyroBV': valid.map((x: any) => x.breakdown.gyroBV || 0),
  'defEquipBV': valid.map((x: any) => x.breakdown.defEquipBV || 0),
  'explosivePenalty': valid.map((x: any) => x.breakdown.explosivePenalty || 0),
  'defensiveFactor': valid.map((x: any) => x.breakdown.defensiveFactor || 0),
  'defensiveBV': valid.map((x: any) => x.breakdown.defensiveBV || 0),
  'weaponBV': valid.map((x: any) => x.breakdown.weaponBV || 0),
  'rawWeaponBV': valid.map((x: any) => x.breakdown.rawWeaponBV || 0),
  'ammoBV': valid.map((x: any) => x.breakdown.ammoBV || 0),
  'weightBonus': valid.map((x: any) => x.breakdown.weightBonus || 0),
  'physicalWeaponBV': valid.map((x: any) => x.breakdown.physicalWeaponBV || 0),
  'offEquipBV': valid.map((x: any) => x.breakdown.offEquipBV || 0),
  'heatEfficiency': valid.map((x: any) => x.breakdown.heatEfficiency || 0),
  'speedFactor': valid.map((x: any) => x.breakdown.speedFactor || 0),
  'offensiveBV': valid.map((x: any) => x.breakdown.offensiveBV || 0),
  'cockpitModifier': valid.map((x: any) => x.breakdown.cockpitModifier || 0),
  'halvedWeaponCount': valid.map((x: any) => x.breakdown.halvedWeaponCount || 0),
  'totalBV': valid.map((x: any) => x.calculatedBV || 0),
};

console.log('=== CORRELATION: BV Error vs Components ===');
console.log('(Positive correlation = component associated with overcalculation)');
for (const [name, values] of Object.entries(components)) {
  const r = pearson(values, errors);
  const rPct = pearson(values, pctErrors);
  console.log(`  ${name.padEnd(25)} r(abs)=${r.toFixed(3).padStart(7)}  r(pct)=${rPct.toFixed(3).padStart(7)}`);
}

// Also check: is the error proportional to the BV magnitude?
// If our calculation has a multiplicative bias, the error would scale with BV.
console.log('\n=== ERROR vs BV MAGNITUDE ===');
const totalBVs = valid.map((x: any) => x.calculatedBV);
console.log(`r(error, totalBV) = ${pearson(errors, totalBVs).toFixed(4)}`);
console.log(`r(pctError, totalBV) = ${pearson(pctErrors, totalBVs).toFixed(4)}`);

// Check: do units with more heat-halved weapons have larger errors?
console.log('\n=== HALVED WEAPONS IMPACT ===');
const noHalved = valid.filter((x: any) => (x.breakdown.halvedWeaponCount || 0) === 0);
const hasHalved = valid.filter((x: any) => (x.breakdown.halvedWeaponCount || 0) > 0);
const avgErrNoHalved = noHalved.reduce((s: number, x: any) => s + x.percentDiff, 0) / noHalved.length;
const avgErrHasHalved = hasHalved.reduce((s: number, x: any) => s + x.percentDiff, 0) / hasHalved.length;
const outlierRateNoHalved = noHalved.filter((x: any) => Math.abs(x.percentDiff) > 1).length / noHalved.length;
const outlierRateHasHalved = hasHalved.filter((x: any) => Math.abs(x.percentDiff) > 1).length / hasHalved.length;
console.log(`No halved: ${noHalved.length} units, avg err=${avgErrNoHalved.toFixed(3)}%, outlier rate=${(outlierRateNoHalved*100).toFixed(1)}%`);
console.log(`Has halved: ${hasHalved.length} units, avg err=${avgErrHasHalved.toFixed(3)}%, outlier rate=${(outlierRateHasHalved*100).toFixed(1)}%`);

// Check: is the error direction associated with heat efficiency?
// Low HE means more halving → more likely to have weapon BV errors
console.log('\n=== HEAT EFFICIENCY BANDS ===');
const heBands = [
  { label: 'HE<=10', min: 0, max: 10 },
  { label: 'HE 11-20', min: 11, max: 20 },
  { label: 'HE 21-30', min: 21, max: 30 },
  { label: 'HE 31+', min: 31, max: 999 },
];
for (const band of heBands) {
  const inBand = valid.filter((x: any) => (x.breakdown.heatEfficiency || 0) >= band.min && (x.breakdown.heatEfficiency || 0) <= band.max);
  if (inBand.length === 0) continue;
  const avgErr = inBand.reduce((s: number, x: any) => s + x.percentDiff, 0) / inBand.length;
  const outlierRate = inBand.filter((x: any) => Math.abs(x.percentDiff) > 1).length / inBand.length;
  console.log(`  ${band.label.padEnd(10)} ${inBand.length} units, avg err=${avgErr.toFixed(3).padStart(7)}%, outlier rate=${(outlierRate*100).toFixed(1)}%`);
}

// Check specifically: for all outliers, compare defensive vs offensive fraction
console.log('\n=== DEF:OFF RATIO vs ERROR DIRECTION ===');
const outliers = valid.filter((x: any) => Math.abs(x.percentDiff) > 1 && Math.abs(x.percentDiff) <= 3);
for (const dir of ['over', 'under'] as const) {
  const subset = outliers.filter((x: any) => dir === 'over' ? x.percentDiff > 0 : x.percentDiff < 0);
  const avgDefFrac = subset.reduce((s: number, x: any) => {
    const d = x.breakdown.defensiveBV || 0;
    const o = x.breakdown.offensiveBV || 0;
    return s + (d + o > 0 ? d / (d + o) : 0);
  }, 0) / subset.length;
  console.log(`  ${dir}: ${subset.length} units, avg DEF/(DEF+OFF)=${avgDefFrac.toFixed(3)}`);
}
