import React from 'react';

import { usePrefersReducedMotion } from '@/hooks/useReducedMotion';
import { getHeatVisualMap } from '@/utils/effects/heatVisualMap';

export interface HeatGlowProps {
  readonly heat: number;
  readonly idSuffix?: string;
  readonly isShutdown?: boolean;
  readonly radius?: number;
}

const DEFAULT_RADIUS = 36;
const BADGE_MIN_HEAT = 15;
const CRITICAL_CORE_COLOR = '#dc2626';

export function HeatGlow({
  heat,
  idSuffix = 'unit',
  isShutdown = false,
  radius = DEFAULT_RADIUS,
}: HeatGlowProps): React.ReactElement | null {
  const reducedMotion = usePrefersReducedMotion();
  const heatVisual = getHeatVisualMap(heat);

  if (isShutdown) return null;

  const filterId = `heat-glow-filter-${toSvgIdSuffix(idSuffix)}`;
  const opacity = round(0.18 + heatVisual.intensity * 0.64);
  const strokeWidth = round(2 + heatVisual.intensity * 5);
  const shouldPulse = heatVisual.pulse && !reducedMotion;
  const badge = heat >= BADGE_MIN_HEAT ? heatVisual.badge : null;
  const transition = reducedMotion
    ? 'none'
    : 'opacity 300ms ease, stroke 300ms ease, stroke-width 300ms ease';

  return (
    <g
      data-testid="heat-glow"
      data-heat-threshold={heatVisual.threshold}
      data-layer-order="heat-glow"
      data-transition-ms="300"
      data-pulse={shouldPulse ? 'true' : 'false'}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      pointerEvents="none"
      role="img"
      aria-label={`Heat ${heat}: ${heatVisual.threshold}`}
    >
      <title>{`Heat ${heat}: ${heatVisual.threshold}`}</title>
      <defs>
        <filter
          id={filterId}
          data-testid="heat-glow-filter"
          x="-80%"
          y="-80%"
          width="260%"
          height="260%"
        >
          <feGaussianBlur
            in="SourceGraphic"
            stdDeviation={round(3 + heatVisual.intensity * 5)}
            result="heatGlowBlur"
          />
          <feMerge>
            <feMergeNode in="heatGlowBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle
        data-testid="heat-glow-halo"
        cx="0"
        cy="0"
        r={radius}
        fill="none"
        stroke={heatVisual.color}
        strokeWidth={strokeWidth}
        opacity={opacity}
        filter={`url(#${filterId})`}
        style={{ transition }}
        pointerEvents="none"
      >
        {shouldPulse && (
          <animate
            data-testid="heat-glow-pulse"
            attributeName="opacity"
            values={`${opacity};${round(Math.min(1, opacity + 0.16))};${opacity}`}
            dur="1.5s"
            repeatCount="indefinite"
          />
        )}
      </circle>

      {heatVisual.threshold === 'critical' && (
        <circle
          data-testid="heat-glow-critical-core"
          cx="0"
          cy="0"
          r={round(radius * 0.82)}
          fill="none"
          stroke={CRITICAL_CORE_COLOR}
          strokeWidth={round(strokeWidth * 0.48)}
          opacity={round(opacity * 0.8)}
          style={{ transition }}
          pointerEvents="none"
        />
      )}

      {reducedMotion && (
        <circle
          data-testid="heat-glow-reduced-outline"
          cx="0"
          cy="0"
          r={round(radius + 1)}
          fill="none"
          stroke={heatVisual.color}
          strokeWidth="2"
          opacity="0.9"
          pointerEvents="none"
        />
      )}

      {badge && (
        <g data-testid="heat-glow-badge" pointerEvents="none">
          <rect
            x="-25"
            y="-48"
            width="50"
            height="14"
            rx="2"
            fill="#111827"
            opacity="0.86"
          />
          <text
            x="0"
            y="-38"
            textAnchor="middle"
            fontSize="8"
            fontWeight="700"
            fill="#f8fafc"
            letterSpacing="0"
          >
            {badge}
          </text>
        </g>
      )}
    </g>
  );
}

function toSvgIdSuffix(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
