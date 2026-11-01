import {
  getArmorBVMultiplier,
  getStructureBVMultiplier,
} from '@/types/validation/BattleValue';

import type {
  VehicleBVInput,
  VehicleDefensiveBVBreakdown,
} from './vehicleBVTypes';

import { resolveEquipmentBV } from '../equipmentBVResolver';
import { calculateVehicleBVDefensiveTMM } from './vehicleBVMovement';
import { getVehicleDefensiveTypeModifier } from './vehicleBVTypeModifier';

/**
 * Compute defensive BV per the vehicle rules.
 *
 * armorBV = totalArmor × 2.5 × armorMult × barScale
 * structureBV = totalStructure × 1.5 × structureMult
 * baseDef = armorBV + structureBV + defEquipBV − explosivePenalty
 * defensiveFactor = 1 + TMM / 10
 * defensiveBV = baseDef × typeModifier × defensiveFactor
 */
export function calculateVehicleDefensiveBV(
  input: VehicleBVInput,
): VehicleDefensiveBVBreakdown {
  const armorMult = getArmorBVMultiplier(input.armorType ?? 'standard');
  // BVCalculator.processStructure adds Blue Shield to the type multiplier.
  const blueShield = input.chassisEquipment?.some(
    (id) =>
      id
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/^is/, '') === 'blueshieldparticlefielddamper',
  );
  const structureMult =
    getStructureBVMultiplier(input.structureType ?? 'standard') +
    (blueShield ? 0.2 : 0);

  // Support vehicle BAR scaling: multiply armor BV by BAR/10 when BAR < 10.
  const bar = input.barRating;
  const barScale = bar !== null && bar !== undefined && bar < 10 ? bar / 10 : 1;

  const armorBV = input.totalArmorPoints * 2.5 * armorMult * barScale;
  const structureBV = input.totalStructurePoints * 1.5 * structureMult;

  let defensiveEquipmentBV = 0;
  for (const entry of input.defensiveEquipment ?? []) {
    if (entry.bvOverride !== undefined) {
      defensiveEquipmentBV += entry.bvOverride;
      continue;
    }
    defensiveEquipmentBV += resolveEquipmentBV(entry.id).battleValue;
  }

  const explosivePenalty = input.explosivePenalty ?? 0;

  // BVCalculator.processDefensiveFactor retains full precision at this stage.
  const tmm = calculateVehicleBVDefensiveTMM(input);
  const defensiveFactor = 1 + tmm / 10;

  const baseDef =
    armorBV + structureBV + defensiveEquipmentBV - explosivePenalty;
  const total =
    baseDef * getVehicleDefensiveTypeModifier(input) * defensiveFactor;

  return {
    armorBV,
    structureBV,
    defensiveEquipmentBV,
    explosivePenalty,
    defensiveFactor,
    tmm,
    total,
  };
}
