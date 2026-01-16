/**
 * Biped Layout Configuration
 *
 * Defines the layout for standard humanoid BattleMechs with:
 * - Head at top
 * - Center torso in middle with side torsos flanking
 * - Arms on the outside
 * - Legs at the bottom
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
    M {cx} {y}
    L {x2} {y}
    L {x2} {y2}
    L {cx} {y2}
    L {x} {y2}
    L {x} {y}
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
    // Hip anchors use edge-relative positioning for consistent leg spread
    // Position at 25% and 75% along the bottom edge to spread legs apart
    { id: 'left_hip', position: 'bottom', edgePosition: { edge: 'bottom', at: 0.25 } },
    { id: 'right_hip', position: 'bottom', edgePosition: { edge: 'bottom', at: 0.75 } },
    // Side anchors at TOP of edges so side torsos align their tops with center torso
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
    // Inner anchor at TOP-RIGHT to align side torso top with center torso top
    { id: 'inner', position: 'right', edgePosition: { edge: 'right', at: 0 } },
    // Arm mount at 25% down from top of torso
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
    // Inner anchor at TOP-LEFT to align side torso top with center torso top
    { id: 'inner', position: 'left', edgePosition: { edge: 'left', at: 0 } },
    // Arm mount at 25% down from top of torso
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
    // Shoulder at top-right (inner edge) - no offset so arm top aligns with mount point
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
    // Shoulder at top-left (inner edge) - no offset so arm top aligns with mount point
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
  baseWidth: 60,
  baseHeight: 160,
  shape: 'path',
  anchors: [
    // Hip anchor on inner edge (top-right) so leg extends outward to the left
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
  baseWidth: 60,
  baseHeight: 160,
  shape: 'path',
  anchors: [
    // Hip anchor on inner edge (top-left) so leg extends outward to the right
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

const BIPED_CONSTRAINTS: LayoutConstraint[] = [
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

  // Left arm connects to left torso (no gap - arm directly adjacent)
  {
    id: 'left-arm-to-torso',
    type: 'anchor-to-anchor',
    source: { part: MechLocation.LEFT_ARM, anchor: 'shoulder' },
    target: { part: MechLocation.LEFT_TORSO, anchor: 'arm_mount' },
    gap: 0,
    priority: 80,
  },

  // Right arm connects to right torso (no gap - arm directly adjacent)
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

  // Ensure legs don't overlap - require minimum gap between them
  {
    id: 'leg-separation',
    type: 'gap',
    source: { part: MechLocation.LEFT_LEG },
    target: { part: MechLocation.RIGHT_LEG },
    gap: 10, // Minimum 10px gap between legs
    priority: 60,
  },
];

// ============================================================================
// Layout Configuration
// ============================================================================

/**
 * Geometric biped layout for HUD-style diagrams
 */
export const GEOMETRIC_BIPED_LAYOUT: MechLayoutConfig = {
  id: 'geometric-biped',
  name: 'Geometric Biped',
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
  constraints: BIPED_CONSTRAINTS,
  padding: 10,
  minGap: 5,
  visualConnectors: false,
  scale: 1,
};

/**
 * Realistic biped layout for silhouette-style diagrams
 */
export const REALISTIC_BIPED_LAYOUT: MechLayoutConfig = {
  id: 'realistic-biped',
  name: 'Realistic Biped',
  style: 'realistic',
  parts: [
    { ...CENTER_TORSO, baseWidth: 100, baseHeight: 110 },
    { ...HEAD, baseWidth: 60, baseHeight: 55 },
    { ...LEFT_TORSO, baseWidth: 65, baseHeight: 100 },
    { ...RIGHT_TORSO, baseWidth: 65, baseHeight: 100 },
    { ...LEFT_ARM, baseWidth: 28, baseHeight: 140 },
    { ...RIGHT_ARM, baseWidth: 28, baseHeight: 140 },
    { ...LEFT_LEG, baseWidth: 55, baseHeight: 150 },
    { ...RIGHT_LEG, baseWidth: 55, baseHeight: 150 },
  ],
  constraints: BIPED_CONSTRAINTS,
  padding: 10,
  minGap: 5,
  visualConnectors: false,
  scale: 1,
};

/**
 * MegaMek-style biped layout
 */
export const MEGAMEK_BIPED_LAYOUT: MechLayoutConfig = {
  id: 'megamek-biped',
  name: 'MegaMek Biped',
  style: 'megamek',
  parts: [
    { ...CENTER_TORSO, baseWidth: 60, baseHeight: 100 },
    { ...HEAD, baseWidth: 60, baseHeight: 44 },
    // Wider side torsos to create more separation between arms and legs
    { ...LEFT_TORSO, baseWidth: 48, baseHeight: 96 },
    { ...RIGHT_TORSO, baseWidth: 48, baseHeight: 96 },
    { ...LEFT_ARM, baseWidth: 24, baseHeight: 120 },
    { ...RIGHT_ARM, baseWidth: 24, baseHeight: 120 },
    // Slightly narrower legs to avoid arm overlap
    { ...LEFT_LEG, baseWidth: 46, baseHeight: 152 },
    { ...RIGHT_LEG, baseWidth: 46, baseHeight: 152 },
  ],
  constraints: BIPED_CONSTRAINTS,
  padding: 10,
  minGap: 4,
  visualConnectors: false,
  scale: 1,
};

/**
 * BattleMech-style biped layout (used by CleanTech/Standard variant)
 * Matches BATTLEMECH_SILHOUETTE dimensions
 */
export const BATTLEMECH_BIPED_LAYOUT: MechLayoutConfig = {
  id: 'battlemech-biped',
  name: 'BattleMech Biped',
  style: 'realistic',
  parts: [
    { ...CENTER_TORSO, baseWidth: 56, baseHeight: 80 },
    { ...HEAD, baseWidth: 50, baseHeight: 32 },
    { ...LEFT_TORSO, baseWidth: 40, baseHeight: 78 },
    { ...RIGHT_TORSO, baseWidth: 40, baseHeight: 78 },
    { ...LEFT_ARM, baseWidth: 26, baseHeight: 100 },
    { ...RIGHT_ARM, baseWidth: 26, baseHeight: 100 },
    { ...LEFT_LEG, baseWidth: 46, baseHeight: 110 },
    { ...RIGHT_LEG, baseWidth: 46, baseHeight: 110 },
  ],
  constraints: BIPED_CONSTRAINTS,
  padding: 10,
  minGap: 2,  // Compact layout allows tighter spacing
  visualConnectors: false,
  scale: 1,
};

// ============================================================================
// All Biped Layouts
// ============================================================================

export const BIPED_LAYOUTS: MechLayoutConfig[] = [
  GEOMETRIC_BIPED_LAYOUT,
  REALISTIC_BIPED_LAYOUT,
  MEGAMEK_BIPED_LAYOUT,
  BATTLEMECH_BIPED_LAYOUT,
];

/**
 * Get a biped layout by ID
 */
export function getBipedLayout(id: string): MechLayoutConfig | undefined {
  return BIPED_LAYOUTS.find((layout) => layout.id === id);
}
