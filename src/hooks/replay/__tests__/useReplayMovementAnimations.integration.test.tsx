/**
 * useReplayMovementAnimations × useHexMapStateFromEvents — integration
 * test for the adapter+reducer composition contract from
 * `add-replay-step-and-effect-animations` (Tasks 5.2): mount both
 * hooks against a single replay event log + cursor, advance the
 * cursor across a multi-step move, and assert that:
 *
 *   - `useAnimationQueue.getState()` reaches the expected step-by-step
 *     animation queue shape (one enqueue per actionable step).
 *   - `tokens[unit].position` reaches the expected destination hex
 *     (i.e. the pure projection still grounds-truths the position
 *     even while the side-effect adapter drives the animation).
 *
 * @spec openspec/changes/add-replay-step-and-effect-animations/specs/tactical-map-interface/spec.md
 */

import { act, cleanup, render } from '@testing-library/react';
import React from 'react';

import { useAnimationQueue } from '@/stores/useAnimationQueue';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  IGameCreatedPayload,
  IGameEvent,
  IGameUnit,
  IMovementDeclaredPayload,
  IMovementStep,
  MovementType,
} from '@/types/gameplay';

import {
  useHexMapStateFromEvents,
  type ReplayHexMapState,
} from '../useHexMapStateFromEvents';
import { useReplayMovementAnimations } from '../useReplayMovementAnimations';

// =============================================================================
// Reduced-motion mock — keep it off so the adapter actually enqueues.
// =============================================================================

jest.mock('@/hooks/useReducedMotion', () => ({
  usePrefersReducedMotion: jest.fn(() => false),
}));

// =============================================================================
// Test harness
// =============================================================================

interface IComposedHarnessProps {
  events: readonly IGameEvent[];
  currentSequence: number;
  onState: (state: ReplayHexMapState) => void;
}

function ComposedHarness({
  events,
  currentSequence,
  onState,
}: IComposedHarnessProps): React.ReactElement {
  const hexState = useHexMapStateFromEvents(events, currentSequence);
  useReplayMovementAnimations(events, currentSequence, {
    mapId: 'integration-test',
  });
  // Surface the projection state via a callback so assertions can
  // read it without re-querying React's render output.
  React.useEffect(() => {
    onState(hexState);
  }, [hexState, onState]);
  return <div data-testid="composed-harness" />;
}

function hardResetQueue(): void {
  useAnimationQueue.setState({ queue: [], active: [], isActive: false });
}

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
    gameId: 'integration-game',
    timestamp: '2026-05-09T00:00:00.000Z',
    turn: 1,
    phase: GamePhase.Movement,
    side: GameSide.Player,
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('useReplayMovementAnimations × useHexMapStateFromEvents', () => {
  beforeEach(() => {
    cleanup();
    hardResetQueue();
  });

  afterEach(() => {
    cleanup();
    hardResetQueue();
  });

  it('advancing cursor across a 3-step forward move enqueues 3 animations AND walks the token to the destination hex', () => {
    // Game state — one player + one opponent at origin.
    const gameCreated: IGameCreatedPayload = {
      config: {
        mapRadius: 17,
        turnLimit: 0,
        victoryConditions: ['destruction'],
        optionalRules: [],
      },
      units: [
        makeUnit({ id: 'player-1', name: 'Atlas', side: GameSide.Player }),
        makeUnit({
          id: 'opponent-1',
          name: 'Stalker',
          side: GameSide.Opponent,
        }),
      ],
    };

    const steps: IMovementStep[] = [
      {
        kind: 'forward',
        index: 0,
        direction: 'forward',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        mpCost: 1,
        terrainEntered: 'clear',
        elevationDelta: 0,
      },
      {
        kind: 'forward',
        index: 1,
        direction: 'forward',
        from: { q: 1, r: 0 },
        to: { q: 2, r: 0 },
        mpCost: 1,
        terrainEntered: 'clear',
        elevationDelta: 0,
      },
      {
        kind: 'forward',
        index: 2,
        direction: 'forward',
        from: { q: 2, r: 0 },
        to: { q: 3, r: 0 },
        mpCost: 1,
        terrainEntered: 'clear',
        elevationDelta: 0,
      },
    ];

    const movementPayload: IMovementDeclaredPayload = {
      unitId: 'player-1',
      from: { q: 0, r: 0 },
      to: { q: 3, r: 0 },
      facing: Facing.North,
      movementType: MovementType.Walk,
      mpUsed: 3,
      heatGenerated: 0,
      steps,
    };

    const events: IGameEvent[] = [
      makeEvent({
        sequence: 0,
        type: GameEventType.GameCreated,
        payload: gameCreated,
        phase: GamePhase.Initiative,
      }),
      makeEvent({
        sequence: 1,
        type: GameEventType.MovementDeclared,
        payload: movementPayload,
        actorId: 'player-1',
      }),
    ];

    // Use a wrapper object so the closure assignment is visible to TS's
    // control-flow narrowing — `let projectedState: T | null` would
    // narrow to `null` because TS doesn't trace closure mutations.
    const projection: { current: ReplayHexMapState | null } = { current: null };
    const onState = (s: ReplayHexMapState) => {
      projection.current = s;
    };

    // Render with cursor at sequence 1 — both hooks fire end-to-end.
    render(
      <ComposedHarness events={events} currentSequence={1} onState={onState} />,
    );

    // Adapter — three animations queued, all path-bearing.
    const queueSnap = [
      ...useAnimationQueue.getState().active,
      ...useAnimationQueue.getState().queue,
    ];
    expect(queueSnap).toHaveLength(3);
    expect(queueSnap.every((a) => a.path !== undefined)).toBe(true);
    expect(queueSnap.every((a) => a.unitId === 'player-1')).toBe(true);

    // Reducer — token at the destination hex.
    expect(projection.current).not.toBeNull();
    const playerToken = projection.current?.tokens.find(
      (t) => t.unitId === 'player-1',
    );
    expect(playerToken?.position).toEqual({ q: 3, r: 0 });
  });

  it('rewinding the cursor flushes the queue while the projection still ground-truths the earlier position', () => {
    const gameCreated: IGameCreatedPayload = {
      config: {
        mapRadius: 17,
        turnLimit: 0,
        victoryConditions: ['destruction'],
        optionalRules: [],
      },
      units: [
        makeUnit({ id: 'player-1', name: 'Atlas', side: GameSide.Player }),
      ],
    };

    const steps: IMovementStep[] = [
      {
        kind: 'forward',
        index: 0,
        direction: 'forward',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        mpCost: 1,
        terrainEntered: 'clear',
        elevationDelta: 0,
      },
      {
        kind: 'forward',
        index: 1,
        direction: 'forward',
        from: { q: 1, r: 0 },
        to: { q: 2, r: 0 },
        mpCost: 1,
        terrainEntered: 'clear',
        elevationDelta: 0,
      },
    ];

    const events: IGameEvent[] = [
      makeEvent({
        sequence: 0,
        type: GameEventType.GameCreated,
        payload: gameCreated,
        phase: GamePhase.Initiative,
      }),
      makeEvent({
        sequence: 1,
        type: GameEventType.MovementDeclared,
        payload: {
          unitId: 'player-1',
          from: { q: 0, r: 0 },
          to: { q: 2, r: 0 },
          facing: Facing.North,
          movementType: MovementType.Walk,
          mpUsed: 2,
          heatGenerated: 0,
          steps,
        },
        actorId: 'player-1',
      }),
    ];

    const projection: { current: ReplayHexMapState | null } = { current: null };
    const onState = (s: ReplayHexMapState) => {
      projection.current = s;
    };

    // Forward to sequence 1 — 2 animations queued, token at (2, 0).
    const { rerender } = render(
      <ComposedHarness events={events} currentSequence={1} onState={onState} />,
    );
    expect(
      [
        ...useAnimationQueue.getState().active,
        ...useAnimationQueue.getState().queue,
      ].length,
    ).toBe(2);
    expect(
      projection.current?.tokens.find((t) => t.unitId === 'player-1')?.position,
    ).toEqual({ q: 2, r: 0 });

    // Rewind to sequence 0 — queue flushed, projection regrounds at origin.
    act(() => {
      rerender(
        <ComposedHarness
          events={events}
          currentSequence={0}
          onState={onState}
        />,
      );
    });

    expect(
      [
        ...useAnimationQueue.getState().active,
        ...useAnimationQueue.getState().queue,
      ].length,
    ).toBe(0);
    expect(
      projection.current?.tokens.find((t) => t.unitId === 'player-1')?.position,
    ).toEqual({ q: 0, r: 0 });
  });
});
