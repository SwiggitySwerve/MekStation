import {
  GameEventType,
  GamePhase,
  IGameEvent,
  IGameSession,
  IHexGrid,
  IPhysicalDisplacement,
  IPhysicalAttackDeclaredPayload,
} from '@/types/gameplay';

import type { DiceRoller } from './diceTypes';
import type { IPhysicalAttackContext } from './gameSessionPhysicalHelpers';

import {
  createPhysicalAttackResolvedEvent,
  createUnitDestroyedEvent,
} from './gameEvents';
import { appendEvent } from './gameSessionCore';
import { appendPhysicalAttackDamageEvents } from './gameSessionPhysicalDamageEvents';
import { appendDfaMissFallDamage } from './gameSessionPhysicalDfaMiss';
import {
  computeResolvedPhysicalDisplacementOutcome,
  dfaMissDropsAttacker,
  friendlyUnitIdsForDisplacement,
} from './gameSessionPhysicalDisplacement';
import { buildPhysicalAttackInput } from './gameSessionPhysicalInput';
import { appendPhysicalAttackPsrEvents } from './gameSessionPhysicalPsrEvents';
import {
  appendInvalidPhysicalResolution,
  selectedINarcPodForBrushOff,
} from './gameSessionPhysicalSupport';
import {
  physicalTargetObjectInvalidReason,
  resolvePhysicalAttack,
  sourceContainsGroundedDropShip,
} from './physicalAttacks';

type UnitState = IGameSession['currentState']['units'][string];

export function physicalAttackDeclarationsForCurrentTurn(
  session: IGameSession,
): readonly IGameEvent[] {
  const { turn } = session.currentState;
  return session.events.filter(
    (event) =>
      event.type === GameEventType.PhysicalAttackDeclared &&
      event.turn === turn,
  );
}

export function resolvePhysicalAttackDeclaration(options: {
  readonly session: IGameSession;
  readonly declaration: IGameEvent;
  readonly contextByAttacker: Map<string, IPhysicalAttackContext>;
  readonly diceRoller: DiceRoller;
  readonly grid?: IHexGrid;
  readonly turn: number;
}): IGameSession {
  const { contextByAttacker, declaration, diceRoller, grid, turn } = options;
  let currentSession = options.session;
  const payload = declaration.payload as IPhysicalAttackDeclaredPayload;
  const context = contextByAttacker.get(payload.attackerId);
  if (!context) return currentSession;

  const attackerState = currentSession.currentState.units[payload.attackerId];
  if (!attackerState) return currentSession;

  const targetStateOrReason = resolvedTargetOrInvalidReason(
    currentSession,
    payload,
    context,
  );
  if (typeof targetStateOrReason === 'string') {
    return appendInvalidPhysicalResolution(
      currentSession,
      turn,
      payload,
      targetStateOrReason,
    );
  }

  const targetState = targetStateOrReason;
  const targetContext = contextByAttacker.get(payload.targetId);
  const targetUnit = currentSession.units.find(
    (unit) => unit.id === payload.targetId,
  );
  const d6Roller = () => {
    const roll = diceRoller();
    return roll.dice[0];
  };
  const input = buildPhysicalAttackInput({
    session: currentSession,
    attackerId: payload.attackerId,
    targetId: payload.targetId,
    attackType: payload.attackType,
    context,
    attackerState,
    targetState,
    targetContext,
    limb: payload.limb ?? context.limb,
    twoHandedZweihander:
      payload.twoHandedZweihander ?? context.twoHandedZweihander,
    hitTableOverride: payload.hitTable,
    grid,
    deriveThrashBlockingTerrains: true,
  });
  const result = resolvePhysicalAttack(input, d6Roller);
  const displacementOutcome = computeResolvedPhysicalDisplacementOutcome({
    grid,
    attackType: payload.attackType,
    attacker: attackerState,
    target: targetState,
    hit: result.hit,
    d6Roller,
    friendlyUnitIds: friendlyUnitIdsForDisplacement(
      currentSession.currentState.units,
      targetState,
    ),
    targetSourceContainsGroundedDropShip: sourceContainsGroundedDropShip(
      Object.values(currentSession.currentState.units),
      targetState,
    ),
    blockerStepOutDecision: payload.blockerStepOutDecision,
  });
  const displacements = displacementOutcome.displacements;
  const impossibleDisplacementDestroyedUnitId =
    displacementOutcome.impossibleDisplacementDestroyedUnitId;
  const chargeHitDisplacementBlocked =
    result.hit &&
    payload.attackType === 'charge' &&
    Boolean(grid) &&
    displacements.length === 0;
  const dfaMissFallApplies =
    !result.hit &&
    payload.attackType === 'dfa' &&
    impossibleDisplacementDestroyedUnitId !== payload.attackerId &&
    dfaMissDropsAttacker(displacements, payload.attackerId);

  currentSession = appendResolvedEvent({
    session: currentSession,
    turn,
    payload,
    result,
    displacements,
    context,
    targetState,
  });
  currentSession = appendPhysicalAttackDamageEvents({
    session: currentSession,
    turn,
    payload,
    result,
    attackerState,
    targetState,
    d6Roller,
  });
  currentSession = appendPhysicalAttackPsrEvents({
    session: currentSession,
    turn,
    payload,
    result,
    targetBasePilotingSkill: targetUnit?.piloting,
    attackerBasePilotingSkill: context.pilotingSkill,
    displacements,
    impossibleDisplacementDestroyedUnitId,
    chargeHitDisplacementBlocked,
    dfaMissFallApplies,
  });

  if (dfaMissFallApplies) {
    currentSession = appendDfaMissFallDamage(currentSession, {
      turn,
      attackerId: payload.attackerId,
      attackerTonnage: context.attackerTonnage,
      attackerPilotingSkill: context.pilotingSkill,
      attackerPilotAbilities: context.pilotAbilities ?? attackerState.abilities,
      attackerFacing: attackerState.facing,
      d6Roller,
    });
  }

  return appendImpossibleDisplacementDestruction({
    session: currentSession,
    turn,
    payload,
    impossibleDisplacementDestroyedUnitId,
  });
}

function resolvedTargetOrInvalidReason(
  session: IGameSession,
  payload: IPhysicalAttackDeclaredPayload,
  context: IPhysicalAttackContext,
): UnitState | string {
  const targetState = session.currentState.units[payload.targetId];
  if (!targetState) {
    return (
      physicalTargetObjectInvalidReason(
        payload.attackType,
        context.targetObjectType,
      ) ?? 'TargetMissing'
    );
  }
  if (targetState.destroyed) return 'TargetDestroyed';
  if (targetState.hasRetreated) return 'TargetRetreated';
  if (targetState.hasEjected) return 'TargetEjected';
  return targetState;
}

function appendResolvedEvent(options: {
  readonly session: IGameSession;
  readonly turn: number;
  readonly payload: IPhysicalAttackDeclaredPayload;
  readonly result: ReturnType<typeof resolvePhysicalAttack>;
  readonly displacements: readonly IPhysicalDisplacement[];
  readonly context: IPhysicalAttackContext;
  readonly targetState: UnitState;
}): IGameSession {
  const {
    context,
    displacements,
    payload,
    result,
    session,
    targetState,
    turn,
  } = options;
  return appendEvent(
    session,
    createPhysicalAttackResolvedEvent(
      session.id,
      session.events.length,
      turn,
      payload.attackerId,
      payload.targetId,
      payload.attackType,
      result.roll,
      result.toHitNumber,
      result.hit,
      result.hit ? result.targetDamage : undefined,
      result.hit ? result.hitLocation : result.restrictionReasonCode,
      undefined,
      displacements.length > 0 ? displacements : undefined,
      result.automaticHit,
      result.automaticHitReason,
      selectedINarcPodForBrushOff(payload.attackType, context, targetState),
    ),
  );
}

function appendImpossibleDisplacementDestruction(options: {
  readonly session: IGameSession;
  readonly turn: number;
  readonly payload: IPhysicalAttackDeclaredPayload;
  readonly impossibleDisplacementDestroyedUnitId?: string;
}): IGameSession {
  const { impossibleDisplacementDestroyedUnitId, payload, session, turn } =
    options;
  if (
    impossibleDisplacementDestroyedUnitId === undefined ||
    session.currentState.units[impossibleDisplacementDestroyedUnitId]?.destroyed
  ) {
    return session;
  }

  return appendEvent(
    session,
    createUnitDestroyedEvent(
      session.id,
      session.events.length,
      turn,
      GamePhase.PhysicalAttack,
      impossibleDisplacementDestroyedUnitId,
      'impossible_displacement',
      impossibleDisplacementDestroyedUnitId === payload.targetId
        ? { killerUnitId: payload.attackerId }
        : undefined,
    ),
  );
}
