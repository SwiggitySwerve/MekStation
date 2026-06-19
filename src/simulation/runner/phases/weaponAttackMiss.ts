import { FiringArc, type IGameEvent, type IGameState } from '@/types/gameplay';

import type { IWeapon } from '../../ai/types';

import { appendAttackResolvedEvent } from './utils';
import {
  markWeaponFiredForHeat,
  shouldSpendAmmoAndHeatOnMiss,
} from './weaponAttackFiringModes';
import { consumeWeaponAmmo } from './weaponAttackHitResolution.helpers';

export function resolveWeaponAttackMiss(options: {
  readonly currentState: IGameState;
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly attackerId: string;
  readonly targetId: string;
  readonly weaponId: string;
  readonly weapon: IWeapon;
  readonly shotHeat: number;
  readonly ammoWeaponType: string;
  readonly attackRoll: number;
  readonly toHitNumber: number;
  readonly firingArc: FiringArc;
}): IGameState {
  const {
    ammoWeaponType,
    attackRoll,
    attackerId,
    events,
    firingArc,
    gameId,
    shotHeat,
    targetId,
    toHitNumber,
    weapon,
    weaponId,
  } = options;
  let { currentState } = options;

  const spendOnMiss = shouldSpendAmmoAndHeatOnMiss(weapon);
  if (spendOnMiss) {
    currentState = markWeaponFiredForHeat(currentState, attackerId, weapon.id);
  }

  appendAttackResolvedEvent({
    events,
    gameId,
    turn: currentState.turn,
    payload: {
      attackerId,
      targetId,
      weaponId,
      roll: attackRoll,
      toHitNumber,
      hit: false,
      heat: spendOnMiss ? shotHeat : 0,
      attackerArc: firingArc,
    },
    actorId: attackerId,
  });

  if (!spendOnMiss) {
    return currentState;
  }

  return consumeWeaponAmmo({
    currentState,
    events,
    gameId,
    attackerId,
    weapon,
    ammoWeaponType,
  });
}
