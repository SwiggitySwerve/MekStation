#!/usr/bin/env npx tsx
import * as fs from 'fs';
import * as path from 'path';
import { calculateDefensiveBV, calculateOffensiveBVWithHeatTracking, calculateTMM, getCockpitModifier } from '../src/utils/construction/battleValueCalculations';
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';
import { getEngineBVMultiplier, getArmorBVMultiplier, getStructureBVMultiplier, getGyroBVMultiplier } from '../src/types/validation/BattleValue';
import { EngineType } from '../src/types/construction/InternalStructureType';

const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json','utf-8'));

// Pick a few units to trace
const targets = ['Marauder MAD-3R', 'Atlas AS7-D', 'Hunchback HBK-4G', 'Wolverine WVR-6R'];

for (const target of targets) {
  const [chassis, model] = [target.split(' ').slice(0, -1).join(' '), target.split(' ').pop()];
  const iu = idx.units.find((u: any) => `${u.chassis} ${u.model}` === target);
  if (!iu) { console.log(`NOT FOUND: ${target}`); continue; }

  const fp = path.resolve('public/data/units/battlemechs', iu.path);
  const ud = JSON.parse(fs.readFileSync(fp, 'utf-8'));

  console.log(`\n${'='.repeat(60)}`);
  console.log(`${target} (${ud.tonnage}t, ${ud.techBase})`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Engine: ${ud.engine.type} ${ud.engine.rating}`);
  console.log(`Walk/Run/Jump: ${ud.movement.walk}/${Math.ceil(ud.movement.walk * 1.5)}/${ud.movement.jump || 0}`);
  console.log(`Heat Sinks: ${ud.heatSinks.count} ${ud.heatSinks.type}`);
  console.log(`Armor: ${ud.armor.type}`);
  console.log(`Structure: ${ud.structure.type}`);
  console.log(`Cockpit: ${ud.cockpit}`);
  console.log(`Gyro: ${ud.gyro.type}`);
  console.log(`Index BV: ${iu.battleValue}`);

  // Calculate armor points
  const aa = ud.armor.allocation;
  let totalArmor = 0;
  for (const [loc, val] of Object.entries(aa)) {
    if (typeof val === 'number') totalArmor += val;
    else if (typeof val === 'object' && val !== null) {
      const obj = val as {front?: number, rear?: number};
      totalArmor += (obj.front || 0) + (obj.rear || 0);
    }
  }
  console.log(`Total armor: ${totalArmor}`);

  // Structure points from table
  const STRUCT_TABLE: Record<number, number> = {
    20: 33, 25: 41, 30: 51, 35: 56, 40: 63, 45: 72, 50: 83, 55: 91,
    60: 99, 65: 107, 70: 114, 75: 125, 80: 131, 85: 140, 90: 147, 95: 155, 100: 163,
  };
  const totalStructure = STRUCT_TABLE[ud.tonnage] || 0;
  console.log(`Total structure: ${totalStructure}`);

  // Multipliers
  const armorMult = getArmorBVMultiplier(ud.armor.type);
  const structMult = getStructureBVMultiplier(ud.structure.type);
  const gyroMult = getGyroBVMultiplier(ud.gyro.type);

  let engineType = EngineType.STANDARD;
  const et = ud.engine.type.toUpperCase();
  if (et.includes('XL') && ud.techBase === 'CLAN') engineType = EngineType.XL_CLAN;
  else if (et.includes('XL')) engineType = EngineType.XL_IS;
  else if (et.includes('LIGHT')) engineType = EngineType.LIGHT;
  else if (et.includes('XXL')) engineType = EngineType.XXL;
  else if (et.includes('COMPACT')) engineType = EngineType.COMPACT;

  const engineMult = getEngineBVMultiplier(engineType);

  console.log(`\nMultipliers: armor=${armorMult} struct=${structMult} gyro=${gyroMult} engine=${engineMult}`);

  const armorBV = totalArmor * 2.5 * armorMult;
  const structBV = totalStructure * 1.5 * structMult * engineMult;
  const gyroBV = ud.tonnage * gyroMult;

  console.log(`armorBV = ${totalArmor} × 2.5 × ${armorMult} = ${armorBV}`);
  console.log(`structBV = ${totalStructure} × 1.5 × ${structMult} × ${engineMult} = ${structBV}`);
  console.log(`gyroBV = ${ud.tonnage} × ${gyroMult} = ${gyroBV}`);

  const baseDef = armorBV + structBV + gyroBV;

  const runMP = Math.ceil(ud.movement.walk * 1.5);
  const jumpMP = ud.movement.jump || 0;
  const tmm = calculateTMM(runMP, jumpMP);
  const defFactor = 1 + tmm / 10.0;

  console.log(`runMP=${runMP}, jumpMP=${jumpMP}, TMM=${tmm}, defFactor=${defFactor}`);
  console.log(`baseDef = ${baseDef.toFixed(1)}`);
  console.log(`defBV = ${baseDef.toFixed(1)} × ${defFactor} = ${(baseDef * defFactor).toFixed(1)}`);

  // Weapons
  console.log('\nWeapons:');
  let totalWeapBV = 0;
  for (const eq of ud.equipment) {
    const res = resolveEquipmentBV(eq.id);
    if (res.resolved && res.battleValue > 0) {
      console.log(`  ${eq.id.padEnd(30)} BV=${res.battleValue} heat=${res.heat}`);
      totalWeapBV += res.battleValue;
    }
  }
  console.log(`Total weapon BV (before heat adj): ${totalWeapBV}`);
  console.log(`Weight bonus: ${ud.tonnage}`);

  // Offensive speed factor
  const offMP = runMP + Math.round(jumpMP / 2.0);
  const offSF = Math.round(Math.pow(1 + (offMP - 5) / 10.0, 1.2) * 100.0) / 100.0;
  console.log(`offMP=${offMP}, offSF=${offSF}`);
}
