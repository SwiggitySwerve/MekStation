/**
 * Pip Distribution Types
 *
 * Type definitions for the Poisson disk sampling-based pip distribution system.
 * Used for generating uniformly distributed armor/structure pips within polygon regions.
 */

/**
 * A 2D point represented as [x, y] tuple
 */
export type Point2D = [number, number];

/**
 * Defines a polygon region for pip distribution
 */
export interface PolygonRegion {
  /** Unique identifier for the region (e.g., 'CENTER_TORSO', 'LEFT_ARM') */
  id: string;
  /** Polygon vertices as [x, y] coordinate pairs (closed ring - first and last should match) */
  vertices: Point2D[];
  /** Optional cut-out regions (holes in the polygon) */
  holes?: Point2D[][];
}

/**
 * Options for pip distribution algorithm
 */
export interface PipDistributionOptions {
  /** Target number of pips (exact count required) */
  targetCount: number;
  /** Minimum distance between pip centers (auto-calculated if not provided) */
  minDistance?: number;
  /** Maximum distance between pip centers (for variable density) */
  maxDistance?: number;
  /** Pip radius for rendering (auto-calculated if not provided) */
  pipRadius?: number;
  /** Optional density function for variable spacing (returns 0-1 value) */
  densityFunction?: (point: Point2D) => number;
  /** Number of Lloyd's relaxation iterations (0 = disabled, default: 10) */
  relaxationIterations?: number;
  /** Maximum attempts to achieve exact count (default: 5) */
  maxAttempts?: number;
  /** Random seed for deterministic results (optional) */
  seed?: number;
}

/**
 * Result of pip distribution calculation
 */
export interface DistributedPips {
  /** Final pip positions as [x, y] coordinates */
  positions: Point2D[];
  /** Actual count achieved */
  count: number;
  /** Whether exact target was achieved */
  exactMatch: boolean;
  /** Computed optimal pip radius */
  pipRadius: number;
  /** Bounding box of the region */
  bounds: BoundingBox;
}

/**
 * Axis-aligned bounding box
 */
export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Options for SVG pip rendering
 */
export interface PipRenderOptions extends Partial<PipDistributionOptions> {
  /** Fill color for pips (default: '#FFFFFF') */
  fill?: string;
  /** Stroke color for pips (default: '#000000') */
  stroke?: string;
  /** Stroke width for pip outlines (default: 0.5) */
  strokeWidth?: number;
  /** CSS class to apply to pips */
  className?: string;
}

/**
 * Internal state for Poisson disk sampling
 */
export interface PoissonSamplingState {
  /** Current spacing being tested */
  currentSpacing: number;
  /** Best result found so far */
  bestResult: DistributedPips | null;
  /** Number of attempts made */
  attemptCount: number;
}
