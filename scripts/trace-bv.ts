#!/usr/bin/env npx tsx
/**
 * Trace BV calculation step by step for a single unit.
 */
import * as fs from 'fs';
import * as path from 'path';
import { calculateDefensiveBV, calculateOffensiveBVWithHeatTracking, calculateOffensiveSpeedFactor, getCockpitModifier } from '../src/utils/construction/battleValueCalculations';
import { calculateTMM, getArmorBVMultiplier } from '../src/types/validation/BattleValue';
import { EngineType } from '../src/types/construction/EngineType';
import { resolveEquipmentBV, normalizeEquipmentId } from '../src/utils/construction/equipmentBVResolver';

const target = process.argv[2] || 'Roadrunner RD-1R';
const idx = JSON.parse(fs.readFileSync('public/data/units/battlemechs/index.json', 'utf-8'));
const iu = idx.units.find((u: any) => `${u.chassis} ${u.model}` === target);
if (!iu) { console.log('Not found:', target); process.exit(1); }
const ud = JSON.parse(fs.readFileSync(path.join('public/data/units/battlemechs', iu.path), 'utf-8'));

console.log(`=== ${iu.chassis} ${iu.model} ===`);

// MUL BV
const mulPath = 'scripts/data-migration/mul-bv-cache.json';
const mulCache = JSON.parse(fs.readFileSync(mulPath, 'utf-8'));
const mulEntry = mulCache[`${iu.chassis} ${iu.model}`];
const refBV = mulEntry?.matchType === 'exact' ? mulEntry.bv : iu.bv;
console.log(`Reference BV: ${refBV} (source: ${mulEntry?.matchType === 'exact' ? 'MUL' : 'index'})`);

// Basic params
const walkMP = ud.movement.walk;
const runMP = Math.ceil(walkMP * 1.5);
const jumpMP = ud.movement.jump || 0;
console.log(`\nMovement: walk=${walkMP} run=${runMP} jump=${jumpMP}`);

const engineType = ud.engine.type.toUpperCase().includes('XL') ? (ud.techBase === 'CLAN' ? EngineType.XL_CLAN : EngineType.XL_IS) : EngineType.STANDARD;
console.log(`Engine type: ${engineType}`);

// Armor
let totalArmor = 0;
for (const [, val] of Object.entries(ud.armor.allocation)) {
  if (typeof val === 'number') totalArmor += val;
  else { const v = val as any; totalArmor += (v.front || 0) + (v.rear || 0); }
}
console.log(`Total armor: ${totalArmor}`);
const armorMult = getArmorBVMultiplier('standard'); // ferro-fibrous = standard multiplier
console.log(`Armor BV multiplier: ${armorMult}`);
console.log(`Armor BV: ${totalArmor} * 2.5 * ${armorMult} = ${totalArmor * 2.5 * armorMult}`);

// Structure
const structureMap: Record<number, number> = { 10: 11, 15: 16, 20: 21, 25: 26, 30: 31, 35: 36, 40: 44, 45: 52, 50: 52, 55: 57, 60: 60, 65: 62, 70: 65, 75: 67, 80: 72, 85: 77, 90: 82, 95: 87, 100: 93 };
const totalStructure = structureMap[ud.tonnage] || Math.ceil(ud.tonnage * 0.93);
console.log(`Total structure: ${totalStructure}`);

// TMM
const tmm = calculateTMM(runMP, jumpMP);
console.log(`TMM: ${tmm} (for defensive factor)`);

// Defensive BV
const defResult = calculateDefensiveBV({
  totalArmorPoints: totalArmor,
  totalStructurePoints: totalStructure,
  tonnage: ud.tonnage,
  runMP, jumpMP,
  armorType: 'standard',
  structureType: 'standard',
  gyroType: 'standard',
  engineType,
  defensiveEquipmentBV: 0,
  explosivePenalties: 0,
});
console.log(`\nDefensive BV: ${defResult.totalDefensiveBV.toFixed(2)}`);

// Speed factor
const sf = calculateOffensiveSpeedFactor(runMP, jumpMP);
console.log(`\nOffensive speed factor: ${sf} (runMP=${runMP} jumpMP=${jumpMP})`);

// Weapons
const weapons: Array<{id: string; name: string; heat: number; bv: number; rear?: boolean}> = [];
for (const eq of ud.equipment || []) {
  const lo = eq.id.toLowerCase();
  // Skip non-weapons
  if (lo.includes('ammo') || lo.includes('heatsink') || lo.includes('heat-sink') || lo.includes('case') ||
      lo.includes('endo') || lo.includes('ferro') || lo.includes('artemis') || lo.includes('targeting') ||
      lo.includes('ecm') || lo.includes('probe') || lo.includes('c3') || lo.includes('masc') ||
      lo.includes('tsm') || lo.includes('jump') || lo.includes('tag')) continue;

  // Try Clan resolution for Clan units
  let res = resolveEquipmentBV(eq.id);
  if (ud.techBase === 'CLAN') {
    const norm = normalizeEquipmentId(lo);
    const clanRes = resolveEquipmentBV('clan-' + norm);
    if (clanRes.resolved && clanRes.battleValue > res.battleValue) res = clanRes;
  }
  console.log(`  Weapon: "${eq.id}" @ ${eq.location} -> BV=${res.battleValue} Heat=${res.heat}`);
  weapons.push({ id: normalizeEquipmentId(eq.id), name: lo, heat: res.heat, bv: res.battleValue });
}

// Heat sinks
const engineIntegratedHS = Math.min(10, Math.floor(ud.engine.rating / 25));
const isDHS = ud.heatSinks.type.toUpperCase().includes('DOUBLE');
const heatDiss = ud.heatSinks.count * (isDHS ? 2 : 1);
console.log(`\nHeat sinks: ${ud.heatSinks.count} ${isDHS ? 'DHS' : 'SHS'} = ${heatDiss} dissipation`);
console.log(`Engine integrated: ${engineIntegratedHS}`);

// Offensive BV
const offResult = calculateOffensiveBVWithHeatTracking({
  weapons, ammo: [], tonnage: ud.tonnage,
  walkMP, runMP, jumpMP, heatDissipation: heatDiss,
  hasTargetingComputer: false, hasTSM: false,
  hasStealthArmor: false, hasNullSig: false,
  hasVoidSig: false, hasChameleonShield: false,
  physicalWeaponBV: 0, offensiveEquipmentBV: 0,
  engineType, heatSinkCount: ud.heatSinks.count,
  jumpHeatMP: jumpMP,
});

console.log(`\nOffensive BV: ${offResult.totalOffensiveBV.toFixed(2)}`);
console.log(`  Weapon BV (heat-adjusted): ${offResult.weaponBV.toFixed(2)}`);
console.log(`  Ammo BV: ${offResult.ammoBV.toFixed(2)}`);
console.log(`  Weight bonus: ${offResult.weightBonus.toFixed(2)}`);
console.log(`  Speed factor: ${offResult.speedFactor}`);

// Total
const cockpitMod = getCockpitModifier('standard');
const totalBV = Math.round((defResult.totalDefensiveBV + offResult.totalOffensiveBV) * cockpitMod);
console.log(`\nBase BV: ${(defResult.totalDefensiveBV + offResult.totalOffensiveBV).toFixed(2)}`);
console.log(`Cockpit modifier: ${cockpitMod}`);
console.log(`Total BV: ${totalBV}`);
console.log(`Reference BV: ${refBV}`);
console.log(`Difference: ${totalBV - refBV} (${((totalBV - refBV) / refBV * 100).toFixed(1)}%)`);
