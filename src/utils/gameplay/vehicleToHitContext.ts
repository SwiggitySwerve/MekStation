import type {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';
import type { IAttackerState, IGameState } from '@/types/gameplay';

type VehicleWeaponToHitContext = {
  readonly vehicleMountLocation?: VehicleLocation | VTOLLocation;
  readonly vehicleIsTurretMounted?: boolean;
};

type VehicleToHitFields = Pick<
  IAttackerState,
  | 'vehicleTurretType'
  | 'vehicleTurretPivotedThisTurn'
  | 'vehicleWeaponMountLocation'
  | 'vehicleWeaponIsTurretMounted'
>;

export function deriveVehicleToHitContext(
  attackerUnit: IGameState['units'][string],
  weapons: readonly VehicleWeaponToHitContext[],
): VehicleToHitFields {
  if (attackerUnit.combatState?.kind !== 'vehicle') return {};
  const contextualWeapons = weapons.filter(
    (candidate) =>
      candidate.vehicleMountLocation !== undefined &&
      candidate.vehicleIsTurretMounted !== undefined,
  );
  const weapon = contextualWeapons[0];
  if (!weapon) return {};
  // The current attack model carries one target number per declaration.
  // Mixed vehicle mount contexts need per-weapon to-hit before we can apply
  // turret-only modifiers without over-stamping the whole volley.
  const hasMixedVehicleContext = contextualWeapons.some(
    (candidate) =>
      candidate.vehicleMountLocation !== weapon.vehicleMountLocation ||
      candidate.vehicleIsTurretMounted !== weapon.vehicleIsTurretMounted,
  );
  if (hasMixedVehicleContext) return {};

  return {
    vehicleTurretType: attackerUnit.combatState.state.turretType,
    vehicleTurretPivotedThisTurn:
      attackerUnit.combatState.state.turretPivotedThisTurn ?? false,
    vehicleWeaponMountLocation: weapon.vehicleMountLocation,
    vehicleWeaponIsTurretMounted: weapon.vehicleIsTurretMounted ?? false,
  };
}
