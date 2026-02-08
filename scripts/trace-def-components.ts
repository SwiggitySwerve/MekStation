#!/usr/bin/env npx tsx
/**
 * Trace defensive BV components for 10 minor-discrepancy units.
 *
 * For each unit:
 * 1. Recalculates each defensive component from raw unit data
 * 2. Compares our formula vs the validation report's defensiveBV
 * 3. Derives what MegaMek expects the defensiveBV to be (from indexBV)
 * 4. Shows exactly where the gap is
 */
import * as fs from 'fs';
import * as path from 'path';

import { EngineType } from '../src/types/construction/EngineType';
import { STRUCTURE_POINTS_TABLE } from '../src/types/construction/InternalStructureType';
import {
  calculateDefensiveBV,
  getCockpitModifier,
} from '../src/utils/construction/battleValueCalculations';
import {
  getArmorBVMultiplier,
  getStructureBVMultiplier,
  getGyroBVMultiplier,
  getEngineBVMultiplier,
} from '../src/types/validation/BattleValue';

// ---------------------------------------------------------------------------
// Types
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
// Helpers (matching validate-bv.ts exactly)
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
  const u = engineStr.toUpperCase().replace(/[_\s-]+/g, '');
  if (u === 'XL' || u === 'XLENGINE') return techBase === 'CLAN' ? EngineType.XL_CLAN : EngineType.XL_IS;
  if (u === 'CLANXL' || u === 'XLCLAN') return EngineType.XL_CLAN;
  if (u === 'LIGHT' || u === 'LIGHTENGINE') return EngineType.LIGHT;
  if (u === 'XXL' || u === 'XXLENGINE') return EngineType.XXL;
  if (u === 'COMPACT' || u === 'COMPACTENGINE') return EngineType.COMPACT;
  if (u === 'ICE' || u === 'INTERNALCOMBUSTION') return EngineType.ICE;
  if (u === 'FUELCELL') return EngineType.FUEL_CELL;
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

// Scan crit slots for movement/defensive modifiers
function scanCritModifiers(unit: UnitData) {
  const result = {
    hasMASC: false,
    hasSupercharger: false,
    hasTSM: false,
    hasPartialWing: false,
    hasStealth: mapArmorType(unit.armor.type) === 'stealth',
    hasChameleon: false,
    hasNullSig: false,
    hasVoidSig: false,
    detectedSmallCockpit: false,
    detectedInterfaceCockpit: false,
    detectedDroneOS: false,
    umuMP: 0,
    armoredComponentBV: 0,
    hasImprovedJJ: false,
  };

  if (unit.cockpit && unit.cockpit.toUpperCase().includes('SMALL')) result.detectedSmallCockpit = true;

  if (!unit.criticalSlots) return result;

  const allSlotsLo: string[] = [];
  for (const [, slots] of Object.entries(unit.criticalSlots)) {
    if (!Array.isArray(slots)) continue;
    for (const s of slots) {
      if (!s || typeof s !== 'string') continue;
      const lo = s.replace(/\s*\(omnipod\)/gi, '').trim().toLowerCase();
      allSlotsLo.push(lo);

      if (lo.includes('masc') && !lo.includes('ammo')) result.hasMASC = true;
      if (lo.includes('supercharger') || lo.includes('super charger')) result.hasSupercharger = true;
      if (lo === 'tsm' || lo.includes('triple strength') || lo.includes('triplestrength')) result.hasTSM = true;
      if (lo.includes('partial wing') || lo.includes('partialwing')) result.hasPartialWing = true;
      if (lo.includes('chameleon') || lo.includes('clps')) result.hasChameleon = true;
      if (lo.includes('null-signature') || lo.includes('nullsignature') || lo.includes('null signature')) result.hasNullSig = true;
      if (lo.includes('void-signature') || lo.includes('voidsignature') || lo.includes('void signature')) result.hasVoidSig = true;
      if (lo.includes('droneoperatingsystem') || lo.includes('drone operating system')) result.detectedDroneOS = true;
      if (lo.includes('umu') || lo.includes('underwater maneuvering')) result.umuMP++;
      if (lo.includes('improved jump jet') || lo === 'isimprovedjumpjet' || lo === 'climprovedjumpjet') result.hasImprovedJJ = true;

      // Armored components
      const isArmoredComponent = lo.includes('(armored)') || (lo.endsWith('armored') && !lo.includes('armor'));
      if (isArmoredComponent) result.armoredComponentBV += 5;
    }
  }

  // Interface cockpit: 2 cockpit entries in HEAD and no gyro anywhere
  const headSlots = unit.criticalSlots?.HEAD;
  if (Array.isArray(headSlots)) {
    let cockpitCount = 0;
    for (const hs of headSlots) {
      if (hs && typeof hs === 'string' && hs.toLowerCase().includes('cockpit')) cockpitCount++;
    }
    if (cockpitCount >= 2) {
      if (!allSlotsLo.some(s => s.includes('gyro'))) result.detectedInterfaceCockpit = true;
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

  // Pick 10 undercalculated minor-discrepancy units, diverse tonnages
  // Avoid MASC/SC/stealth/special to keep the analysis clean first, then include some
  const candidates = (report.allResults as ValidationResult[])
    .filter(u => u.percentDiff < -1.0 && u.percentDiff >= -5.0 && u.breakdown)
    .sort((a, b) => a.tonnage - b.tonnage); // sort by tonnage for diversity

  // Take every ~26th unit to get spread across tonnages
  const step = Math.max(1, Math.floor(candidates.length / 10));
  const selected: ValidationResult[] = [];
  for (let i = 0; i < candidates.length && selected.length < 10; i += step) {
    selected.push(candidates[i]);
  }
  // Fill to 10 if needed
  for (const c of candidates) {
    if (selected.length >= 10) break;
    if (!selected.find(s => s.unitId === c.unitId)) selected.push(c);
  }
  selected.splice(10);

  console.log(`=== DEFENSIVE BV COMPONENT TRACE ===`);
  console.log(`Selected ${selected.length} units\n`);

  const summaryRows: Array<{
    unit: string;
    tonnage: number;
    indexBV: number;
    calcBV: number;
    pctDiff: number;
    ourDefBV: number;
    reportDefBV: number;
    megamekDefBV: number;
    defFormulaMatch: boolean;
    defGapFromMegamek: number;
    offGapFromMegamek: number;
  }> = [];

  for (const result of selected) {
    const idxUnit = index.units.find(u => u.id === result.unitId);
    if (!idxUnit) { console.log(`SKIP: ${result.unitId} not in index`); continue; }

    const unitPath = path.resolve(process.cwd(), 'public/data/units/battlemechs', idxUnit.path);
    if (!fs.existsSync(unitPath)) { console.log(`SKIP: ${result.unitId} file not found`); continue; }

    let unit: UnitData;
    try { unit = JSON.parse(fs.readFileSync(unitPath, 'utf-8')); } catch { continue; }

    const engineType = mapEngineType(unit.engine.type, unit.techBase);
    const rawArmorType = mapArmorType(unit.armor.type);
    const structureType = mapStructureType(unit.structure.type);
    const cockpitType = mapCockpitType(unit.cockpit || 'STANDARD');
    const mods = scanCritModifiers(unit);

    let gyroType = mapGyroType(unit.gyro.type);
    if (mods.detectedInterfaceCockpit) gyroType = 'none';

    // Total armor/structure
    let totalArmor = calcTotalArmor(unit.armor.allocation);
    if (cockpitType === 'torso-mounted') totalArmor += 7;
    const totalStructure = calcTotalStructure(unit.tonnage);

    // Engine multiplier
    let engineBVMult = getEngineBVMultiplier(engineType);
    if (engineType === EngineType.XXL && unit.techBase === 'CLAN') engineBVMult = 0.5;

    // Multipliers
    const calcArmorType = mods.hasStealth ? 'standard' : rawArmorType;
    const armorMultiplier = getArmorBVMultiplier(calcArmorType);
    const structureMultiplier = getStructureBVMultiplier(structureType);
    const gyroMultiplier = gyroType === 'none' ? 0 : getGyroBVMultiplier(gyroType);

    // Components
    const armorBV = Math.round(totalArmor * 2.5 * armorMultiplier * 10) / 10;
    const structureBV = totalStructure * 1.5 * structureMultiplier * engineBVMult;
    const gyroBV = unit.tonnage * gyroMultiplier;

    // Movement (with MASC/SC/TSM)
    const walkMP = unit.movement.walk;
    let bvWalk = mods.hasTSM ? walkMP + 1 : walkMP;
    let runMP: number;
    if (mods.hasMASC && mods.hasSupercharger) runMP = Math.ceil(bvWalk * 2.5);
    else if (mods.hasMASC || mods.hasSupercharger) runMP = bvWalk * 2;
    else runMP = Math.ceil(bvWalk * 1.5);
    if (rawArmorType === 'hardened') runMP = Math.max(0, runMP - 1);

    let jumpMP = unit.movement.jump || 0;
    if (mods.hasPartialWing) jumpMP += (unit.tonnage <= 55 ? 2 : 1);

    // TMM
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

    // Report values
    const reportDefBV = result.breakdown.defensiveBV;
    const reportOffBV = result.breakdown.offensiveBV;
    const reportDefEquipBV = result.breakdown.defensiveEquipBV;
    const reportExplosive = result.breakdown.explosivePenalty;

    // Our calculated defensive BV (using report's defEquipBV and explosivePenalty)
    const baseDef = armorBV + structureBV + gyroBV + reportDefEquipBV - reportExplosive;
    const ourDefBV = baseDef * defensiveFactor;

    // Cockpit/drone modifiers
    const effectiveCockpit = mods.detectedInterfaceCockpit && cockpitType === 'standard' ? 'interface'
      : mods.detectedSmallCockpit && cockpitType === 'standard' ? 'small'
      : cockpitType;
    const cockpitMod = getCockpitModifier(effectiveCockpit);
    const droneMod = mods.detectedDroneOS ? 0.95 : 1.0;

    // What MegaMek expects: indexBV = round((defBV + offBV) * cockpitMod * droneMod)
    // So defBV + offBV = indexBV / (cockpitMod * droneMod)
    // If we trust our offBV: megamekDefBV = indexBV/(cockpitMod*droneMod) - reportOffBV
    const expectedTotal = result.indexBV / (cockpitMod * droneMod);
    const megamekDefBV = expectedTotal - reportOffBV;

    // Gaps
    const defFormulaGap = ourDefBV - reportDefBV; // should be ~0 if formula matches validate-bv.ts
    const defGapFromMegamek = megamekDefBV - reportDefBV; // how much more MegaMek expects for defensive
    const offGapFromMegamek = expectedTotal - reportDefBV - reportOffBV; // total gap attributed to offensive if def is trusted

    const defFormulaMatch = Math.abs(defFormulaGap) < 1.0;

    summaryRows.push({
      unit: `${result.chassis} ${result.model}`,
      tonnage: result.tonnage,
      indexBV: result.indexBV,
      calcBV: result.calculatedBV,
      pctDiff: result.percentDiff,
      ourDefBV: Math.round(ourDefBV * 100) / 100,
      reportDefBV,
      megamekDefBV: Math.round(megamekDefBV * 100) / 100,
      defFormulaMatch,
      defGapFromMegamek: Math.round(defGapFromMegamek * 100) / 100,
      offGapFromMegamek: Math.round(offGapFromMegamek * 100) / 100,
    });

    console.log(`--- ${result.chassis} ${result.model} (${result.tonnage}t) [${result.percentDiff.toFixed(2)}%] ---`);
    console.log(`  IndexBV=${result.indexBV}  CalcBV=${result.calculatedBV}  Gap=${result.difference}`);
    console.log(`  Engine: ${unit.engine.type} -> ${engineType} (structMult=${engineBVMult})`);
    console.log(`  Armor: ${totalArmor}pts type=${calcArmorType} mult=${armorMultiplier}`);
    console.log(`  Structure: ${totalStructure}pts type=${structureType} mult=${structureMultiplier}`);
    console.log(`  Gyro: ${gyroType} mult=${gyroMultiplier}`);
    console.log(`  Move: walk=${walkMP} run=${runMP} jump=${jumpMP}${mods.hasMASC ? ' MASC' : ''}${mods.hasSupercharger ? ' SC' : ''}${mods.hasTSM ? ' TSM' : ''}`);
    console.log(`  TMM=${tmm} defFactor=${defensiveFactor}`);
    console.log(`  Cockpit: ${effectiveCockpit} (mod=${cockpitMod})${mods.detectedDroneOS ? ' DRONE' : ''}`);
    console.log();
    console.log(`  DEFENSIVE COMPONENTS:`);
    console.log(`    armorBV          = ${armorBV.toFixed(2)}`);
    console.log(`    structureBV      = ${structureBV.toFixed(2)}`);
    console.log(`    gyroBV           = ${gyroBV.toFixed(2)}`);
    console.log(`    defEquipBV       = ${reportDefEquipBV.toFixed(2)} (from report)`);
    console.log(`    explosivePenalty = ${reportExplosive.toFixed(2)} (from report)`);
    console.log(`    baseDef          = ${baseDef.toFixed(2)}`);
    console.log(`    defensiveFactor  = ${defensiveFactor}`);
    console.log();
    console.log(`  COMPARISON:`);
    console.log(`    Our formula DefBV    = ${ourDefBV.toFixed(2)}`);
    console.log(`    Report DefBV         = ${reportDefBV.toFixed(2)}`);
    console.log(`    Formula match report = ${defFormulaMatch ? 'YES' : 'NO (gap=' + defFormulaGap.toFixed(2) + ')'}`);
    console.log(`    MegaMek expected Def = ${megamekDefBV.toFixed(2)} (indexBV/cockpit - offBV)`);
    console.log(`    Def gap (MM-report)  = ${defGapFromMegamek.toFixed(2)}`);
    console.log(`    Off gap (total-def)  = ${offGapFromMegamek.toFixed(2)}`);
    console.log();

    if (Math.abs(defGapFromMegamek) > Math.abs(offGapFromMegamek)) {
      console.log(`    => PRIMARY GAP: DEFENSIVE (MegaMek expects ${defGapFromMegamek.toFixed(1)} more defBV)`);
    } else if (Math.abs(offGapFromMegamek) > Math.abs(defGapFromMegamek)) {
      console.log(`    => PRIMARY GAP: OFFENSIVE (MegaMek expects ${offGapFromMegamek.toFixed(1)} more offBV)`);
    } else {
      console.log(`    => GAP SPLIT EQUALLY between defensive and offensive`);
    }
    console.log();
  }

  // Summary table
  console.log(`\n${'='.repeat(120)}`);
  console.log(`SUMMARY TABLE`);
  console.log(`${'='.repeat(120)}`);
  console.log(`${'Unit'.padEnd(28)} ${'Ton'.padStart(3)} ${'Idx'.padStart(5)} ${'Calc'.padStart(5)} ${'%'.padStart(6)} | ${'OurDef'.padStart(8)} ${'RptDef'.padStart(8)} ${'Match'.padStart(5)} | ${'MMDef'.padStart(8)} ${'DefGap'.padStart(7)} ${'OffGap'.padStart(7)} | Side`);
  console.log(`${'-'.repeat(120)}`);

  let totalDefGap = 0;
  let totalOffGap = 0;
  for (const r of summaryRows) {
    const side = Math.abs(r.defGapFromMegamek) > Math.abs(r.offGapFromMegamek) ? 'DEF' : 'OFF';
    totalDefGap += r.defGapFromMegamek;
    totalOffGap += r.offGapFromMegamek;
    console.log(
      `${r.unit.padEnd(28)} ${String(r.tonnage).padStart(3)} ${String(r.indexBV).padStart(5)} ${String(r.calcBV).padStart(5)} ${r.pctDiff.toFixed(2).padStart(6)} | ` +
      `${r.ourDefBV.toFixed(1).padStart(8)} ${r.reportDefBV.toFixed(1).padStart(8)} ${(r.defFormulaMatch ? 'Y' : 'N').padStart(5)} | ` +
      `${r.megamekDefBV.toFixed(1).padStart(8)} ${r.defGapFromMegamek.toFixed(1).padStart(7)} ${r.offGapFromMegamek.toFixed(1).padStart(7)} | ${side}`
    );
  }
  console.log(`${'-'.repeat(120)}`);
  console.log(`${'TOTALS'.padEnd(28)} ${''.padStart(3)} ${''.padStart(5)} ${''.padStart(5)} ${''.padStart(6)} | ${''.padStart(8)} ${''.padStart(8)} ${''.padStart(5)} | ${''.padStart(8)} ${totalDefGap.toFixed(1).padStart(7)} ${totalOffGap.toFixed(1).padStart(7)} |`);

  console.log(`\n=== KEY QUESTION ANSWERED ===`);
  const formulaMatchCount = summaryRows.filter(r => r.defFormulaMatch).length;
  console.log(`Formula matches report: ${formulaMatchCount}/${summaryRows.length}`);
  console.log(`Average DefGap from MegaMek: ${(totalDefGap / summaryRows.length).toFixed(2)}`);
  console.log(`Average OffGap from MegaMek: ${(totalOffGap / summaryRows.length).toFixed(2)}`);

  // NOTE: DefGap = OffGap always because they sum to the total gap
  // The real question is: which component if INDIVIDUALLY recalculated more accurately
  // would close the gap? Since our defensive formula matches the report, AND the report
  // is lower than MegaMek expects, either:
  //   A) Our defensive formula is missing something MegaMek includes
  //   B) Our offensive BV is correct and indexBV/(cockpit) - ourDef gives the right offBV
  //      which means MegaMek's defensiveBV must be higher
  console.log(`\nNOTE: DefGap always equals OffGap because total gap = defGap + offGap`);
  console.log(`and we derive MegaMek's expected def from: indexBV/cockpit - OUR offBV.`);
  console.log(`The question is: is our defensiveBV too low or our offensiveBV too low?`);
  console.log(`\nSince our formula exactly matches the report for ${formulaMatchCount}/${summaryRows.length} units,`);
  console.log(`the report's defensiveBV IS our defensiveBV. The remaining question is`);
  console.log(`whether MegaMek computes HIGHER defensiveBV or HIGHER offensiveBV.`);
  console.log(`\nTo determine this, we'd need to compare against MegaMek's actual defensive`);
  console.log(`breakdown (not just the total). Without that, we can only say the total is low.`);
}

main();
