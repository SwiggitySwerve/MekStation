/**
 * Pip Distribution Service
 *
 * Provides Poisson disk sampling-based point distribution for armor/structure pips.
 * Generates uniformly distributed "blue noise" patterns within polygon boundaries.
 *
 * @example
 * ```typescript
 * import { distributePips, addPolygonPips } from '@/services/printing/pipDistribution';
 *
 * // Calculate pip positions
 * const result = distributePips(region, { targetCount: 15 });
 * console.log(result.positions); // [[x1, y1], [x2, y2], ...]
 *
 * // Or render directly to SVG
 * addPolygonPips(svgDoc, group, region, 15, { fill: '#FFFFFF' });
 * ```
 */

// Type exports
export type {
  Point2D,
  PolygonRegion,
  PipDistributionOptions,
  DistributedPips,
  BoundingBox,
  PipRenderOptions,
} from './types';

// Core algorithm
export { distributePips } from './PoissonDistributor';

// Utility exports
export {
  calculatePolygonArea,
  calculatePolygonCentroid,
  calculatePointsCentroid,
  calculateBoundingBox,
  distance,
  estimateOptimalSpacing,
} from './PolygonUtils';

// Lloyd's relaxation
export {
  applyLloydRelaxation,
  calculateUniformityMetric,
} from './LloydRelaxation';

// Count adjustment
export {
  adjustPointCount,
  filterPointsInRegion,
  isPointInRegion,
} from './CountAdjustment';

// Biped region definitions
export {
  getBipedArmorRegions,
  getBipedArmorRegion,
  CENTER_TORSO_REGION,
  LEFT_TORSO_REGION,
  RIGHT_TORSO_REGION,
  HEAD_REGION,
  LEFT_ARM_REGION,
  RIGHT_ARM_REGION,
  LEFT_LEG_REGION,
  RIGHT_LEG_REGION,
  extractPipCentersFromPath,
  estimatePipRadius,
} from './BipedRegions';

// SVG integration
import { PolygonRegion, PipRenderOptions } from './types';
import { distributePips } from './PoissonDistributor';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Add pips to an SVG group element using Poisson disk sampling
 *
 * @param svgDoc - The SVG document to create elements in
 * @param group - The group element to append pips to
 * @param region - The polygon region defining pip placement boundaries
 * @param pipCount - Target number of pips to generate
 * @param options - Rendering and distribution options
 */
export function addPolygonPips(
  svgDoc: Document,
  group: Element,
  region: PolygonRegion,
  pipCount: number,
  options: PipRenderOptions = {}
): void {
  if (pipCount <= 0) return;

  const {
    fill = '#FFFFFF',
    stroke = '#000000',
    strokeWidth = 0.5,
    className,
    ...distOptions
  } = options;

  // Calculate pip distribution
  const result = distributePips(region, {
    targetCount: pipCount,
    ...distOptions,
  });

  // Render pips as circles
  for (const [x, y] of result.positions) {
    const pip = svgDoc.createElementNS(SVG_NS, 'circle');
    pip.setAttribute('cx', String(x));
    pip.setAttribute('cy', String(y));
    pip.setAttribute('r', String(result.pipRadius));
    pip.setAttribute('fill', fill);
    pip.setAttribute('stroke', stroke);
    pip.setAttribute('stroke-width', String(strokeWidth));

    if (className) {
      pip.setAttribute('class', className);
    }

    group.appendChild(pip);
  }
}

/**
 * Create a simple rectangular polygon region
 * Convenience function for rectangle-to-polygon conversion
 */
export function createRectangleRegion(
  id: string,
  x: number,
  y: number,
  width: number,
  height: number
): PolygonRegion {
  return {
    id,
    vertices: [
      [x, y],
      [x + width, y],
      [x + width, y + height],
      [x, y + height],
      [x, y], // Close the ring
    ],
  };
}
