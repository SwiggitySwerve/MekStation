import React from 'react';

import { usePrefersReducedMotion } from '@/hooks/useReducedMotion';

export interface ShutdownOverlayProps {
  readonly active: boolean;
  readonly children?: React.ReactNode;
  readonly idSuffix?: string;
  readonly radius?: number;
  readonly unitName?: string;
}

const DEFAULT_RADIUS = 34;
const DESATURATION_MATRIX =
  '0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0.33 0.33 0.33 0 0 0 0 0 1 0';

export function ShutdownOverlay({
  active,
  children,
  idSuffix = 'unit',
  radius = DEFAULT_RADIUS,
  unitName,
}: ShutdownOverlayProps): React.ReactElement | null {
  const reducedMotion = usePrefersReducedMotion();

  if (!active) return null;

  const filterId = `shutdown-desaturation-${toSvgIdSuffix(idSuffix)}`;
  const announcement = unitName
    ? `${unitName} powered down`
    : 'Unit powered down';

  return (
    <g
      data-testid="shutdown-overlay"
      data-layer-order="shutdown-overlay"
      data-suppresses-heat-glow="true"
      data-flicker={reducedMotion ? 'false' : 'true'}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      pointerEvents="none"
      role="img"
      aria-label={announcement}
    >
      <defs>
        <filter id={filterId} data-testid="shutdown-desaturation-filter">
          <feColorMatrix type="matrix" values={DESATURATION_MATRIX} />
        </filter>
      </defs>

      {children && (
        <g
          data-testid="shutdown-desaturated-content"
          filter={`url(#${filterId})`}
          pointerEvents="none"
        >
          {children}
        </g>
      )}

      <circle
        data-testid="shutdown-dim-disc"
        cx="0"
        cy="0"
        r={radius}
        fill="#0f172a"
        opacity="0.58"
        filter={`url(#${filterId})`}
        pointerEvents="none"
      >
        {!reducedMotion && (
          <animate
            data-testid="shutdown-flicker"
            attributeName="opacity"
            values="0.52;0.68;0.52"
            dur="3s"
            repeatCount="indefinite"
          />
        )}
      </circle>

      <g data-testid="shutdown-label" pointerEvents="none">
        <rect
          x="-34"
          y="40"
          width="68"
          height="14"
          rx="2"
          fill="#020617"
          opacity="0.78"
        />
        <text
          x="0"
          y="50"
          textAnchor="middle"
          fontSize="7"
          fontWeight="700"
          fill="#cbd5e1"
          letterSpacing="0"
        >
          POWERED DOWN
        </text>
      </g>

      <text
        data-testid="shutdown-live-region"
        aria-live="polite"
        role="status"
        opacity="0"
      >
        {announcement}
      </text>
    </g>
  );
}

function toSvgIdSuffix(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}
