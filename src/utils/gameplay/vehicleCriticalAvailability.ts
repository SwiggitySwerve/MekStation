import type {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';
import type { IGameUnit } from '@/types/gameplay';

import type { IVehicleCriticalTableContext } from './vehicleCriticalTables';

type VehicleCriticalAvailabilityContext = Partial<
  Pick<
    IVehicleCriticalTableContext,
    | 'hasCargoLoaded'
    | 'hasWeaponAtLocation'
    | 'hasJammableWeaponAtLocation'
    | 'hasDestroyableWeaponAtLocation'
    | 'stabilizerAlreadyHit'
  >
>;

export function vehicleCriticalAvailabilityContext(
  targetUnit: IGameUnit | undefined,
  location: VehicleLocation | VTOLLocation,
): VehicleCriticalAvailabilityContext {
  const profile = targetUnit?.vehicleInit?.criticalAvailability;
  if (!profile) {
    return {};
  }

  const hasWeaponAtLocation =
    locationAvailability(profile.weaponLocations, location) ??
    locationAvailability(profile.jammableWeaponLocations, location) ??
    locationAvailability(profile.destroyableWeaponLocations, location);
  const hasJammableWeaponAtLocation =
    locationAvailability(profile.jammableWeaponLocations, location) ??
    (hasWeaponAtLocation === false ? false : undefined);
  const hasDestroyableWeaponAtLocation =
    locationAvailability(profile.destroyableWeaponLocations, location) ??
    (hasWeaponAtLocation === false ? false : undefined);
  const stabilizerAlreadyHit = locationAvailability(
    profile.stabilizerHitLocations,
    location,
  );

  return {
    ...(profile.cargoLoaded !== undefined
      ? { hasCargoLoaded: profile.cargoLoaded }
      : {}),
    ...(hasWeaponAtLocation !== undefined ? { hasWeaponAtLocation } : {}),
    ...(hasJammableWeaponAtLocation !== undefined
      ? { hasJammableWeaponAtLocation }
      : {}),
    ...(hasDestroyableWeaponAtLocation !== undefined
      ? { hasDestroyableWeaponAtLocation }
      : {}),
    ...(stabilizerAlreadyHit !== undefined ? { stabilizerAlreadyHit } : {}),
  };
}

function locationAvailability(
  locations: readonly (VehicleLocation | VTOLLocation)[] | undefined,
  location: VehicleLocation | VTOLLocation,
): boolean | undefined {
  return locations === undefined ? undefined : locations.includes(location);
}
