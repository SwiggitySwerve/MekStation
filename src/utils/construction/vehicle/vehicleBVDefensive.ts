import { getArmorBVMultiplier } from '@/types/validation/BattleValue';

import type {
  VehicleBVInput,
  VehicleDefensiveBVBreakdown,
} from './vehicleBVTypes';

import { resolveEquipmentBV } from '../equipmentBVResolver';
import { calculateVehicleTMM } from './vehicleBVMovement';

// =============================================================================
// Structure Multiplier
// =============================================================================

/**
 * Structure-type BV multiplier for vehicles.
 * Same table as mechs for the overlapping types; vehicles have no industrial structure.
 */
function getVehicleStructureBVMultiplier(structureType?: string): number {
  const key = (structureType ?? 'standard').toLowerCase();
  switch (key) {
    case 'endo-steel':
      return 1.0; // vehicles: Endo-Steel structure has no BV penalty
    case 'composite':
      return 0.5;
    case 'reinforced':
      return 2.0;
    case 'standard':
    default:
      return 1.0;
  }
}

/**
 * Compute defensive BV per the vehicle rules.
 *
 * armorBV = totalArmor × 2.5 × armorMult × barScale
 * structureBV = totalStructure × 1.5 × structureMult
 * baseDef = armorBV + structureBV + defEquipBV − explosivePenalty
 * defensiveFactor = 1 + ((TMM × 0.5) / 10)
 * defensiveBV = baseDef × defensiveFactor
 */
export function calculateVehicleDefensiveBV(
  input: VehicleBVInput,
): VehicleDefensiveBVBreakdown {
  const armorMult = getArmorBVMultiplier(input.armorType ?? 'standard');
  const structureMult = getVehicleStructureBVMultiplier(input.structureType);

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

  // TMM and defensive factor — vehicles use TMM × 0.5 / 10 (not the mech TMM/10).
  const tmm = calculateVehicleTMM(input);
  const defensiveFactor = 1 + (tmm * 0.5) / 10;

  const baseDef =
    armorBV + structureBV + defensiveEquipmentBV - explosivePenalty;
  const total = baseDef * defensiveFactor;

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
