import {
  ArmorTypeEnum,
  getArmorDefinition,
} from '@/types/construction/ArmorType';
import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';
import { BLK_SUPERHEAVY_ARMOR_LOCATIONS } from '@/types/formats/BlkFormat';
import { ceilToHalfTon } from '@/utils/physical/weightUtils';

import {
  computeVehicleArmorPoints,
  computeSupportVehicleBarArmorPointsFromTonnage,
  getSupportVehicleBarArmorWeight,
  resolveSupportVehicleArmorTechRating,
  getTotalVehicleArmor,
} from './armor';
import {
  getMaxVehicleArmor,
  hasSixSideVehicleArmor,
  type IVehicleArmorProfile,
  type VehicleArmorLocation,
} from './armorLimits';

export {
  getMaxVehicleArmor,
  getMaxVehicleArmorForLocation,
} from './armorLimits';
export type {
  VehicleArmorLocation,
  IVehicleArmorProfile,
  IGetMaxVehicleArmorInput,
  IGetMaxVehicleArmorForLocationInput,
} from './armorLimits';

/** BLKTankFile / BLKLargeSupportTankFile six-side layout; Tank.java:127-130
 * identifies Turret as rear and Turret 2 as front, matching record sheets.
 * BLKLargeSupportTankFile:124-137 keeps Body outside the six/eight armor entries. */
export function getVehicleArmorEditorLayout(profile: IVehicleArmorProfile): {
  locations: { location: VehicleArmorLocation; label: string }[];
  isSixSide: boolean;
  canAutoAllocate: boolean;
} {
  const isSixSide = hasSixSideVehicleArmor(profile);
  const hull = isSixSide
    ? BLK_SUPERHEAVY_ARMOR_LOCATIONS.slice(0, 6)
    : [
        VehicleLocation.FRONT,
        VehicleLocation.LEFT,
        VehicleLocation.RIGHT,
        VehicleLocation.REAR,
      ];
  const locations: { location: VehicleArmorLocation; label: string }[] =
    hull.map((location) => ({
      location,
      label:
        location === VehicleLocation.LEFT
          ? 'Left Side'
          : location === VehicleLocation.RIGHT
            ? 'Right Side'
            : location,
    }));
  if (profile.hasTurret)
    locations.push({
      location: VehicleLocation.TURRET,
      label: profile.isChinTurret
        ? 'Chin Turret'
        : profile.hasSecondaryTurret
          ? 'Rear Turret'
          : 'Turret',
    });
  if (profile.hasSecondaryTurret)
    locations.push({
      location: VehicleLocation.TURRET_2,
      label: 'Front Turret',
    });
  if (profile.isVTOL)
    locations.push({ location: VTOLLocation.ROTOR, label: 'Rotor' });
  if (profile.isSupport && !isSixSide)
    locations.push({ location: VehicleLocation.BODY, label: 'Body' });
  return {
    locations,
    isSixSide,
    canAutoAllocate: !isSixSide && !profile.usesBarArmor,
  };
}

export function getVehicleArmorEditorFigures(input: {
  tonnage: number;
  armorType: ArmorTypeEnum;
  armorTonnage: number;
  barRating?: number | null;
  armorTechRating?: number;
  armorAllocation: Record<string, number>;
  profile: IVehicleArmorProfile;
}): {
  availablePoints: number;
  allocatedPoints: number;
  maxTotalArmor: number;
  maxUsefulTonnage: number;
  unallocatedPoints: number;
  wastedPoints: number;
} {
  const maxTotalArmor = getMaxVehicleArmor(input);
  const bar =
    input.profile.usesBarArmor && input.barRating != null
      ? input.barRating
      : undefined;
  const rating = resolveSupportVehicleArmorTechRating(input.armorTechRating);
  const availablePoints =
    bar === undefined
      ? computeVehicleArmorPoints(input.armorTonnage, input.armorType)
      : computeSupportVehicleBarArmorPointsFromTonnage(
          input.armorTonnage,
          bar,
          rating,
          maxTotalArmor,
        );
  const allocatedPoints = getTotalVehicleArmor(
    input.armorAllocation,
    input.profile.hasTurret,
    input.profile.hasSecondaryTurret,
  );
  return {
    availablePoints,
    allocatedPoints,
    maxTotalArmor,
    maxUsefulTonnage:
      bar === undefined
        ? ceilToHalfTon(
            maxTotalArmor /
              (getArmorDefinition(input.armorType)?.pointsPerTon ?? 16),
          )
        : getSupportVehicleBarArmorWeight(
            maxTotalArmor,
            bar,
            rating,
            input.tonnage < 5,
          ),
    unallocatedPoints: availablePoints - allocatedPoints,
    wastedPoints: Math.max(0, availablePoints - maxTotalArmor),
  };
}

export { computeVehicleArmorPoints as calculateArmorPoints } from './armor';
