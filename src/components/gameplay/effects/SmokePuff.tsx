import React, { useMemo } from 'react';

import type { IGameEvent } from '@/types/gameplay';

import { usePrefersReducedMotion } from '@/hooks/useReducedMotion';

import {
  DAMAGE_EFFECT_SMOKE_SYMBOL_ID,
  destroyedLocationsFromEvent,
  effectAnchorForLocation,
  effectLocationLabel,
  isLocationDestroyedEvent,
  normalizeDamageLocation,
  toDomToken,
  uniqueEffectLocations,
  type EffectLocation,
  type SmokeLocation,
} from './damageEffectHelpers';

export interface SmokePuffProps {
  readonly unitId: string;
  readonly location?: string;
  readonly events?: readonly IGameEvent[];
  readonly x?: number;
  readonly y?: number;
  readonly variant?: 'live' | 'wreck';
  readonly prefersReducedMotion?: boolean;
  readonly symbolId?: string;
}

export function SmokePuff({
  unitId,
  location,
  events,
  x = 0,
  y = 0,
  variant = 'live',
  prefersReducedMotion,
  symbolId = DAMAGE_EFFECT_SMOKE_SYMBOL_ID,
}: SmokePuffProps): React.ReactElement | null {
  const systemPrefersReducedMotion = usePrefersReducedMotion();
  const reducedMotion = prefersReducedMotion ?? systemPrefersReducedMotion;
  const smokeLocations = useMemo(
    () => resolveSmokeLocations(unitId, location, events, variant),
    [events, location, unitId, variant],
  );

  if (smokeLocations.length === 0) return null;

  return (
    <>
      {smokeLocations.map((smokeLocation) => (
        <SmokePuffVisual
          key={`${unitId}-${smokeLocation}`}
          unitId={unitId}
          smokeLocation={smokeLocation}
          x={x}
          y={y}
          variant={variant}
          reducedMotion={reducedMotion}
          symbolId={symbolId}
        />
      ))}
    </>
  );
}

function SmokePuffVisual({
  unitId,
  smokeLocation,
  x,
  y,
  variant,
  reducedMotion,
  symbolId,
}: {
  readonly unitId: string;
  readonly smokeLocation: SmokeLocation;
  readonly x: number;
  readonly y: number;
  readonly variant: 'live' | 'wreck';
  readonly reducedMotion: boolean;
  readonly symbolId: string;
}): React.ReactElement {
  const anchor = effectAnchorForLocation(smokeLocation);
  const label = effectLocationLabel(smokeLocation);
  const unitToken = toDomToken(unitId);
  const locationToken = toDomToken(smokeLocation);
  const titleId = `smoke-title-${unitToken}-${locationToken}`;
  const scale = variant === 'wreck' ? 0.72 : 1;
  const opacity = variant === 'wreck' ? 0.42 : 0.72;

  return (
    <g
      data-testid={
        variant === 'wreck'
          ? `wreck-smoke-${unitToken}`
          : `smoke-puff-${unitToken}-${smokeLocation}`
      }
      data-location={smokeLocation}
      data-variant={variant}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      role="img"
      aria-labelledby={titleId}
      pointerEvents="none"
      transform={`translate(${x + anchor.x}, ${y + anchor.y}) scale(${scale})`}
    >
      <title id={titleId}>
        {variant === 'wreck'
          ? `Wreck smoke from ${unitId}`
          : `Smoke venting from ${label} on ${unitId}`}
      </title>
      <use href={`#${symbolId}`} opacity={opacity} />
    </g>
  );
}

function resolveSmokeLocations(
  unitId: string,
  location: string | undefined,
  events: readonly IGameEvent[] | undefined,
  variant: 'live' | 'wreck',
): readonly SmokeLocation[] {
  if (variant === 'wreck') return ['wreck'];
  if (location) return [normalizeDamageLocation(location)];
  if (!events) return [];

  const locations: EffectLocation[] = [];
  for (const event of events) {
    if (!isLocationDestroyedEvent(event)) continue;
    if (event.payload.unitId !== unitId) continue;
    locations.push(...destroyedLocationsFromEvent(event.payload));
  }
  return uniqueEffectLocations(locations);
}

export default SmokePuff;
