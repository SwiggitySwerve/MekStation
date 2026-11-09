/** Vehicle armor editor figures and pinned automatic allocation. See RULES.md. */
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';

import {
  computeVehicleArmorPoints,
  computeVehicleArmorWeight,
  computeSupportVehicleBarArmorPointsFromTonnage,
  getSupportVehicleBarArmorWeight,
  resolveSupportVehicleArmorTechRating,
  getTotalVehicleArmor,
} from './armor';
import {
  getMaxVehicleArmor,
  getVehicleArmoredLocations,
  hasSixSideVehicleArmor,
  VTOL_MAX_ROTOR_ARMOR,
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
export { computeVehicleArmorPoints as calculateArmorPoints } from './armor';

/** Labels are presentation; the limit owner supplies installed armor topology. */
export function getVehicleArmorEditorLayout(profile: IVehicleArmorProfile): {
  locations: { location: VehicleArmorLocation; label: string }[];
  isSixSide: boolean;
  canAutoAllocate: boolean;
} {
  const isSixSide = hasSixSideVehicleArmor(profile);
  const locations = getVehicleArmoredLocations(profile).map((location) => ({
    location,
    label:
      location === VehicleLocation.LEFT
        ? 'Left Side'
        : location === VehicleLocation.RIGHT
          ? 'Right Side'
          : location === VehicleLocation.TURRET
            ? profile.isChinTurret
              ? 'Chin Turret'
              : profile.hasSecondaryTurret
                ? 'Rear Turret'
                : 'Turret'
            : location === VehicleLocation.TURRET_2
              ? 'Front Turret'
              : location,
  }));
  return { locations, isSixSide, canAutoAllocate: true };
}

export interface IVehicleArmorEditorInput {
  tonnage: number;
  armorType: ArmorTypeEnum;
  armorTonnage: number;
  barRating?: number | null;
  armorTechRating?: number;
  armorAllocation: Record<string, number>;
  profile: IVehicleArmorProfile;
}

/** MML ArmorAllocationView: raw purchased points, available budget and waste. */
export function getVehicleArmorEditorFigures(input: IVehicleArmorEditorInput): {
  availablePoints: number;
  allocatedPoints: number;
  maxTotalArmor: number;
  maxUsefulTonnage: number;
  unallocatedPoints: number;
  wastedPoints: number;
  overLimitPoints: number;
} {
  const maxTotalArmor = getMaxVehicleArmor(input);
  const bar =
    input.profile.usesBarArmor && input.barRating != null
      ? input.barRating
      : undefined;
  const rating = resolveSupportVehicleArmorTechRating(input.armorTechRating);
  const rawPoints =
    bar === undefined
      ? computeVehicleArmorPoints(input.armorTonnage, input.armorType)
      : computeSupportVehicleBarArmorPointsFromTonnage(
          input.armorTonnage,
          bar,
          rating,
          Number.MAX_SAFE_INTEGER,
        );
  const availablePoints = Math.min(rawPoints, maxTotalArmor);
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
        ? computeVehicleArmorWeight(maxTotalArmor, input.armorType)
        : getSupportVehicleBarArmorWeight(
            maxTotalArmor,
            bar,
            rating,
            input.tonnage < 5,
          ),
    unallocatedPoints: availablePoints - allocatedPoints,
    wastedPoints: Math.max(0, rawPoints - availablePoints),
    overLimitPoints: Math.max(0, allocatedPoints - maxTotalArmor),
  };
}

/** MML CVStructureTab:877-940 / SVArmorTab:286-364, with nonnegative tiny budgets. */
export function autoAllocateVehicleArmor(
  input: IVehicleArmorEditorInput,
): Record<string, number> {
  let remaining = Math.max(
    0,
    getVehicleArmorEditorFigures(input).availablePoints,
  );
  const allocation: Record<string, number> = Object.fromEntries(
    Object.keys(input.armorAllocation).map((location) => [location, 0]),
  );
  if (input.profile.isVTOL) {
    const rotor = Math.min(remaining, VTOL_MAX_ROTOR_ARMOR);
    allocation[VTOLLocation.ROTOR] = rotor;
    remaining -= rotor;
  }
  const locations = getVehicleArmoredLocations(input.profile).filter(
    (location) => location !== VTOLLocation.ROTOR,
  );
  const otherPercent = 1 / locations.length;
  const frontRearPercent = 1 - otherPercent * (locations.length - 2);
  let allocated = 0;
  for (const location of locations) {
    const percent =
      location === VehicleLocation.FRONT
        ? frontRearPercent * 0.6
        : location === VehicleLocation.REAR
          ? frontRearPercent * 0.4
          : otherPercent;
    const points = Math.floor(remaining * percent);
    allocation[location] = points;
    allocated += points;
  }
  allocation[VehicleLocation.FRONT] += remaining - allocated;
  return allocation;
}
