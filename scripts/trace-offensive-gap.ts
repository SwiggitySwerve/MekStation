/**
 * For each undercalculated unit, compute which offensive BV sub-component
 * would need to change to match the reference, and by how much.
 */
import * as fs from 'fs';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null);
const under = valid.filter((x: any) => x.percentDiff < -1 && x.breakdown);

// For each unit:
// totalBV = round((defBV + offBV) * cockpitMod)
// offBV = (weaponBV + ammoBV + weightBonus + physicalWeaponBV + offEquipBV) * speedFactor
//
// Since defensive is correct (per analysis), the needed offBV = refBV/cockpitMod - defBV
// Then: neededBase = neededOffBV / speedFactor
// The difference in base = neededBase - currentBase

interface GapAnalysis {
  unitId: string;
  tonnage: number;
  techBase: string;
  gap: number;
  percentDiff: number;
  // Current values
  weaponBV: number;
  ammoBV: number;
  weightBonus: number;
  physicalBV: number;
  offEquipBV: number;
  speedFactor: number;
  offBV: number;
  defBV: number;
  cockpitMod: number;
  // Needed
  neededOffBV: number;
  neededBase: number;
  currentBase: number;
  baseGap: number;  // neededBase - currentBase (how much base offensive is short)
  // What % of baseGap does each component account for?
  weaponBVPctOfTotal: number;
}

const analyses: GapAnalysis[] = [];

for (const u of under) {
  const b = u.breakdown;
  const cockpit = b.cockpitModifier ?? 1.0;
  const defBV = b.defensiveBV;
  const offBV = b.offensiveBV;
  const sf = b.speedFactor;
  const wBV = b.weaponBV;
  const aBV = b.ammoBV;
  const wb = b.weightBonus;
  const phys = b.physicalWeaponBV ?? 0;
  const offEq = b.offEquipBV ?? 0;

  const neededOffBV = (u.indexBV / cockpit) - defBV;
  const currentBase = wBV + aBV + wb + phys + offEq;
  const neededBase = neededOffBV / sf;
  const baseGap = neededBase - currentBase;

  analyses.push({
    unitId: u.unitId,
    tonnage: u.tonnage,
    techBase: b.techBase,
    gap: Math.abs(u.difference),
    percentDiff: u.percentDiff,
    weaponBV: wBV,
    ammoBV: aBV,
    weightBonus: wb,
    physicalBV: phys,
    offEquipBV: offEq,
    speedFactor: sf,
    offBV: offBV,
    defBV: defBV,
    cockpitMod: cockpit,
    neededOffBV,
    neededBase,
    currentBase,
    baseGap,
    weaponBVPctOfTotal: wBV / currentBase * 100,
  });
}

// ANALYSIS 1: Base gap distribution
console.log('=== BASE OFFENSIVE GAP DISTRIBUTION ===');
const gapBuckets = [0, 10, 20, 30, 50, 100, 200, 500, 1000];
for (let i = 0; i < gapBuckets.length; i++) {
  const lo = gapBuckets[i];
  const hi = i < gapBuckets.length - 1 ? gapBuckets[i + 1] : Infinity;
  const inBucket = analyses.filter(a => a.baseGap >= lo && a.baseGap < hi);
  if (inBucket.length === 0) continue;
  console.log(`  baseGap ${lo}-${hi === Infinity ? '∞' : hi}: ${inBucket.length} units`);
}

// ANALYSIS 2: For units with baseGap < 30, is it likely from rounding/small errors?
const smallGap = analyses.filter(a => a.baseGap < 30 && a.baseGap > 0);
console.log(`\nSmall baseGap (<30): ${smallGap.length} units`);
if (smallGap.length > 0) {
  const avgGap = smallGap.reduce((s, a) => s + a.baseGap, 0) / smallGap.length;
  console.log(`  Average baseGap: ${avgGap.toFixed(1)}`);
  // Could this be explained by a single missing weapon?
  let singleWeaponFix = 0;
  for (const a of smallGap) {
    if (a.baseGap < 50) singleWeaponFix++;
  }
  console.log(`  Fixable by single weapon BV adjustment: ${singleWeaponFix}/${smallGap.length}`);
}

// ANALYSIS 3: Speed factor correlation
console.log('\n=== SPEED FACTOR vs BASE GAP ===');
const sfBuckets: Record<string, { count: number; avgGap: number; sumGap: number }> = {};
for (const a of analyses) {
  const b = a.speedFactor < 1.0 ? '<1.0' : a.speedFactor < 1.2 ? '1.0-1.2' : a.speedFactor < 1.5 ? '1.2-1.5' : a.speedFactor < 2.0 ? '1.5-2.0' : '2.0+';
  if (!sfBuckets[b]) sfBuckets[b] = { count: 0, avgGap: 0, sumGap: 0 };
  sfBuckets[b].count++;
  sfBuckets[b].sumGap += a.baseGap;
}
for (const [b, s] of Object.entries(sfBuckets).sort()) {
  s.avgGap = s.sumGap / s.count;
  console.log(`  SF ${b.padEnd(8)}: ${s.count} units, avg baseGap=${s.avgGap.toFixed(1)}`);
}

// ANALYSIS 4: By tech base
console.log('\n=== BY TECH BASE ===');
const tbGroups: Record<string, GapAnalysis[]> = {};
for (const a of analyses) {
  const tb = a.techBase || 'UNKNOWN';
  if (!tbGroups[tb]) tbGroups[tb] = [];
  tbGroups[tb].push(a);
}
for (const [tb, group] of Object.entries(tbGroups).sort((a, b) => b[1].length - a[1].length)) {
  const avgBaseGap = group.reduce((s, a) => s + a.baseGap, 0) / group.length;
  const avgWeaponPct = group.reduce((s, a) => s + a.weaponBVPctOfTotal, 0) / group.length;
  console.log(`  ${tb.padEnd(14)}: ${group.length} units, avg baseGap=${avgBaseGap.toFixed(1)}, avg weapon%=${avgWeaponPct.toFixed(1)}%`);
}

// ANALYSIS 5: Detailed breakdown of 10 undercalculated units at different gap sizes
console.log('\n=== SAMPLE TRACES (sorted by baseGap) ===');
const sorted = [...analyses].sort((a, b) => a.baseGap - b.baseGap);
// Show 3 small, 3 medium, 4 large gap
const samples = [...sorted.slice(0, 3), ...sorted.slice(Math.floor(sorted.length/2)-1, Math.floor(sorted.length/2)+2), ...sorted.slice(-4)];
for (const a of samples) {
  console.log(`\n${a.unitId} (${a.techBase}, ${a.tonnage}t) BVgap=${a.gap} (${a.percentDiff.toFixed(1)}%)`);
  console.log(`  base: weapon=${a.weaponBV.toFixed(0)} + ammo=${a.ammoBV} + weight=${a.weightBonus.toFixed(0)} + phys=${a.physicalBV.toFixed(0)} + eq=${a.offEquipBV} = ${a.currentBase.toFixed(0)}`);
  console.log(`  needed base: ${a.neededBase.toFixed(0)} (gap=${a.baseGap.toFixed(0)}) × sf=${a.speedFactor} → offBV=${a.offBV.toFixed(0)} (need ${a.neededOffBV.toFixed(0)})`);
  // What single adjustment would fix it?
  if (a.baseGap > 0) {
    const weaponPctIncrease = (a.baseGap / a.weaponBV * 100).toFixed(1);
    console.log(`  → weapon BV needs +${weaponPctIncrease}% (from ${a.weaponBV.toFixed(0)} to ${(a.weaponBV + a.baseGap).toFixed(0)})`);
  }
}

// ANALYSIS 6: What if ammo BV is systematically undercounted?
console.log('\n=== AMMO BV ANALYSIS ===');
const withAmmo = analyses.filter(a => a.ammoBV > 0);
const noAmmo = analyses.filter(a => a.ammoBV === 0);
console.log(`With ammo: ${withAmmo.length} (avg baseGap=${(withAmmo.reduce((s,a)=>s+a.baseGap,0)/Math.max(1,withAmmo.length)).toFixed(1)})`);
console.log(`No ammo: ${noAmmo.length} (avg baseGap=${(noAmmo.reduce((s,a)=>s+a.baseGap,0)/Math.max(1,noAmmo.length)).toFixed(1)})`);

// Check: units with 0 ammo but large baseGap — these must be pure weapon BV issues
const noAmmoLargeGap = noAmmo.filter(a => a.baseGap > 30);
console.log(`No ammo + baseGap>30: ${noAmmoLargeGap.length}`);
for (const a of noAmmoLargeGap.slice(0, 5)) {
  console.log(`  ${a.unitId}: weapon=${a.weaponBV.toFixed(0)} weight=${a.weightBonus.toFixed(0)} gap=${a.baseGap.toFixed(0)}`);
}
