/** @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md */
import { ProtoMechLocation } from '@/types/construction/UnitLocation';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';

// Head, Biped/Glider legs, Quad legs for weight pairs 2-3 through 12-13.
// MegaMek 48fcb2f6, ProtoMek.java:785-826 (autoSetInternal and its tables).
const STRUCTURE_BY_WEIGHT_PAIR: readonly (readonly [number, number, number])[] =
  [
    [1, 2, 4],
    [1, 3, 5],
    [2, 4, 8],
    [2, 5, 9],
    [3, 6, 12],
    [3, 7, 13],
  ];

/** Shared admission diagnostic for calculations and structured source loading. */
export function getProtoStructureTonnageError(
  tonnage: number,
): string | undefined {
  if (!Number.isFinite(tonnage) || tonnage <= 0 || tonnage > 2147483647) {
    return 'ProtoMech structure requires positive finite tonnage within signed 32-bit range';
  }
  return undefined;
}

/** Original construction points; topology flags distinguish absent locations from zero. */
export function computeProtoStructure(
  tonnage: number,
  chassis: ProtoChassis,
  hasMainGun: boolean,
): Record<ProtoMechLocation, number> {
  const error = getProtoStructureTonnageError(tonnage);
  if (error) throw new Error(error);
  const weight = Math.trunc(tonnage);
  const [head, bipedLegs, quadLegs] = STRUCTURE_BY_WEIGHT_PAIR[
    Math.floor(weight / 2) - 1
  ] ?? [4, 8, 14];
  const isQuad = chassis === ProtoChassis.QUAD;
  return {
    [ProtoMechLocation.HEAD]: head,
    [ProtoMechLocation.TORSO]: weight,
    // MegaMek uses ARMOR_NA (-1). Local fixed records use 0 with explicit topology.
    [ProtoMechLocation.LEFT_ARM]: isQuad ? 0 : head,
    [ProtoMechLocation.RIGHT_ARM]: isQuad ? 0 : head,
    [ProtoMechLocation.LEGS]: isQuad ? quadLegs : bipedLegs,
    [ProtoMechLocation.MAIN_GUN]: hasMainGun ? (tonnage > 9 ? 2 : 1) : 0,
  };
}
