import {
  VehicleLocation,
  VTOLLocation,
  SuperHeavyVehicleLocation,
} from '@/types/construction/UnitLocation';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

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

export function hasSixSideVehicleArmor(profile: IVehicleArmorProfile): boolean {
  return profile.isSuperheavy === true && !profile.isVTOL;
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
  if (hasSixSideVehicleArmor(armorProfile)) {
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
  if (hasSixSideVehicleArmor(eventInput.profile))
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

/**
 * Most armor points a combat vehicle (Tank, SuperHeavy, VTOL) may carry in
 * total: `(int)(tonnage * 7 / 2 + 40)` (`TestTank.java:338`).
 */
export function getTankMaxTotalArmor(tonnage: number): number {
  return Math.floor((tonnage * 7) / 2 + 40);
}

/**
 * Armor per ton of weight by motion type (`TestSupportVehicle.maxArmorFactor`,
 * TestSupportVehicle.java:585-617; SVType by movement mode, :146-166). Naval,
 * Submarine and Hydrofoil are the NAVAL type; Maglev is RAIL.
 */
const SUPPORT_ARMOR_PER_TON: Readonly<Record<GroundMotionType, number>> = {
  [GroundMotionType.TRACKED]: 2,
  [GroundMotionType.WHEELED]: 2,
  [GroundMotionType.HOVER]: 1,
  [GroundMotionType.VTOL]: 1,
  [GroundMotionType.WIGE]: 0.5,
  [GroundMotionType.RAIL]: 0.5,
  [GroundMotionType.MAGLEV]: 0.5,
  [GroundMotionType.NAVAL]: 0.334,
  [GroundMotionType.SUBMARINE]: 0.334,
  [GroundMotionType.HYDROFOIL]: 0.334,
};

/** A naval support vehicle over this weight is Large (`EntityWeightClass.java:94-95,371-377`: 300 t). */
const NAVAL_MEDIUM_SUPPORT_MAX_TONS = 300;
const LARGE_NAVAL_SUPPORT_ARMOR_PER_TON = 0.05;

/**
 * Most armor points a support vehicle (SupportTank, LargeSupportTank,
 * SupportVTOL) may carry in total: `4 + (int)(tonnage * factor)`
 * (`TestSupportVehicle.java:585-617`). BAR does not enter the limit.
 */
export function getSupportVehicleMaxTotalArmor(
  motionType: GroundMotionType,
  tonnage: number,
): number {
  const isNaval =
    motionType === GroundMotionType.NAVAL ||
    motionType === GroundMotionType.SUBMARINE ||
    motionType === GroundMotionType.HYDROFOIL;
  const factor =
    isNaval && tonnage > NAVAL_MEDIUM_SUPPORT_MAX_TONS
      ? LARGE_NAVAL_SUPPORT_ARMOR_PER_TON
      : SUPPORT_ARMOR_PER_TON[motionType];
  return 4 + Math.trunc(tonnage * factor);
}
