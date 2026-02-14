import { EngineType } from '../../types/construction/EngineType';
import {
  getArmorBVMultiplier,
  getEngineBVMultiplier,
  getGyroBVMultiplier,
  getStructureBVMultiplier,
} from '../../types/validation/BattleValue';
import { calculateTMM } from './battleValueMovement';
import { resolveEquipmentBV } from './equipmentBVResolver';

export interface DefensiveBVConfig {
  totalArmorPoints: number;
  totalStructurePoints: number;
  tonnage: number;
  runMP: number;
  jumpMP: number;
  armorType?: string;
  structureType?: string;
  gyroType?: string;
  engineType?: EngineType;
  bar?: number;
  engineMultiplier?: number;
  defensiveEquipmentBV?: number;
  explosivePenalties?: number;
  defensiveEquipment?: string[];
  hasStealthArmor?: boolean;
  hasChameleonLPS?: boolean;
  hasNullSig?: boolean;
  hasVoidSig?: boolean;
  umuMP?: number;
  hasBlueShield?: boolean;
}

export interface DefensiveBVResult {
  armorBV: number;
  structureBV: number;
  gyroBV: number;
  defensiveFactor: number;
  totalDefensiveBV: number;
}

export function calculateDefensiveBV(
  config: DefensiveBVConfig,
): DefensiveBVResult {
  const blueShieldBonus = config.hasBlueShield ? 0.2 : 0;
  const armorMultiplier =
    getArmorBVMultiplier(config.armorType ?? 'standard') + blueShieldBonus;
  const structureMultiplier =
    getStructureBVMultiplier(config.structureType ?? 'standard') +
    blueShieldBonus;
  const gyroMultiplier = getGyroBVMultiplier(config.gyroType ?? 'standard');

  const bar = config.bar ?? 10;
  const unitIsSuperheavy = config.tonnage > 100;
  const engineMultiplier =
    config.engineMultiplier !== undefined
      ? config.engineMultiplier
      : config.engineType !== undefined
        ? getEngineBVMultiplier(config.engineType, unitIsSuperheavy)
        : 1.0;

  let resolvedDefensiveEquipmentBV = config.defensiveEquipmentBV ?? 0;
  if (config.defensiveEquipment && config.defensiveEquipment.length > 0) {
    for (const equipmentId of config.defensiveEquipment) {
      const result = resolveEquipmentBV(equipmentId);
      resolvedDefensiveEquipmentBV += result.battleValue;
    }
  }

  const explosivePenalties = config.explosivePenalties ?? 0;

  const armorBV =
    Math.round(config.totalArmorPoints * 2.5 * armorMultiplier * bar) / 10;
  const structureBV =
    config.totalStructurePoints * 1.5 * structureMultiplier * engineMultiplier;
  const gyroBV = config.tonnage * gyroMultiplier;

  const baseDef =
    armorBV +
    structureBV +
    gyroBV +
    resolvedDefensiveEquipmentBV -
    explosivePenalties;

  let maxTMM = calculateTMM(
    config.runMP,
    Math.max(config.jumpMP, config.umuMP ?? 0),
  );

  if (config.hasStealthArmor || config.hasNullSig) {
    maxTMM += 2;
  }
  if (config.hasChameleonLPS) {
    maxTMM += 2;
  }
  if (config.hasVoidSig) {
    if (maxTMM < 3) {
      maxTMM = 3;
    } else if (maxTMM === 3) {
      maxTMM++;
    }
  }

  const defensiveFactor = 1 + maxTMM / 10.0;
  const totalDefensiveBV = baseDef * defensiveFactor;

  return {
    armorBV,
    structureBV,
    gyroBV,
    defensiveFactor,
    totalDefensiveBV,
  };
}
