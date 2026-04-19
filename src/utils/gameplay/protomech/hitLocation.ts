/**
 * ProtoMech Hit Location Module
 *
 * Implements the 6-entry proto hit-location table per attack direction
 * (Front / Side / Rear). Shorter than the mech table — 2d6 maps directly to
 * Torso / MainGun / Head / Arms / Legs. Quad chassis remaps arm entries onto
 * FrontLegs/RearLegs (quads have no arms to hit).
 *
 * @spec openspec/changes/add-protomech-combat-behavior/tasks.md §3
 * @spec openspec/changes/add-protomech-combat-behavior/specs/combat-resolution/spec.md
 */

import { ProtoChassis, ProtoLocation } from '@/types/unit/ProtoMechInterfaces';

import { D6Roller, defaultD6Roller, roll2d6 } from '../diceTypes';

// =============================================================================
// Attack direction
// =============================================================================

/**
 * Which facing of the target the attack hits. Mirrors
 * `VehicleAttackDirection` for consistency across unit-type combat pipelines.
 * 'left' and 'right' both map to the Side column of the proto hit table.
 */
export type ProtoAttackDirection = 'front' | 'left' | 'right' | 'rear';

// =============================================================================
// Hit-location table rows
// =============================================================================

/**
 * Canonical proto hit-location slot. For Quads, `LeftArm` / `RightArm` / `Legs`
 * are remapped at lookup time (see `mapLocationForChassis`).
 */
export type ProtoHitSlot =
  | 'torso'
  | 'right_arm'
  | 'left_arm'
  | 'legs'
  | 'main_gun'
  | 'head';

/**
 * Front-attack hit table (2d6).
 *   2=Torso (TAC), 3-4=RightArm, 5-7=Torso, 8-9=LeftArm,
 *   10=Legs, 11=MainGun, 12=Head
 */
export const PROTO_FRONT_HIT_TABLE: Readonly<Record<number, ProtoHitSlot>> = {
  2: 'torso',
  3: 'right_arm',
  4: 'right_arm',
  5: 'torso',
  6: 'torso',
  7: 'torso',
  8: 'left_arm',
  9: 'left_arm',
  10: 'legs',
  11: 'main_gun',
  12: 'head',
};

/**
 * Side-attack hit table (2d6) — same for a Left or Right arc.
 *   2=Side (TAC → Torso), 3-5=Legs, 6-8=Near Arm or Torso,
 *   9-10=Torso, 11=MainGun, 12=Head
 *
 * Roll 6-8 goes to "near arm or torso": per the BattleTech proto rules the
 * Side table uses near arm for 6-7 and torso for 8. For a Left-arc attack the
 * near arm is LeftArm; for a Right-arc attack it's RightArm.
 */
export const PROTO_SIDE_HIT_TABLE_LEFT: Readonly<Record<number, ProtoHitSlot>> =
  {
    2: 'torso',
    3: 'legs',
    4: 'legs',
    5: 'legs',
    6: 'left_arm',
    7: 'left_arm',
    8: 'torso',
    9: 'torso',
    10: 'torso',
    11: 'main_gun',
    12: 'head',
  };

export const PROTO_SIDE_HIT_TABLE_RIGHT: Readonly<
  Record<number, ProtoHitSlot>
> = {
  2: 'torso',
  3: 'legs',
  4: 'legs',
  5: 'legs',
  6: 'right_arm',
  7: 'right_arm',
  8: 'torso',
  9: 'torso',
  10: 'torso',
  11: 'main_gun',
  12: 'head',
};

/**
 * Rear-attack hit table (2d6).
 *   2=Torso (TAC), 3-5=Legs, 6-8=Torso, 9-10=Arms, 11=MainGun, 12=Head
 *
 * Roll 9-10 "Arms": we map 9 → RightArm and 10 → LeftArm so tests remain
 * deterministic (same convention as vehicle Rear table 3-5).
 */
export const PROTO_REAR_HIT_TABLE: Readonly<Record<number, ProtoHitSlot>> = {
  2: 'torso',
  3: 'legs',
  4: 'legs',
  5: 'legs',
  6: 'torso',
  7: 'torso',
  8: 'torso',
  9: 'right_arm',
  10: 'left_arm',
  11: 'main_gun',
  12: 'head',
};

/**
 * Rolls that are TAC (Through-Armor Critical) triggers on the proto tables:
 * natural 2 on any direction, per task 5.1.
 */
const TAC_ROLLS: ReadonlySet<number> = new Set([2]);

// =============================================================================
// Slot → ProtoLocation mapping (chassis-aware)
// =============================================================================

/**
 * Translate a generic hit slot to a concrete `ProtoLocation` for the given
 * chassis + main-gun availability.
 *
 *   - Biped / Glider / Ultraheavy: arms stay as Left/RightArm, legs stay as Legs.
 *   - Quad: arm slots remap to FRONT_LEGS (near arm becomes a front leg hit)
 *     and legs remap to REAR_LEGS.
 *   - If the proto has no main gun, a MainGun slot falls back to Torso.
 */
export function mapSlotToLocation(
  slot: ProtoHitSlot,
  chassisType: ProtoChassis,
  hasMainGun: boolean,
): ProtoLocation {
  const isQuad = chassisType === ProtoChassis.QUAD;

  switch (slot) {
    case 'head':
      return ProtoLocation.HEAD;
    case 'torso':
      return ProtoLocation.TORSO;
    case 'main_gun':
      return hasMainGun ? ProtoLocation.MAIN_GUN : ProtoLocation.TORSO;
    case 'legs':
      return isQuad ? ProtoLocation.REAR_LEGS : ProtoLocation.LEGS;
    case 'left_arm':
      return isQuad ? ProtoLocation.FRONT_LEGS : ProtoLocation.LEFT_ARM;
    case 'right_arm':
      return isQuad ? ProtoLocation.FRONT_LEGS : ProtoLocation.RIGHT_ARM;
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Get the hit-location table for a given attack direction.
 */
export function getProtoHitLocationTable(
  direction: ProtoAttackDirection,
): Readonly<Record<number, ProtoHitSlot>> {
  switch (direction) {
    case 'front':
      return PROTO_FRONT_HIT_TABLE;
    case 'left':
      return PROTO_SIDE_HIT_TABLE_LEFT;
    case 'right':
      return PROTO_SIDE_HIT_TABLE_RIGHT;
    case 'rear':
      return PROTO_REAR_HIT_TABLE;
  }
}

/**
 * Outcome of a proto hit-location roll.
 */
export interface IProtoHitLocationResult {
  readonly dice: readonly [number, number];
  readonly roll: number;
  readonly direction: ProtoAttackDirection;
  /** The generic hit slot picked from the table. */
  readonly slot: ProtoHitSlot;
  /** The chassis-resolved concrete location the slot maps to. */
  readonly location: ProtoLocation;
  /** True on a natural 2 (TAC trigger). */
  readonly isTAC: boolean;
}

export interface IProtoHitLocationOptions {
  readonly chassisType: ProtoChassis;
  readonly hasMainGun: boolean;
}

/**
 * Roll 2d6 and resolve a proto hit location. Caller passes chassis info so
 * the slot → ProtoLocation mapping can pick the right concrete location.
 */
export function determineProtoHitLocation(
  direction: ProtoAttackDirection,
  options: IProtoHitLocationOptions,
  diceRoller: D6Roller = defaultD6Roller,
): IProtoHitLocationResult {
  const dice = roll2d6(diceRoller);
  return determineProtoHitLocationFromRoll(
    direction,
    [dice.dice[0], dice.dice[1]],
    options,
  );
}

/**
 * Resolve a proto hit location for a given pre-determined 2d6 result.
 */
export function determineProtoHitLocationFromRoll(
  direction: ProtoAttackDirection,
  dice: readonly [number, number],
  options: IProtoHitLocationOptions,
): IProtoHitLocationResult {
  const [d1, d2] = dice;
  const roll = d1 + d2;
  const table = getProtoHitLocationTable(direction);
  const slot = table[roll];
  const location = mapSlotToLocation(
    slot,
    options.chassisType,
    options.hasMainGun,
  );

  return {
    dice: [d1, d2],
    roll,
    direction,
    slot,
    location,
    isTAC: TAC_ROLLS.has(roll),
  };
}

/**
 * True if a roll total is a TAC trigger on the proto tables.
 */
export function isProtoTACRoll(roll: number): boolean {
  return TAC_ROLLS.has(roll);
}
