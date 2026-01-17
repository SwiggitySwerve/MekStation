/**
 * Count Adjustment
 *
 * Functions for adjusting point counts to match exact target values.
 * Used after Poisson sampling to guarantee exact pip counts.
 */

import { polygon as turfPolygon } from '@turf/helpers';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import type { Feature, Polygon, Position } from 'geojson';
import { Point2D, PolygonRegion, BoundingBox } from './types';
import {
  distance,
  calculatePointsCentroid,
  randomPointInBoundingBox,
} from './PolygonUtils';

/**
 * Convert Point2D array to Turf Position array
 */
function toPositions(points: Point2D[]): Position[] {
  return points.map((p) => [p[0], p[1]]);
}

/**
 * Create a Turf polygon from a PolygonRegion
 */
export function createTurfPolygon(region: PolygonRegion): Feature<Polygon> {
  const exterior = toPositions(region.vertices);
  const rings: Position[][] = [exterior];
  if (region.holes) {
    for (const hole of region.holes) {
      rings.push(toPositions(hole));
    }
  }
  return turfPolygon(rings);
}

/**
 * Check if a point is inside a polygon region
 */
export function isPointInRegion(point: Point2D, region: PolygonRegion): boolean {
  return booleanPointInPolygon([point[0], point[1]], createTurfPolygon(region));
}

/**
 * Adjust point count to match target exactly
 *
 * If too many points: remove points furthest from centroid
 * If too few points: add points at maximum distance from existing points
 */
export function adjustPointCount(
  points: Point2D[],
  targetCount: number,
  region: PolygonRegion,
  bounds: BoundingBox,
  random: () => number = Math.random
): Point2D[] {
  if (points.length === targetCount) {
    return points;
  }

  if (points.length > targetCount) {
    return removeExcessPoints(points, targetCount);
  }

  return addMissingPoints(points, targetCount, region, bounds, random);
}

/**
 * Remove excess points by keeping those closest to the centroid
 */
function removeExcessPoints(points: Point2D[], targetCount: number): Point2D[] {
  const centroid = calculatePointsCentroid(points);

  // Sort by distance from centroid (ascending)
  const sorted = [...points]
    .map((point) => ({ point, dist: distance(point, centroid) }))
    .sort((a, b) => a.dist - b.dist);

  // Keep the closest points
  return sorted.slice(0, targetCount).map((item) => item.point);
}

/**
 * Add missing points at positions maximizing distance from existing points
 */
function addMissingPoints(
  points: Point2D[],
  targetCount: number,
  region: PolygonRegion,
  bounds: BoundingBox,
  random: () => number
): Point2D[] {
  const result = [...points];
  const maxIterationsPerPoint = 100;
  const candidatesPerIteration = 20;

  while (result.length < targetCount) {
    let bestCandidate: Point2D | null = null;
    let bestMinDist = -1;

    // Try multiple random candidates and pick the one furthest from existing points
    for (let i = 0; i < maxIterationsPerPoint; i++) {
      // Generate batch of candidates
      for (let j = 0; j < candidatesPerIteration; j++) {
        const candidate = randomPointInBoundingBox(bounds, random);

        // Check if inside polygon
        if (!isPointInRegion(candidate, region)) {
          continue;
        }

        // Calculate minimum distance to existing points
        let minDist = Infinity;
        for (const p of result) {
          const d = distance(candidate, p);
          if (d < minDist) minDist = d;
        }

        // Keep if better than current best
        if (minDist > bestMinDist) {
          bestMinDist = minDist;
          bestCandidate = candidate;
        }
      }

      // Early exit if we found a good candidate
      if (bestCandidate && bestMinDist > 0) {
        break;
      }
    }

    if (bestCandidate) {
      result.push(bestCandidate);
    } else {
      // Can't find valid candidate - polygon might be too small
      // Fall back to random placement
      let fallbackAttempts = 1000;
      while (result.length < targetCount && fallbackAttempts > 0) {
        const candidate = randomPointInBoundingBox(bounds, random);
        if (isPointInRegion(candidate, region)) {
          result.push(candidate);
        }
        fallbackAttempts--;
      }
      break;
    }
  }

  return result;
}

/**
 * Filter points to only those inside the polygon region
 */
export function filterPointsInRegion(
  points: Point2D[],
  region: PolygonRegion
): Point2D[] {
  return points.filter((point) => isPointInRegion(point, region));
}
