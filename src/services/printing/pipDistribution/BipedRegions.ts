/**
 * Biped Mech Polygon Regions
 *
 * Defines polygon regions for biped mech armor/structure pip distribution.
 * These regions match the silhouette shapes from MegaMekLab SVG templates.
 *
 * Coordinates are in the SVG template coordinate space.
 * Vertices are ordered counter-clockwise for exterior boundaries.
 */

import { PolygonRegion, Point2D } from './types';

/**
 * Simplified rectangular regions for initial implementation.
 * These approximate the bounding areas shown in MegaMekLab templates.
 *
 * Phase 2 will extract actual polygon contours from SVG paths.
 */

// Center Torso region (main body, excluding cockpit area)
export const CENTER_TORSO_REGION: PolygonRegion = {
  id: 'CT',
  vertices: [
    [475, 105],  // Top left
    [510, 105],  // Top right
    [515, 195],  // Bottom right
    [470, 195],  // Bottom left
    [475, 105],  // Close
  ],
};

// Center Torso Rear region
export const CENTER_TORSO_REAR_REGION: PolygonRegion = {
  id: 'CTR',
  vertices: [
    [470, 340],
    [515, 340],
    [515, 390],
    [470, 390],
    [470, 340],
  ],
};

// Left Torso region
export const LEFT_TORSO_REGION: PolygonRegion = {
  id: 'LT',
  vertices: [
    [425, 115],
    [470, 115],
    [470, 185],
    [425, 185],
    [425, 115],
  ],
};

// Left Torso Rear region
export const LEFT_TORSO_REAR_REGION: PolygonRegion = {
  id: 'LTR',
  vertices: [
    [410, 340],
    [465, 340],
    [465, 400],
    [410, 400],
    [410, 340],
  ],
};

// Right Torso region
export const RIGHT_TORSO_REGION: PolygonRegion = {
  id: 'RT',
  vertices: [
    [515, 115],
    [560, 115],
    [560, 185],
    [515, 185],
    [515, 115],
  ],
};

// Right Torso Rear region
export const RIGHT_TORSO_REAR_REGION: PolygonRegion = {
  id: 'RTR',
  vertices: [
    [520, 340],
    [575, 340],
    [575, 400],
    [520, 400],
    [520, 340],
  ],
};

// Head region (small, dome-shaped)
export const HEAD_REGION: PolygonRegion = {
  id: 'HD',
  vertices: [
    [480, 70],
    [505, 70],
    [510, 100],
    [475, 100],
    [480, 70],
  ],
};

// Left Arm region
export const LEFT_ARM_REGION: PolygonRegion = {
  id: 'LA',
  vertices: [
    [395, 115],
    [420, 115],
    [420, 200],
    [395, 200],
    [395, 115],
  ],
};

// Right Arm region
export const RIGHT_ARM_REGION: PolygonRegion = {
  id: 'RA',
  vertices: [
    [565, 115],
    [590, 115],
    [590, 200],
    [565, 200],
    [565, 115],
  ],
};

// Left Leg region
export const LEFT_LEG_REGION: PolygonRegion = {
  id: 'LL',
  vertices: [
    [435, 205],
    [475, 205],
    [475, 320],
    [435, 320],
    [435, 205],
  ],
};

// Right Leg region
export const RIGHT_LEG_REGION: PolygonRegion = {
  id: 'RL',
  vertices: [
    [510, 205],
    [550, 205],
    [550, 320],
    [510, 320],
    [510, 205],
  ],
};

/**
 * Get all biped armor regions as a map
 */
export function getBipedArmorRegions(): Map<string, PolygonRegion> {
  return new Map([
    ['HD', HEAD_REGION],
    ['CT', CENTER_TORSO_REGION],
    ['CTR', CENTER_TORSO_REAR_REGION],
    ['LT', LEFT_TORSO_REGION],
    ['LTR', LEFT_TORSO_REAR_REGION],
    ['RT', RIGHT_TORSO_REGION],
    ['RTR', RIGHT_TORSO_REAR_REGION],
    ['LA', LEFT_ARM_REGION],
    ['RA', RIGHT_ARM_REGION],
    ['LL', LEFT_LEG_REGION],
    ['RL', RIGHT_LEG_REGION],
  ]);
}

/**
 * Get a specific armor region by location abbreviation
 */
export function getBipedArmorRegion(locationAbbr: string): PolygonRegion | undefined {
  return getBipedArmorRegions().get(locationAbbr);
}

/**
 * Extract pip positions from a pre-made MegaMekLab pip SVG file.
 * Used for verification - extracts circle centers from path data.
 *
 * @param pathData - SVG path d attribute (M ... c ... z format)
 * @returns Array of [x, y] center coordinates
 */
export function extractPipCentersFromPath(pathData: string): Point2D[] {
  const positions: Point2D[] = [];

  // MegaMekLab pip paths are circles drawn with bezier curves
  // Each path starts with M (moveto) followed by the center coordinates
  // Format: M486.039,110.844c... for a circle centered at (486.039, 110.844)
  const pathRegex = /M\s*([\d.]+)\s*,\s*([\d.]+)/g;
  let match;

  while ((match = pathRegex.exec(pathData)) !== null) {
    const x = parseFloat(match[1]);
    const y = parseFloat(match[2]);
    // Adjust for circle radius (pips are ~2.4px radius)
    // The M coordinate is actually on the circle perimeter, not center
    // We need to analyze the path more carefully for true center
    positions.push([x, y]);
  }

  return positions;
}

/**
 * Calculate approximate pip radius from a set of pip positions.
 * Uses nearest-neighbor distance to estimate spacing.
 */
export function estimatePipRadius(positions: Point2D[]): number {
  if (positions.length < 2) return 2.4; // Default MegaMekLab pip radius

  // Find minimum distance between any two pips
  let minDist = Infinity;
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const dx = positions[i][0] - positions[j][0];
      const dy = positions[i][1] - positions[j][1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) minDist = dist;
    }
  }

  // Pip radius is roughly 40% of minimum spacing
  return Math.min(minDist * 0.4, 2.5);
}
