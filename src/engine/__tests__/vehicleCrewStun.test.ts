import { Facing, GamePhase } from '@/types/gameplay';
import {
  mechUnit,
  vehicleUnit,
} from '@/utils/gameplay/__tests__/gameSessionVehicleAttackResolution.test-helpers';
import {
  appendEvent,
  hydrateGameSessionFromEvents,
  startGame,
} from '@/utils/gameplay/gameSession';
import {
  crewStunEvent,
  stunnedRounds,
} from '@/utils/gameplay/gameState/__tests__/vehicleCrewStun.helpers';
import { createInitialUnitState } from '@/utils/gameplay/gameState/initialization';

import type { IAdaptedUnit } from '../types';

import { GameEngine } from '../GameEngine';

jest.mock('@/utils/gameplay/gameSession', () => {
  const actual = jest.requireActual<
    typeof import('@/utils/gameplay/gameSession')
  >('@/utils/gameplay/gameSession');
  return { ...actual, startGame: jest.fn(actual.startGame) };
});

function participants() {
  const units = [mechUnit('attacker'), vehicleUnit()];
  const adapted: IAdaptedUnit[] = units.map((unit) => ({
    ...createInitialUnitState(unit, { q: 0, r: 0 }, Facing.North),
    vehicleInit: unit.vehicleInit,
    weapons: [],
    walkMP: 0,
    runMP: 0,
    jumpMP: 0,
  }));
  return { units, adapted };
}

describe('engine crew stun boundaries', () => {
  it.each([
    [1, 2],
    [2, 3],
  ])(
    'interactive phase advance expires %i stuns at round boundaries and replays equally',
    (stuns, initialRounds) => {
      const { units, adapted } = participants();
      const engine = new GameEngine({ seed: 42, turnLimit: 5 });
      const interactive = engine.createInteractiveSession(
        [adapted[0]],
        [adapted[1]],
        units,
      );
      for (let stun = 0; stun < stuns; stun++) {
        interactive.appendEvent(crewStunEvent(interactive.getSession()));
      }
      expect(stunnedRounds(interactive.getSession())).toBe(initialRounds);
      const initialTurn = interactive.getSession().currentState.turn;
      for (
        let step = 0;
        step < 30 &&
        interactive.getSession().currentState.turn <
          initialTurn + initialRounds;
        step++
      ) {
        const before = interactive.getSession().currentState;
        interactive.advancePhase();
        const after = interactive.getSession();
        expect(stunnedRounds(after)).toBe(
          Math.max(0, initialRounds - (after.currentState.turn - initialTurn)),
        );
        if (after.currentState.turn > before.turn)
          expect(after.currentState.phase).toBe(GamePhase.Initiative);
        expect(
          hydrateGameSessionFromEvents(after.id, after.events).currentState
            .units.target.combatState,
        ).toEqual(after.currentState.units.target.combatState);
      }
      expect(stunnedRounds(interactive.getSession())).toBe(0);
    },
  );

  it.each([
    [1, 2],
    [2, 3],
  ])(
    'runToCompletion expires %i event-seeded stuns through its real phase loop',
    (stuns, initialRounds) => {
      const actual = jest.requireActual<
        typeof import('@/utils/gameplay/gameSession')
      >('@/utils/gameplay/gameSession');
      jest.mocked(startGame).mockImplementationOnce((...args) => {
        let started = actual.startGame(...args);
        for (let stun = 0; stun < stuns; stun++) {
          started = appendEvent(started, crewStunEvent(started));
        }
        expect(stunnedRounds(started)).toBe(initialRounds);
        return started;
      });
      const { units, adapted } = participants();
      const result = new GameEngine({
        seed: 42,
        turnLimit: initialRounds + 1,
      }).runToCompletion([adapted[0]], [adapted[1]], units);
      expect(result.currentState.turn).toBeGreaterThanOrEqual(
        initialRounds + 1,
      );
      expect(stunnedRounds(result)).toBe(0);
      expect(
        hydrateGameSessionFromEvents(result.id, result.events).currentState,
      ).toEqual(result.currentState);
    },
  );
});
