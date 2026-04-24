/**
 * Minimap geometry helpers.
 *
 * Extracted from the component so the math can be unit-tested in
 * isolation. Keeps the component file under 300 lines per project
 * guidance and means a failing "minimap click centers camera" test
 * can target the conversion, not the React render.
 *
 * @spec openspec/changes/add-minimap-and-camera-controls/specs/tactical-map-interface/spec.md
 */

import { HEX_HEIGHT, HEX_SIZE, HEX_WIDTH } from '@/constants/hexMap';

/**
 * Size of the minimap's rendered area in CSS pixels, per spec
 * "200x200 pixels with 12px margin". The SVG uses its own internal
 * viewBox driven by the map's world-space bounds (see
 * `worldBoundsForRadius` below).
 */
export const MINIMAP_SIZE = 200;
export const MINIMAP_MARGIN = 12;

export interface IWorldBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Compute the world-space bounding box the minimap renders. Uses the
 * same padding model as `useMapInteraction` so the minimap and the
 * main map agree on the map's extent.
 */
export function worldBoundsForRadius(radius: number): IWorldBounds {
  const padding = HEX_SIZE * 2;
  const minX = -radius * HEX_WIDTH * 0.75 - padding;
  const maxX = radius * HEX_WIDTH * 0.75 + padding;
  const minY = -radius * HEX_HEIGHT - padding;
  const maxY = radius * HEX_HEIGHT + padding;
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Convert a click position on the minimap (in CSS pixels relative to
 * the minimap element) into a world-space coordinate. The inverse
 * operation to the SVG viewBox — pixel ratio is the minimap render
 * size over the world bounds.
 *
 * Why a plain function: tests call it directly, and the component
 * passes through `getBoundingClientRect()` to compute the relative
 * pixel.
 */
export function minimapPixelToWorld(
  pixel: { x: number; y: number },
  bounds: IWorldBounds,
  minimapSize: number,
): { x: number; y: number } {
  const worldX = bounds.minX + (pixel.x / minimapSize) * bounds.width;
  const worldY = bounds.minY + (pixel.y / minimapSize) * bounds.height;
  return { x: worldX, y: worldY };
}

/**
 * Convert world-space coordinates back to minimap pixel space. Used
 * by the viewport rectangle and the unit-dot placements.
 */
export function worldToMinimapPixel(
  world: { x: number; y: number },
  bounds: IWorldBounds,
  minimapSize: number,
): { x: number; y: number } {
  const px = ((world.x - bounds.minX) / bounds.width) * minimapSize;
  const py = ((world.y - bounds.minY) / bounds.height) * minimapSize;
  return { x: px, y: py };
}

/**
 * Given the main camera state, compute the viewport rectangle the
 * minimap should draw (in minimap pixel space). The rectangle
 * represents "what the user can currently see on the main map" and
 * updates live on every pan/zoom.
 *
 * Math:
 *   - Viewport width in world units = viewBox.width * (1/zoom)
 *   - Viewport center in world units = -pan * (1/zoom)   (matches
 *     `transformedViewBox` in `useMapInteraction`).
 *   - Convert that center + extent to minimap pixels via the bounds.
 */
export function viewportRectOnMinimap(
  camera: {
    viewBox: IWorldBounds;
    zoom: number;
    pan: { x: number; y: number };
  },
  bounds: IWorldBounds,
  minimapSize: number,
): { x: number; y: number; width: number; height: number } {
  const scale = 1 / camera.zoom;
  const viewWorldW = camera.viewBox.width * scale;
  const viewWorldH = camera.viewBox.height * scale;
  const centerWorldX = -camera.pan.x * scale;
  const centerWorldY = -camera.pan.y * scale;
  const topLeft = worldToMinimapPixel(
    { x: centerWorldX - viewWorldW / 2, y: centerWorldY - viewWorldH / 2 },
    bounds,
    minimapSize,
  );
  const bottomRight = worldToMinimapPixel(
    { x: centerWorldX + viewWorldW / 2, y: centerWorldY + viewWorldH / 2 },
    bounds,
    minimapSize,
  );
  return {
    x: topLeft.x,
    y: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  };
}
