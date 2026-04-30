import type { IHexCoordinate } from '@/types/gameplay';

import { useAnimationQueue } from '@/stores/useAnimationQueue';

function movement(
  id: string,
  unitId: string,
  path: readonly IHexCoordinate[],
  mapId = 'map-1',
) {
  return {
    id,
    mapId,
    unitId,
    kind: 'movement' as const,
    path,
  };
}

describe('useAnimationQueue', () => {
  beforeEach(() => {
    useAnimationQueue.getState().reset();
  });

  afterEach(() => {
    useAnimationQueue.getState().reset();
  });

  it('runs conflicting same-map animations in FIFO order', () => {
    useAnimationQueue
      .getState()
      .enqueue(movement('move-a', 'unit-a', [{ q: 0, r: 0 }]));
    useAnimationQueue
      .getState()
      .enqueue(movement('move-b', 'unit-b', [{ q: 0, r: 0 }]));

    expect(useAnimationQueue.getState().active.map((item) => item.id)).toEqual([
      'move-a',
    ]);
    expect(useAnimationQueue.getState().queue.map((item) => item.id)).toEqual([
      'move-b',
    ]);
    expect(useAnimationQueue.getState().isActive).toBe(true);

    useAnimationQueue.getState().complete('move-a');

    expect(useAnimationQueue.getState().active.map((item) => item.id)).toEqual([
      'move-b',
    ]);
    expect(useAnimationQueue.getState().queue).toHaveLength(0);
  });

  it('allows concurrent per-unit animations when paths do not overlap', () => {
    useAnimationQueue
      .getState()
      .enqueue(movement('move-a', 'unit-a', [{ q: 0, r: 0 }]));
    useAnimationQueue
      .getState()
      .enqueue(movement('move-b', 'unit-b', [{ q: 4, r: -2 }]));

    expect(useAnimationQueue.getState().active.map((item) => item.id)).toEqual([
      'move-a',
      'move-b',
    ]);
    expect(useAnimationQueue.getState().queue).toHaveLength(0);
  });

  it('does not run two animations for the same unit concurrently', () => {
    useAnimationQueue
      .getState()
      .enqueue(movement('move-a', 'unit-a', [{ q: 0, r: 0 }]));
    useAnimationQueue
      .getState()
      .enqueue(movement('move-b', 'unit-a', [{ q: 4, r: -2 }]));

    expect(useAnimationQueue.getState().active.map((item) => item.id)).toEqual([
      'move-a',
    ]);
    expect(useAnimationQueue.getState().queue.map((item) => item.id)).toEqual([
      'move-b',
    ]);
  });

  it('fires per-animation and subscribed completion callbacks', () => {
    const animationComplete = jest.fn();
    const storeComplete = jest.fn();
    const unsubscribe = useAnimationQueue.getState().onComplete(storeComplete);

    useAnimationQueue.getState().enqueue({
      ...movement('move-a', 'unit-a', [{ q: 0, r: 0 }]),
      onComplete: animationComplete,
    });
    useAnimationQueue.getState().complete('move-a');
    unsubscribe();

    expect(animationComplete).toHaveBeenCalledTimes(1);
    expect(storeComplete).toHaveBeenCalledTimes(1);
    expect(storeComplete).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'move-a' }),
    );
    expect(useAnimationQueue.getState().isActive).toBe(false);
  });
});
