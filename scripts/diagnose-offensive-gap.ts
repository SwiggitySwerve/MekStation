/**
 * Deep diagnosis: for undercalculated units, reverse-engineer what the correct
 * offensive BV components should be, and compare with what we compute.
 *
 * Since we know 100% of gaps are offensive, we can isolate:
 * neededOffBV = (refBV / cockpitMod) - defBV
 * neededBase = neededOffBV / speedFactor
 *
 * Then check each sub-component:
 * - weaponBV (heat-tracked)
 * - ammoBV (capped)
 * - weightBonus (tonnage * modifiers)
 * - physicalWeaponBV
 * - offEquipBV
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

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null);
const under = valid.filter((x: any) => x.percentDiff < -1 && x.breakdown);
const exact = valid.filter((x: any) => Math.abs(x.percentDiff) <= 0.5 && x.breakdown);

// ANALYSIS 1: Weight bonus check — is tonnage * modifier correct?
console.log('=== WEIGHT BONUS AUDIT ===');
let weightWrong = 0;
for (const u of under) {
  const b = u.breakdown;
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const expectedWeight = unit.tonnage; // base weight bonus = tonnage
  // TSM adds 1.5x, industrial TSM adds 1.15x
  const hasTSM = unit.criticalSlots && Object.values(unit.criticalSlots).some((slots: any) =>
    Array.isArray(slots) && slots.some((s: any) => s && typeof s === 'string' && s.toLowerCase().includes('tsm'))
  );
  const expectedBonus = hasTSM ? expectedWeight * 1.5 : expectedWeight;
  if (Math.abs(b.weightBonus - expectedBonus) > 1) {
    weightWrong++;
    if (weightWrong <= 5) console.log(`  ${u.unitId}: expected=${expectedBonus.toFixed(0)} got=${b.weightBonus.toFixed(0)} (TSM=${hasTSM})`);
  }
}
console.log(`Weight bonus mismatches: ${weightWrong}/${under.length}`);

// ANALYSIS 2: Speed factor check — compare with independent recalculation
console.log('\n=== SPEED FACTOR AUDIT ===');
let sfWrong = 0;
for (const u of under) {
  const b = u.breakdown;
  const expectedMP = b.runMP + Math.round(Math.max(b.jumpMP, 0) / 2);
  const expectedSF = Math.round(Math.pow(1 + ((expectedMP > 5 ? expectedMP : expectedMP) - 5) / 10, 1.2) * 100) / 100;
  if (Math.abs(b.speedFactor - expectedSF) > 0.01) {
    sfWrong++;
    if (sfWrong <= 5) console.log(`  ${u.unitId}: expected=${expectedSF} got=${b.speedFactor} (run=${b.runMP} jump=${b.jumpMP})`);
  }
}
console.log(`Speed factor mismatches: ${sfWrong}/${under.length}`);

// ANALYSIS 3: Heat efficiency and weapon halving comparison
console.log('\n=== HEAT EFFICIENCY COMPARISON ===');
// Compare undercalculated vs exact units
const underHE = under.map((u: any) => u.breakdown.heatEfficiency);
const exactHE = exact.map((u: any) => u.breakdown.heatEfficiency);
const avgUnderHE = underHE.reduce((a: number, b: number) => a + b, 0) / underHE.length;
const avgExactHE = exactHE.reduce((a: number, b: number) => a + b, 0) / exactHE.length;
console.log(`  Undercalculated avg HE: ${avgUnderHE.toFixed(1)}`);
console.log(`  Exact match avg HE: ${avgExactHE.toFixed(1)}`);

// ANALYSIS 4: % of weapon BV that's halved (heat excess)
console.log('\n=== WEAPON HALVING RATE ===');
const underHalvePct = under.map((u: any) => {
  const b = u.breakdown;
  return b.rawWeaponBV > 0 ? (b.halvedWeaponBV / b.rawWeaponBV * 100) : 0;
});
const exactHalvePct = exact.map((u: any) => {
  const b = u.breakdown;
  return b.rawWeaponBV > 0 ? (b.halvedWeaponBV / b.rawWeaponBV * 100) : 0;
});
console.log(`  Undercalculated: ${(underHalvePct.reduce((a: number, b: number) => a + b, 0) / underHalvePct.length).toFixed(1)}% of weapon BV halved`);
console.log(`  Exact match: ${(exactHalvePct.reduce((a: number, b: number) => a + b, 0) / exactHalvePct.length).toFixed(1)}% of weapon BV halved`);

// ANALYSIS 5: Ammo BV patterns
console.log('\n=== AMMO BV ANALYSIS ===');
const underWithAmmo = under.filter((u: any) => u.breakdown.ammoBV > 0);
const underNoAmmo = under.filter((u: any) => u.breakdown.ammoBV === 0);
const exactWithAmmo = exact.filter((u: any) => u.breakdown.ammoBV > 0);
const exactNoAmmo = exact.filter((u: any) => u.breakdown.ammoBV === 0);

// For no-ammo units, the gap MUST be in weaponBV, physicalBV, weightBonus, or offEquipBV
console.log(`  Undercalc with ammo: ${underWithAmmo.length}, without: ${underNoAmmo.length}`);
console.log(`  Exact with ammo: ${exactWithAmmo.length}, without: ${exactNoAmmo.length}`);

// ANALYSIS 6: For no-ammo undercalculated units, trace exactly where the gap is
console.log('\n=== NO-AMMO UNDERCALCULATED UNIT TRACES ===');
for (const u of underNoAmmo.slice(0, 20)) {
  const b = u.breakdown;
  const cockpit = b.cockpitModifier ?? 1.0;
  const neededTotal = u.indexBV / cockpit;
  const neededOff = neededTotal - b.defensiveBV;
  const neededBase = neededOff / b.speedFactor;
  const currentBase = b.weaponBV + b.ammoBV + b.weightBonus + (b.physicalWeaponBV ?? 0) + (b.offEquipBV ?? 0);
  const baseGap = neededBase - currentBase;
  // What % of gap is in weaponBV?
  const weaponGapPct = b.weaponBV > 0 ? (baseGap / b.weaponBV * 100).toFixed(1) : 'N/A';
  console.log(`  ${u.unitId.padEnd(35)} gap=${Math.round(baseGap)} (${weaponGapPct}% of weaponBV) weapon=${Math.round(b.weaponBV)} wt=${Math.round(b.weightBonus)} phys=${Math.round(b.physicalWeaponBV ?? 0)} sf=${b.speedFactor} HE=${b.heatEfficiency} halved=${b.halvedWeaponCount}/${b.weaponCount}`);
}

// ANALYSIS 7: Reverse-check the heat tracking — what if heatEfficiency is off?
// For each undercalculated unit, what heatEfficiency value would produce the correct weaponBV?
console.log('\n=== HEAT EFFICIENCY SENSITIVITY ===');
// If we increase HE by 1, how many fewer weapons are halved?
// Each non-halved weapon adds +0.5 * weaponBV to the total
let heFixableCount = 0;
for (const u of under) {
  const b = u.breakdown;
  const cockpit = b.cockpitModifier ?? 1.0;
  const neededTotal = u.indexBV / cockpit;
  const neededOff = neededTotal - b.defensiveBV;
  const neededBase = neededOff / b.speedFactor;
  const currentBase = b.weaponBV + b.ammoBV + b.weightBonus + (b.physicalWeaponBV ?? 0) + (b.offEquipBV ?? 0);
  const baseGap = neededBase - currentBase;
  // If gap < halvedWeaponBV, then un-halving some weapons could fix it
  if (baseGap > 0 && baseGap <= b.halvedWeaponBV * 1.5) heFixableCount++;
}
console.log(`  Units where un-halving some weapons would fix gap: ${heFixableCount}/${under.length}`);

// ANALYSIS 8: Check heatDissipation calculation directly
console.log('\n=== HEAT DISSIPATION AUDIT ===');
let hdWrong = 0;
for (const u of under.slice(0, 100)) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const b = u.breakdown;
  const isDHS = unit.heatSinks?.type?.toUpperCase().includes('DOUBLE') || unit.heatSinks?.type?.toUpperCase().includes('LASER');
  const engineHS = Math.min(10, Math.floor(unit.engine.rating / 25));
  const baseHD = unit.heatSinks.count * (isDHS ? 2 : 1);
  // Expected: max(unit.heatSinks.count, engineIntegrated + critDHS) * multiplier
  // For now just check the basic calculation
  if (Math.abs(b.heatDissipation - baseHD) > 1 && !unit.criticalSlots) {
    hdWrong++;
    if (hdWrong <= 5) console.log(`  ${u.unitId}: expected=${baseHD} got=${b.heatDissipation} (hsType=${unit.heatSinks.type} count=${unit.heatSinks.count})`);
  }
}

// ANALYSIS 9: Check if the gap correlates with weapon count
console.log('\n=== GAP vs WEAPON COUNT ===');
const weapCountBuckets: Record<string, { count: number; avgGap: number; sumGap: number }> = {};
for (const u of under) {
  const b = u.breakdown;
  const cockpit = b.cockpitModifier ?? 1.0;
  const neededTotal = u.indexBV / cockpit;
  const neededOff = neededTotal - b.defensiveBV;
  const neededBase = neededOff / b.speedFactor;
  const currentBase = b.weaponBV + b.ammoBV + b.weightBonus + (b.physicalWeaponBV ?? 0) + (b.offEquipBV ?? 0);
  const baseGap = neededBase - currentBase;

  const wc = b.weaponCount;
  const bucket = wc <= 3 ? '1-3' : wc <= 6 ? '4-6' : wc <= 10 ? '7-10' : '11+';
  if (!weapCountBuckets[bucket]) weapCountBuckets[bucket] = { count: 0, avgGap: 0, sumGap: 0 };
  weapCountBuckets[bucket].count++;
  weapCountBuckets[bucket].sumGap += baseGap;
}
for (const [b, s] of Object.entries(weapCountBuckets).sort()) {
  s.avgGap = s.sumGap / s.count;
  console.log(`  Weapons ${b.padEnd(5)}: ${s.count} units, avg baseGap=${s.avgGap.toFixed(1)}`);
}

// ANALYSIS 10: Check if any "exact" units have the same equipment types as undercalculated ones
// This would reveal if specific weapon TYPES are systematically miscalculated
console.log('\n=== WEAPON TYPE GAP ANALYSIS ===');
// For each weapon type, check if it appears more in undercalculated vs exact units
const weaponTypeInUnder: Record<string, number> = {};
const weaponTypeInExact: Record<string, number> = {};
for (const u of under) {
  const unit = loadUnit(u.unitId);
  if (!unit?.equipment) continue;
  const seen = new Set<string>();
  for (const eq of unit.equipment) {
    const lo = eq.id.toLowerCase().replace(/^\d+-/, '');
    if (lo.includes('ammo') || lo.includes('heat') || lo.includes('case') || lo.includes('targeting') || lo.includes('tsm')) continue;
    // Normalize to weapon family
    let family = lo.replace(/^(?:is|cl|clan)-?/, '').replace(/-?(?:os|ios)$/, '');
    family = family.replace(/\d+$/, '').replace(/-$/, '');
    if (seen.has(family)) continue;
    seen.add(family);
    weaponTypeInUnder[family] = (weaponTypeInUnder[family] || 0) + 1;
  }
}
for (const u of exact.slice(0, 500)) {
  const unit = loadUnit(u.unitId);
  if (!unit?.equipment) continue;
  const seen = new Set<string>();
  for (const eq of unit.equipment) {
    const lo = eq.id.toLowerCase().replace(/^\d+-/, '');
    if (lo.includes('ammo') || lo.includes('heat') || lo.includes('case') || lo.includes('targeting') || lo.includes('tsm')) continue;
    let family = lo.replace(/^(?:is|cl|clan)-?/, '').replace(/-?(?:os|ios)$/, '');
    family = family.replace(/\d+$/, '').replace(/-$/, '');
    if (seen.has(family)) continue;
    seen.add(family);
    weaponTypeInExact[family] = (weaponTypeInExact[family] || 0) + 1;
  }
}
// Find weapon types that appear much more often in undercalculated than exact
const allTypes = new Set([...Object.keys(weaponTypeInUnder), ...Object.keys(weaponTypeInExact)]);
const enrichment: Array<{ type: string; underPct: number; exactPct: number; ratio: number }> = [];
for (const t of allTypes) {
  const underPct = ((weaponTypeInUnder[t] || 0) / under.length) * 100;
  const exactPct = ((weaponTypeInExact[t] || 0) / Math.min(exact.length, 500)) * 100;
  if (underPct > 5 || exactPct > 5) {
    enrichment.push({ type: t, underPct, exactPct, ratio: underPct / Math.max(0.1, exactPct) });
  }
}
enrichment.sort((a, b) => b.ratio - a.ratio);
console.log('  Weapon types enriched in undercalculated units:');
for (const e of enrichment.slice(0, 15)) {
  const marker = e.ratio > 2 ? ' ***' : e.ratio > 1.5 ? ' **' : '';
  console.log(`    ${e.type.padEnd(30)} under=${e.underPct.toFixed(0)}% exact=${e.exactPct.toFixed(0)}% ratio=${e.ratio.toFixed(2)}${marker}`);
}
console.log('  Weapon types enriched in exact-match units:');
for (const e of enrichment.slice(-10)) {
  console.log(`    ${e.type.padEnd(30)} under=${e.underPct.toFixed(0)}% exact=${e.exactPct.toFixed(0)}% ratio=${e.ratio.toFixed(2)}`);
}
