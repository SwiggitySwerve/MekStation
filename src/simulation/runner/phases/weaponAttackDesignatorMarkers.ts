import {
  GameEventType,
  GamePhase,
  IGameEvent,
  IGameState,
  type IINarcPodState,
} from '@/types/gameplay';
import { isNarc, isTAG } from '@/utils/gameplay/specialWeaponMechanics';

import type { IWeapon } from '../../ai/types';

import { createGameEvent } from './utils';
import { weaponTypeFromMountId } from './weaponAttackHelpers';

export function isNarcBeaconWeapon(weapon: IWeapon): boolean {
  return isNarc(weaponTypeFromMountId(weapon.id)) || isNarc(weapon.name);
}

export function isINarcBeaconWeapon(weapon: IWeapon): boolean {
  const text =
    `${weaponTypeFromMountId(weapon.id)} ${weapon.name}`.toLowerCase();
  return /\bi[-\s]?narc\b/.test(text) || text.includes('inarc');
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

export function iNarcHomingTeams(
  unit: IGameState['units'][string] | undefined,
): readonly string[] {
  if (!unit) return [];
  const homingPodTeams = (unit.iNarcPods ?? [])
    .filter((pod) => pod.podType === 'homing')
    .map((pod) => pod.teamId);

  const legacyTeams =
    (unit as unknown as { iNarcMarkedByTeams?: readonly string[] })
      .iNarcMarkedByTeams ?? [];

  const teams: string[] = [];
  for (const teamId of [...homingPodTeams, ...legacyTeams]) {
    if (!teams.includes(teamId)) {
      teams.push(teamId);
    }
  }

  return teams;
}

export function markTargetINarcPod(options: {
  currentState: IGameState;
  targetId: string;
  attackerTeamId: string | undefined;
  location?: string;
  podType: IINarcPodState['podType'];
}): IGameState {
  const { attackerTeamId, location, podType, targetId } = options;
  const target = options.currentState.units[targetId];
  if (!target || !attackerTeamId) return options.currentState;

  const iNarcPods = target.iNarcPods ?? [];
  const alreadyAttached = iNarcPods.some(
    (pod) => pod.teamId === attackerTeamId && pod.podType === podType,
  );
  if (alreadyAttached) return options.currentState;

  const pod: IINarcPodState = {
    teamId: attackerTeamId,
    podType,
    ...(location !== undefined ? { location } : {}),
  };

  return {
    ...options.currentState,
    units: {
      ...options.currentState.units,
      [targetId]: {
        ...target,
        iNarcPods: [...iNarcPods, pod],
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
  marker: 'inarc' | 'narc' | 'tag';
  podType?: IINarcPodState['podType'];
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
    podType,
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
        ...(podType !== undefined ? { podType } : {}),
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
