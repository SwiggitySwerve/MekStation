import { MechLocation } from '@/types/construction';

export interface BipedArmorPlate {
  readonly path: string;
  /** Horizontal centre of the plate's text stack. */
  readonly x: number;
  /** Baseline of the location abbreviation; the value lines hang below it. */
  readonly y: number;
  readonly label: string;
  /** Torso plates carry a second (rear) armor face. */
  readonly hasRear?: boolean;
}

/** Cropped to the drawn silhouette so its height sets the diagram's scale. */
export const BIPED_ARMOR_VIEWBOX = '-30 20 420 402';

/**
 * Baselines below `plate.y` (the abbreviation baseline) for the one text stack
 * every plate shares: the front value with its "/max" on one baseline, then on
 * torsos a rear line; arms and legs add a fill bar.
 */
export const BIPED_PLATE_STACK = { value: 25, rear: 47, bar: 56 } as const;

/** Mirror axis: the left-side plates reflect onto the right about this x. */
const CENTRE_X = 180;

type Point = readonly [number, number];

function polygon(points: readonly Point[]): string {
  const [first, ...rest] = points;
  return `M${first[0]} ${first[1]} ${rest.map(([x, y]) => `L${x} ${y}`).join(' ')} Z`;
}

function mirror(points: readonly Point[]): Point[] {
  return points.map(([x, y]) => [2 * CENTRE_X - x, y]);
}

/**
 * Viewer's-left outlines, which carry the unit's LEFT locations: the record
 * sheet (and MegaMekLab) draw Left Arm / Left Torso / Left Leg on the left of
 * the page, so the diagram matches what a player transcribes. Every plate is
 * wide enough at its text rows to keep the "<value>/<max>" stack at least 8
 * units clear of the outline, so the right side is an exact mirror.
 */
const VIEWER_LEFT_SIDE = {
  torso: [
    [135, 93],
    [57, 101],
    [55, 186],
    [78, 216],
    [135, 208],
  ],
  arm: [
    [54, 101],
    [14, 108],
    [-16, 150],
    [-22, 215],
    [-26, 252],
    [-8, 272],
    [38, 262],
    [50, 222],
    [52, 150],
  ],
  leg: [
    [176, 235],
    [104, 228],
    [94, 290],
    [102, 330],
    [88, 399],
    [104, 415],
    [177, 415],
    [176, 375],
    [164, 328],
    [176, 285],
  ],
} as const satisfies Record<string, readonly Point[]>;

/**
 * Local presentation geometry; allocation limits come from ArmorTab's
 * projection. Plates are drawn wide where the text sits so the same stack
 * (abbreviation, front value over its "/max", torso rear line) fits every
 * location on a phone without touching the outline.
 */
export const BIPED_ARMOR_PLATES: Partial<
  Record<MechLocation, BipedArmorPlate>
> = {
  [MechLocation.HEAD]: {
    path: 'M156 26 H204 L214 42 L207 82 H153 L146 42 Z',
    x: 180,
    y: 43,
    label: 'HD',
  },
  [MechLocation.CENTER_TORSO]: {
    path: 'M148 93 H212 L221 125 L221 192 L210 212 H150 L139 192 L139 125 Z',
    x: 180,
    y: 132,
    label: 'CT',
    hasRear: true,
  },
  [MechLocation.LEFT_TORSO]: {
    path: polygon(VIEWER_LEFT_SIDE.torso),
    x: 95,
    y: 132,
    label: 'LT',
    hasRear: true,
  },
  [MechLocation.RIGHT_TORSO]: {
    path: polygon(mirror(VIEWER_LEFT_SIDE.torso)),
    x: 265,
    y: 132,
    label: 'RT',
    hasRear: true,
  },
  [MechLocation.LEFT_ARM]: {
    path: polygon(VIEWER_LEFT_SIDE.arm),
    x: 17,
    y: 160,
    label: 'LA',
  },
  [MechLocation.RIGHT_ARM]: {
    path: polygon(mirror(VIEWER_LEFT_SIDE.arm)),
    x: 343,
    y: 160,
    label: 'RA',
  },
  [MechLocation.LEFT_LEG]: {
    path: polygon(VIEWER_LEFT_SIDE.leg),
    x: 134,
    y: 285,
    label: 'LL',
  },
  [MechLocation.RIGHT_LEG]: {
    path: polygon(mirror(VIEWER_LEFT_SIDE.leg)),
    x: 226,
    y: 285,
    label: 'RL',
  },
};

/**
 * Plate reading order (top row, then left to right as drawn), so Tab moves
 * across the silhouette the way the eye does.
 */
export const BIPED_PLATE_ORDER: readonly MechLocation[] = [
  MechLocation.HEAD,
  MechLocation.LEFT_ARM,
  MechLocation.LEFT_TORSO,
  MechLocation.CENTER_TORSO,
  MechLocation.RIGHT_TORSO,
  MechLocation.RIGHT_ARM,
  MechLocation.LEFT_LEG,
  MechLocation.RIGHT_LEG,
];
