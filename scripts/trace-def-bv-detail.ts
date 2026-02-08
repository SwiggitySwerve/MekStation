/**
 * Detailed trace of defensive BV for specific undercalculated units.
 * Recomputes each component independently and compares against our calculator output.
 */
import * as fs from 'fs';
import * as path from 'path';

import { EngineType } from '../src/types/construction/EngineType';
import { STRUCTURE_POINTS_TABLE } from '../src/types/construction/InternalStructureType';
import {
  calculateDefensiveBV,
  calculateTMM,
} from '../src/utils/construction/battleValueCalculations';
import {
  getArmorBVMultiplier,
  getStructureBVMultiplier,
  getGyroBVMultiplier,
  getEngineBVMultiplier,
} from '../src/types/validation/BattleValue';

const reportPath = path.resolve(__dirname, '../validation-output/bv-validation-report.json');
const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const indexData = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf-8'));
const unitPathMap = new Map<string, string>();
for (const u of indexData.units) {
  unitPathMap.set(u.id, path.join(unitsDir, u.path));
}

// MegaMek armor multipliers for reference
const MEGAMEK_ARMOR_MULT: Record<string, number> = {
  'standard': 1.0,
  'ferro_fibrous': 1.0,
  'ferro_fibrous_clan': 1.0,
  'light_ferro_fibrous': 1.0,
  'heavy_ferro_fibrous': 1.0,
  'stealth': 1.0,
  'hardened': 2.0,
  'reactive': 1.5,
  'reflective': 1.5,
  'ballistic_reinforced': 1.5,
  'ferro_lamellor': 1.2,
  'anti_penetrative_ablation': 1.2,
  'heat_dissipating': 1.1,
  'commercial': 1.0,
  'industrial': 1.0,
};

function calcTotalArmor(a: Record<string, any>): number {
  let t = 0;
  for (const v of Object.values(a)) {
    if (typeof v === 'number') t += v;
    else if (v && typeof v === 'object') t += (v.front || 0) + (v.rear || 0);
  }
  return t;
}

function calcTotalStructure(ton: number): number {
  const t = (STRUCTURE_POINTS_TABLE as any)[ton];
  if (!t) return 0;
  return t.head + t.centerTorso + t.sideTorso * 2 + t.arm * 2 + t.leg * 2;
}

function mapEngineType(s: string, techBase: string): EngineType {
  const t = s.toUpperCase().replace(/[^A-Z]/g, '');
  if (t.includes('XXL')) return EngineType.XXL;
  if (t.includes('XL') || t.includes('CLANXL')) return techBase === 'CLAN' ? EngineType.CLAN_XL : EngineType.XL;
  if (t.includes('LIGHT')) return EngineType.LIGHT;
  if (t.includes('COMPACT')) return EngineType.COMPACT;
  return EngineType.FUSION;
}

function mapArmorType(s: string): string {
  return s.toLowerCase().replace(/[\s-]+/g, '_');
}

function mapStructureType(s: string): string {
  const lo = s.toLowerCase();
  if (lo.includes('endo-composite')) return 'endo-composite';
  if (lo.includes('endo')) return 'endo-steel';
  if (lo.includes('composite')) return 'composite';
  if (lo.includes('reinforced')) return 'reinforced';
  return 'standard';
}

function mapGyroType(s: string): string {
  const lo = s.toLowerCase();
  if (lo.includes('xl') || lo.includes('extra-light')) return 'xl';
  if (lo.includes('heavy')) return 'heavy-duty';
  if (lo.includes('compact')) return 'compact';
  if (lo.includes('none')) return 'none';
  return 'standard';
}

// Trace specific units
const targetIds = [
  'albatross-alb-5u',
  'atlas-as8-k',
  'atlas-as8-ke',
  'barghest-bgs-4t',
  'battle-cobra-i',
  'carrion-crow-b',
  'commando-com-9s',
  'deimos-2',
];

console.log("=== DETAILED DEFENSIVE BV TRACE ===\n");

for (const targetId of targetIds) {
  const valUnit = report.allResults.find((u: any) => u.unitId === targetId);
  if (!valUnit) { console.log(`${targetId}: not in report`); continue; }

  const unitPath = unitPathMap.get(targetId);
  if (!unitPath || !fs.existsSync(unitPath)) { console.log(`${targetId}: file not found`); continue; }

  const unit = JSON.parse(fs.readFileSync(unitPath, 'utf-8'));

  const engineType = mapEngineType(unit.engine.type, unit.techBase);
  const structureType = mapStructureType(unit.structure.type);
  const gyroType = mapGyroType(unit.gyro.type);
  const armorType = mapArmorType(unit.armor.type);

  const totalArmor = calcTotalArmor(unit.armor.allocation);
  const totalStructure = calcTotalStructure(unit.tonnage);

  // Manually compute each component
  const armorMult = getArmorBVMultiplier(armorType);
  const structMult = getStructureBVMultiplier(structureType);
  const gyroMult = getGyroBVMultiplier(gyroType);

  let engineMult: number;
  if (engineType === EngineType.XXL && unit.techBase === 'CLAN') {
    engineMult = 0.5;
  } else {
    engineMult = getEngineBVMultiplier(engineType);
  }

  // Manual component calc
  const armorBV_manual = totalArmor * 2.5 * armorMult;
  const structBV_manual = totalStructure * 1.5 * structMult * engineMult;
  const gyroBV_manual = unit.tonnage * gyroMult;

  // Our formula (line 361): Math.round(totalArmor * 2.5 * armorMult * bar) / 10
  // With bar=10: Math.round(totalArmor * 2.5 * armorMult * 10) / 10
  const armorBV_code = Math.round(totalArmor * 2.5 * armorMult * 10) / 10;
  const structBV_code = totalStructure * 1.5 * structMult * engineMult;
  const gyroBV_code = unit.tonnage * gyroMult;

  // TMM and defensive factor
  const walkMP = unit.movement.walk;
  const runMP = Math.ceil(walkMP * 1.5);
  const jumpMP = unit.movement.jump || 0;
  const tmm = calculateTMM(runMP, jumpMP);
  const defFactor = 1 + tmm / 10.0;

  // Our calculateDefensiveBV result
  const defConfig: any = {
    totalArmorPoints: totalArmor,
    totalStructurePoints: totalStructure,
    tonnage: unit.tonnage,
    runMP, jumpMP, umuMP: 0,
    armorType,
    structureType,
    gyroType,
    engineType: engineType === EngineType.XXL && unit.techBase === 'CLAN' ? undefined : engineType,
    defensiveEquipmentBV: 0,
    explosivePenalties: 0,
  };
  if (engineType === EngineType.XXL && unit.techBase === 'CLAN') {
    defConfig.engineMultiplier = 0.5;
  }
  const defResult = calculateDefensiveBV(defConfig);

  // What the validation reported
  const reportedDefBV = valUnit.breakdown?.defensiveBV ?? 0;
  const reportedDefFactor = valUnit.breakdown?.defensiveFactor ?? 0;

  console.log(`=== ${targetId} (${unit.tonnage}t, ${unit.techBase}, ${unit.engine.type}) ===`);
  console.log(`  Index BV: ${valUnit.indexBV}, Calculated: ${valUnit.calculatedBV}, Diff: ${valUnit.difference} (${valUnit.percentDiff.toFixed(1)}%)`);
  console.log('');
  console.log(`  Armor: ${totalArmor}pts, type=${armorType}, mult=${armorMult}`);
  console.log(`  Structure: ${totalStructure}pts, type=${structureType}, mult=${structMult}`);
  console.log(`  Gyro: type=${gyroType}, mult=${gyroMult}`);
  console.log(`  Engine: type=${unit.engine.type} -> ${EngineType[engineType]}, mult=${engineMult}`);
  console.log('');
  console.log(`  Manual calc: armor=${armorBV_manual.toFixed(2)}, struct=${structBV_manual.toFixed(2)}, gyro=${gyroBV_manual.toFixed(2)}`);
  console.log(`  Code calc:   armor=${armorBV_code.toFixed(2)}, struct=${structBV_code.toFixed(2)}, gyro=${gyroBV_code.toFixed(2)}`);
  console.log(`  Code baseDef = ${(armorBV_code + structBV_code + gyroBV_code).toFixed(2)}`);
  console.log('');
  console.log(`  Walk=${walkMP}, Run=${runMP}, Jump=${jumpMP}, TMM=${tmm}, DefFactor=${defFactor.toFixed(2)}`);
  console.log(`  calculateDefensiveBV result: ${defResult.totalDefensiveBV.toFixed(2)} (armor=${defResult.armorBV.toFixed(2)}, struct=${defResult.structureBV.toFixed(2)}, gyro=${defResult.gyroBV.toFixed(2)}, factor=${defResult.defensiveFactor.toFixed(2)})`);
  console.log('');
  console.log(`  Validation report defensiveBV: ${reportedDefBV.toFixed(2)}, factor: ${reportedDefFactor.toFixed(2)}`);
  console.log(`  Difference: (report - manual): ${(reportedDefBV - defResult.totalDefensiveBV).toFixed(2)}`);
  console.log(`  Report defEquipBV: ${valUnit.breakdown?.defensiveEquipBV ?? 0}, explPenalty: ${valUnit.breakdown?.explosivePenalty ?? 0}`);
  console.log('');

  // Back-compute: what baseDef does the report imply?
  if (reportedDefFactor > 0) {
    const impliedBaseDef = reportedDefBV / reportedDefFactor;
    console.log(`  Implied baseDef from report: ${impliedBaseDef.toFixed(2)}`);
    console.log(`  Our baseDef (no equip/penalty): ${(armorBV_code + structBV_code + gyroBV_code).toFixed(2)}`);
    console.log(`  Gap in baseDef: ${(impliedBaseDef - (armorBV_code + structBV_code + gyroBV_code)).toFixed(2)}`);
  }
  console.log('');
}
