/**
 * Standalone replay route — AttackEffectsLayer mount integration test
 * for `add-replay-step-and-effect-animations` (tactical-map-interface
 * delta — "Attack Effects Layer In Replay Surfaces"):
 *
 *   - Standalone replay route mounts the attack effects layer
 *
 * Like the quick-game replay test, `<HexMapDisplay>` forwards
 * `mapId='replay'` to its internal `<AttackEffectsLayer>` mount on
 * line 463 of HexMapDisplay.tsx. We mock HexMapDisplay so we can
 * assert the forwarding contract and a single layer mount when an
 * uploaded event log is active. The page's center-pane placeholder
 * (rendered when no upload + no DB events) intentionally does NOT
 * mount the layer, matching the spec's empty-state behavior.
 *
 * @spec openspec/changes/add-replay-step-and-effect-animations/specs/tactical-map-interface/spec.md
 */

import { act, render, screen } from '@testing-library/react';
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

// =============================================================================
// Mocks — HexMapDisplay captures forwarded props with a stable testid
// for the `<AttackEffectsLayer>` mount inside it (HexMapDisplay.tsx
// line 463 forwards `mapId` + `events` + `tokens` to the layer).
// =============================================================================

jest.mock('@/components/gameplay/HexMapDisplay/HexMapDisplay', () => ({
  HexMapDisplay: (props: {
    mapId?: string;
    radius: number;
    tokens: readonly { unitId: string }[];
    events?: readonly { id: string }[];
  }) => (
    <div
      data-testid="hex-map-display-mock"
      data-map-id={props.mapId}
      data-token-count={props.tokens.length}
    >
      <div
        data-testid="attack-effects-layer-mock"
        data-map-id={props.mapId}
        data-event-count={props.events?.length ?? 0}
      />
    </div>
  ),
}));

// Stub Next router so the page renders without a Next stack.
const mockRouterPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    query: { id: 'g-replay-test' },
    pathname: '/gameplay/games/[id]/replay',
    isReady: true,
  }),
}));

// Stub `useGameTimeline` so the page-level early-return doesn't
// fire on `allEvents.length === 0 && !isUploadActive`. We return a
// single placeholder audit event so the page renders the main
// layout (JsonlFileLoader + center pane). The test then promotes
// the upload via the captured `onEventsLoaded` callback below to
// drive `isUploadActive=true`, which is what mounts HexMapDisplay
// + AttackEffectsLayer.
jest.mock('@/hooks/audit', () => {
  const actual = jest.requireActual('@/hooks/audit');
  return {
    ...actual,
    useGameTimeline: () => ({
      allEvents: [
        {
          id: 'audit-stub-1',
          gameId: 'g-replay-test',
          sequence: 0,
          timestamp: '2026-05-09T00:00:00.000Z',
          type: 'GameCreated',
          payload: {},
          category: 'game',
          context: { gameId: 'g-replay-test' },
        },
      ],
      isLoading: false,
      error: null,
      pagination: { hasMore: false },
      loadMore: jest.fn(),
    }),
  };
});

// Stub the JsonlFileLoader so the test can synchronously promote
// uploaded events via the captured `onEventsLoaded` callback. The real
// loader's drag-drop UI is not the surface under test here.
const capturedLoader: {
  onEventsLoaded?: (events: readonly IGameEvent[], filename: string) => void;
} = {};
jest.mock('@/components/audit/replay', () => {
  const actual = jest.requireActual('@/components/audit/replay');
  return {
    ...actual,
    JsonlFileLoader: (props: {
      onEventsLoaded: (events: readonly IGameEvent[], filename: string) => void;
    }) => {
      capturedLoader.onEventsLoaded = props.onEventsLoaded;
      return <div data-testid="jsonl-loader-mock" />;
    },
  };
});

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
    gameId: 'g-replay-test',
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

import GameReplayPage from '@/pages/gameplay/games/[id]/replay';

describe('Standalone replay route — AttackEffectsLayer integration', () => {
  beforeEach(() => {
    capturedLoader.onEventsLoaded = undefined;
  });

  describe('spec scenario: Standalone replay route mounts the attack effects layer', () => {
    it('mounts exactly one AttackEffectsLayer element after an event log is uploaded', () => {
      render(<GameReplayPage />);

      // Upload-mode is off initially — placeholder renders, no layer.
      expect(
        screen.queryByTestId('attack-effects-layer-mock'),
      ).not.toBeInTheDocument();

      // Promote the captured upload callback to push the events into the
      // page's upload-mode state. The page's hex-map projection then has
      // tokens and the AttackEffectsLayer mount becomes visible.
      const events = makeStandardEvents();
      act(() => {
        capturedLoader.onEventsLoaded?.(events, 'sample.jsonl');
      });

      const layers = screen.getAllByTestId('attack-effects-layer-mock');
      expect(layers).toHaveLength(1);
    });

    it('passes a replay-scoped mapId that does NOT collide with live-play default-map', () => {
      render(<GameReplayPage />);

      const events = makeStandardEvents();
      act(() => {
        capturedLoader.onEventsLoaded?.(events, 'sample.jsonl');
      });

      const layer = screen.getByTestId('attack-effects-layer-mock');
      expect(layer).toHaveAttribute('data-map-id', 'replay');
      expect(layer.getAttribute('data-map-id')).not.toBe('default-map');
      expect(layer.getAttribute('data-map-id')).not.toBe('quickgame-replay');
    });

    it('forwards the uploaded event log into the AttackEffectsLayer', () => {
      render(<GameReplayPage />);

      const events = makeStandardEvents();
      act(() => {
        capturedLoader.onEventsLoaded?.(events, 'sample.jsonl');
      });

      const layer = screen.getByTestId('attack-effects-layer-mock');
      expect(layer).toHaveAttribute('data-event-count', String(events.length));
    });
  });
});
