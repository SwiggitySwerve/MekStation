import type {
  IGameSession,
  IMovementCapability,
  StandUpMode,
} from '@/types/gameplay';

import { resolvePilotConsciousnessCheck } from './damage';
import { type DiceRoller } from './diceTypes';
import { resolveFall } from './fallMechanics';
import {
  createPilotHitEvent,
  createPSRResolvedEvent,
  createPSRTriggeredEvent,
  createUnitFellEvent,
  createUnitStoodEvent,
  createUnitStuckEvent,
} from './gameEvents';
import { appendEvent } from './gameSessionCore';
import { roll2d6 as rollDice } from './hitLocation';
import {
  checkPhaseDamagePSR,
  createStandingUpPSR,
  isGyroDestroyed,
  resolveAllPSRs,
} from './pilotingSkillRolls';
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
            pending.reasonCode,
          ),
        );
      }

      // Per `denormalize-event-envelope-and-close-emission-contract-gaps`
      // (piloting-skill-rolls delta — UnitFell Carries Location and Reason):
      // a destroyed gyro forces an automatic fall; canonical location is
      // `'center_torso'` (where the gyro lives on standard mechs) and the
      // reason is the gyro-hit trigger. Fallback to the first pending
      // PSR's reason if for some reason the queue is empty.
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
          'center_torso',
          pendingPSRs[0]?.reason ?? 'gyro_destroyed',
          pendingPSRs[0]?.reasonCode,
        ),
      );

      const currentUnitState = currentSession.currentState.units[unitId];
      const totalWounds = currentUnitState.pilotWounds + 1;
      const consciousnessCheck = resolvePilotConsciousnessCheck(
        totalWounds,
        1,
        currentUnitState.abilities ?? unit.abilities ?? [],
        d6Roller,
        currentUnitState.pilotToughness,
        {
          edgePointsRemaining: currentUnitState.edgePointsRemaining,
          turn,
          unitId,
        },
      );
      const consciousnessPassed =
        currentUnitState.pilotConscious &&
        (consciousnessCheck.conscious ?? true) &&
        totalWounds < 6;
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
      {
        unitQuirks: unitState.unitQuirks ?? unit.unitQuirks ?? [],
        pilotAbilities: unitState.abilities ?? unit.abilities ?? [],
        neuralInterfaceActive: unitState.neuralInterfaceActive,
        isQuadMek: unitState.isQuad ?? unit.isQuad ?? false,
        unitType: unitState.unitType ?? unit.unitType,
      },
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
          result.psr.reasonCode,
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
          cleared.reasonCode,
        ),
      );
    }

    if (batchResult.unitStuck) {
      const failedPsr = batchResult.failedResult;
      const stuckSequence = currentSession.events.length;
      currentSession = appendEvent(
        currentSession,
        createUnitStuckEvent(
          currentSession.id,
          stuckSequence,
          turn,
          phase,
          unitId,
          failedPsr?.psr.reason ?? pendingPSRs[0]?.reason,
          failedPsr?.psr.reasonCode ?? pendingPSRs[0]?.reasonCode,
        ),
      );
    } else if (batchResult.unitFell) {
      const fallResult = resolveFall(50, unitState.facing, 0, d6Roller);

      // Per `denormalize-event-envelope-and-close-emission-contract-gaps`
      // (piloting-skill-rolls delta — UnitFell Carries Location and Reason):
      // pick the first FAILED PSR's reason as the canonical fall reason;
      // location defaults to `'center_torso'` (the failed-PSR pathway
      // doesn't carry a per-trigger location today — PR E tightens this
      // when reasons become a discriminated `PSRReasonCode`).
      const failedPsr = batchResult.results.find((r) => !r.passed);
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
          'center_torso',
          failedPsr?.psr.reason ?? pendingPSRs[0]?.reason,
          failedPsr?.psr.reasonCode ?? pendingPSRs[0]?.reasonCode,
        ),
      );

      const currentUnitState = currentSession.currentState.units[unitId];
      const totalWounds = currentUnitState.pilotWounds + 1;
      const consciousnessCheck = resolvePilotConsciousnessCheck(
        totalWounds,
        1,
        currentUnitState.abilities ?? unit.abilities ?? [],
        d6Roller,
        currentUnitState.pilotToughness,
        {
          edgePointsRemaining: currentUnitState.edgePointsRemaining,
          turn,
          unitId,
        },
      );
      const consciousnessPassed =
        currentUnitState.pilotConscious &&
        (consciousnessCheck.conscious ?? true) &&
        totalWounds < 6;
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
