/**
 * Deep trace of defensive BV components for 1-2% undercalculated units.
 * Goal: find the ~10-15 BV systematic shortfall source.
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

// Standard structure table from TechManual
const STANDARD_STRUCTURE: Record<number, { head: number; ct: number; st: number; arm: number; leg: number }> = {
  20: { head: 3, ct: 6, st: 5, arm: 3, leg: 4 },
  25: { head: 3, ct: 8, st: 6, arm: 4, leg: 6 },
  30: { head: 3, ct: 10, st: 7, arm: 5, leg: 7 },
  35: { head: 3, ct: 11, st: 8, arm: 6, leg: 8 },
  40: { head: 3, ct: 12, st: 10, arm: 6, leg: 10 },
  45: { head: 3, ct: 14, st: 11, arm: 7, leg: 11 },
  50: { head: 3, ct: 16, st: 12, arm: 8, leg: 12 },
  55: { head: 3, ct: 18, st: 13, arm: 9, leg: 13 },
  60: { head: 3, ct: 20, st: 14, arm: 10, leg: 14 },
  65: { head: 3, ct: 21, st: 15, arm: 10, leg: 15 },
  70: { head: 3, ct: 22, st: 15, arm: 11, leg: 15 },
  75: { head: 3, ct: 23, st: 16, arm: 12, leg: 16 },
  80: { head: 3, ct: 25, st: 17, arm: 13, leg: 17 },
  85: { head: 3, ct: 27, st: 18, arm: 14, leg: 18 },
  90: { head: 3, ct: 29, st: 19, arm: 15, leg: 19 },
  95: { head: 3, ct: 30, st: 20, arm: 15, leg: 20 },
  100: { head: 3, ct: 31, st: 21, arm: 17, leg: 21 },
};

function getTotalStructure(tonnage: number): number {
  const s = STANDARD_STRUCTURE[tonnage];
  if (!s) return 0;
  return s.head + s.ct + s.st * 2 + s.arm * 2 + s.leg * 2;
}

function getTotalArmor(unit: any): number {
  if (!unit.armor?.allocation) return 0;
  let total = 0;
  for (const [loc, val] of Object.entries(unit.armor.allocation)) {
    if (typeof val === 'number') total += val;
    else if (val && typeof val === 'object') total += ((val as any).front || 0) + ((val as any).rear || 0);
  }
  return total;
}

// Engine type map
function getEngineMultiplier(engineType: string): number {
  const t = engineType?.toUpperCase() || '';
  if (t.includes('XXL')) return 0.25;
  if (t.includes('XL') && t.includes('CLAN')) return 0.75;
  if (t.includes('XL')) return 0.5;
  if (t.includes('LIGHT')) return 0.75;
  if (t.includes('COMPACT')) return 1.0;
  return 1.0; // STANDARD, ICE, etc.
}

function getGyroMultiplier(gyroType: string): number {
  const t = gyroType?.toUpperCase() || '';
  if (t.includes('HEAVY') || t.includes('HEAVY-DUTY')) return 1.0;
  return 0.5; // STANDARD, XL, COMPACT
}

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null);
const under1to2 = valid.filter((x: any) => x.percentDiff >= -2 && x.percentDiff < -1 && x.breakdown);

console.log(`=== TRACING ${under1to2.length} UNITS AT 1-2% UNDERCALCULATED ===\n`);

// For each unit, independently compute defensive components and compare
let armorDiffs: number[] = [];
let structDiffs: number[] = [];
let gyroDiffs: number[] = [];
let defFactorDiffs: number[] = [];
let totalBaseDiffs: number[] = [];
let offGaps: number[] = [];

const detailed: Array<{
  id: string; tonnage: number; diff: number; pct: number;
  reportArmorBV: number; calcArmorBV: number; armorDiff: number;
  reportStructBV: number; calcStructBV: number; structDiff: number;
  reportGyroBV: number; calcGyroBV: number; gyroDiff: number;
  reportDefFactor: number;
  reportDefEquip: number; reportExplosive: number;
  baseDefDiff: number;
  offGap: number;
  engineType: string; armorType: string; structType: string; gyroType: string;
}> = [];

for (const u of under1to2) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const b = u.breakdown;

  const totalArmor = getTotalArmor(unit);
  const totalStruct = getTotalStructure(unit.tonnage);

  const armorType = (unit.armor?.type || 'standard').toLowerCase();
  const structType = (unit.structure?.type || 'standard').toLowerCase();
  const engineType = unit.engine?.type || 'STANDARD';
  const gyroType = (unit.gyro?.type || 'standard').toLowerCase();

  // Armor BV: totalArmorPoints * 2.5 * armorMultiplier * BAR/10
  // For standard armor (mult=1, BAR=10): armorBV = totalArmor * 2.5
  const armorMult = armorType.includes('hardened') ? 2.0 :
    armorType.includes('reactive') ? 1.5 :
    armorType.includes('reflective') || armorType.includes('laser-reflective') ? 1.5 :
    armorType.includes('ballistic') ? 1.5 :
    armorType.includes('ferro-lamellor') ? 1.2 :
    armorType.includes('anti-penetrative') ? 1.2 :
    armorType.includes('heat-dissipating') ? 1.1 : 1.0;
  // Compute as the code does: round(pts * 2.5 * mult * BAR) / 10 where BAR=10 for normal
  const calcArmorBV = Math.round(totalArmor * 2.5 * armorMult * 10) / 10;

  // Structure BV
  const structMult = structType.includes('reinforced') ? 2.0 :
    structType.includes('composite') || structType.includes('industrial') ? 0.5 : 1.0;
  const engMult = getEngineMultiplier(engineType);
  const calcStructBV = totalStruct * 1.5 * structMult * engMult;

  // Gyro BV
  const gyroMult = getGyroMultiplier(gyroType);
  const calcGyroBV = unit.tonnage * gyroMult;

  const armorDiff = b.armorBV - calcArmorBV;
  const structDiff = b.structureBV - calcStructBV;
  const gyroDiff = b.gyroBV - calcGyroBV;
  const baseDefDiff = armorDiff + structDiff + gyroDiff;

  // Check offensive gap: what base offensive BV would be needed?
  const cockpit = b.cockpitModifier ?? 1;
  const refBase = u.indexBV / cockpit;
  const neededOff = refBase - b.defensiveBV;
  const currentOff = b.offensiveBV;
  const offGap = neededOff - currentOff;

  armorDiffs.push(armorDiff);
  structDiffs.push(structDiff);
  gyroDiffs.push(gyroDiff);
  defFactorDiffs.push(b.defensiveFactor);
  totalBaseDiffs.push(baseDefDiff);
  offGaps.push(offGap);

  detailed.push({
    id: u.unitId, tonnage: unit.tonnage, diff: u.difference, pct: u.percentDiff,
    reportArmorBV: b.armorBV, calcArmorBV, armorDiff,
    reportStructBV: b.structureBV, calcStructBV, structDiff,
    reportGyroBV: b.gyroBV, calcGyroBV, gyroDiff,
    reportDefFactor: b.defensiveFactor,
    reportDefEquip: b.defensiveEquipBV ?? (b.defEquipBV ?? 0),
    reportExplosive: b.explosivePenalty,
    baseDefDiff,
    offGap,
    engineType, armorType, structType, gyroType,
  });
}

// Sort by absolute offensive gap (largest first)
detailed.sort((a, b) => Math.abs(b.offGap) - Math.abs(a.offGap));

// Summary stats
console.log('=== COMPONENT VERIFICATION ===');
const nonZeroArmorDiff = armorDiffs.filter(d => Math.abs(d) > 0.1);
const nonZeroStructDiff = structDiffs.filter(d => Math.abs(d) > 0.1);
const nonZeroGyroDiff = gyroDiffs.filter(d => Math.abs(d) > 0.1);
console.log(`  Armor BV mismatches (>0.1): ${nonZeroArmorDiff.length}/${detailed.length}`);
console.log(`  Structure BV mismatches: ${nonZeroStructDiff.length}/${detailed.length}`);
console.log(`  Gyro BV mismatches: ${nonZeroGyroDiff.length}/${detailed.length}`);

if (nonZeroArmorDiff.length > 0) {
  const avg = nonZeroArmorDiff.reduce((s, d) => s + d, 0) / nonZeroArmorDiff.length;
  console.log(`    Armor avg diff: ${avg.toFixed(1)}`);
}
if (nonZeroStructDiff.length > 0) {
  const avg = nonZeroStructDiff.reduce((s, d) => s + d, 0) / nonZeroStructDiff.length;
  console.log(`    Structure avg diff: ${avg.toFixed(1)}`);
}

// Check: is the gap purely on the offensive side?
const pureOffGap = detailed.filter(d => Math.abs(d.baseDefDiff) < 1 && d.offGap > 0);
console.log(`\n  Pure offensive gap (def matches, off short): ${pureOffGap.length}/${detailed.length}`);

// Offensive gap stats
const avgOffGap = offGaps.reduce((s, g) => s + g, 0) / offGaps.length;
console.log(`  Average offensive gap: ${avgOffGap.toFixed(1)} BV`);

// Distribution of offensive gap sources
console.log('\n=== TOP 20 UNIT TRACES ===');
for (const d of detailed.slice(0, 20)) {
  console.log(`\n  ${d.id} (${d.tonnage}t) diff=${d.diff} (${d.pct.toFixed(1)}%)`);
  console.log(`    armor:  report=${d.reportArmorBV.toFixed(1)} calc=${d.calcArmorBV.toFixed(1)} diff=${d.armorDiff.toFixed(1)}`);
  console.log(`    struct: report=${d.reportStructBV.toFixed(1)} calc=${d.calcStructBV.toFixed(1)} diff=${d.structDiff.toFixed(1)}`);
  console.log(`    gyro:   report=${d.reportGyroBV.toFixed(1)} calc=${d.calcGyroBV.toFixed(1)} diff=${d.gyroDiff.toFixed(1)}`);
  console.log(`    defEquip=${d.reportDefEquip} explosive=${d.reportExplosive} defFactor=${d.reportDefFactor.toFixed(2)}`);
  console.log(`    engine=${d.engineType} armor=${d.armorType} struct=${d.structType} gyro=${d.gyroType}`);
  console.log(`    offGap=${d.offGap.toFixed(1)} (positive means offensive BV too low)`);
}

// Check: what's the breakdown of where the shortfall comes from?
// For each unit, decompose the total BV gap into: defensive gap vs offensive gap
console.log('\n=== GAP DECOMPOSITION ===');
let defShortCount = 0;
let offShortCount = 0;
let bothShortCount = 0;

for (const u of under1to2) {
  const b = u.breakdown;
  if (!b) continue;
  const cockpit = b.cockpitModifier ?? 1;
  const refBase = u.indexBV / cockpit;

  // Is our total base BV (def + off) too low?
  // totalBase = defBV + offBV
  // refBase ≈ refDef + refOff
  // Can't separate refDef and refOff, but we can check:
  // If our defBV is X too low, we'd need offBV to be X higher to compensate
  // But the gap is only ~10-20 BV total, so small deviations in either matter

  // Check: if we could get the exact MegaMek defensive BV, what would it be?
  // We can't, but we CAN check if our formula produces the right numbers

  // Another approach: check the speed factor sensitivity
  // If speed factor is off by 0.01, how much does that affect?
  const baseOff = (b.weaponBV ?? 0) + (b.ammoBV ?? 0) + (b.weightBonus ?? 0) + (b.physicalWeaponBV ?? 0) + (b.offEquipBV ?? 0);
  const sfSensitivity = baseOff * 0.01; // BV change per 0.01 SF change

  // If defensive factor is off by 0.01...
  const baseDef = (b.armorBV ?? 0) + (b.structureBV ?? 0) + (b.gyroBV ?? 0) + (b.defensiveEquipBV ?? 0) - (b.explosivePenalty ?? 0);
  const dfSensitivity = baseDef * 0.01;

  if (sfSensitivity > dfSensitivity) offShortCount++;
  else defShortCount++;
}
console.log(`  Offensive more sensitive: ${offShortCount}`);
console.log(`  Defensive more sensitive: ${defShortCount}`);

// Check: what speed factors are being used vs what MegaMek table would give
console.log('\n=== SPEED FACTOR TABLE CHECK ===');
// MegaMek's offensive speed factor table (from MekBVCalculator source):
// mp → factor mapping. Our formula: round(pow(1+(mp-5)/10, 1.2)*100)/100
// Generate for comparison
for (let mp = 1; mp <= 15; mp++) {
  const sf = Math.round(Math.pow(1 + (mp - 5) / 10.0, 1.2) * 100.0) / 100.0;
  console.log(`  MP=${mp.toString().padStart(2)}: SF=${sf.toFixed(2)}`);
}

// Check: how many units have each speed factor?
console.log('\n=== SPEED FACTOR DISTRIBUTION (1-2% under) ===');
const sfCounts: Record<string, number> = {};
for (const u of under1to2) {
  const sf = u.breakdown?.speedFactor?.toFixed(2) || 'unknown';
  sfCounts[sf] = (sfCounts[sf] || 0) + 1;
}
for (const [sf, count] of Object.entries(sfCounts).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))) {
  console.log(`  SF=${sf}: ${count} units`);
}

// Also check: what heat efficiency values are being used?
console.log('\n=== HEAT EFFICIENCY vs WEAPON BV ===');
for (const u of under1to2.slice(0, 10)) {
  const b = u.breakdown;
  if (!b) continue;
  console.log(`  ${u.unitId.substring(0, 35).padEnd(35)} HE=${b.heatEfficiency} weapBV=${b.weaponBV?.toFixed(0)} rawWeapBV=${b.rawWeaponBV?.toFixed(0)} halvedBV=${b.halvedWeaponBV?.toFixed(0)} halvedCt=${b.halvedWeaponCount}/${b.weaponCount}`);
}
