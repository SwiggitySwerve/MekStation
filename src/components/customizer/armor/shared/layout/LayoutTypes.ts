/**
 * Layout Engine Type Definitions
 *
 * Core types for the constraint-based armor diagram layout system.
 * Enables automatic positioning of mech parts based on anchor points
 * and connection rules.
 */

import { MechLocation } from '@/types/construction';

// ============================================================================
// Edge and Anchor Point Types
// ============================================================================

/**
 * Named edges of a part's bounding box
 */
export type EdgeName = 'top' | 'bottom' | 'left' | 'right';

/**
 * Position along an edge, expressed as a percentage (0-1)
 * 0 = start of edge (left for top/bottom, top for left/right)
 * 1 = end of edge (right for top/bottom, bottom for left/right)
 */
export interface EdgePosition {
  edge: EdgeName;
  /** Position along the edge (0-1, where 0.5 = center) */
  at: number;
}

/**
 * Definition of an edge with optional connection restrictions
 */
export interface EdgeDefinition {
  /** Which edge this defines */
  edge: EdgeName;
  /** Whether connections are allowed on this edge */
  allowConnections?: boolean;
  /** Valid connection zones as ranges [start, end] from 0-1 */
  connectionZones?: Array<[number, number]>;
  /** Visual offset from the bounding box edge (for non-rectangular shapes) */
  offset?: number;
}

/**
 * Predefined anchor positions relative to a part's bounding box
 */
export type AnchorPosition =
  | 'top'
  | 'top-left'
  | 'top-right'
  | 'bottom'
  | 'bottom-left'
  | 'bottom-right'
  | 'left'
  | 'right'
  | 'center'
  | 'custom';

/**
 * A named connection point on a part
 */
export interface AnchorPoint {
  /** Unique identifier for this anchor (e.g., 'shoulder', 'hip', 'neck') */
  id: string;
  /** Relative position on the part's bounding box (simple positioning) */
  position: AnchorPosition;
  /** Edge-relative positioning (more precise than position) */
  edgePosition?: EdgePosition;
  /** Fine-tuning offset from the calculated position */
  offset?: { x: number; y: number };
  /** Direction the anchor faces outward (for orientation) */
  facing?: 'up' | 'down' | 'left' | 'right' | 'inward' | 'outward';
}

/**
 * Resolved anchor coordinates after layout calculation
 */
export interface ResolvedAnchor {
  x: number;
  y: number;
  /** The facing direction after orientation is applied */
  facing?: 'up' | 'down' | 'left' | 'right';
}

// ============================================================================
// Part Definition Types
// ============================================================================

/**
 * Shape type for rendering the part
 */
export type PartShape = 'rect' | 'polygon' | 'path';

/**
 * Orientation/transformation for a part
 */
export interface PartOrientation {
  /** Rotation in degrees (0, 90, 180, 270) */
  rotation?: 0 | 90 | 180 | 270;
  /** Flip horizontally */
  flipX?: boolean;
  /** Flip vertically */
  flipY?: boolean;
}

/**
 * Resolved edge coordinates after layout calculation
 */
export interface ResolvedEdge {
  /** Start point of edge */
  start: { x: number; y: number };
  /** End point of edge */
  end: { x: number; y: number };
  /** Get a point at a specific position along the edge (0-1) */
}

/**
 * Definition of a single mech part/location
 */
export interface PartDefinition {
  /** The mech location this part represents */
  id: MechLocation;
  /** Base width of the part (before scaling) */
  baseWidth: number;
  /** Base height of the part (before scaling) */
  baseHeight: number;
  /** Named anchor points for connections */
  anchors: AnchorPoint[];
  /** Edge definitions with connection rules */
  edges?: EdgeDefinition[];
  /** Shape type for rendering */
  shape: PartShape;
  /**
   * SVG path template with placeholders:
   * - {x} = resolved x position
   * - {y} = resolved y position
   * - {w} = resolved width
   * - {h} = resolved height
   * - {cx} = center x
   * - {cy} = center y
   * - {x2} = x + width
   * - {y2} = y + height
   */
  pathTemplate?: string;
  /** Default orientation for this part */
  orientation?: PartOrientation;
  /** Whether this part is the root/anchor for layout resolution */
  isRoot?: boolean;
  /** Whether this part can be mirrored for left/right variants */
  mirrorable?: boolean;
}

// ============================================================================
// Constraint Types
// ============================================================================

/**
 * Types of layout constraints
 */
export type ConstraintType =
  | 'anchor-to-anchor' // Connect specific anchors between parts
  | 'align-horizontal' // Align part centers horizontally
  | 'align-vertical' // Align part centers vertically
  | 'gap' // Maintain gap between part edges
  | 'contain' // One part contains another
  | 'stack-vertical' // Stack parts vertically
  | 'stack-horizontal'; // Stack parts horizontally

/**
 * Reference to a part and optionally a specific anchor
 */
export interface PartReference {
  part: MechLocation;
  anchor?: string;
  /** Edge-relative position (alternative to named anchor) */
  edgePosition?: EdgePosition;
}

/**
 * Defines how two connection points relate to each other
 */
export interface ConnectionAlignment {
  /** 
   * How the source anchor aligns to target anchor:
   * - 'match': source point moves to target point (default)
   * - 'adjacent': source edge touches target edge with gap between anchors
   * - 'offset': anchors are offset by specified amount
   */
  mode: 'match' | 'adjacent' | 'offset';
  /** 
   * For 'offset' mode: x,y offset from target anchor to source anchor
   * Positive x = source is to the right of target
   * Positive y = source is below target
   */
  offset?: { x: number; y: number };
  /**
   * For 'adjacent' mode: which edges are adjacent
   * e.g., source's 'left' edge is adjacent to target's 'right' edge
   */
  sourceEdge?: EdgeName;
  targetEdge?: EdgeName;
}

/**
 * A layout constraint defining relationships between parts
 */
export interface LayoutConstraint {
  /** Type of constraint */
  type: ConstraintType;
  /** Source part (the one being positioned) */
  source: PartReference;
  /** Target part (the reference point) */
  target: PartReference;
  /** Gap/spacing between anchors or edges (in pixels) */
  gap?: number;
  /** How the connection points align (default: 'match' mode) */
  alignment?: ConnectionAlignment;
  /** Priority for conflict resolution (higher = more important) */
  priority?: number;
  /** Optional constraint ID for debugging */
  id?: string;
}

/**
 * Edge-to-edge constraint for more precise positioning
 */
export interface EdgeConstraint {
  /** Source part */
  source: MechLocation;
  /** Which edge of source */
  sourceEdge: EdgeName;
  /** Position along source edge (0-1) */
  sourceAt: number;
  /** Target part */
  target: MechLocation;
  /** Which edge of target */
  targetEdge: EdgeName;
  /** Position along target edge (0-1) */
  targetAt: number;
  /** Gap between edges (can be negative for overlap) */
  gap?: number;
}

// ============================================================================
// Layout Configuration Types
// ============================================================================

/**
 * Style preset for the layout (affects visual rendering)
 */
export type LayoutStyle = 'geometric' | 'realistic' | 'schematic' | 'megamek';

/**
 * Complete layout configuration for a mech type
 */
export interface MechLayoutConfig {
  /** Unique identifier (e.g., 'biped-geometric', 'quad-realistic') */
  id: string;
  /** Human-readable name */
  name: string;
  /** Visual style preset */
  style: LayoutStyle;
  /** Part definitions for this layout */
  parts: PartDefinition[];
  /** Connection constraints */
  constraints: LayoutConstraint[];
  /** Padding around the entire layout for viewBox */
  padding: number;
  /** Minimum gap between non-connected parts */
  minGap: number;
  /** Whether to render visual connectors between anchors */
  visualConnectors?: boolean;
  /** Default scale factor */
  scale?: number;
}

// ============================================================================
// Resolved Layout Types
// ============================================================================

/**
 * Resolved position for a single part after layout calculation
 */
export interface ResolvedPosition {
  /** Absolute X position */
  x: number;
  /** Absolute Y position */
  y: number;
  /** Resolved width */
  width: number;
  /** Resolved height */
  height: number;
  /** Resolved SVG path (with placeholders filled in) */
  path: string;
  /** Resolved anchor coordinates */
  anchors: Record<string, ResolvedAnchor>;
  /** Resolved edge coordinates */
  edges: Record<EdgeName, ResolvedEdge>;
  /** Center point */
  center: { x: number; y: number };
  /** Applied orientation */
  orientation?: PartOrientation;
}

/**
 * Get a point at a specific position along an edge
 */
export function getPointOnEdge(edge: ResolvedEdge, at: number): { x: number; y: number } {
  return {
    x: edge.start.x + (edge.end.x - edge.start.x) * at,
    y: edge.start.y + (edge.end.y - edge.start.y) * at,
  };
}

/**
 * Visual connector path between two anchors
 */
export interface ConnectorPath {
  /** Source anchor reference */
  from: PartReference;
  /** Target anchor reference */
  to: PartReference;
  /** SVG path string connecting the anchors */
  path: string;
  /** Connector style */
  style?: 'line' | 'bracket' | 'joint' | 'dashed';
}

/**
 * Complete resolved layout after constraint resolution
 */
export interface ResolvedLayout {
  /** The config ID this was resolved from */
  configId: string;
  /** Computed SVG viewBox string */
  viewBox: string;
  /** Resolved positions for all parts */
  positions: Partial<Record<MechLocation, ResolvedPosition>>;
  /** Visual connector paths (if enabled) */
  connectors: ConnectorPath[];
  /** Layout bounds */
  bounds: {
    width: number;
    height: number;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  /** Scale factor applied */
  scale: number;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Types of validation errors
 */
export type ValidationErrorType =
  | 'overlap'
  | 'gap_violation'
  | 'out_of_bounds'
  | 'missing_anchor'
  | 'missing_part'
  | 'circular_dependency'
  | 'unresolved_constraint';

/**
 * Types of validation warnings
 */
export type ValidationWarningType =
  | 'tight_gap'
  | 'asymmetric_layout'
  | 'unused_anchor'
  | 'large_gap';

/**
 * A validation error
 */
export interface ValidationError {
  type: ValidationErrorType;
  parts: MechLocation[];
  message: string;
  constraint?: LayoutConstraint;
}

/**
 * A validation warning
 */
export interface ValidationWarning {
  type: ValidationWarningType;
  parts: MechLocation[];
  message: string;
}

/**
 * Complete validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Bounding box for overlap detection
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Options for layout resolution
 */
export interface LayoutResolveOptions {
  /** Scale factor (default: 1) */
  scale?: number;
  /** Override padding */
  padding?: number;
  /** Enable validation during resolution */
  validate?: boolean;
  /** Enable debug logging */
  debug?: boolean;
}
