import {
  Facing,
  GameEventType,
  IGameEvent,
  IJumpStep,
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

describe('useReplayMovementAnimations core scenarios', () => {
  beforeEach(() => {
    resetReplayAnimationTest();
  });

  afterEach(() => {
    cleanupReplayAnimationTest();
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
});
