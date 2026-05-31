import type {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';
import type { IComponentDamageState, IGameUnit } from '@/types/gameplay';

import type { IVehicleCriticalTableContext } from './vehicleCriticalTables';

type VehicleCriticalAvailabilityContext = Partial<
  Pick<
    IVehicleCriticalTableContext,
    | 'hasCargoLoaded'
    | 'hasWeaponAtLocation'
    | 'hasJammableWeaponAtLocation'
    | 'hasDestroyableWeaponAtLocation'
    | 'stabilizerAlreadyHit'
    | 'flightStabilizerAlreadyHit'
  >
>;

export function vehicleCriticalAvailabilityContext(
  targetUnit: IGameUnit | undefined,
  location: VehicleLocation | VTOLLocation,
  componentDamage?: IComponentDamageState,
): VehicleCriticalAvailabilityContext {
  const runtimeDamage = componentDamage?.vehicleCriticalsByLocation?.[location];
  const runtimeContext = vehicleCriticalRuntimeContext(runtimeDamage);
  const profile = targetUnit?.vehicleInit?.criticalAvailability;
  if (!profile) {
    return runtimeContext;
  }

  const weaponsDestroyed = runtimeDamage?.weaponsDestroyed ?? 0;
  const weaponsJammed = runtimeDamage?.weaponsJammed ?? 0;
  const hasWeaponAtLocation =
    locationCountAvailability(profile.weaponLocationCounts, location) ??
    locationAvailability(profile.weaponLocations, location) ??
    locationAvailability(profile.jammableWeaponLocations, location) ??
    locationAvailability(profile.destroyableWeaponLocations, location);
  const hasJammableWeaponAtLocation =
    locationCountAvailability(
      profile.jammableWeaponLocationCounts,
      location,
      weaponsDestroyed + weaponsJammed,
    ) ??
    locationAvailability(profile.jammableWeaponLocations, location) ??
    (hasWeaponAtLocation === false ? false : undefined);
  const hasDestroyableWeaponAtLocation =
    locationCountAvailability(
      profile.destroyableWeaponLocationCounts,
      location,
      weaponsDestroyed,
    ) ??
    locationAvailability(profile.destroyableWeaponLocations, location) ??
    (hasWeaponAtLocation === false ? false : undefined);
  const stabilizerAlreadyHit =
    locationAvailability(profile.stabilizerHitLocations, location) ??
    runtimeDamage?.stabilizerHit;

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
    ...runtimeContext,
  };
}

function locationAvailability(
  locations: readonly (VehicleLocation | VTOLLocation)[] | undefined,
  location: VehicleLocation | VTOLLocation,
): boolean | undefined {
  return locations === undefined ? undefined : locations.includes(location);
}

function locationCountAvailability(
  counts: Partial<Record<string, number>> | undefined,
  location: VehicleLocation | VTOLLocation,
  unavailableCount = 0,
): boolean | undefined {
  return counts === undefined
    ? undefined
    : (counts[location] ?? 0) > unavailableCount;
}

function vehicleCriticalRuntimeContext(
  runtimeDamage:
    | NonNullable<IComponentDamageState['vehicleCriticalsByLocation']>[string]
    | undefined,
): VehicleCriticalAvailabilityContext {
  return {
    ...(runtimeDamage?.stabilizerHit === true
      ? { stabilizerAlreadyHit: true }
      : {}),
    ...(runtimeDamage?.flightStabilizerHit === true
      ? { flightStabilizerAlreadyHit: true }
      : {}),
  };
}
