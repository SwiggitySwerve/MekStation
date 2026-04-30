import React from 'react';

import { usePrefersReducedMotion } from '@/hooks/useReducedMotion';
import { isAmmoExplosionDangerHeat } from '@/utils/effects/heatVisualMap';

export interface AmmoExplosionAuraProps {
  readonly active?: boolean;
  readonly heat?: number;
  readonly idSuffix?: string;
  readonly radius?: number;
}

const DEFAULT_RADIUS = 39;
const AURA_RED = '#dc2626';
const AURA_PURPLE = '#a21caf';

export function AmmoExplosionAura({
  active,
  heat = 0,
  idSuffix = 'unit',
  radius = DEFAULT_RADIUS,
}: AmmoExplosionAuraProps): React.ReactElement | null {
  const reducedMotion = usePrefersReducedMotion();
  const isActive = active ?? isAmmoExplosionDangerHeat(heat);

  if (!isActive) return null;

  const filterId = `ammo-explosion-aura-${toSvgIdSuffix(idSuffix)}`;
  const shouldPulse = !reducedMotion;

  return (
    <g
      data-testid="ammo-explosion-aura"
      data-layer-order="ammo-explosion-aura"
      data-dismiss-transition-ms="300"
      data-pulse={shouldPulse ? 'true' : 'false'}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      data-risk-heat={String(heat)}
      pointerEvents="none"
      role="img"
      aria-label={`Ammo explosion risk at heat ${heat}`}
    >
      <defs>
        <filter
          id={filterId}
          data-testid="ammo-explosion-aura-filter"
          x="-80%"
          y="-80%"
          width="260%"
          height="260%"
        >
          <feGaussianBlur
            in="SourceGraphic"
            stdDeviation={reducedMotion ? 2 : 4}
            result="ammoAuraBlur"
          />
          <feMerge>
            <feMergeNode in="ammoAuraBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle
        data-testid="ammo-explosion-aura-halo"
        cx="0"
        cy="0"
        r={radius}
        fill="none"
        stroke={AURA_PURPLE}
        strokeWidth="5"
        opacity={reducedMotion ? 0.82 : 0.58}
        filter={`url(#${filterId})`}
        style={{
          transition: reducedMotion
            ? 'none'
            : 'opacity 300ms ease, stroke 300ms ease',
        }}
        pointerEvents="none"
      >
        {shouldPulse && (
          <animate
            data-testid="ammo-explosion-aura-pulse"
            attributeName="opacity"
            values="0.45;0.84;0.45"
            dur="1s"
            repeatCount="indefinite"
          />
        )}
      </circle>

      <circle
        data-testid="ammo-explosion-aura-red-ring"
        cx="0"
        cy="0"
        r={round(radius * 0.86)}
        fill="none"
        stroke={AURA_RED}
        strokeWidth="2"
        opacity="0.82"
        pointerEvents="none"
      />
    </g>
  );
}

function toSvgIdSuffix(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
