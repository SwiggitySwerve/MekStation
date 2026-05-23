import type { CriticalHitEvent } from '@/utils/gameplay/criticalHitResolution/types';
import type { IResolveDamageResult } from '@/utils/gameplay/damage';

import {
  GameEventType,
  GamePhase,
  IGameEvent,
  IGameState,
} from '@/types/gameplay';
import { isLegLocation } from '@/utils/gameplay/hitLocation';
import { createLegDamagePSR } from '@/utils/gameplay/pilotingSkillRolls';

import { createGameEvent } from './utils';

/**
 * Queue a leg-damage PSR when a weapon hit breaches leg armor and damages
 * internal structure. Mirrors the interactive resolver's leg-damage
 * `PSRTriggered` emission while keeping the runner's immediate PSR phase
 * backed by `unit.pendingPSRs`.
 */
export function applyLegDamagePSR(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  targetId: string;
  damageResult: IResolveDamageResult;
}): IGameState {
  const { currentState, damageResult, events, gameId, targetId } = options;
  const target = currentState.units[targetId];
  if (!target || target.destroyed || target.hasRetreated || target.hasEjected) {
    return currentState;
  }

  const legStructureDamage = damageResult.result.locationDamages.find(
    (locationDamage) =>
      isLegLocation(locationDamage.location) &&
      locationDamage.structureDamage > 0,
  );
  if (!legStructureDamage) {
    return currentState;
  }

  const psr = createLegDamagePSR(targetId);
  events.push(
    createGameEvent(
      gameId,
      events.length,
      GameEventType.PSRTriggered,
      currentState.turn,
      GamePhase.WeaponAttack,
      {
        unitId: targetId,
        reason: psr.reason,
        additionalModifier: psr.additionalModifier,
        triggerSource: psr.triggerSource,
        ...(target.piloting !== undefined
          ? { basePilotingSkill: target.piloting }
          : {}),
        ...(psr.reasonCode !== undefined ? { reasonCode: psr.reasonCode } : {}),
      },
      targetId,
    ),
  );

  return {
    ...currentState,
    units: {
      ...currentState.units,
      [targetId]: {
        ...target,
        pendingPSRs: [...(target.pendingPSRs ?? []), psr],
      },
    },
  };
}

/**
 * Queue pending PSRs produced by the critical-hit resolver so the
 * runner's immediate PSR phase resolves the same crit-origin rolls that
 * replay/session reducers derive from `PSRTriggered` events.
 */
export function applyCriticalPSRTriggers(
  currentState: IGameState,
  criticalEvents: readonly CriticalHitEvent[] | undefined,
): IGameState {
  const psrEvents =
    criticalEvents?.filter((event) => event.type === 'psr_triggered') ?? [];
  if (psrEvents.length === 0) {
    return currentState;
  }

  let updatedState = currentState;
  for (const event of psrEvents) {
    const payload = event.payload;
    const unit = updatedState.units[payload.unitId];
    if (!unit || unit.destroyed || unit.hasRetreated || unit.hasEjected) {
      continue;
    }

    updatedState = {
      ...updatedState,
      units: {
        ...updatedState.units,
        [payload.unitId]: {
          ...unit,
          pendingPSRs: [
            ...(unit.pendingPSRs ?? []),
            {
              entityId: payload.unitId,
              reason: payload.reason,
              additionalModifier: payload.additionalModifier,
              triggerSource: payload.triggerSource,
              ...(payload.reasonCode !== undefined
                ? { reasonCode: payload.reasonCode }
                : {}),
            },
          ],
        },
      },
    };
  }

  return updatedState;
}
