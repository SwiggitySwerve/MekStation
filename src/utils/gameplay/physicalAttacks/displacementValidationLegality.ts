import { Facing, IHexCoordinate, IHexGrid, IPhysicalDisplacement } from '@/types/gameplay';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { isInBounds } from '../hexGrid';
import {
  BATTLEMECH_MAX_DISPLACEMENT_ELEVATION_CHANGE,
  type IDisplacementBlockerStepOutDecision,
  type IDisplacementDominoResolutionOptions,
  type IDisplacementLegalityOptions,
  type IDisplacementSourceUnit,
} from './displacementValidationTypes';
import {
  coordKey,
  directionFromAdjacent,
  isAdjacent,
  isBattleMechDisplacementTerrainProhibited,
  occupantAt,
  sameCoord,
  translateHex,
} from './displacementValidationGeometry';

function normalizeDisplacementLegalityOptions(
  optionsOrExcludeUnitId?: string | IDisplacementLegalityOptions,
): IDisplacementLegalityOptions {
  if (typeof optionsOrExcludeUnitId === 'string') {
    return { excludeUnitId: optionsOrExcludeUnitId };
  }
  return optionsOrExcludeUnitId ?? {};
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
 * Per Resolved Q3: a hex is a valid displacement destination when it's
 * in-bounds, does not climb beyond the BattleMech elevation-change cap, and
 * any blocking occupant can itself be displaced in the same direction.
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

/** Builds the primary displacement plus any required domino chain. */
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

/** True when a grounded DropShip shares the displaced unit's hex. */
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

/** BattleMech displacement legality with elevation-change cap. */
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

/** Break-grapple destination may not land on another unit. */
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
