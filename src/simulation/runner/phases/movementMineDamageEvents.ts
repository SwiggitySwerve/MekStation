import type { IResolveDamageResult } from '@/utils/gameplay/damage';

import {
  CombatLocation,
  GameEventType,
  type IGameEvent,
  type IGameState,
  type IPendingPSR,
  type GamePhase,
} from '@/types/gameplay';
import { createPSRTriggeredEvent } from '@/utils/gameplay/gameEvents/statusChecks';
import {
  createDamagePSR,
  createLegDamagePSR,
} from '@/utils/gameplay/pilotingSkillRolls';

import { createGameEvent } from './utils';

export function emitMovementDamageChainEvents(options: {
  events: IGameEvent[];
  gameId: string;
  phase: GamePhase;
  turn: number;
  unitId: string;
  damageResult: IResolveDamageResult;
  previouslyDestroyed: readonly CombatLocation[];
}): void {
  const {
    damageResult,
    events,
    gameId,
    phase,
    previouslyDestroyed,
    turn,
    unitId,
  } = options;
  const newlyDestroyed = damageResult.state.destroyedLocations.filter(
    (location) => !previouslyDestroyed.includes(location),
  );

  for (let i = 0; i < damageResult.result.locationDamages.length; i++) {
    const locDamage = damageResult.result.locationDamages[i];
    const isTransferStep = i > 0;

    events.push(
      createGameEvent(
        gameId,
        events.length,
        GameEventType.DamageApplied,
        turn,
        phase,
        {
          unitId,
          location: locDamage.location,
          damage: locDamage.damage,
          armorRemaining: locDamage.armorRemaining,
          structureRemaining: locDamage.structureRemaining,
          locationDestroyed: locDamage.destroyed,
        },
        unitId,
      ),
    );

    if (locDamage.destroyed) {
      let cascadedArm: string | undefined;
      if (
        locDamage.location === 'left_torso' &&
        newlyDestroyed.includes('left_arm')
      ) {
        cascadedArm = 'left_arm';
      } else if (
        locDamage.location === 'right_torso' &&
        newlyDestroyed.includes('right_arm')
      ) {
        cascadedArm = 'right_arm';
      }

      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.LocationDestroyed,
          turn,
          phase,
          {
            unitId,
            location: locDamage.location,
            cascadedTo: cascadedArm,
            viaTransfer: isTransferStep,
          },
          unitId,
        ),
      );
    }

    if (locDamage.transferredDamage > 0 && locDamage.transferLocation) {
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.TransferDamage,
          turn,
          phase,
          {
            unitId,
            fromLocation: locDamage.location,
            toLocation: locDamage.transferLocation,
            damage: locDamage.transferredDamage,
          },
          unitId,
        ),
      );
    }
  }
}

export function queueMineLegDamagePSR(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  phase: GamePhase;
  unitId: string;
  damageResult: IResolveDamageResult;
}): IGameState {
  const { currentState, damageResult, events, gameId, phase, unitId } = options;
  const unit = currentState.units[unitId];
  if (!unit || unit.destroyed) return currentState;

  const legStructureDamage = damageResult.result.locationDamages.some(
    (locDamage) =>
      (locDamage.location === 'left_leg' ||
        locDamage.location === 'right_leg') &&
      locDamage.structureDamage > 0,
  );
  if (!legStructureDamage) return currentState;

  return queueMinePSR({
    currentState,
    events,
    gameId,
    phase,
    unitId,
    psr: createLegDamagePSR(unitId),
  });
}

export function queueMineDamageThresholdPSR(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  phase: GamePhase;
  unitId: string;
}): IGameState {
  const { currentState, events, gameId, phase, unitId } = options;
  const unit = currentState.units[unitId];
  if (!unit || unit.destroyed || (unit.damageThisPhase ?? 0) < 20) {
    return currentState;
  }
  if (
    (unit.pendingPSRs ?? []).some(
      (pendingPSR) => pendingPSR.triggerSource === '20+_damage',
    )
  ) {
    return currentState;
  }

  return queueMinePSR({
    currentState,
    events,
    gameId,
    phase,
    unitId,
    psr: createDamagePSR(unitId),
  });
}

function queueMinePSR(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  phase: GamePhase;
  unitId: string;
  psr: IPendingPSR;
}): IGameState {
  const { currentState, events, gameId, phase, psr, unitId } = options;
  const unit = currentState.units[unitId];
  if (!unit) return currentState;

  events.push(
    createPSRTriggeredEvent(
      gameId,
      events.length,
      currentState.turn,
      phase,
      unitId,
      psr.reason,
      psr.additionalModifier,
      psr.triggerSource,
      unit.piloting,
      psr.reasonCode,
    ),
  );

  return {
    ...currentState,
    units: {
      ...currentState.units,
      [unitId]: {
        ...unit,
        pendingPSRs: [...(unit.pendingPSRs ?? []), psr],
      },
    },
  };
}
