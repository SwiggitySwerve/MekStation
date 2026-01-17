/**
 * Polygon Utilities
 *
 * Geometric utility functions for polygon operations including
 * area calculation, centroid computation, and point distance.
 */

import { Point2D, BoundingBox } from './types';

/**
 * Calculate the signed area of a polygon using the Shoelace formula
 * Positive for counter-clockwise, negative for clockwise
 */
export function calculateSignedPolygonArea(vertices: Point2D[]): number {
  if (vertices.length < 3) return 0;

  let area = 0;
  const n = vertices.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i][0] * vertices[j][1];
    area -= vertices[j][0] * vertices[i][1];
  }

  return area / 2;
}

/**
 * Calculate the absolute area of a polygon
 */
export function calculatePolygonArea(vertices: Point2D[]): number {
  return Math.abs(calculateSignedPolygonArea(vertices));
}

/**
 * Calculate the centroid of a polygon
 */
export function calculatePolygonCentroid(vertices: Point2D[]): Point2D {
  if (vertices.length === 0) return [0, 0];
  if (vertices.length === 1) return [...vertices[0]] as Point2D;
  if (vertices.length === 2) {
    return [
      (vertices[0][0] + vertices[1][0]) / 2,
      (vertices[0][1] + vertices[1][1]) / 2,
    ];
  }

  const area = calculateSignedPolygonArea(vertices);
  if (Math.abs(area) < 1e-10) {
    // Degenerate polygon, return average of vertices
    const sum = vertices.reduce(
      (acc, v) => [acc[0] + v[0], acc[1] + v[1]] as Point2D,
      [0, 0] as Point2D
    );
    return [sum[0] / vertices.length, sum[1] / vertices.length];
  }

  let cx = 0;
  let cy = 0;
  const n = vertices.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const cross = vertices[i][0] * vertices[j][1] - vertices[j][0] * vertices[i][1];
    cx += (vertices[i][0] + vertices[j][0]) * cross;
    cy += (vertices[i][1] + vertices[j][1]) * cross;
  }

  const factor = 1 / (6 * area);
  return [cx * factor, cy * factor];
}

/**
 * Calculate the centroid of a set of points
 */
export function calculatePointsCentroid(points: Point2D[]): Point2D {
  if (points.length === 0) return [0, 0];

  const sum = points.reduce(
    (acc, p) => [acc[0] + p[0], acc[1] + p[1]] as Point2D,
    [0, 0] as Point2D
  );

  return [sum[0] / points.length, sum[1] / points.length];
}

/**
 * Calculate Euclidean distance between two points
 */
export function distance(p1: Point2D, p2: Point2D): number {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate squared distance between two points (faster than distance)
 */
export function distanceSquared(p1: Point2D, p2: Point2D): number {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  return dx * dx + dy * dy;
}

/**
 * Find the minimum distance from a point to any point in a set
 */
export function minDistanceToSet(point: Point2D, points: Point2D[]): number {
  if (points.length === 0) return Infinity;
  
  let minDist = Infinity;
  for (const p of points) {
    const d = distanceSquared(point, p);
    if (d < minDist) minDist = d;
  }
  return Math.sqrt(minDist);
}

/**
 * Calculate the bounding box of a polygon
 */
export function calculateBoundingBox(vertices: Point2D[]): BoundingBox {
  if (vertices.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const [x, y] of vertices) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Get the width of a bounding box
 */
export function getBoundingBoxWidth(bbox: BoundingBox): number {
  return bbox.maxX - bbox.minX;
}

/**
 * Get the height of a bounding box
 */
export function getBoundingBoxHeight(bbox: BoundingBox): number {
  return bbox.maxY - bbox.minY;
}

/**
 * Generate a random point within a bounding box
 */
export function randomPointInBoundingBox(
  bbox: BoundingBox,
  random: () => number = Math.random
): Point2D {
  return [
    bbox.minX + random() * (bbox.maxX - bbox.minX),
    bbox.minY + random() * (bbox.maxY - bbox.minY),
  ];
}

/**
 * Estimate optimal pip spacing based on polygon area and target count
 * Uses packing efficiency factor for Poisson disk sampling
 */
export function estimateOptimalSpacing(area: number, targetCount: number): number {
  if (targetCount <= 0) return 0;
  // Poisson disk sampling achieves roughly 65-70% of maximum hexagonal packing
  // Hexagonal packing: area per point ≈ (sqrt(3)/2) * d^2
  // We use 0.85 factor to account for boundary effects and ensure enough points
  return Math.sqrt(area / targetCount) * 0.85;
}
