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
  it('interactive phase advance expires stun only when the round changes and replays equally', () => {
    const { units, adapted } = participants();
    const engine = new GameEngine({ seed: 42, turnLimit: 5 });
    const interactive = engine.createInteractiveSession(
      [adapted[0]],
      [adapted[1]],
      units,
    );
    interactive.appendEvent(crewStunEvent(interactive.getSession()));
    const initialTurn = interactive.getSession().currentState.turn;
    for (
      let step = 0;
      step < 20 && interactive.getSession().currentState.turn < initialTurn + 2;
      step++
    ) {
      const before = interactive.getSession().currentState;
      interactive.advancePhase();
      const after = interactive.getSession();
      expect(stunnedRounds(after)).toBe(
        Math.max(0, 2 - (after.currentState.turn - initialTurn)),
      );
      if (after.currentState.turn > before.turn)
        expect(after.currentState.phase).toBe(GamePhase.Initiative);
      expect(
        hydrateGameSessionFromEvents(after.id, after.events).currentState.units
          .target.combatState,
      ).toEqual(after.currentState.units.target.combatState);
    }
    expect(stunnedRounds(interactive.getSession())).toBe(0);
  });

  it('runToCompletion expires an event-seeded stun through its real phase loop', () => {
    const actual = jest.requireActual<
      typeof import('@/utils/gameplay/gameSession')
    >('@/utils/gameplay/gameSession');
    jest.mocked(startGame).mockImplementationOnce((...args) => {
      const started = actual.startGame(...args);
      return appendEvent(started, crewStunEvent(started));
    });
    const { units, adapted } = participants();
    const result = new GameEngine({ seed: 42, turnLimit: 3 }).runToCompletion(
      [adapted[0]],
      [adapted[1]],
      units,
    );
    expect(result.currentState.turn).toBeGreaterThanOrEqual(3);
    expect(stunnedRounds(result)).toBe(0);
    expect(
      hydrateGameSessionFromEvents(result.id, result.events).currentState,
    ).toEqual(result.currentState);
  });
});
