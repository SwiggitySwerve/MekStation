/**
 * LAM (Land-Air Mech) Layout Configuration
 *
 * Defines the layout for Land-Air Mechs which can transform between:
 * - Mech mode (biped configuration)
 * - AirMech mode (transitional)
 * - Fighter mode (aerospace configuration)
 *
 * This layout represents the Mech mode configuration with visual hints
 * of the transformation capability (slightly different proportions).
 *
 * Note: LAMs are limited to 55 tons max and use specific equipment
 * (Landing Gear, Avionics) for transformation capability.
 */

import { MechLocation } from '@/types/construction';

import {
  LayoutConstraint,
  MechLayoutConfig,
  PartDefinition,
} from '../LayoutTypes';

// ============================================================================
// Part Definitions (LAM Mech Mode)
// ============================================================================

const HEAD: PartDefinition = {
  id: MechLocation.HEAD,
  baseWidth: 65,
  baseHeight: 50,
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
  baseWidth: 100,
  baseHeight: 110,
  shape: 'path',
  isRoot: true,
  anchors: [
    { id: 'neck', position: 'top', offset: { x: 0, y: 0 } },
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
    {
      id: 'left_hip',
      position: 'bottom',
      edgePosition: { edge: 'bottom', at: 0.25 },
    },
    {
      id: 'right_hip',
      position: 'bottom',
      edgePosition: { edge: 'bottom', at: 0.75 },
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
  baseWidth: 70,
  baseHeight: 100,
  shape: 'path',
  anchors: [
    { id: 'inner', position: 'right', edgePosition: { edge: 'right', at: 0 } },
    {
      id: 'arm_mount',
      position: 'left',
      edgePosition: { edge: 'left', at: 0.2 },
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
  baseWidth: 70,
  baseHeight: 100,
  shape: 'path',
  anchors: [
    { id: 'inner', position: 'left', edgePosition: { edge: 'left', at: 0 } },
    {
      id: 'arm_mount',
      position: 'right',
      edgePosition: { edge: 'right', at: 0.2 },
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

const LEFT_ARM: PartDefinition = {
  id: MechLocation.LEFT_ARM,
  baseWidth: 30,
  baseHeight: 130,
  shape: 'path',
  anchors: [{ id: 'shoulder', position: 'top-right', offset: { x: 0, y: 0 } }],
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
  baseWidth: 30,
  baseHeight: 130,
  shape: 'path',
  anchors: [{ id: 'shoulder', position: 'top-left', offset: { x: 0, y: 0 } }],
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
  baseHeight: 130,
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

const RIGHT_LEG: PartDefinition = {
  id: MechLocation.RIGHT_LEG,
  baseWidth: 50,
  baseHeight: 130,
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

// ============================================================================
// Layout Constraints
// ============================================================================

const LAM_CONSTRAINTS: LayoutConstraint[] = [
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

  // Leg separation constraint
  {
    id: 'leg-separation',
    type: 'gap',
    source: { part: MechLocation.LEFT_LEG },
    target: { part: MechLocation.RIGHT_LEG },
    gap: 10,
    priority: 60,
  },
];

// ============================================================================
// Layout Configuration
// ============================================================================

/**
 * Geometric LAM layout for HUD-style diagrams
 */
export const GEOMETRIC_LAM_LAYOUT: MechLayoutConfig = {
  id: 'geometric-lam',
  name: 'Geometric LAM',
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
  ],
  constraints: LAM_CONSTRAINTS,
  padding: 10,
  minGap: 5,
  visualConnectors: false,
  scale: 1,
};

/**
 * BattleMech-style LAM layout
 */
export const BATTLEMECH_LAM_LAYOUT: MechLayoutConfig = {
  id: 'battlemech-lam',
  name: 'BattleMech LAM',
  style: 'realistic',
  parts: [
    { ...CENTER_TORSO, baseWidth: 70, baseHeight: 90 },
    { ...HEAD, baseWidth: 50, baseHeight: 35 },
    { ...LEFT_TORSO, baseWidth: 55, baseHeight: 85 },
    { ...RIGHT_TORSO, baseWidth: 55, baseHeight: 85 },
    { ...LEFT_ARM, baseWidth: 24, baseHeight: 100 },
    { ...RIGHT_ARM, baseWidth: 24, baseHeight: 100 },
    { ...LEFT_LEG, baseWidth: 40, baseHeight: 105 },
    { ...RIGHT_LEG, baseWidth: 40, baseHeight: 105 },
  ],
  constraints: LAM_CONSTRAINTS,
  padding: 10,
  minGap: 4,
  visualConnectors: false,
  scale: 1,
};

// ============================================================================
// All LAM Layouts
// ============================================================================

export const LAM_LAYOUTS: MechLayoutConfig[] = [
  GEOMETRIC_LAM_LAYOUT,
  BATTLEMECH_LAM_LAYOUT,
];

/**
 * Get a LAM layout by ID
 */
export function getLAMLayout(id: string): MechLayoutConfig | undefined {
  return LAM_LAYOUTS.find((layout) => layout.id === id);
}
