import React, { useEffect, useRef, useState } from 'react';

import type { IGameEvent } from '@/types/gameplay';

import { usePrefersReducedMotion } from '@/hooks/useReducedMotion';
import {
  attackImpactDelayMs,
  resolveAttackEventEffect,
} from '@/utils/effects/weaponEffectMap';

import {
  damageFlashLocations,
  effectAnchorForLocation,
  isDamageAppliedEvent,
  toDomToken,
  type EffectLocation,
} from './damageEffectHelpers';

const FLASH_DURATION_MS = 250;
const REDUCED_MOTION_FLASH_MS = 80;

interface ActiveFlash {
  readonly id: string;
  readonly location: EffectLocation;
  readonly startDelayMs: number;
}

export interface HitLocationFlashProps {
  readonly unitId: string;
  readonly events?: readonly IGameEvent[];
  readonly prefersReducedMotion?: boolean;
}

export function HitLocationFlash({
  unitId,
  events,
  prefersReducedMotion,
}: HitLocationFlashProps): React.ReactElement | null {
  const systemPrefersReducedMotion = usePrefersReducedMotion();
  const reducedMotion = prefersReducedMotion ?? systemPrefersReducedMotion;
  const durationMs = reducedMotion
    ? REDUCED_MOTION_FLASH_MS
    : FLASH_DURATION_MS;
  const seenEventIdsRef = useRef<Set<string>>(new Set());
  const [activeFlashes, setActiveFlashes] = useState<readonly ActiveFlash[]>(
    [],
  );

  useEffect(() => {
    if (!events) return undefined;

    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const event of events) {
      if (seenEventIdsRef.current.has(event.id)) continue;
      seenEventIdsRef.current.add(event.id);
      if (!isDamageAppliedEvent(event)) continue;
      if (event.payload.unitId !== unitId) continue;

      const locations = damageFlashLocations(event.payload);
      const impactDelayMs = damageFlashDelayMs(event, events, reducedMotion);
      locations.forEach((location, index) => {
        const flashId = `${event.id}-${location}-${index}`;
        const startDelayMs = impactDelayMs + index * durationMs;
        const startTimer = setTimeout(() => {
          setActiveFlashes((current) => [
            ...current,
            { id: flashId, location, startDelayMs },
          ]);

          const clearTimer = setTimeout(() => {
            setActiveFlashes((current) =>
              current.filter((flash) => flash.id !== flashId),
            );
          }, durationMs);
          timers.push(clearTimer);
        }, startDelayMs);
        timers.push(startTimer);
      });
    }

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [durationMs, events, reducedMotion, unitId]);

  if (activeFlashes.length === 0) return null;

  return (
    <g
      data-testid={`hit-location-flashes-${toDomToken(unitId)}`}
      pointerEvents="none"
      aria-hidden="true"
    >
      {activeFlashes.map((flash) => {
        const anchor = effectAnchorForLocation(flash.location);
        return (
          <g
            key={flash.id}
            data-testid={`hit-location-flash-${toDomToken(unitId)}-${flash.location}`}
            data-location={flash.location}
            data-duration-ms={durationMs}
            data-start-delay-ms={flash.startDelayMs}
            transform={`translate(${anchor.x}, ${anchor.y})`}
            pointerEvents="none"
          >
            <ellipse
              rx={16}
              ry={11}
              fill="#ffffff"
              opacity={0.6}
              stroke="#dbeafe"
              strokeWidth={1}
            >
              {!reducedMotion && (
                <animate
                  attributeName="opacity"
                  values="0.6;0"
                  dur={`${durationMs}ms`}
                  fill="freeze"
                />
              )}
            </ellipse>
          </g>
        );
      })}
    </g>
  );
}

function damageFlashDelayMs(
  event: IGameEvent,
  events: readonly IGameEvent[],
  reducedMotion: boolean,
): number {
  if (!isDamageAppliedEvent(event)) return 0;
  const attackId = event.payload.attackId;
  if (!attackId) return 0;

  const attackEvent = events.find((candidate) => candidate.id === attackId);
  if (!attackEvent) return 0;

  const effect = resolveAttackEventEffect(attackEvent);
  return effect ? attackImpactDelayMs(effect, reducedMotion) : 0;
}

export default HitLocationFlash;
