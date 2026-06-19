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

import type {
  LayoutConstraint,
  MechLayoutConfig,
  PartDefinition,
} from '../LayoutTypes';

import {
  connectAnchors,
  edgeAnchor,
  gapConstraint,
  layoutConfig,
  offsetAnchor,
  pathPart,
  rectangularPart,
  resizePart,
} from './HumanoidLayoutHelpers';

// ============================================================================
// Part Definitions
// ============================================================================

const HEAD: PartDefinition = pathPart({
  id: MechLocation.HEAD,
  baseWidth: 70,
  baseHeight: 55,
  anchors: [offsetAnchor('neck', 'bottom')],
  pathTemplate: `
    M {cx} {y}
    L {x2} {y}
    L {x2} {y2}
    L {cx} {y2}
    L {x} {y2}
    L {x} {y}
    Z
  `,
});

const CENTER_TORSO: PartDefinition = rectangularPart({
  id: MechLocation.CENTER_TORSO,
  baseWidth: 110,
  baseHeight: 115,
  isRoot: true,
  anchors: [
    { id: 'neck', position: 'top', offset: { x: 0, y: 0 } },
    { id: 'left_shoulder', position: 'top-left', offset: { x: 20, y: 10 } },
    { id: 'right_shoulder', position: 'top-right', offset: { x: -20, y: 10 } },
    // Hip anchors use edge-relative positioning for consistent leg spread
    // Position at 25% and 75% along the bottom edge to spread legs apart
    edgeAnchor('left_hip', 'bottom', 'bottom', 0.25),
    edgeAnchor('right_hip', 'bottom', 'bottom', 0.75),
    // Side anchors at TOP of edges so side torsos align their tops with center torso
    edgeAnchor('left_side', 'left', 'left', 0),
    edgeAnchor('right_side', 'right', 'right', 0),
  ],
});

const LEFT_TORSO: PartDefinition = rectangularPart({
  id: MechLocation.LEFT_TORSO,
  baseWidth: 65,
  baseHeight: 105,
  anchors: [
    // Inner anchor at TOP-RIGHT to align side torso top with center torso top
    edgeAnchor('inner', 'right', 'right', 0),
    // Arm mount at 25% down from top of torso
    edgeAnchor('arm_mount', 'left', 'left', 0.25),
  ],
});

const RIGHT_TORSO: PartDefinition = rectangularPart({
  id: MechLocation.RIGHT_TORSO,
  baseWidth: 65,
  baseHeight: 105,
  anchors: [
    // Inner anchor at TOP-LEFT to align side torso top with center torso top
    edgeAnchor('inner', 'left', 'left', 0),
    // Arm mount at 25% down from top of torso
    edgeAnchor('arm_mount', 'right', 'right', 0.25),
  ],
});

const LEFT_ARM: PartDefinition = rectangularPart({
  id: MechLocation.LEFT_ARM,
  baseWidth: 28,
  baseHeight: 150,
  anchors: [
    // Shoulder at top-right (inner edge) - no offset so arm top aligns with mount point
    offsetAnchor('shoulder', 'top-right'),
  ],
});

const RIGHT_ARM: PartDefinition = rectangularPart({
  id: MechLocation.RIGHT_ARM,
  baseWidth: 28,
  baseHeight: 150,
  anchors: [
    // Shoulder at top-left (inner edge) - no offset so arm top aligns with mount point
    offsetAnchor('shoulder', 'top-left'),
  ],
});

const LEFT_LEG: PartDefinition = rectangularPart({
  id: MechLocation.LEFT_LEG,
  baseWidth: 60,
  baseHeight: 160,
  anchors: [
    // Hip anchor on inner edge (top-right) so leg extends outward to the left
    offsetAnchor('hip', 'top-right'),
  ],
});

const RIGHT_LEG: PartDefinition = rectangularPart({
  id: MechLocation.RIGHT_LEG,
  baseWidth: 60,
  baseHeight: 160,
  anchors: [
    // Hip anchor on inner edge (top-left) so leg extends outward to the right
    offsetAnchor('hip', 'top-left'),
  ],
});

// ============================================================================
// Layout Constraints
// ============================================================================

const BIPED_CONSTRAINTS: LayoutConstraint[] = [
  // Head connects to center torso neck
  connectAnchors(
    'head-to-neck',
    { part: MechLocation.HEAD, anchor: 'bottom' },
    { part: MechLocation.CENTER_TORSO, anchor: 'neck' },
    5,
    100,
  ),

  // Left torso flanks center torso on the left
  connectAnchors(
    'left-torso-to-center',
    { part: MechLocation.LEFT_TORSO, anchor: 'inner' },
    { part: MechLocation.CENTER_TORSO, anchor: 'left_side' },
    0,
    90,
  ),

  // Right torso flanks center torso on the right
  connectAnchors(
    'right-torso-to-center',
    { part: MechLocation.RIGHT_TORSO, anchor: 'inner' },
    { part: MechLocation.CENTER_TORSO, anchor: 'right_side' },
    0,
    90,
  ),

  // Left arm connects to left torso (no gap - arm directly adjacent)
  connectAnchors(
    'left-arm-to-torso',
    { part: MechLocation.LEFT_ARM, anchor: 'shoulder' },
    { part: MechLocation.LEFT_TORSO, anchor: 'arm_mount' },
    0,
    80,
  ),

  // Right arm connects to right torso (no gap - arm directly adjacent)
  connectAnchors(
    'right-arm-to-torso',
    { part: MechLocation.RIGHT_ARM, anchor: 'shoulder' },
    { part: MechLocation.RIGHT_TORSO, anchor: 'arm_mount' },
    0,
    80,
  ),

  // Left leg connects to center torso hip
  connectAnchors(
    'left-leg-to-hip',
    { part: MechLocation.LEFT_LEG, anchor: 'hip' },
    { part: MechLocation.CENTER_TORSO, anchor: 'left_hip' },
    5,
    70,
  ),

  // Right leg connects to center torso hip
  connectAnchors(
    'right-leg-to-hip',
    { part: MechLocation.RIGHT_LEG, anchor: 'hip' },
    { part: MechLocation.CENTER_TORSO, anchor: 'right_hip' },
    5,
    70,
  ),

  // Ensure legs don't overlap - require minimum gap between them
  gapConstraint(
    'leg-separation',
    MechLocation.LEFT_LEG,
    MechLocation.RIGHT_LEG,
    10,
    60,
  ),
];

// ============================================================================
// Layout Configuration
// ============================================================================

/**
 * Geometric biped layout for HUD-style diagrams
 */
export const GEOMETRIC_BIPED_LAYOUT: MechLayoutConfig = layoutConfig({
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
  minGap: 5,
});

/**
 * Realistic biped layout for silhouette-style diagrams
 */
export const REALISTIC_BIPED_LAYOUT: MechLayoutConfig = layoutConfig({
  id: 'realistic-biped',
  name: 'Realistic Biped',
  style: 'realistic',
  parts: [
    resizePart(CENTER_TORSO, 100, 110),
    resizePart(HEAD, 60, 55),
    resizePart(LEFT_TORSO, 65, 100),
    resizePart(RIGHT_TORSO, 65, 100),
    resizePart(LEFT_ARM, 28, 140),
    resizePart(RIGHT_ARM, 28, 140),
    resizePart(LEFT_LEG, 55, 150),
    resizePart(RIGHT_LEG, 55, 150),
  ],
  constraints: BIPED_CONSTRAINTS,
  minGap: 5,
});

/**
 * MegaMek-style biped layout
 */
export const MEGAMEK_BIPED_LAYOUT: MechLayoutConfig = layoutConfig({
  id: 'megamek-biped',
  name: 'MegaMek Biped',
  style: 'megamek',
  parts: [
    resizePart(CENTER_TORSO, 60, 100),
    resizePart(HEAD, 60, 44),
    // Wider side torsos to create more separation between arms and legs
    resizePart(LEFT_TORSO, 48, 96),
    resizePart(RIGHT_TORSO, 48, 96),
    resizePart(LEFT_ARM, 24, 120),
    resizePart(RIGHT_ARM, 24, 120),
    // Slightly narrower legs to avoid arm overlap
    resizePart(LEFT_LEG, 46, 152),
    resizePart(RIGHT_LEG, 46, 152),
  ],
  constraints: BIPED_CONSTRAINTS,
  minGap: 4,
});

/**
 * BattleMech-style biped layout (used by CleanTech/Standard variant)
 * Matches BATTLEMECH_SILHOUETTE dimensions
 */
export const BATTLEMECH_BIPED_LAYOUT: MechLayoutConfig = layoutConfig({
  id: 'battlemech-biped',
  name: 'BattleMech Biped',
  style: 'realistic',
  parts: [
    resizePart(CENTER_TORSO, 56, 80),
    resizePart(HEAD, 50, 32),
    resizePart(LEFT_TORSO, 40, 78),
    resizePart(RIGHT_TORSO, 40, 78),
    resizePart(LEFT_ARM, 26, 100),
    resizePart(RIGHT_ARM, 26, 100),
    resizePart(LEFT_LEG, 46, 110),
    resizePart(RIGHT_LEG, 46, 110),
  ],
  constraints: BIPED_CONSTRAINTS,
  minGap: 2, // Compact layout allows tighter spacing
});

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
