/**
 * Aerospace Firing Arcs
 *
 * - Nose: 60° forward cone (−30° to +30° relative to facing)
 * - LeftWing / RightWing: 120° each side
 * - Aft: 60° rear cone
 * - Fuselage: weapons fire in whichever arc the pilot declares
 * - Small Craft: Wings are renamed to Sides but keep the same arc widths
 *
 * The "chassis facing" is stored as a heading in degrees (0 = +x axis,
 * CCW positive — matches `aerospace/movement.ts`).
 *
 * @spec openspec/changes/add-aerospace-combat-behavior/tasks.md (section 9)
 */

import { AerospaceArc } from '../../../types/unit/AerospaceInterfaces';
import { type IHexLikeCoord } from './events';

// ============================================================================
// Arc widths (total coverage in degrees)
// ============================================================================

const NOSE_HALF_WIDTH_DEG = 30; // total 60°
const AFT_HALF_WIDTH_DEG = 30; // total 60°

// Wings / Sides each cover 120°, running from ±30° to ±150°.
const WING_NEAR_EDGE_DEG = 30;
const WING_FAR_EDGE_DEG = 150;

// ============================================================================
// Helpers
// ============================================================================

function angleBetween(from: IHexLikeCoord, to: IHexLikeCoord): number {
  // Axial → pixel approximation using flat-top orientation, adequate for arc
  // classification (we only care about the relative direction).
  const x = to.q - from.q;
  const y = to.r - from.r + 0.5 * (to.q - from.q);
  return (Math.atan2(-y, x) * 180) / Math.PI; // CCW positive
}

function normalizeDeg(deg: number): number {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

// ============================================================================
// Public: classify
// ============================================================================

export interface IClassifyAerospaceArcParams {
  /** Aerospace unit's position. */
  readonly from: IHexLikeCoord;
  /** Target's position. */
  readonly to: IHexLikeCoord;
  /** Aerospace facing in degrees (0 = +x, CCW positive). */
  readonly facingDeg: number;
  /** True when the firing unit is a Small Craft (renames Wings → Sides). */
  readonly isSmallCraft?: boolean;
}

/**
 * Return the firing arc in which `to` lies relative to the aerospace unit's
 * facing. Use `FUSELAGE` never — fuselage weapons use whichever arc the pilot
 * declares (see `fuselageFiresAs`).
 */
export function classifyAerospaceArc(
  params: IClassifyAerospaceArcParams,
): AerospaceArc {
  const toDeg = angleBetween(params.from, params.to);
  const rel = Math.abs(normalizeDeg(toDeg - params.facingDeg));

  if (rel <= NOSE_HALF_WIDTH_DEG) return AerospaceArc.NOSE;
  if (rel >= 180 - AFT_HALF_WIDTH_DEG) return AerospaceArc.AFT;

  // Need to distinguish left vs right. Use signed relative angle.
  const signed = normalizeDeg(toDeg - params.facingDeg);
  const isLeft = signed > 0;
  if (rel > WING_NEAR_EDGE_DEG - 1e-6 && rel < WING_FAR_EDGE_DEG + 1e-6) {
    if (params.isSmallCraft) {
      return isLeft ? AerospaceArc.LEFT_SIDE : AerospaceArc.RIGHT_SIDE;
    }
    return isLeft ? AerospaceArc.LEFT_WING : AerospaceArc.RIGHT_WING;
  }

  // Fallback — shouldn't be reachable given the 30/30/120/120/60 partition,
  // but keep the function total.
  return AerospaceArc.NOSE;
}

/**
 * True when the supplied target lies within the given weapon arc.
 */
export function isInArc(
  params: IClassifyAerospaceArcParams,
  weaponArc: AerospaceArc,
): boolean {
  // Fuselage weapons can always fire — the pilot picks.
  if (weaponArc === AerospaceArc.FUSELAGE) {
    return true;
  }
  return classifyAerospaceArc(params) === weaponArc;
}

/**
 * All valid arcs a fuselage weapon may fire through on a given aerospace unit.
 * ASF/CF: Nose, LeftWing, RightWing, Aft.
 * Small Craft: Nose, LeftSide, RightSide, Aft.
 */
export function fuselageFiresAs(
  isSmallCraft: boolean,
): readonly AerospaceArc[] {
  if (isSmallCraft) {
    return [
      AerospaceArc.NOSE,
      AerospaceArc.LEFT_SIDE,
      AerospaceArc.RIGHT_SIDE,
      AerospaceArc.AFT,
    ];
  }
  return [
    AerospaceArc.NOSE,
    AerospaceArc.LEFT_WING,
    AerospaceArc.RIGHT_WING,
    AerospaceArc.AFT,
  ];
}
