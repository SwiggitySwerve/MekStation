import type {
  IGameSession,
  IHexGrid,
  IPhysicalDisplacement,
} from '@/types/gameplay';

import type { D6Roller } from './diceTypes';

import {
  computeBreakGrappleDisplacementOutcome,
  computeChargeDisplacementOutcome,
  computeDfaDisplacementOutcome,
  computeDisplacementWithDominoChain,
  computeMissedChargeDisplacement,
  computePushDisplacementOutcome,
  type IDisplacementBlockerStepOutDecision,
  type PhysicalAttackType,
} from './physicalAttacks';

interface IResolvedPhysicalDisplacementOutcome {
  readonly displacements: readonly IPhysicalDisplacement[];
  readonly impossibleDisplacementDestroyedUnitId?: string;
}

export function computeResolvedPhysicalDisplacementOutcome(options: {
  readonly grid?: IHexGrid;
  readonly attackType: PhysicalAttackType;
  readonly attacker: IGameSession['currentState']['units'][string];
  readonly target: IGameSession['currentState']['units'][string];
  readonly hit: boolean;
  readonly d6Roller: D6Roller;
  readonly friendlyUnitIds?: readonly string[];
  readonly targetSourceContainsGroundedDropShip?: boolean;
  readonly blockerStepOutDecision?: IDisplacementBlockerStepOutDecision;
}): IResolvedPhysicalDisplacementOutcome {
  const { attackType, attacker, d6Roller, friendlyUnitIds, grid, hit, target } =
    options;
  if (!grid) {
    return { displacements: [] };
  }

  if (!hit && attackType === 'charge') {
    const destination = computeMissedChargeDisplacement(
      grid,
      attacker.id,
      attacker.position,
      attacker.facing,
      d6Roller,
    );
    if (
      destination.q === attacker.position.q &&
      destination.r === attacker.position.r
    ) {
      return { displacements: [] };
    }
    const displacements = computeDisplacementWithDominoChain({
      grid,
      unitId: attacker.id,
      from: attacker.position,
      to: destination,
      reason: 'charge_miss',
      blockerStepOutDecision: options.blockerStepOutDecision,
    });
    return {
      displacements: displacements ?? [],
    };
  }

  if (attackType === 'dfa') {
    return computeDfaDisplacementOutcome({
      grid,
      attackerId: attacker.id,
      attackerPosition: attacker.position,
      attackerFacing: attacker.facing,
      targetId: target.id,
      targetPosition: target.position,
      hit,
      targetFriendlyUnitIds: friendlyUnitIds,
      targetSourceContainsGroundedDropShip:
        options.targetSourceContainsGroundedDropShip,
      blockerStepOutDecision: options.blockerStepOutDecision,
    });
  }

  if (hit && attackType === 'charge') {
    return computeChargeDisplacementOutcome({
      grid,
      attackerId: attacker.id,
      attackerPosition: attacker.position,
      attackerFacing: attacker.facing,
      targetId: target.id,
      targetPosition: target.position,
      blockerStepOutDecision: options.blockerStepOutDecision,
    });
  }

  if (hit && attackType === 'break-grapple') {
    return computeBreakGrappleDisplacementOutcome({
      grid,
      attackerId: attacker.id,
      targetId: target.id,
      attackerPosition: attacker.position,
      targetPosition: target.position,
      attackerIsGrappleAttacker: attacker.isGrappleAttacker,
    });
  }

  if (!hit || attackType !== 'push') {
    return { displacements: [] };
  }

  return computePushDisplacementOutcome({
    grid,
    attackerId: attacker.id,
    attackerPosition: attacker.position,
    attackerFacing: attacker.facing,
    targetId: target.id,
    targetPosition: target.position,
    blockerStepOutDecision: options.blockerStepOutDecision,
  });
}

export function dfaMissDropsAttacker(
  displacements: readonly IPhysicalDisplacement[],
  attackerId: string,
): boolean {
  return displacements.some(
    (displacement) =>
      displacement.unitId === attackerId && displacement.reason === 'dfa_miss',
  );
}

export function friendlyUnitIdsForDisplacement(
  units: IGameSession['currentState']['units'],
  displacedUnit: IGameSession['currentState']['units'][string],
): readonly string[] {
  return Object.values(units)
    .filter(
      (unit) =>
        unit.id !== displacedUnit.id && unit.side === displacedUnit.side,
    )
    .map((unit) => unit.id);
}
