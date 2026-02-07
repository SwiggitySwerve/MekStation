/**
 * Check structure BV, gyro BV, and engine multiplier accuracy vs MegaMek.
 *
 * Known differences found:
 * 1. XXL Engine sideTorsoSlots: our code has 3, but IS XXL=6, Clan XXL=4
 *    - BV impact: validate-bv.ts has Clan XXL override to 0.5, but EngineType.XXL has wrong sideTorsoSlots
 * 2. Gyro 'none' not in GYRO_BV_MULTIPLIERS → defaults to 0.5 instead of 0
 * 3. Missing Endo Steel variants from structure multiplier table
 */

import * as fs from 'fs';
import * as path from 'path';

const reportPath = path.resolve(__dirname, '../validation-output/bv-validation-report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const indexData = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf-8'));
const unitPathMap = new Map<string, string>();
for (const u of indexData.units) {
  unitPathMap.set(u.id, path.join(unitsDir, u.path));
}

console.log("=== INVESTIGATION: Structure BV, Gyro BV, Engine Multipliers ===\n");

// ==========================================
// 1. CHECK GYRO MULTIPLIER MAPPING
// ==========================================

console.log("--- 1. Gyro Multiplier Comparison ---\n");

console.log("MegaMek getGyroMultiplier():");
console.log("  GYRO_HEAVY_DUTY  → 1.0");
console.log("  GYRO_NONE (non-interface) → 0.0");
console.log("  All others (Standard, XL, Compact, Superheavy) → 0.5");

console.log("\nOur GYRO_BV_MULTIPLIERS:");
console.log("  standard   → 0.5 ✓");
console.log("  xl         → 0.5 ✓");
console.log("  compact    → 0.5 ✓");
console.log("  heavy-duty → 1.0 ✓");
console.log("  superheavy → MISSING (defaults to 0.5, which is correct)");
console.log("  none       → MISSING (defaults to 0.5, should be 0.0) *** BUG ***");

// Count units with interface cockpit / gyro none
let gyroNoneCount = 0;
let gyroNoneUnits: string[] = [];
for (const valUnit of report.allResults) {
  const unitPath = unitPathMap.get(valUnit.unitId);
  if (!unitPath || !fs.existsSync(unitPath)) continue;
  try {
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));
    const cockpit = (unit.cockpit || '').toUpperCase();
    const gyro = (unit.gyro?.type || '').toUpperCase();
    if (cockpit.includes('INTERFACE') || gyro.includes('NONE')) {
      gyroNoneCount++;
      gyroNoneUnits.push(`${valUnit.unitId} (${unit.tonnage}t, cockpit: ${unit.cockpit}, gyro: ${unit.gyro?.type})`);
    }
  } catch (e) { /* skip */ }
}
console.log(`\nUnits with interface cockpit / gyro none: ${gyroNoneCount}`);
for (const u of gyroNoneUnits.slice(0, 10)) {
  console.log(`  ${u}`);
}

// ==========================================
// 2. CHECK ENGINE BV MULTIPLIER MAPPING
// ==========================================

console.log("\n--- 2. Engine BV Multiplier Comparison ---\n");

console.log("MegaMek getBVMultiplier() (via side torso crit slots):");
console.log("  IS XXL (6 side crits)    → 0.25");
console.log("  IS XL (3 side crits)     → 0.50");
console.log("  Clan XXL (4 side crits)  → 0.50");
console.log("  IS Light (2 side crits)  → 0.75");
console.log("  Clan XL (2 side crits)   → 0.75");
console.log("  Standard/Compact/ICE/etc → 1.00");

console.log("\nOur ENGINE_BV_MULTIPLIERS:");
console.log("  STANDARD   → 1.0  ✓");
console.log("  XL_IS      → 0.5  ✓");
console.log("  XL_CLAN    → 0.75 ✓");
console.log("  LIGHT      → 0.75 ✓");
console.log("  XXL        → 0.25 (IS only, Clan XXL handled via override in validate-bv.ts)");
console.log("  COMPACT    → 1.0  ✓");
console.log("  ICE        → 1.0  ✓");
console.log("  FUEL_CELL  → 1.0  ✓");
console.log("  FISSION    → 1.0  ✓");

console.log("\nNOTE: EngineType enum has a SINGLE EngineType.XXL for both IS and Clan.");
console.log("  IS XXL sideTorsoSlots defined as 3 in our code (MegaMek has 6)");
console.log("  Clan XXL sideTorsoSlots = 4 in MegaMek");
console.log("  BV multiplier: validate-bv.ts overrides Clan XXL to 0.5 → ✓");
console.log("  But the EngineDefinition sideTorsoSlots=3 may affect CASE/explosive penalty logic!");

// Check how many Clan XXL units exist
let clanXXLCount = 0;
let isXXLCount = 0;
const clanXXLUnits: string[] = [];
for (const valUnit of report.allResults) {
  const unitPath = unitPathMap.get(valUnit.unitId);
  if (!unitPath || !fs.existsSync(unitPath)) continue;
  try {
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));
    const engineStr = (unit.engine?.type || '').toUpperCase().replace(/[_\s-]+/g, '');
    if (engineStr === 'XXL' || engineStr === 'XXLENGINE') {
      if (unit.techBase === 'CLAN') {
        clanXXLCount++;
        clanXXLUnits.push(`${valUnit.unitId} (diff: ${valUnit.difference}, ${valUnit.percentDiff?.toFixed(1)}%)`);
      } else {
        isXXLCount++;
      }
    }
  } catch (e) { /* skip */ }
}
console.log(`\nClan XXL units: ${clanXXLCount}, IS XXL units: ${isXXLCount}`);
for (const u of clanXXLUnits.slice(0, 10)) {
  console.log(`  ${u}`);
}

// ==========================================
// 3. CHECK STRUCTURE BV MULTIPLIER
// ==========================================

console.log("\n--- 3. Structure BV Multiplier Comparison ---\n");

console.log("MegaMek processStructure() type multipliers:");
console.log("  T_STRUCTURE_INDUSTRIAL → 0.5");
console.log("  T_STRUCTURE_COMPOSITE  → 0.5");
console.log("  T_STRUCTURE_REINFORCED → 2.0");
console.log("  T_STRUCTURE_ENDO_STEEL → 1.0 (default, no special case)");
console.log("  Other (standard, etc)  → 1.0 (default)");
console.log("  + Blue Shield adds 0.2 to multiplier");

console.log("\nOur STRUCTURE_BV_MULTIPLIERS:");
console.log("  industrial  → 0.5 ✓");
console.log("  composite   → 0.5 ✓");
console.log("  reinforced  → 2.0 ✓");
console.log("  standard    → 1.0 ✓");
console.log("  endo-steel  → MISSING (defaults to 1.0 via ?? 1.0) → ✓ correct!");

// Count structure types
const structureCounts = new Map<string, number>();
for (const valUnit of report.allResults) {
  const unitPath = unitPathMap.get(valUnit.unitId);
  if (!unitPath || !fs.existsSync(unitPath)) continue;
  try {
    const unit = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));
    const st = unit.structure?.type || 'unknown';
    structureCounts.set(st, (structureCounts.get(st) ?? 0) + 1);
  } catch (e) { /* skip */ }
}
console.log("\nStructure types in our data:");
for (const [st, count] of [...structureCounts.entries()].sort((a, b) => b[1] - a[1])) {
  const mapped = st.toUpperCase().replace(/[_\s-]+/g, '');
  let mult: string;
  if (mapped.includes('INDUSTRIAL')) mult = '0.5';
  else if (mapped === 'COMPOSITE') mult = '0.5';
  else if (mapped.includes('REINFORCED')) mult = '2.0';
  else mult = '1.0';
  console.log(`  ${st}: ${count} units → multiplier ${mult}`);
}

// ==========================================
// 4. CHECK XXL SIDE TORSO SLOTS IMPACT ON CASE/EXPLOSIVE PENALTIES
// ==========================================

console.log("\n--- 4. XXL Side Torso Slots Impact on CASE Logic ---\n");

console.log("Our EngineType.XXL has sideTorsoSlots=3.");
console.log("In explosive penalty logic (hasExplosiveEquipmentPenalty):");
console.log("  Side torso CASE works when sideTorsoSlots < 3.");
console.log("  With sideTorsoSlots=3, CASE in side torso does NOT eliminate penalty.");
console.log("");
console.log("MegaMek IS XXL: 6 side torso crits → CASE does NOT help (≥3) → correct");
console.log("MegaMek Clan XXL: 4 side torso crits → CASE does NOT help (≥3) → correct");
console.log("Our code: XXL sideTorsoSlots=3 → CASE does NOT help (≥3) → CORRECT for both IS & Clan!");
console.log("  (The threshold is ≥3, and Clan XXL has 4, IS XXL has 6, we have 3 → all ≥3)");
console.log("  So the CASE logic is coincidentally correct even with wrong sideTorsoSlots.");

// ==========================================
// 5. QUANTIFY STRUCTURE BV FORMULA
// ==========================================

console.log("\n--- 5. Verify Structure BV Formula ---\n");
console.log("MegaMek: structureBV = totalInternal * 1.5 * structureMultiplier * engineMultiplier");
console.log("Our code: structureBV = totalStructurePoints * 1.5 * structureMultiplier * engineMultiplier ✓");
console.log("Formulas match.");

// Check our defensive BV calculation code
console.log("\nFrom battleValueCalculations.ts line 362:");
console.log("  structureBV = totalStructurePoints * 1.5 * structureMultiplier * engineMultiplier ✓");
console.log("\nFrom battleValueCalculations.ts line 364:");
console.log("  gyroBV = tonnage * gyroMultiplier ✓");

// ==========================================
// 6. AGGREGATE IMPACT ASSESSMENT
// ==========================================

console.log("\n--- 6. Impact Assessment Summary ---\n");

console.log("BUG 1: Gyro 'none' multiplier defaults to 0.5 instead of 0.0");
console.log(`  Affected units: ${gyroNoneCount}`);
if (gyroNoneCount > 0) {
  console.log("  Impact: Each affected unit gets tonnage * 0.5 extra defensive BV");
  console.log("  This would cause OVERCALCULATION (our BV too high)");
}

console.log("\nBUG 2: EngineType.XXL sideTorsoSlots=3 (should be 6 for IS, 4 for Clan)");
console.log("  Impact on BV multiplier: mitigated by override in validate-bv.ts");
console.log("  Impact on CASE logic: coincidentally correct (all ≥3)");
console.log("  Impact on BV: NONE for currently validated units");

console.log("\nNO BUG in: Structure multipliers, engine BV multipliers (with override), gyro standard/xl/compact/heavy-duty");
console.log("\nConclusion: These components do NOT explain the systematic 2.4% undercalculation.");
console.log("The gyro 'none' bug would cause overcalculation, not undercalculation.");
