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

  if (!details) {
    return { permitted: true, target: target as IUnitGameState };
  }

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
          reason: 'InvalidTarget' as const,
          details,
        },
        unitId,
      ),
    );
  }

  return { permitted: false };
}
