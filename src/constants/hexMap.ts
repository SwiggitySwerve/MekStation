import { hexDistance as axialHexDistance } from '@/utils/gameplay/hexMath';

/**
 * Hex Map Constants
 *
 * Constants for hex grid rendering and calculations.
 * Uses flat-top hexagon orientation.
 */

// =============================================================================
// Hex Dimensions
// =============================================================================

/**
 * Base hex size in pixels (distance from center to vertex).
 */
export const HEX_SIZE = 40;

/**
 * Hex width in pixels (flat-top orientation).
 * Width = size * 2
 */
export const HEX_WIDTH = HEX_SIZE * 2;

/**
 * Hex height in pixels (flat-top orientation).
 * Height = sqrt(3) * size
 */
export const HEX_HEIGHT = Math.sqrt(3) * HEX_SIZE;

// =============================================================================
// Hex Colors
// =============================================================================

/**
 * Color palette for hex map rendering.
 * Uses string type instead of literal types for assignment flexibility.
 */
export const HEX_COLORS: Record<string, string> = {
  /** Grid line color */
  gridLine: '#94a3b8',
  /** Default hex fill */
  hexFill: '#f8fafc',
  /** Hover state */
  hexHover: '#e2e8f0',
  /** Selected hex */
  hexSelected: '#bfdbfe',
  /** Reachable movement range (legacy uniform color; per
   *  add-movement-phase-ui task 3.2-3.4 use the per-type colors below
   *  when movement type is known). */
  movementRange: '#67e8f9',
  /** Walk-range tile (cyan per MegaMek movement phase reference) */
  movementRangeWalk: '#67e8f9',
  /** Run-range tile (yellow per MegaMek movement phase reference) */
  movementRangeRun: '#fef08a',
  /** Jump-range tile (red per MegaMek movement phase reference) */
  movementRangeJump: '#f87171',
  /** Unreachable/blocked movement (dark gray per MegaMek path convention) */
  movementRangeUnreachable: '#64748b',
  /** Attack range highlight */
  attackRange: '#fecaca',
  /** Legacy caller-provided range envelope that is not weapon-backed */
  attackRangeFallback: '#64748b',
  /** Path visualization */
  pathHighlight: '#60a5fa',
  /** Player unit token */
  playerToken: '#3b82f6',
  /** Opponent unit token */
  opponentToken: '#ef4444',
  /** Destroyed unit token */
  destroyedToken: '#6b7280',
};

// =============================================================================
// Hex Math Utilities
// =============================================================================

/**
 * Convert axial hex coordinates to pixel position.
 * Uses flat-top hex orientation.
 * @param q - Axial q coordinate
 * @param r - Axial r coordinate
 * @returns Pixel position {x, y}
 */
export function hexToPixel(
  q: number,
  r: number,
  size = HEX_SIZE,
): { x: number; y: number } {
  const x = size * (3 / 2) * q;
  const y = size * ((Math.sqrt(3) / 2) * q + Math.sqrt(3) * r);
  return { x, y };
}

/**
 * Convert pixel position to axial hex coordinates.
 * Uses flat-top hex orientation.
 * @param x - Pixel x position
 * @param y - Pixel y position
 * @returns Axial coordinates {q, r}
 */
export function pixelToHex(
  x: number,
  y: number,
  size = HEX_SIZE,
): { q: number; r: number } {
  const q = ((2 / 3) * x) / size;
  const r = ((-1 / 3) * x + (Math.sqrt(3) / 3) * y) / size;
  return roundAxial(q, r);
}

function roundAxial(q: number, r: number): { q: number; r: number } {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);

  const qDiff = Math.abs(rq - q);
  const rDiff = Math.abs(rr - r);
  const sDiff = Math.abs(rs - s);

  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  }

  return { q: rq, r: rr };
}

/**
 * Calculate Manhattan distance between two hex coordinates.
 * @param q1 - First hex q coordinate
 * @param r1 - First hex r coordinate
 * @param q2 - Second hex q coordinate
 * @param r2 - Second hex r coordinate
 * @returns Distance in hexes
 */
export function hexDistance(
  q1: number,
  r1: number,
  q2: number,
  r2: number,
): number {
  return axialHexDistance({ q: q1, r: r1 }, { q: q2, r: r2 });
}
