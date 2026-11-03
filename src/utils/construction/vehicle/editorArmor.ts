import {
  ArmorTypeEnum,
  getArmorDefinition,
} from '@/types/construction/ArmorType';
import {
  VehicleLocation,
  VTOLLocation,
  SuperHeavyVehicleLocation,
} from '@/types/construction/UnitLocation';
import { BLK_SUPERHEAVY_ARMOR_LOCATIONS } from '@/types/formats/BlkFormat';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { ceilToHalfTon } from '@/utils/physical/weightUtils';

import {
  computeVehicleArmorPoints,
  computeSupportVehicleBarArmorPointsFromTonnage,
  getSupportVehicleBarArmorWeight,
  resolveSupportVehicleArmorTechRating,
  getTotalVehicleArmor,
  getTankMaxTotalArmor,
  getSupportVehicleMaxTotalArmor,
} from './armor';

export type VehicleArmorLocation =
  | VehicleLocation
  | VTOLLocation
  | SuperHeavyVehicleLocation;

export interface IVehicleArmorProfile {
  readonly hasTurret: boolean;
  readonly isVTOL: boolean;
  readonly hasSecondaryTurret?: boolean;
  readonly isSuperheavy?: boolean;
  readonly isSupport?: boolean;
  readonly isChinTurret?: boolean;
  readonly motionType?: GroundMotionType;
  readonly usesBarArmor?: boolean;
}

/** BLKTankFile / BLKLargeSupportTankFile six-side layout; Tank.java:127-130
 * identifies Turret as rear and Turret 2 as front, matching record sheets.
 * BLKLargeSupportTankFile:124-137 keeps Body outside the six/eight armor entries. */
export function getVehicleArmorEditorLayout(profile: IVehicleArmorProfile): {
  locations: { location: VehicleArmorLocation; label: string }[];
  isSixSide: boolean;
  canAutoAllocate: boolean;
} {
  const isSixSide = profile.isSuperheavy === true && !profile.isVTOL;
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

export interface IGetMaxVehicleArmorForLocationInput {
  readonly tonnage: number;
  readonly location: VehicleArmorLocation;
  readonly profile: IVehicleArmorProfile;
}

export interface IGetMaxVehicleArmorInput {
  readonly tonnage: number;
  readonly profile: IVehicleArmorProfile;
}

interface IVehicleArmorLimitContext {
  readonly baseStructure: number;
  readonly profile: IVehicleArmorProfile & { hasSecondaryTurret: boolean };
}

type VehicleArmorLimitResolver = (context: IVehicleArmorLimitContext) => number;

const VEHICLE_ARMOR_LIMIT_RESOLVERS: ReadonlyMap<
  VehicleArmorLocation,
  VehicleArmorLimitResolver
> = new Map<VehicleArmorLocation, VehicleArmorLimitResolver>([
  [VehicleLocation.FRONT, ({ baseStructure }) => baseStructure * 4],
  [VehicleLocation.LEFT, ({ baseStructure }) => baseStructure * 3],
  [VehicleLocation.RIGHT, ({ baseStructure }) => baseStructure * 3],
  [VehicleLocation.REAR, ({ baseStructure }) => baseStructure * 2],
  [
    VehicleLocation.TURRET,
    ({ baseStructure, profile }) => (profile.hasTurret ? baseStructure * 2 : 0),
  ],
  [
    VehicleLocation.TURRET_2,
    ({ baseStructure, profile }) =>
      profile.hasSecondaryTurret ? baseStructure * 2 : 0,
  ],
  [VTOLLocation.ROTOR, ({ profile }) => (profile.isVTOL ? 2 : 0)],
]);

export { computeVehicleArmorPoints as calculateArmorPoints } from './armor';

export function getMaxVehicleArmorForLocation(
  input: IGetMaxVehicleArmorForLocationInput | number,
  ...legacy:
    | []
    | [
        location: VehicleArmorLocation,
        hasTurret: boolean,
        isVTOL: boolean,
        hasSecondaryTurret?: boolean,
      ]
): number {
  const [location, hasTurret, isVTOL, hasSecondaryTurret] = legacy as [
    VehicleArmorLocation,
    boolean,
    boolean,
    boolean | undefined,
  ];
  const eventInput: IGetMaxVehicleArmorForLocationInput =
    typeof input !== 'number'
      ? input
      : {
          tonnage: input,
          location,
          profile: { hasTurret, isVTOL, hasSecondaryTurret },
        };
  const armorProfile: IVehicleArmorProfile & { hasSecondaryTurret: boolean } = {
    ...eventInput.profile,
    hasSecondaryTurret: eventInput.profile.hasSecondaryTurret ?? false,
  };
  const baseStructure = Math.floor(eventInput.tonnage / 10) + 1;
  if (getVehicleArmorEditorLayout(armorProfile).isSixSide) {
    if (eventInput.location === VehicleLocation.BODY) return 0;
    return getMaxVehicleArmor({
      tonnage: eventInput.tonnage,
      profile: armorProfile,
    });
  }
  const resolver = VEHICLE_ARMOR_LIMIT_RESOLVERS.get(eventInput.location);
  return resolver?.({ baseStructure, profile: armorProfile }) ?? 0;
}

export function getMaxVehicleArmor(
  input: IGetMaxVehicleArmorInput | number,
  ...legacy:
    | []
    | [hasTurret: boolean, isVTOL: boolean, hasSecondaryTurret?: boolean]
): number {
  const [hasTurret, isVTOL, hasSecondaryTurret] = legacy as [
    boolean,
    boolean,
    boolean | undefined,
  ];
  const eventInput: IGetMaxVehicleArmorInput =
    typeof input !== 'number'
      ? input
      : {
          tonnage: input,
          profile: { hasTurret, isVTOL, hasSecondaryTurret },
        };
  if (getVehicleArmorEditorLayout(eventInput.profile).isSixSide)
    return eventInput.profile.isSupport
      ? getSupportVehicleMaxTotalArmor(
          eventInput.profile.motionType ?? GroundMotionType.TRACKED,
          eventInput.tonnage,
        )
      : getTankMaxTotalArmor(eventInput.tonnage);
  let total = 0;
  total += getMaxVehicleArmorForLocation({
    tonnage: eventInput.tonnage,
    location: VehicleLocation.FRONT,
    profile: eventInput.profile,
  });
  total += getMaxVehicleArmorForLocation({
    tonnage: eventInput.tonnage,
    location: VehicleLocation.LEFT,
    profile: eventInput.profile,
  });
  total += getMaxVehicleArmorForLocation({
    tonnage: eventInput.tonnage,
    location: VehicleLocation.RIGHT,
    profile: eventInput.profile,
  });
  total += getMaxVehicleArmorForLocation({
    tonnage: eventInput.tonnage,
    location: VehicleLocation.REAR,
    profile: eventInput.profile,
  });
  if (eventInput.profile.hasTurret) {
    total += getMaxVehicleArmorForLocation({
      tonnage: eventInput.tonnage,
      location: VehicleLocation.TURRET,
      profile: eventInput.profile,
    });
  }
  if (eventInput.profile.hasSecondaryTurret === true) {
    total += getMaxVehicleArmorForLocation({
      tonnage: eventInput.tonnage,
      location: VehicleLocation.TURRET_2,
      profile: eventInput.profile,
    });
  }
  if (eventInput.profile.isVTOL) {
    total += getMaxVehicleArmorForLocation({
      tonnage: eventInput.tonnage,
      location: VTOLLocation.ROTOR,
      profile: eventInput.profile,
    });
  }
  return total;
}
