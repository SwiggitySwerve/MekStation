import { act, renderHook } from '@testing-library/react';

import { useMovementTween } from '@/components/gameplay/animation/useMovementTween';
import { Facing, MovementType } from '@/types/gameplay';

type RafEntry = readonly [number, FrameRequestCallback];

const path = [
  { q: 0, r: 0 },
  { q: 1, r: 0 },
  { q: 2, r: 0 },
  { q: 3, r: 0 },
];

const projectHex = (coord: { q: number; r: number }) => ({
  x: coord.q * 10,
  y: coord.r * 10,
});

describe('useMovementTween timing', () => {
  let callbacks: Map<number, FrameRequestCallback>;
  let nextFrameId: number;
  let originalRequestAnimationFrame: typeof window.requestAnimationFrame;
  let originalCancelAnimationFrame: typeof window.cancelAnimationFrame;
  let originalSetInterval: typeof window.setInterval;

  beforeEach(() => {
    callbacks = new Map();
    nextFrameId = 1;
    originalRequestAnimationFrame = window.requestAnimationFrame;
    originalCancelAnimationFrame = window.cancelAnimationFrame;
    originalSetInterval = window.setInterval;

    Object.defineProperty(window, 'requestAnimationFrame', {
      writable: true,
      value: jest.fn((callback: FrameRequestCallback) => {
        const frameId = nextFrameId;
        nextFrameId += 1;
        callbacks.set(frameId, callback);
        return frameId;
      }),
    });
    Object.defineProperty(window, 'cancelAnimationFrame', {
      writable: true,
      value: jest.fn((frameId: number) => {
        callbacks.delete(frameId);
      }),
    });
    Object.defineProperty(window, 'setInterval', {
      writable: true,
      value: jest.fn(originalSetInterval),
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'requestAnimationFrame', {
      writable: true,
      value: originalRequestAnimationFrame,
    });
    Object.defineProperty(window, 'cancelAnimationFrame', {
      writable: true,
      value: originalCancelAnimationFrame,
    });
    Object.defineProperty(window, 'setInterval', {
      writable: true,
      value: originalSetInterval,
    });
  });

  it('walks three segments in 900ms with linear segment easing', () => {
    const onDone = jest.fn();
    const { result } = renderHook(() =>
      useMovementTween(path, MovementType.Walk, onDone, {
        initialFacing: Facing.North,
        finalFacing: Facing.South,
        projectHex,
      }),
    );

    expect(window.requestAnimationFrame).toHaveBeenCalled();
    expect(window.setInterval).not.toHaveBeenCalled();
    expect(result.current.durationMs).toBe(900);

    stepFrame(0, callbacks);
    stepFrame(300, callbacks);
    expect(result.current.x).toBeCloseTo(10);
    expect(result.current.isComplete).toBe(false);

    stepFrame(450, callbacks);
    expect(Number(result.current.facing)).toBeCloseTo(1.5);

    stepFrame(900, callbacks);
    expect(result.current.x).toBeCloseTo(30);
    expect(result.current.isComplete).toBe(true);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('runs three segments in 540ms', () => {
    const onDone = jest.fn();
    const { result } = renderHook(() =>
      useMovementTween(path, MovementType.Run, onDone, { projectHex }),
    );

    expect(result.current.durationMs).toBe(540);

    stepFrame(0, callbacks);
    stepFrame(540, callbacks);

    expect(result.current.x).toBeCloseTo(30);
    expect(result.current.isComplete).toBe(true);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('jumps in a single 600ms arc that peaks near the midpoint', () => {
    const onDone = jest.fn();
    const { result } = renderHook(() =>
      useMovementTween(
        [
          { q: 0, r: 0 },
          { q: 3, r: 0 },
        ],
        MovementType.Jump,
        onDone,
        { projectHex },
      ),
    );

    expect(result.current.durationMs).toBe(600);

    stepFrame(0, callbacks);
    stepFrame(300, callbacks);
    expect(result.current.x).toBeCloseTo(15);
    expect(result.current.y).toBeCloseTo(-24);
    expect(result.current.arcOffset).toBeCloseTo(24);
    expect(result.current.arcOpacity).toBeCloseTo(1);

    stepFrame(550, callbacks);
    expect(result.current.arcOpacity).toBeCloseTo(0.5);

    stepFrame(600, callbacks);
    expect(result.current.x).toBeCloseTo(30);
    expect(result.current.y).toBeCloseTo(0);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('skips timing when reduced motion is requested', () => {
    const onDone = jest.fn();
    const { result } = renderHook(() =>
      useMovementTween(path, MovementType.Walk, onDone, {
        prefersReducedMotion: true,
        projectHex,
      }),
    );

    expect(result.current.x).toBeCloseTo(30);
    expect(result.current.isComplete).toBe(true);
    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('cancels a scheduled animation frame on unmount', () => {
    const { unmount } = renderHook(() =>
      useMovementTween(path, MovementType.Walk, jest.fn(), { projectHex }),
    );
    const firstFrameId = firstPendingFrame(callbacks);

    unmount();

    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(firstFrameId);
  });
});

function stepFrame(
  timestamp: number,
  callbacks: Map<number, FrameRequestCallback>,
): void {
  const entries: RafEntry[] = Array.from(callbacks.entries());
  callbacks.clear();

  act(() => {
    for (const [, callback] of entries) {
      callback(timestamp);
    }
  });
}

function firstPendingFrame(
  callbacks: Map<number, FrameRequestCallback>,
): number {
  const first = callbacks.keys().next();
  if (first.done) throw new Error('Expected a pending animation frame');
  return first.value;
}
