import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import type { IGameEvent } from '@/types/gameplay';

import { GameEventType, GamePhase, GameSide } from '@/types/gameplay';

import { QuickGameReplayPanel } from '../QuickGameReplayPanel';

// Keep the real effects renderer; only the expensive terrain/map shell is
// replaced. This catches future combat leaking into the initial replay frame.
jest.mock('@/components/gameplay/HexMapDisplay/HexMapDisplay', () => {
  const { AttackEffectsLayer } = jest.requireActual<
    typeof import('@/components/gameplay/effects/AttackEffectsLayer')
  >('@/components/gameplay/effects/AttackEffectsLayer');
  return {
    HexMapDisplay: (
      props: React.ComponentProps<
        typeof import('@/components/gameplay/HexMapDisplay/HexMapDisplay').HexMapDisplay
      >,
    ) => (
      <svg>
        <AttackEffectsLayer
          events={props.events ?? []}
          tokens={props.tokens}
          mapId={props.mapId ?? 'test-replay'}
        />
      </svg>
    ),
  };
});

const events: readonly IGameEvent[] = [
  {
    id: 'created',
    gameId: 'cursor-effects',
    sequence: 0,
    timestamp: '2026-10-18T00:00:00.000Z',
    type: GameEventType.GameCreated,
    turn: 1,
    phase: GamePhase.Initiative,
    payload: {
      config: {
        mapRadius: 9,
        turnLimit: 100,
        victoryConditions: ['destruction'],
        optionalRules: [],
      },
      units: [
        {
          id: 'player',
          name: 'Atlas',
          side: GameSide.Player,
          unitRef: 'atlas-as7-d',
          pilotRef: 'player-pilot',
          gunnery: 4,
          piloting: 5,
        },
        {
          id: 'opponent',
          name: 'Locust',
          side: GameSide.Opponent,
          unitRef: 'locust-lct-1v',
          pilotRef: 'opponent-pilot',
          gunnery: 4,
          piloting: 5,
        },
      ],
    },
  },
  {
    id: 'future-attack',
    gameId: 'cursor-effects',
    sequence: 1,
    timestamp: '2026-10-18T00:00:01.000Z',
    type: GameEventType.AttackResolved,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    payload: {
      attackerId: 'player',
      targetId: 'opponent',
      weaponId: 'medium-laser',
      roll: 8,
      toHitNumber: 7,
      hit: true,
    },
  },
];

it('renders combat effects only when the replay cursor reaches them and clears them on rewind', async () => {
  const user = userEvent.setup();
  render(<QuickGameReplayPanel events={events} gameId="cursor-effects" />);

  expect(screen.getByText(/Event 1 of 2/)).toBeInTheDocument();
  expect(screen.queryByTestId('attack-effect-event-future-attack')).toBeNull();

  await user.click(screen.getByRole('button', { name: /step forward/i }));
  expect(
    screen.getByTestId('attack-effect-event-future-attack'),
  ).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /step backward/i }));
  expect(screen.queryByTestId('attack-effect-event-future-attack')).toBeNull();
});
