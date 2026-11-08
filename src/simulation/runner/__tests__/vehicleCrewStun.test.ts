import { GameEventType, GamePhase } from '@/types/gameplay';
import { createPhaseChangedEvent } from '@/utils/gameplay/gameEvents';
import { applyEvent } from '@/utils/gameplay/gameState';
import { stunnedVehicleSession } from '@/utils/gameplay/gameState/__tests__/vehicleCrewStun.helpers';

import { resetTurnState } from '../SimulationRunnerState';

describe('runner vehicle crew stun reset', () => {
  it('matches folded replay vehicle state at each round boundary without mutating input', () => {
    let state = stunnedVehicleSession().currentState;
    for (const expected of [1, 0, 0]) {
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
  });
});
