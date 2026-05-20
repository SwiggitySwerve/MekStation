import type { MapProjectionMode } from '@/types/gameplay';

/**
 * SVG transform applied to the whole render layer. Rules and hit targets stay
 * axial/top-down; this only changes the visual presentation.
 */
export function getMapProjectionTransform(
  mode: MapProjectionMode,
): string | undefined {
  if (mode === 'topDown') return undefined;
  return 'matrix(1 0 0.28 0.72 0 0)';
}
