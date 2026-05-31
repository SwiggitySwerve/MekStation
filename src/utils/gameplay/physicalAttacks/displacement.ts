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
  IPhysicalDisplacement,
} from '@/types/gameplay';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { D6Roller } from '../diceTypes';
import { determineArc } from '../firingArcs';
import { isInBounds } from '../hexGrid';
import { hexNeighbor } from '../hexMath';

const DISPLACEMENT_OFFSETS = [0, 1, 5, 2, 4, 3] as const;
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

interface IDisplacementSourceUnit {
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

function terrainFeatures(
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

function coordKey(coord: IHexCoordinate): string {
  return `${coord.q},${coord.r}`;
}

function sameCoord(a: IHexCoordinate, b: IHexCoordinate): boolean {
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

function isFriendlyOccupiedDestination(
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

function translateHexByRange(
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
  visitedOccupants: ReadonlySet<string> = new Set(),
): readonly IPhysicalDisplacement[] | null {
  const blockingUnitId = occupantAt(grid, destination);
  if (!blockingUnitId || blockingUnitId === displacedUnitId) return [];
  if (visitedOccupants.has(blockingUnitId)) return null;

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
  );
}

export function computeDisplacementWithDominoChain(options: {
  readonly grid: IHexGrid;
  readonly unitId: string;
  readonly from: IHexCoordinate;
  readonly to: IHexCoordinate;
  readonly reason: Exclude<IPhysicalDisplacement['reason'], 'domino'>;
}): readonly IPhysicalDisplacement[] | null {
  const dominoChain = dominoChainForDisplacement(
    options.grid,
    options.unitId,
    options.from,
    options.to,
  );
  if (dominoChain === null) return null;

  return [
    {
      unitId: options.unitId,
      from: options.from,
      to: options.to,
      reason: options.reason,
    },
    ...dominoChain,
  ];
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

function isLegalBattleMechDisplacement(
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

function appendAttackerFollowThrough(
  displacements: readonly IPhysicalDisplacement[],
  attackerId: string,
  attackerPosition: IHexCoordinate,
  targetPosition: IHexCoordinate,
  reason: 'push' | 'charge' | 'dfa' | 'dfa_miss',
): readonly IPhysicalDisplacement[] {
  return [
    ...displacements,
    {
      unitId: attackerId,
      from: attackerPosition,
      to: targetPosition,
      reason,
    },
  ];
}

/**
 * Per `implement-physical-attack-phase` Resolved Q1 (charge miss): on
 * miss, the attacker is displaced to one of the two side hexes 60° off
 * the charge direction (`(facing + 1) % 6` or `(facing + 5) % 6`) from
 * the attacker's pre-charge source position. The higher-elevation hex
 * is preferred; on tie, the seeded RNG picks. If neither side hex is
 * a valid displacement target, returns the source hex (attacker stays
 * put).
 *
 * Returns the resolved destination coordinate. Caller is responsible
 * for emitting the position-change event; this helper is pure and
 * has no side effects.
 *
 * Source: MegaMek `Compute.getMissedChargeDisplacement`
 * (Compute.java:1116-1158).
 */
export function computeMissedChargeDisplacement(
  grid: IHexGrid,
  attackerId: string,
  source: IHexCoordinate,
  facing: Facing,
  d6: D6Roller,
): IHexCoordinate {
  const leftFacing = ((facing + 5) % 6) as Facing;
  const rightFacing = ((facing + 1) % 6) as Facing;
  const leftHex = translateHex(source, leftFacing);
  const rightHex = translateHex(source, rightFacing);

  const options = {
    excludeUnitId: attackerId,
    source,
    maxElevationChange: BATTLEMECH_MAX_DISPLACEMENT_ELEVATION_CHANGE,
  };
  const leftValid = isValidDisplacement(grid, leftHex, options);
  const rightValid = isValidDisplacement(grid, rightHex, options);

  if (!leftValid && !rightValid) return source;
  if (leftValid && !rightValid) return leftHex;
  if (rightValid && !leftValid) return rightHex;

  // Both valid — prefer higher elevation.
  const leftElev = grid.hexes.get(`${leftHex.q},${leftHex.r}`)?.elevation ?? 0;
  const rightElev =
    grid.hexes.get(`${rightHex.q},${rightHex.r}`)?.elevation ?? 0;
  if (leftElev > rightElev) return leftHex;
  if (rightElev > leftElev) return rightHex;

  // Tie on elevation — seeded RNG picks per Compute.java:1147-1153.
  const roll = d6();
  return roll <= 3 ? leftHex : rightHex;
}

/**
 * Per `implement-physical-attack-phase` task 8.3 + Resolved Q3:
 * compute the push destination — one hex in the attacker's facing
 * direction from the target's current position. Returns the destination
 * coordinate (which may be off-map; caller validates via
 * `isValidDisplacement`).
 *
 * Source: MegaMek `TWGameManager.java:13452-13460`.
 */
export function computePushDisplacement(
  targetPosition: IHexCoordinate,
  attackerFacing: Facing,
): IHexCoordinate {
  return translateHex(targetPosition, attackerFacing);
}

export function computePushDisplacementOutcome(options: {
  readonly grid: IHexGrid;
  readonly attackerId: string;
  readonly attackerPosition: IHexCoordinate;
  readonly attackerFacing: Facing;
  readonly targetId: string;
  readonly targetPosition: IHexCoordinate;
}): IPushDisplacementOutcome {
  const {
    attackerFacing,
    attackerId,
    attackerPosition,
    grid,
    targetId,
    targetPosition,
  } = options;
  const targetDestination = computePushDisplacement(
    targetPosition,
    attackerFacing,
  );

  if (
    !isLegalBattleMechDisplacement(
      grid,
      targetId,
      targetPosition,
      targetDestination,
    )
  ) {
    return { displacements: [] };
  }

  const targetDisplacements = computeDisplacementWithDominoChain({
    grid,
    unitId: targetId,
    from: targetPosition,
    to: targetDestination,
    reason: 'push',
  });
  if (targetDisplacements === null) return { displacements: [] };

  return {
    displacements: appendAttackerFollowThrough(
      targetDisplacements,
      attackerId,
      attackerPosition,
      targetPosition,
      'push',
    ),
  };
}

/**
 * Source-backed successful charge displacement. MegaMek resolves charge damage
 * before this branch; if the target's forward hex is invalid, neither unit is
 * displaced and the result is not treated as impossible-displacement
 * destruction.
 *
 * Source: MegaMek `TWGameManager.resolveChargeDamage`
 * (`TWGameManager.java:14884-14892`).
 */
export function computeChargeDisplacementOutcome(options: {
  readonly grid: IHexGrid;
  readonly attackerId: string;
  readonly attackerPosition: IHexCoordinate;
  readonly attackerFacing: Facing;
  readonly targetId: string;
  readonly targetPosition: IHexCoordinate;
}): IChargeDisplacementOutcome {
  const {
    attackerFacing,
    attackerId,
    attackerPosition,
    grid,
    targetId,
    targetPosition,
  } = options;
  const targetDestination = computePushDisplacement(
    targetPosition,
    attackerFacing,
  );

  if (
    !isLegalBattleMechDisplacement(
      grid,
      targetId,
      targetPosition,
      targetDestination,
    )
  ) {
    return { displacements: [] };
  }

  const targetDisplacements = computeDisplacementWithDominoChain({
    grid,
    unitId: targetId,
    from: targetPosition,
    to: targetDestination,
    reason: 'charge',
  });
  if (targetDisplacements === null) return { displacements: [] };

  return {
    displacements: appendAttackerFollowThrough(
      targetDisplacements,
      attackerId,
      attackerPosition,
      targetPosition,
      'charge',
    ),
  };
}

/**
 * Mirrors MegaMek `Compute.getValidDisplacement`: choose the first legal
 * destination nearest to the displacement direction. Normal displacement uses
 * adjacent radius-one hexes; when the source contains a grounded DropShip
 * central hex, MegaMek searches the radius-two ring instead.
 *
 * Source: MegaMek `Compute.java:1019-1046`.
 */
export function computeValidDisplacement(
  grid: IHexGrid,
  displacedUnitId: string,
  source: IHexCoordinate,
  direction: Facing,
  options: IValidDisplacementSearchOptions = {},
): IHexCoordinate | null {
  const range = options.sourceContainsGroundedDropShip ? 2 : 1;

  for (const offset of DISPLACEMENT_OFFSETS) {
    let candidate = translateHexByRange(
      source,
      ((direction + offset) % 6) as Facing,
      range,
    );
    if (
      isValidDisplacement(grid, candidate, {
        excludeUnitId: displacedUnitId,
        source,
        maxElevationChange: BATTLEMECH_MAX_DISPLACEMENT_ELEVATION_CHANGE,
      })
    ) {
      return candidate;
    }

    // MegaMek borrows its radius-ring walk from Compute.coordsAtRange:
    // after testing the spoke hex, walk along the ring toward the next offset.
    for (let count = 1; count < range; count++) {
      candidate = translateHex(
        candidate,
        ((direction + offset + 2) % 6) as Facing,
      );
      if (
        isValidDisplacement(grid, candidate, {
          excludeUnitId: displacedUnitId,
          source,
          maxElevationChange: BATTLEMECH_MAX_DISPLACEMENT_ELEVATION_CHANGE,
        })
      ) {
        return candidate;
      }
    }
  }

  return null;
}

/**
 * Mirrors MegaMek `Compute.getPreferredDisplacement` for DFA misses: scan
 * nearest-to-direction hexes, prefer same elevation, otherwise keep the
 * highest legal elevation. When caller supplies same-side target friendlies,
 * first prefer destinations that are not occupied by those friendlies.
 *
 * Source: MegaMek `Compute.java:1056-1114`.
 */
export function computePreferredDisplacement(
  grid: IHexGrid,
  displacedUnitId: string,
  source: IHexCoordinate,
  direction: Facing,
  options: IPreferredDisplacementOptions = {},
): IHexCoordinate | null {
  const sourceElevation =
    grid.hexes.get(`${source.q},${source.r}`)?.elevation ?? 0;
  const friendlyUnitIds = new Set(options.friendlyUnitIds ?? []);

  const bestCandidate = (skipFriendly: boolean): IHexCoordinate | null => {
    let highest: IHexCoordinate | null = null;
    let highestElevation = Number.NEGATIVE_INFINITY;

    for (const offset of DISPLACEMENT_OFFSETS) {
      const candidate = translateHex(
        source,
        ((direction + offset) % 6) as Facing,
      );
      if (
        !isValidDisplacement(grid, candidate, {
          excludeUnitId: displacedUnitId,
          source,
          maxElevationChange: BATTLEMECH_MAX_DISPLACEMENT_ELEVATION_CHANGE,
        })
      ) {
        continue;
      }
      if (
        skipFriendly &&
        isFriendlyOccupiedDestination(grid, candidate, friendlyUnitIds)
      ) {
        continue;
      }

      const elevation =
        grid.hexes.get(`${candidate.q},${candidate.r}`)?.elevation ?? 0;
      if (elevation > highestElevation) {
        highestElevation = elevation;
        highest = candidate;
      }
      if (elevation === sourceElevation) {
        return candidate;
      }
    }

    return highest;
  };

  if (friendlyUnitIds.size > 0) {
    const nonFriendlyCandidate = bestCandidate(true);
    if (nonFriendlyCandidate) {
      return nonFriendlyCandidate;
    }
  }

  return bestCandidate(false);
}

/**
 * Source-backed DFA displacement:
 * - hit: target is displaced by `getValidDisplacement`, attacker occupies
 *   the target's original hex.
 * - miss: target uses `getPreferredDisplacement`, attacker falls into the
 *   target's original hex.
 *
 * If the target cannot be displaced, MegaMek enters an "impossible
 * displacement" destruction branch:
 * - hit: target is destroyed and the attacker lands in the target hex.
 * - miss: attacker is destroyed and no displacement occurs.
 *
 * Source: MegaMek `TWGameManager.resolveDfaAttack`
 * (`TWGameManager.java:15225-15265`, `15352-15422`).
 */
export function computeDfaDisplacementOutcome(options: {
  readonly grid: IHexGrid;
  readonly attackerId: string;
  readonly attackerPosition: IHexCoordinate;
  readonly attackerFacing: Facing;
  readonly targetId: string;
  readonly targetPosition: IHexCoordinate;
  readonly hit: boolean;
  readonly targetFriendlyUnitIds?: readonly string[];
  readonly targetSourceContainsGroundedDropShip?: boolean;
}): IDfaDisplacementOutcome {
  const {
    attackerFacing,
    attackerId,
    attackerPosition,
    grid,
    hit,
    targetId,
    targetPosition,
  } = options;

  const targetDestination = hit
    ? computeValidDisplacement(grid, targetId, targetPosition, attackerFacing, {
        sourceContainsGroundedDropShip:
          options.targetSourceContainsGroundedDropShip,
      })
    : computePreferredDisplacement(
        grid,
        targetId,
        targetPosition,
        attackerFacing,
        { friendlyUnitIds: options.targetFriendlyUnitIds },
      );

  if (!targetDestination) {
    return {
      displacements: hit
        ? [
            {
              unitId: attackerId,
              from: attackerPosition,
              to: targetPosition,
              reason: 'dfa',
            },
          ]
        : [],
      impossibleDisplacementDestroyedUnitId: hit ? targetId : attackerId,
    };
  }

  const reason = hit ? 'dfa' : 'dfa_miss';
  const targetDisplacements = computeDisplacementWithDominoChain({
    grid,
    unitId: targetId,
    from: targetPosition,
    to: targetDestination,
    reason,
  });
  if (targetDisplacements === null) {
    return { displacements: [] };
  }

  return {
    displacements: appendAttackerFollowThrough(
      targetDisplacements,
      attackerId,
      attackerPosition,
      targetPosition,
      reason,
    ),
  };
}

export function computeDfaDisplacements(
  options: Parameters<typeof computeDfaDisplacementOutcome>[0],
): readonly IPhysicalDisplacement[] {
  return computeDfaDisplacementOutcome(options).displacements;
}
