/**
 * Quad Layout Configuration
 *
 * Defines the layout for four-legged BattleMechs with:
 * - Head at top front
 * - Center torso in middle
 * - Side torsos flanking
 * - Four legs at corners (front left/right, rear left/right)
 * - No arms (front legs replace arm functionality)
 */

import { MechLocation } from '@/types/construction';
import {
  LayoutConstraint,
  MechLayoutConfig,
  PartDefinition,
} from '../LayoutTypes';

// ============================================================================
// Part Definitions
// ============================================================================

const HEAD: PartDefinition = {
  id: MechLocation.HEAD,
  baseWidth: 60,
  baseHeight: 45,
  shape: 'path',
  anchors: [
    { id: 'neck', position: 'bottom', offset: { x: 0, y: 0 } },
  ],
  pathTemplate: `
    M {x} {y}
    L {x2} {y}
    L {x2} {y2}
    L {x} {y2}
    Z
  `,
};

const CENTER_TORSO: PartDefinition = {
  id: MechLocation.CENTER_TORSO,
  baseWidth: 100,
  baseHeight: 120,
  shape: 'path',
  isRoot: true,
  anchors: [
    { id: 'neck', position: 'top', offset: { x: 0, y: 0 } },
    // Front leg anchors at top corners
    { id: 'front_left_hip', position: 'top-left', offset: { x: 0, y: 20 } },
    { id: 'front_right_hip', position: 'top-right', offset: { x: 0, y: 20 } },
    // Rear leg anchors at bottom corners
    { id: 'rear_left_hip', position: 'bottom-left', offset: { x: 0, y: -10 } },
    { id: 'rear_right_hip', position: 'bottom-right', offset: { x: 0, y: -10 } },
    // Side anchors for side torsos
    { id: 'left_side', position: 'left', edgePosition: { edge: 'left', at: 0.3 } },
    { id: 'right_side', position: 'right', edgePosition: { edge: 'right', at: 0.3 } },
  ],
  pathTemplate: `
    M {x} {y}
    L {x2} {y}
    L {x2} {y2}
    L {x} {y2}
    Z
  `,
};

const LEFT_TORSO: PartDefinition = {
  id: MechLocation.LEFT_TORSO,
  baseWidth: 50,
  baseHeight: 100,
  shape: 'path',
  anchors: [
    { id: 'inner', position: 'right', edgePosition: { edge: 'right', at: 0.3 } },
  ],
  pathTemplate: `
    M {x} {y}
    L {x2} {y}
    L {x2} {y2}
    L {x} {y2}
    Z
  `,
};

const RIGHT_TORSO: PartDefinition = {
  id: MechLocation.RIGHT_TORSO,
  baseWidth: 50,
  baseHeight: 100,
  shape: 'path',
  anchors: [
    { id: 'inner', position: 'left', edgePosition: { edge: 'left', at: 0.3 } },
  ],
  pathTemplate: `
    M {x} {y}
    L {x2} {y}
    L {x2} {y2}
    L {x} {y2}
    Z
  `,
};

const FRONT_LEFT_LEG: PartDefinition = {
  id: MechLocation.FRONT_LEFT_LEG,
  baseWidth: 45,
  baseHeight: 100,
  shape: 'path',
  anchors: [
    { id: 'hip', position: 'top-right', offset: { x: 0, y: 0 } },
  ],
  pathTemplate: `
    M {x} {y}
    L {x2} {y}
    L {x2} {y2}
    L {x} {y2}
    Z
  `,
};

const FRONT_RIGHT_LEG: PartDefinition = {
  id: MechLocation.FRONT_RIGHT_LEG,
  baseWidth: 45,
  baseHeight: 100,
  shape: 'path',
  anchors: [
    { id: 'hip', position: 'top-left', offset: { x: 0, y: 0 } },
  ],
  pathTemplate: `
    M {x} {y}
    L {x2} {y}
    L {x2} {y2}
    L {x} {y2}
    Z
  `,
};

const REAR_LEFT_LEG: PartDefinition = {
  id: MechLocation.REAR_LEFT_LEG,
  baseWidth: 45,
  baseHeight: 100,
  shape: 'path',
  anchors: [
    { id: 'hip', position: 'top-right', offset: { x: 0, y: 0 } },
  ],
  pathTemplate: `
    M {x} {y}
    L {x2} {y}
    L {x2} {y2}
    L {x} {y2}
    Z
  `,
};

const REAR_RIGHT_LEG: PartDefinition = {
  id: MechLocation.REAR_RIGHT_LEG,
  baseWidth: 45,
  baseHeight: 100,
  shape: 'path',
  anchors: [
    { id: 'hip', position: 'top-left', offset: { x: 0, y: 0 } },
  ],
  pathTemplate: `
    M {x} {y}
    L {x2} {y}
    L {x2} {y2}
    L {x} {y2}
    Z
  `,
};

// ============================================================================
// Layout Constraints
// ============================================================================

const QUAD_CONSTRAINTS: LayoutConstraint[] = [
  // Head connects to center torso neck
  {
    id: 'head-to-neck',
    type: 'anchor-to-anchor',
    source: { part: MechLocation.HEAD, anchor: 'bottom' },
    target: { part: MechLocation.CENTER_TORSO, anchor: 'neck' },
    gap: 5,
    priority: 100,
  },

  // Left torso flanks center torso on the left
  {
    id: 'left-torso-to-center',
    type: 'anchor-to-anchor',
    source: { part: MechLocation.LEFT_TORSO, anchor: 'inner' },
    target: { part: MechLocation.CENTER_TORSO, anchor: 'left_side' },
    gap: 0,
    priority: 90,
  },

  // Right torso flanks center torso on the right
  {
    id: 'right-torso-to-center',
    type: 'anchor-to-anchor',
    source: { part: MechLocation.RIGHT_TORSO, anchor: 'inner' },
    target: { part: MechLocation.CENTER_TORSO, anchor: 'right_side' },
    gap: 0,
    priority: 90,
  },

  // Front left leg connects to center torso
  {
    id: 'front-left-leg-to-hip',
    type: 'anchor-to-anchor',
    source: { part: MechLocation.FRONT_LEFT_LEG, anchor: 'hip' },
    target: { part: MechLocation.CENTER_TORSO, anchor: 'front_left_hip' },
    gap: 5,
    priority: 80,
  },

  // Front right leg connects to center torso
  {
    id: 'front-right-leg-to-hip',
    type: 'anchor-to-anchor',
    source: { part: MechLocation.FRONT_RIGHT_LEG, anchor: 'hip' },
    target: { part: MechLocation.CENTER_TORSO, anchor: 'front_right_hip' },
    gap: 5,
    priority: 80,
  },

  // Rear left leg connects to center torso
  {
    id: 'rear-left-leg-to-hip',
    type: 'anchor-to-anchor',
    source: { part: MechLocation.REAR_LEFT_LEG, anchor: 'hip' },
    target: { part: MechLocation.CENTER_TORSO, anchor: 'rear_left_hip' },
    gap: 5,
    priority: 80,
  },

  // Rear right leg connects to center torso
  {
    id: 'rear-right-leg-to-hip',
    type: 'anchor-to-anchor',
    source: { part: MechLocation.REAR_RIGHT_LEG, anchor: 'hip' },
    target: { part: MechLocation.CENTER_TORSO, anchor: 'rear_right_hip' },
    gap: 5,
    priority: 80,
  },
];

// ============================================================================
// Layout Configuration
// ============================================================================

/**
 * Geometric quad layout for HUD-style diagrams
 */
export const GEOMETRIC_QUAD_LAYOUT: MechLayoutConfig = {
  id: 'geometric-quad',
  name: 'Geometric Quad',
  style: 'geometric',
  parts: [
    CENTER_TORSO,
    HEAD,
    LEFT_TORSO,
    RIGHT_TORSO,
    FRONT_LEFT_LEG,
    FRONT_RIGHT_LEG,
    REAR_LEFT_LEG,
    REAR_RIGHT_LEG,
  ],
  constraints: QUAD_CONSTRAINTS,
  padding: 10,
  minGap: 5,
  visualConnectors: false,
  scale: 1,
};

/**
 * BattleMech-style quad layout
 */
export const BATTLEMECH_QUAD_LAYOUT: MechLayoutConfig = {
  id: 'battlemech-quad',
  name: 'BattleMech Quad',
  style: 'realistic',
  parts: [
    { ...CENTER_TORSO, baseWidth: 80, baseHeight: 100 },
    { ...HEAD, baseWidth: 50, baseHeight: 35 },
    { ...LEFT_TORSO, baseWidth: 40, baseHeight: 80 },
    { ...RIGHT_TORSO, baseWidth: 40, baseHeight: 80 },
    { ...FRONT_LEFT_LEG, baseWidth: 40, baseHeight: 90 },
    { ...FRONT_RIGHT_LEG, baseWidth: 40, baseHeight: 90 },
    { ...REAR_LEFT_LEG, baseWidth: 40, baseHeight: 90 },
    { ...REAR_RIGHT_LEG, baseWidth: 40, baseHeight: 90 },
  ],
  constraints: QUAD_CONSTRAINTS,
  padding: 10,
  minGap: 4,
  visualConnectors: false,
  scale: 1,
};

// ============================================================================
// All Quad Layouts
// ============================================================================

export const QUAD_LAYOUTS: MechLayoutConfig[] = [
  GEOMETRIC_QUAD_LAYOUT,
  BATTLEMECH_QUAD_LAYOUT,
];

/**
 * Get a quad layout by ID
 */
export function getQuadLayout(id: string): MechLayoutConfig | undefined {
  return QUAD_LAYOUTS.find((layout) => layout.id === id);
}
