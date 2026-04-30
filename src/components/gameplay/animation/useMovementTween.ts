import { useEffect, useMemo, useRef, useState } from 'react';

import type {
  Facing,
  IHexCoordinate,
  MovementAnimationMode,
} from '@/types/gameplay';

import { usePrefersReducedMotion } from '@/hooks/useReducedMotion';
import { Facing as FacingValue } from '@/types/gameplay';

export interface TweenPoint {
  readonly x: number;
  readonly y: number;
}

export interface MovementTweenFrame {
  readonly x: number;
  readonly y: number;
  readonly facing: Facing;
  readonly scale: number;
  readonly arcOffset: number;
  readonly isAnimating: boolean;
  readonly isComplete: boolean;
  readonly reducedMotion: boolean;
  readonly mode: MovementAnimationMode;
}

export interface MovementTweenOptions {
  readonly initialFacing?: Facing;
  readonly finalFacing?: Facing;
  readonly prefersReducedMotion?: boolean;
  readonly projectHex?: (coord: IHexCoordinate) => TweenPoint;
}

export function useMovementTween(
  path: readonly IHexCoordinate[],
  mode: MovementAnimationMode,
  onDone: () => void,
  options: MovementTweenOptions = {},
): MovementTweenFrame {
  const systemReducedMotion = usePrefersReducedMotion();
  const reducedMotion = options.prefersReducedMotion ?? systemReducedMotion;
  const projectHex = options.projectHex ?? defaultProjectHex;
  const initialFacing = options.initialFacing ?? FacingValue.North;
  const finalFacing = options.finalFacing ?? initialFacing;
  const pathKey = path.map((hex) => `${hex.q},${hex.r}`).join('|');
  const onDoneRef = useRef(onDone);
  const completedKeyRef = useRef<string | null>(null);
  const completionKey = `${pathKey}:${mode}:${finalFacing}:${reducedMotion}`;

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const nextFrame = useMemo(
    () =>
      createReducedMotionAwareFrame({
        path,
        mode,
        reducedMotion,
        projectHex,
        initialFacing,
        finalFacing,
      }),
    [finalFacing, initialFacing, mode, path, projectHex, reducedMotion],
  );
  const [frame, setFrame] = useState(nextFrame);

  useEffect(() => {
    setFrame(nextFrame);

    if (!reducedMotion) {
      completedKeyRef.current = null;
      return;
    }

    if (completedKeyRef.current === completionKey) return;
    completedKeyRef.current = completionKey;
    onDoneRef.current();
  }, [completionKey, nextFrame, reducedMotion]);

  return frame;
}

function createReducedMotionAwareFrame(params: {
  readonly path: readonly IHexCoordinate[];
  readonly mode: MovementAnimationMode;
  readonly reducedMotion: boolean;
  readonly projectHex: (coord: IHexCoordinate) => TweenPoint;
  readonly initialFacing: Facing;
  readonly finalFacing: Facing;
}): MovementTweenFrame {
  const start = params.path[0] ?? { q: 0, r: 0 };
  const end = params.path[params.path.length - 1] ?? start;
  const coord = params.reducedMotion ? end : start;
  const point = params.projectHex(coord);

  return {
    x: point.x,
    y: point.y,
    facing: params.reducedMotion ? params.finalFacing : params.initialFacing,
    scale: 1,
    arcOffset: 0,
    isAnimating: !params.reducedMotion && params.path.length > 1,
    isComplete: params.reducedMotion || params.path.length <= 1,
    reducedMotion: params.reducedMotion,
    mode: params.mode,
  };
}

function defaultProjectHex(coord: IHexCoordinate): TweenPoint {
  return { x: coord.q, y: coord.r };
}
