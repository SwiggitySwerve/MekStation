/**
 * Contour Edges
 *
 * Derives contour line segments to render on hex edges where the
 * adjacent hex's elevation differs by 1 or more.
 *
 * @spec openspec/changes/add-terrain-rendering/specs/terrain-rendering/spec.md
 *
 * Contour contract:
 * - Delta 0 between neighbors -> no contour.
 * - Delta 1 -> 1px line.
 * - Delta 2+ -> 2px line (thicker cap prevents visual noise at cliffs).
 * - Color picks dark-on-light or light-on-dark based on the current hex
 *   shading so the line remains visible against both sides.
 */

import type { IHexCoordinate } from '@/types/gameplay';

import { HEX_SIZE } from '@/constants/hexMap';

import { isDarkShading } from './elevationShading';

/**
 * One contour segment along a single edge of a hex.
 */
export interface IContourSegment {
  /** Start point in the same SVG space as `hexToPixel`. */
  readonly x1: number;
  readonly y1: number;
  /** End point. */
  readonly x2: number;
  readonly y2: number;
  /** Stroke width in px; 1 for delta=1, 2 for delta >= 2. */
  readonly width: number;
  /** Stroke color chosen to contrast the base hex lightness. */
  readonly color: string;
  /** Which of the 6 edges (0..5, matching the flat-top hex vertex pairs). */
  readonly edgeIndex: number;
}

/**
 * Compute the 6 hex vertices in world space for a flat-top hex centered
 * at (cx, cy) at radius `HEX_SIZE`. Vertex i is at angle 60*i degrees.
 */
function hexVertices(
  cx: number,
  cy: number,
): readonly { x: number; y: number }[] {
  const verts: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angleRad = (Math.PI / 180) * (60 * i);
    verts.push({
      x: cx + HEX_SIZE * Math.cos(angleRad),
      y: cy + HEX_SIZE * Math.sin(angleRad),
    });
  }
  return verts;
}

/**
 * Compute contour segments for the edges of hex `coord` given:
 * - `centerPixel`: the pixel position of `coord` (from `hexToPixel`).
 * - `ownElevation`: the elevation of `coord`.
 * - `neighborElevations`: elevations of `coord`'s 6 neighbors in the
 *   same ordering as `hexNeighbors` (N, NE, SE, S, SW, NW).
 *
 * Returns one segment per edge where |delta| >= 1.
 */
export function contourSegmentsFor(
  centerPixel: { x: number; y: number },
  ownElevation: number,
  neighborElevations: readonly (number | null)[],
): readonly IContourSegment[] {
  const verts = hexVertices(centerPixel.x, centerPixel.y);
  const ownIsDark = isDarkShading(ownElevation);
  // Light-on-dark / dark-on-light: pick a contrasting ink for the line
  // so the contour reads against the current hex's shaded fill. The
  // neighbor's fill will be either equally light/dark or different, but
  // biasing to the own hex keeps the contour continuous along one side.
  const color = ownIsDark ? '#f8fafc' : '#0f172a';

  const segments: IContourSegment[] = [];

  // `hexNeighbors` returns N, NE, SE, S, SW, NW. For a flat-top hex,
  // edges 0..5 (between vertex i and i+1) correspond to neighbor
  // directions in the same clockwise order starting from the right —
  // we align them directly because both iterate 6-fold in the same
  // rotation sense.
  for (let edgeIndex = 0; edgeIndex < 6; edgeIndex++) {
    const neighborElev = neighborElevations[edgeIndex];
    if (neighborElev == null) continue;

    const delta = Math.abs(ownElevation - neighborElev);
    if (delta < 1) continue;

    const width = delta >= 2 ? 2 : 1;
    const start = verts[edgeIndex];
    const end = verts[(edgeIndex + 1) % 6];

    segments.push({
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: end.y,
      width,
      color,
      edgeIndex,
    });
  }

  return segments;
}

/**
 * Lookup helper: given a terrain map keyed by "q,r", return the
 * elevation for a coordinate or `null` if the neighbor is off-map.
 */
export function elevationLookup(
  coord: IHexCoordinate,
  terrainLookup: ReadonlyMap<string, { readonly elevation: number }>,
): number | null {
  const key = `${coord.q},${coord.r}`;
  const entry = terrainLookup.get(key);
  return entry ? entry.elevation : null;
}
