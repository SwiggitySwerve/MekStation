import type { VehicleState } from '@/stores/vehicleState';

import type { IUnitSessionIdentity } from './createUnitSession';
import type { NormalizedVehicleConfiguration } from './vehicleMapping';

/** Assign editor identity after deterministic definition mapping. */
export function createVehicleSession(
  configuration: NormalizedVehicleConfiguration,
  identity: IUnitSessionIdentity,
): VehicleState {
  return {
    ...configuration,
    armorAllocation: { ...configuration.armorAllocation },
    turret: configuration.turret ? { ...configuration.turret } : null,
    secondaryTurret: configuration.secondaryTurret
      ? { ...configuration.secondaryTurret }
      : null,
    equipment: configuration.equipment.map((item) => ({ ...item })),
    id: identity.id,
    createdAt: identity.createdAt,
    lastModifiedAt: identity.createdAt,
    isModified: false,
  };
}
