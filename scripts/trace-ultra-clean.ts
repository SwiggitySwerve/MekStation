#!/usr/bin/env npx tsx
/**
 * For the 19 ultra-clean units (STD engine, STD armor, STD structure,
 * defEq=0, expl=0), trace the EXACT defensive and offensive BV breakdown
 * to determine which side has the gap.
 */
import * as fs from 'fs';
import * as path from 'path';

import { EngineType } from '../src/types/construction/EngineType';
import { STRUCTURE_POINTS_TABLE } from '../src/types/construction/InternalStructureType';
import {
  getArmorBVMultiplier,
  getEngineBVMultiplier,
  getStructureBVMultiplier,
  getGyroBVMultiplier,
} from '../src/types/validation/BattleValue';

const reportPath = path.resolve('validation-output/bv-validation-report.json');
let report: any;
try { report = JSON.parse(fs.readFileSync(reportPath, 'utf-8')); } catch { process.exit(1); }

interface Result {
  unitId: string; chassis: string; model: string; tonnage: number;
  indexBV: number; calculatedBV: number | null; difference: number | null; percentDiff: number | null;
  breakdown?: { defensiveBV: number; offensiveBV: number; weaponBV: number; ammoBV: number; speedFactor: number; explosivePenalty: number; defensiveEquipBV: number; };
}

interface IndexUnit { id: string; chassis: string; model: string; tonnage: number; techBase: string; path: string; bv: number; }
interface IndexFile { units: IndexUnit[]; }
interface ArmorAllocation { [location: string]: number | { front: number; rear: number }; }
interface UnitData {
  id: string; chassis: string; model: string; configuration: string; techBase: string; tonnage: number;
  engine: { type: string; rating: number }; gyro: { type: string }; cockpit: string;
  structure: { type: string }; armor: { type: string; allocation: ArmorAllocation };
  heatSinks: { type: string; count: number }; movement: { walk: number; jump: number };
  equipment: any[]; criticalSlots?: Record<string, (string | null)[]>;
}

function calcTotalStructure(ton: number): number {
  const t = STRUCTURE_POINTS_TABLE[ton];
  if (!t) return 0;
  return t.head + t.centerTorso + t.sideTorso * 2 + t.arm * 2 + t.leg * 2;
}

function calcTotalArmor(a: ArmorAllocation): number {
  let t = 0;
  for (const v of Object.values(a)) {
    if (typeof v === 'number') t += v;
    else if (v && typeof v === 'object') t += (v.front || 0) + (v.rear || 0);
  }
  return t;
}

// TMM table (MegaMek Compute.getTargetMovementModifier)
function getTMM(mp: number): number {
  if (mp <= 0) return 0;
  if (mp <= 2) return 0;
  if (mp <= 4) return 1;
  if (mp <= 6) return 2;
  if (mp <= 9) return 3;
  if (mp <= 17) return 4;
  if (mp <= 24) return 5;
  return 6;
}

const results: Result[] = report.allResults || [];
const indexPath = path.resolve('public/data/units/battlemechs/index.json');
const indexData: IndexFile = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
const indexMap = new Map(indexData.units.map(u => [u.id, u]));

const cleanUnderCalc = results.filter((r: Result) => {
  if (!r.calculatedBV || !r.difference || !r.breakdown) return false;
  if (r.difference >= -5) return false;
  if (r.breakdown.defensiveEquipBV !== 0 || r.breakdown.explosivePenalty !== 0) return false;
  if (Math.abs(r.percentDiff || 0) >= 10) return false;

  const iu = indexMap.get(r.unitId);
  if (!iu) return false;
  try {
    const unit: UnitData = JSON.parse(fs.readFileSync(path.resolve('public/data/units/battlemechs', iu.path), 'utf-8'));
    const engUp = unit.engine.type.toUpperCase();
    const armUp = unit.armor.type.toUpperCase();
    const strUp = unit.structure.type.toUpperCase();
    return (engUp === 'FUSION' || engUp === 'STANDARD') &&
      !armUp.includes('FERRO') && !armUp.includes('REACTIVE') && !armUp.includes('REFLECTIVE') &&
      !armUp.includes('HARDENED') && !armUp.includes('STEALTH') && !armUp.includes('LAMELLOR') &&
      (strUp === 'STANDARD' || strUp === '');
  } catch { return false; }
});

console.log(`Ultra-clean units: ${cleanUnderCalc.length}\n`);

for (const r of cleanUnderCalc) {
  const iu = indexMap.get(r.unitId)!;
  const unit: UnitData = JSON.parse(fs.readFileSync(path.resolve('public/data/units/battlemechs', iu.path), 'utf-8'));

  const totalArmor = calcTotalArmor(unit.armor.allocation);
  const totalStructure = calcTotalStructure(unit.tonnage);

  // Our defensive BV components
  const armorBV = totalArmor * 2.5;
  const structureBV = totalStructure * 1.5; // STD engine = 1.0x, STD structure = 1.0x
  const gyroBV = unit.tonnage * 0.5; // STD gyro = 0.5

  const preFactorDef = armorBV + structureBV + gyroBV;

  // TMM
  const walkMP = unit.movement.walk;
  const runMP = Math.ceil(walkMP * 1.5);
  const jumpMP = unit.movement.jump || 0;
  const tmmRun = getTMM(runMP);
  const tmmJump = jumpMP > 0 ? getTMM(jumpMP) + 1 : 0;
  const tmm = Math.max(tmmRun, tmmJump);
  const defFactor = 1 + tmm / 10.0;

  const expectedDefBV = preFactorDef * defFactor;

  // Our reported values
  const ourDefBV = r.breakdown!.defensiveBV;
  const ourOffBV = r.breakdown!.offensiveBV;
  const ourTotal = r.calculatedBV!;
  const gap = r.indexBV - ourTotal;

  // If the gap is purely defensive: expectedActualDefBV = indexBV - ourOffBV
  const impliedDefBV = r.indexBV - ourOffBV;
  const defGap = impliedDefBV - ourDefBV;

  // If the gap is purely offensive: expectedActualOffBV = indexBV - ourDefBV
  const impliedOffBV = r.indexBV - ourDefBV;
  const offGap = impliedOffBV - ourOffBV;

  const name = `${r.chassis} ${r.model}`;
  console.log(`--- ${name} (${unit.tonnage}t) ---`);
  console.log(`  Index BV: ${r.indexBV}  |  Our BV: ${ourTotal}  |  Gap: ${gap}`);
  console.log(`  Walk ${walkMP}, Run ${runMP}, Jump ${jumpMP}  |  TMM: ${tmm}  |  DefFactor: ${defFactor}`);
  console.log(`  Armor: ${totalArmor} pts -> ${armorBV.toFixed(1)} BV`);
  console.log(`  Structure: ${totalStructure} pts -> ${structureBV.toFixed(1)} BV`);
  console.log(`  Gyro: ${gyroBV.toFixed(1)} BV`);
  console.log(`  Pre-factor: ${preFactorDef.toFixed(1)} -> with defFactor ${defFactor}: ${expectedDefBV.toFixed(1)}`);
  console.log(`  Our defensive BV: ${ourDefBV.toFixed(1)}  (delta from expected: ${(ourDefBV - expectedDefBV).toFixed(1)})`);
  console.log(`  Our offensive BV: ${ourOffBV.toFixed(1)}  |  SF: ${r.breakdown!.speedFactor}`);
  console.log(`  IF gap is all defensive: implied defBV = ${impliedDefBV.toFixed(1)}, defGap = ${defGap.toFixed(1)}`);
  console.log(`  IF gap is all offensive: implied offBV = ${impliedOffBV.toFixed(1)}, offGap = ${offGap.toFixed(1)}`);
  console.log(`  Cockpit: ${unit.cockpit}`);
  console.log('');
}
