/**
 * Poisson Disk Sampling Distributor
 *
 * Core algorithm for generating uniformly distributed points within polygon regions
 * using Poisson disk sampling with count adjustment and optional Lloyd's relaxation.
 */

import PoissonDiskSampling from 'poisson-disk-sampling';
import bbox from '@turf/bbox';
import { polygon as turfPolygon } from '@turf/helpers';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';

import {
  Point2D,
  PolygonRegion,
  PipDistributionOptions,
  DistributedPips,
  BoundingBox,
} from './types';
import {
  calculatePolygonArea,
  estimateOptimalSpacing,
  calculateBoundingBox,
} from './PolygonUtils';
import { adjustPointCount, filterPointsInRegion } from './CountAdjustment';
import { applyLloydRelaxation } from './LloydRelaxation';

/** Default number of Lloyd's relaxation iterations */
const DEFAULT_RELAXATION_ITERATIONS = 10;

/** Default maximum attempts to achieve exact count */
const DEFAULT_MAX_ATTEMPTS = 5;

/** Default pip radius as fraction of spacing */
const PIP_RADIUS_FACTOR = 0.4;

/**
 * Create a seeded random number generator
 */
function createSeededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    // Simple LCG (Linear Congruential Generator)
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

/**
 * Distribute pips within a polygon region using Poisson disk sampling
 *
 * @param region - The polygon region to fill with pips
 * @param options - Distribution options including target count
 * @returns Distributed pip positions and metadata
 */
export function distributePips(
  region: PolygonRegion,
  options: PipDistributionOptions
): DistributedPips {
  const {
    targetCount,
    minDistance,
    maxDistance,
    relaxationIterations = DEFAULT_RELAXATION_ITERATIONS,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    seed,
  } = options;

  // Handle edge cases
  if (targetCount <= 0) {
    return createEmptyResult(region);
  }

  // Setup random function
  const random = seed !== undefined ? createSeededRandom(seed) : Math.random;

  // Calculate polygon bounds and area
  const bounds = calculateBoundingBox(region.vertices);
  const polygonArea = calculatePolygonArea(region.vertices);

  // Handle very small polygons
  if (polygonArea < 1) {
    return createSinglePointResult(region, bounds);
  }

  // Estimate initial spacing
  const estimatedSpacing = estimateOptimalSpacing(polygonArea, targetCount);
  let currentSpacing = minDistance ?? estimatedSpacing;

  let bestResult: DistributedPips | null = null;

  // Try multiple attempts with different spacing
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = attemptDistribution(
      region,
      bounds,
      targetCount,
      currentSpacing,
      maxDistance ?? currentSpacing * 1.5,
      relaxationIterations,
      random
    );

    if (result.exactMatch) {
      return result;
    }

    // Track best result
    if (
      !bestResult ||
      Math.abs(result.count - targetCount) < Math.abs(bestResult.count - targetCount)
    ) {
      bestResult = result;
    }

    // Adjust spacing for next attempt
    if (result.count < targetCount) {
      currentSpacing *= 0.85; // Too few points, pack tighter
    } else {
      currentSpacing *= 1.15; // Too many points, spread out
    }
  }

  // Return best result even if not exact
  return bestResult ?? createEmptyResult(region);
}

/**
 * Single attempt at distribution with given spacing
 */
function attemptDistribution(
  region: PolygonRegion,
  bounds: BoundingBox,
  targetCount: number,
  minSpacing: number,
  maxSpacing: number,
  relaxationIterations: number,
  random: () => number
): DistributedPips {
  // Create Turf polygon for containment tests
  const poly = turfPolygon([region.vertices, ...(region.holes ?? [])]);
  const turfBounds = bbox(poly);
  const width = turfBounds[2] - turfBounds[0];
  const height = turfBounds[3] - turfBounds[1];

  // Handle very narrow or small regions
  if (width < minSpacing * 2 || height < minSpacing * 2) {
    return createNarrowRegionResult(region, bounds, targetCount, random);
  }

  // Generate Poisson samples in bounding box
  const pds = new PoissonDiskSampling({
    shape: [width, height],
    minDistance: minSpacing,
    maxDistance: maxSpacing,
    tries: 30,
  });

  // Fill and offset to polygon coordinates
  const rawPoints = pds.fill();
  const offsetPoints: Point2D[] = rawPoints.map(
    ([x, y]) => [x + turfBounds[0], y + turfBounds[1]] as Point2D
  );

  // Filter to polygon boundary
  const filteredPoints = offsetPoints.filter((point) =>
    booleanPointInPolygon(point, poly)
  );

  // Adjust count to match target
  const adjustedPoints = adjustPointCount(
    filteredPoints,
    targetCount,
    region,
    bounds,
    random
  );

  // Apply Lloyd's relaxation for better uniformity
  const relaxedPoints =
    relaxationIterations > 0
      ? applyLloydRelaxation(adjustedPoints, region, bounds, relaxationIterations)
      : adjustedPoints;

  return {
    positions: relaxedPoints,
    count: relaxedPoints.length,
    exactMatch: relaxedPoints.length === targetCount,
    pipRadius: minSpacing * PIP_RADIUS_FACTOR,
    bounds,
  };
}

/**
 * Handle narrow regions that are too small for Poisson sampling
 */
function createNarrowRegionResult(
  region: PolygonRegion,
  bounds: BoundingBox,
  targetCount: number,
  random: () => number
): DistributedPips {
  // For narrow regions, place points in a line
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const isHorizontal = width > height;

  const points: Point2D[] = [];
  const spacing = (isHorizontal ? width : height) / (targetCount + 1);
  const pipRadius = Math.min(spacing * 0.4, (isHorizontal ? height : width) * 0.4);

  for (let i = 1; i <= targetCount; i++) {
    let point: Point2D;
    if (isHorizontal) {
      point = [bounds.minX + i * spacing, (bounds.minY + bounds.maxY) / 2];
    } else {
      point = [(bounds.minX + bounds.maxX) / 2, bounds.minY + i * spacing];
    }

    // Verify point is inside polygon
    if (filterPointsInRegion([point], region).length > 0) {
      points.push(point);
    }
  }

  // Fill remaining with random points if needed
  let attempts = 100;
  while (points.length < targetCount && attempts > 0) {
    const candidate: Point2D = [
      bounds.minX + random() * width,
      bounds.minY + random() * height,
    ];
    if (filterPointsInRegion([candidate], region).length > 0) {
      points.push(candidate);
    }
    attempts--;
  }

  return {
    positions: points,
    count: points.length,
    exactMatch: points.length === targetCount,
    pipRadius: pipRadius > 0 ? pipRadius : 2,
    bounds,
  };
}

/**
 * Create an empty result for zero-count requests
 */
function createEmptyResult(region: PolygonRegion): DistributedPips {
  const bounds = calculateBoundingBox(region.vertices);
  return {
    positions: [],
    count: 0,
    exactMatch: true,
    pipRadius: 0,
    bounds,
  };
}

/**
 * Create a single-point result for very small polygons
 */
function createSinglePointResult(
  region: PolygonRegion,
  bounds: BoundingBox
): DistributedPips {
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const center: Point2D = [centerX, centerY];

  // Verify center is inside polygon
  const validPoints = filterPointsInRegion([center], region);

  return {
    positions: validPoints,
    count: validPoints.length,
    exactMatch: validPoints.length === 1,
    pipRadius: Math.min(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) * 0.3,
    bounds,
  };
}
