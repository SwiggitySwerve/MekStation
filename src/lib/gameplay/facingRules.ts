/**
 * Per-type facing rules for the hex combat map.
 *
 * BattleTech uses different facing conventions per unit type:
 *   - BattleMechs / ProtoMechs: 6-direction hex facing (Facing enum, 0-5)
 *   - Vehicles: 8-cardinal-direction facing (N/NE/E/SE/S/SW/W/NW)
 *   - Aerospace: heading expressed as a velocity vector, not a fixed arc
 *   - Infantry: no facing (platoons do not have a front arc in Total Warfare)
 *   - BattleArmor: no facing when acting as independent tokens
 *
 * @spec openspec/changes/add-per-type-hex-tokens/specs/tactical-map-interface/spec.md
 *        §Per-Type Facing Rules
 */

import { TokenUnitType } from '@/types/gameplay';

// =============================================================================
// Facing Mode Discriminant
// =============================================================================

/** The three canonical facing conventions used across all unit types. */
export type FacingMode = 'hex6' | 'cardinal8' | 'vector' | 'none';

/**
 * Describes how a unit type expresses its facing on the map.
 */
export interface IFacingRules {
  /** The facing convention for this unit type. */
  readonly mode: FacingMode;
  /**
   * Number of valid facing states.
   * - hex6: 6 (Facing enum values 0-5)
   * - cardinal8: 8 (0=N through 7=NW)
   * - vector: Infinity (continuous heading + velocity)
   * - none: 0 (no facing)
   */
  readonly stateCount: number;
  /**
   * Human-readable label for the facing indicator shown on the token.
   * Used by the UI tooltip / accessibility label.
   */
  readonly indicatorLabel: string;
  /**
   * Whether the unit rotates its token body when facing changes.
   * Mechs/protos rotate their silhouette; vehicles rotate their body +
   * show a separate turret arrow; aerospace rotates the wedge; infantry
   * shows no rotation.
   */
  readonly tokenRotates: boolean;
}

// =============================================================================
// Facing Label Helpers
// =============================================================================

/**
 * Friendly direction labels for 8-cardinal facing (vehicles).
 * Index 0 = North, increasing clockwise.
 */
export const CARDINAL8_LABELS: readonly string[] = [
  'N',
  'NE',
  'E',
  'SE',
  'S',
  'SW',
  'W',
  'NW',
] as const;

/**
 * Friendly direction labels for 6-hex facing (mechs / protos).
 * Aligns with the Facing enum (0=North through 5=Northwest).
 */
export const HEX6_LABELS: readonly string[] = [
  'N',
  'NE',
  'SE',
  'S',
  'SW',
  'NW',
] as const;

// =============================================================================
// Per-Type Lookup
// =============================================================================

const FACING_RULES_BY_TYPE: Readonly<Record<TokenUnitType, IFacingRules>> = {
  [TokenUnitType.Mech]: {
    mode: 'hex6',
    stateCount: 6,
    indicatorLabel: 'Hex facing',
    tokenRotates: true,
  },
  [TokenUnitType.ProtoMech]: {
    mode: 'hex6',
    stateCount: 6,
    indicatorLabel: 'Hex facing',
    tokenRotates: true,
  },
  [TokenUnitType.Vehicle]: {
    mode: 'cardinal8',
    stateCount: 8,
    indicatorLabel: 'Cardinal facing',
    tokenRotates: true,
  },
  [TokenUnitType.Aerospace]: {
    mode: 'vector',
    stateCount: Infinity,
    indicatorLabel: 'Velocity vector',
    tokenRotates: true,
  },
  [TokenUnitType.Infantry]: {
    mode: 'none',
    stateCount: 0,
    indicatorLabel: 'No facing',
    tokenRotates: false,
  },
  [TokenUnitType.BattleArmor]: {
    mode: 'none',
    stateCount: 0,
    indicatorLabel: 'No facing',
    tokenRotates: false,
  },
};

/**
 * Return the canonical facing rules for a given unit type.
 * Safe to call with `undefined` (falls back to Mech rules for legacy tokens).
 *
 * @example
 *   const rules = getFacingRules(TokenUnitType.Vehicle);
 *   // rules.mode === 'cardinal8'
 */
export function getFacingRules(
  unitType: TokenUnitType | undefined,
): IFacingRules {
  return FACING_RULES_BY_TYPE[unitType ?? TokenUnitType.Mech];
}

// =============================================================================
// Rotation Helpers
// =============================================================================

/**
 * Convert a 6-hex Facing value (0-5) to a clockwise SVG rotation in degrees.
 * North (0) → 0°, Northeast (1) → 60°, …, Northwest (5) → 300°.
 */
export function hex6ToRotationDeg(facing: number): number {
  return ((facing % 6) * 60 + 360) % 360;
}

/**
 * Convert an 8-cardinal direction index (0=N through 7=NW) to a clockwise
 * SVG rotation in degrees. N → 0°, NE → 45°, …, NW → 315°.
 */
export function cardinal8ToRotationDeg(direction: number): number {
  return ((direction % 8) * 45 + 360) % 360;
}

/**
 * Convert a heading (0-360°) and velocity to an SVG velocity-vector endpoint
 * relative to a token centre at (0,0). Callers draw a line from (0,0) to the
 * returned point.
 *
 * @param headingDeg - Clockwise heading in degrees (0 = North = up in SVG).
 * @param velocity   - Speed in thrust points.
 * @param pixelsPerUnit - Scale factor (default 4px per thrust point).
 */
export function velocityVectorEndpoint(
  headingDeg: number,
  velocity: number,
  pixelsPerUnit = 4,
): { x: number; y: number } {
  // SVG y-axis is inverted (positive = down), so North (heading 0) maps to
  // angle -90° in standard trig. We rotate by (heading - 90)° in radians.
  const rad = ((headingDeg - 90) * Math.PI) / 180;
  const length = velocity * pixelsPerUnit;
  return {
    x: Math.cos(rad) * length,
    y: Math.sin(rad) * length,
  };
}

/**
 * Return a human-readable direction label for any unit type given its
 * numeric facing value. Used by tooltip/ARIA label builders.
 *
 * - hex6 types → HEX6_LABELS[facing]
 * - cardinal8 types → CARDINAL8_LABELS[facing]
 * - vector/none → empty string (rendered via velocity/no-facing path)
 */
export function facingLabel(
  unitType: TokenUnitType | undefined,
  facing: number,
): string {
  const rules = getFacingRules(unitType);
  switch (rules.mode) {
    case 'hex6':
      return HEX6_LABELS[facing % 6] ?? 'N';
    case 'cardinal8':
      return CARDINAL8_LABELS[facing % 8] ?? 'N';
    default:
      return '';
  }
}
