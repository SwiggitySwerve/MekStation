#!/usr/bin/env npx tsx
/**
 * trace-def18.ts - Deep trace of units with defensiveFactor >= 1.7
 *
 * Goal: Understand why all high-defensiveFactor units are undercalculated.
 * Something about how defensive factor 1.8 is calculated or applied must be wrong.
 */
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');

// ---- Types ----
interface ValidationResult {
  unitId: string; chassis: string; model: string; tonnage: number;
  indexBV: number; calculatedBV: number | null; difference: number | null; percentDiff: number | null;
  status: string;
  breakdown?: {
    defensiveBV: number; offensiveBV: number; weaponBV: number; ammoBV: number;
    speedFactor: number; explosivePenalty: number; defensiveEquipBV: number;
    armorBV?: number; structureBV?: number; gyroBV?: number; defensiveFactor?: number;
  };
  issues: string[];
}
interface ValidationReport {
  summary: any;
  topDiscrepancies: ValidationResult[];
  allResults: ValidationResult[];
}
interface IndexUnit { id: string; chassis: string; model: string; tonnage: number; techBase: string; year: number; role: string; path: string; rulesLevel: string; cost: number; bv: number; }
interface IndexFile { version: string; generatedAt: string; totalUnits: number; units: IndexUnit[]; }
interface ArmorAllocation { [location: string]: number | { front: number; rear: number }; }
interface Equipment { id: string; location: string; }
interface UnitData {
  id: string; chassis: string; model: string; unitType: string; configuration: string;
  techBase: string; tonnage: number;
  engine: { type: string; rating: number };
  gyro: { type: string };
  cockpit: string;
  structure: { type: string };
  armor: { type: string; allocation: ArmorAllocation };
  heatSinks: { type: string; count: number };
  movement: { walk: number; jump: number };
  equipment: Equipment[];
  criticalSlots?: Record<string, (string | null)[]>;
}

// ---- Helper functions ----
function calcTotalArmor(a: ArmorAllocation): number {
  let t = 0;
  for (const v of Object.values(a)) {
    if (typeof v === 'number') t += v;
    else if (v && typeof v === 'object') t += (v.front || 0) + (v.rear || 0);
  }
  return t;
}

function tmmFromMP(mp: number): number {
  if (mp <= 2) return 0;
  if (mp <= 4) return 1;
  if (mp <= 6) return 2;
  if (mp <= 9) return 3;
  if (mp <= 17) return 4;
  if (mp <= 24) return 5;
  return 6;
}

function scanForDefensiveEquip(unit: UnitData): {
  hasStealth: boolean;
  hasNullSig: boolean;
  hasChameleon: boolean;
  hasVoidSig: boolean;
  hasECM: boolean;
  defEquipNames: string[];
  allCritNames: string[];
} {
  const result = {
    hasStealth: false,
    hasNullSig: false,
    hasChameleon: false,
    hasVoidSig: false,
    hasECM: false,
    defEquipNames: [] as string[],
    allCritNames: [] as string[],
  };

  // Check armor type
  const armorType = unit.armor?.type?.toUpperCase() || '';
  if (armorType.includes('STEALTH')) result.hasStealth = true;

  // Check equipment list
  for (const eq of unit.equipment || []) {
    const lo = eq.id.toLowerCase();
    if (lo.includes('null') && lo.includes('sig')) { result.hasNullSig = true; result.defEquipNames.push(eq.id); }
    if (lo.includes('void') && lo.includes('sig')) { result.hasVoidSig = true; result.defEquipNames.push(eq.id); }
    if (lo.includes('chameleon') && (lo.includes('shield') || lo.includes('polarization') || lo.includes('lps'))) { result.hasChameleon = true; result.defEquipNames.push(eq.id); }
    if (lo.includes('ecm') || lo.includes('guardian')) { result.hasECM = true; result.defEquipNames.push(eq.id); }
  }

  // Check critical slots
  if (unit.criticalSlots) {
    for (const [loc, slots] of Object.entries(unit.criticalSlots)) {
      for (const slot of slots) {
        if (!slot) continue;
        const lo = slot.toLowerCase();
        result.allCritNames.push(`${loc}: ${slot}`);
        if (lo.includes('null') && lo.includes('sig')) { result.hasNullSig = true; }
        if (lo.includes('void') && lo.includes('sig')) { result.hasVoidSig = true; }
        if (lo.includes('chameleon') && (lo.includes('shield') || lo.includes('polarization') || lo.includes('lps'))) { result.hasChameleon = true; }
        if (lo.includes('stealth')) { result.hasStealth = true; }
        if (lo.includes('ecm') || lo.includes('guardian')) { result.hasECM = true; }
      }
    }
  }

  return result;
}

// ---- Main ----
function main() {
  // 1. Read validation report
  const reportPath = path.join(ROOT, 'validation-output', 'bv-validation-report.json');
  if (!fs.existsSync(reportPath)) {
    console.error('ERROR: validation report not found at', reportPath);
    process.exit(1);
  }
  const report: ValidationReport = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

  // 2. Read index
  const indexPath = path.join(ROOT, 'public', 'data', 'units', 'battlemechs', 'index.json');
  const indexData: IndexFile = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  const indexMap = new Map<string, IndexUnit>();
  for (const u of indexData.units) indexMap.set(u.id, u);

  // 3. Find all units with defensiveFactor >= 1.7
  const highDefUnits = report.allResults.filter(r =>
    r.breakdown && r.breakdown.defensiveFactor !== undefined && r.breakdown.defensiveFactor >= 1.7
  );

  console.log('='.repeat(100));
  console.log(`TRACE: Units with defensiveFactor >= 1.7 (i.e., TMM >= 7 for defensive calc)`);
  console.log(`Found ${highDefUnits.length} units`);
  console.log('='.repeat(100));

  // Sort by defensiveFactor descending, then by gap
  highDefUnits.sort((a, b) => {
    const dfA = a.breakdown!.defensiveFactor!;
    const dfB = b.breakdown!.defensiveFactor!;
    if (dfB !== dfA) return dfB - dfA;
    return (a.difference || 0) - (b.difference || 0);
  });

  for (const result of highDefUnits) {
    const bd = result.breakdown!;
    const indexUnit = indexMap.get(result.unitId);
    if (!indexUnit) {
      console.log(`\n--- ${result.unitId}: NOT FOUND IN INDEX ---`);
      continue;
    }

    // Read unit data
    const unitPath = path.join(ROOT, 'public', 'data', 'units', 'battlemechs', indexUnit.path);
    let unit: UnitData | null = null;
    try {
      unit = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));
    } catch {
      console.log(`\n--- ${result.unitId}: COULD NOT READ UNIT FILE ---`);
      continue;
    }

    const scan = scanForDefensiveEquip(unit!);

    console.log('\n' + '='.repeat(100));
    console.log(`UNIT: ${result.chassis} ${result.model} (${result.unitId})`);
    console.log('='.repeat(100));

    // Basic info
    console.log(`  Tonnage: ${result.tonnage}t`);
    console.log(`  TechBase: ${unit!.techBase}`);
    console.log(`  Calculated BV: ${result.calculatedBV}  |  Reference BV: ${result.indexBV}  |  Gap: ${result.difference} (${result.percentDiff?.toFixed(2)}%)`);
    console.log(`  Status: ${result.status}`);
    if (result.issues?.length) console.log(`  Issues: ${result.issues.join('; ')}`);

    // Type info
    console.log('\n  --- Construction ---');
    console.log(`  Cockpit: ${unit!.cockpit}`);
    console.log(`  Engine: ${unit!.engine.type} (rating ${unit!.engine.rating})`);
    console.log(`  Gyro: ${unit!.gyro.type}`);
    console.log(`  Armor: ${unit!.armor.type}`);
    console.log(`  Structure: ${unit!.structure.type}`);
    console.log(`  Movement: walk=${unit!.movement.walk}, jump=${unit!.movement.jump}`);
    console.log(`  Heat Sinks: ${unit!.heatSinks.count} ${unit!.heatSinks.type}`);

    // Movement calculations
    const walkMP = unit!.movement.walk;
    const jumpMP = unit!.movement.jump || 0;
    const runMP = Math.ceil(walkMP * 1.5); // baseline, no MASC/SC
    const runTMM = tmmFromMP(runMP);
    const jumpTMM = jumpMP > 0 ? tmmFromMP(jumpMP) + 1 : 0;
    const baseTMM = Math.max(runTMM, jumpTMM);

    console.log('\n  --- TMM Calculation ---');
    console.log(`  Walk MP: ${walkMP}`);
    console.log(`  Run MP (ceil(walk*1.5)): ${runMP}`);
    console.log(`  Jump MP: ${jumpMP}`);
    console.log(`  Run TMM: ${runTMM} (from ${runMP} MP)`);
    console.log(`  Jump TMM: ${jumpTMM} (from ${jumpMP} MP, +1 for jump)`);
    console.log(`  Base TMM (max of run/jump): ${baseTMM}`);

    // Defensive equipment modifiers
    let tmmAdj = baseTMM;
    const tmmMods: string[] = [];
    if (scan.hasStealth) { tmmAdj += 2; tmmMods.push('stealth: +2'); }
    if (scan.hasNullSig) { tmmAdj += 2; tmmMods.push('null-sig: +2'); }
    if (scan.hasChameleon) { tmmAdj += 2; tmmMods.push('chameleon: +2'); }
    if (scan.hasVoidSig) {
      if (tmmAdj < 3) { tmmMods.push(`void-sig: set to 3 (was ${tmmAdj})`); tmmAdj = 3; }
      else if (tmmAdj === 3) { tmmAdj++; tmmMods.push('void-sig: +1 (was 3)'); }
      else { tmmMods.push(`void-sig: no effect (TMM already ${tmmAdj})`); }
    }
    const expectedDefFactor = 1 + tmmAdj / 10.0;

    console.log(`  TMM modifiers: ${tmmMods.length > 0 ? tmmMods.join(', ') : 'none'}`);
    console.log(`  Adjusted TMM: ${tmmAdj}`);
    console.log(`  Expected defFactor: ${expectedDefFactor}`);
    console.log(`  Actual defFactor from calc: ${bd.defensiveFactor}`);

    // Defensive BV breakdown
    console.log('\n  --- Defensive BV Breakdown ---');
    console.log(`  armorBV:           ${bd.armorBV}`);
    console.log(`  structureBV:       ${bd.structureBV}`);
    console.log(`  gyroBV:            ${bd.gyroBV}`);
    console.log(`  defEquipBV:        ${bd.defensiveEquipBV}`);
    console.log(`  explosivePenalty:  -${bd.explosivePenalty}`);
    const baseDef = (bd.armorBV || 0) + (bd.structureBV || 0) + (bd.gyroBV || 0) + bd.defensiveEquipBV - bd.explosivePenalty;
    console.log(`  baseDef (sum):     ${baseDef.toFixed(2)}`);
    console.log(`  defensiveFactor:   ${bd.defensiveFactor}`);
    console.log(`  totalDefensiveBV:  ${bd.defensiveBV.toFixed(2)}`);
    console.log(`  Check: baseDef * defF = ${(baseDef * bd.defensiveFactor!).toFixed(2)}`);

    // Offensive BV breakdown
    console.log('\n  --- Offensive BV Breakdown ---');
    console.log(`  weaponBV:     ${bd.weaponBV}`);
    console.log(`  ammoBV:       ${bd.ammoBV}`);
    console.log(`  speedFactor:  ${bd.speedFactor}`);
    console.log(`  offensiveBV:  ${bd.offensiveBV.toFixed(2)}`);

    // Total ArmPts
    const totalArmor = calcTotalArmor(unit!.armor.allocation);
    console.log(`\n  Total armor points: ${totalArmor}`);

    // Defensive equipment found
    console.log('\n  --- Defensive Factor Equipment ---');
    console.log(`  Stealth armor: ${scan.hasStealth}`);
    console.log(`  Null Signature System: ${scan.hasNullSig}`);
    console.log(`  Chameleon LPS: ${scan.hasChameleon}`);
    console.log(`  Void Signature System: ${scan.hasVoidSig}`);
    console.log(`  ECM: ${scan.hasECM}`);
    if (scan.defEquipNames.length > 0) {
      console.log(`  Equipment IDs: ${scan.defEquipNames.join(', ')}`);
    }

    // List relevant crits (filter for stealth/null-sig/void-sig/chameleon/ecm)
    const relevantCrits = scan.allCritNames.filter(c => {
      const lo = c.toLowerCase();
      return lo.includes('stealth') || lo.includes('null') || lo.includes('void') ||
             lo.includes('chameleon') || lo.includes('ecm') || lo.includes('guardian') ||
             lo.includes('angel') || lo.includes('watchdog');
    });
    if (relevantCrits.length > 0) {
      console.log(`  Relevant critical slots:`);
      for (const c of relevantCrits) console.log(`    ${c}`);
    }

    // What-if analysis: recalculate with different defensiveFactor values
    console.log('\n  --- What-If Analysis ---');
    const gap = (result.calculatedBV || 0) - result.indexBV;
    console.log(`  Current gap: ${gap} (calc=${result.calculatedBV}, ref=${result.indexBV})`);

    // Try removing the stealth/null-sig/chameleon/void-sig bonus entirely
    const tmmWithoutSpecial = baseTMM;
    const defFactorWithoutSpecial = 1 + tmmWithoutSpecial / 10.0;
    const defBVWithoutSpecial = baseDef * defFactorWithoutSpecial;
    const totalBVWithoutSpecial = defBVWithoutSpecial + bd.offensiveBV;
    console.log(`  If no stealth/null/chameleon/void TMM bonus (defF=${defFactorWithoutSpecial.toFixed(1)}): defBV=${defBVWithoutSpecial.toFixed(1)}, total=${Math.round(totalBVWithoutSpecial)}`);

    // What if defF was 1 less (e.g., 1.7 instead of 1.8)
    const defFactorMinus1 = bd.defensiveFactor! - 0.1;
    const defBVMinus1 = baseDef * defFactorMinus1;
    const totalBVMinus1 = defBVMinus1 + bd.offensiveBV;
    console.log(`  If defF=${defFactorMinus1.toFixed(1)}: defBV=${defBVMinus1.toFixed(1)}, total=${Math.round(totalBVMinus1)}, gap=${Math.round(totalBVMinus1) - result.indexBV}`);

    // What if defF was 2 less (e.g., 1.6 instead of 1.8)
    const defFactorMinus2 = bd.defensiveFactor! - 0.2;
    const defBVMinus2 = baseDef * defFactorMinus2;
    const totalBVMinus2 = defBVMinus2 + bd.offensiveBV;
    console.log(`  If defF=${defFactorMinus2.toFixed(1)}: defBV=${defBVMinus2.toFixed(1)}, total=${Math.round(totalBVMinus2)}, gap=${Math.round(totalBVMinus2) - result.indexBV}`);

    // What defF would make the BV exact?
    // totalBV = defBV + offBV = baseDef * defF + offBV = indexBV
    // => defF = (indexBV - offBV) / baseDef
    if (baseDef > 0) {
      const idealDefF = (result.indexBV - bd.offensiveBV) / baseDef;
      console.log(`  Ideal defF to match reference BV: ${idealDefF.toFixed(4)} (TMM ~${((idealDefF - 1) * 10).toFixed(1)})`);
    }

    // What if the ENTIRE baseDef (before defF) was off?
    // Check: does baseDef * defF actually equal defensiveBV?
    const checkDefBV = baseDef * bd.defensiveFactor!;
    if (Math.abs(checkDefBV - bd.defensiveBV) > 0.01) {
      console.log(`  WARNING: baseDef * defF = ${checkDefBV.toFixed(2)} != defensiveBV = ${bd.defensiveBV.toFixed(2)} (rounding or extra components?)`);
    }

    // What if the offensive BV is wrong? Try to find what offBV would make it exact
    const idealOffBV = result.indexBV - bd.defensiveBV;
    console.log(`  If defensive is correct, ideal offensiveBV = ${idealOffBV.toFixed(1)} (actual: ${bd.offensiveBV.toFixed(1)}, diff: ${(idealOffBV - bd.offensiveBV).toFixed(1)})`);

    // Cockpit modifier check
    const cockpitType = unit!.cockpit.toUpperCase();
    let cockpitMod = 1.0;
    if (cockpitType.includes('SMALL')) cockpitMod = 0.95;
    else if (cockpitType.includes('TORSO')) cockpitMod = 0.95;
    else if (cockpitType.includes('INTERFACE')) cockpitMod = 1.3;
    console.log(`  Cockpit modifier: ${cockpitMod} (type: ${unit!.cockpit})`);

    // Reverse engineer: what's the pre-cockpit BV?
    if (result.calculatedBV && cockpitMod !== 1.0) {
      console.log(`  Pre-cockpit BV (calc): ${(result.calculatedBV / cockpitMod).toFixed(1)}`);
      console.log(`  Pre-cockpit BV (ref): ${(result.indexBV / cockpitMod).toFixed(1)}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(100));
  console.log('SUMMARY');
  console.log('='.repeat(100));
  console.log(`Total units with defensiveFactor >= 1.7: ${highDefUnits.length}`);

  const undercalc = highDefUnits.filter(r => (r.difference || 0) < 0);
  const overcalc = highDefUnits.filter(r => (r.difference || 0) > 0);
  const exact = highDefUnits.filter(r => (r.difference || 0) === 0);
  console.log(`  Undercalculated: ${undercalc.length}`);
  console.log(`  Overcalculated: ${overcalc.length}`);
  console.log(`  Exact: ${exact.length}`);

  if (undercalc.length > 0) {
    const avgGap = undercalc.reduce((s, r) => s + (r.difference || 0), 0) / undercalc.length;
    console.log(`  Average undercalc gap: ${avgGap.toFixed(1)}`);
  }

  // Aggregate patterns
  const defFactors = new Map<number, { count: number; avgGap: number; units: string[] }>();
  for (const r of highDefUnits) {
    const df = r.breakdown!.defensiveFactor!;
    if (!defFactors.has(df)) defFactors.set(df, { count: 0, avgGap: 0, units: [] });
    const entry = defFactors.get(df)!;
    entry.count++;
    entry.avgGap += (r.difference || 0);
    entry.units.push(`${r.chassis} ${r.model}`);
  }
  console.log('\n  By defensiveFactor:');
  for (const [df, data] of [...defFactors.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`    defF=${df}: ${data.count} units, avg gap=${(data.avgGap / data.count).toFixed(1)}, units: ${data.units.join(', ')}`);
  }

  // Check: do stealth units have a specific pattern?
  console.log('\n  Equipment patterns among high-defF units:');
  let stealthCount = 0, nullSigCount = 0, chameleonCount = 0, voidSigCount = 0;
  for (const r of highDefUnits) {
    const indexUnit = indexMap.get(r.unitId);
    if (!indexUnit) continue;
    const unitPath = path.join(ROOT, 'public', 'data', 'units', 'battlemechs', indexUnit.path);
    try {
      const unit: UnitData = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));
      const scan = scanForDefensiveEquip(unit);
      if (scan.hasStealth) stealthCount++;
      if (scan.hasNullSig) nullSigCount++;
      if (scan.hasChameleon) chameleonCount++;
      if (scan.hasVoidSig) voidSigCount++;
    } catch {}
  }
  console.log(`    Stealth armor: ${stealthCount}/${highDefUnits.length}`);
  console.log(`    Null Signature: ${nullSigCount}/${highDefUnits.length}`);
  console.log(`    Chameleon LPS: ${chameleonCount}/${highDefUnits.length}`);
  console.log(`    Void Signature: ${voidSigCount}/${highDefUnits.length}`);
}

main();
