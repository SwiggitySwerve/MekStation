import * as fs from 'fs';
import * as path from 'path';

const data = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const mulCache = JSON.parse(fs.readFileSync('scripts/data-migration/mul-bv-cache.json', 'utf8'));
const indexData = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

const overCalc = data.allResults.filter((d: any) => {
  if (d.difference <= 0 || d.percentDiff < 4) return false;
  const entry = mulCache.entries?.[d.unitId];
  return entry && entry.mulBV > 0 && entry.matchType === 'exact';
});

// For each overcalculated unit, compute what the "missing BV" is
// If total * 0.95 = ref, then missing = total * 0.05
// Let's check if this "missing BV" correlates with tonnage, defBV, offBV, etc.

console.log('=== EXCESS BV ANALYSIS ===');
console.log('');

const results: any[] = [];
for (const d of overCalc) {
  const excess = d.calculatedBV - d.indexBV;
  const expectedExcess = d.calculatedBV * 0.05;
  results.push({
    id: d.unitId,
    calc: d.calculatedBV,
    ref: d.indexBV,
    excess,
    expectedExcess,
    excessRatio: excess / expectedExcess,
    defBV: d.breakdown.defensiveBV,
    offBV: d.breakdown.offensiveBV,
    tonnage: d.tonnage,
  });
}

// Check if excess is EXACTLY 5% of total (within rounding)
const exactFivePercent = results.filter(r => Math.abs(r.excess - Math.round(r.calc * 0.05)) <= 1);
console.log('Units where excess = round(calc * 0.05) +/- 1:', exactFivePercent.length, 'of', results.length);

// Check if excess correlates with tonnage
console.log('\n=== EXCESS vs TONNAGE ===');
const byTonnage = new Map<number, any[]>();
for (const r of results) {
  if (!byTonnage.has(r.tonnage)) byTonnage.set(r.tonnage, []);
  byTonnage.get(r.tonnage)!.push(r);
}
for (const [ton, units] of Array.from(byTonnage.entries()).sort((a, b) => a[0] - b[0])) {
  if (units.length < 2) continue;
  const avgExcess = units.reduce((s: number, u: any) => s + u.excess, 0) / units.length;
  const avgPct = units.reduce((s: number, u: any) => s + u.excess / u.calc * 100, 0) / units.length;
  console.log(`  ${ton}t: ${units.length} units, avg excess: ${avgExcess.toFixed(0)} (${avgPct.toFixed(1)}%)`);
}

// Check if excess = tonnage * something
console.log('\n=== EXCESS / TONNAGE ===');
for (const r of results.slice(0, 20)) {
  console.log(`  ${r.id}: excess=${r.excess} tonnage=${r.tonnage} excess/ton=${(r.excess/r.tonnage).toFixed(2)} excess/defBV=${(r.excess/r.defBV).toFixed(4)} excess/offBV=${(r.excess/r.offBV).toFixed(4)}`);
}

// The key question: is the overcalculation proportional to TOTAL BV?
// If excess/total is constant, then it's a missing global multiplier.
// If excess/defensiveBV is constant, it's a defensive-specific issue.
// If excess/offensiveBV is constant, it's offensive-specific.
console.log('\n=== PROPORTIONALITY TEST ===');
const excessOverTotal = results.map(r => r.excess / r.calc);
const excessOverDef = results.map(r => r.excess / r.defBV);
const excessOverOff = results.map(r => r.excess / r.offBV);

function stats(arr: number[]): string {
  const sorted = [...arr].sort((a, b) => a - b);
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  const std = Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length);
  return `mean=${mean.toFixed(4)} std=${std.toFixed(4)} median=${sorted[Math.floor(sorted.length/2)].toFixed(4)} min=${sorted[0].toFixed(4)} max=${sorted[sorted.length-1].toFixed(4)} cv=${(std/mean).toFixed(3)}`;
}

console.log('  excess/total:', stats(excessOverTotal));
console.log('  excess/defBV:', stats(excessOverDef));
console.log('  excess/offBV:', stats(excessOverOff));

// Lower cv (coefficient of variation) = more consistent = more likely the correct ratio
// If excess/total has the lowest cv, the issue is a global multiplier
// If excess/defBV has lowest cv, the issue is in defensive BV
// If excess/offBV has lowest cv, the issue is in offensive BV

// Let me also check: what if we're DOUBLE-COUNTING something?
// For example, what if gyro BV is being counted twice?
// Or what if armor BV includes the type multiplier AND we're also adding it as defensive equipment?

// Let me check: for units with NO special armor and NO special equipment,
// is the overcalculation still present?
console.log('\n=== SIMPLE UNITS (no special armor, no def equip) ===');
const simpleOver = results.filter(r => {
  const d = overCalc.find((x: any) => x.unitId === r.id);
  return d && d.breakdown.defensiveEquipBV === 0;
});
console.log('Units with no defensive equipment BV:', simpleOver.length);
if (simpleOver.length > 0) {
  console.log('  avg excess/total:', stats(simpleOver.map(r => r.excess / r.calc)));
}

// Check units with standard armor (armorMultiplier = 1.0)
console.log('\n=== STANDARD ARMOR UNITS ===');
let stdArmorResults: any[] = [];
for (const d of overCalc) {
  const iu = indexData.units.find((u: any) => u.id === d.unitId);
  if (!iu) continue;
  try {
    const unitPath = path.resolve('public/data/units/battlemechs', iu.path);
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf8'));
    const armorType = unit.armor.type.toUpperCase().replace(/[_\s-]+/g, '');
    const isStandard = !armorType.includes('REACTIVE') && !armorType.includes('REFLECTIVE') &&
                        !armorType.includes('HARDENED') && !armorType.includes('FERRO') &&
                        !armorType.includes('STEALTH') && !armorType.includes('BALLISTIC') &&
                        !armorType.includes('HEAT');
    if (isStandard) {
      const r = results.find(x => x.id === d.unitId);
      if (r) stdArmorResults.push(r);
    }
  } catch {}
}
console.log('Standard armor overcalculated units:', stdArmorResults.length);
if (stdArmorResults.length > 0) {
  console.log('  avg excess/total:', stats(stdArmorResults.map(r => r.excess / r.calc)));
}

// Non-standard armor
const nonStdArmor = results.filter(r => !stdArmorResults.find(s => s.id === r.id));
console.log('Non-standard armor overcalculated units:', nonStdArmor.length);
if (nonStdArmor.length > 0) {
  console.log('  avg excess/total:', stats(nonStdArmor.map(r => r.excess / r.calc)));
}
