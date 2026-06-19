import type {
  IGameSession,
  IMovementCapability,
  StandUpMode,
} from '@/types/gameplay';

import { type DiceRoller } from './diceTypes';
import {
  createPSRResolvedEvent,
  createPSRTriggeredEvent,
  createUnitStoodEvent,
} from './gameEvents';
import { appendEvent } from './gameSessionCore';
import { roll2d6 as rollDice } from './hitLocation';
import { checkPhaseDamagePSR, createStandingUpPSR } from './pilotingSkillRolls';
import { projectStandUpPsr } from './standUpRules';

export function checkAndQueueDamagePSRs(session: IGameSession): IGameSession {
  let currentSession = session;
  const { turn, phase } = currentSession.currentState;
  const unitIds = Object.keys(currentSession.currentState.units);

  for (const unitId of unitIds) {
    const unitState = currentSession.currentState.units[unitId];
    if (unitState.destroyed || !unitState.pilotConscious) continue;

    const damagePSR = checkPhaseDamagePSR(unitState);
    if (damagePSR) {
      const sequence = currentSession.events.length;
      // Per `denormalize-event-envelope-and-close-emission-contract-gaps`
      // (piloting-skill-rolls delta): carry the unit's base piloting
      // skill onto the trigger event so consumers can render the full
      // PSR target-number arithmetic without joining to the unit
      // record. `IGameUnit.piloting` is the unmodified skill value.
      const unit = currentSession.units.find((entry) => entry.id === unitId);
      currentSession = appendEvent(
        currentSession,
        createPSRTriggeredEvent(
          currentSession.id,
          sequence,
          turn,
          phase,
          unitId,
          damagePSR.reason,
          damagePSR.additionalModifier,
          damagePSR.triggerSource,
          unit?.piloting,
          damagePSR.reasonCode,
        ),
      );
    }
  }

  return currentSession;
}

export { resolvePendingPSRs } from './gameSessionPSRResolution';

/**
 * Per `wire-piloting-skill-rolls` task 9: prone unit attempts to stand.
 * Enqueues an `AttemptStand` PSR trigger, immediately rolls, and on
 * success emits `UnitStood` (clears prone). On failure the unit remains
 * prone. Fall damage is NOT applied — failing a stand-up attempt doesn't
 * cause additional damage; the unit just fails to rise this turn.
 *
 * Caller decides when (movement phase) and pays the MP cost before
 * invoking. This helper only emits the event chain.
 */
export function attemptStandUp(
  session: IGameSession,
  unitId: string,
  diceRoller: DiceRoller = rollDice,
  standUpMode: StandUpMode = 'normal',
  movementCapability?: IMovementCapability,
): IGameSession {
  const { turn } = session.currentState;
  const phase = session.currentState.phase;
  const unitState = session.currentState.units[unitId];
  if (!unitState || !unitState.prone || unitState.destroyed) {
    return session;
  }
  const unit = session.units.find((u) => u.id === unitId);
  if (!unit) return session;

  let currentSession = session;

  const psr = createStandingUpPSR(unitId);
  const standUpPsr = projectStandUpPsr({
    unitState,
    unitPiloting: unit.piloting,
    unitType: unit.unitType,
    movementCapability,
    standUpMode,
    optionalRules: session.config.optionalRules,
  });

  if (!standUpPsr.required && !standUpPsr.impossibleReason) {
    const stoodSeq = currentSession.events.length;
    return appendEvent(
      currentSession,
      createUnitStoodEvent(
        currentSession.id,
        stoodSeq,
        turn,
        phase,
        unitId,
        0,
        0,
        standUpPsr.automaticSuccessReason,
      ),
    );
  }

  // 1. Emit PSRTriggered so the reducer pushes the PSR onto the queue.
  const triggeredSeq = currentSession.events.length;
  currentSession = appendEvent(
    currentSession,
    createPSRTriggeredEvent(
      currentSession.id,
      triggeredSeq,
      turn,
      phase,
      unitId,
      psr.reason,
      psr.additionalModifier,
      psr.triggerSource,
      unit.piloting,
      psr.reasonCode,
    ),
  );

  // 2. Roll the PSR with the same modifier projection the map exposes.
  //    Impossible stand-up targets resolve as automatic failures.
  const tn = standUpPsr.targetNumber ?? unit.piloting;
  const roll = standUpPsr.impossibleReason
    ? { total: 0, dice: [0, 0] as const }
    : diceRoller();
  const passed = !standUpPsr.impossibleReason && roll.total >= tn;

  const resolvedSeq = currentSession.events.length;
  currentSession = appendEvent(
    currentSession,
    createPSRResolvedEvent(
      currentSession.id,
      resolvedSeq,
      turn,
      phase,
      unitId,
      tn,
      roll.total,
      standUpPsr.modifier,
      passed,
      standUpPsr.impossibleReason ?? psr.reason,
      psr.reasonCode,
    ),
  );

  // 3. On success, emit UnitStood. On failure the unit stays prone;
  //    no additional damage (per canonical standing-up rules).
  if (passed) {
    const stoodSeq = currentSession.events.length;
    currentSession = appendEvent(
      currentSession,
      createUnitStoodEvent(
        currentSession.id,
        stoodSeq,
        turn,
        phase,
        unitId,
        roll.total,
        tn,
      ),
    );
  }

  return currentSession;
}
