import {
  GameEventType,
  GamePhase,
  IGameEvent,
  IGameState,
  ISecondaryTarget,
  RangeBracket,
} from '@/types/gameplay';

import type { IAIPlayer } from '../../ai/IAIPlayer';
import type { IWeapon } from '../../ai/types';

import {
  applyDestroyedArtemisFcsToWeapons,
  applyDestroyedWeaponCriticalsToWeapons,
  toAIUnitState,
} from '../SimulationRunnerSupport';
import { createGameEvent } from './utils';
import { isTargetInAttackerFrontArc } from './weaponAttackC3';
import { getSelectedFiringMode } from './weaponAttackFiringModes';

export function selectPrimaryWeaponAttackTargetId(
  state: IGameState,
  attackerId: string,
  targetIds: readonly string[],
): string | undefined {
  const distinctTargetIds = targetIds.filter(
    (targetId, index) => targetIds.indexOf(targetId) === index,
  );
  return (
    distinctTargetIds.find((targetId) =>
      isTargetInAttackerFrontArc(state, attackerId, targetId),
    ) ?? distinctTargetIds[0]
  );
}

export function buildSecondaryTargetState(
  state: IGameState,
  attackerId: string,
  targetId: string,
  primaryTargetId: string | undefined,
): ISecondaryTarget | undefined {
  if (!primaryTargetId || targetId === primaryTargetId) return undefined;

  return {
    isSecondary: true,
    inFrontArc: isTargetInAttackerFrontArc(state, attackerId, targetId),
  };
}

export function isInactiveWeaponPhaseUnit(
  unit: IGameState['units'][string] | undefined,
): boolean {
  return (
    !unit ||
    unit.destroyed ||
    unit.hasRetreated ||
    unit.hasEjected ||
    unit.shutdown ||
    !unit.pilotConscious
  );
}

export function isUnavailableWeaponAttackTarget(
  unit: IGameState['units'][string] | undefined,
): boolean {
  return (
    !unit ||
    unit.destroyed === true ||
    unit.hasRetreated === true ||
    unit.hasEjected === true
  );
}

export function weaponAttackRangeInvalidReason(
  distance: number,
  rangeBracket: RangeBracket,
): 'SameHex' | 'OutOfRange' | null {
  if (distance === 0) return 'SameHex';
  if (rangeBracket === RangeBracket.OutOfRange) return 'OutOfRange';
  return null;
}

export function hasDeclaredWeaponAttackEvent(
  attackEvent: ReturnType<IAIPlayer['playAttackPhase']>,
): attackEvent is NonNullable<ReturnType<IAIPlayer['playAttackPhase']>> {
  return attackEvent !== null && attackEvent.payload.weapons.length > 0;
}

export function weaponPhaseEnemyUnits(options: {
  readonly state: IGameState;
  readonly attacker: IGameState['units'][string];
  readonly allAIUnits: ReturnType<typeof toAIUnitState>[];
}): ReturnType<typeof toAIUnitState>[] {
  const { allAIUnits, attacker, state } = options;
  return allAIUnits.filter((aiEnemy) => {
    const enemy = state.units[aiEnemy.unitId];
    return (
      enemy !== undefined &&
      !enemy.destroyed &&
      !enemy.hasRetreated &&
      !enemy.hasEjected &&
      enemy.side !== attacker.side
    );
  });
}

export function buildWeaponLookup(
  unit: IGameState['units'][string],
  hydratedWeapons: readonly IWeapon[] | undefined,
): Map<string, IWeapon> {
  const weaponLookup = new Map<string, IWeapon>();
  if (!hydratedWeapons) return weaponLookup;

  const effectiveHydratedWeapons = applyDestroyedArtemisFcsToWeapons(
    unit,
    applyDestroyedWeaponCriticalsToWeapons(unit, hydratedWeapons),
  );
  for (const weapon of effectiveHydratedWeapons) {
    weaponLookup.set(weapon.id, weapon);
  }
  return weaponLookup;
}

export function appendWeaponAttackInvalidEvent(options: {
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly turn: number;
  readonly attackerId: string;
  readonly targetId: string;
  readonly weaponId: string;
  readonly reason:
    | 'UnknownWeapon'
    | 'WeaponDestroyed'
    | 'SameHex'
    | 'OutOfRange'
    | 'WeaponJammed'
    | 'OutOfAmmo';
  readonly details?: string;
}): void {
  const {
    attackerId,
    details,
    events,
    gameId,
    reason,
    targetId,
    turn,
    weaponId,
  } = options;
  events.push(
    createGameEvent(
      gameId,
      events.length,
      GameEventType.AttackInvalid,
      turn,
      GamePhase.WeaponAttack,
      {
        attackerId,
        targetId,
        weaponId,
        reason,
        ...(details !== undefined ? { details } : {}),
      },
      attackerId,
    ),
  );
}

export function declaredAttackPayloadMaps(options: {
  readonly weaponId: string;
  readonly selectedModeId: string | undefined;
  readonly selectedMode: ReturnType<typeof getSelectedFiringMode>;
  readonly selectedAMSWeaponId: string | undefined;
}): {
  readonly declaredWeaponModes?: Record<string, string>;
  readonly declaredSelectedAMSWeaponIds?: Record<string, string>;
} {
  const { selectedAMSWeaponId, selectedMode, selectedModeId, weaponId } =
    options;
  return {
    ...(selectedModeId && selectedMode !== undefined
      ? { declaredWeaponModes: { [weaponId]: selectedModeId } }
      : {}),
    ...(selectedAMSWeaponId !== undefined
      ? { declaredSelectedAMSWeaponIds: { [weaponId]: selectedAMSWeaponId } }
      : {}),
  };
}
