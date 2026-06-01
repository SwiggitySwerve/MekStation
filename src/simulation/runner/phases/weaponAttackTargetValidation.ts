import {
  GameEventType,
  GamePhase,
  type IGameEvent,
  type IGameState,
  type IUnitGameState,
} from '@/types/gameplay';

import { createGameEvent } from './utils';

function invalidTargetDetails(
  attacker: IUnitGameState,
  target: IUnitGameState | undefined,
  targetId: string,
): string | null {
  if (!target) return `Target '${targetId}' does not exist`;
  if (target.destroyed) return `Target '${targetId}' is destroyed`;
  if (target.hasRetreated) return `Target '${targetId}' has retreated`;
  if (target.hasEjected) return `Target '${targetId}' has ejected`;
  if (target.side === attacker.side) {
    return `Target '${targetId}' is on the same side as attacker`;
  }
  return null;
}

function evadingAttackerDetails(
  attacker: IUnitGameState,
  attackerId: string,
): string | null {
  if (!attacker.isEvading) return null;
  return `Attacker '${attackerId}' is evading and cannot fire ranged weapons`;
}

function sprintingAttackerDetails(
  attacker: IUnitGameState,
  attackerId: string,
): string | null {
  if (attacker.sprintedThisTurn !== true) return null;
  return `Attacker '${attackerId}' sprinted and cannot fire ranged weapons`;
}

function emitAttackInvalid(options: {
  currentState: IGameState;
  declaredWeaponIds: readonly string[];
  details: string;
  events: IGameEvent[];
  gameId: string;
  reason: 'InvalidTarget' | 'AttackerEvading' | 'AttackerSprinted';
  targetId: string;
  unitId: string;
}): void {
  const {
    currentState,
    declaredWeaponIds,
    details,
    events,
    gameId,
    reason,
    targetId,
    unitId,
  } = options;
  const weaponIds = declaredWeaponIds.length > 0 ? declaredWeaponIds : [null];
  for (const weaponId of weaponIds) {
    events.push(
      createGameEvent(
        gameId,
        events.length,
        GameEventType.AttackInvalid,
        currentState.turn,
        GamePhase.WeaponAttack,
        {
          attackerId: unitId,
          targetId,
          ...(weaponId ? { weaponId } : {}),
          reason,
          details,
        },
        unitId,
      ),
    );
  }
}

export function validateDeclaredAttackTarget(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  unitId: string;
  targetId: string;
  declaredWeaponIds: readonly string[];
}): { permitted: true; target: IUnitGameState } | { permitted: false } {
  const { currentState, declaredWeaponIds, events, gameId, targetId, unitId } =
    options;
  const attacker = currentState.units[unitId];
  const target = currentState.units[targetId];
  const details = invalidTargetDetails(attacker, target, targetId);

  if (details) {
    emitAttackInvalid({
      currentState,
      declaredWeaponIds,
      details,
      events,
      gameId,
      reason: 'InvalidTarget',
      targetId,
      unitId,
    });
    return { permitted: false };
  }

  const attackerDetails = evadingAttackerDetails(attacker, unitId);
  if (attackerDetails) {
    emitAttackInvalid({
      currentState,
      declaredWeaponIds,
      details: attackerDetails,
      events,
      gameId,
      reason: 'AttackerEvading',
      targetId,
      unitId,
    });
    return { permitted: false };
  }

  const sprintingAttackerReason = sprintingAttackerDetails(attacker, unitId);
  if (sprintingAttackerReason) {
    emitAttackInvalid({
      currentState,
      declaredWeaponIds,
      details: sprintingAttackerReason,
      events,
      gameId,
      reason: 'AttackerSprinted',
      targetId,
      unitId,
    });
    return { permitted: false };
  }

  return { permitted: true, target: target as IUnitGameState };
}
