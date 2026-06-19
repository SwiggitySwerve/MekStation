import {
  GameEventType,
  GamePhase,
  IGameEvent,
  IGameState,
} from '@/types/gameplay';
import { consumeAmmo } from '@/utils/gameplay/ammoTracking';

import type { IResolvedAMSInterception } from './weaponAttackAMS';

import { createGameEvent } from './utils';
import { markWeaponFiredForHeat } from './weaponAttackFiringModes';

export function applyAMSInterceptionResult(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  attackerId: string;
  targetId: string;
  incomingWeaponId: string;
  interception: IResolvedAMSInterception | undefined;
}): IGameState {
  const {
    events,
    gameId,
    attackerId,
    targetId,
    incomingWeaponId,
    interception,
  } = options;
  let { currentState } = options;
  if (interception === undefined) {
    return currentState;
  }

  currentState = markWeaponFiredForHeat(
    currentState,
    targetId,
    interception.amsWeaponId,
  );

  let ammoBinId: string | undefined;
  let ammoRemaining: number | undefined;
  const defender = currentState.units[targetId];
  const ammoStateBefore = defender?.ammoState;
  if (
    interception.ammoConsumed > 0 &&
    ammoStateBefore &&
    Object.keys(ammoStateBefore).length > 0
  ) {
    const ammoResult = consumeAmmo(
      ammoStateBefore,
      targetId,
      interception.ammoWeaponType,
      interception.ammoConsumed,
    );
    if (ammoResult) {
      ammoBinId = ammoResult.event.binId;
      ammoRemaining = ammoResult.event.roundsRemaining;
      currentState = {
        ...currentState,
        units: {
          ...currentState.units,
          [targetId]: {
            ...currentState.units[targetId],
            ammoState: ammoResult.updatedAmmoState,
          },
        },
      };
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.AmmoConsumed,
          currentState.turn,
          GamePhase.WeaponAttack,
          {
            unitId: targetId,
            binId: ammoResult.event.binId,
            weaponType: ammoResult.event.weaponType,
            roundsConsumed: ammoResult.event.roundsConsumed,
            roundsRemaining: ammoResult.event.roundsRemaining,
          },
          targetId,
        ),
      );
    }
  }

  events.push(
    createGameEvent(
      gameId,
      events.length,
      GameEventType.AMSInterception,
      currentState.turn,
      GamePhase.WeaponAttack,
      {
        defenderId: targetId,
        targetId,
        attackerId,
        incomingWeaponId,
        amsWeaponId: interception.amsWeaponId,
        resolution: interception.resolution,
        incomingProjectiles: interception.incomingProjectiles,
        projectilesIntercepted: interception.projectilesIntercepted,
        projectilesRemaining: interception.projectilesRemaining,
        ammoConsumed: interception.ammoConsumed,
        roll: interception.roll,
        ...(interception.clusterRoll !== undefined
          ? { clusterRoll: interception.clusterRoll }
          : {}),
        ...(interception.clusterModifier !== undefined
          ? { clusterModifier: interception.clusterModifier }
          : {}),
        ...(interception.modifiedClusterRoll !== undefined
          ? { modifiedClusterRoll: interception.modifiedClusterRoll }
          : {}),
        ...(ammoBinId !== undefined ? { ammoBinId } : {}),
        ...(ammoRemaining !== undefined ? { ammoRemaining } : {}),
      },
      targetId,
    ),
  );

  return currentState;
}
