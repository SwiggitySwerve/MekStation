/**
 * Aerospace Hit Location Tables
 *
 * 2d6 hit-location tables for aerospace combat. Three inbound-direction tables
 * (FRONT / SIDE / REAR) plus a SmallCraft override that swaps Wing arcs for
 * Side arcs.
 *
 * Per the change proposal:
 * - FRONT:  2=Nose(TAC), 3-4=RightWing, 5-7=Nose, 8-9=LeftWing, 10-11=Aft, 12=Nose(TAC)
 * - SIDE:   2=Side(TAC), 3-5=Nose, 6-8=NearWing, 9-10=Aft, 11-12=Side(TAC)
 *           (NearWing = LeftWing on SIDE_LEFT, RightWing on SIDE_RIGHT.
 *            "Side" on TAC rolls = LeftWing / RightWing respectively.)
 * - REAR:   2=Aft(TAC), 3-5=Wing (random L/R), 6-8=Aft, 9-10=Nose, 11-12=Aft(TAC)
 *
 * Rolls of 2 and 12 are `TAC` (Threshold to Advance Crit) — they always trigger
 * an aerospace critical-hit roll in addition to the hit.
 *
 * @spec openspec/changes/add-aerospace-combat-behavior/tasks.md (section 2)
 */

import { AerospaceArc } from '../../../types/unit/AerospaceInterfaces';
import { type D6Roller, defaultD6Roller, roll2d6 } from '../diceTypes';
import { AerospaceAttackDirection } from './state';

// ============================================================================
// Hit-location result
// ============================================================================

export interface IAerospaceHitLocation {
  /** Arc the damage lands against. */
  readonly arc: AerospaceArc;
  /** True if the roll was 2 or 12 — triggers a critical-hit check. */
  readonly isTAC: boolean;
  /** 2d6 roll that was used. */
  readonly roll: {
    readonly dice: readonly number[];
    readonly total: number;
  };
}

// ============================================================================
// ASF / CF tables (use LEFT_WING / RIGHT_WING arcs)
// ============================================================================

/**
 * FRONT-attack table (attack hits the nose-end of the target).
 * TAC rolls (2, 12) both land on Nose.
 */
export function resolveFrontTable(rollTotal: number): {
  readonly arc: AerospaceArc;
  readonly isTAC: boolean;
} {
  if (rollTotal === 2) return { arc: AerospaceArc.NOSE, isTAC: true };
  if (rollTotal === 12) return { arc: AerospaceArc.NOSE, isTAC: true };
  if (rollTotal <= 4) return { arc: AerospaceArc.RIGHT_WING, isTAC: false };
  if (rollTotal <= 7) return { arc: AerospaceArc.NOSE, isTAC: false };
  if (rollTotal <= 9) return { arc: AerospaceArc.LEFT_WING, isTAC: false };
  return { arc: AerospaceArc.AFT, isTAC: false }; // 10-11
}

/**
 * SIDE-attack table. `near` is the struck side's wing arc
 * (LeftWing for SIDE_LEFT, RightWing for SIDE_RIGHT).
 *
 * - 2 = TAC on the near wing
 * - 3-5 = Nose
 * - 6-8 = near wing
 * - 9-10 = Aft
 * - 11-12 = TAC on the near wing
 */
export function resolveSideTable(
  rollTotal: number,
  near: AerospaceArc,
): { readonly arc: AerospaceArc; readonly isTAC: boolean } {
  if (rollTotal === 2) return { arc: near, isTAC: true };
  if (rollTotal >= 11) return { arc: near, isTAC: true };
  if (rollTotal <= 5) return { arc: AerospaceArc.NOSE, isTAC: false };
  if (rollTotal <= 8) return { arc: near, isTAC: false };
  return { arc: AerospaceArc.AFT, isTAC: false }; // 9-10
}

/**
 * REAR-attack table.
 * - 2 = TAC on Aft
 * - 3-5 = random L/R wing (50/50 via a d6 — even=left, odd=right)
 * - 6-8 = Aft
 * - 9-10 = Nose
 * - 11-12 = TAC on Aft
 *
 * `wingTiebreak` is an injectable D6 for deterministic testing of the 3-5 band.
 */
export function resolveRearTable(
  rollTotal: number,
  wingTiebreak: D6Roller = defaultD6Roller,
): { readonly arc: AerospaceArc; readonly isTAC: boolean } {
  if (rollTotal === 2) return { arc: AerospaceArc.AFT, isTAC: true };
  if (rollTotal >= 11) return { arc: AerospaceArc.AFT, isTAC: true };
  if (rollTotal <= 5) {
    // 3-5 → random wing
    const tie = wingTiebreak();
    return {
      arc: tie % 2 === 0 ? AerospaceArc.LEFT_WING : AerospaceArc.RIGHT_WING,
      isTAC: false,
    };
  }
  if (rollTotal <= 8) return { arc: AerospaceArc.AFT, isTAC: false };
  return { arc: AerospaceArc.NOSE, isTAC: false }; // 9-10
}

// ============================================================================
// Small Craft overrides: LeftWing/RightWing → LeftSide/RightSide
// ============================================================================

/**
 * Swap Wing arcs for Side arcs when the target is a Small Craft.
 */
export function toSmallCraftArc(arc: AerospaceArc): AerospaceArc {
  if (arc === AerospaceArc.LEFT_WING) return AerospaceArc.LEFT_SIDE;
  if (arc === AerospaceArc.RIGHT_WING) return AerospaceArc.RIGHT_SIDE;
  return arc;
}

// ============================================================================
// Public: determine aerospace hit location
// ============================================================================

export interface IDetermineAerospaceHitLocationOptions {
  /** True when the target is a Small Craft. Swaps wings → sides. */
  readonly isSmallCraft?: boolean;
  /** Inject d6 roller for deterministic testing. */
  readonly diceRoller?: D6Roller;
}

/**
 * Roll 2d6 and resolve to an aerospace arc.
 */
export function determineAerospaceHitLocation(
  direction: AerospaceAttackDirection,
  options: IDetermineAerospaceHitLocationOptions = {},
): IAerospaceHitLocation {
  const roller = options.diceRoller ?? defaultD6Roller;
  const roll = roll2d6(roller);
  return determineAerospaceHitLocationFromRoll(direction, roll.total, {
    dice: roll.dice,
    diceRoller: roller,
    isSmallCraft: options.isSmallCraft ?? false,
  });
}

/**
 * Variant that accepts a predetermined roll total. Lets callers replay rolls
 * without re-rolling. Will still consult `diceRoller` for the REAR 3-5 wing
 * tiebreak (pass a deterministic roller for tests).
 */
export function determineAerospaceHitLocationFromRoll(
  direction: AerospaceAttackDirection,
  rollTotal: number,
  params: {
    readonly dice: readonly number[];
    readonly diceRoller?: D6Roller;
    readonly isSmallCraft?: boolean;
  },
): IAerospaceHitLocation {
  let base: { arc: AerospaceArc; isTAC: boolean };
  switch (direction) {
    case AerospaceAttackDirection.FRONT:
      base = resolveFrontTable(rollTotal);
      break;
    case AerospaceAttackDirection.SIDE_LEFT:
      base = resolveSideTable(rollTotal, AerospaceArc.LEFT_WING);
      break;
    case AerospaceAttackDirection.SIDE_RIGHT:
      base = resolveSideTable(rollTotal, AerospaceArc.RIGHT_WING);
      break;
    case AerospaceAttackDirection.REAR:
      base = resolveRearTable(rollTotal, params.diceRoller ?? defaultD6Roller);
      break;
    default:
      base = resolveFrontTable(rollTotal);
  }

  const arc = params.isSmallCraft ? toSmallCraftArc(base.arc) : base.arc;
  return {
    arc,
    isTAC: base.isTAC,
    roll: { dice: params.dice, total: rollTotal },
  };
}
