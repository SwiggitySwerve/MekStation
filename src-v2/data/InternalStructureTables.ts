/**
 * InternalStructureTables.ts
 * Official BattleTech Internal Structure Point Allocation Table.
 * Source: TechManual
 */

export interface IInternalStructurePoints {
  readonly hd: number;  // Head
  readonly ct: number;  // Center Torso
  readonly lt: number;  // Left Torso
  readonly rt: number;  // Right Torso
  readonly la: number;  // Left Arm
  readonly ra: number;  // Right Arm
  readonly ll: number;  // Left Leg
  readonly rl: number;  // Right Leg
}

export const INTERNAL_STRUCTURE_PER_TONNAGE: Record<number, IInternalStructurePoints> = {
  20: { hd: 3, ct: 7, lt: 5, rt: 5, la: 4, ra: 4, ll: 5, rl: 5 },
  25: { hd: 3, ct: 8, lt: 6, rt: 6, la: 4, ra: 4, ll: 6, rl: 6 },
  30: { hd: 3, ct: 10, lt: 7, rt: 7, la: 5, ra: 5, ll: 7, rl: 7 },
  35: { hd: 3, ct: 11, lt: 8, rt: 8, la: 6, ra: 6, ll: 8, rl: 8 },
  40: { hd: 3, ct: 12, lt: 10, rt: 10, la: 6, ra: 6, ll: 10, rl: 10 },
  45: { hd: 3, ct: 14, lt: 11, rt: 11, la: 7, ra: 7, ll: 11, rl: 11 },
  50: { hd: 3, ct: 16, lt: 11, rt: 11, la: 9, ra: 9, ll: 11, rl: 11 },
  55: { hd: 3, ct: 18, lt: 13, rt: 13, la: 9, ra: 9, ll: 13, rl: 13 },
  60: { hd: 3, ct: 20, lt: 14, rt: 14, la: 10, ra: 10, ll: 14, rl: 14 },
  65: { hd: 3, ct: 21, lt: 15, rt: 15, la: 10, ra: 10, ll: 15, rl: 15 },
  70: { hd: 3, ct: 22, lt: 15, rt: 15, la: 11, ra: 11, ll: 15, rl: 15 },
  75: { hd: 3, ct: 24, lt: 17, rt: 17, la: 13, ra: 13, ll: 17, rl: 17 },
  80: { hd: 3, ct: 25, lt: 17, rt: 17, la: 13, ra: 13, ll: 17, rl: 17 },
  85: { hd: 3, ct: 27, lt: 18, rt: 18, la: 14, ra: 14, ll: 18, rl: 18 },
  90: { hd: 3, ct: 29, lt: 19, rt: 19, la: 15, ra: 15, ll: 19, rl: 19 },
  95: { hd: 3, ct: 31, lt: 20, rt: 20, la: 17, ra: 17, ll: 20, RL: 20 },
  100: { hd: 3, ct: 32, lt: 21, rt: 21, la: 17, ra: 17, ll: 21, RL: 21 },
};

