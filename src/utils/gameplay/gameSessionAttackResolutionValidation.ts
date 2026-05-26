import { IGameSession, IUnitGameState } from '@/types/gameplay';

import { createAttackInvalidEvent } from './gameEvents';
import { appendEvent } from './gameSessionEvents';

export function invalidateSameHexAttack(
  session: IGameSession,
  attackerId: string,
  targetId: string,
): IGameSession | null {
  const attackerPos = session.currentState.units[attackerId]?.position;
  const targetPos = session.currentState.units[targetId]?.position;
  if (
    !attackerPos ||
    !targetPos ||
    attackerPos.q !== targetPos.q ||
    attackerPos.r !== targetPos.r
  ) {
    return null;
  }
  return appendEvent(
    session,
    createAttackInvalidEvent(
      session.id,
      session.events.length,
      session.currentState.turn,
      attackerId,
      targetId,
      'SameHex',
      undefined,
      'Attacker and target occupy the same hex',
    ),
  );
}

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

export function invalidateInvalidTargetAttack(
  session: IGameSession,
  attackerId: string,
  targetId: string,
  weaponIds: readonly string[],
): IGameSession | null {
  const attacker = session.currentState.units[attackerId];
  if (!attacker) return null;

  const details = invalidTargetDetails(
    attacker,
    session.currentState.units[targetId],
    targetId,
  );
  if (!details) return null;

  const eventWeaponIds = weaponIds.length > 0 ? weaponIds : [undefined];
  return eventWeaponIds.reduce(
    (currentSession, weaponId) =>
      appendEvent(
        currentSession,
        createAttackInvalidEvent(
          currentSession.id,
          currentSession.events.length,
          currentSession.currentState.turn,
          attackerId,
          targetId,
          'InvalidTarget',
          weaponId,
          details,
        ),
      ),
    session,
  );
}

export function invalidateEvadingAttackerAttack(
  session: IGameSession,
  attackerId: string,
  targetId: string,
  weaponIds: readonly string[],
): IGameSession | null {
  const attacker = session.currentState.units[attackerId];
  if (!attacker?.isEvading) return null;

  const details = `Attacker '${attackerId}' is evading and cannot fire ranged weapons`;
  const eventWeaponIds = weaponIds.length > 0 ? weaponIds : [undefined];
  return eventWeaponIds.reduce(
    (currentSession, weaponId) =>
      appendEvent(
        currentSession,
        createAttackInvalidEvent(
          currentSession.id,
          currentSession.events.length,
          currentSession.currentState.turn,
          attackerId,
          targetId,
          'AttackerEvading',
          weaponId,
          details,
        ),
      ),
    session,
  );
}

export function invalidateSprintingAttackerAttack(
  session: IGameSession,
  attackerId: string,
  targetId: string,
  weaponIds: readonly string[],
): IGameSession | null {
  const attacker = session.currentState.units[attackerId];
  if (attacker?.sprintedThisTurn !== true) return null;

  const details = `Attacker '${attackerId}' sprinted and cannot fire ranged weapons`;
  const eventWeaponIds = weaponIds.length > 0 ? weaponIds : [undefined];
  return eventWeaponIds.reduce(
    (currentSession, weaponId) =>
      appendEvent(
        currentSession,
        createAttackInvalidEvent(
          currentSession.id,
          currentSession.events.length,
          currentSession.currentState.turn,
          attackerId,
          targetId,
          'AttackerSprinted',
          weaponId,
          details,
        ),
      ),
    session,
  );
}
