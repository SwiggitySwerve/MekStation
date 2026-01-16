/**
 * Tripod Layout Configuration
 *
 * Defines the layout for three-legged BattleMechs with:
 * - Head at top
 * - Center torso in middle with side torsos flanking
 * - Arms on the outside
 * - Three legs arranged in a triangle pattern
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
  baseWidth: 70,
  baseHeight: 55,
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
  baseWidth: 110,
  baseHeight: 115,
  shape: 'path',
  isRoot: true,
  anchors: [
    { id: 'neck', position: 'top', offset: { x: 0, y: 0 } },
    { id: 'left_shoulder', position: 'top-left', offset: { x: 20, y: 10 } },
    { id: 'right_shoulder', position: 'top-right', offset: { x: -20, y: 10 } },
    // Three leg anchors in triangular arrangement
    // Left and right legs at bottom corners
    { id: 'left_hip', position: 'bottom', edgePosition: { edge: 'bottom', at: 0.2 } },
    { id: 'right_hip', position: 'bottom', edgePosition: { edge: 'bottom', at: 0.8 } },
    // Center leg at bottom center
    { id: 'center_hip', position: 'bottom', edgePosition: { edge: 'bottom', at: 0.5 } },
    // Side anchors for side torsos
    { id: 'left_side', position: 'left', edgePosition: { edge: 'left', at: 0 } },
    { id: 'right_side', position: 'right', edgePosition: { edge: 'right', at: 0 } },
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
  baseWidth: 65,
  baseHeight: 105,
  shape: 'path',
  anchors: [
    { id: 'inner', position: 'right', edgePosition: { edge: 'right', at: 0 } },
    { id: 'arm_mount', position: 'left', edgePosition: { edge: 'left', at: 0.25 } },
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
  baseWidth: 65,
  baseHeight: 105,
  shape: 'path',
  anchors: [
    { id: 'inner', position: 'left', edgePosition: { edge: 'left', at: 0 } },
    { id: 'arm_mount', position: 'right', edgePosition: { edge: 'right', at: 0.25 } },
  ],
  pathTemplate: `
    M {x} {y}
    L {x2} {y}
    L {x2} {y2}
    L {x} {y2}
    Z
  `,
};

const LEFT_ARM: PartDefinition = {
  id: MechLocation.LEFT_ARM,
  baseWidth: 28,
  baseHeight: 150,
  shape: 'path',
  anchors: [
    { id: 'shoulder', position: 'top-right', offset: { x: 0, y: 0 } },
  ],
  pathTemplate: `
    M {x} {y}
    L {x2} {y}
    L {x2} {y2}
    L {x} {y2}
    Z
  `,
};

const RIGHT_ARM: PartDefinition = {
  id: MechLocation.RIGHT_ARM,
  baseWidth: 28,
  baseHeight: 150,
  shape: 'path',
  anchors: [
    { id: 'shoulder', position: 'top-left', offset: { x: 0, y: 0 } },
  ],
  pathTemplate: `
    M {x} {y}
    L {x2} {y}
    L {x2} {y2}
    L {x} {y2}
    Z
  `,
};

const LEFT_LEG: PartDefinition = {
  id: MechLocation.LEFT_LEG,
  baseWidth: 50,
  baseHeight: 140,
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

const RIGHT_LEG: PartDefinition = {
  id: MechLocation.RIGHT_LEG,
  baseWidth: 50,
  baseHeight: 140,
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

// Center leg uses CENTER_LEG location if available, or a custom approach
// For now, we'll use a third leg that connects to center
const CENTER_LEG: PartDefinition = {
  id: MechLocation.CENTER_LEG,
  baseWidth: 55,
  baseHeight: 150,
  shape: 'path',
  anchors: [
    { id: 'hip', position: 'top', offset: { x: 0, y: 0 } },
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

const TRIPOD_CONSTRAINTS: LayoutConstraint[] = [
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

  // Left arm connects to left torso
  {
    id: 'left-arm-to-torso',
    type: 'anchor-to-anchor',
    source: { part: MechLocation.LEFT_ARM, anchor: 'shoulder' },
    target: { part: MechLocation.LEFT_TORSO, anchor: 'arm_mount' },
    gap: 0,
    priority: 80,
  },

  // Right arm connects to right torso
  {
    id: 'right-arm-to-torso',
    type: 'anchor-to-anchor',
    source: { part: MechLocation.RIGHT_ARM, anchor: 'shoulder' },
    target: { part: MechLocation.RIGHT_TORSO, anchor: 'arm_mount' },
    gap: 0,
    priority: 80,
  },

  // Left leg connects to center torso hip
  {
    id: 'left-leg-to-hip',
    type: 'anchor-to-anchor',
    source: { part: MechLocation.LEFT_LEG, anchor: 'hip' },
    target: { part: MechLocation.CENTER_TORSO, anchor: 'left_hip' },
    gap: 5,
    priority: 70,
  },

  // Right leg connects to center torso hip
  {
    id: 'right-leg-to-hip',
    type: 'anchor-to-anchor',
    source: { part: MechLocation.RIGHT_LEG, anchor: 'hip' },
    target: { part: MechLocation.CENTER_TORSO, anchor: 'right_hip' },
    gap: 5,
    priority: 70,
  },

  // Center leg connects to center torso
  {
    id: 'center-leg-to-hip',
    type: 'anchor-to-anchor',
    source: { part: MechLocation.CENTER_LEG, anchor: 'hip' },
    target: { part: MechLocation.CENTER_TORSO, anchor: 'center_hip' },
    gap: 5,
    priority: 70,
  },
];

// ============================================================================
// Layout Configuration
// ============================================================================

/**
 * Geometric tripod layout for HUD-style diagrams
 */
export const GEOMETRIC_TRIPOD_LAYOUT: MechLayoutConfig = {
  id: 'geometric-tripod',
  name: 'Geometric Tripod',
  style: 'geometric',
  parts: [
    CENTER_TORSO,
    HEAD,
    LEFT_TORSO,
    RIGHT_TORSO,
    LEFT_ARM,
    RIGHT_ARM,
    LEFT_LEG,
    RIGHT_LEG,
    CENTER_LEG,
  ],
  constraints: TRIPOD_CONSTRAINTS,
  padding: 10,
  minGap: 5,
  visualConnectors: false,
  scale: 1,
};

/**
 * BattleMech-style tripod layout
 */
export const BATTLEMECH_TRIPOD_LAYOUT: MechLayoutConfig = {
  id: 'battlemech-tripod',
  name: 'BattleMech Tripod',
  style: 'realistic',
  parts: [
    { ...CENTER_TORSO, baseWidth: 90, baseHeight: 100 },
    { ...HEAD, baseWidth: 50, baseHeight: 40 },
    { ...LEFT_TORSO, baseWidth: 50, baseHeight: 90 },
    { ...RIGHT_TORSO, baseWidth: 50, baseHeight: 90 },
    { ...LEFT_ARM, baseWidth: 26, baseHeight: 120 },
    { ...RIGHT_ARM, baseWidth: 26, baseHeight: 120 },
    { ...LEFT_LEG, baseWidth: 40, baseHeight: 110 },
    { ...RIGHT_LEG, baseWidth: 40, baseHeight: 110 },
    { ...CENTER_LEG, baseWidth: 45, baseHeight: 120 },
  ],
  constraints: TRIPOD_CONSTRAINTS,
  padding: 10,
  minGap: 4,
  visualConnectors: false,
  scale: 1,
};

// ============================================================================
// All Tripod Layouts
// ============================================================================

export const TRIPOD_LAYOUTS: MechLayoutConfig[] = [
  GEOMETRIC_TRIPOD_LAYOUT,
  BATTLEMECH_TRIPOD_LAYOUT,
];

/**
 * Get a tripod layout by ID
 */
export function getTripodLayout(id: string): MechLayoutConfig | undefined {
  return TRIPOD_LAYOUTS.find((layout) => layout.id === id);
}
