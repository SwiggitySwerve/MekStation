import type { CSSProperties } from 'react';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { IGameEvent } from '@/types/gameplay';

import { isDamageAppliedEvent } from '@/components/gameplay/effects/damageEffectHelpers';
import { usePrefersReducedMotion } from '@/hooks/useReducedMotion';

export const SCREEN_SHAKE_DAMAGE_THRESHOLD = 10;
export const SCREEN_SHAKE_MAX_INTENSITY = 8;
export const SCREEN_SHAKE_DURATION_MS = 300;

const DAMAGE_TO_INTENSITY_SCALE =
  SCREEN_SHAKE_MAX_INTENSITY / (SCREEN_SHAKE_DAMAGE_THRESHOLD * 2);
const ZERO_OFFSET: ShakeOffset = { x: 0, y: 0 };
const ZERO_TRANSFORM = 'translate3d(0px, 0px, 0)';

interface ShakeOffset {
  readonly x: number;
  readonly y: number;
}

export interface UseScreenShakeOptions {
  readonly events?: readonly IGameEvent[];
  readonly prefersReducedMotion?: boolean;
  readonly random?: () => number;
}

export interface UseScreenShakeResult {
  readonly shake: (intensity: number, durationMs?: number) => void;
  readonly transform: string;
  readonly style: CSSProperties;
  readonly liveMessage: string;
  readonly isShaking: boolean;
}

export function screenShakeIntensityForDamage(damage: number): number {
  if (damage < SCREEN_SHAKE_DAMAGE_THRESHOLD) return 0;
  return Math.min(
    SCREEN_SHAKE_MAX_INTENSITY,
    Math.max(0, damage * DAMAGE_TO_INTENSITY_SCALE),
  );
}

export function useScreenShake(
  options: UseScreenShakeOptions = {},
): UseScreenShakeResult {
  const systemPrefersReducedMotion = usePrefersReducedMotion();
  const prefersReducedMotion =
    options.prefersReducedMotion ?? systemPrefersReducedMotion;
  const randomRef = useRef(options.random ?? Math.random);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenEventIdsRef = useRef<Set<string>>(new Set());

  const [offset, setOffset] = useState<ShakeOffset>(ZERO_OFFSET);
  const [isShaking, setIsShaking] = useState(false);
  const [liveMessage, setLiveMessage] = useState('');

  useEffect(() => {
    randomRef.current = options.random ?? Math.random;
  }, [options.random]);

  const clearShakeTimer = useCallback((): void => {
    if (!timerRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const shake = useCallback(
    (intensity: number, durationMs = SCREEN_SHAKE_DURATION_MS): void => {
      const dampenedIntensity = prefersReducedMotion
        ? intensity / 2
        : intensity;
      const effectiveIntensity = Math.min(
        SCREEN_SHAKE_MAX_INTENSITY,
        Math.max(0, dampenedIntensity),
      );

      if (prefersReducedMotion && effectiveIntensity < 2) return;
      if (effectiveIntensity <= 0) return;

      clearShakeTimer();

      setOffset({
        x: randomOffset(effectiveIntensity, randomRef.current),
        y: randomOffset(effectiveIntensity, randomRef.current),
      });
      setIsShaking(true);
      setLiveMessage('heavy hit');

      timerRef.current = setTimeout(() => {
        setOffset(ZERO_OFFSET);
        setIsShaking(false);
        setLiveMessage('');
        timerRef.current = null;
      }, durationMs);
    },
    [clearShakeTimer, prefersReducedMotion],
  );

  useEffect(() => {
    const events = options.events;
    if (!events) return;

    for (const event of events) {
      if (seenEventIdsRef.current.has(event.id)) continue;
      seenEventIdsRef.current.add(event.id);
      if (!isDamageAppliedEvent(event)) continue;

      const intensity = screenShakeIntensityForDamage(event.payload.damage);
      if (intensity > 0) {
        shake(intensity, SCREEN_SHAKE_DURATION_MS);
      }
    }
  }, [options.events, shake]);

  useEffect(
    () => () => {
      clearShakeTimer();
    },
    [clearShakeTimer],
  );

  const transform = useMemo(
    () =>
      offset.x === 0 && offset.y === 0
        ? ZERO_TRANSFORM
        : `translate3d(${offset.x}px, ${offset.y}px, 0)`,
    [offset.x, offset.y],
  );

  const style = useMemo<CSSProperties>(
    () => ({
      transform,
      transition: prefersReducedMotion
        ? 'transform 80ms ease-out'
        : 'transform 40ms linear',
      willChange: isShaking ? 'transform' : undefined,
    }),
    [isShaking, prefersReducedMotion, transform],
  );

  return {
    shake,
    transform,
    style,
    liveMessage,
    isShaking,
  };
}

function randomOffset(intensity: number, random: () => number): number {
  return roundToTenth((random() * 2 - 1) * intensity);
}

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}
