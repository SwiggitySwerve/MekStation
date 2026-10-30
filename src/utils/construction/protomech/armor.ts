/** @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md */
import { ProtoMechLocation } from '@/types/construction/UnitLocation';
import { IProtoArmorMaxByTonnage } from '@/types/unit/ProtoMechInterfaces';

import { PROTO_MIN_TONNAGE, PROTO_MAX_TONNAGE } from './weightClass';

// Transitional policies preserve all three existing results before correction.
/**
 * Per-location armor point maximums indexed by tonnage (2–15).
 * Values derived from Total Warfare ProtoMech construction table.
 *
 * Arm column applies to each arm individually (Biped/Glider) or to the
 * Front Legs pair (Quad). Legs applies to rear legs on Quad chassis.
 */
const ARMOR_MAX_BY_TONNAGE: Record<number, IProtoArmorMaxByTonnage> = {
  2: { head: 3, torso: 6, arm: 3, legs: 4, mainGun: 0 },
  3: { head: 4, torso: 8, arm: 4, legs: 6, mainGun: 0 },
  4: { head: 5, torso: 10, arm: 5, legs: 8, mainGun: 0 },
  5: { head: 6, torso: 12, arm: 6, legs: 10, mainGun: 2 },
  6: { head: 7, torso: 15, arm: 7, legs: 12, mainGun: 2 },
  7: { head: 8, torso: 17, arm: 8, legs: 14, mainGun: 2 },
  8: { head: 9, torso: 20, arm: 9, legs: 16, mainGun: 3 },
  9: { head: 10, torso: 23, arm: 10, legs: 18, mainGun: 3 },
  10: { head: 11, torso: 26, arm: 11, legs: 20, mainGun: 4 },
  11: { head: 12, torso: 29, arm: 12, legs: 22, mainGun: 4 },
  12: { head: 13, torso: 32, arm: 13, legs: 24, mainGun: 4 },
  13: { head: 14, torso: 35, arm: 14, legs: 26, mainGun: 5 },
  14: { head: 15, torso: 38, arm: 15, legs: 28, mainGun: 5 },
  15: { head: 16, torso: 41, arm: 16, legs: 30, mainGun: 5 },
};

/**
 * Return per-location armor maximums for a given tonnage.
 * Clamps tonnage to the legal 2–15 range before lookup.
 */
export function getProtoArmorMaxByTonnage(
  tonnage: number,
): IProtoArmorMaxByTonnage {
  const clamped = Math.max(
    PROTO_MIN_TONNAGE,
    Math.min(PROTO_MAX_TONNAGE, Math.floor(tonnage)),
  );
  // Safe: every integer 2–15 is present in the table
  return ARMOR_MAX_BY_TONNAGE[clamped]!;
}

/**
 * Canonical max-armor-by-tonnage for the Torso location.
 * Source: ProtoMech Armor Table (Standard ProtoMechs, 2-9 tons).
 */
const TORSO_MAX_BY_TON: Record<number, number> = {
  2: 6,
  3: 9,
  4: 11,
  5: 14,
  6: 17,
  7: 20,
  8: 23,
  9: 26,
};

/**
 * Canonical max-armor-by-tonnage for Arm locations.
 */
const ARM_MAX_BY_TON: Record<number, number> = {
  2: 3,
  3: 4,
  4: 5,
  5: 6,
  6: 7,
  7: 8,
  8: 9,
  9: 10,
};

/**
 * Canonical max-armor-by-tonnage for the combined Legs location.
 */
const LEGS_MAX_BY_TON: Record<number, number> = {
  2: 4,
  3: 6,
  4: 8,
  5: 10,
  6: 12,
  7: 14,
  8: 16,
  9: 18,
};

/**
 * Canonical max-armor-by-tonnage for the Main Gun location.
 */
const MAIN_GUN_MAX_BY_TON: Record<number, number> = {
  2: 3,
  3: 4,
  4: 5,
  5: 6,
  6: 7,
  7: 8,
  8: 9,
  9: 10,
};

/**
 * Heavy ProtoMech tonnage threshold (10-15t variants get the doubled head cap).
 */
const HEAVY_PROTO_THRESHOLD = 10;

/**
 * Look up a value from a tonnage table, gracefully clamping outside the
 * standard 2-9 ton range. Returns 0 for sub-2 ton ProtoMechs (illegal).
 */
function lookupByTon(table: Record<number, number>, tonnage: number): number {
  if (tonnage <= 0) return 0;
  // Clamp to table-known range; outside that we extrapolate linearly off
  // the highest known value to avoid surprising drops at high tonnages.
  if (table[tonnage] !== undefined) return table[tonnage];
  const known = Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b);
  if (tonnage < known[0]) return table[known[0]];
  const top = known[known.length - 1];
  // Heavy ProtoMechs (10-15t) extrapolate at +3/ton beyond 9t — matches the
  // published Heavy ProtoMech armor table progression.
  return table[top] + (tonnage - top) * 3;
}

/**
 * Per-location armor cap derived from the official ProtoMech weight table.
 *
 * Heavy ProtoMechs (10t+) double the head cap to 4 (TM Companion p.197).
 */
export function getProtoArmorDiagramMax(
  tonnage: number,
  loc: ProtoMechLocation,
): number {
  const isHeavy = tonnage >= HEAVY_PROTO_THRESHOLD;
  switch (loc) {
    case ProtoMechLocation.HEAD:
      return isHeavy ? 4 : 2;
    case ProtoMechLocation.TORSO:
      return lookupByTon(TORSO_MAX_BY_TON, tonnage);
    case ProtoMechLocation.LEFT_ARM:
    case ProtoMechLocation.RIGHT_ARM:
      return lookupByTon(ARM_MAX_BY_TON, tonnage);
    case ProtoMechLocation.LEGS:
      return lookupByTon(LEGS_MAX_BY_TON, tonnage);
    case ProtoMechLocation.MAIN_GUN:
      return lookupByTon(MAIN_GUN_MAX_BY_TON, tonnage);
    default:
      return 0;
  }
}

export function allocateProtoArmor(
  tonnage: number,
  hasMainGun: boolean,
): Record<ProtoMechLocation, number> {
  const maxArmor = tonnage * 6; // Simplified calculation
  const torsoPercent = 0.35;
  const legsPercent = 0.25;
  const armPercent = 0.1;
  const headPercent = 0.1;

  return {
    [ProtoMechLocation.HEAD]: Math.floor(maxArmor * headPercent),
    [ProtoMechLocation.TORSO]: Math.floor(maxArmor * torsoPercent),
    [ProtoMechLocation.LEFT_ARM]: Math.floor(maxArmor * armPercent),
    [ProtoMechLocation.RIGHT_ARM]: Math.floor(maxArmor * armPercent),
    [ProtoMechLocation.LEGS]: Math.floor(maxArmor * legsPercent),
    [ProtoMechLocation.MAIN_GUN]: hasMainGun ? 2 : 0,
  };
}
