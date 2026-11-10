import type { IGameState } from '@/types/gameplay';

import { applyEvent, deriveState } from '@/utils/gameplay/gameState';

import { makeReconnectHostEvents } from './gameSessionEvents.fixtures';

describe('GameCreated reset characterization (before the reconnect fix)', () => {
  const events = makeReconnectHostEvents();
  const prefixState = deriveState('match-1', events.slice(0, 12));
  const repeatedCreated = applyEvent(prefixState, events[0]);
  const freshCreated = deriveState('match-1', events.slice(0, 1));
  const freshFull = deriveState('match-1', events);
  const repeatedFull = events.reduce(applyEvent, prefixState);

  it('does not reset every field: turn, phase, initiative, terrain and morale survive', () => {
    const differingFields = (
      Object.keys(repeatedCreated) as (keyof IGameState)[]
    ).filter(
      (field) =>
        JSON.stringify(repeatedCreated[field]) !==
        JSON.stringify(freshCreated[field]),
    );
    expect(differingFields.sort()).toEqual(
      [
        'battleMorale',
        'firstMover',
        'initiativeWinner',
        'phase',
        'terrainOverrides',
        'turn',
        'turnEvents',
      ].sort(),
    );
    expect(repeatedCreated.units).toEqual(freshCreated.units);
  });

  it.each(Object.keys(freshFull) as (keyof IGameState)[])(
    'the prefix plus repeated full stream matches fresh full replay for %s',
    (field) => expect(repeatedFull[field]).toStrictEqual(freshFull[field]),
  );
  it('the full state has exactly the fresh replay fields', () => {
    expect(Object.keys(repeatedFull).sort()).toEqual(
      Object.keys(freshFull).sort(),
    );
  });
});
