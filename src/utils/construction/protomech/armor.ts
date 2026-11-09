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

// MegaMekLab 62bf193 walks firstArmorIndex() (LOC_HEAD) up to locations(); the
// ProtoMek constants run Head, Torso, Right Arm, Left Arm, Legs, Main Gun
// (MegaMek 48fcb2f6, ProtoMek.java:102-108). Right comes before Left here.
const AUTO_ALLOCATE_ORDER = [
  L.HEAD,
  L.TORSO,
  L.RIGHT_ARM,
  L.LEFT_ARM,
  L.LEGS,
  L.MAIN_GUN,
] as const;

/**
 * MegaMekLab's Auto armor allocation, ported from PMStructureTab.java at
 * megameklab 62bf193 (`autoAllocateArmor`, `allocateLeftoverPoints`,
 * `addArmorPoint`).
 *
 * `points` is the armor to place, defaulting to the legal total as MegaMekLab's
 * Maximize does; the total is clamped to the cap. Each location first takes its
 * limit scaled by points over the total cap (truncated to whole points, never
 * more than remain). Leftover points go one at a time to the torso, legs, head,
 * then both arms, then the head again when there is a main gun; a Quad starts
 * with the legs and has no arm step. A point aimed at a full location is
 * dropped, as upstream drops it.
 */
export function allocateProtoArmor(
  tonnage: number,
  hasMainGun: boolean,
  chassis = ProtoChassis.BIPED,
  structure?: Points,
  points?: number,
): Record<L, number> {
  const { total, byLocation } = computeProtoArmorLimits(
    tonnage,
    chassis,
    hasMainGun,
    structure,
  );
  if (points !== undefined && (!Number.isInteger(points) || points < 0)) {
    throw new Error(
      'ProtoMech armor allocation requires a nonnegative whole number of points',
    );
  }
  let remaining = Math.min(points ?? total, total);
  const percent = remaining / total;
  const allocation = Object.fromEntries(
    LOCATIONS.map((loc) => [loc, 0]),
  ) as Record<L, number>;

  for (const loc of AUTO_ALLOCATE_ORDER) {
    // locations() omits the Main Gun when it is not mounted.
    if (loc === L.MAIN_GUN && !hasMainGun) continue;
    const placed = Math.trunc(Math.min(byLocation[loc] * percent, remaining));
    allocation[loc] = placed;
    remaining -= placed;
  }

  const add = (loc: L) => {
    if (allocation[loc] < byLocation[loc]) allocation[loc]++;
  };
  const quad = chassis === ProtoChassis.QUAD;
  while (remaining >= 1) {
    if (!quad) {
      add(L.TORSO);
      remaining--;
      if (remaining > 0) {
        add(L.LEGS);
        remaining--;
      }
      // With exactly two left after the legs, the head is skipped for the arms.
      if (remaining > 0 && remaining !== 2) {
        add(L.HEAD);
        remaining--;
      }
      if (remaining >= 2) {
        add(L.LEFT_ARM);
        add(L.RIGHT_ARM);
        remaining -= 2;
      }
    } else {
      add(L.LEGS);
      remaining--;
      if (remaining > 0) {
        add(L.TORSO);
        remaining--;
      }
      if (remaining > 0) {
        add(L.HEAD);
        remaining--;
      }
    }
    if (remaining > 0 && hasMainGun) {
      add(L.HEAD);
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
