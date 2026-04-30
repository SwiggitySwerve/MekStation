import { create } from 'zustand';

import type { IHexCoordinate } from '@/types/gameplay';

export type TacticalAnimationKind = 'movement' | 'effect';

export interface TacticalAnimation {
  readonly id: string;
  readonly mapId: string;
  readonly unitId?: string;
  readonly kind?: TacticalAnimationKind;
  readonly path?: readonly IHexCoordinate[];
  readonly occupiedHexes?: readonly IHexCoordinate[];
  readonly onComplete?: () => void;
}

export type AnimationCompleteCallback = (animation: TacticalAnimation) => void;

interface AnimationQueueState {
  readonly queue: readonly TacticalAnimation[];
  readonly active: readonly TacticalAnimation[];
  readonly isActive: boolean;
  enqueue: (animation: TacticalAnimation) => string;
  complete: (animationId: string) => void;
  onComplete: (callback: AnimationCompleteCallback) => () => void;
  reset: () => void;
}

const completeListeners = new Set<AnimationCompleteCallback>();

const emptyState = {
  queue: [],
  active: [],
  isActive: false,
} satisfies Pick<AnimationQueueState, 'active' | 'isActive' | 'queue'>;

export const useAnimationQueue = create<AnimationQueueState>((set, get) => ({
  ...emptyState,
  enqueue: (animation) => {
    const queued = cloneAnimation(animation);
    set((state) =>
      withActivity(
        promoteQueuedAnimations([...state.queue, queued], state.active),
      ),
    );
    return queued.id;
  },
  complete: (animationId) => {
    const completed =
      get().active.find((animation) => animation.id === animationId) ?? null;

    set((state) => {
      const remainingActive = state.active.filter((animation) => {
        return animation.id !== animationId;
      });

      if (!completed) {
        return withActivity({
          active: remainingActive,
          queue: state.queue.filter(
            (animation) => animation.id !== animationId,
          ),
        });
      }

      return withActivity(
        promoteQueuedAnimations(state.queue, remainingActive),
      );
    });

    if (!completed) return;

    completed.onComplete?.();
    for (const listener of Array.from(completeListeners)) {
      listener(completed);
    }
  },
  onComplete: (callback) => {
    completeListeners.add(callback);
    return () => {
      completeListeners.delete(callback);
    };
  },
  reset: () => {
    completeListeners.clear();
    set(emptyState);
  },
}));

function promoteQueuedAnimations(
  queue: readonly TacticalAnimation[],
  active: readonly TacticalAnimation[],
): Pick<AnimationQueueState, 'active' | 'queue'> {
  const nextActive = [...active];
  const nextQueue: TacticalAnimation[] = [];
  const blockedMaps = new Set<string>();

  for (const animation of queue) {
    if (blockedMaps.has(animation.mapId)) {
      nextQueue.push(animation);
      continue;
    }

    if (canStart(animation, nextActive)) {
      nextActive.push(animation);
      continue;
    }

    blockedMaps.add(animation.mapId);
    nextQueue.push(animation);
  }

  return { active: nextActive, queue: nextQueue };
}

function canStart(
  candidate: TacticalAnimation,
  active: readonly TacticalAnimation[],
): boolean {
  return !active.some((animation) => {
    if (animation.mapId !== candidate.mapId) return false;
    if (
      candidate.unitId !== undefined &&
      animation.unitId === candidate.unitId
    ) {
      return true;
    }
    return overlapsHexes(candidate, animation);
  });
}

function overlapsHexes(
  candidate: TacticalAnimation,
  active: TacticalAnimation,
): boolean {
  const candidateHexes = hexesForAnimation(candidate);
  if (candidateHexes.length === 0) return false;

  const activeKeys = new Set(hexesForAnimation(active).map(hexKey));
  return candidateHexes.some((hex) => activeKeys.has(hexKey(hex)));
}

function hexesForAnimation(
  animation: TacticalAnimation,
): readonly IHexCoordinate[] {
  return animation.occupiedHexes ?? animation.path ?? [];
}

function withActivity(
  state: Pick<AnimationQueueState, 'active' | 'queue'>,
): Pick<AnimationQueueState, 'active' | 'isActive' | 'queue'> {
  return {
    ...state,
    isActive: state.active.length > 0 || state.queue.length > 0,
  };
}

function cloneAnimation(animation: TacticalAnimation): TacticalAnimation {
  return {
    id: animation.id,
    mapId: animation.mapId,
    ...(animation.unitId !== undefined ? { unitId: animation.unitId } : {}),
    ...(animation.kind !== undefined ? { kind: animation.kind } : {}),
    ...(animation.path !== undefined
      ? { path: animation.path.map(copyHex) }
      : {}),
    ...(animation.occupiedHexes !== undefined
      ? { occupiedHexes: animation.occupiedHexes.map(copyHex) }
      : {}),
    ...(animation.onComplete !== undefined
      ? { onComplete: animation.onComplete }
      : {}),
  };
}

function copyHex(hex: IHexCoordinate): IHexCoordinate {
  return { q: hex.q, r: hex.r };
}

function hexKey(hex: IHexCoordinate): string {
  return `${hex.q},${hex.r}`;
}
