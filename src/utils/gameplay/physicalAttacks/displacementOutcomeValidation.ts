import {
  type Facing,
  type IHexCoordinate,
  type IHexGrid,
  type IPhysicalDisplacement,
} from '@/types/gameplay';

import type {
  IBreakGrappleDisplacementOutcome,
  IChargeDisplacementOutcome,
  IDfaDisplacementOutcome,
  IDisplacementBlockerStepOutDecision,
  IPreferredDisplacementOptions,
  IPushDisplacementOutcome,
  IValidDisplacementSearchOptions,
} from './displacementValidationCore';

import { D6Roller } from '../diceTypes';
import {
  BATTLEMECH_MAX_DISPLACEMENT_ELEVATION_CHANGE,
  DISPLACEMENT_OFFSETS,
  computeDisplacementWithDominoChain,
  coordKey,
  isFriendlyOccupiedDestination,
  isLegalBattleMechDisplacement,
  isLegalBreakGrappleDestination,
  isValidDisplacement,
  terrainFeatures,
  translateHex,
  translateHexByRange,
} from './displacementValidationCore';

function breakGrappleDestinationScore(
  grid: IHexGrid,
  source: IHexCoordinate,
  destination: IHexCoordinate,
): number {
  const sourceElevation = grid.hexes.get(coordKey(source))?.elevation ?? 0;
  const destinationHex = grid.hexes.get(coordKey(destination));
  const destinationElevation = destinationHex?.elevation ?? 0;
  const terrainScore = terrainFeatures(destinationHex?.terrain ?? '').reduce(
    (score, feature) => {
      if (feature.type.includes('magma')) return score + 10;
      if (feature.type.includes('water')) return score + feature.level;
      return score;
    },
    0,
  );
  const drop = sourceElevation - destinationElevation;
  return terrainScore + (drop >= 2 ? drop * 2 : 0);
}

function chooseBreakGrappleDestination(options: {
  readonly grid: IHexGrid;
  readonly source: IHexCoordinate;
  readonly unitId: string;
  readonly preferDangerous: boolean;
}): IHexCoordinate | null {
  const candidates: {
    readonly coord: IHexCoordinate;
    readonly score: number;
    readonly facing: number;
  }[] = [];

  for (let facing = 0; facing < 6; facing++) {
    const coord = translateHex(options.source, facing as Facing);
    if (
      !isLegalBreakGrappleDestination(
        options.grid,
        options.unitId,
        options.source,
        coord,
      )
    ) {
      continue;
    }
    candidates.push({
      coord,
      score: breakGrappleDestinationScore(options.grid, options.source, coord),
      facing,
    });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    const scoreDelta = options.preferDangerous
      ? b.score - a.score
      : a.score - b.score;
    if (scoreDelta !== 0) return scoreDelta;
    return a.facing - b.facing;
  });
  return candidates[0].coord;
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
  readonly blockerStepOutDecision?: IDisplacementBlockerStepOutDecision;
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
    blockerStepOutDecision: options.blockerStepOutDecision,
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
  readonly blockerStepOutDecision?: IDisplacementBlockerStepOutDecision;
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
    blockerStepOutDecision: options.blockerStepOutDecision,
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
 * Source-backed break-grapple displacement. MegaMek clears the grapple on a
 * successful break and moves exactly one unit out of the shared grapple hex:
 * the original grapple attacker gets the least-dangerous adjacent hex, while a
 * defender breaking free moves the opponent into the most-dangerous adjacent
 * hex. Hazard scoring mirrors the local source branches for magma, water
 * depth, and two-plus-level drops.
 */
export function computeBreakGrappleDisplacementOutcome(options: {
  readonly grid: IHexGrid;
  readonly attackerId: string;
  readonly targetId: string;
  readonly attackerPosition: IHexCoordinate;
  readonly targetPosition: IHexCoordinate;
  readonly attackerIsGrappleAttacker?: boolean;
}): IBreakGrappleDisplacementOutcome {
  const movedUnitId =
    options.attackerIsGrappleAttacker === true
      ? options.attackerId
      : options.targetId;
  const from =
    options.attackerIsGrappleAttacker === true
      ? options.attackerPosition
      : options.targetPosition;
  const destination = chooseBreakGrappleDestination({
    grid: options.grid,
    source: options.attackerPosition,
    unitId: movedUnitId,
    preferDangerous: options.attackerIsGrappleAttacker !== true,
  });

  if (!destination) return { displacements: [] };

  return {
    displacements: [
      {
        unitId: movedUnitId,
        from,
        to: destination,
        reason: 'break-grapple',
      },
    ],
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
  readonly blockerStepOutDecision?: IDisplacementBlockerStepOutDecision;
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
    blockerStepOutDecision: options.blockerStepOutDecision,
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
