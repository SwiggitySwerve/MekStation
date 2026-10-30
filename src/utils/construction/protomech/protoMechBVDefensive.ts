import { IProtoMechUnit, ProtoChassis } from '@/types/unit/ProtoMechInterfaces';

import { calculateTMM } from '../battleValueMovement';
import { resolveEquipmentBV } from '../equipmentBVResolver';
import {
  armorTotal,
  structureTotal,
  classifyEquipment,
} from './protoMechBVEquipment';

/** Proto armor / structure BV coefficients (Standard only — mult 1.0). */
const ARMOR_BV_PER_POINT = 2.5;

const STRUCTURE_BV_PER_POINT = 1.5;

// =============================================================================
// BV sub-calculations
// =============================================================================

interface DefensivePieces {
  readonly armorBV: number;
  readonly structureBV: number;
  readonly defensiveEquipmentBV: number;
  readonly explosivePenalty: number;
  readonly defensiveFactor: number;
  readonly defensiveBV: number;
}

function calculateProtoDefensive(unit: IProtoMechUnit): DefensivePieces {
  const armorPoints = armorTotal(unit);
  const structurePoints = structureTotal(unit);

  const armorBV = armorPoints * ARMOR_BV_PER_POINT;
  const structureBV = structurePoints * STRUCTURE_BV_PER_POINT;

  let defensiveEquipmentBV = 0;
  // ProtoMek inherits the empty BVCalculator.processExplosiveEquipment stage.
  const explosivePenalty = 0;

  for (const mount of unit.equipment) {
    const kind = classifyEquipment(mount);
    if (kind === 'defensive') {
      const resolved = resolveEquipmentBV(mount.equipmentId);
      if (resolved.resolved) defensiveEquipmentBV += resolved.battleValue;
    }
  }

  const tmm = calculateTMM(
    unit.runMP,
    unit.jumpMP,
    unit.chassisType === ProtoChassis.GLIDER ? 1 : 0,
  );
  const defensiveFactor = 1 + tmm / 10 + 0.1;

  const defensiveBV =
    (armorBV + structureBV + defensiveEquipmentBV - explosivePenalty) *
    defensiveFactor;

  return {
    armorBV,
    structureBV,
    defensiveEquipmentBV,
    explosivePenalty,
    defensiveFactor,
    defensiveBV,
  };
}

export { calculateProtoDefensive };
