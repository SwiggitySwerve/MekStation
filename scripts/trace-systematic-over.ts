/**
 * Deep trace overcalculated 1-5% units to find systematic patterns.
 * Look at armorBV, structureBV, gyroBV individually and compare
 * against what they should be.
 */
import * as fs from 'fs';
import * as path from 'path';
import { STRUCTURE_POINTS_TABLE } from '../src/types/construction/InternalStructureType';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'));

function loadUnit(unitId: string): any {
  const ie = idx.units.find((e: any) => e.id === unitId);
  if (!ie?.path) return null;
  try { return JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', ie.path), 'utf8')); } catch { return null; }
}

// Armor BV per point by location (TM p.302)
const ARMOR_BV_PER_POINT: Record<string, number> = {
  HEAD: 3.5, CENTER_TORSO: 2.0, CENTER_TORSO_REAR: 2.5,
  LEFT_TORSO: 1.5, LEFT_TORSO_REAR: 2.0, RIGHT_TORSO: 1.5, RIGHT_TORSO_REAR: 2.0,
  LEFT_ARM: 1.5, RIGHT_ARM: 1.5, LEFT_LEG: 1.0, RIGHT_LEG: 1.0,
  FRONT_LEFT_LEG: 1.0, FRONT_RIGHT_LEG: 1.0, REAR_LEFT_LEG: 1.0, REAR_RIGHT_LEG: 1.0,
};

// Structure BV per point by location (TM p.302)
const STRUCT_BV_PER_POINT: Record<string, number> = {
  HEAD: 3.0, CENTER_TORSO: 1.0,
  LEFT_TORSO: 1.0, RIGHT_TORSO: 1.0,
  LEFT_ARM: 1.0, RIGHT_ARM: 1.0,
  LEFT_LEG: 1.0, RIGHT_LEG: 1.0,
  FRONT_LEFT_LEG: 1.0, FRONT_RIGHT_LEG: 1.0, REAR_LEFT_LEG: 1.0, REAR_RIGHT_LEG: 1.0,
};

function calcArmorBV(unit: any): number {
  const alloc = unit.armor?.allocation || {};
  let total = 0;
  for (const [loc, val] of Object.entries(alloc)) {
    const locKey = loc.toUpperCase();
    if (typeof val === 'number') {
      total += (val as number) * (ARMOR_BV_PER_POINT[locKey] ?? 1.0);
    } else if (val && typeof val === 'object') {
      const front = (val as any).front || 0;
      const rear = (val as any).rear || 0;
      total += front * (ARMOR_BV_PER_POINT[locKey] ?? 1.5);
      total += rear * (ARMOR_BV_PER_POINT[locKey + '_REAR'] ?? 2.0);
    }
  }
  // Apply armor type multiplier
  const armorType = (unit.armor?.type || 'standard').toLowerCase();
  let armorMult = 1.0;
  if (armorType.includes('hardened')) armorMult = 2.0;
  else if (armorType.includes('reactive') || armorType.includes('reflective') || armorType.includes('ballistic')) armorMult = 1.5;
  else if (armorType.includes('ferro-lamellor') || armorType.includes('anti-penetrative')) armorMult = 1.2;
  else if (armorType.includes('heat-dissipating')) armorMult = 1.1;
  // Standard, FF, LFF, HFF, etc. = 1.0
  return total * armorMult;
}

function calcStructBV(unit: any): number {
  const tonnage = unit.tonnage;
  const sp = STRUCTURE_POINTS_TABLE[tonnage as keyof typeof STRUCTURE_POINTS_TABLE];
  if (!sp) return 0;
  let total = 0;
  total += sp.head * (STRUCT_BV_PER_POINT['HEAD'] ?? 3.0);
  total += sp.centerTorso * (STRUCT_BV_PER_POINT['CENTER_TORSO'] ?? 1.0);
  total += sp.sideTorso * 2 * (STRUCT_BV_PER_POINT['LEFT_TORSO'] ?? 1.0);
  total += sp.arm * 2 * (STRUCT_BV_PER_POINT['LEFT_ARM'] ?? 1.0);
  total += sp.leg * 2 * (STRUCT_BV_PER_POINT['LEFT_LEG'] ?? 1.0);
  // Structure type multiplier
  const structType = (unit.structure?.type || 'standard').toLowerCase();
  let structMult = 1.0;
  if (structType.includes('endo') && structType.includes('composite')) structMult = 1.0;
  else if (structType.includes('endo')) structMult = 1.0;
  else if (structType.includes('composite')) structMult = 0.5;
  else if (structType.includes('reinforced')) structMult = 2.0;
  return total * structMult;
}

const valid = report.allResults.filter((x: any) => x.status !== 'error' && x.percentDiff !== null);
const over1to5 = valid.filter((x: any) => x.percentDiff > 1 && x.percentDiff <= 5 && x.breakdown);

console.log(`=== OVERCALCULATED 1-5% (${over1to5.length} units) ===\n`);

// Check if our armor/struct/gyro matches the breakdown
let armorDiffTotal = 0, armorDiffCount = 0;
let structDiffTotal = 0, structDiffCount = 0;
let gyroDiffCount = 0;

const armorDiffs: { uid: string; pct: number; diff: number; ourArmor: number; theirArmor: number }[] = [];
const structDiffs: { uid: string; pct: number; diff: number; ourStruct: number; theirStruct: number }[] = [];

for (const u of over1to5) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const b = u.breakdown;

  const ourArmor = calcArmorBV(unit);
  const ourStruct = calcStructBV(unit);
  const armorDiff = b.armorBV - ourArmor;
  const structDiff = b.structureBV - ourStruct;

  if (Math.abs(armorDiff) > 0.5) {
    armorDiffs.push({ uid: u.unitId, pct: u.percentDiff, diff: armorDiff, ourArmor, theirArmor: b.armorBV });
    armorDiffCount++;
    armorDiffTotal += armorDiff;
  }
  if (Math.abs(structDiff) > 0.5) {
    structDiffs.push({ uid: u.unitId, pct: u.percentDiff, diff: structDiff, ourStruct, theirStruct: b.structureBV });
    structDiffCount++;
    structDiffTotal += structDiff;
  }
}

console.log(`Armor BV mismatches: ${armorDiffCount}/${over1to5.length} (avg diff: ${(armorDiffTotal / Math.max(armorDiffCount, 1)).toFixed(1)})`);
for (const d of armorDiffs.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 10)) {
  console.log(`  ${d.uid.padEnd(45)} +${d.pct.toFixed(1)}%  armor: our=${d.ourArmor.toFixed(1)} vs calc=${d.theirArmor.toFixed(1)} diff=${d.diff.toFixed(1)}`);
}

console.log(`\nStruct BV mismatches: ${structDiffCount}/${over1to5.length} (avg diff: ${(structDiffTotal / Math.max(structDiffCount, 1)).toFixed(1)})`);
for (const d of structDiffs.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 10)) {
  console.log(`  ${d.uid.padEnd(45)} +${d.pct.toFixed(1)}%  struct: our=${d.ourStruct.toFixed(1)} vs calc=${d.theirStruct.toFixed(1)} diff=${d.diff.toFixed(1)}`);
}

// Also check undercalculated - are any components consistently wrong?
const under1to5 = valid.filter((x: any) => x.percentDiff < -1 && x.percentDiff >= -5 && x.breakdown);
console.log(`\n=== UNDERCALCULATED 1-5% (${under1to5.length} units) ===`);

let underArmorDiffCount = 0, underStructDiffCount = 0;
const underArmorDiffs: typeof armorDiffs = [];

for (const u of under1to5) {
  const unit = loadUnit(u.unitId);
  if (!unit) continue;
  const b = u.breakdown;

  const ourArmor = calcArmorBV(unit);
  const ourStruct = calcStructBV(unit);
  const armorDiff = b.armorBV - ourArmor;
  const structDiff = b.structureBV - ourStruct;

  if (Math.abs(armorDiff) > 0.5) {
    underArmorDiffs.push({ uid: u.unitId, pct: u.percentDiff, diff: armorDiff, ourArmor, theirArmor: b.armorBV });
    underArmorDiffCount++;
  }
  if (Math.abs(structDiff) > 0.5) {
    underStructDiffCount++;
  }
}

console.log(`Armor BV mismatches: ${underArmorDiffCount}/${under1to5.length}`);
console.log(`Struct BV mismatches: ${underStructDiffCount}/${under1to5.length}`);
for (const d of underArmorDiffs.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 10)) {
  console.log(`  ${d.uid.padEnd(45)} ${d.pct.toFixed(1)}%  armor: our=${d.ourArmor.toFixed(1)} vs calc=${d.theirArmor.toFixed(1)} diff=${d.diff.toFixed(1)}`);
}

// GLOBAL: check if there's a consistent rounding difference
console.log('\n=== ROUNDING CHECK ===');
const allWithBreakdown = valid.filter((x: any) => x.breakdown);
let totalRoundDiff = 0;
let roundDiffCount = 0;
for (const u of allWithBreakdown) {
  const b = u.breakdown;
  const cockpit = b.cockpitModifier ?? 1;
  const rawBV = (b.defensiveBV + b.offensiveBV) * cockpit;
  const rounded = Math.round(rawBV);
  if (rounded !== u.calculatedBV) {
    totalRoundDiff++;
  }
}
console.log(`Rounding mismatches (rawBV != calcBV): ${totalRoundDiff}/${allWithBreakdown.length}`);
