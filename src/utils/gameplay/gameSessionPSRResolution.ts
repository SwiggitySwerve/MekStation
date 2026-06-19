import type {
  IComponentDamageState,
  IGameSession,
  IGameUnit,
  IPendingPSR,
  IUnitGameState,
} from '@/types/gameplay';

import { resolvePilotConsciousnessCheck } from './damage';
import { type D6Roller, type DiceRoller } from './diceTypes';
import { resolveFall } from './fallMechanics';
import {
  createPilotHitEvent,
  createPSRResolvedEvent,
  createUnitFellEvent,
  createUnitStuckEvent,
} from './gameEvents';
import { appendEvent } from './gameSessionCore';
import { roll2d6 as rollDice } from './hitLocation';
import {
  isGyroDestroyed,
  type IPSRBatchResult,
  type IPSRResult,
  resolveAllPSRs,
} from './pilotingSkillRolls';

const DEFAULT_FALL_LOCATION = 'center_torso';

interface IPsrUnitResolutionContext {
  readonly turn: number;
  readonly phase: IGameSession['currentState']['phase'];
  readonly unitId: string;
  readonly unitState: IUnitGameState;
  readonly unit: IGameUnit;
  readonly pendingPSRs: readonly IPendingPSR[];
  readonly componentDamage: IComponentDamageState;
  readonly d6Roller: D6Roller;
}

interface IPsrEventResolutionDetails {
  readonly targetNumber: number;
  readonly roll: number;
  readonly modifiers: number;
  readonly passed: boolean;
  readonly reason: string;
  readonly reasonCode?: IPendingPSR['reasonCode'];
}

interface IPsrFallReason {
  readonly reason?: string;
  readonly reasonCode?: IPendingPSR['reasonCode'];
}

export function resolvePendingPSRs(
  session: IGameSession,
  diceRoller: DiceRoller = rollDice,
): IGameSession {
  let currentSession = session;
  const { turn, phase } = currentSession.currentState;
  const unitIds = Object.keys(currentSession.currentState.units);

  for (const unitId of unitIds) {
    const context = createPsrUnitResolutionContext(
      currentSession,
      unitId,
      diceRoller,
      turn,
      phase,
    );
    if (!context) continue;

    currentSession = resolvePendingPsrForUnit(currentSession, context);
  }

  return currentSession;
}

function createPsrUnitResolutionContext(
  session: IGameSession,
  unitId: string,
  diceRoller: DiceRoller,
  turn: number,
  phase: IGameSession['currentState']['phase'],
): IPsrUnitResolutionContext | undefined {
  const unitState = session.currentState.units[unitId];
  if (unitState.destroyed || !unitState.pilotConscious) return undefined;

  const pendingPSRs = unitState.pendingPSRs ?? [];
  if (pendingPSRs.length === 0) return undefined;

  const unit = session.units.find((entry) => entry.id === unitId);
  if (!unit) return undefined;

  return {
    turn,
    phase,
    unitId,
    unitState,
    unit,
    pendingPSRs,
    componentDamage:
      unitState.componentDamage ?? createDefaultComponentDamage(),
    d6Roller: createD6Roller(diceRoller),
  };
}

function createDefaultComponentDamage(): IComponentDamageState {
  return {
    engineHits: 0,
    gyroHits: 0,
    sensorHits: 0,
    lifeSupport: 0,
    cockpitHit: false,
    actuators: {},
    weaponsDestroyed: [],
    heatSinksDestroyed: 0,
    jumpJetsDestroyed: 0,
  };
}

function createD6Roller(diceRoller: DiceRoller): D6Roller {
  return () => {
    const roll = diceRoller();
    return roll.dice[0];
  };
}

function resolvePendingPsrForUnit(
  session: IGameSession,
  context: IPsrUnitResolutionContext,
): IGameSession {
  if (isGyroDestroyed(context.componentDamage)) {
    return resolveDestroyedGyroPsr(session, context);
  }

  return resolveBatchedPsr(session, context);
}

function resolveDestroyedGyroPsr(
  session: IGameSession,
  context: IPsrUnitResolutionContext,
): IGameSession {
  let currentSession = appendAutomaticGyroPsrResolutions(session, context);

  currentSession = appendUnitFellAndPilotHit(currentSession, context, {
    reason: context.pendingPSRs[0]?.reason ?? 'gyro_destroyed',
    reasonCode: context.pendingPSRs[0]?.reasonCode,
  });

  return currentSession;
}

function appendAutomaticGyroPsrResolutions(
  session: IGameSession,
  context: IPsrUnitResolutionContext,
): IGameSession {
  let currentSession = session;

  for (const pending of context.pendingPSRs) {
    currentSession = appendPsrResolved(currentSession, context, {
      targetNumber: Infinity,
      roll: 0,
      modifiers: 0,
      passed: false,
      reason: pending.reason,
      reasonCode: pending.reasonCode,
    });
  }

  return currentSession;
}

function resolveBatchedPsr(
  session: IGameSession,
  context: IPsrUnitResolutionContext,
): IGameSession {
  const batchResult = resolveAllPSRs(
    context.unit.piloting,
    context.pendingPSRs,
    context.componentDamage,
    context.unitState.pilotWounds,
    context.d6Roller,
    {
      unitQuirks: context.unitState.unitQuirks ?? context.unit.unitQuirks ?? [],
      pilotAbilities:
        context.unitState.abilities ?? context.unit.abilities ?? [],
      neuralInterfaceActive: context.unitState.neuralInterfaceActive,
      isQuadMek: context.unitState.isQuad ?? context.unit.isQuad ?? false,
      unitType: context.unitState.unitType ?? context.unit.unitType,
    },
  );

  let currentSession = appendBatchedPsrResults(session, context, batchResult);
  currentSession = appendClearedPsrResults(
    currentSession,
    context,
    batchResult,
  );

  return appendBatchedPsrAftermath(currentSession, context, batchResult);
}

function appendBatchedPsrResults(
  session: IGameSession,
  context: IPsrUnitResolutionContext,
  batchResult: IPSRBatchResult,
): IGameSession {
  let currentSession = session;

  for (const result of batchResult.results) {
    currentSession = appendPsrResolved(currentSession, context, {
      targetNumber: result.targetNumber,
      roll: result.roll,
      modifiers: psrModifierTotal(result),
      passed: result.passed,
      reason: result.psr.reason,
      reasonCode: result.psr.reasonCode,
    });
  }

  return currentSession;
}

function appendClearedPsrResults(
  session: IGameSession,
  context: IPsrUnitResolutionContext,
  batchResult: IPSRBatchResult,
): IGameSession {
  let currentSession = session;

  for (const cleared of batchResult.clearedPSRs) {
    currentSession = appendPsrResolved(currentSession, context, {
      targetNumber: 0,
      roll: 0,
      modifiers: 0,
      passed: false,
      reason: cleared.reason,
      reasonCode: cleared.reasonCode,
    });
  }

  return currentSession;
}

function appendBatchedPsrAftermath(
  session: IGameSession,
  context: IPsrUnitResolutionContext,
  batchResult: IPSRBatchResult,
): IGameSession {
  if (batchResult.unitStuck) {
    return appendUnitStuckForPsrFailure(session, context, batchResult);
  }

  if (batchResult.unitFell) {
    return appendUnitFellAndPilotHit(
      session,
      context,
      fallReasonForFailedPsr(context, batchResult),
    );
  }

  return session;
}

function appendPsrResolved(
  session: IGameSession,
  context: IPsrUnitResolutionContext,
  details: IPsrEventResolutionDetails,
): IGameSession {
  const sequence = session.events.length;
  return appendEvent(
    session,
    createPSRResolvedEvent(
      session.id,
      sequence,
      context.turn,
      context.phase,
      context.unitId,
      details.targetNumber,
      details.roll,
      details.modifiers,
      details.passed,
      details.reason,
      details.reasonCode,
    ),
  );
}

function appendUnitStuckForPsrFailure(
  session: IGameSession,
  context: IPsrUnitResolutionContext,
  batchResult: IPSRBatchResult,
): IGameSession {
  const reason = fallReasonForFailedPsr(context, batchResult);
  const sequence = session.events.length;

  return appendEvent(
    session,
    createUnitStuckEvent(
      session.id,
      sequence,
      context.turn,
      context.phase,
      context.unitId,
      reason.reason,
      reason.reasonCode,
    ),
  );
}

function appendUnitFellAndPilotHit(
  session: IGameSession,
  context: IPsrUnitResolutionContext,
  reason: IPsrFallReason,
): IGameSession {
  const fallResult = resolveFall(
    50,
    context.unitState.facing,
    0,
    context.d6Roller,
  );
  const fellSequence = session.events.length;
  let currentSession = appendEvent(
    session,
    createUnitFellEvent(
      session.id,
      fellSequence,
      context.turn,
      context.phase,
      context.unitId,
      fallResult.totalDamage,
      fallResult.newFacing,
      fallResult.pilotDamage,
      DEFAULT_FALL_LOCATION,
      reason.reason,
      reason.reasonCode,
    ),
  );

  currentSession = appendPilotHitForFall(currentSession, context);

  return currentSession;
}

function appendPilotHitForFall(
  session: IGameSession,
  context: IPsrUnitResolutionContext,
): IGameSession {
  const currentUnitState = session.currentState.units[context.unitId];
  const totalWounds = currentUnitState.pilotWounds + 1;
  const consciousnessCheck = resolvePilotConsciousnessCheck(
    totalWounds,
    1,
    currentUnitState.abilities ?? context.unit.abilities ?? [],
    context.d6Roller,
    currentUnitState.pilotToughness,
    {
      edgePointsRemaining: currentUnitState.edgePointsRemaining,
      turn: context.turn,
      unitId: context.unitId,
    },
  );
  const consciousnessPassed =
    currentUnitState.pilotConscious &&
    (consciousnessCheck.conscious ?? true) &&
    totalWounds < 6;
  const sequence = session.events.length;

  return appendEvent(
    session,
    createPilotHitEvent(
      session.id,
      sequence,
      context.turn,
      context.phase,
      context.unitId,
      1,
      totalWounds,
      'fall',
      true,
      consciousnessPassed,
      {
        edgeReroll: consciousnessCheck.edgeReroll,
        edgeSuperseded: consciousnessCheck.edgeSuperseded,
        edgeTrigger: consciousnessCheck.edgeTrigger,
        edgePointsRemaining: consciousnessCheck.edgePointsRemaining,
      },
    ),
  );
}

function fallReasonForFailedPsr(
  context: IPsrUnitResolutionContext,
  batchResult: IPSRBatchResult,
): IPsrFallReason {
  const failedPsr = firstFailedPsr(batchResult);

  return {
    reason: failedPsr?.psr.reason ?? context.pendingPSRs[0]?.reason,
    reasonCode: failedPsr?.psr.reasonCode ?? context.pendingPSRs[0]?.reasonCode,
  };
}

function firstFailedPsr(batchResult: IPSRBatchResult): IPSRResult | undefined {
  return batchResult.failedResult ?? batchResult.results.find((r) => !r.passed);
}

function psrModifierTotal(result: IPSRResult): number {
  return result.modifiers.reduce((sum, modifier) => sum + modifier.value, 0);
}
