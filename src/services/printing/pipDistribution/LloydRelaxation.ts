/**
 * Lloyd's Relaxation
 *
 * Implements Lloyd's algorithm for improving point distribution uniformity.
 * Iteratively moves points toward the centroids of their Voronoi cells.
 */

import { Point2D, PolygonRegion, BoundingBox } from './types';
import { isPointInRegion } from './CountAdjustment';
import { calculatePointsCentroid } from './PolygonUtils';

/**
 * Apply Lloyd's relaxation to improve point distribution uniformity
 *
 * Note: This is a simplified implementation that doesn't compute true Voronoi cells.
 * Instead, it uses a repulsion-based approach that achieves similar results
 * with less computational overhead.
 *
 * @param points - Initial point positions
 * @param region - Polygon region to constrain points
 * @param bounds - Bounding box of the region
 * @param iterations - Number of relaxation iterations
 * @returns Relaxed point positions
 */
export function applyLloydRelaxation(
  points: Point2D[],
  region: PolygonRegion,
  bounds: BoundingBox,
  iterations: number = 10
): Point2D[] {
  if (points.length <= 1 || iterations <= 0) {
    return points;
  }

  let current = [...points.map((p) => [...p] as Point2D)];

  for (let iter = 0; iter < iterations; iter++) {
    current = relaxationStep(current, region, bounds);
  }

  return current;
}

/**
 * Single relaxation step using repulsion-based approach
 *
 * Each point is moved away from nearby points and toward the centroid,
 * while staying within the polygon boundary.
 */
function relaxationStep(
  points: Point2D[],
  region: PolygonRegion,
  bounds: BoundingBox
): Point2D[] {
  const n = points.length;
  if (n <= 1) return points;

  // Calculate average spacing
  const avgSpacing = calculateAverageSpacing(points);
  const repulsionRadius = avgSpacing * 1.5;
  const stepSize = avgSpacing * 0.1; // Move 10% of average spacing per iteration

  const centroid = calculatePointsCentroid(points);
  const result: Point2D[] = [];

  for (let i = 0; i < n; i++) {
    const point = points[i];

    // Calculate repulsion force from nearby points
    let fx = 0;
    let fy = 0;

    for (let j = 0; j < n; j++) {
      if (i === j) continue;

      const other = points[j];
      const dx = point[0] - other[0];
      const dy = point[1] - other[1];
      const distSq = dx * dx + dy * dy;

      if (distSq < repulsionRadius * repulsionRadius && distSq > 0) {
        const dist = Math.sqrt(distSq);
        // Repulsion force inversely proportional to distance
        const force = (repulsionRadius - dist) / repulsionRadius;
        fx += (dx / dist) * force;
        fy += (dy / dist) * force;
      }
    }

    // Add slight attraction toward centroid to prevent drift
    const toCentroidX = centroid[0] - point[0];
    const toCentroidY = centroid[1] - point[1];
    const centroidDist = Math.sqrt(toCentroidX * toCentroidX + toCentroidY * toCentroidY);
    if (centroidDist > 0) {
      const attractionStrength = 0.05;
      fx += (toCentroidX / centroidDist) * attractionStrength;
      fy += (toCentroidY / centroidDist) * attractionStrength;
    }

    // Normalize and apply step
    const forceMag = Math.sqrt(fx * fx + fy * fy);
    let newX = point[0];
    let newY = point[1];

    if (forceMag > 0) {
      newX += (fx / forceMag) * stepSize;
      newY += (fy / forceMag) * stepSize;
    }

    // Clamp to bounding box
    newX = Math.max(bounds.minX, Math.min(bounds.maxX, newX));
    newY = Math.max(bounds.minY, Math.min(bounds.maxY, newY));

    const newPoint: Point2D = [newX, newY];

    // If new position is outside polygon, keep original
    if (isPointInRegion(newPoint, region)) {
      result.push(newPoint);
    } else {
      result.push([...point] as Point2D);
    }
  }

  return result;
}

/**
 * Calculate average spacing between points
 */
function calculateAverageSpacing(points: Point2D[]): number {
  if (points.length <= 1) return 1;

  // Find average nearest-neighbor distance
  let totalDist = 0;
  let count = 0;

  for (let i = 0; i < points.length; i++) {
    let minDist = Infinity;

    for (let j = 0; j < points.length; j++) {
      if (i === j) continue;

      const dx = points[i][0] - points[j][0];
      const dy = points[i][1] - points[j][1];
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < minDist) minDist = dist;
    }

    if (minDist < Infinity) {
      totalDist += minDist;
      count++;
    }
  }

  return count > 0 ? totalDist / count : 1;
}

/**
 * Calculate uniformity metric (lower is better, 0 is perfect)
 * Measures the coefficient of variation of nearest-neighbor distances
 */
export function calculateUniformityMetric(points: Point2D[]): number {
  if (points.length <= 1) return 0;

  const distances: number[] = [];

  for (let i = 0; i < points.length; i++) {
    let minDist = Infinity;

    for (let j = 0; j < points.length; j++) {
      if (i === j) continue;

      const dx = points[i][0] - points[j][0];
      const dy = points[i][1] - points[j][1];
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < minDist) minDist = dist;
    }

    if (minDist < Infinity) {
      distances.push(minDist);
    }
  }

  if (distances.length === 0) return 0;

  // Calculate coefficient of variation (std dev / mean)
  const mean = distances.reduce((a, b) => a + b, 0) / distances.length;
  const variance =
    distances.reduce((sum, d) => sum + (d - mean) ** 2, 0) / distances.length;
  const stdDev = Math.sqrt(variance);

  return mean > 0 ? stdDev / mean : 0;
}
