import React, { useEffect, useRef, useState } from 'react';

import type { IGameEvent } from '@/types/gameplay';

import { usePrefersReducedMotion } from '@/hooks/useReducedMotion';

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
      locations.forEach((location, index) => {
        const flashId = `${event.id}-${location}-${index}`;
        const startTimer = setTimeout(() => {
          setActiveFlashes((current) => [
            ...current,
            { id: flashId, location },
          ]);

          const clearTimer = setTimeout(() => {
            setActiveFlashes((current) =>
              current.filter((flash) => flash.id !== flashId),
            );
          }, durationMs);
          timers.push(clearTimer);
        }, index * durationMs);
        timers.push(startTimer);
      });
    }

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [durationMs, events, unitId]);

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

export default HitLocationFlash;
