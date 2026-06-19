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
  rectangularPart,
  resizePart,
} from './HumanoidLayoutHelpers';

// ============================================================================
// Part Definitions (LAM Mech Mode)
// ============================================================================

const HEAD: PartDefinition = rectangularPart({
  id: MechLocation.HEAD,
  baseWidth: 65,
  baseHeight: 50,
  anchors: [offsetAnchor('neck', 'bottom')],
});

const CENTER_TORSO: PartDefinition = rectangularPart({
  id: MechLocation.CENTER_TORSO,
  baseWidth: 100,
  baseHeight: 110,
  isRoot: true,
  anchors: [
    offsetAnchor('neck', 'top'),
    edgeAnchor('left_side', 'left', 'left', 0),
    edgeAnchor('right_side', 'right', 'right', 0),
    edgeAnchor('left_hip', 'bottom', 'bottom', 0.25),
    edgeAnchor('right_hip', 'bottom', 'bottom', 0.75),
  ],
});

const LEFT_TORSO: PartDefinition = rectangularPart({
  id: MechLocation.LEFT_TORSO,
  baseWidth: 70,
  baseHeight: 100,
  anchors: [
    edgeAnchor('inner', 'right', 'right', 0),
    edgeAnchor('arm_mount', 'left', 'left', 0.2),
  ],
});

const RIGHT_TORSO: PartDefinition = rectangularPart({
  id: MechLocation.RIGHT_TORSO,
  baseWidth: 70,
  baseHeight: 100,
  anchors: [
    edgeAnchor('inner', 'left', 'left', 0),
    edgeAnchor('arm_mount', 'right', 'right', 0.2),
  ],
});

const LEFT_ARM: PartDefinition = rectangularPart({
  id: MechLocation.LEFT_ARM,
  baseWidth: 30,
  baseHeight: 130,
  anchors: [offsetAnchor('shoulder', 'top-right')],
});

const RIGHT_ARM: PartDefinition = rectangularPart({
  id: MechLocation.RIGHT_ARM,
  baseWidth: 30,
  baseHeight: 130,
  anchors: [offsetAnchor('shoulder', 'top-left')],
});

const LEFT_LEG: PartDefinition = rectangularPart({
  id: MechLocation.LEFT_LEG,
  baseWidth: 50,
  baseHeight: 130,
  anchors: [offsetAnchor('hip', 'top-right')],
});

const RIGHT_LEG: PartDefinition = rectangularPart({
  id: MechLocation.RIGHT_LEG,
  baseWidth: 50,
  baseHeight: 130,
  anchors: [offsetAnchor('hip', 'top-left')],
});

// ============================================================================
// Layout Constraints
// ============================================================================

const LAM_CONSTRAINTS: LayoutConstraint[] = [
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

  // Left arm connects to left torso
  connectAnchors(
    'left-arm-to-torso',
    { part: MechLocation.LEFT_ARM, anchor: 'shoulder' },
    { part: MechLocation.LEFT_TORSO, anchor: 'arm_mount' },
    0,
    80,
  ),

  // Right arm connects to right torso
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

  // Leg separation constraint
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
 * Geometric LAM layout for HUD-style diagrams
 */
export const GEOMETRIC_LAM_LAYOUT: MechLayoutConfig = layoutConfig({
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
  minGap: 5,
});

/**
 * BattleMech-style LAM layout
 */
export const BATTLEMECH_LAM_LAYOUT: MechLayoutConfig = layoutConfig({
  id: 'battlemech-lam',
  name: 'BattleMech LAM',
  style: 'realistic',
  parts: [
    resizePart(CENTER_TORSO, 70, 90),
    resizePart(HEAD, 50, 35),
    resizePart(LEFT_TORSO, 55, 85),
    resizePart(RIGHT_TORSO, 55, 85),
    resizePart(LEFT_ARM, 24, 100),
    resizePart(RIGHT_ARM, 24, 100),
    resizePart(LEFT_LEG, 40, 105),
    resizePart(RIGHT_LEG, 40, 105),
  ],
  constraints: LAM_CONSTRAINTS,
  minGap: 4,
});

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
