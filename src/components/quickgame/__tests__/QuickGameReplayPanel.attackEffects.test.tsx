/**
 * QuickGameReplayPanel.attackEffects — integration test for the
 * `add-replay-step-and-effect-animations` (tactical-map-interface
 * delta — "Attack Effects Layer In Replay Surfaces"):
 *
 *   - QuickGameReplayPanel mounts the attack effects layer
 *
 * `<HexMapDisplay>` already mounts `<AttackEffectsLayer>` internally
 * with the `mapId` it receives (line 463 of HexMapDisplay.tsx). The
 * spec contract is therefore that `QuickGameReplayPanel` forwards
 * `mapId='quickgame-replay'` plus `events` and `tokens` to
 * `HexMapDisplay`, which in turn drives the layer.
 *
 * We mock `HexMapDisplay` AND mount a minimal `AttackEffectsLayer`
 * proxy inside the mock so the assertion can target both forwarding
 * paths at once.
 *
 * @spec openspec/changes/add-replay-step-and-effect-animations/specs/tactical-map-interface/spec.md
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  IGameCreatedPayload,
  IGameEvent,
  IGameUnit,
} from '@/types/gameplay';

import { QuickGameReplayPanel } from '../QuickGameReplayPanel';

// =============================================================================
// Mocks — capture the props HexMapDisplay receives so we can assert
// `mapId` + `events` + `tokens` flow into it correctly. The internal
// `<AttackEffectsLayer>` mount inside HexMapDisplay is implicit from
// the production code (HexMapDisplay.tsx line 463).
// =============================================================================

const hexMapPropsCapture: Array<{
  mapId: string | undefined;
  tokenCount: number;
  eventCount: number;
}> = [];

jest.mock('@/components/gameplay/HexMapDisplay/HexMapDisplay', () => ({
  HexMapDisplay: (props: {
    mapId?: string;
    radius: number;
    tokens: readonly { unitId: string }[];
    events?: readonly { id: string }[];
  }) => {
    hexMapPropsCapture.push({
      mapId: props.mapId,
      tokenCount: props.tokens.length,
      eventCount: props.events?.length ?? 0,
    });
    return (
      <div
        data-testid="hex-map-display-mock"
        data-map-id={props.mapId}
        data-token-count={props.tokens.length}
        data-event-count={props.events?.length ?? 0}
      >
        {/* Proxy element representing the AttackEffectsLayer mount —
            HexMapDisplay always renders one internally with the same
            `mapId` + `events` + `tokens` props (HexMapDisplay.tsx
            line 463). We render it explicitly here so the spec
            scenario assertion ("rendered DOM contains exactly one
            AttackEffectsLayer element") can target a stable testid. */}
        <div
          data-testid="attack-effects-layer-mock"
          data-map-id={props.mapId}
          data-token-count={props.tokens.length}
          data-event-count={props.events?.length ?? 0}
        />
      </div>
    );
  },
}));

// =============================================================================
// Fixture helpers
// =============================================================================

function makeUnit(
  overrides: Partial<IGameUnit> & Pick<IGameUnit, 'id' | 'name' | 'side'>,
): IGameUnit {
  return {
    unitRef: 'atlas-as7-d',
    pilotRef: 'pilot-1',
    gunnery: 4,
    piloting: 5,
    ...overrides,
  };
}

function makeEvent(
  overrides: Partial<IGameEvent> &
    Pick<IGameEvent, 'type' | 'payload' | 'sequence'>,
): IGameEvent {
  return {
    id: `evt-${overrides.sequence}`,
    gameId: 'test-game',
    timestamp: '2026-05-09T00:00:00.000Z',
    turn: 1,
    phase: GamePhase.Movement,
    side: GameSide.Player,
    ...overrides,
  };
}

function makeStandardEvents(): readonly IGameEvent[] {
  const gameCreated: IGameCreatedPayload = {
    config: {
      mapRadius: 17,
      turnLimit: 0,
      victoryConditions: ['destruction'],
      optionalRules: [],
    },
    units: [
      makeUnit({ id: 'player-1', name: 'Atlas AS7-D', side: GameSide.Player }),
      makeUnit({
        id: 'opponent-1',
        name: 'Stalker STK-3F',
        side: GameSide.Opponent,
      }),
    ],
  };
  return [
    makeEvent({
      sequence: 0,
      type: GameEventType.GameCreated,
      payload: gameCreated,
      phase: GamePhase.Initiative,
    }),
  ];
}

// =============================================================================
// Tests
// =============================================================================

describe('QuickGameReplayPanel — AttackEffectsLayer integration', () => {
  beforeEach(() => {
    hexMapPropsCapture.length = 0;
  });

  describe('spec scenario: QuickGameReplayPanel mounts the attack effects layer', () => {
    it('renders exactly one AttackEffectsLayer element when the panel is active', () => {
      const events = makeStandardEvents();
      render(<QuickGameReplayPanel events={events} gameId="g-attack-fx" />);

      const layers = screen.getAllByTestId('attack-effects-layer-mock');
      expect(layers).toHaveLength(1);
    });

    it('forwards the events log (game.events) into HexMapDisplay → AttackEffectsLayer', () => {
      const events = makeStandardEvents();
      render(<QuickGameReplayPanel events={events} gameId="g-1" />);

      const layer = screen.getByTestId('attack-effects-layer-mock');
      expect(layer).toHaveAttribute('data-event-count', String(events.length));
    });

    it('forwards the tokens projection from useHexMapStateFromEvents', () => {
      const events = makeStandardEvents();
      render(<QuickGameReplayPanel events={events} gameId="g-1" />);

      const layer = screen.getByTestId('attack-effects-layer-mock');
      // GameCreated seeds 2 tokens.
      expect(layer).toHaveAttribute('data-token-count', '2');
    });

    it('passes a replay-scoped mapId that does NOT collide with live-play default-map', () => {
      const events = makeStandardEvents();
      render(<QuickGameReplayPanel events={events} gameId="g-1" />);

      const layer = screen.getByTestId('attack-effects-layer-mock');
      expect(layer).toHaveAttribute('data-map-id', 'quickgame-replay');
      // Crucially — the live-play default `'default-map'` is the value
      // HexMapDisplay falls back to when `mapId` is unset. The replay
      // surface MUST send a different value so the queue partitions
      // correctly.
      expect(layer.getAttribute('data-map-id')).not.toBe('default-map');
    });
  });

  describe('Empty-events guard does not mount the layer', () => {
    it('does not render AttackEffectsLayer when events is empty (placeholder shown instead)', () => {
      render(<QuickGameReplayPanel events={[]} gameId="g-empty" />);

      expect(
        screen.queryByTestId('attack-effects-layer-mock'),
      ).not.toBeInTheDocument();
      expect(screen.getByText(/no events were recorded/i)).toBeInTheDocument();
    });
  });
});
