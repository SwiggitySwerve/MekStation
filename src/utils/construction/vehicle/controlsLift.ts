/** Combat-vehicle controls and lift/dive mass. See RULES.md for pinned sources. */
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ceilToHalfTon } from '@/utils/physical/weightUtils';

export interface VehicleControlsLiftContext {
  tonnage: number;
  motionType: GroundMotionType;
  /** Omitted on legacy combat inputs. Support retains existing calculations. */
  unitType?: UnitType.VEHICLE | UnitType.VTOL | UnitType.SUPPORT_VEHICLE;
  /** Explicit source fact: upstream BLK uses tag presence, not boolean payload. */
  hasNoControlSystems?: boolean;
}

/** @spec openspec/changes/establish-all-unit-data-parity/specs/vehicle-unit-system/spec.md */
export function computeVehicleControlsLiftWeights(
  context: VehicleControlsLiftContext,
): { controls: number; lift: number } {
  if (context.unitType === UnitType.SUPPORT_VEHICLE)
    return { controls: 0, lift: 0 };
  const controls = context.hasNoControlSystems
    ? 0
    : ceilToHalfTon(context.tonnage / 20);
  let lift = 0;
  switch (context.motionType) {
    case GroundMotionType.HOVER:
    case GroundMotionType.VTOL:
    case GroundMotionType.HYDROFOIL:
    case GroundMotionType.SUBMARINE:
    case GroundMotionType.WIGE:
      lift = ceilToHalfTon(context.tonnage / 10);
  }
  return { controls, lift };
}
