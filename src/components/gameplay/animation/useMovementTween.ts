import { useEffect, useMemo, useRef, useState } from 'react';

import type {
  Facing,
  IHexCoordinate,
  MovementAnimationMode,
} from '@/types/gameplay';

import { usePrefersReducedMotion } from '@/hooks/useReducedMotion';
import {
  Facing as FacingValue,
  MovementType as MovementTypeValue,
} from '@/types/gameplay';

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
  readonly arcOpacity: number;
  readonly progress: number;
  readonly durationMs: number;
  readonly isAnimating: boolean;
  readonly isComplete: boolean;
  readonly reducedMotion: boolean;
  readonly mode: MovementAnimationMode;
}

export interface MovementTweenOptions {
  readonly animationKey?: string;
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
  const animationKey = options.animationKey ?? pathKey;
  const onDoneRef = useRef(onDone);
  const completedKeyRef = useRef<string | null>(null);
  const completionKey = `${animationKey}:${pathKey}:${mode}:${finalFacing}:${reducedMotion}`;

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const initialFrame = useMemo(
    () =>
      createFrameAtElapsed({
        path,
        mode,
        reducedMotion,
        elapsedMs: 0,
        projectHex,
        initialFacing,
        finalFacing,
      }),
    [finalFacing, initialFacing, mode, pathKey, projectHex, reducedMotion],
  );
  const [frame, setFrame] = useState(initialFrame);

  useEffect(() => {
    setFrame((current) =>
      movementFramesEqual(current, initialFrame) ? current : initialFrame,
    );

    const finish = () => {
      if (completedKeyRef.current === completionKey) return;
      completedKeyRef.current = completionKey;
      onDoneRef.current();
    };

    if (reducedMotion || initialFrame.isComplete) {
      finish();
      return;
    }

    completedKeyRef.current = null;

    let frameId: number | null = null;
    let startTime: number | null = null;
    let cancelled = false;

    const tick = (timestamp: number) => {
      if (cancelled) return;
      if (startTime === null) startTime = timestamp;

      const elapsedMs = Math.max(0, timestamp - startTime);
      const nextFrame = createFrameAtElapsed({
        path,
        mode,
        reducedMotion,
        elapsedMs,
        projectHex,
        initialFacing,
        finalFacing,
      });
      setFrame(nextFrame);

      if (nextFrame.isComplete) {
        finish();
        return;
      }

      frameId = scheduleAnimationFrame(tick);
    };

    frameId = scheduleAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (frameId !== null) cancelScheduledAnimationFrame(frameId);
    };
  }, [
    completionKey,
    finalFacing,
    initialFacing,
    initialFrame,
    mode,
    pathKey,
    projectHex,
    reducedMotion,
  ]);

  return frame;
}

function createFrameAtElapsed(params: {
  readonly path: readonly IHexCoordinate[];
  readonly mode: MovementAnimationMode;
  readonly reducedMotion: boolean;
  readonly elapsedMs: number;
  readonly projectHex: (coord: IHexCoordinate) => TweenPoint;
  readonly initialFacing: Facing;
  readonly finalFacing: Facing;
}): MovementTweenFrame {
  const start = params.path[0] ?? { q: 0, r: 0 };
  const end = params.path[params.path.length - 1] ?? start;
  const durationMs = durationForPath(params.path, params.mode);
  const noTween = params.reducedMotion || durationMs === 0;
  const elapsedMs = noTween ? durationMs : params.elapsedMs;
  const progress = durationMs === 0 ? 1 : clamp01(elapsedMs / durationMs);
  const point = noTween
    ? params.projectHex(end)
    : interpolatePathPoint(
        params.path,
        params.mode,
        elapsedMs,
        params.projectHex,
      );
  const jumpLift =
    !noTween && params.mode === MovementTypeValue.Jump
      ? jumpArcLift(params.projectHex(start), params.projectHex(end), progress)
      : 0;
  const arcOpacity =
    !noTween && params.mode === MovementTypeValue.Jump
      ? jumpArcOpacity(elapsedMs, durationMs)
      : 0;
  const isComplete = noTween || progress >= 1;

  return {
    x: point.x,
    y: point.y - jumpLift,
    facing: interpolateFacing(
      params.initialFacing,
      params.finalFacing,
      params.reducedMotion ? 1 : easeInOut(progress),
    ),
    scale: jumpLift > 0 ? 1 + 0.06 * Math.sin(Math.PI * progress) : 1,
    arcOffset: jumpLift,
    arcOpacity,
    progress,
    durationMs,
    isAnimating: !isComplete,
    isComplete,
    reducedMotion: params.reducedMotion,
    mode: params.mode,
  };
}

function defaultProjectHex(coord: IHexCoordinate): TweenPoint {
  return { x: coord.q, y: coord.r };
}

const WALK_SEGMENT_MS = 300;
const RUN_SEGMENT_MS = 180;
const JUMP_DURATION_MS = 600;
const JUMP_ARC_FADE_MS = 100;
const MIN_JUMP_LIFT_PX = 24;

function durationForPath(
  path: readonly IHexCoordinate[],
  mode: MovementAnimationMode,
): number {
  if (path.length <= 1) return 0;
  if (mode === MovementTypeValue.Jump) return JUMP_DURATION_MS;
  const segmentMs =
    mode === MovementTypeValue.Run ? RUN_SEGMENT_MS : WALK_SEGMENT_MS;
  return (path.length - 1) * segmentMs;
}

function interpolatePathPoint(
  path: readonly IHexCoordinate[],
  mode: MovementAnimationMode,
  elapsedMs: number,
  projectHex: (coord: IHexCoordinate) => TweenPoint,
): TweenPoint {
  const start = path[0] ?? { q: 0, r: 0 };
  const end = path[path.length - 1] ?? start;

  if (mode === MovementTypeValue.Jump) {
    return interpolatePoint(
      projectHex(start),
      projectHex(end),
      clamp01(elapsedMs / JUMP_DURATION_MS),
    );
  }

  const segmentMs =
    mode === MovementTypeValue.Run ? RUN_SEGMENT_MS : WALK_SEGMENT_MS;
  const segmentCount = Math.max(0, path.length - 1);
  if (segmentCount === 0) return projectHex(end);

  const segmentIndex = Math.min(
    segmentCount - 1,
    Math.floor(elapsedMs / segmentMs),
  );
  const segmentProgress = clamp01(
    (elapsedMs - segmentIndex * segmentMs) / segmentMs,
  );

  return interpolatePoint(
    projectHex(path[segmentIndex]),
    projectHex(path[segmentIndex + 1]),
    segmentProgress,
  );
}

function interpolatePoint(
  start: TweenPoint,
  end: TweenPoint,
  progress: number,
): TweenPoint {
  return {
    x: start.x + (end.x - start.x) * progress,
    y: start.y + (end.y - start.y) * progress,
  };
}

function jumpArcLift(start: TweenPoint, end: TweenPoint, progress: number) {
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  const peak = Math.max(MIN_JUMP_LIFT_PX, distance * 0.2);
  return Math.sin(Math.PI * progress) * peak;
}

function jumpArcOpacity(elapsedMs: number, durationMs: number): number {
  return clamp01(
    Math.min(
      elapsedMs / JUMP_ARC_FADE_MS,
      (durationMs - elapsedMs) / JUMP_ARC_FADE_MS,
    ),
  );
}

function interpolateFacing(
  initialFacing: Facing,
  finalFacing: Facing,
  progress: number,
): Facing {
  const start = Number(initialFacing);
  const end = Number(finalFacing);
  const delta = shortestFacingDelta(start, end);
  return normalizeFacing(start + delta * progress) as Facing;
}

function shortestFacingDelta(start: number, end: number): number {
  const raw = ((end - start + 3) % 6) - 3;
  return raw === -3 ? 3 : raw;
}

function normalizeFacing(facing: number): number {
  return ((facing % 6) + 6) % 6;
}

function easeInOut(progress: number): number {
  return 0.5 - Math.cos(clamp01(progress) * Math.PI) / 2;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function movementFramesEqual(
  a: MovementTweenFrame,
  b: MovementTweenFrame,
): boolean {
  return (
    a.x === b.x &&
    a.y === b.y &&
    a.facing === b.facing &&
    a.scale === b.scale &&
    a.arcOffset === b.arcOffset &&
    a.arcOpacity === b.arcOpacity &&
    a.progress === b.progress &&
    a.durationMs === b.durationMs &&
    a.isAnimating === b.isAnimating &&
    a.isComplete === b.isComplete &&
    a.reducedMotion === b.reducedMotion &&
    a.mode === b.mode
  );
}

function scheduleAnimationFrame(callback: FrameRequestCallback): number {
  if (typeof window !== 'undefined' && window.requestAnimationFrame) {
    return window.requestAnimationFrame(callback);
  }

  const frameId = globalThis.setTimeout(() => callback(performance.now()), 16);
  return typeof frameId === 'number' ? frameId : Number(frameId);
}

function cancelScheduledAnimationFrame(frameId: number): void {
  if (typeof window !== 'undefined' && window.cancelAnimationFrame) {
    window.cancelAnimationFrame(frameId);
    return;
  }

  globalThis.clearTimeout(frameId);
}
