import {
  GameEventType,
  GamePhase,
  IGameEvent,
  IGameState,
  type IINarcPodState,
} from '@/types/gameplay';
import { hexLine } from '@/utils/gameplay/hexMath';
import {
  isEquivalentINarcPod,
  isNarc,
  isTAG,
} from '@/utils/gameplay/specialWeaponMechanics';

import type { IWeapon, IWeaponFiringMode } from '../../ai/types';

import { appendAttackResolvedEvent, createGameEvent } from './utils';
import { weaponTypeFromMountId } from './weaponAttackHelpers';

export function isNarcBeaconWeapon(weapon: IWeapon): boolean {
  const text =
    `${weaponTypeFromMountId(weapon.id)} ${weapon.name}`.toLowerCase();
  if (/\bi[-\s]?narc\b/.test(text) || text.includes('inarc')) {
    return false;
  }
  return isNarc(weaponTypeFromMountId(weapon.id)) || isNarc(weapon.name);
}

export function isINarcBeaconWeapon(weapon: IWeapon): boolean {
  const text =
    `${weaponTypeFromMountId(weapon.id)} ${weapon.name}`.toLowerCase();
  return /\bi[-\s]?narc\b/.test(text) || text.includes('inarc');
}

export function iNarcPodTypeFromAmmoWeaponType(
  ammoWeaponType: string | undefined,
): IINarcPodState['podType'] | undefined {
  const normalized = (ammoWeaponType ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');

  if (/(?:^|-)ecm(?:-|$)/.test(normalized)) return 'ecm';
  if (/(?:^|-)haywire(?:-|$)/.test(normalized)) return 'haywire';
  if (/(?:^|-)nemesis(?:-|$)/.test(normalized)) return 'nemesis';
  if (/(?:^|-)explosive(?:-|$)/.test(normalized)) return undefined;
  if (
    /(?:^|-)homing(?:-|$)/.test(normalized) ||
    /(?:^|-)i?narc(?:-|$)/.test(normalized)
  ) {
    return 'homing';
  }
  return undefined;
}

export function isINarcExplosiveAmmoWeaponType(
  ammoWeaponType: string | undefined,
): boolean {
  const normalized = (ammoWeaponType ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');

  return (
    /(?:^|-)i?narc(?:-|$)/.test(normalized) &&
    /(?:^|-)explosive(?:-|$)/.test(normalized)
  );
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
    (
      unit as IGameState['units'][string] & {
        readonly iNarcMarkedByTeams?: readonly string[];
      }
    ).iNarcMarkedByTeams ?? [];

  const teams: string[] = [];
  for (const teamId of [...homingPodTeams, ...legacyTeams]) {
    if (!teams.includes(teamId)) {
      teams.push(teamId);
    }
  }

  return teams;
}

export function hasINarcPodType(
  unit: IGameState['units'][string] | undefined,
  podType: IINarcPodState['podType'],
): boolean {
  return (unit?.iNarcPods ?? []).some((pod) => pod.podType === podType);
}

function isIndirectWeaponMode(mode: IWeaponFiringMode | undefined): boolean {
  return /\bindirect\b/i.test(mode?.id ?? '');
}

function isArtemisLinkedMissile(weapon: IWeapon): boolean {
  return (
    weapon.hasArtemisIV === true ||
    weapon.hasPrototypeArtemisIV === true ||
    weapon.hasArtemisV === true
  );
}

function isAtmWeapon(weapon: IWeapon, ammoWeaponType: string): boolean {
  const text = `${weaponTypeFromMountId(weapon.id)} ${weapon.name} ${ammoWeaponType}`;
  return /\batm[\s-]?\d*/i.test(text);
}

function isSourceBackedNemesisLrmSrm(
  weapon: IWeapon,
  ammoWeaponType: string,
): boolean {
  const text = `${weaponTypeFromMountId(weapon.id)} ${weapon.name} ${ammoWeaponType}`;
  return /\b(?:lrm|srm)[\s-]?\d*/i.test(text);
}

function isNemesisConfusableMissile(options: {
  weapon: IWeapon;
  selectedMode: IWeaponFiringMode | undefined;
  ammoWeaponType: string;
}): boolean {
  const { ammoWeaponType, selectedMode, weapon } = options;
  if (isIndirectWeaponMode(selectedMode)) return false;
  const atmWeapon = isAtmWeapon(weapon, ammoWeaponType);
  const lrmOrSrmWeapon = isSourceBackedNemesisLrmSrm(weapon, ammoWeaponType);
  if (atmWeapon) return true;
  if (isArtemisLinkedMissile(weapon)) return lrmOrSrmWeapon;
  return lrmOrSrmWeapon;
}

export function findINarcNemesisRedirectTarget(options: {
  currentState: IGameState;
  attackerId: string;
  targetId: string;
  weapon: IWeapon;
  selectedMode: IWeaponFiringMode | undefined;
  ammoWeaponType: string;
}): string | undefined {
  const {
    ammoWeaponType,
    attackerId,
    currentState,
    selectedMode,
    targetId,
    weapon,
  } = options;
  const attacker = currentState.units[attackerId];
  const target = currentState.units[targetId];
  if (!attacker || !target) return undefined;
  if (!isNemesisConfusableMissile({ ammoWeaponType, selectedMode, weapon })) {
    return undefined;
  }

  const interveningKeys = new Set(
    hexLine(attacker.position, target.position)
      .slice(1, -1)
      .map((coord) => `${coord.q},${coord.r}`),
  );
  if (interveningKeys.size === 0) return undefined;

  return Object.values(currentState.units)
    .filter(
      (unit) =>
        unit.id !== attackerId &&
        unit.id !== targetId &&
        unit.side === attacker.side &&
        !unit.destroyed &&
        unit.hasRetreated !== true &&
        unit.hasEjected !== true &&
        hasINarcPodType(unit, 'nemesis') &&
        interveningKeys.has(`${unit.position.q},${unit.position.r}`),
    )
    .sort(
      (a, b) =>
        hexLine(attacker.position, a.position).length -
        hexLine(attacker.position, b.position).length,
    )[0]?.id;
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
  const incomingPod = { teamId: attackerTeamId, podType };
  const alreadyAttached = iNarcPods.some((pod) =>
    isEquivalentINarcPod(pod, incomingPod),
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

  appendAttackResolvedEvent({
    events,
    gameId,
    turn,
    payload: {
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
    actorId: unitId,
  });
}
