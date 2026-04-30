import React, { useEffect, useRef, useState } from 'react';

import type { IGameEvent } from '@/types/gameplay';

import { usePrefersReducedMotion } from '@/hooks/useReducedMotion';

import { isUnitDestroyedEvent, toDomToken } from './damageEffectHelpers';

export const DEBRIS_CLOUD_DURATION_MS = 800;
const REDUCED_MOTION_DEBRIS_MS = 80;

interface ActiveDebrisCloud {
  readonly id: string;
  readonly cause: string;
}

export interface DebrisCloudProps {
  readonly unitId: string;
  readonly events?: readonly IGameEvent[];
  readonly x?: number;
  readonly y?: number;
  readonly prefersReducedMotion?: boolean;
}

export function DebrisCloud({
  unitId,
  events,
  x = 0,
  y = 0,
  prefersReducedMotion,
}: DebrisCloudProps): React.ReactElement | null {
  const systemPrefersReducedMotion = usePrefersReducedMotion();
  const reducedMotion = prefersReducedMotion ?? systemPrefersReducedMotion;
  const durationMs = reducedMotion
    ? REDUCED_MOTION_DEBRIS_MS
    : DEBRIS_CLOUD_DURATION_MS;
  const seenEventIdsRef = useRef<Set<string>>(new Set());
  const [activeClouds, setActiveClouds] = useState<
    readonly ActiveDebrisCloud[]
  >([]);

  useEffect(() => {
    if (!events) return undefined;

    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const event of events) {
      if (seenEventIdsRef.current.has(event.id)) continue;
      seenEventIdsRef.current.add(event.id);
      if (!isUnitDestroyedEvent(event)) continue;
      if (event.payload.unitId !== unitId) continue;

      const cloud: ActiveDebrisCloud = {
        id: event.id,
        cause: event.payload.cause,
      };
      setActiveClouds((current) => [...current, cloud]);
      const clearTimer = setTimeout(() => {
        setActiveClouds((current) =>
          current.filter((candidate) => candidate.id !== cloud.id),
        );
      }, durationMs);
      timers.push(clearTimer);
    }

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [durationMs, events, unitId]);

  if (activeClouds.length === 0) return null;

  const unitToken = toDomToken(unitId);

  return (
    <g
      data-testid={`debris-cloud-${unitToken}`}
      data-cloud-count={activeClouds.length}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      data-duration-ms={durationMs}
      transform={`translate(${x}, ${y})`}
      pointerEvents="none"
      aria-hidden="true"
    >
      {activeClouds.map((cloud, index) => (
        <g
          key={cloud.id}
          data-testid="debris-cloud-burst"
          data-cause={cloud.cause}
          transform={`rotate(${index * 19})`}
          pointerEvents="none"
        >
          <circle r={reducedMotion ? 22 : 12} fill="#6b7280" opacity={0.42}>
            {!reducedMotion && (
              <>
                <animate
                  attributeName="r"
                  values="10;34"
                  dur={`${DEBRIS_CLOUD_DURATION_MS}ms`}
                  fill="freeze"
                />
                <animate
                  attributeName="opacity"
                  values="0.55;0"
                  dur={`${DEBRIS_CLOUD_DURATION_MS}ms`}
                  fill="freeze"
                />
              </>
            )}
          </circle>
          <path
            d="M -22 -5 L -8 -14 L 4 -6 L 17 -18 L 24 -4 L 7 8 L -12 14 Z"
            fill="#374151"
            opacity={0.5}
          >
            {!reducedMotion && (
              <animate
                attributeName="opacity"
                values="0.65;0"
                dur={`${DEBRIS_CLOUD_DURATION_MS}ms`}
                fill="freeze"
              />
            )}
          </path>
        </g>
      ))}
    </g>
  );
}

export default DebrisCloud;
