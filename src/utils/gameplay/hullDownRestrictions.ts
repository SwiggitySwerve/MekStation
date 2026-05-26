import type {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';
import type { WeaponFireMode } from '@/types/gameplay/IndirectFireInterfaces';

import { TokenUnitType } from '@/types/gameplay';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

export const HULL_DOWN_LEG_WEAPON_BLOCKED_REASON =
  'Hull-down Meks cannot fire leg-mounted weapons';

export const HULL_DOWN_FRONT_WEAPON_BLOCKED_REASON =
  'Nearby terrain blocks front weapons.';

export const HULL_DOWN_KICK_BLOCKED_REASON = 'Attacker is hull down';

export interface IWeaponWithMountLocation {
  readonly location?: string | null;
}

export interface IWeaponWithVehicleMountLocation {
  readonly mode?: WeaponFireMode;
  readonly vehicleMountLocation?:
    | VehicleLocation
    | VTOLLocation
    | string
    | null;
}

export interface IRepresentedVehicleAttackerInput {
  readonly unitType?: UnitType | null;
  readonly tokenUnitType?: TokenUnitType | null;
  readonly combatStateKind?: string | null;
}

export function isRepresentedVehicleAttacker({
  unitType,
  tokenUnitType,
  combatStateKind,
}: IRepresentedVehicleAttackerInput): boolean {
  return (
    combatStateKind === 'vehicle' ||
    tokenUnitType === TokenUnitType.Vehicle ||
    unitType === UnitType.VEHICLE ||
    unitType === UnitType.VTOL ||
    unitType === UnitType.SUPPORT_VEHICLE
  );
}

export function normalizeWeaponMountLocation(
  location: string | null | undefined,
): string | undefined {
  if (!location) return undefined;

  const normalized = location
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!normalized) return undefined;

  const aliases: Readonly<Record<string, string>> = {
    hd: 'head',
    h: 'head',
    ct: 'center_torso',
    c_torso: 'center_torso',
    center_torso: 'center_torso',
    lt: 'left_torso',
    l_torso: 'left_torso',
    left_torso: 'left_torso',
    rt: 'right_torso',
    r_torso: 'right_torso',
    right_torso: 'right_torso',
    la: 'left_arm',
    l_arm: 'left_arm',
    left_arm: 'left_arm',
    ra: 'right_arm',
    r_arm: 'right_arm',
    right_arm: 'right_arm',
    ll: 'left_leg',
    lleg: 'left_leg',
    l_leg: 'left_leg',
    left_leg: 'left_leg',
    rl: 'right_leg',
    rleg: 'right_leg',
    r_leg: 'right_leg',
    right_leg: 'right_leg',
    fll: 'front_left_leg',
    front_left_leg: 'front_left_leg',
    fl_leg: 'front_left_leg',
    frl: 'front_right_leg',
    front_right_leg: 'front_right_leg',
    fr_leg: 'front_right_leg',
    rll: 'rear_left_leg',
    rear_left_leg: 'rear_left_leg',
    rr_leg: 'rear_right_leg',
    rrl: 'rear_right_leg',
    rear_right_leg: 'rear_right_leg',
  };

  return aliases[normalized] ?? normalized;
}

export function isLegMountedWeaponLocation(
  location: string | null | undefined,
): boolean {
  const normalized = normalizeWeaponMountLocation(location);
  if (!normalized) return false;
  return normalized === 'leg' || normalized.endsWith('_leg');
}

export function isFrontVehicleWeaponLocation(
  location: VehicleLocation | VTOLLocation | string | null | undefined,
): boolean {
  return normalizeWeaponMountLocation(location) === 'front';
}

export function hullDownLegWeaponBlockedReason(
  attackerHullDown: boolean | undefined,
  weapon: IWeaponWithMountLocation,
): string | undefined {
  if (attackerHullDown !== true) return undefined;
  return isLegMountedWeaponLocation(weapon.location)
    ? HULL_DOWN_LEG_WEAPON_BLOCKED_REASON
    : undefined;
}

export function hullDownVehicleFrontWeaponBlockedReason(
  attackerHullDown: boolean | undefined,
  attackerIsVehicle: boolean | undefined,
  weapon: IWeaponWithVehicleMountLocation,
): string | undefined {
  if (attackerHullDown !== true) return undefined;
  if (weapon.mode === 'Indirect') return undefined;
  const weaponCarriesVehicleMount = weapon.vehicleMountLocation !== undefined;
  if (attackerIsVehicle !== true && !weaponCarriesVehicleMount) {
    return undefined;
  }
  return isFrontVehicleWeaponLocation(weapon.vehicleMountLocation)
    ? HULL_DOWN_FRONT_WEAPON_BLOCKED_REASON
    : undefined;
}
