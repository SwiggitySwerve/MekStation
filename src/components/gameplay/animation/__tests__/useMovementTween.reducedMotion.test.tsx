import { act, renderHook } from '@testing-library/react';

import { useMovementTween } from '@/components/gameplay/animation/useMovementTween';
import { Facing, MovementType } from '@/types/gameplay';

describe('useMovementTween reduced motion', () => {
  it('snaps to the final frame and completes within one tick', async () => {
    const onDone = jest.fn();
    const path = [
      { q: 0, r: 0 },
      { q: 2, r: -1 },
    ];

    const { result } = renderHook(() =>
      useMovementTween(path, MovementType.Jump, onDone, {
        finalFacing: Facing.South,
        prefersReducedMotion: true,
        projectHex: (coord) => ({ x: coord.q * 16, y: coord.r * 16 }),
      }),
    );

    expect(result.current).toEqual({
      x: 32,
      y: -16,
      facing: Facing.South,
      scale: 1,
      arcOffset: 0,
      arcOpacity: 0,
      progress: 1,
      durationMs: 600,
      isAnimating: false,
      isComplete: true,
      reducedMotion: true,
      mode: MovementType.Jump,
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
