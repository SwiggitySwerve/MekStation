import type { IBlkDocument } from '@/types/formats/BlkFormat';
import type {
  IVehicle,
  IVehicleTurretSourceContext,
} from '@/types/unit/VehicleInterfaces';
import type { VehicleWeightBreakdown } from '@/utils/construction/vehicle/weightComposition';

type NativeTankWeightUnit = Pick<
  IVehicle,
  | 'engineType'
  | 'clanEngine'
  | 'engineRating'
  | 'motionType'
  | 'armorType'
  | 'armorLayoutError'
  | 'totalArmorPoints'
  | 'internalStructureType'
  | 'equipment'
  | 'turret'
  | 'secondaryTurret'
  | keyof IVehicleTurretSourceContext
>;

/** Native-input transport into the shared construction owner. */
export function computeNativeTankWeight(
  _source: IBlkDocument,
  _unit: NativeTankWeightUnit,
): VehicleWeightBreakdown | undefined {
  return undefined;
}

/**
 * The number-only legacy handler API cannot represent construction completeness.
 * @spec openspec/changes/reject-incomplete-combat-vehicle-handler-weight/specs/vehicle-unit-system/spec.md
 */
export function rejectIncompleteCombatVehicleWeight(): never {
  throw new Error(
    'Combat vehicle handler weight is incomplete: resolved equipment masses and complete construction terms are unavailable',
  );
}
