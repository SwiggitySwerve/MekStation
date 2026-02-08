#!/usr/bin/env npx tsx
/**
 * Trace the exact defensive vs offensive BV gap.
 *
 * For 20 minor-discrepancy units, independently recalculates defensive BV
 * components (armorBV, structureBV, gyroBV) from raw unit data and compares
 * against the validation report's defensiveBV. Then derives expected offensive
 * BV from the total gap to determine which side the discrepancy is on.
 */
import * as fs from 'fs';
import * as path from 'path';

import { EngineType } from '../src/types/construction/EngineType';
import { STRUCTURE_POINTS_TABLE } from '../src/types/construction/InternalStructureType';
import {
  getArmorBVMultiplier,
  getStructureBVMultiplier,
  getGyroBVMultiplier,
  getEngineBVMultiplier,
} from '../src/types/validation/BattleValue';
import {
  calculateDefensiveBV,
  getCockpitModifier,
} from '../src/utils/construction/battleValueCalculations';

// ---------------------------------------------------------------------------
// Types (mirrored from validate-bv.ts)
// ---------------------------------------------------------------------------
interface IndexUnit {
  id: string; chassis: string; model: string; tonnage: number;
  techBase: string; path: string; bv: number;
}
interface IndexFile { units: IndexUnit[]; }
interface ArmorAllocation { [location: string]: number | { front: number; rear: number }; }
interface Equipment { id: string; location: string; }
interface UnitData {
  id: string; chassis: string; model: string; unitType: string;
  configuration: string; techBase: string; tonnage: number;
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
interface Breakdown {
  defensiveBV: number;
  offensiveBV: number;
  weaponBV: number;
  ammoBV: number;
  speedFactor: number;
  explosivePenalty: number;
  defensiveEquipBV: number;
}
interface ValidationResult {
  unitId: string; chassis: string; model: string; tonnage: number;
  indexBV: number; calculatedBV: number; difference: number;
  percentDiff: number; status: string; breakdown: Breakdown;
  issues: string[]; rootCause: string;
}

// ---------------------------------------------------------------------------
// Helper functions (same as validate-bv.ts)
// ---------------------------------------------------------------------------
function calcTotalArmor(a: ArmorAllocation): number {
  let t = 0;
  for (const v of Object.values(a)) {
    if (typeof v === 'number') t += v;
    else if (v && typeof v === 'object') t += (v.front || 0) + (v.rear || 0);
  }
  return t;
}

function calcTotalStructure(ton: number): number {
  const t = STRUCTURE_POINTS_TABLE[ton];
  if (!t) {
    const k = Object.keys(STRUCTURE_POINTS_TABLE).map(Number).sort((a, b) => a - b).filter(x => x <= ton).pop();
    if (k) { const t2 = STRUCTURE_POINTS_TABLE[k]; return t2.head + t2.centerTorso + t2.sideTorso * 2 + t2.arm * 2 + t2.leg * 2; }
    return 0;
  }
  return t.head + t.centerTorso + t.sideTorso * 2 + t.arm * 2 + t.leg * 2;
}

function mapEngineType(engineStr: string, techBase: string): EngineType {
  // Must match validate-bv.ts exactly: exact string matches on upper+stripped
  const u = engineStr.toUpperCase().replace(/[_\s-]+/g, '');
  if (u === 'XL' || u === 'XLENGINE') return techBase === 'CLAN' ? EngineType.XL_CLAN : EngineType.XL_IS;
  if (u === 'CLANXL' || u === 'CLAN_XL' || u === 'XLCLAN') return EngineType.XL_CLAN;
  if (u === 'LIGHT' || u === 'LIGHTENGINE') return EngineType.LIGHT;
  if (u === 'XXL' || u === 'XXLENGINE') return EngineType.XXL;
  if (u === 'COMPACT' || u === 'COMPACTENGINE') return EngineType.COMPACT;
  if (u === 'ICE' || u === 'INTERNALCOMBUSTION') return EngineType.ICE;
  if (u === 'FUELCELL' || u === 'FUEL_CELL') return EngineType.FUEL_CELL;
  if (u === 'FISSION') return EngineType.FISSION;
  return EngineType.STANDARD;
}

function mapArmorType(s: string): string {
  const u = s.toUpperCase().replace(/[_\s-]+/g, '');
  if (u.includes('HARDENED')) return 'hardened';
  if (u.includes('REACTIVE')) return 'reactive';
  if (u.includes('REFLECTIVE') || u.includes('LASERREFLECTIVE')) return 'reflective';
  if (u.includes('BALLISTICREINFORCED')) return 'ballistic-reinforced';
  if (u.includes('FERROLAMELLOR')) return 'ferro-lamellor';
  if (u.includes('STEALTH')) return 'stealth';
  if (u.includes('ANTIPENETRATIVE') || u.includes('ABLATION')) return 'anti-penetrative';
  if (u.includes('HEATDISSIPATING')) return 'heat-dissipating';
  return 'standard';
}

function mapStructureType(s: string): string {
  const u = s.toUpperCase().replace(/[_\s-]+/g, '');
  if (u.includes('INDUSTRIAL')) return 'industrial';
  if (u === 'COMPOSITE') return 'composite';
  if (u.includes('REINFORCED')) return 'reinforced';
  return 'standard';
}

function mapGyroType(s: string): string {
  const u = s.toUpperCase().replace(/[_\s-]+/g, '');
  if (u.includes('HEAVYDUTY') || u.includes('HEAVY')) return 'heavy-duty';
  if (u.includes('XL')) return 'xl';
  if (u.includes('COMPACT')) return 'compact';
  return 'standard';
}

function mapCockpitType(s: string): string {
  const u = (s || 'STANDARD').toUpperCase().replace(/[_\s-]+/g, '');
  if (u.includes('SMALL')) return 'small';
  if (u.includes('TORSO') || u.includes('TORSOMOUNTED')) return 'torso-mounted';
  if (u.includes('COMMAND')) return 'command-console';
  if (u.includes('INTERFACE')) return 'interface';
  if (u.includes('DRONE')) return 'drone';
  return 'standard';
}

// Simplified crit scan for stealth/chameleon/void/null-sig detection
function scanForDefensiveModifiers(unit: UnitData): {
  hasStealth: boolean;
  hasChameleon: boolean;
  hasNullSig: boolean;
  hasVoidSig: boolean;
  detectedSmallCockpit: boolean;
  detectedInterfaceCockpit: boolean;
  detectedDroneOS: boolean;
  umuMP: number;
} {
  // Detect stealth from armor.type (same as validate-bv.ts line 1001)
  const armorType = mapArmorType(unit.armor.type);

  const result = {
    hasStealth: armorType === 'stealth',
    hasChameleon: false,
    hasNullSig: false,
    hasVoidSig: false,
    detectedSmallCockpit: false,
    detectedInterfaceCockpit: false,
    detectedDroneOS: false,
    umuMP: 0,
  };

  if (!unit.criticalSlots) return result;

  const allSlotsLo: string[] = [];
  for (const [, slots] of Object.entries(unit.criticalSlots)) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      if (s && typeof s === 'string') {
        const lo = s.replace(/\s*\(omnipod\)/gi, '').trim().toLowerCase();
        allSlotsLo.push(lo);
        if (lo.includes('chameleon') || lo.includes('clps')) result.hasChameleon = true;
        if (lo.includes('null-signature') || lo.includes('nullsignature') || lo.includes('null signature')) result.hasNullSig = true;
        if (lo.includes('void-signature') || lo.includes('voidsignature') || lo.includes('void signature')) result.hasVoidSig = true;
        if (lo.includes('droneoperatingsystem') || lo.includes('drone operating system')) result.detectedDroneOS = true;
        if (lo.includes('umu') || lo.includes('underwater maneuvering')) result.umuMP++;
      }
    }
  }

  // Small cockpit from unit.cockpit
  if (unit.cockpit && unit.cockpit.toUpperCase().includes('SMALL')) result.detectedSmallCockpit = true;

  // Interface cockpit: 2 cockpit entries in HEAD and no gyro anywhere
  const headSlots = unit.criticalSlots?.HEAD;
  if (Array.isArray(headSlots)) {
    let cockpitCount = 0;
    for (const hs of headSlots) {
      if (hs && typeof hs === 'string' && hs.toLowerCase().includes('cockpit')) cockpitCount++;
    }
    if (cockpitCount >= 2) {
      const hasGyroAnywhere = allSlotsLo.some(s => s.includes('gyro'));
      if (!hasGyroAnywhere) result.detectedInterfaceCockpit = true;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  const reportPath = path.resolve(process.cwd(), 'validation-output/bv-validation-report.json');
  const indexPath = path.resolve(process.cwd(), 'public/data/units/battlemechs/index.json');

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  const index: IndexFile = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

  // Pick 20 undercalculated minor-discrepancy units with varied tonnage
  const candidates = (report.allResults as ValidationResult[])
    .filter(u => u.percentDiff < -0.5 && u.percentDiff >= -5.0 && u.breakdown)
    .sort((a, b) => a.percentDiff - b.percentDiff); // worst first

  // Pick diverse units: some light, some medium, some heavy, some assault
  const selected: ValidationResult[] = [];
  const tonnageBuckets = [
    candidates.filter(u => u.tonnage <= 35),
    candidates.filter(u => u.tonnage > 35 && u.tonnage <= 55),
    candidates.filter(u => u.tonnage > 55 && u.tonnage <= 75),
    candidates.filter(u => u.tonnage > 75),
  ];
  for (const bucket of tonnageBuckets) {
    for (const u of bucket) {
      if (selected.length >= 20) break;
      selected.push(u);
      if (selected.filter(s => s.tonnage === u.tonnage).length >= 3) continue;
    }
  }
  // Fill up to 20 from worst first
  for (const u of candidates) {
    if (selected.length >= 20) break;
    if (!selected.find(s => s.unitId === u.unitId)) selected.push(u);
  }
  selected.splice(20);

  console.log(`=== DEFENSIVE vs OFFENSIVE BV GAP TRACE ===`);
  console.log(`Selected ${selected.length} units for analysis\n`);

  let defGapCount = 0;
  let offGapCount = 0;
  let bothGapCount = 0;
  let totalDefGap = 0;
  let totalOffGap = 0;

  for (const result of selected) {
    const idxUnit = index.units.find(u => u.id === result.unitId);
    if (!idxUnit) { console.log(`SKIP: ${result.unitId} not in index`); continue; }

    const unitPath = path.resolve(process.cwd(), 'public/data/units/battlemechs', idxUnit.path);
    if (!fs.existsSync(unitPath)) { console.log(`SKIP: ${result.unitId} file not found`); continue; }

    let unit: UnitData;
    try { unit = JSON.parse(fs.readFileSync(unitPath, 'utf-8')); } catch { continue; }

    const engineType = mapEngineType(unit.engine.type, unit.techBase);
    const structureType = mapStructureType(unit.structure.type);
    const cockpitType = mapCockpitType(unit.cockpit || 'STANDARD');
    const mods = scanForDefensiveModifiers(unit);

    let gyroType = mapGyroType(unit.gyro.type);
    if (mods.detectedInterfaceCockpit) gyroType = 'none';

    let totalArmor = calcTotalArmor(unit.armor.allocation);
    if (cockpitType === 'torso-mounted') totalArmor += 7;
    const totalStructure = calcTotalStructure(unit.tonnage);

    // Compute raw armor type (stealth -> standard for calculation)
    const rawArmorType = mapArmorType(unit.armor.type);
    const calcArmorType = mods.hasStealth ? 'standard' : rawArmorType;

    // Engine multiplier
    let engineBVMult = getEngineBVMultiplier(engineType);
    if (engineType === EngineType.XXL && unit.techBase === 'CLAN') engineBVMult = 0.5;

    // Compute individual components
    const armorMultiplier = getArmorBVMultiplier(calcArmorType);
    const structureMultiplier = getStructureBVMultiplier(structureType);
    const gyroMultiplier = gyroType === 'none' ? 0 : getGyroBVMultiplier(gyroType);

    const armorBV = Math.round(totalArmor * 2.5 * armorMultiplier * (10)) / 10; // BAR=10
    const structureBV = totalStructure * 1.5 * structureMultiplier * engineBVMult;
    const gyroBV = unit.tonnage * gyroMultiplier;

    // Movement
    const walkMP = unit.movement.walk;
    const runMP = Math.ceil(walkMP * 1.5);
    const jumpMP = unit.movement.jump;

    // Defensive factor (TMM-based)
    const effectiveMP = Math.max(runMP, Math.max(jumpMP, mods.umuMP));
    let tmm: number;
    if (effectiveMP <= 2) tmm = 0;
    else if (effectiveMP <= 4) tmm = 1;
    else if (effectiveMP <= 6) tmm = 2;
    else if (effectiveMP <= 9) tmm = 3;
    else if (effectiveMP <= 17) tmm = 4;
    else if (effectiveMP <= 24) tmm = 5;
    else tmm = 6;

    if (mods.hasStealth || mods.hasNullSig) tmm += 2;
    if (mods.hasChameleon) tmm += 2;
    if (mods.hasVoidSig) {
      if (tmm < 3) tmm = 3;
      else if (tmm === 3) tmm++;
    }

    const defensiveFactor = 1 + tmm / 10.0;

    // From the report breakdown
    const reportDefBV = result.breakdown.defensiveBV;
    const reportOffBV = result.breakdown.offensiveBV;
    const reportDefEquipBV = result.breakdown.defensiveEquipBV;
    const reportExplosive = result.breakdown.explosivePenalty;

    // Our recalculated baseDef
    const baseDef = armorBV + structureBV + gyroBV + reportDefEquipBV - reportExplosive;
    const recalcDefBV = baseDef * defensiveFactor;

    // Defensive gap: our recalc vs what validate-bv.ts computed
    const defCalcGap = recalcDefBV - reportDefBV;

    // Now: indexBV = round((defensiveBV + offensiveBV) * cockpitModifier)
    // So expected total from components = defensiveBV + offensiveBV
    // And indexBV / cockpitModifier = defensiveBV + offensiveBV (expected)
    const effectiveCockpit = mods.detectedInterfaceCockpit && cockpitType === 'standard' ? 'interface'
      : mods.detectedSmallCockpit && cockpitType === 'standard' ? 'small'
      : cockpitType;
    const cockpitMod = getCockpitModifier(effectiveCockpit);
    let droneMultiplier = 1.0;
    if (mods.detectedDroneOS) droneMultiplier = 0.95;

    // Expected pre-cockpit total from index BV
    // indexBV = round((defBV + offBV) * cockpitMod * droneMod)
    // So (defBV + offBV) ~ indexBV / (cockpitMod * droneMod)
    const expectedPreCockpit = result.indexBV / (cockpitMod * droneMultiplier);
    const calcPreCockpit = reportDefBV + reportOffBV;

    // Gap in pre-cockpit total
    const preCockpitGap = expectedPreCockpit - calcPreCockpit;

    // If defensive matches our recalc, the gap must be offensive
    // Expected offBV = expectedPreCockpit - reportDefBV
    const expectedOffBV = expectedPreCockpit - reportDefBV;
    const offGap = expectedOffBV - reportOffBV;

    // And expected defBV = expectedPreCockpit - reportOffBV
    const expectedDefBV = expectedPreCockpit - reportOffBV;
    const defGap = expectedDefBV - reportDefBV;

    const isDefGap = Math.abs(defGap) > 5;
    const isOffGap = Math.abs(offGap) > 5;

    if (isDefGap && !isOffGap) defGapCount++;
    else if (isOffGap && !isDefGap) offGapCount++;
    else if (isDefGap && isOffGap) bothGapCount++;

    totalDefGap += defGap;
    totalOffGap += offGap;

    console.log(`--- ${result.chassis} ${result.model} (${result.tonnage}t) ---`);
    console.log(`  Index BV: ${result.indexBV}  |  Calc BV: ${result.calculatedBV}  |  Gap: ${result.difference} (${result.percentDiff.toFixed(2)}%)`);
    console.log(`  Cockpit: ${effectiveCockpit} (mod=${cockpitMod})${mods.detectedDroneOS ? ' DRONE' : ''}`);
    console.log(`  Engine: ${unit.engine.type} -> ${engineType} (mult=${engineBVMult})`);
    console.log(`  Armor: ${totalArmor} pts, type=${calcArmorType}, mult=${armorMultiplier}`);
    console.log(`  Structure: ${totalStructure} pts, type=${structureType}, mult=${structureMultiplier}`);
    console.log(`  Gyro: type=${gyroType}, mult=${gyroMultiplier}`);
    console.log(`  Movement: walk=${walkMP} run=${runMP} jump=${jumpMP} TMM=${tmm} defFactor=${defensiveFactor}`);
    console.log(`  `);
    console.log(`  Recalculated components:`);
    console.log(`    armorBV     = ${armorBV.toFixed(2)}`);
    console.log(`    structureBV = ${structureBV.toFixed(2)}`);
    console.log(`    gyroBV      = ${gyroBV.toFixed(2)}`);
    console.log(`    defEquipBV  = ${reportDefEquipBV.toFixed(2)} (from report)`);
    console.log(`    explosive   = ${reportExplosive.toFixed(2)} (from report)`);
    console.log(`    baseDef     = ${baseDef.toFixed(2)}`);
    console.log(`    defFactor   = ${defensiveFactor}`);
    console.log(`    recalcDefBV = ${recalcDefBV.toFixed(2)}`);
    console.log(`    reportDefBV = ${reportDefBV.toFixed(2)}`);
    console.log(`    defCalcGap  = ${defCalcGap.toFixed(2)} (recalc - report, should be ~0)`);
    console.log(`  `);
    console.log(`  Gap attribution (from indexBV):`);
    console.log(`    expectedPreCockpit = ${expectedPreCockpit.toFixed(2)}`);
    console.log(`    calcPreCockpit     = ${calcPreCockpit.toFixed(2)}`);
    console.log(`    preCockpitGap      = ${preCockpitGap.toFixed(2)}`);
    console.log(`    expectedDefBV      = ${expectedDefBV.toFixed(2)}  (gap from report: ${defGap.toFixed(2)})`);
    console.log(`    expectedOffBV      = ${expectedOffBV.toFixed(2)}  (gap from report: ${offGap.toFixed(2)})`);
    console.log(`    Report defBV=${reportDefBV.toFixed(2)}, offBV=${reportOffBV.toFixed(2)}`);
    console.log(`    => Gap primarily on: ${isDefGap && !isOffGap ? 'DEFENSIVE' : isOffGap && !isDefGap ? 'OFFENSIVE' : isDefGap && isOffGap ? 'BOTH' : 'NEITHER (rounding)'}`);
    console.log();
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Units with gap primarily on DEFENSIVE side: ${defGapCount}`);
  console.log(`Units with gap primarily on OFFENSIVE side: ${offGapCount}`);
  console.log(`Units with gap on BOTH sides: ${bothGapCount}`);
  console.log(`Units with gap on NEITHER (rounding): ${20 - defGapCount - offGapCount - bothGapCount}`);
  console.log(`Average defensive gap: ${(totalDefGap / selected.length).toFixed(2)}`);
  console.log(`Average offensive gap: ${(totalOffGap / selected.length).toFixed(2)}`);

  // Also check: does our recalc of defensiveBV match the report's?
  // If our recalc matches the report, the gap can't be from armor/structure/gyro miscomputation
  console.log(`\n=== DEFENSIVE RECALC VALIDATION ===`);
  console.log(`(If defCalcGap is ~0 for all units, our armor/structure/gyro formulas match the validation script)`);
}

main();
