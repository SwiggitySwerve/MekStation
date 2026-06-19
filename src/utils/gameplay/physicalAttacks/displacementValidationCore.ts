/**
 * Physical-attack displacement helpers.
 *
 * Per `implement-physical-attack-phase` design.md Resolved Question 1
 * (charge miss) + Resolved Question 3 (push). Mirrors MegaMek's
 * `Compute.getMissedChargeDisplacement` (Compute.java:1116-1158) and the
 * push branch of `TWGameManager.resolvePushAttack`
 * (TWGameManager.java:13452-13510).
 *
 * @spec openspec/changes/implement-physical-attack-phase/specs/physical-attack-system/spec.md
 */

import {
  Facing,
  FiringArc,
  IHexCoordinate,
  IHexGrid,
  type IPhysicalDominoStepOutContextPayload,
  type IPhysicalDominoStepOutDecisionPayload,
  type IPhysicalDominoStepOutOptionPayload,
  IPhysicalDisplacement,
} from '@/types/gameplay';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { determineArc } from '../firingArcs';
import { isInBounds } from '../hexGrid';
import { hexNeighbor } from '../hexMath';

export const DISPLACEMENT_OFFSETS = [0, 1, 5, 2, 4, 3] as const;
export const BATTLEMECH_MAX_DISPLACEMENT_ELEVATION_CHANGE = 2;
const BATTLEMECH_PROHIBITED_DISPLACEMENT_TERRAINS = new Set(['impassable']);
const BATTLEMECH_DISPLACEMENT_WOODS_TERRAINS = new Set([
  'woods',
  'light_woods',
  'heavy_woods',
  'ultra_woods',
]);
const BATTLEMECH_OVERGROWN_DISPLACEMENT_LIMIT = 2;

interface IDisplacementTerrainFeature {
  readonly type: string;
  readonly level: number;
}

export interface IDfaDisplacementOutcome {
  readonly displacements: readonly IPhysicalDisplacement[];
  readonly impossibleDisplacementDestroyedUnitId?: string;
}

export interface IChargeDisplacementOutcome {
  readonly displacements: readonly IPhysicalDisplacement[];
}

export interface IPushDisplacementOutcome {
  readonly displacements: readonly IPhysicalDisplacement[];
}

export interface IBreakGrappleDisplacementOutcome {
  readonly displacements: readonly IPhysicalDisplacement[];
}

export interface IDisplacementLegalityOptions {
  readonly excludeUnitId?: string;
  readonly source?: IHexCoordinate;
  readonly maxElevationChange?: number;
}

export interface IPreferredDisplacementOptions {
  readonly friendlyUnitIds?: readonly string[];
}

export interface IValidDisplacementSearchOptions {
  readonly sourceContainsGroundedDropShip?: boolean;
}

export type IDisplacementBlockerStepOutOption =
  IPhysicalDominoStepOutOptionPayload;
export type IDisplacementBlockerStepOutContext =
  IPhysicalDominoStepOutContextPayload;
export type IDisplacementBlockerStepOutDecision =
  IPhysicalDominoStepOutDecisionPayload;

export interface IDisplacementDominoResolutionOptions {
  readonly blockerStepOutDecision?: IDisplacementBlockerStepOutDecision;
}

export interface IDisplacementSourceUnit {
  readonly id: string;
  readonly unitType?: string;
  readonly isAirborne?: boolean;
  readonly boardId?: string;
  readonly position: IHexCoordinate;
}

function normalizeDisplacementLegalityOptions(
  optionsOrExcludeUnitId?: string | IDisplacementLegalityOptions,
): IDisplacementLegalityOptions {
  if (typeof optionsOrExcludeUnitId === 'string') {
    return { excludeUnitId: optionsOrExcludeUnitId };
  }
  return optionsOrExcludeUnitId ?? {};
}

function normalizeTerrainToken(type: string): string {
  return type.trim().toLowerCase().replaceAll('-', '_');
}

function defaultTerrainLevel(type: string): number {
  switch (type) {
    case 'light_woods':
      return 1;
    case 'heavy_woods':
      return 2;
    case 'ultra_woods':
      return 3;
    default:
      return 1;
  }
}

function terrainFeature(
  type: string,
  level?: unknown,
): IDisplacementTerrainFeature {
  const normalized = normalizeTerrainToken(type);
  const parsedLevel =
    typeof level === 'number' && Number.isFinite(level)
      ? Math.floor(level)
      : Number.NaN;
  return {
    type: normalized,
    level: parsedLevel > 0 ? parsedLevel : defaultTerrainLevel(normalized),
  };
}

export function terrainFeatures(
  terrain: string,
): readonly IDisplacementTerrainFeature[] {
  const trimmed = terrain.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[')) {
    try {
      const features = JSON.parse(trimmed) as unknown;
      if (!Array.isArray(features)) return [];
      return features.flatMap((feature) =>
        typeof feature === 'object' &&
        feature !== null &&
        'type' in feature &&
        typeof feature.type === 'string'
          ? [
              terrainFeature(
                feature.type,
                'level' in feature ? feature.level : undefined,
              ),
            ]
          : [],
      );
    } catch {
      return [];
    }
  }

  const [type = '', level] = trimmed.split(':');
  return [terrainFeature(type, Number(level))];
}

function isBattleMechDisplacementTerrainProhibited(terrain: string): boolean {
  return terrainFeatures(terrain).some((feature) => {
    if (BATTLEMECH_PROHIBITED_DISPLACEMENT_TERRAINS.has(feature.type)) {
      return true;
    }
    if (
      BATTLEMECH_DISPLACEMENT_WOODS_TERRAINS.has(feature.type) &&
      feature.level > BATTLEMECH_OVERGROWN_DISPLACEMENT_LIMIT
    ) {
      return true;
    }
    return (
      feature.type === 'jungle' &&
      feature.level > BATTLEMECH_OVERGROWN_DISPLACEMENT_LIMIT
    );
  });
}

export function coordKey(coord: IHexCoordinate): string {
  return `${coord.q},${coord.r}`;
}

function sameCoord(a: IHexCoordinate, b: IHexCoordinate): boolean {
  return a.q === b.q && a.r === b.r;
}

function isAdjacent(a: IHexCoordinate, b: IHexCoordinate): boolean {
  return directionFromAdjacent(a, b) !== undefined;
}

function coordMatches(a: IHexCoordinate, b: IHexCoordinate): boolean {
  return a.q === b.q && a.r === b.r;
}

function sameBoard(
  a: Pick<IDisplacementSourceUnit, 'boardId'>,
  b: Pick<IDisplacementSourceUnit, 'boardId'>,
): boolean {
  return (
    a.boardId === undefined ||
    b.boardId === undefined ||
    a.boardId === b.boardId
  );
}

function occupantAt(grid: IHexGrid, coord: IHexCoordinate): string | null {
  return grid.hexes.get(coordKey(coord))?.occupantId ?? null;
}

export function isFriendlyOccupiedDestination(
  grid: IHexGrid,
  coord: IHexCoordinate,
  friendlyUnitIds: ReadonlySet<string>,
): boolean {
  const occupantId = occupantAt(grid, coord);
  return occupantId !== null && friendlyUnitIds.has(occupantId);
}

function directionFromAdjacent(
  source: IHexCoordinate,
  destination: IHexCoordinate,
): Facing | undefined {
  for (let facing = 0; facing < 6; facing++) {
    const translated = translateHex(source, facing as Facing);
    if (translated.q === destination.q && translated.r === destination.r) {
      return facing as Facing;
    }
  }
  return undefined;
}

function withVisitedOccupant(
  visitedOccupants: ReadonlySet<string>,
  unitId: string,
): ReadonlySet<string> {
  const next = new Set<string>();
  visitedOccupants.forEach((visitedUnitId) => next.add(visitedUnitId));
  next.add(unitId);
  return next;
}

function isLegalBlockerStepOutDecision(
  grid: IHexGrid,
  occupiedDestination: IHexCoordinate,
  blockingUnitId: string,
  decision: IDisplacementBlockerStepOutDecision | undefined,
): boolean {
  if (!decision) return false;
  if (decision.blockerUnitId !== blockingUnitId) return false;
  if (!sameCoord(decision.from, occupiedDestination)) return false;
  if (decision.response !== 'move') return false;
  if (!decision.psrPassed) return false;
  if (!decision.context.sideEntered) return false;
  if (decision.context.blockerJumped) return false;
  if (decision.path.length === 0) return false;

  const finalStep = decision.path[decision.path.length - 1];
  if (
    !decision.context.legalStepOptions.some((option) =>
      coordMatches(option.to, finalStep),
    )
  ) {
    return false;
  }

  let previous = occupiedDestination;
  for (const step of decision.path) {
    if (!isAdjacent(previous, step)) return false;
    const stepOccupantId = occupantAt(grid, step);
    if (stepOccupantId && stepOccupantId !== blockingUnitId) return false;
    if (
      !isValidDisplacementInternal(
        grid,
        step,
        {
          excludeUnitId: blockingUnitId,
          source: previous,
          maxElevationChange: BATTLEMECH_MAX_DISPLACEMENT_ELEVATION_CHANGE,
        },
        new Set([blockingUnitId]),
      )
    ) {
      return false;
    }
    previous = step;
  }

  return !sameCoord(previous, occupiedDestination);
}

function usesBlockerStepOutDecision(
  displacements: readonly IPhysicalDisplacement[],
  decision: IDisplacementBlockerStepOutDecision | undefined,
): boolean {
  if (!decision || displacements.length === 0 || decision.path.length === 0) {
    return false;
  }
  const finalStep = decision.path[decision.path.length - 1];
  return displacements.some(
    (displacement) =>
      displacement.unitId === decision.blockerUnitId &&
      sameCoord(displacement.from, decision.from) &&
      sameCoord(displacement.to, finalStep),
  );
}

/**
 * Per Resolved Q3: thin wrapper over `hexNeighbor` to mirror MegaMek's
 * `Coords.translated(facing)` API name. `facing` is the integer 0-5
 * encoding from `Facing`.
 */
export function translateHex(
  coord: IHexCoordinate,
  facing: Facing,
): IHexCoordinate {
  return hexNeighbor(coord, facing);
}

export function translateHexByRange(
  coord: IHexCoordinate,
  facing: Facing,
  range: number,
): IHexCoordinate {
  let translated = coord;
  for (let step = 0; step < range; step++) {
    translated = translateHex(translated, facing);
  }
  return translated;
}

/**
 * Push legality uses the attacker's feet facing, not just adjacency:
 * MegaMek requires the target to occupy `attacker.position.translated(facing)`.
 */
export function isTargetDirectlyAhead(
  attackerPosition: IHexCoordinate,
  attackerFacing: Facing,
  targetPosition: IHexCoordinate,
): boolean {
  const directlyAhead = translateHex(attackerPosition, attackerFacing);
  return (
    directlyAhead.q === targetPosition.q && directlyAhead.r === targetPosition.r
  );
}

export function isTargetInFrontArc(
  attackerPosition: IHexCoordinate,
  attackerFacing: Facing,
  targetPosition: IHexCoordinate,
): boolean {
  return (
    determineArc(
      {
        unitId: 'attacker',
        coord: attackerPosition,
        facing: attackerFacing,
        prone: false,
      },
      targetPosition,
    ).arc === FiringArc.Front
  );
}

/**
 * Per Resolved Q3: a hex is a valid displacement destination when it's
 * in-bounds, does not climb beyond the BattleMech elevation-change cap, and
 * any blocking occupant can itself be displaced in the same direction. Mirrors
 * `Compute.isValidDisplacement` in MegaMek (off-map, recursive stacking, and
 * `getMaxElevationChange` checks).
 *
 * `excludeUnitId` is the entity being displaced — its current hex still
 * counts as "occupied" but should NOT block a self-displacement (the
 * caller is moving it OUT of that hex). Pass the displaced entity's id
 * to ignore its own occupant check.
 */
export function isValidDisplacement(
  grid: IHexGrid,
  coord: IHexCoordinate,
  optionsOrExcludeUnitId?: string | IDisplacementLegalityOptions,
): boolean {
  const options = normalizeDisplacementLegalityOptions(optionsOrExcludeUnitId);
  return isValidDisplacementInternal(grid, coord, options, new Set());
}

function isValidDisplacementInternal(
  grid: IHexGrid,
  coord: IHexCoordinate,
  options: IDisplacementLegalityOptions,
  visitedOccupants: ReadonlySet<string>,
): boolean {
  if (!isInBounds(grid, coord)) return false;
  const hex = grid.hexes.get(coordKey(coord));
  if (hex && isBattleMechDisplacementTerrainProhibited(hex.terrain)) {
    return false;
  }

  if (
    options.source !== undefined &&
    options.maxElevationChange !== undefined &&
    Number.isFinite(options.maxElevationChange)
  ) {
    const sourceHex = grid.hexes.get(`${options.source.q},${options.source.r}`);
    const elevationChange = (hex?.elevation ?? 0) - (sourceHex?.elevation ?? 0);
    if (elevationChange > options.maxElevationChange) return false;
  }

  if (!hex?.occupantId) return true;
  // Same-unit-already-here case: allow.
  const occupiedByDisplacedUnit =
    options.excludeUnitId !== undefined &&
    hex.occupantId === options.excludeUnitId;
  if (occupiedByDisplacedUnit) return true;

  const blockingUnitId = hex.occupantId;
  if (
    !blockingUnitId ||
    options.source === undefined ||
    visitedOccupants.has(blockingUnitId)
  ) {
    return false;
  }

  const direction = directionFromAdjacent(options.source, coord);
  if (direction === undefined) return false;

  return isValidDisplacementInternal(
    grid,
    translateHex(coord, direction),
    {
      excludeUnitId: blockingUnitId,
      source: coord,
      maxElevationChange: options.maxElevationChange,
    },
    withVisitedOccupant(visitedOccupants, blockingUnitId),
  );
}

function computeDominoChainFromDestination(
  grid: IHexGrid,
  destination: IHexCoordinate,
  direction: Facing,
  displacedUnitId: string,
  options: IDisplacementDominoResolutionOptions,
  visitedOccupants: ReadonlySet<string> = new Set(),
): readonly IPhysicalDisplacement[] | null {
  const blockingUnitId = occupantAt(grid, destination);
  if (!blockingUnitId || blockingUnitId === displacedUnitId) return [];
  if (visitedOccupants.has(blockingUnitId)) return null;

  const stepOutDecision = options.blockerStepOutDecision;
  if (
    stepOutDecision &&
    isLegalBlockerStepOutDecision(
      grid,
      destination,
      blockingUnitId,
      stepOutDecision,
    )
  ) {
    const path = stepOutDecision.path;
    return [
      {
        unitId: blockingUnitId,
        from: destination,
        to: path[path.length - 1],
        reason: 'domino_step_out',
      },
    ];
  }

  const blockerDestination = translateHex(destination, direction);
  if (
    !isValidDisplacementInternal(
      grid,
      blockerDestination,
      {
        excludeUnitId: blockingUnitId,
        source: destination,
        maxElevationChange: BATTLEMECH_MAX_DISPLACEMENT_ELEVATION_CHANGE,
      },
      withVisitedOccupant(visitedOccupants, blockingUnitId),
    )
  ) {
    return null;
  }

  const downstream = computeDominoChainFromDestination(
    grid,
    blockerDestination,
    direction,
    blockingUnitId,
    options,
    withVisitedOccupant(visitedOccupants, blockingUnitId),
  );
  if (downstream === null) return null;

  return [
    {
      unitId: blockingUnitId,
      from: destination,
      to: blockerDestination,
      reason: 'domino',
    },
    ...downstream,
  ];
}

function dominoChainForDisplacement(
  grid: IHexGrid,
  displacedUnitId: string,
  source: IHexCoordinate,
  destination: IHexCoordinate,
  options: IDisplacementDominoResolutionOptions = {},
): readonly IPhysicalDisplacement[] | null {
  const direction = directionFromAdjacent(source, destination);
  if (direction === undefined) {
    return occupantAt(grid, destination) === null ? [] : null;
  }
  return computeDominoChainFromDestination(
    grid,
    destination,
    direction,
    displacedUnitId,
    options,
  );
}

export function computeDisplacementWithDominoChain(options: {
  readonly grid: IHexGrid;
  readonly unitId: string;
  readonly from: IHexCoordinate;
  readonly to: IHexCoordinate;
  readonly reason: Exclude<
    IPhysicalDisplacement['reason'],
    'domino' | 'domino_step_out'
  >;
  readonly blockerStepOutDecision?: IDisplacementBlockerStepOutDecision;
}): readonly IPhysicalDisplacement[] | null {
  const dominoChain = dominoChainForDisplacement(
    options.grid,
    options.unitId,
    options.from,
    options.to,
    { blockerStepOutDecision: options.blockerStepOutDecision },
  );
  if (dominoChain === null) return null;

  const displacedUnit: IPhysicalDisplacement = {
    unitId: options.unitId,
    from: options.from,
    to: options.to,
    reason: options.reason,
  };

  return usesBlockerStepOutDecision(dominoChain, options.blockerStepOutDecision)
    ? [...dominoChain, displacedUnit]
    : [displacedUnit, ...dominoChain];
}

export function sourceContainsGroundedDropShip(
  units: readonly IDisplacementSourceUnit[],
  displacedUnit: IDisplacementSourceUnit,
): boolean {
  for (const unit of units) {
    if (unit.id === displacedUnit.id) continue;
    if (unit.unitType !== UnitType.DROPSHIP) continue;
    if (unit.isAirborne === true) continue;
    if (!sameBoard(unit, displacedUnit)) continue;
    if (!sameCoord(unit.position, displacedUnit.position)) continue;
    return true;
  }

  return false;
}

export function isLegalBattleMechDisplacement(
  grid: IHexGrid,
  unitId: string,
  source: IHexCoordinate,
  destination: IHexCoordinate,
): boolean {
  return isValidDisplacement(grid, destination, {
    excludeUnitId: unitId,
    source,
    maxElevationChange: BATTLEMECH_MAX_DISPLACEMENT_ELEVATION_CHANGE,
  });
}

export function isLegalBreakGrappleDestination(
  grid: IHexGrid,
  unitId: string,
  source: IHexCoordinate,
  destination: IHexCoordinate,
): boolean {
  const hex = grid.hexes.get(coordKey(destination));
  if (hex?.occupantId && hex.occupantId !== unitId) {
    return false;
  }
  return isValidDisplacement(grid, destination, {
    excludeUnitId: unitId,
    source,
  });
}
