/**
 * Record-sheet outlines for the Blueprint biped armor diagram.
 *
 * Sampled from the record sheet's biped armor diagram (`mek_biped_default.svg`,
 * group `armor_diagram_biped`), cleaned of micro-steps and mirrored about the
 * sheet's centre line. Units are the record sheet's viewBox units: the FRONT
 * view is the full figure, the REAR view the sheet's own rear-torso inset.
 *
 * @spec openspec/specs/armor-diagram/spec.md
 */

import { MechLocation } from '@/types/construction';

export type Point = readonly [number, number];
export type Polygon = readonly Point[];

/** The record sheet's vertical centre line. */
export const BLUEPRINT_AXIS = 88.4;

export const mirrorPoint = ([x, y]: Point): Point => [
  2 * BLUEPRINT_AXIS - x,
  y,
];
const mirror = (points: Polygon): Polygon => points.map(mirrorPoint).reverse();
/** `half` runs from a point on the axis, down the left side, back to the axis. */
const symmetric = (half: Polygon): Polygon =>
  half.concat(half.slice(1, -1).reverse().map(mirrorPoint));

const LEFT_TORSO: Polygon = [
  [71.1, 38.7],
  [39.9, 40.3],
  [38.8, 41.9],
  [40.4, 77.6],
  [42.2, 79.3],
  [53.6, 80.9],
  [55.9, 95.7],
  [60.1, 108.2],
  [46.8, 111],
  [45.4, 127.3],
  [46.5, 128.6],
  [73.9, 128.6],
  [73.8, 109.2],
  [71.1, 80.9],
];

const LEFT_ARM: Polygon = [
  [32.8, 14.3],
  [41.8, 23.9],
  [45.4, 32.4],
  [44.5, 36.3],
  [37.6, 40.7],
  [38.4, 46.8],
  [39.8, 66.6],
  [35.4, 69.6],
  [33.4, 91.2],
  [31.4, 93.6],
  [32.4, 98.2],
  [29.6, 126.8],
  [27.6, 128.7],
  [8.3, 127.3],
  [2.4, 119.2],
  [6.6, 96.6],
  [8.8, 93.8],
  [8, 90],
  [10, 66.4],
  [0.8, 58.8],
  [1.3, 52.8],
  [9, 51.7],
  [2.6, 44.1],
  [4.8, 37.7],
  [14, 38.5],
  [11.4, 25.6],
  [16, 22.7],
  [26, 28],
  [26.5, 16.5],
];

const LEFT_LEG: Polygon = [
  [50.3, 128.6],
  [73.9, 128.6],
  [75.5, 142.9],
  [76.84, 144.24],
  [69.5, 171.9],
  [71.7, 173.6],
  [66.2, 178.2],
  [66.2, 184.1],
  [64.6, 190.9],
  [65.4, 222.3],
  [61.1, 229.5],
  [54.7, 230.6],
  [53, 238.1],
  [50.8, 238.9],
  [50.8, 245.9],
  [54.1, 247.6],
  [54.7, 250.3],
  [56.3, 251.9],
  [56.3, 256.4],
  [9.8, 256.4],
  [9.7, 252.7],
  [11.9, 251.3],
  [13, 248.7],
  [23.3, 244.3],
  [25.6, 240.5],
  [21.2, 238.2],
  [24.2, 225.8],
  [20.7, 221.3],
  [20.7, 217.3],
  [32.7, 189.8],
  [34.4, 188.4],
  [34, 176.2],
  [36.2, 165.4],
  [40.6, 165.3],
];

const LEFT_TORSO_REAR: Polygon = [
  [74.4, 262],
  [42.7, 263.7],
  [40.5, 266.4],
  [42.2, 301.3],
  [43.8, 303.2],
  [66.8, 304.3],
  [69.1, 295.6],
  [74.4, 289.8],
];

export const FRONT_OUTLINES: Record<string, Polygon> = {
  [MechLocation.HEAD]: symmetric([
    [88.4, 9.6],
    [83.5, 9.6],
    [81.7, 11.2],
    [81.2, 15.2],
    [77.7, 19.1],
    [75, 24.4],
    [69.5, 24.9],
    [67.9, 26.5],
    [67.9, 38.7],
    [76.4, 38.7],
    [77.4, 46.6],
    [80.2, 52.6],
    [84, 55.8],
    [88.4, 56.8],
  ]),
  // Cut around the head's chin, as on the sheet.
  [MechLocation.CENTER_TORSO]: symmetric([
    [88.4, 56.8],
    [84, 55.8],
    [80.2, 52.6],
    [77.4, 46.6],
    [76.4, 38.7],
    [71.1, 38.7],
    [71.1, 80.9],
    [73.8, 109.2],
    [73.9, 128.6],
    [75.5, 142.9],
    [77.6, 145],
    [88.4, 145],
  ]),
  [MechLocation.LEFT_TORSO]: LEFT_TORSO,
  [MechLocation.RIGHT_TORSO]: mirror(LEFT_TORSO),
  [MechLocation.LEFT_ARM]: LEFT_ARM,
  [MechLocation.RIGHT_ARM]: mirror(LEFT_ARM),
  [MechLocation.LEFT_LEG]: LEFT_LEG,
  [MechLocation.RIGHT_LEG]: mirror(LEFT_LEG),
};

export const REAR_OUTLINES: Record<string, Polygon> = {
  [MechLocation.CENTER_TORSO]: symmetric([
    [88.4, 238.9],
    [85.8, 238.9],
    [84, 240.6],
    [83.6, 244.3],
    [80, 248.1],
    [77.9, 252],
    [74.5, 254.4],
    [74.4, 262],
    [74.4, 289.8],
    [69.1, 295.6],
    [66.8, 304.3],
    [67.3, 309.6],
    [68.4, 314.6],
    [70.2, 320.4],
    [72.5, 322.9],
    [88.4, 322.9],
  ]),
  [MechLocation.LEFT_TORSO]: LEFT_TORSO_REAR,
  [MechLocation.RIGHT_TORSO]: mirror(LEFT_TORSO_REAR),
};

/** Centre of each plate's label block. Leg values sit in the wider shins. */
export const FRONT_ANCHORS: Record<string, Point> = {
  [MechLocation.HEAD]: [88.4, 37],
  [MechLocation.CENTER_TORSO]: [88.4, 96],
  [MechLocation.LEFT_TORSO]: [55.6, 60.5],
  [MechLocation.RIGHT_TORSO]: [121.2, 60.5],
  [MechLocation.LEFT_ARM]: [23, 57],
  [MechLocation.RIGHT_ARM]: [153.8, 57],
  [MechLocation.LEFT_LEG]: [47, 204],
  [MechLocation.RIGHT_LEG]: [129.8, 204],
};

export const REAR_ANCHORS: Record<string, Point> = {
  [MechLocation.CENTER_TORSO]: [88.4, 281],
  [MechLocation.LEFT_TORSO]: [57.4, 281],
  [MechLocation.RIGHT_TORSO]: [119.4, 281],
};

/**
 * The fists hang under the forearms. They are not armor locations, so they
 * are drawn as faint detail inside the arm's button: the outline is part of
 * the arm's hit area and nothing floats apart from its plate.
 */
export const LEFT_FIST_LINES: readonly Polygon[] = [
  [
    [11.1, 130.4],
    [24.0, 131.4],
    [26.3, 138.0],
    [9.8, 140.4],
    [7.5, 139.6],
    [11.1, 130.4],
  ],
  [
    [9.8, 140.4],
    [9.4, 148.2],
    [14.4, 154.0],
    [21.8, 153.4],
    [22.6, 150.4],
    [23.2, 146.4],
    [25.8, 144.0],
    [26.3, 138.0],
  ],
  [
    [13.4, 140.0],
    [13.0, 149.0],
  ],
  [
    [17.4, 139.4],
    [17.0, 151.8],
  ],
  [
    [21.4, 138.8],
    [21.2, 146.6],
  ],
];
export const LEFT_FIST_OUTLINE: Polygon = [
  [11.1, 130.4],
  [24.0, 131.4],
  [26.3, 138.0],
  [25.8, 144.0],
  [23.2, 146.4],
  [22.6, 150.4],
  [21.8, 153.4],
  [14.4, 154.0],
  [9.4, 148.2],
  [9.8, 140.4],
  [7.5, 139.6],
];
