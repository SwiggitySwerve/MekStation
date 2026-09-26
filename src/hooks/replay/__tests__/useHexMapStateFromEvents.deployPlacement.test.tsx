/**
 * The shared hex-map projection seeds each token at the engine's deploy
 * hex and facing on GameCreated (roadmap unit U37), so a networked or
 * replayed board shows every unit where the engine placed it before any
 * MovementDeclared arrives.
 *
 * @spec openspec/specs/game-state-management/spec.md (GameCreated Event Handler)
 */

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

import type { IGameCreatedPayload, IGameEvent } from '@/types/gameplay';

import { HexMapDisplay } from '@/components/gameplay/HexMapDisplay/HexMapDisplay';
import { Facing, GameEventType, GameSide } from '@/types/gameplay';
import { deriveState } from '@/utils/gameplay/gameState';

import { deriveHexMapStateFromEvents } from '../useHexMapStateFromEvents';
import {
  makeEvent,
  makeStandardGameCreatedEvent,
  makeUnit,
} from './useHexMapStateFromEvents.test-helpers';

/** Builds a GameCreated event for a 2v2 whose units interleave the sides. */
function makeMirrored2v2GameCreatedEvent(): IGameEvent {
  const payload: IGameCreatedPayload = {
    config: {
      mapRadius: 17,
      turnLimit: 0,
      victoryConditions: ['destruction'],
      optionalRules: [],
    },
    units: [
      makeUnit({ id: 'player-1', name: 'Atlas 1', side: GameSide.Player }),
      makeUnit({
        id: 'opponent-1',
        name: 'Stalker 1',
        side: GameSide.Opponent,
      }),
      makeUnit({ id: 'player-2', name: 'Atlas 2', side: GameSide.Player }),
      makeUnit({
        id: 'opponent-2',
        name: 'Stalker 2',
        side: GameSide.Opponent,
      }),
    ],
  };
  return makeEvent({ sequence: 0, type: GameEventType.GameCreated, payload });
}

const MIRRORED_2V2_DEPLOYMENT = {
  'player-1': { position: { q: -2, r: 5 }, facing: Facing.North },
  'opponent-1': { position: { q: -2, r: -5 }, facing: Facing.South },
  'player-2': { position: { q: -1, r: 5 }, facing: Facing.North },
  'opponent-2': { position: { q: -1, r: -5 }, facing: Facing.South },
} as const;

describe('GameCreated seeds tokens at the engine deploy hex and facing', () => {
  it('seeds a mirrored 2v2 at players r=+5 North, opponents r=-5 South, q = per-side index - 2', () => {
    const state = deriveHexMapStateFromEvents(
      [makeMirrored2v2GameCreatedEvent()],
      0,
    );

    const placed = Object.fromEntries(
      state.tokens.map((token) => [
        token.unitId,
        { position: token.position, facing: token.facing },
      ]),
    );
    expect(placed).toEqual(MIRRORED_2V2_DEPLOYMENT);
  });

  it('agrees with the engine state for every unit of a mirrored 2v2', () => {
    const events = [makeMirrored2v2GameCreatedEvent()];
    const engineState = deriveState('test-game', events);
    const projection = deriveHexMapStateFromEvents(events, 0);

    expect(projection.tokens).toHaveLength(4);
    for (const token of projection.tokens) {
      const engineUnit = engineState.units[token.unitId];
      expect({ id: token.unitId, position: token.position }).toEqual({
        id: token.unitId,
        position: engineUnit.position,
      });
      expect({ id: token.unitId, facing: token.facing }).toEqual({
        id: token.unitId,
        facing: engineUnit.facing,
      });
    }
  });

  it('the board renders each unit at its deploy hex before any MovementDeclared', () => {
    const events = [makeStandardGameCreatedEvent()];
    const state = deriveHexMapStateFromEvents(events, 0);

    render(
      <HexMapDisplay
        mapId="u37-deploy-placement"
        radius={state.mapRadius}
        tokens={state.tokens}
        hexTerrain={state.hexTerrain}
        events={events}
        selectedHex={null}
      />,
    );

    const player = screen.getByTestId('unit-token-player-1');
    expect(player).toHaveAttribute('data-token-map-position', '-2,5');
    expect(player).toHaveAttribute('data-token-facing', String(Facing.North));
    const opponent = screen.getByTestId('unit-token-opponent-2');
    expect(opponent).toHaveAttribute('data-token-map-position', '-2,-5');
    expect(opponent).toHaveAttribute('data-token-facing', String(Facing.South));
  });
});
