import React, { useMemo } from 'react';

import type { IGameEvent } from '@/types/gameplay';

import { usePrefersReducedMotion } from '@/hooks/useReducedMotion';

import {
  DAMAGE_EFFECT_FIRE_SYMBOL_ID,
  effectAnchorForLocation,
  isEngineCriticalEvent,
  toDomToken,
} from './damageEffectHelpers';

export interface EngineFireProps {
  readonly unitId: string;
  readonly events?: readonly IGameEvent[];
  readonly engineCritCount?: number;
  readonly x?: number;
  readonly y?: number;
  readonly prefersReducedMotion?: boolean;
  readonly symbolId?: string;
}

export function EngineFire({
  unitId,
  events,
  engineCritCount,
  x = 0,
  y = 0,
  prefersReducedMotion,
  symbolId = DAMAGE_EFFECT_FIRE_SYMBOL_ID,
}: EngineFireProps): React.ReactElement | null {
  const systemPrefersReducedMotion = usePrefersReducedMotion();
  const reducedMotion = prefersReducedMotion ?? systemPrefersReducedMotion;
  const projectedCritCount = useMemo(
    () => engineCritCount ?? countEngineCrits(unitId, events),
    [engineCritCount, events, unitId],
  );

  if (projectedCritCount <= 0) return null;

  const intensity = Math.min(3, projectedCritCount);
  const scale = 0.78 + intensity * 0.2;
  const anchor = effectAnchorForLocation('centerTorso');
  const unitToken = toDomToken(unitId);
  const titleId = `engine-fire-title-${unitToken}`;

  return (
    <g
      data-testid={`engine-fire-${unitToken}`}
      data-intensity={intensity}
      data-engine-crit-count={projectedCritCount}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      role="img"
      aria-labelledby={titleId}
      pointerEvents="none"
      transform={`translate(${x + anchor.x}, ${y + anchor.y}) scale(${scale})`}
    >
      <title id={titleId}>
        {`Engine fire on ${unitId}, intensity ${intensity}`}
      </title>
      <use href={`#${symbolId}`} />
    </g>
  );
}

function countEngineCrits(
  unitId: string,
  events: readonly IGameEvent[] | undefined,
): number {
  if (!events) return 0;

  let count = 0;
  for (const event of events) {
    if (!isEngineCriticalEvent(event)) continue;
    if (event.payload.unitId === unitId) count += 1;
  }
  return count;
}

export default EngineFire;
