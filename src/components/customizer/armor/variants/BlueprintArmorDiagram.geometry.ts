/**
 * Blueprint biped armor geometry: the plates built from the record-sheet
 * outlines (inset so neighbours stay apart, with focus rings outside them),
 * the view frames, the fists and the type sizes, all in record-sheet units.
 *
 * @spec openspec/specs/armor-diagram/spec.md
 */

import { MechLocation } from '@/types/construction';

import {
  BLUEPRINT_AXIS as AXIS,
  FRONT_ANCHORS,
  FRONT_OUTLINES,
  LEFT_FIST_LINES,
  LEFT_FIST_OUTLINE,
  REAR_ANCHORS,
  REAR_OUTLINES,
  mirrorPoint,
  type Point,
  type Polygon,
} from './BlueprintArmorDiagram.outlines';

export type BlueprintView = 'front' | 'rear';

export interface BlueprintBounds {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

export interface BlueprintPlate {
  readonly location: MechLocation;
  readonly code: string;
  readonly view: BlueprintView;
  /** Plate outline, inset from the sheet outline so neighbours stay apart. */
  readonly points: Polygon;
  readonly path: string;
  /** Keyboard focus ring, offset outside the plate outline. */
  readonly ringPath: string;
  readonly bounds: BlueprintBounds;
  /** Centre of the plate's label block. */
  readonly anchor: Point;
}

/**
 * Inset that leaves a 3.2px gutter between neighbouring plates at the
 * diagram's ~1.93 px-per-unit drawing scale.
 */
const PLATE_INSET = 0.83;
/** Focus ring centre line, outside the plate edge: about a 2px clear gap. */
const RING_OFFSET = 1.9;

export const BLUEPRINT_CODES: Readonly<Record<string, string>> = {
  [MechLocation.HEAD]: 'HD',
  [MechLocation.CENTER_TORSO]: 'CT',
  [MechLocation.LEFT_TORSO]: 'LT',
  [MechLocation.RIGHT_TORSO]: 'RT',
  [MechLocation.LEFT_ARM]: 'LA',
  [MechLocation.RIGHT_ARM]: 'RA',
  [MechLocation.LEFT_LEG]: 'LL',
  [MechLocation.RIGHT_LEG]: 'RL',
};

/** Reading order: the top row, then left to right as drawn. */
const FRONT_ORDER: readonly MechLocation[] = [
  MechLocation.HEAD,
  MechLocation.LEFT_ARM,
  MechLocation.LEFT_TORSO,
  MechLocation.CENTER_TORSO,
  MechLocation.RIGHT_TORSO,
  MechLocation.RIGHT_ARM,
  MechLocation.LEFT_LEG,
  MechLocation.RIGHT_LEG,
];
const REAR_ORDER: readonly MechLocation[] = [
  MechLocation.LEFT_TORSO,
  MechLocation.CENTER_TORSO,
  MechLocation.RIGHT_TORSO,
];

// ------------------------------------------------------------------ polygons

const round = (value: number): number => Math.round(value * 100) / 100;

function signedArea(points: Polygon): number {
  return (
    points.reduce((sum, [x, y], i) => {
      const [u, v] = points[(i + 1) % points.length];
      return sum + x * v - u * y;
    }, 0) / 2
  );
}

/**
 * Offset a simple polygon by `distance` (positive = inward) with mitred
 * corners. A mitre that would reach more than three offsets from its corner
 * (the arm's shoulder spikes when grown outward) is bevelled instead.
 */
export function offsetPolygon(points: Polygon, distance: number): Point[] {
  const sign = signedArea(points) > 0 ? 1 : -1;
  const n = points.length;
  const edges = points.map((a, i) => {
    const b = points[(i + 1) % n];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const length = Math.hypot(dx, dy);
    const nx = (-dy / length) * sign;
    const ny = (dx / length) * sign;
    return {
      start: [a[0] + nx * distance, a[1] + ny * distance] as Point,
      dir: [dx / length, dy / length] as Point,
      nx,
      ny,
    };
  });
  const out: Point[] = [];
  points.forEach((corner, i) => {
    const prev = edges[(i - 1 + n) % n];
    const next = edges[i];
    const cross = prev.dir[0] * next.dir[1] - prev.dir[1] * next.dir[0];
    if (Math.abs(cross) < 1e-6) {
      out.push([
        corner[0] + next.nx * distance,
        corner[1] + next.ny * distance,
      ]);
      return;
    }
    const wx = next.start[0] - prev.start[0];
    const wy = next.start[1] - prev.start[1];
    const t = (wx * next.dir[1] - wy * next.dir[0]) / cross;
    const mitre: Point = [
      prev.start[0] + prev.dir[0] * t,
      prev.start[1] + prev.dir[1] * t,
    ];
    if (
      Math.hypot(mitre[0] - corner[0], mitre[1] - corner[1]) >
      3 * Math.abs(distance)
    ) {
      out.push(
        [corner[0] + prev.nx * distance, corner[1] + prev.ny * distance],
        [corner[0] + next.nx * distance, corner[1] + next.ny * distance],
      );
      return;
    }
    out.push(mitre);
  });
  return out;
}

export function polygonPath(points: Polygon): string {
  return `M${points.map(([x, y]) => `${round(x)} ${round(y)}`).join('L')}Z`;
}

function polylinePath(points: Polygon): string {
  return `M${points.map(([x, y]) => `${round(x)} ${round(y)}`).join('L')}`;
}

function boundsOf(points: Polygon): BlueprintBounds {
  return points.reduce(
    (b, [x, y]) => ({
      x0: Math.min(b.x0, x),
      y0: Math.min(b.y0, y),
      x1: Math.max(b.x1, x),
      y1: Math.max(b.y1, y),
    }),
    { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity },
  );
}

/**
 * The runs where a horizontal line at `y` lies inside the polygon, as
 * [left, right] pairs. Used to draw a plate's fill-level line edge to edge.
 */
export function horizontalSpans(
  points: Polygon,
  y: number,
): Array<[number, number]> {
  const crossings: number[] = [];
  points.forEach(([x1, y1], i) => {
    const [x2, y2] = points[(i + 1) % points.length];
    if ((y1 <= y && y < y2) || (y2 <= y && y < y1))
      crossings.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
  });
  crossings.sort((a, b) => a - b);
  const spans: Array<[number, number]> = [];
  for (let i = 0; i + 1 < crossings.length; i += 2)
    spans.push([crossings[i], crossings[i + 1]]);
  return spans;
}

function buildPlate(
  location: MechLocation,
  view: BlueprintView,
  outline: Polygon,
  anchor: Point,
): BlueprintPlate {
  const points = offsetPolygon(outline, PLATE_INSET);
  return {
    location,
    code: BLUEPRINT_CODES[location],
    view,
    points,
    path: polygonPath(points),
    ringPath: polygonPath(offsetPolygon(points, -RING_OFFSET)),
    bounds: boundsOf(points),
    anchor,
  };
}

export const BLUEPRINT_FRONT_PLATES: readonly BlueprintPlate[] =
  FRONT_ORDER.map((location) =>
    buildPlate(
      location,
      'front',
      FRONT_OUTLINES[location],
      FRONT_ANCHORS[location],
    ),
  );

export const BLUEPRINT_REAR_PLATES: readonly BlueprintPlate[] = REAR_ORDER.map(
  (location) =>
    buildPlate(
      location,
      'rear',
      REAR_OUTLINES[location],
      REAR_ANCHORS[location],
    ),
);

// ------------------------------------------------------------------ frames

const FRONT_BOX = { x0: 0.8, y0: 9.6, x1: 176, y1: 256.4 };

/** Front view: the figure, its centre line above the head and ground line. */
export const BLUEPRINT_FRONT_VIEWBOX = '-1.2 4 178.4 256';
/** Rear view: the sheet's rear-torso inset. */
export const BLUEPRINT_REAR_VIEWBOX = '38.5 236.9 99.8 88';

/** Drafting centre line (dash-dot), drawn under the plates. */
export const BLUEPRINT_CENTRE_LINE = {
  x: AXIS,
  y1: FRONT_BOX.y0 - 5,
  y2: FRONT_BOX.y1 + 3,
} as const;

/** Ground line under the feet. */
export const BLUEPRINT_GROUND_LINE = {
  x1: FRONT_BOX.x0 + 2,
  x2: FRONT_BOX.x1 - 2,
  y: FRONT_BOX.y1 + 0.8,
} as const;

/**
 * The fists, drawn as faint detail inside each arm's button: the outline joins
 * the arm's hit area so nothing floats apart from its plate.
 */
export interface BlueprintFist {
  readonly detail: string;
  readonly hitArea: string;
}

export const BLUEPRINT_FISTS: Readonly<Record<string, BlueprintFist>> = {
  [MechLocation.LEFT_ARM]: {
    detail: LEFT_FIST_LINES.map(polylinePath).join(''),
    hitArea: polygonPath(LEFT_FIST_OUTLINE),
  },
  [MechLocation.RIGHT_ARM]: {
    detail: LEFT_FIST_LINES.map((line) =>
      polylinePath(line.map(mirrorPoint)),
    ).join(''),
    hitArea: polygonPath(LEFT_FIST_OUTLINE.map(mirrorPoint)),
  },
};

/**
 * Type sizes in viewBox units. Both views draw at about 1.93 px per unit on
 * desktop and 1.95 on a 390px phone, so 7 units renders at 13.5px or more.
 */
export const BLUEPRINT_TYPE = {
  code: 7,
  value: 8.6,
  small: 7,
  /** Baseline-to-baseline step inside a label block. */
  gap: 9.3,
} as const;
