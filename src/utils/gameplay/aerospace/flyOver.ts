/**
 * Fly-Over / Strafe Resolution
 *
 * During its movement phase an aerospace unit may declare a sequence of hexes
 * along its path as "strafed". Any Nose / Wing (or Small Craft Side) weapon
 * in range may fire at a ground target in one of those hexes. Each strafed
 * hex adds +2 to-hit penalty to that shot.
 *
 * Bomb loads drop one bomb per declared drop hex (bomb bays only).
 *
 * @spec openspec/changes/add-aerospace-combat-behavior/specs/movement-system/spec.md (Fly-Over)
 */

import { AerospaceArc } from '../../../types/unit/AerospaceInterfaces';
import {
  AerospaceEventType,
  type IAerospaceFlyOverEvent,
  type IHexLikeCoord,
} from './events';

// ============================================================================
// Constants
// ============================================================================

/** To-hit penalty applied per strafed hex (simplified Phase 6 rule). */
export const STRAFE_PER_HEX_TO_HIT_PENALTY = 2;

// ============================================================================
// Declarations
// ============================================================================

export interface IStrafeTarget {
  /** Hex the target occupies (must lie on the aerospace movement path). */
  readonly hex: IHexLikeCoord;
  /** Target unit id. */
  readonly targetUnitId: string;
  /** Damage to apply to the ground target. */
  readonly damage: number;
  /** Arc the attacking weapon fires from. */
  readonly arc: AerospaceArc;
}

export interface IBombDrop {
  /** Hex to drop the bomb on. */
  readonly hex: IHexLikeCoord;
  /** Weight/damage of the bomb. */
  readonly damage: number;
}

// ============================================================================
// Fly-over declaration + resolution
// ============================================================================

export interface IFlyOverParams {
  readonly unitId: string;
  /** The hex path the unit travels this turn (from `aerospaceMovement`). */
  readonly path: readonly IHexLikeCoord[];
  /** Strafe attacks declared along the path. */
  readonly strafes: readonly IStrafeTarget[];
  /** Bombs declared along the path (bomb-bay equipped units only). */
  readonly bombs: readonly IBombDrop[];
  /** True when this unit has a bomb bay. */
  readonly hasBombBay: boolean;
}

export interface IFlyOverResult {
  readonly event: IAerospaceFlyOverEvent;
  /** Total to-hit penalty accumulated from all strafed hexes. */
  readonly toHitPenalty: number;
  /** True when any declared bomb was rejected (no bomb bay). */
  readonly rejectedBombs: readonly IBombDrop[];
}

/**
 * Resolve a declared fly-over attack. Produces an `AerospaceFlyOver` event
 * plus a to-hit penalty to pass through to the attack resolver.
 */
export function resolveFlyOver(params: IFlyOverParams): IFlyOverResult {
  const pathSet = new Set(params.path.map((h) => `${h.q}:${h.r}`));

  // Filter strafes to only those whose hex lies on the movement path.
  const validStrafes = params.strafes.filter((s) =>
    pathSet.has(`${s.hex.q}:${s.hex.r}`),
  );

  const strafedHexes = validStrafes.map((s) => s.hex);
  const damageByHex = validStrafes.map((s) => ({
    hex: s.hex,
    damage: s.damage,
  }));

  // Bombs: only legal from bomb-bay equipped units; must also lie on path.
  const rejectedBombs: IBombDrop[] = [];
  const validBombs: IBombDrop[] = [];
  for (const b of params.bombs) {
    if (!params.hasBombBay) {
      rejectedBombs.push(b);
      continue;
    }
    if (!pathSet.has(`${b.hex.q}:${b.hex.r}`)) {
      rejectedBombs.push(b);
      continue;
    }
    validBombs.push(b);
  }

  const event: IAerospaceFlyOverEvent = {
    type: AerospaceEventType.AEROSPACE_FLY_OVER,
    unitId: params.unitId,
    strafedHexes,
    damageByHex,
    bombsDropped: validBombs.map((b) => b.hex),
  };

  const toHitPenalty = validStrafes.length * STRAFE_PER_HEX_TO_HIT_PENALTY;

  return { event, toHitPenalty, rejectedBombs };
}
