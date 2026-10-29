/** Existing structure policies, isolated before the source-backed correction. */
import { ProtoMechLocation } from '@/types/construction/UnitLocation';

/**
 * Calculate internal structure by tonnage
 */
export function computeLegacyHandlerStructure(
  tonnage: number,
): Record<ProtoMechLocation, number> {
  // ProtoMech structure is based on tonnage
  // Simplified calculation
  const headStructure = 1;
  const torsoStructure = Math.ceil(tonnage / 2);
  const armStructure = Math.ceil(tonnage / 4);
  const legsStructure = Math.ceil(tonnage / 3);

  return {
    [ProtoMechLocation.HEAD]: headStructure,
    [ProtoMechLocation.TORSO]: torsoStructure,
    [ProtoMechLocation.LEFT_ARM]: armStructure,
    [ProtoMechLocation.RIGHT_ARM]: armStructure,
    [ProtoMechLocation.LEGS]: legsStructure,
    [ProtoMechLocation.MAIN_GUN]: 1,
  };
}

/**
 * Get default internal structure for ProtoMech tonnage
 */
export function computeLegacyDefaultStructure(
  tonnage: number,
): Record<ProtoMechLocation, number> {
  // Simplified structure based on tonnage
  const base = Math.ceil(tonnage / 2);
  return {
    [ProtoMechLocation.HEAD]: Math.max(1, Math.floor(base * 0.5)),
    [ProtoMechLocation.TORSO]: base + 2,
    [ProtoMechLocation.LEFT_ARM]: Math.max(1, Math.floor(base * 0.75)),
    [ProtoMechLocation.RIGHT_ARM]: Math.max(1, Math.floor(base * 0.75)),
    [ProtoMechLocation.LEGS]: base + 1,
    [ProtoMechLocation.MAIN_GUN]: 1,
  };
}

/**
 * Canonical ProtoMech head internal structure by tonnage.
 * Mirrors MegaMek `ProtoMek.headStructure`.
 */
function headStructure(tonnage: number): number {
  if (tonnage <= 5) return 1;
  if (tonnage <= 9) return 2;
  if (tonnage <= 13) return 3;
  return 4;
}

/**
 * Canonical ProtoMech leg internal structure by tonnage.
 * Mirrors MegaMek `ProtoMek.legStructure` (quad legs are sturdier).
 */
function legStructure(tonnage: number, isQuad: boolean): number {
  if (isQuad) {
    if (tonnage <= 3) return 4;
    if (tonnage <= 5) return 5;
    if (tonnage <= 7) return 8;
    if (tonnage <= 9) return 9;
    if (tonnage <= 11) return 12;
    if (tonnage <= 13) return 13;
    return 14;
  }
  if (tonnage <= 3) return 2;
  if (tonnage <= 5) return 3;
  if (tonnage <= 7) return 4;
  if (tonnage <= 9) return 5;
  if (tonnage <= 11) return 6;
  if (tonnage <= 13) return 7;
  return 8;
}

export function computeLegacyPrintStructure(
  tonnage: number,
  isQuad: boolean,
  hasMainGun: boolean,
): Record<ProtoMechLocation, number> {
  const head = headStructure(tonnage);
  return {
    [ProtoMechLocation.HEAD]: head,
    [ProtoMechLocation.TORSO]: tonnage,
    [ProtoMechLocation.LEFT_ARM]: isQuad ? 0 : head,
    [ProtoMechLocation.RIGHT_ARM]: isQuad ? 0 : head,
    [ProtoMechLocation.LEGS]: legStructure(tonnage, isQuad),
    [ProtoMechLocation.MAIN_GUN]: hasMainGun ? (tonnage > 9 ? 2 : 1) : 0,
  };
}
