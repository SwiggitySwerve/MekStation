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
  /** Reachable movement range */
  movementRange: '#86efac',
  /** Unreachable/blocked movement */
  movementRangeUnreachable: '#fca5a5',
  /** Attack range highlight */
  attackRange: '#fecaca',
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
export function hexToPixel(q: number, r: number): { x: number; y: number } {
  const x = HEX_SIZE * (3 / 2) * q;
  const y = HEX_SIZE * ((Math.sqrt(3) / 2) * q + Math.sqrt(3) * r);
  return { x, y };
}

/**
 * Convert pixel position to axial hex coordinates.
 * Uses flat-top hex orientation.
 * @param x - Pixel x position
 * @param y - Pixel y position
 * @returns Axial coordinates {q, r}
 */
export function pixelToHex(x: number, y: number): { q: number; r: number } {
  const q = ((2 / 3) * x) / HEX_SIZE;
  const r = ((-1 / 3) * x + (Math.sqrt(3) / 3) * y) / HEX_SIZE;
  return { q: Math.round(q), r: Math.round(r) };
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
  return (
    (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2
  );
}
