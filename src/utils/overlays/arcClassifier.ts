import type { IHexCoordinate, IUnitPosition } from '@/types/gameplay';

import { FiringArc } from '@/types/gameplay';
import { determineArc } from '@/utils/gameplay/firingArcs';
import { coordToKey, hexDistance, hexEquals } from '@/utils/gameplay/hexMath';

export type UiFiringArc =
  | 'front'
  | 'left-side'
  | 'right-side'
  | 'rear'
  | 'out-of-arc';

export interface ArcClassifierUnit {
  readonly coord: IHexCoordinate;
  readonly facing: IUnitPosition['facing'];
  readonly unitId?: string;
  readonly prone?: boolean;
}

export type ArcMapBounds = ReadonlySet<string> | readonly IHexCoordinate[];

export interface ArcClassifierOptions {
  readonly mapHexes?: ArcMapBounds;
  readonly maxRange?: number;
  readonly includeOrigin?: boolean;
  readonly visibleArcs?: readonly UiFiringArc[];
}

export interface ArcHexClassification {
  readonly hex: IHexCoordinate;
  readonly arc: UiFiringArc;
  readonly distance: number;
}

function isCoordinateList(
  mapHexes: ArcMapBounds,
): mapHexes is readonly IHexCoordinate[] {
  return Array.isArray(mapHexes);
}

function mapContainsHex(
  mapHexes: ArcMapBounds | undefined,
  hex: IHexCoordinate,
): boolean {
  if (!mapHexes) return true;
  if (isCoordinateList(mapHexes)) {
    return mapHexes.some((candidate) => hexEquals(candidate, hex));
  }
  return mapHexes.has(coordToKey(hex));
}

function toUnitPosition(unit: ArcClassifierUnit): IUnitPosition {
  return {
    unitId: unit.unitId ?? 'overlay-unit',
    coord: unit.coord,
    facing: unit.facing,
    prone: unit.prone ?? false,
  };
}

export function firingArcToUiArc(arc: FiringArc): UiFiringArc {
  switch (arc) {
    case FiringArc.Front:
      return 'front';
    case FiringArc.Left:
      return 'left-side';
    case FiringArc.Right:
      return 'right-side';
    case FiringArc.Rear:
      return 'rear';
  }
}

export function classifyFiringArc(
  unit: ArcClassifierUnit,
  target: IHexCoordinate,
  options: ArcClassifierOptions = {},
): UiFiringArc {
  if (!mapContainsHex(options.mapHexes, target)) {
    return 'out-of-arc';
  }

  if (options.includeOrigin === false && hexEquals(unit.coord, target)) {
    return 'out-of-arc';
  }

  const distance = hexDistance(unit.coord, target);
  if (options.maxRange !== undefined && distance > options.maxRange) {
    return 'out-of-arc';
  }

  const arc = firingArcToUiArc(determineArc(toUnitPosition(unit), target).arc);
  if (options.visibleArcs && !options.visibleArcs.includes(arc)) {
    return 'out-of-arc';
  }

  return arc;
}

export function classifyFiringArcHexes(
  unit: ArcClassifierUnit,
  hexes: readonly IHexCoordinate[],
  options: ArcClassifierOptions = {},
): readonly ArcHexClassification[] {
  return hexes.map((hex) => ({
    hex,
    arc: classifyFiringArc(unit, hex, options),
    distance: hexDistance(unit.coord, hex),
  }));
}

export function createFiringArcClassifier(
  unit: ArcClassifierUnit,
  options: ArcClassifierOptions = {},
): (target: IHexCoordinate) => UiFiringArc {
  const cache = new Map<string, UiFiringArc>();

  return (target: IHexCoordinate): UiFiringArc => {
    const key = coordToKey(target);
    const cached = cache.get(key);
    if (cached) return cached;

    const arc = classifyFiringArc(unit, target, options);
    cache.set(key, arc);
    return arc;
  };
}
