/** @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md */
import { ProtoMechLocation as L } from '@/types/construction/UnitLocation';
import {
  IProtoArmorMaxByTonnage,
  ProtoChassis,
} from '@/types/unit/ProtoMechInterfaces';

import {
  computeProtoStructure,
  getProtoStructureTonnageError,
} from './structure';

type Points = Readonly<Record<L, number>>;
// MegaMek 48fcb2f6, TestProtoMek.java:675-740. Total is independent of location sums.
const TOTAL_CAPS = [15, 17, 22, 24, 33, 35, 40, 42, 51, 53, 58, 60, 65, 67];
const LOCATIONS = Object.values(L);

function inputError(tonnage: number, structure?: Points): string | undefined {
  const error = getProtoStructureTonnageError(tonnage);
  if (error) return error;
  if (
    structure &&
    LOCATIONS.some(
      (loc) =>
        !Number.isInteger(structure[loc]) ||
        structure[loc] < 0 ||
        structure[loc] > 2147483647,
    )
  ) {
    return 'ProtoMech armor requires nonnegative signed 32-bit original structure points';
  }
  return undefined;
}

/** Caps use original construction points, including explicit manual structure. */
export function computeProtoArmorLimits(
  tonnage: number,
  chassis: ProtoChassis,
  hasMainGun: boolean,
  structure?: Points,
): { total: number; byLocation: Record<L, number> } {
  const error = inputError(tonnage, structure);
  if (error) throw new Error(error);
  const original =
    structure ?? computeProtoStructure(tonnage, chassis, hasMainGun);
  const weight = Math.trunc(tonnage);
  const arm =
    chassis === ProtoChassis.QUAD ? 0 : tonnage < 6 ? 2 : tonnage < 10 ? 4 : 6;
  return {
    total:
      TOTAL_CAPS[Math.max(0, Math.min(TOTAL_CAPS.length - 1, weight - 2))] +
      (hasMainGun ? (tonnage > 9 ? 6 : 3) : 0),
    byLocation: {
      [L.HEAD]: 2 + Math.trunc(weight / 2),
      [L.TORSO]: 2 * original[L.TORSO],
      [L.LEFT_ARM]: arm,
      [L.RIGHT_ARM]: arm,
      [L.LEGS]: 2 * original[L.LEGS],
      [L.MAIN_GUN]: hasMainGun ? 3 * original[L.MAIN_GUN] : 0,
    },
  };
}

/** Retained public projection; omitted topology means Biped without Main Gun. */
export function getProtoArmorMaxByTonnage(
  tonnage: number,
  chassis = ProtoChassis.BIPED,
  hasMainGun = false,
  structure?: Points,
): IProtoArmorMaxByTonnage {
  const { byLocation: caps } = computeProtoArmorLimits(
    tonnage,
    chassis,
    hasMainGun,
    structure,
  );
  return {
    head: caps[L.HEAD],
    torso: caps[L.TORSO],
    arm: caps[L.LEFT_ARM],
    legs: caps[L.LEGS],
    mainGun: caps[L.MAIN_GUN],
  };
}

/** MekStation policy: fill the legal budget proportionally, then in location order. */
export function allocateProtoArmor(
  tonnage: number,
  hasMainGun: boolean,
  chassis = ProtoChassis.BIPED,
  structure?: Points,
): Record<L, number> {
  const { total, byLocation } = computeProtoArmorLimits(
    tonnage,
    chassis,
    hasMainGun,
    structure,
  );
  const capacity = LOCATIONS.reduce((sum, loc) => sum + byLocation[loc], 0);
  const budget = Math.min(total, capacity);
  const allocation = { ...byLocation };
  for (const loc of LOCATIONS)
    allocation[loc] = Math.floor((budget * byLocation[loc]) / capacity);
  let remaining =
    budget - LOCATIONS.reduce((sum, loc) => sum + allocation[loc], 0);
  for (const loc of LOCATIONS) {
    if (remaining > 0 && allocation[loc] < byLocation[loc]) {
      allocation[loc]++;
      remaining--;
    }
  }
  return allocation;
}

/** Construction diagnostics never repair or discard source armor. */
export function getProtoArmorErrors(
  tonnage: number,
  chassis: ProtoChassis,
  hasMainGun: boolean,
  structure: Points,
  armor: Points,
): string[] {
  const error = inputError(tonnage, structure);
  if (error) return [error];
  const { total, byLocation } = computeProtoArmorLimits(
    tonnage,
    chassis,
    hasMainGun,
    structure,
  );
  const errors: string[] = [];
  for (const loc of LOCATIONS) {
    const points = armor[loc];
    if (!Number.isSafeInteger(points) || points < 0)
      errors.push(`${loc} armor must be a nonnegative integer`);
    else if (points > byLocation[loc])
      errors.push(`${loc} armor ${points} exceeds maximum ${byLocation[loc]}`);
  }
  const assigned = LOCATIONS.reduce((sum, loc) => sum + armor[loc], 0);
  if (Number.isFinite(assigned) && assigned > total)
    errors.push(`ProtoMech total armor ${assigned} exceeds maximum ${total}`);
  return errors;
}
