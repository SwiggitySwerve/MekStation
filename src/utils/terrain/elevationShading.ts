/**
 * Elevation Shading
 *
 * Computes a monotonic lightness color for a hex based on its elevation.
 * Renders the bottom-most layer of a terrain hex so higher ground reads
 * as lighter and lower ground as darker.
 *
 * @spec openspec/changes/add-terrain-rendering/specs/terrain-rendering/spec.md
 *
 * Formula (D3):
 * - Clamp elevation to [MIN_ELEVATION, MAX_ELEVATION] (BattleTech range).
 * - Base neutral lightness BASE_LIGHTNESS at elevation 0.
 * - +LIGHTNESS_STEP_PERCENT per level above 0, -LIGHTNESS_STEP_PERCENT
 *   per level below 0.
 * - Return an `hsl(0, 0%, L%)` string — hue/sat zero keeps the shading
 *   neutral so it doesn't distort the base terrain color above it, and
 *   stays colorblind-safe (pure-luminance gradient).
 */

/**
 * Lowest elevation we render shading for. BattleTech standard rules cap
 * depressions / pits at -4 levels; anything deeper is treated as -4.
 */
export const MIN_ELEVATION = -4;

/**
 * Highest elevation we render shading for. BattleTech standard rules
 * cap map ramps at +6 levels; anything higher is treated as +6.
 */
export const MAX_ELEVATION = 6;

/**
 * Neutral lightness at elevation 0. 50% reads as mid-grey, giving the
 * shading layer no visible tint before terrain art stacks on top.
 */
export const BASE_LIGHTNESS = 50;

/**
 * Lightness delta per elevation level. 6% per level across an 11-level
 * span (-4..+6) produces a ~66% total range, which reads clearly
 * without washing out or crushing the base terrain color.
 */
export const LIGHTNESS_STEP_PERCENT = 6;

/**
 * Clamp an elevation to the rendered range.
 */
export function clampElevation(elevation: number): number {
  if (elevation > MAX_ELEVATION) return MAX_ELEVATION;
  if (elevation < MIN_ELEVATION) return MIN_ELEVATION;
  return elevation;
}

/**
 * Lightness percentage (0-100) for a given elevation. Monotonic: higher
 * elevation -> higher lightness.
 */
export function lightnessFor(elevation: number): number {
  const clamped = clampElevation(elevation);
  return BASE_LIGHTNESS + clamped * LIGHTNESS_STEP_PERCENT;
}

/**
 * CSS color for the elevation shading layer at a given elevation.
 * Returns a neutral `hsl` with zero hue/saturation so the shading
 * doesn't stain the terrain art that renders above it.
 */
export function shadingFor(elevation: number): string {
  const lightness = lightnessFor(elevation);
  return `hsl(0, 0%, ${lightness}%)`;
}

/**
 * Whether a shading color is "dark" (useful for contour-line contrast
 * picks, per spec: contour color adapts to base hex lightness).
 */
export function isDarkShading(elevation: number): boolean {
  return lightnessFor(elevation) < BASE_LIGHTNESS;
}
