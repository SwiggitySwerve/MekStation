import {
  Facing,
  GameEventType,
  IForwardStep,
  IGameEvent,
  ILateralStep,
  IMovementStep,
  IStandUpStep,
  MovementType,
} from '@/types/gameplay';

import {
  act,
  cleanupReplayAnimationTest,
  Harness,
  makeEvent,
  makeLegacyMovementEvent,
  makeMovementEvent,
  mockedUsePrefersReducedMotion,
  render,
  resetReplayAnimationTest,
  snapshotAllAnimations,
  useAnimationQueue,
} from './useReplayMovementAnimations.test-helpers';

describe('useReplayMovementAnimations edge and cursor scenarios', () => {
  beforeEach(() => {
    resetReplayAnimationTest();
  });

  afterEach(() => {
    cleanupReplayAnimationTest();
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
