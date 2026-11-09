/** Pinned vehicle armor limits and installed armored topology. See RULES.md. */
import {
  VehicleLocation,
  VTOLLocation,
  SuperHeavyVehicleLocation,
} from '@/types/construction/UnitLocation';
import { BLK_SUPERHEAVY_ARMOR_LOCATIONS } from '@/types/formats/BlkFormat';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';

import { hasSixSideVehicleHull } from './structure';

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

export interface IVehicleArmorConfiguration {
  readonly tonnage: number;
  readonly unitType?: UnitType;
  readonly motionType: GroundMotionType;
  readonly turret?: { readonly type: TurretType } | null;
  readonly secondaryTurret?: { readonly type: TurretType } | null;
  readonly usesBarArmor?: boolean;
}

/** One projection of installed vehicle armor facts for all editor consumers. */
export function getVehicleArmorProfile(
  input: IVehicleArmorConfiguration,
): IVehicleArmorProfile {
  return {
    hasTurret: input.turret != null,
    hasSecondaryTurret: input.secondaryTurret != null,
    isVTOL: input.motionType === GroundMotionType.VTOL,
    isSupport: input.unitType === UnitType.SUPPORT_VEHICLE,
    isChinTurret: input.turret?.type === TurretType.CHIN,
    isSuperheavy: hasSixSideVehicleHull({
      tonnage: input.tonnage,
      motionType: input.motionType,
      isSupportVehicle: input.unitType === UnitType.SUPPORT_VEHICLE,
    }),
    motionType: input.motionType,
    usesBarArmor: input.usesBarArmor,
  };
}

export function hasSixSideVehicleArmor(profile: IVehicleArmorProfile): boolean {
  return profile.isSuperheavy === true && !profile.isVTOL;
}

/** Body is not armored; only installed turrets and VTOL rotors participate. */
export function getVehicleArmoredLocations(
  profile: IVehicleArmorProfile,
): VehicleArmorLocation[] {
  const locations: VehicleArmorLocation[] = hasSixSideVehicleArmor(profile)
    ? BLK_SUPERHEAVY_ARMOR_LOCATIONS.slice(0, 6)
    : [
        VehicleLocation.FRONT,
        VehicleLocation.LEFT,
        VehicleLocation.RIGHT,
        VehicleLocation.REAR,
      ];
  if (profile.hasTurret) locations.push(VehicleLocation.TURRET);
  if (profile.hasSecondaryTurret) locations.push(VehicleLocation.TURRET_2);
  if (profile.isVTOL) locations.push(VTOLLocation.ROTOR);
  return locations;
}

/** MML UnitUtil.java:900-916; MegaMek TestTank.java:72 (48fcb2f64). */
export const VTOL_MAX_ROTOR_ARMOR = 2;

export interface IGetMaxVehicleArmorForLocationInput {
  readonly tonnage: number;
  /** Unknown legacy string locations are unavailable. */
  readonly location: string;
  readonly profile: IVehicleArmorProfile;
}

export interface IGetMaxVehicleArmorInput {
  readonly tonnage: number;
  readonly profile: IVehicleArmorProfile;
}

/** Null means no independent location maximum, matching pinned MML. */
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
): number | null {
  const [location, hasTurret, isVTOL, hasSecondaryTurret] = legacy as [
    VehicleArmorLocation,
    boolean,
    boolean,
    boolean | undefined,
  ];
  const eventInput: IGetMaxVehicleArmorForLocationInput =
    typeof input === 'number'
      ? {
          tonnage: input,
          location,
          profile: { hasTurret, isVTOL, hasSecondaryTurret },
        }
      : input;
  if (
    !getVehicleArmoredLocations(eventInput.profile).some(
      (installed) => installed === eventInput.location,
    )
  )
    return 0;
  return eventInput.location === VTOLLocation.ROTOR
    ? VTOL_MAX_ROTOR_ARMOR
    : null;
}

/** The class-total limit never depends on the number of faces or turrets. */
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
    typeof input === 'number'
      ? { tonnage: input, profile: { hasTurret, isVTOL, hasSecondaryTurret } }
      : input;
  return eventInput.profile.isSupport
    ? getSupportVehicleMaxTotalArmor(
        eventInput.profile.motionType ??
          (eventInput.profile.isVTOL
            ? GroundMotionType.VTOL
            : GroundMotionType.TRACKED),
        eventInput.tonnage,
      )
    : getTankMaxTotalArmor(eventInput.tonnage);
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
