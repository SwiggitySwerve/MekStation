/**
 * Granular BV diff analysis: compare each sub-component across wrong units
 * to identify which specific component is systematically off.
 */
import * as fs from 'fs';
import * as path from 'path';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

// All non-error units with breakdown
const all = report.allResults.filter((r: any) => r.status !== 'error' && r.breakdown);
const wrong = all.filter((r: any) => Math.abs(r.percentDiff) > 1);
const underc = wrong.filter((r: any) => r.percentDiff < 0);
const overc = wrong.filter((r: any) => r.percentDiff > 0);
const exact = all.filter((r: any) => r.status === 'exact' || r.status === 'within1');

console.log(`Total: ${all.length} | Exact/Within1: ${exact.length} | Wrong: ${wrong.length} (${underc.length} under, ${overc.length} over)`);

// === SECTION 1: Component distribution across wrong units ===
console.log('\n=== OFFENSIVE BV COMPONENTS (averages) ===');
function avgField(arr: any[], field: string): string {
  const vals = arr.map(r => r.breakdown?.[field]).filter(v => v !== undefined && v !== null);
  if (vals.length === 0) return 'N/A';
  return (vals.reduce((s: number, v: number) => s + v, 0) / vals.length).toFixed(1);
}

const groups = [
  { name: 'Exact/W1', arr: exact },
  { name: 'Undercalc', arr: underc },
  { name: 'Overcalc', arr: overc },
];

const fields = [
  'weaponBV', 'rawWeaponBV', 'halvedWeaponBV', 'ammoBV', 'weightBonus',
  'physicalWeaponBV', 'offEquipBV', 'heatEfficiency', 'heatDissipation', 'moveHeat',
  'speedFactor', 'offensiveBV',
  'armorBV', 'structureBV', 'gyroBV', 'defEquipBV', 'amsAmmoBV',
  'armoredComponentBV', 'harjelBonus', 'explosivePenalty', 'defensiveFactor',
  'maxTMM', 'defensiveBV', 'cockpitModifier',
  'weaponCount', 'halvedWeaponCount',
  'walkMP', 'runMP', 'jumpMP',
];

// Print header
const header = 'Field'.padEnd(22) + groups.map(g => g.name.padStart(12)).join('');
console.log(header);
console.log('-'.repeat(header.length));
for (const f of fields) {
  const row = f.padEnd(22) + groups.map(g => avgField(g.arr, f).padStart(12)).join('');
  console.log(row);
}

// === SECTION 2: Heat tracking analysis ===
console.log('\n=== HEAT TRACKING IMPACT ===');
for (const g of groups) {
  const withHalved = g.arr.filter((r: any) => (r.breakdown?.halvedWeaponCount ?? 0) > 0);
  const avgHalvedPct = withHalved.length > 0
    ? (withHalved.reduce((s: number, r: any) => s + (r.breakdown.halvedWeaponBV / Math.max(1, r.breakdown.rawWeaponBV)), 0) / withHalved.length * 100).toFixed(1)
    : '0.0';
  console.log(`  ${g.name}: ${withHalved.length}/${g.arr.length} units have halved weapons, avg halved%=${avgHalvedPct}`);
}

// === SECTION 3: Per-tech-base breakdown ===
console.log('\n=== BY TECH BASE ===');
const techBases = ['INNER_SPHERE', 'CLAN', 'MIXED'];
for (const tb of techBases) {
  const tbUnder = underc.filter((r: any) => r.breakdown?.techBase === tb);
  const tbOver = overc.filter((r: any) => r.breakdown?.techBase === tb);
  const tbExact = exact.filter((r: any) => r.breakdown?.techBase === tb);
  if (tbUnder.length === 0 && tbOver.length === 0) continue;

  console.log(`\n  ${tb}: ${tbExact.length} exact, ${tbUnder.length} under, ${tbOver.length} over`);

  // For undercalculated, show which component has the biggest relative gap
  if (tbUnder.length > 0) {
    const avgGap = tbUnder.reduce((s: number, r: any) => s + Math.abs(r.difference), 0) / tbUnder.length;
    const avgWeaponBV = parseFloat(avgField(tbUnder, 'weaponBV'));
    const avgRawWeaponBV = parseFloat(avgField(tbUnder, 'rawWeaponBV'));
    const avgHalvedBV = parseFloat(avgField(tbUnder, 'halvedWeaponBV'));
    const avgHeatEff = parseFloat(avgField(tbUnder, 'heatEfficiency'));
    const avgAmmoBV = parseFloat(avgField(tbUnder, 'ammoBV'));
    const avgDefEquip = parseFloat(avgField(tbUnder, 'defEquipBV'));
    console.log(`    avg gap: ${avgGap.toFixed(0)} BV`);
    console.log(`    avg weaponBV: ${avgWeaponBV} (raw: ${avgRawWeaponBV}, halved: ${avgHalvedBV})`);
    console.log(`    avg heatEfficiency: ${avgHeatEff}`);
    console.log(`    avg ammoBV: ${avgAmmoBV}`);
    console.log(`    avg defEquipBV: ${avgDefEquip}`);
  }
}

// === SECTION 4: Heat efficiency comparison ===
console.log('\n=== HEAT EFFICIENCY DISTRIBUTION ===');
const heBuckets: Record<string, { exact: number; under: number; over: number }> = {};
for (const r of all) {
  const he = r.breakdown?.heatEfficiency;
  if (he === undefined) continue;
  const bucket = he < 0 ? '<0' : he < 5 ? '0-4' : he < 10 ? '5-9' : he < 20 ? '10-19' : he < 30 ? '20-29' : '30+';
  if (!heBuckets[bucket]) heBuckets[bucket] = { exact: 0, under: 0, over: 0 };
  if (Math.abs(r.percentDiff) <= 1) heBuckets[bucket].exact++;
  else if (r.percentDiff < 0) heBuckets[bucket].under++;
  else heBuckets[bucket].over++;
}
for (const [bucket, stats] of Object.entries(heBuckets).sort()) {
  const total = stats.exact + stats.under + stats.over;
  const wrongPct = ((stats.under + stats.over) / total * 100).toFixed(1);
  console.log(`  HE ${bucket.padEnd(6)}: ${stats.exact} exact, ${stats.under} under, ${stats.over} over (${wrongPct}% wrong)`);
}

// === SECTION 5: Weapon BV gap analysis ===
console.log('\n=== WEAPON BV GAP VS TOTAL GAP ===');
// For each undercalculated unit, estimate how much of the gap comes from
// weapon BV vs other components
let weaponDominant = 0, defensiveDominant = 0, other = 0;
for (const r of underc) {
  const b = r.breakdown;
  if (!b) continue;
  const gap = Math.abs(r.difference);
  // If we increase offensive BV by gap, what base increase is needed?
  const neededBaseIncrease = gap / b.speedFactor;
  // Compare to potential weapon BV undercount
  const halvedLoss = b.halvedWeaponBV; // BV lost to halving (these weapons contribute only half)
  const rawVsTracked = b.rawWeaponBV - b.weaponBV;

  if (neededBaseIncrease < rawVsTracked * 1.5) {
    weaponDominant++; // Heat tracking is the issue
  } else if (gap < b.defensiveBV * 0.15) {
    defensiveDominant++;
  } else {
    other++;
  }
}
console.log(`  Heat tracking dominant: ${weaponDominant}`);
console.log(`  Defensive dominant: ${defensiveDominant}`);
console.log(`  Other: ${other}`);

// === SECTION 6: Defensive factor accuracy ===
console.log('\n=== DEFENSIVE FACTOR vs ERROR RATE ===');
const dfBuckets: Record<string, { exact: number; under: number; over: number }> = {};
for (const r of all) {
  const df = r.breakdown?.defensiveFactor;
  if (!df) continue;
  const bucket = df.toFixed(1);
  if (!dfBuckets[bucket]) dfBuckets[bucket] = { exact: 0, under: 0, over: 0 };
  if (Math.abs(r.percentDiff) <= 1) dfBuckets[bucket].exact++;
  else if (r.percentDiff < 0) dfBuckets[bucket].under++;
  else dfBuckets[bucket].over++;
}
for (const [bucket, stats] of Object.entries(dfBuckets).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))) {
  const total = stats.exact + stats.under + stats.over;
  if (total < 3) continue;
  const wrongPct = ((stats.under + stats.over) / total * 100).toFixed(1);
  console.log(`  defF=${bucket}: ${stats.exact} exact, ${stats.under} under, ${stats.over} over (${wrongPct}% wrong of ${total})`);
}

// === SECTION 7: Top 15 undercalculated with full granular breakdown ===
console.log('\n=== TOP 15 UNDERCALCULATED - GRANULAR ===');
for (const r of underc.sort((a: any, b: any) => a.percentDiff - b.percentDiff).slice(0, 15)) {
  const b = r.breakdown;
  if (!b) continue;
  console.log(`\n${r.unitId} (${b.techBase}, ${r.tonnage}t) gap=${r.difference} (${r.percentDiff.toFixed(1)}%)`);
  console.log(`  DEF: armor=${b.armorBV} struct=${b.structureBV} gyro=${b.gyroBV} equip=${b.defEquipBV} amsAmmo=${b.amsAmmoBV} armored=${b.armoredComponentBV} harjel=${b.harjelBonus} penalty=-${b.explosivePenalty}`);
  console.log(`       factor=${b.defensiveFactor} (TMM=${b.maxTMM}) → defensiveBV=${b.defensiveBV.toFixed(1)}`);
  console.log(`  OFF: weapons=${b.weaponBV.toFixed(1)} (raw=${b.rawWeaponBV.toFixed(1)}, halved=${b.halvedWeaponBV.toFixed(1)}, ${b.halvedWeaponCount}/${b.weaponCount} halved)`);
  console.log(`       ammo=${b.ammoBV} weight=${b.weightBonus} phys=${b.physicalWeaponBV} equip=${b.offEquipBV}`);
  console.log(`       heat: eff=${b.heatEfficiency} (diss=${b.heatDissipation} move=${b.moveHeat})`);
  console.log(`       speed=${b.speedFactor} → offensiveBV=${b.offensiveBV.toFixed(1)}`);
  console.log(`  MOD: cockpit=${b.cockpitModifier} (${b.cockpitType}) move: w=${b.walkMP} r=${b.runMP} j=${b.jumpMP}`);
  console.log(`  REF: ${r.indexBV} CALC: ${r.calculatedBV} NEED: +${Math.abs(r.difference)}`);
}

// === SECTION 8: Top 10 overcalculated ===
console.log('\n=== TOP 10 OVERCALCULATED - GRANULAR ===');
for (const r of overc.sort((a: any, b: any) => b.percentDiff - a.percentDiff).slice(0, 10)) {
  const b = r.breakdown;
  if (!b) continue;
  console.log(`\n${r.unitId} (${b.techBase}, ${r.tonnage}t) gap=+${r.difference} (+${r.percentDiff.toFixed(1)}%)`);
  console.log(`  DEF: armor=${b.armorBV} struct=${b.structureBV} gyro=${b.gyroBV} equip=${b.defEquipBV} penalty=-${b.explosivePenalty}`);
  console.log(`       factor=${b.defensiveFactor} (TMM=${b.maxTMM}) → defensiveBV=${b.defensiveBV.toFixed(1)}`);
  console.log(`  OFF: weapons=${b.weaponBV.toFixed(1)} (raw=${b.rawWeaponBV.toFixed(1)}, halved=${b.halvedWeaponBV.toFixed(1)}, ${b.halvedWeaponCount}/${b.weaponCount} halved)`);
  console.log(`       ammo=${b.ammoBV} weight=${b.weightBonus} phys=${b.physicalWeaponBV} equip=${b.offEquipBV}`);
  console.log(`       heat: eff=${b.heatEfficiency} (diss=${b.heatDissipation} move=${b.moveHeat})`);
  console.log(`       speed=${b.speedFactor} → offensiveBV=${b.offensiveBV.toFixed(1)}`);
  console.log(`  MOD: cockpit=${b.cockpitModifier} (${b.cockpitType}) move: w=${b.walkMP} r=${b.runMP} j=${b.jumpMP}`);
  console.log(`  REF: ${r.indexBV} CALC: ${r.calculatedBV} EXCESS: ${r.difference}`);
}
