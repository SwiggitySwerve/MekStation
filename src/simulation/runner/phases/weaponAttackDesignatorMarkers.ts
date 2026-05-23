import {
  GameEventType,
  GamePhase,
  IGameEvent,
  IGameState,
} from '@/types/gameplay';
import { isNarc, isTAG } from '@/utils/gameplay/specialWeaponMechanics';

import type { IWeapon } from '../../ai/types';

import { createGameEvent } from './utils';
import { weaponTypeFromMountId } from './weaponAttackHelpers';

export function isNarcBeaconWeapon(weapon: IWeapon): boolean {
  return isNarc(weaponTypeFromMountId(weapon.id)) || isNarc(weapon.name);
}

export function isTagDesignatorWeapon(weapon: IWeapon): boolean {
  return isTAG(weaponTypeFromMountId(weapon.id)) || isTAG(weapon.name);
}

export function markTargetNarcedBy(options: {
  currentState: IGameState;
  targetId: string;
  attackerTeamId: string | undefined;
}): IGameState {
  const { attackerTeamId, targetId } = options;
  const target = options.currentState.units[targetId];
  if (!target || !attackerTeamId) return options.currentState;

  const narcedBy = target.narcedBy ?? [];
  if (narcedBy.includes(attackerTeamId)) return options.currentState;

  return {
    ...options.currentState,
    units: {
      ...options.currentState.units,
      [targetId]: {
        ...target,
        narcedBy: [...narcedBy, attackerTeamId],
      },
    },
  };
}

export function markTargetTagDesignated(
  currentState: IGameState,
  targetId: string,
): IGameState {
  const target = currentState.units[targetId];
  if (!target || target.tagDesignated === true) return currentState;

  return {
    ...currentState,
    units: {
      ...currentState.units,
      [targetId]: {
        ...target,
        tagDesignated: true,
      },
    },
  };
}

export function emitDesignatorMarkerApplied(options: {
  events: IGameEvent[];
  gameId: string;
  turn: number;
  unitId: string;
  targetId: string;
  weaponId: string;
  marker: 'narc' | 'tag';
  persistent: boolean;
  location?: string;
  teamId?: string;
}): void {
  const {
    events,
    gameId,
    location,
    marker,
    persistent,
    targetId,
    teamId,
    turn,
    unitId,
    weaponId,
  } = options;

  events.push(
    createGameEvent(
      gameId,
      events.length,
      GameEventType.DesignatorMarkerApplied,
      turn,
      GamePhase.WeaponAttack,
      {
        attackerId: unitId,
        targetId,
        weaponId,
        marker,
        persistent,
        turn,
        ...(location !== undefined ? { location } : {}),
        ...(teamId !== undefined ? { teamId } : {}),
      },
      unitId,
    ),
  );
}

export function emitZeroDamageDesignatorHit(options: {
  events: IGameEvent[];
  gameId: string;
  turn: number;
  unitId: string;
  targetId: string;
  weaponId: string;
  attackRoll: number;
  toHitNumber: number;
  location: string;
  weapon: IWeapon;
  projectileCount: number | undefined;
  firingArc: 'front' | 'left' | 'right' | 'rear';
}): void {
  const {
    attackRoll,
    events,
    firingArc,
    gameId,
    location,
    projectileCount,
    targetId,
    toHitNumber,
    turn,
    unitId,
    weapon,
    weaponId,
  } = options;

  events.push(
    createGameEvent(
      gameId,
      events.length,
      GameEventType.AttackResolved,
      turn,
      GamePhase.WeaponAttack,
      {
        attackerId: unitId,
        targetId,
        weaponId,
        roll: attackRoll,
        toHitNumber,
        hit: true,
        location,
        damage: 0,
        heat: weapon.heat,
        ...(projectileCount !== undefined ? { projectileCount } : {}),
        attackerArc: firingArc,
      },
      unitId,
    ),
  );
}
