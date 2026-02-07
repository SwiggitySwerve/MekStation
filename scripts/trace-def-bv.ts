import * as fs from 'fs';
import * as path from 'path';
import { STRUCTURE_POINTS_TABLE } from '../src/types/construction/InternalStructureType';
import {
  calculateDefensiveBV,
  calculateTMM,
} from '../src/utils/construction/battleValueCalculations';
import { getArmorBVMultiplier, getStructureBVMultiplier, getGyroBVMultiplier, getEngineBVMultiplier } from '../src/types/validation/BattleValue';

const report = JSON.parse(fs.readFileSync('validation-output/bv-validation-report.json', 'utf8'));
const unitsDir = path.resolve(__dirname, '../public/data/units/battlemechs');
const index = JSON.parse(fs.readFileSync(path.join(unitsDir, 'index.json'), 'utf8'));

function calcTotalArmor(a: any): number {
  let t = 0;
  for (const v of Object.values(a)) {
    if (typeof v === 'number') t += v;
    else if (v && typeof v === 'object') t += ((v as any).front || 0) + ((v as any).rear || 0);
  }
  return t;
}

function calcTotalStructure(ton: number): number {
  const t = (STRUCTURE_POINTS_TABLE as any)[ton];
  if (!t) return 0;
  return t.head + t.centerTorso + t.sideTorso * 2 + t.arm * 2 + t.leg * 2;
}

function mpToTMM(mp: number): number {
  if (mp <= 2) return 0;
  if (mp <= 4) return 1;
  if (mp <= 6) return 2;
  if (mp <= 9) return 3;
  if (mp <= 17) return 4;
  if (mp <= 24) return 5;
  return 6;
}

// Pick a range of undercalculated units with different characteristics
const traceIds = [
  'ostroc-osr-4k',           // 60t IS, FUSION, Endo, jumpMP=6 (IJJ)
  'grasshopper-ghr-7x',      // 70t IS, no ammo, diff=-59
  'locust-lct-7v',           // 20t IS, no ammo, diff=-20
  'marauder-mad-9w',         // 75t IS, LIGHT engine, jumpMP=5 (IJJ)
  'boreas-d',                // 60t Clan, FUSION, no JJ
  'hunchback-hbk-6n',        // 50t IS simple (if exists)
  'wolverine-wvr-6r',        // 55t IS (if exists)
  'atlas-as7-d',             // 100t IS (if exists)
];

for (const unitId of traceIds) {
  const entry = (index.units as any[]).find((e: any) => e.id === unitId);
  if (!entry?.path) { console.log(`${unitId}: NOT FOUND`); continue; }
  const data = JSON.parse(fs.readFileSync(path.join(unitsDir, entry.path), 'utf8'));
  const r = report.allResults.find((x: any) => x.unitId === unitId);
  if (!r) { console.log(`${unitId}: NOT IN REPORT`); continue; }

  const b = r.breakdown;
  const totalArmor = calcTotalArmor(data.armor.allocation);
  const totalStructure = calcTotalStructure(data.tonnage);

  // Engine type normalization
  const rawEngineType = data.engine.type.toUpperCase();
  let engineType = rawEngineType;
  if (rawEngineType === 'XL' && data.techBase === 'CLAN') engineType = 'XL_CLAN';
  else if (rawEngineType === 'XL') engineType = 'XL_IS';
  else if (rawEngineType === 'XXL' && data.techBase === 'CLAN') engineType = 'XXL_CLAN';
  else if (rawEngineType === 'XXL') engineType = 'XXL_IS';

  const armorType = data.armor.type.toLowerCase().replace(/\s+/g, '-');
  const structureType = data.structure.type.toLowerCase().replace(/\s+/g, '-');
  const gyroType = (data.gyro?.type || 'STANDARD').toLowerCase().replace(/\s+/g, '-');

  const armorMult = getArmorBVMultiplier(armorType);
  const structMult = getStructureBVMultiplier(structureType);
  const gyroMult = getGyroBVMultiplier(gyroType);
  const engineMult = getEngineBVMultiplier(engineType);

  const walkMP = data.movement.walk;
  const jumpMP = data.movement.jump || 0;
  const runMP = Math.ceil(walkMP * 1.5);

  const armorBV = totalArmor * 2.5 * armorMult;
  const structBV = totalStructure * 1.5 * structMult * engineMult;
  const gyroBV = data.tonnage * gyroMult;
  const baseDef = armorBV + structBV + gyroBV;

  const runTMM = mpToTMM(runMP);
  const jumpTMM = jumpMP > 0 ? mpToTMM(jumpMP) + 1 : 0;
  const maxTMM = Math.max(runTMM, jumpTMM);
  const defFactor = 1 + maxTMM / 10.0;

  const ourDefBV = baseDef * defFactor;
  const reportedDefBV = b.defensiveBV;
  const expectedDefBV = r.indexBV - b.offensiveBV;
  const expectedBaseDef = expectedDefBV / defFactor;
  const baseDefGap = expectedBaseDef - baseDef;

  console.log(`\n=== ${unitId} (${data.tonnage}t ${data.techBase} ${data.engine.type} walk=${walkMP} jump=${jumpMP}) ===`);
  console.log(`  indexBV=${r.indexBV} calcBV=${r.calculatedBV} diff=${r.difference} (${r.percentDiff?.toFixed(1)}%)`);
  console.log(`  --- Armor ---`);
  console.log(`  totalArmor=${totalArmor} armorType=${armorType} armorMult=${armorMult}`);
  console.log(`  armorBV = ${totalArmor} * 2.5 * ${armorMult} = ${armorBV}`);
  console.log(`  --- Structure ---`);
  console.log(`  totalStructure=${totalStructure} structType=${structureType} structMult=${structMult}`);
  console.log(`  engineType=${engineType} engineMult=${engineMult}`);
  console.log(`  structBV = ${totalStructure} * 1.5 * ${structMult} * ${engineMult} = ${structBV}`);
  console.log(`  --- Gyro ---`);
  console.log(`  gyroType=${gyroType} gyroMult=${gyroMult}`);
  console.log(`  gyroBV = ${data.tonnage} * ${gyroMult} = ${gyroBV}`);
  console.log(`  --- DefEquip & Explosive ---`);
  console.log(`  defEquipBV=${b.defensiveEquipBV} explPenalty=${b.explosivePenalty}`);
  console.log(`  --- BaseDef ---`);
  console.log(`  baseDef = ${armorBV} + ${structBV} + ${gyroBV} + ${b.defensiveEquipBV} - ${b.explosivePenalty} = ${baseDef + b.defensiveEquipBV - b.explosivePenalty}`);
  console.log(`  --- Movement TMM ---`);
  console.log(`  runMP=${runMP} jumpMP=${jumpMP}`);
  console.log(`  runTMM=${runTMM} jumpTMM=${jumpTMM} maxTMM=${maxTMM}`);
  console.log(`  defFactor = 1 + ${maxTMM}/10 = ${defFactor}`);
  console.log(`  --- Result ---`);
  console.log(`  ourDefBV = baseDef * defFactor = ${(baseDef + b.defensiveEquipBV - b.explosivePenalty).toFixed(2)} * ${defFactor} = ${((baseDef + b.defensiveEquipBV - b.explosivePenalty) * defFactor).toFixed(2)}`);
  console.log(`  reportedDefBV = ${reportedDefBV.toFixed(2)}`);
  console.log(`  expectedDefBV = indexBV - offBV = ${r.indexBV} - ${b.offensiveBV.toFixed(2)} = ${expectedDefBV.toFixed(2)}`);
  console.log(`  --- Gap Analysis ---`);
  console.log(`  defBV gap = ${(expectedDefBV - reportedDefBV).toFixed(2)}`);
  console.log(`  baseDef gap (pre-factor) = ${baseDefGap.toFixed(2)}`);
  console.log(`  baseDef gap / tonnage = ${(baseDefGap / data.tonnage).toFixed(4)}`);
  console.log(`  baseDef gap / totalArmor = ${(baseDefGap / totalArmor).toFixed(4)}`);
  console.log(`  baseDef gap / totalStructure = ${(baseDefGap / totalStructure).toFixed(4)}`);

  // Check if gap could be TMM difference
  for (const altTMM of [maxTMM - 1, maxTMM + 1, maxTMM + 2]) {
    const altFactor = 1 + altTMM / 10.0;
    const altDefBV = (baseDef + b.defensiveEquipBV - b.explosivePenalty) * altFactor;
    const altGap = r.indexBV - b.offensiveBV - altDefBV;
    if (Math.abs(altGap) < Math.abs(expectedDefBV - reportedDefBV)) {
      console.log(`  ** Alt TMM=${altTMM} factor=${altFactor}: defBV=${altDefBV.toFixed(2)} gap=${altGap.toFixed(2)} (CLOSER)`);
    }
  }

  // Show equipment
  console.log(`  --- Equipment ---`);
  for (const eq of data.equipment) {
    console.log(`    ${eq.id} @ ${eq.location}`);
  }
}
