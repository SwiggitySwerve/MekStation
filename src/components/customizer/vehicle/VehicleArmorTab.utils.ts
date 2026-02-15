import {
  ArmorTypeEnum,
  getArmorDefinition,
} from '@/types/construction/ArmorType';
import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';

export type VehicleArmorLocation = VehicleLocation | VTOLLocation;

export function calculateArmorPoints(
  tonnage: number,
  armorType: ArmorTypeEnum,
): number {
  const def = getArmorDefinition(armorType);
  const pointsPerTon = def?.pointsPerTon ?? 16;
  return Math.floor(tonnage * pointsPerTon);
}

export function getMaxVehicleArmorForLocation(
  tonnage: number,
  location: VehicleArmorLocation,
  hasTurret: boolean,
  isVTOL: boolean,
): number {
  const baseStructure = Math.floor(tonnage / 10) + 1;

  switch (location) {
    case VehicleLocation.FRONT:
      return baseStructure * 4;
    case VehicleLocation.LEFT:
    case VehicleLocation.RIGHT:
      return baseStructure * 3;
    case VehicleLocation.REAR:
      return baseStructure * 2;
    case VehicleLocation.TURRET:
      return hasTurret ? baseStructure * 2 : 0;
    case VTOLLocation.ROTOR:
      return isVTOL ? 2 : 0;
    default:
      return 0;
  }
}

export function getMaxVehicleArmor(
  tonnage: number,
  hasTurret: boolean,
  isVTOL: boolean,
): number {
  let total = 0;
  total += getMaxVehicleArmorForLocation(
    tonnage,
    VehicleLocation.FRONT,
    hasTurret,
    isVTOL,
  );
  total += getMaxVehicleArmorForLocation(
    tonnage,
    VehicleLocation.LEFT,
    hasTurret,
    isVTOL,
  );
  total += getMaxVehicleArmorForLocation(
    tonnage,
    VehicleLocation.RIGHT,
    hasTurret,
    isVTOL,
  );
  total += getMaxVehicleArmorForLocation(
    tonnage,
    VehicleLocation.REAR,
    hasTurret,
    isVTOL,
  );
  if (hasTurret) {
    total += getMaxVehicleArmorForLocation(
      tonnage,
      VehicleLocation.TURRET,
      hasTurret,
      isVTOL,
    );
  }
  if (isVTOL) {
    total += getMaxVehicleArmorForLocation(
      tonnage,
      VTOLLocation.ROTOR,
      hasTurret,
      isVTOL,
    );
  }
  return total;
}
