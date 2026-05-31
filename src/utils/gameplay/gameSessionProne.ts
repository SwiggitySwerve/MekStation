import { GamePhase, GameStatus, type IGameSession } from '@/types/gameplay';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import {
  createGoProneMovementDeclaredEvent,
  createMovementLockedEvent,
} from './gameEvents';
import { appendEvent } from './gameSessionCore';

const GO_PRONE_UNIT_TYPES = new Set<string>([
  UnitType.BATTLEMECH,
  UnitType.OMNIMECH,
  UnitType.INDUSTRIALMECH,
]);

export function canUnitGoProne(
  unit: Pick<
    IGameSession['currentState']['units'][string],
    'isStuck' | 'prone' | 'unitType'
  >,
): boolean {
  if (unit.prone === true) return false;
  if (unit.isStuck === true) return false;
  return unit.unitType === undefined || GO_PRONE_UNIT_TYPES.has(unit.unitType);
}

export function getGoProneMpCost(
  unit: Pick<IGameSession['currentState']['units'][string], 'hullDown'>,
): number {
  return unit.hullDown === true ? 0 : 1;
}

export function goProne(session: IGameSession, unitId: string): IGameSession {
  const { phase, status, turn } = session.currentState;
  if (status !== GameStatus.Active || phase !== GamePhase.Movement) {
    return session;
  }

  const unit = session.currentState.units[unitId];
  if (
    !unit ||
    unit.destroyed ||
    unit.hasRetreated ||
    unit.hasEjected ||
    !canUnitGoProne(unit)
  ) {
    return session;
  }

  const mpCost = getGoProneMpCost(unit);

  let currentSession = appendEvent(
    session,
    createGoProneMovementDeclaredEvent(
      session.id,
      session.events.length,
      turn,
      unitId,
      unit.position,
      unit.facing,
      mpCost,
    ),
  );

  currentSession = appendEvent(
    currentSession,
    createMovementLockedEvent(
      currentSession.id,
      currentSession.events.length,
      turn,
      unitId,
    ),
  );

  return currentSession;
}
