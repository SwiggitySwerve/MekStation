import { GamePhase, IGameState } from '@/types/gameplay';
import { createPSRTriggeredEvent } from '@/utils/gameplay/gameEvents/statusChecks';
import { sourceContainsGroundedDropShip } from '@/utils/gameplay/physicalAttacks';

import type {
  PhysicalAttackResolutionOptions,
  PhysicalDisplacement,
  PhysicalDisplacementOutcome,
} from './physicalAttackResolutionTypes';

import { applyRepresentedMinefieldEntryDamage } from './movementMines';
import {
  computePhysicalDisplacementOutcome,
  displaceUnit,
} from './physicalAttackDisplacement';
import {
  friendlyUnitIdsForDisplacement,
  representedDominoTerrainPSRsForDisplacement,
} from './physicalAttackHelpers';
import { queuePendingPSR } from './physicalAttackPsr';
import { applyBreakGrappleState } from './physicalAttackState';

export function physicalAttackDisplacementOutcome(
  options: PhysicalAttackResolutionOptions,
): PhysicalDisplacementOutcome {
  if (options.result.restrictionReasonCode !== undefined) {
    return { displacements: [] };
  }
  return computePhysicalDisplacementOutcome({
    grid: options.grid,
    attackType: options.attackType,
    attacker: options.unit,
    target: options.target,
    hit: options.result.hit,
    d6Roller: options.d6Roller,
    targetFriendlyUnitIds: friendlyUnitIdsForDisplacement(
      options.state,
      options.target,
    ),
    targetSourceContainsGroundedDropShip: sourceContainsGroundedDropShip(
      Object.values(options.state.units),
      options.target,
    ),
    blockerStepOutDecision: options.blockerStepOutDecision,
  });
}

export function applyPhysicalAttackDisplacementEffects(
  options: PhysicalAttackResolutionOptions & {
    readonly displacements: readonly PhysicalDisplacement[];
  },
): IGameState {
  let currentState = options.state;
  for (const displacement of options.displacements) {
    currentState = displaceUnit(
      currentState,
      displacement.unitId,
      displacement.to,
    );
    const grid = options.grid;
    if (grid) {
      currentState = applyMinefieldAndTerrainEffects({
        ...options,
        state: currentState,
        grid,
        displacement,
      });
    }
  }
  return currentState;
}

export function applyBreakGrappleEffects(
  options: PhysicalAttackResolutionOptions & {
    readonly displacements: readonly PhysicalDisplacement[];
  },
): IGameState {
  if (!options.result.hit || options.attackType !== 'break-grapple') {
    return options.state;
  }
  return applyBreakGrappleState({
    state: options.state,
    attackerId: options.unitId,
    targetId: options.target.id,
    displacements: options.displacements,
  });
}

function applyMinefieldAndTerrainEffects(
  options: PhysicalAttackResolutionOptions & {
    readonly grid: NonNullable<PhysicalAttackResolutionOptions['grid']>;
    readonly displacement: PhysicalDisplacement;
  },
): IGameState {
  let currentState = applyRepresentedMinefieldEntryDamage({
    currentState: options.state,
    events: options.events,
    gameId: options.gameId,
    grid: options.grid,
    unitId: options.displacement.unitId,
    to: options.displacement.to,
    phase: GamePhase.PhysicalAttack,
    d6Roller: options.d6Roller,
  });
  for (const psr of representedDominoTerrainPSRsForDisplacement({
    state: currentState,
    grid: options.grid,
    unitId: options.displacement.unitId,
    from: options.displacement.from,
    to: options.displacement.to,
    reason: options.displacement.reason,
  })) {
    currentState = queuePendingPSR(
      currentState,
      options.displacement.unitId,
      psr,
    );
    options.events.push(
      createPSRTriggeredEvent(
        options.gameId,
        options.events.length,
        currentState.turn,
        GamePhase.PhysicalAttack,
        options.displacement.unitId,
        psr.reason,
        psr.additionalModifier,
        psr.triggerSource,
        currentState.units[options.displacement.unitId]?.piloting,
        psr.reasonCode,
        psr.fixedTargetNumber,
      ),
    );
  }
  return currentState;
}
