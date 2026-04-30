import React from 'react';

import { usePrefersReducedMotion } from '@/hooks/useReducedMotion';

export interface StartupPulseProps {
  readonly attemptId: number | string | null;
  readonly success: boolean;
  readonly active?: boolean;
  readonly radius?: number;
}

const DEFAULT_RADIUS = 34;
const SUCCESS_COLOR = '#f59e0b';
const SUCCESS_SETTLE_COLOR = '#e5e7eb';
const FAILURE_COLOR = '#94a3b8';
const FAILURE_SETTLE_COLOR = '#475569';

export function StartupPulse({
  attemptId,
  success,
  active = true,
  radius = DEFAULT_RADIUS,
}: StartupPulseProps): React.ReactElement | null {
  const reducedMotion = usePrefersReducedMotion();

  if (!active || attemptId === null) return null;

  const outcome = success ? 'success' : 'failure';
  const durationMs = success ? 800 : 400;
  const startColor = success ? SUCCESS_COLOR : FAILURE_COLOR;
  const endColor = success ? SUCCESS_SETTLE_COLOR : FAILURE_SETTLE_COLOR;
  const targetRadius = round(radius * 1.2);

  return (
    <g
      key={`${attemptId}-${outcome}`}
      data-testid="startup-pulse"
      data-attempt-id={String(attemptId)}
      data-replay-key={`${attemptId}-${outcome}`}
      data-outcome={outcome}
      data-duration-ms={String(durationMs)}
      data-layer-order="startup-pulse"
      data-shutdown-remains={success ? 'false' : 'true'}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      pointerEvents="none"
      role="img"
      aria-label={`Startup ${outcome}`}
    >
      <circle
        data-testid="startup-pulse-ring"
        cx="0"
        cy="0"
        r={reducedMotion ? targetRadius : 0}
        fill="none"
        stroke={reducedMotion ? endColor : startColor}
        strokeWidth="3"
        opacity={reducedMotion ? 0.78 : 0.88}
        pointerEvents="none"
      >
        {!reducedMotion && (
          <>
            <animate
              data-testid="startup-pulse-scale"
              attributeName="r"
              values={`0;${targetRadius}`}
              dur={`${durationMs}ms`}
              fill="freeze"
              repeatCount="1"
            />
            <animate
              data-testid="startup-pulse-fade"
              attributeName="opacity"
              values="0.88;0"
              dur={`${durationMs}ms`}
              fill="freeze"
              repeatCount="1"
            />
            <animate
              data-testid="startup-pulse-color"
              attributeName="stroke"
              values={`${startColor};${endColor}`}
              dur={`${durationMs}ms`}
              fill="freeze"
              repeatCount="1"
            />
          </>
        )}
      </circle>

      {reducedMotion && (
        <circle
          data-testid="startup-pulse-static-snap"
          cx="0"
          cy="0"
          r={targetRadius}
          fill="none"
          stroke={endColor}
          strokeWidth="2"
          opacity="0.72"
          pointerEvents="none"
        />
      )}
    </g>
  );
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
