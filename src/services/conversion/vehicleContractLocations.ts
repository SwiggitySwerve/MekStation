import type { IVehicleMountedEquipment } from '@/types/unit/VehicleInterfaces';

import {
  SuperHeavyVehicleLocation,
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';

/** Converter tags shared by definition consumers; no positional armor order. */
const locations: Readonly<
  Record<string, IVehicleMountedEquipment['location']>
> = {
  ...VehicleLocation,
  ...SuperHeavyVehicleLocation,
  ...VTOLLocation,
  SPONSON: VehicleLocation.BODY,
};

export function resolveVehicleContractLocation(
  tag: string,
  what = 'vehicle location',
): IVehicleMountedEquipment['location'] {
  const location = locations[tag];
  if (location === undefined) throw new Error(`Unknown ${what}: ${tag}`);
  return location;
}
