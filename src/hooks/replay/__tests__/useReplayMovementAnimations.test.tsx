/**
 * useReplayMovementAnimations — unit tests covering all 6 spec
 * scenarios from `add-replay-step-and-effect-animations`
 * (tactical-map-interface delta — "Replay Movement Step Animation
 * Playback") plus integration coverage for forward + rewind cursor
 * transitions.
 *
 * The hook is a pure side-effect adapter that drives
 * `useAnimationQueue`. We render a thin test component, feed it the
 * fixture event log + a mocked cursor, and assert against the queue
 * store's snapshot after the effect runs.
 *
 * @spec openspec/changes/add-replay-step-and-effect-animations/specs/tactical-map-interface/spec.md
 */

import { act, cleanup, render } from '@testing-library/react';
import React from 'react';

import { usePrefersReducedMotion } from '@/hooks/useReducedMotion';
import { useAnimationQueue } from '@/stores/useAnimationQueue';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  IForwardStep,
  IGameEvent,
  IJumpStep,
  ILateralStep,
  IMovementDeclaredPayload,
  IMovementStep,
  IStandUpStep,
  ITurnStep,
  MovementType,
} from '@/types/gameplay';

import { useReplayMovementAnimations } from '../useReplayMovementAnimations';

// =============================================================================
// Mocks
// =============================================================================

jest.mock('@/hooks/useReducedMotion', () => ({
  usePrefersReducedMotion: jest.fn(() => false),
}));

const mockedUsePrefersReducedMotion =
  usePrefersReducedMotion as jest.MockedFunction<
    typeof usePrefersReducedMotion
  >;

// =============================================================================
// Fixture helpers
// =============================================================================

/**
 * Build a sequenced game event with sensible envelope defaults.
 */
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

/**
 * Build a `MovementDeclared` event with the provided step chain.
 */
function makeMovementEvent(
  sequence: number,
  unitId: string,
  steps: readonly IMovementStep[],
  options?: {
    movementType?: MovementType;
    facing?: Facing;
  },
): IGameEvent {
  // Use first/last hex of the step chain (or origin) for `from` / `to`.
  const firstHexBearingStep = steps.find(
    (s) => s.kind === 'forward' || s.kind === 'lateral' || s.kind === 'jump',
  ) as IForwardStep | ILateralStep | IJumpStep | undefined;
  const lastHexBearingStep = [...steps]
    .reverse()
    .find(
      (s) => s.kind === 'forward' || s.kind === 'lateral' || s.kind === 'jump',
    ) as IForwardStep | ILateralStep | IJumpStep | undefined;
  const from = firstHexBearingStep?.from ?? { q: 0, r: 0 };
  const to = lastHexBearingStep?.to ?? from;

  const payload: IMovementDeclaredPayload = {
    unitId,
    from,
    to,
    facing: options?.facing ?? Facing.North,
    movementType: options?.movementType ?? MovementType.Walk,
    mpUsed: steps.length,
    heatGenerated: 0,
    steps,
  };

  return makeEvent({
    sequence,
    type: GameEventType.MovementDeclared,
    payload,
    actorId: unitId,
  });
}

/**
 * Build a `MovementDeclared` event with NO `steps` field — legacy
 * fallback fixture.
 */
function makeLegacyMovementEvent(
  sequence: number,
  unitId: string,
  from: { q: number; r: number },
  to: { q: number; r: number },
): IGameEvent {
  const payload: IMovementDeclaredPayload = {
    unitId,
    from,
    to,
    facing: Facing.Southeast,
    movementType: MovementType.Walk,
    mpUsed: 3,
    heatGenerated: 0,
    // intentionally no `steps`
  };

  return makeEvent({
    sequence,
    type: GameEventType.MovementDeclared,
    payload,
    actorId: unitId,
  });
}

// =============================================================================
// Test harness component
// =============================================================================

interface IHarnessProps {
  events: readonly IGameEvent[];
  currentSequence: number;
  mapId?: string;
}

function Harness({
  events,
  currentSequence,
  mapId = 'test-replay',
}: IHarnessProps): React.ReactElement {
  useReplayMovementAnimations(events, currentSequence, { mapId });
  return <div data-testid="harness" />;
}

/**
 * Read every animation that has touched the queue since the last
 * `reset()`. We collect from both `active` and `queue` because the
 * queue's overlap detection routes the second-and-later animations
 * for the same unit into `queue` rather than `active` until the first
 * completes — both arrays are part of the side-effect we're asserting.
 */
function snapshotAllAnimations(): ReadonlyArray<{
  id: string;
  unitId?: string;
  hasPath: boolean;
  pathLength: number;
  mode?: string;
  hasInitialFacing: boolean;
  hasFinalFacing: boolean;
  eventSequence?: number;
}> {
  const state = useAnimationQueue.getState();
  return [...state.active, ...state.queue].map((a) => ({
    id: a.id,
    unitId: a.unitId,
    hasPath: a.path !== undefined,
    pathLength: a.path?.length ?? 0,
    mode: a.mode,
    hasInitialFacing: a.initialFacing !== undefined,
    hasFinalFacing: a.finalFacing !== undefined,
    eventSequence: a.eventSequence,
  }));
}

// =============================================================================
// Tests
// =============================================================================

/**
 * Brute-force queue clear. `reset()` works, but bypassing it via
 * `setState` directly avoids any race with React 18's effect-flush
 * scheduling: this is an out-of-band synchronous mutation that does
 * not need to land in `act()` to be observed by the next render's
 * effect callback.
 */
function hardResetQueue(): void {
  useAnimationQueue.setState({ queue: [], active: [], isActive: false });
}

describe('useReplayMovementAnimations', () => {
  beforeEach(() => {
    // Unmount any harness left around by a prior test BEFORE resetting
    // the queue. Otherwise its `useEffect` cleanup phase (or pending
    // microtask flush) can re-enqueue animations after our reset and
    // bleed state into the next test.
    cleanup();
    hardResetQueue();
    mockedUsePrefersReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    cleanup();
    hardResetQueue();
  });

  describe('spec scenario: Forward step chain enqueues one animation per step', () => {
    it('enqueues 5 animations in step.index order for [forward, forward, turn, forward, turn]', () => {
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
          kind: 'turn',
          index: 2,
          at: { q: 2, r: 0 },
          fromFacing: Facing.North,
          toFacing: Facing.Northeast,
          mpCost: 1,
        },
        {
          kind: 'forward',
          index: 3,
          direction: 'forward',
          from: { q: 2, r: 0 },
          to: { q: 3, r: 0 },
          mpCost: 1,
          terrainEntered: 'clear',
          elevationDelta: 0,
        },
        {
          kind: 'turn',
          index: 4,
          at: { q: 3, r: 0 },
          fromFacing: Facing.Northeast,
          toFacing: Facing.Southeast,
          mpCost: 1,
        },
      ];
      const events: IGameEvent[] = [makeMovementEvent(1, 'player-1', steps)];

      render(<Harness events={events} currentSequence={1} />);

      const snap = snapshotAllAnimations();
      expect(snap).toHaveLength(5);

      // 3 forward enqueues SHALL each carry a 2-entry `path`.
      const forwardAnims = snap.filter((a) => a.hasPath);
      expect(forwardAnims).toHaveLength(3);
      expect(forwardAnims.every((a) => a.pathLength === 2)).toBe(true);

      // 2 turn enqueues SHALL carry only `initialFacing` / `finalFacing`
      // (no `path`).
      const turnAnims = snap.filter((a) => !a.hasPath);
      expect(turnAnims).toHaveLength(2);
      expect(
        turnAnims.every((a) => a.hasInitialFacing && a.hasFinalFacing),
      ).toBe(true);
    });
  });

  describe('spec scenario: Jump step produces a single jump-mode animation', () => {
    it('enqueues exactly one animation with mode === MovementType.Jump for a single jump step', () => {
      const jumpStep: IJumpStep = {
        kind: 'jump',
        index: 0,
        from: { q: 0, r: 0 },
        to: { q: 4, r: 0 },
        mpCost: 4,
        terrainEntered: 'clear',
      };
      const events: IGameEvent[] = [
        makeMovementEvent(1, 'player-1', [jumpStep], {
          movementType: MovementType.Jump,
        }),
      ];

      render(<Harness events={events} currentSequence={1} />);

      const snap = snapshotAllAnimations();
      expect(snap).toHaveLength(1);
      expect(snap[0].mode).toBe(MovementType.Jump);
      expect(snap[0].hasPath).toBe(true);
      expect(snap[0].pathLength).toBe(2);
    });
  });

  describe('spec scenario: Cursor rewind flushes the animation queue', () => {
    it('calls reset() before re-walking events when cursor decreases', () => {
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
      ];
      const events: IGameEvent[] = [makeMovementEvent(50, 'player-1', steps)];

      // Advance forward to enqueue the animation.
      const { rerender } = render(
        <Harness events={events} currentSequence={50} />,
      );
      expect(snapshotAllAnimations()).toHaveLength(1);

      // Spy on reset before rewinding so we can detect the call.
      const resetSpy = jest.spyOn(useAnimationQueue.getState(), 'reset');

      // Rewind to an earlier cursor. The hook SHALL flush.
      rerender(<Harness events={events} currentSequence={30} />);

      expect(resetSpy).toHaveBeenCalledTimes(1);
      const postRewindSnap = snapshotAllAnimations();
      expect(postRewindSnap).toHaveLength(0);
      resetSpy.mockRestore();
    });
  });

  describe('spec scenario: Reduced-motion skips per-step enqueue entirely', () => {
    it('does not call enqueue for any step when reduced motion is preferred', () => {
      mockedUsePrefersReducedMotion.mockReturnValue(true);

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
        {
          kind: 'forward',
          index: 3,
          direction: 'forward',
          from: { q: 3, r: 0 },
          to: { q: 4, r: 0 },
          mpCost: 1,
          terrainEntered: 'clear',
          elevationDelta: 0,
        },
        {
          kind: 'forward',
          index: 4,
          direction: 'forward',
          from: { q: 4, r: 0 },
          to: { q: 5, r: 0 },
          mpCost: 1,
          terrainEntered: 'clear',
          elevationDelta: 0,
        },
      ];
      const events: IGameEvent[] = [makeMovementEvent(1, 'player-1', steps)];

      render(<Harness events={events} currentSequence={1} />);

      expect(snapshotAllAnimations()).toHaveLength(0);
    });
  });

  describe('spec scenario: Legacy event without steps falls back to instant snap', () => {
    it('enqueues exactly one fallback animation derived from from/to', () => {
      const events: IGameEvent[] = [
        makeLegacyMovementEvent(1, 'player-1', { q: 0, r: 0 }, { q: 3, r: 0 }),
      ];

      // The hook SHALL NOT throw on missing steps.
      expect(() =>
        render(<Harness events={events} currentSequence={1} />),
      ).not.toThrow();

      const snap = snapshotAllAnimations();
      expect(snap).toHaveLength(1);
      // Fallback animation carries a 2-entry path of from/to.
      expect(snap[0].hasPath).toBe(true);
      expect(snap[0].pathLength).toBe(2);
    });
  });

  describe('spec scenario: Skipped step kinds do not throw', () => {
    it('skips standUp without throwing and still enqueues subsequent forward', () => {
      const standUp: IStandUpStep = {
        kind: 'standUp',
        index: 0,
        at: { q: 0, r: 0 },
        mpCost: 2,
        psrTriggered: true,
      };
      const forward: IForwardStep = {
        kind: 'forward',
        index: 1,
        direction: 'forward',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        mpCost: 1,
        terrainEntered: 'clear',
        elevationDelta: 0,
      };
      const events: IGameEvent[] = [
        makeMovementEvent(1, 'player-1', [standUp, forward]),
      ];

      expect(() =>
        render(<Harness events={events} currentSequence={1} />),
      ).not.toThrow();

      const snap = snapshotAllAnimations();
      // Exactly 1 enqueue: only the forward step. standUp was skipped.
      expect(snap).toHaveLength(1);
      expect(snap[0].hasPath).toBe(true);
    });

    it('skips chargeDeclared / dfaDeclared / shakeOffSwarm / goProne / altitudeControl without throwing', () => {
      // Mix of every skipped kind plus a single forward to prove the
      // surviving step still fires.
      const steps: IMovementStep[] = [
        {
          kind: 'goProne',
          index: 0,
          at: { q: 0, r: 0 },
          mpCost: 1,
        },
        {
          kind: 'chargeDeclared',
          index: 1,
          at: { q: 0, r: 0 },
          targetId: 'opponent-2',
          straightLineHexes: 3,
        },
        {
          kind: 'dfaDeclared',
          index: 2,
          at: { q: 0, r: 0 },
          targetId: 'opponent-2',
          jumpHeight: 2,
        },
        {
          kind: 'shakeOffSwarm',
          index: 3,
          at: { q: 0, r: 0 },
          psrTriggered: false,
        },
        {
          kind: 'altitudeControl',
          index: 4,
          at: { q: 0, r: 0 },
          mpCost: 1,
          direction: 'down',
          stepNumber: 1,
          stepCount: 1,
        },
        {
          kind: 'forward',
          index: 5,
          direction: 'forward',
          from: { q: 0, r: 0 },
          to: { q: 1, r: 0 },
          mpCost: 1,
          terrainEntered: 'clear',
          elevationDelta: 0,
        },
      ];
      const events: IGameEvent[] = [makeMovementEvent(1, 'player-1', steps)];

      expect(() =>
        render(<Harness events={events} currentSequence={1} />),
      ).not.toThrow();

      const snap = snapshotAllAnimations();
      expect(snap).toHaveLength(1); // only the trailing forward
    });
  });

  describe('lateral steps', () => {
    it('lateral step enqueues a path-bearing animation in walk mode', () => {
      const lateral: ILateralStep = {
        kind: 'lateral',
        index: 0,
        direction: 'right',
        from: { q: 0, r: 0 },
        to: { q: 1, r: 0 },
        mpCost: 1,
        terrainEntered: 'clear',
      };
      const events: IGameEvent[] = [
        makeMovementEvent(1, 'player-1', [lateral], {
          movementType: MovementType.Walk,
        }),
      ];

      render(<Harness events={events} currentSequence={1} />);

      const snap = snapshotAllAnimations();
      expect(snap).toHaveLength(1);
      expect(snap[0].hasPath).toBe(true);
      expect(snap[0].mode).toBe(MovementType.Walk);
    });
  });

  describe('forward advance from cursor 0', () => {
    it('only processes events with sequence > prevCursor and ≤ currentSequence', () => {
      const stepsA: IMovementStep[] = [
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
      ];
      const stepsB: IMovementStep[] = [
        {
          kind: 'forward',
          index: 0,
          direction: 'forward',
          from: { q: 5, r: 5 },
          to: { q: 6, r: 5 },
          mpCost: 1,
          terrainEntered: 'clear',
          elevationDelta: 0,
        },
      ];
      const events: IGameEvent[] = [
        makeMovementEvent(1, 'player-1', stepsA),
        makeMovementEvent(2, 'opponent-2', stepsB),
      ];

      // Advance cursor to 1 first — only the first event should fire.
      const { rerender } = render(
        <Harness events={events} currentSequence={1} />,
      );
      let snap = snapshotAllAnimations();
      expect(snap).toHaveLength(1);
      expect(snap[0].unitId).toBe('player-1');

      // Advance cursor to 2 — second event fires; first is unchanged.
      rerender(<Harness events={events} currentSequence={2} />);
      snap = snapshotAllAnimations();

      // The queue's overlap detection serializes both animations, so we
      // should now see 2 animations across active+queue.
      expect(snap).toHaveLength(2);
      expect(snap.map((a) => a.unitId).sort()).toEqual([
        'opponent-2',
        'player-1',
      ]);
    });
  });

  describe('cursor unchanged is a no-op', () => {
    it('does not re-enqueue when currentSequence stays the same across renders', () => {
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
      ];
      const events: IGameEvent[] = [makeMovementEvent(1, 'player-1', steps)];

      const { rerender } = render(
        <Harness events={events} currentSequence={1} />,
      );
      expect(snapshotAllAnimations()).toHaveLength(1);

      // Rerender with the same cursor — no double enqueue.
      rerender(<Harness events={events} currentSequence={1} />);
      expect(snapshotAllAnimations()).toHaveLength(1);
    });
  });
});
