import { IGameSession } from '@/types/gameplay';

import { type DiceRoller } from './diceTypes';
import { resolveFall } from './fallMechanics';
import {
  createPilotHitEvent,
  createPSRResolvedEvent,
  createPSRTriggeredEvent,
  createUnitFellEvent,
  createUnitStoodEvent,
} from './gameEvents';
import { appendEvent } from './gameSessionCore';
import { roll2d6 as rollDice } from './hitLocation';
import {
  checkPhaseDamagePSR,
  createStandingUpPSR,
  isGyroDestroyed,
  resolveAllPSRs,
} from './pilotingSkillRolls';

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
        ),
      );
    }
  }

  return currentSession;
}

export function resolvePendingPSRs(
  session: IGameSession,
  diceRoller: DiceRoller = rollDice,
): IGameSession {
  let currentSession = session;
  const { turn, phase } = currentSession.currentState;
  const unitIds = Object.keys(currentSession.currentState.units);

  for (const unitId of unitIds) {
    const unitState = currentSession.currentState.units[unitId];
    if (unitState.destroyed || !unitState.pilotConscious) continue;

    const pendingPSRs = unitState.pendingPSRs ?? [];
    if (pendingPSRs.length === 0) continue;

    const unit = currentSession.units.find((entry) => entry.id === unitId);
    if (!unit) continue;

    const componentDamage = unitState.componentDamage ?? {
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

    if (isGyroDestroyed(componentDamage)) {
      const d6Roller = () => {
        const roll = diceRoller();
        return roll.dice[0];
      };
      const fallResult = resolveFall(50, unitState.facing, 0, d6Roller);

      for (const pending of pendingPSRs) {
        const resolveSequence = currentSession.events.length;
        currentSession = appendEvent(
          currentSession,
          createPSRResolvedEvent(
            currentSession.id,
            resolveSequence,
            turn,
            phase,
            unitId,
            Infinity,
            0,
            0,
            false,
            pending.reason,
          ),
        );
      }

      const fellSequence = currentSession.events.length;
      currentSession = appendEvent(
        currentSession,
        createUnitFellEvent(
          currentSession.id,
          fellSequence,
          turn,
          phase,
          unitId,
          fallResult.totalDamage,
          fallResult.newFacing,
          fallResult.pilotDamage,
        ),
      );

      const currentUnitState = currentSession.currentState.units[unitId];
      const totalWounds = currentUnitState.pilotWounds + 1;
      const pilotSequence = currentSession.events.length;
      currentSession = appendEvent(
        currentSession,
        createPilotHitEvent(
          currentSession.id,
          pilotSequence,
          turn,
          phase,
          unitId,
          1,
          totalWounds,
          'head_hit',
          true,
          totalWounds < 6,
        ),
      );

      continue;
    }

    const d6Roller = () => {
      const roll = diceRoller();
      return roll.dice[0];
    };

    const batchResult = resolveAllPSRs(
      unit.piloting,
      pendingPSRs,
      componentDamage,
      unitState.pilotWounds,
      d6Roller,
    );

    for (const result of batchResult.results) {
      const resolveSequence = currentSession.events.length;
      currentSession = appendEvent(
        currentSession,
        createPSRResolvedEvent(
          currentSession.id,
          resolveSequence,
          turn,
          phase,
          unitId,
          result.targetNumber,
          result.roll,
          result.modifiers.reduce((sum, modifier) => sum + modifier.value, 0),
          result.passed,
          result.psr.reason,
        ),
      );
    }

    for (const cleared of batchResult.clearedPSRs) {
      const resolveSequence = currentSession.events.length;
      currentSession = appendEvent(
        currentSession,
        createPSRResolvedEvent(
          currentSession.id,
          resolveSequence,
          turn,
          phase,
          unitId,
          0,
          0,
          0,
          false,
          cleared.reason,
        ),
      );
    }

    if (batchResult.unitFell) {
      const fallResult = resolveFall(50, unitState.facing, 0, d6Roller);

      const fellSequence = currentSession.events.length;
      currentSession = appendEvent(
        currentSession,
        createUnitFellEvent(
          currentSession.id,
          fellSequence,
          turn,
          phase,
          unitId,
          fallResult.totalDamage,
          fallResult.newFacing,
          fallResult.pilotDamage,
        ),
      );

      const currentUnitState = currentSession.currentState.units[unitId];
      const totalWounds = currentUnitState.pilotWounds + 1;
      const pilotSequence = currentSession.events.length;
      currentSession = appendEvent(
        currentSession,
        createPilotHitEvent(
          currentSession.id,
          pilotSequence,
          turn,
          phase,
          unitId,
          1,
          totalWounds,
          'head_hit',
          true,
          totalWounds < 6,
        ),
      );
    }
  }

  return currentSession;
}

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

  // 1. Emit PSRTriggered so the reducer pushes the PSR onto the queue.
  const psr = createStandingUpPSR(unitId);
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
    ),
  );

  // 2. Roll the PSR: piloting skill + gyro-hit modifier + wound
  //    modifier + trigger-specific modifier. Canonical stand-up TN is
  //    piloting + 0 (plus any active modifiers).
  const componentDamage = unitState.componentDamage;
  const gyroModifier = (componentDamage?.gyroHits ?? 0) * 3;
  const woundModifier = unitState.pilotWounds;
  const tn =
    unit.piloting + gyroModifier + woundModifier + psr.additionalModifier;
  const roll = diceRoller();
  const passed = roll.total >= tn;

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
      gyroModifier + woundModifier,
      passed,
      psr.reason,
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
