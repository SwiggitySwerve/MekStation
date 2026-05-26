import {
  GameEventType,
  GamePhase,
  IGameSession,
  IUnitGameState,
} from '@/types/gameplay';

import { createAttacksRevealedEvent } from './gameEvents';
import { appendEvent } from './gameSessionEvents';
import { allUnitsLocked } from './gameState';

type RevealEligibleUnit = Pick<
  IUnitGameState,
  | 'destroyed'
  | 'hasEjected'
  | 'hasRetreated'
  | 'id'
  | 'pilotConscious'
  | 'shutdown'
>;

export function appendAttackRevealIfReady(
  session: IGameSession,
  lockedUnitId: string,
): IGameSession {
  if (!shouldRevealLockedAttacks(session, lockedUnitId)) {
    return session;
  }

  const revealEvent = createAttacksRevealedEvent(
    session.id,
    session.events.length,
    session.currentState.turn,
    getActiveWeaponPhaseUnitIds(session),
    countAttackDeclarationsForTurn(session),
  );

  return appendEvent(session, revealEvent);
}

function shouldRevealLockedAttacks(
  session: IGameSession,
  lockedUnitId: string,
): boolean {
  if (session.currentState.phase !== GamePhase.WeaponAttack) {
    return false;
  }

  const lockedUnit = session.currentState.units[lockedUnitId];
  if (!lockedUnit || !isActiveWeaponPhaseUnit(lockedUnit)) {
    return false;
  }

  return (
    allUnitsLocked(session.currentState) &&
    !session.events.some(
      (event) =>
        event.type === GameEventType.AttacksRevealed &&
        event.turn === session.currentState.turn,
    )
  );
}

function getActiveWeaponPhaseUnitIds(session: IGameSession): readonly string[] {
  return Object.values(session.currentState.units)
    .filter(isActiveWeaponPhaseUnit)
    .map((unit) => unit.id)
    .sort();
}

function isActiveWeaponPhaseUnit(unit: RevealEligibleUnit): boolean {
  return (
    !unit.destroyed &&
    unit.shutdown !== true &&
    !unit.hasRetreated &&
    !unit.hasEjected &&
    unit.pilotConscious
  );
}

function countAttackDeclarationsForTurn(session: IGameSession): number {
  return session.events.filter(
    (event) =>
      event.type === GameEventType.AttackDeclared &&
      event.turn === session.currentState.turn,
  ).length;
}
