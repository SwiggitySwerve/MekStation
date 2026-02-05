/**
 * QuadVee Layout Configuration
 *
 * Defines the layout for QuadVee BattleMechs which can transform between:
 * - Mech mode (quad/four-legged configuration)
 * - Vehicle mode (tracked/wheeled ground vehicle)
 *
 * This layout represents the Mech mode configuration, which is similar
 * to standard Quad layout but may have slightly different proportions
 * to accommodate transformation equipment.
 *
 * QuadVees use the same locations as Quad mechs:
 * - HEAD, CENTER_TORSO, LEFT_TORSO, RIGHT_TORSO
 * - FRONT_LEFT_LEG, FRONT_RIGHT_LEG, REAR_LEFT_LEG, REAR_RIGHT_LEG
 */

import { MechLocation } from '@/types/construction';

import {
  LayoutConstraint,
  MechLayoutConfig,
  PartDefinition,
} from '../LayoutTypes';

// ============================================================================
// Part Definitions (QuadVee Mech Mode)
// ============================================================================

const HEAD: PartDefinition = {
  id: MechLocation.HEAD,
  baseWidth: 55,
  baseHeight: 40,
  shape: 'path',
  anchors: [{ id: 'neck', position: 'bottom', offset: { x: 0, y: 0 } }],
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
  baseHeight: 130,
  shape: 'path',
  isRoot: true,
  anchors: [
    { id: 'neck', position: 'top', offset: { x: 0, y: 0 } },
    // Side anchors for side torsos - aligned at top
    {
      id: 'left_side',
      position: 'left',
      edgePosition: { edge: 'left', at: 0 },
    },
    {
      id: 'right_side',
      position: 'right',
      edgePosition: { edge: 'right', at: 0 },
    },
    // Front leg hip anchors - at bottom of center torso (like biped legs)
    {
      id: 'front_left_hip',
      position: 'bottom',
      edgePosition: { edge: 'bottom', at: 0.2 },
    },
    {
      id: 'front_right_hip',
      position: 'bottom',
      edgePosition: { edge: 'bottom', at: 0.8 },
    },
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
  baseWidth: 55,
  baseHeight: 120,
  shape: 'path',
  anchors: [
    { id: 'inner', position: 'right', edgePosition: { edge: 'right', at: 0 } },
    // Rear leg mount at 75% down (25% up from bottom) - like arm mount but lower
    {
      id: 'rear_leg_mount',
      position: 'left',
      edgePosition: { edge: 'left', at: 0.75 },
    },
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
  baseWidth: 55,
  baseHeight: 120,
  shape: 'path',
  anchors: [
    { id: 'inner', position: 'left', edgePosition: { edge: 'left', at: 0 } },
    // Rear leg mount at 75% down (25% up from bottom) - like arm mount but lower
    {
      id: 'rear_leg_mount',
      position: 'right',
      edgePosition: { edge: 'right', at: 0.75 },
    },
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
  baseWidth: 50,
  baseHeight: 110,
  shape: 'path',
  anchors: [{ id: 'hip', position: 'top-right', offset: { x: 0, y: 0 } }],
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
  baseWidth: 50,
  baseHeight: 110,
  shape: 'path',
  anchors: [{ id: 'hip', position: 'top-left', offset: { x: 0, y: 0 } }],
  pathTemplate: `
    M {x} {y}
    L {x2} {y}
    L {x2} {y2}
    L {x} {y2}
    Z
  `,
};

// Rear legs - positioned on outer edge of side torsos at lower portion
const REAR_LEFT_LEG: PartDefinition = {
  id: MechLocation.REAR_LEFT_LEG,
  baseWidth: 50,
  baseHeight: 100,
  shape: 'path',
  anchors: [
    // Hip on inner edge (top-right) so leg extends outward to the left
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
  baseWidth: 50,
  baseHeight: 100,
  shape: 'path',
  anchors: [
    // Hip on inner edge (top-left) so leg extends outward to the right
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

const QUADVEE_CONSTRAINTS: LayoutConstraint[] = [
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

  // Front left leg connects to center torso hip (like biped leg)
  {
    id: 'front-left-leg-to-hip',
    type: 'anchor-to-anchor',
    source: { part: MechLocation.FRONT_LEFT_LEG, anchor: 'hip' },
    target: { part: MechLocation.CENTER_TORSO, anchor: 'front_left_hip' },
    gap: 5,
    priority: 80,
  },

  // Front right leg connects to center torso hip (like biped leg)
  {
    id: 'front-right-leg-to-hip',
    type: 'anchor-to-anchor',
    source: { part: MechLocation.FRONT_RIGHT_LEG, anchor: 'hip' },
    target: { part: MechLocation.CENTER_TORSO, anchor: 'front_right_hip' },
    gap: 5,
    priority: 80,
  },

  // Rear left leg connects to left torso outer edge at lower portion
  {
    id: 'rear-left-leg-to-torso',
    type: 'anchor-to-anchor',
    source: { part: MechLocation.REAR_LEFT_LEG, anchor: 'hip' },
    target: { part: MechLocation.LEFT_TORSO, anchor: 'rear_leg_mount' },
    gap: 0,
    priority: 70,
  },

  // Rear right leg connects to right torso outer edge at lower portion
  {
    id: 'rear-right-leg-to-torso',
    type: 'anchor-to-anchor',
    source: { part: MechLocation.REAR_RIGHT_LEG, anchor: 'hip' },
    target: { part: MechLocation.RIGHT_TORSO, anchor: 'rear_leg_mount' },
    gap: 0,
    priority: 70,
  },
];

// ============================================================================
// Layout Configuration
// ============================================================================

/**
 * Geometric QuadVee layout for HUD-style diagrams
 */
export const GEOMETRIC_QUADVEE_LAYOUT: MechLayoutConfig = {
  id: 'geometric-quadvee',
  name: 'Geometric QuadVee',
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
  constraints: QUADVEE_CONSTRAINTS,
  padding: 10,
  minGap: 5,
  visualConnectors: false,
  scale: 1,
};

/**
 * BattleMech-style QuadVee layout
 */
export const BATTLEMECH_QUADVEE_LAYOUT: MechLayoutConfig = {
  id: 'battlemech-quadvee',
  name: 'BattleMech QuadVee',
  style: 'realistic',
  parts: [
    { ...CENTER_TORSO, baseWidth: 90, baseHeight: 110 },
    { ...HEAD, baseWidth: 45, baseHeight: 32 },
    { ...LEFT_TORSO, baseWidth: 45, baseHeight: 90 },
    { ...RIGHT_TORSO, baseWidth: 45, baseHeight: 90 },
    { ...FRONT_LEFT_LEG, baseWidth: 42, baseHeight: 95 },
    { ...FRONT_RIGHT_LEG, baseWidth: 42, baseHeight: 95 },
    { ...REAR_LEFT_LEG, baseWidth: 42, baseHeight: 95 },
    { ...REAR_RIGHT_LEG, baseWidth: 42, baseHeight: 95 },
  ],
  constraints: QUADVEE_CONSTRAINTS,
  padding: 10,
  minGap: 4,
  visualConnectors: false,
  scale: 1,
};

// ============================================================================
// All QuadVee Layouts
// ============================================================================

export const QUADVEE_LAYOUTS: MechLayoutConfig[] = [
  GEOMETRIC_QUADVEE_LAYOUT,
  BATTLEMECH_QUADVEE_LAYOUT,
];

/**
 * Get a QuadVee layout by ID
 */
export function getQuadVeeLayout(id: string): MechLayoutConfig | undefined {
  return QUADVEE_LAYOUTS.find((layout) => layout.id === id);
}
