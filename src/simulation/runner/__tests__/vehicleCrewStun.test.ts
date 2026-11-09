import { GameEventType, GamePhase } from '@/types/gameplay';
import { createPhaseChangedEvent } from '@/utils/gameplay/gameEvents';
import { appendEvent } from '@/utils/gameplay/gameSession';
import { applyEvent } from '@/utils/gameplay/gameState';
import {
  crewStunEvent,
  stunnedVehicleSession,
} from '@/utils/gameplay/gameState/__tests__/vehicleCrewStun.helpers';

import { resetTurnState } from '../SimulationRunnerState';

describe('runner vehicle crew stun reset', () => {
  it.each([
    { stuns: 1, counters: [1, 0, 0] },
    { stuns: 2, counters: [2, 1, 0, 0] },
  ])(
    'matches replay at round boundaries after $stuns stuns without mutating input',
    ({ stuns, counters }) => {
      let session = stunnedVehicleSession();
      if (stuns === 2) session = appendEvent(session, crewStunEvent(session));
      let state = session.currentState;
      for (const expected of counters) {
        const turn = state.turn + 1;
        const snapshot = JSON.stringify(state);
        const live = resetTurnState({ ...state, turn });
        const event = {
          ...createPhaseChangedEvent(
            state.gameId,
            turn,
            turn,
            GamePhase.End,
            GamePhase.Initiative,
          ),
          type: GameEventType.TurnStarted,
          payload: {},
        };
        const replay = applyEvent(state, event);
        const combat = live.units.target.combatState;
        expect(combat?.kind).toBe('vehicle');
        if (combat?.kind !== 'vehicle') throw new Error('Expected vehicle');
        expect(combat.state.motive.crewStunnedPhases).toBe(expected);
        expect(combat).toEqual(replay.units.target.combatState);
        expect(JSON.stringify(state)).toBe(snapshot);
        state = live;
      }
    },
  );
});
