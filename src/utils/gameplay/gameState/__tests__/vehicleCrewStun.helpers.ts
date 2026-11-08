import { GamePhase, GameSide, type IGameSession } from '@/types/gameplay';
import { createCriticalHitResolvedEvent } from '@/utils/gameplay/gameEvents';
import {
  appendEvent,
  createGameSession,
  startGame,
} from '@/utils/gameplay/gameSession';

import {
  config,
  mechUnit,
  vehicleUnit,
} from '../../__tests__/gameSessionVehicleAttackResolution.test-helpers';

export function crewStunEvent(session: IGameSession) {
  return createCriticalHitResolvedEvent({
    gameId: session.id,
    sequence: session.events.length,
    turn: session.currentState.turn,
    phase: GamePhase.WeaponAttack,
    unitId: 'target',
    location: 'Front',
    slotIndex: 0,
    componentType: 'crew',
    componentName: 'Crew',
    effect: 'crew_stunned',
    destroyed: false,
  });
}

export function stunnedVehicleSession(): IGameSession {
  const session = startGame(
    createGameSession(config(), [mechUnit('attacker'), vehicleUnit()]),
    GameSide.Player,
  );
  return appendEvent(session, crewStunEvent(session));
}

export function stunnedRounds(session: IGameSession): number {
  const combat = session.currentState.units.target.combatState;
  if (combat?.kind !== 'vehicle') throw new Error('Expected a vehicle fixture');
  return combat.state.motive.crewStunnedPhases;
}
