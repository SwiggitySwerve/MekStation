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
  CENTER_TORSO_REAR_REGION,
  LEFT_TORSO_REGION,
  LEFT_TORSO_REAR_REGION,
  RIGHT_TORSO_REGION,
  RIGHT_TORSO_REAR_REGION,
  HEAD_REGION,
  LEFT_ARM_REGION,
  RIGHT_ARM_REGION,
  LEFT_LEG_REGION,
  RIGHT_LEG_REGION,
  extractPipCentersFromPath,
  estimatePipRadius,
} from './BipedRegions';

// SVG integration
import { Point2D, PolygonRegion, PipRenderOptions } from './types';
import { distributePips } from './PoissonDistributor';

// Note: Turf.js imports available but not used for rect-constrained distribution
// import pointGrid from '@turf/point-grid';
// import hexGrid from '@turf/hex-grid';
// import { polygon as turfPolygon } from '@turf/helpers';
// import bbox from '@turf/bbox';
// import centroid from '@turf/centroid';

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

/** Default pip size as fraction of cell/rect height (same as ArmorPipLayout) */
const DEFAULT_PIP_SIZE = 0.4;

/** Minimum pip radius to ensure visibility */
const MIN_PIP_RADIUS = 1.5;

/** Maximum pip radius to prevent oversized pips */
const MAX_PIP_RADIUS = 3.0;

interface RectData {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RowDistributionResult {
  rects: RectData[];
  avgHeight: number;
  totalArea: number;
}

/**
 * Extract rect row data from a group element for grid-based pip distribution.
 */
function extractRowsFromGroup(group: Element): RowDistributionResult | null {
  const rects: RectData[] = [];

  const children = group.children;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.tagName === 'rect') {
      const x = parseFloat(child.getAttribute('x') || '0');
      const y = parseFloat(child.getAttribute('y') || '0');
      const width = parseFloat(child.getAttribute('width') || '0');
      const height = parseFloat(child.getAttribute('height') || '0');

      if (width > 0 && height > 0) {
        rects.push({ x, y, width, height });
      }
    }
  }

  if (rects.length === 0) {
    return null;
  }

  // Sort by Y position (top to bottom)
  rects.sort((a, b) => a.y - b.y);

  const avgHeight = rects.reduce((sum, r) => sum + r.height, 0) / rects.length;
  const totalArea = rects.reduce((sum, r) => sum + r.width * r.height, 0);

  return { rects, avgHeight, totalArea };
}

/**
 * Calculate optimal pip spacing based on count and available area.
 */
function calculateOptimalSpacing(
  rects: RectData[],
  pipCount: number,
  avgHeight: number
): number {
  const totalArea = rects.reduce((sum, r) => sum + r.width * r.height, 0);
  const areaPerPip = totalArea / pipCount;
  const spacingFromArea = Math.sqrt(areaPerPip);

  // Constrain spacing to reasonable bounds relative to row height
  const maxSpacing = avgHeight * 1.5;
  const minSpacing = avgHeight * 0.5;

  return Math.max(minSpacing, Math.min(maxSpacing, spacingFromArea));
}

/**
 * Distribute pips in a single centered column (for limbs).
 * One pip per row, centered horizontally.
 */
function distributeCenterColumn(
  rects: RectData[],
  pipCount: number
): Point2D[] {
  const positions: Point2D[] = [];

  // Simple: one pip per row until we run out
  // Distribute evenly from top to bottom
  const pipsToPlace = Math.min(pipCount, rects.length);
  const step = rects.length > pipsToPlace ? rects.length / pipsToPlace : 1;

  for (let i = 0; i < pipsToPlace; i++) {
    const rectIndex = Math.min(Math.floor(i * step), rects.length - 1);
    const rect = rects[rectIndex];
    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;
    positions.push([centerX, centerY]);
  }

  // If we need more pips than rows, start filling in gaps
  if (pipCount > rects.length) {
    const extraPips = pipCount - rects.length;
    // Add extra pips between existing ones, still centered
    for (let i = 0; i < extraPips && i < rects.length - 1; i++) {
      const rect1 = rects[i];
      const rect2 = rects[i + 1];
      const centerX = (rect1.x + rect1.width / 2 + rect2.x + rect2.width / 2) / 2;
      const centerY = (rect1.y + rect1.height / 2 + rect2.y + rect2.height / 2) / 2;
      positions.push([centerX, centerY]);
    }
  }

  return positions;
}

/**
 * Distribute pips strictly within rect bounds using row-based placement.
 * Each pip is guaranteed to stay inside its row's rect - no polygon derivation.
 * Supports staggered pattern for denser layouts.
 */
function distributeWithinRects(
  rects: RectData[],
  pipCount: number,
  avgHeight: number,
  singleColumn: boolean = false
): Point2D[] {
  // For limbs, use single centered column
  if (singleColumn) {
    return distributeCenterColumn(rects, pipCount);
  }

  const positions: Point2D[] = [];

  // Calculate optimal spacing
  const spacing = calculateOptimalSpacing(rects, pipCount, avgHeight);

  // Use staggered pattern for denser layouts
  const useStaggered = pipCount > rects.length * 2;

  // Calculate how many pips can fit in each row
  const rowCapacities: number[] = [];
  let totalCapacity = 0;

  for (const rect of rects) {
    // Inset from edges to keep pips inside bounds
    const usableWidth = rect.width - spacing * 0.5;
    const capacity = Math.max(1, Math.floor(usableWidth / spacing));
    rowCapacities.push(capacity);
    totalCapacity += capacity;
  }

  // Allocate pips proportionally by capacity
  const rowPipCounts: number[] = [];
  let allocated = 0;

  for (let i = 0; i < rects.length; i++) {
    const proportion = rowCapacities[i] / totalCapacity;
    const count = Math.round(pipCount * proportion);
    const finalCount = Math.min(count, rowCapacities[i]);
    rowPipCounts.push(finalCount);
    allocated += finalCount;
  }

  // Adjust for rounding errors
  let diff = pipCount - allocated;
  let attempts = 0;
  while (diff !== 0 && attempts < pipCount * 2) {
    for (let i = 0; i < rects.length && diff !== 0; i++) {
      if (diff > 0 && rowPipCounts[i] < rowCapacities[i]) {
        rowPipCounts[i]++;
        diff--;
      } else if (diff < 0 && rowPipCounts[i] > 0) {
        rowPipCounts[i]--;
        diff++;
      }
    }
    attempts++;
  }

  // Place pips in each row, strictly within rect bounds
  for (let i = 0; i < rects.length; i++) {
    const rect = rects[i];
    const count = rowPipCounts[i];

    if (count <= 0) continue;

    // Calculate inset from edges (pip radius + small margin)
    const margin = spacing * 0.3;
    const leftBound = rect.x + margin;
    const rightBound = rect.x + rect.width - margin;
    const usableWidth = rightBound - leftBound;

    // Calculate spacing within this row
    const rowSpacing = count > 1 ? usableWidth / (count - 1) : 0;

    // Center vertically in the row
    const centerY = rect.y + rect.height / 2;

    // Stagger offset for alternate rows (creates crosshatch pattern)
    const staggerOffset =
      useStaggered && i % 2 === 1 && count > 1 ? rowSpacing / 2 : 0;

    // Place pips
    for (let j = 0; j < count; j++) {
      let x: number;
      if (count === 1) {
        // Single pip - center it
        x = rect.x + rect.width / 2;
      } else {
        x = leftBound + rowSpacing * j + staggerOffset;
      }

      // Clamp to stay strictly within rect bounds
      x = Math.max(leftBound, Math.min(rightBound, x));

      positions.push([x, centerY]);
    }
  }

  return positions;
}

/** Debug flag to render rect outlines for geometry visualization */
const DEBUG_SHOW_RECT_OUTLINES = false;

/** Side torso regions that should keep variable widths */
const SIDE_TORSO_REGIONS = ['LT', 'RT', 'LTR', 'RTR'];

/** Arm and leg regions that should use single center column */
const LIMB_REGIONS = ['LA', 'RA', 'LL', 'RL'];

/**
 * Normalize rects to use uniform width (minimum width), centered on
 * the overall region center line (not each rect's individual center).
 * This creates a consistent centered column for pip placement.
 */
function normalizeRectWidths(rects: RectData[]): RectData[] {
  if (rects.length === 0) return rects;

  // Use minimum width to ensure all pips stay in bounds
  const minWidth = Math.min(...rects.map((r) => r.width));

  // Find the overall center X of the entire region
  // Use the average of all rect centers for a stable center line
  const overallCenterX =
    rects.reduce((sum, r) => sum + r.x + r.width / 2, 0) / rects.length;

  return rects.map((rect) => {
    // Center all rects on the same vertical center line
    const newX = overallCenterX - minWidth / 2;

    return {
      x: newX,
      y: rect.y,
      width: minWidth,
      height: rect.height,
    };
  });
}

/**
 * Add pips to an SVG group using rect-constrained distribution that follows
 * the contour defined by rect child elements.
 *
 * The rect elements in MegaMekLab templates encode silhouette shape through
 * varying widths. This function distributes pips row-by-row within each rect's
 * bounds to ensure pips stay inside the silhouette.
 *
 * @param svgDoc - The SVG document to create elements in
 * @param group - The group element containing rect bounds and to append pips to
 * @param pipCount - Target number of pips to generate
 * @param options - Rendering options
 * @param regionName - Optional region abbreviation (e.g., 'CT', 'LT') to customize behavior
 * @returns true if pips were generated, false if no valid rows found
 */
export function addPoissonPipsToGroup(
  svgDoc: Document,
  group: Element,
  pipCount: number,
  options: PipRenderOptions = {},
  regionName?: string
): boolean {
  if (pipCount <= 0) return false;

  // Extract row data from rect elements
  const rowData = extractRowsFromGroup(group);
  if (!rowData) {
    return false;
  }

  const {
    fill = '#FFFFFF',
    stroke = '#000000',
    strokeWidth = 0.5,
    className,
  } = options;

  // Determine region type for distribution strategy
  const isSideTorso = regionName && SIDE_TORSO_REGIONS.includes(regionName);
  const isLimb = regionName && LIMB_REGIONS.includes(regionName);

  // For limbs and non-side-torsos, normalize widths
  const rectsToUse =
    isSideTorso ? rowData.rects : normalizeRectWidths(rowData.rects);

  // DEBUG: Render red outlines showing the rect boundaries being used
  if (DEBUG_SHOW_RECT_OUTLINES) {
    for (const rect of rectsToUse) {
      const outline = svgDoc.createElementNS(SVG_NS, 'rect');
      outline.setAttribute('x', String(rect.x));
      outline.setAttribute('y', String(rect.y));
      outline.setAttribute('width', String(rect.width));
      outline.setAttribute('height', String(rect.height));
      outline.setAttribute('fill', 'none');
      outline.setAttribute('stroke', '#FF0000');
      outline.setAttribute('stroke-width', '0.5');
      outline.setAttribute('stroke-opacity', '0.7');
      group.appendChild(outline);
    }
  }

  // Calculate pip radius from average rect height (like ArmorPipLayout)
  const pipRadius = Math.max(
    MIN_PIP_RADIUS,
    Math.min(MAX_PIP_RADIUS, rowData.avgHeight * DEFAULT_PIP_SIZE)
  );

  // Distribute pips strictly within rect bounds (no polygon derivation)
  // Limbs use single center column, others use full width distribution
  const positions = distributeWithinRects(
    rectsToUse,
    pipCount,
    rowData.avgHeight,
    !!isLimb // single column for arms/legs
  );

  // Render pips as circles
  for (const [x, y] of positions) {
    const pip = svgDoc.createElementNS(SVG_NS, 'circle');
    pip.setAttribute('cx', String(x));
    pip.setAttribute('cy', String(y));
    pip.setAttribute('r', String(pipRadius));
    pip.setAttribute('fill', fill);
    pip.setAttribute('stroke', stroke);
    pip.setAttribute('stroke-width', String(strokeWidth));

    if (className) {
      pip.setAttribute('class', className);
    }

    group.appendChild(pip);
  }

  return true;
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
