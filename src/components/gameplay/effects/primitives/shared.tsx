import React from 'react';

import { usePrefersReducedMotion } from '@/hooks/useReducedMotion';

export interface EffectPoint {
  readonly x: number;
  readonly y: number;
}

export interface BaseEffectProps {
  readonly color: string;
  readonly opacity?: number;
  readonly durationMs?: number;
  readonly delayMs?: number;
  readonly testId?: string;
  readonly reducedMotion?: boolean;
}

export interface LineEffectProps extends BaseEffectProps {
  readonly start: EffectPoint;
  readonly end: EffectPoint;
  readonly projectileIndex?: number;
  readonly projectileCount?: number;
  readonly staggerMs?: number;
}

export interface PointEffectProps extends BaseEffectProps {
  readonly center: EffectPoint;
}

export type AttackEffectAnimationName =
  | 'attack-effect-beam'
  | 'attack-effect-missile'
  | 'attack-effect-tracer'
  | 'attack-effect-shockwave'
  | 'attack-effect-impact'
  | 'attack-effect-reduced-fade';

export type AttackEffectStyle = React.CSSProperties & {
  readonly transformBox?: 'fill-box' | 'view-box';
  readonly '--attack-effect-travel-x'?: string;
};

export const DEFAULT_REDUCED_MOTION_DURATION_MS = 300;

export function useEffectiveReducedMotion(
  override: boolean | undefined,
): boolean {
  const systemReducedMotion = usePrefersReducedMotion();
  return override ?? systemReducedMotion;
}

export function lineGeometry(
  start: EffectPoint,
  end: EffectPoint,
): {
  readonly length: number;
  readonly angleDeg: number;
  readonly transform: string;
} {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.max(0.01, Math.hypot(dx, dy));
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  return {
    length,
    angleDeg,
    transform: `translate(${start.x} ${start.y}) rotate(${angleDeg})`,
  };
}

export function attackAnimationStyle(
  animationName: AttackEffectAnimationName,
  durationMs: number,
  delayMs: number,
  options: {
    readonly transformOrigin?: string;
    readonly transformBox?: 'fill-box' | 'view-box';
    readonly travelX?: number;
  } = {},
): AttackEffectStyle {
  return {
    animationName,
    animationDuration: `${durationMs}ms`,
    animationDelay: `${delayMs}ms`,
    animationFillMode: 'both',
    animationTimingFunction: 'ease-out',
    transformOrigin: options.transformOrigin ?? '0 0',
    transformBox: options.transformBox ?? 'fill-box',
    '--attack-effect-travel-x':
      options.travelX === undefined ? undefined : `${options.travelX}px`,
  };
}

export function stableSvgId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

export function AttackEffectStyles(): React.ReactElement {
  return (
    <style>{`
      @keyframes attack-effect-beam {
        0% { opacity: 0; transform: scaleX(0.18); }
        14% { opacity: 1; transform: scaleX(1); }
        82% { opacity: 1; transform: scaleX(1); }
        100% { opacity: 0; transform: scaleX(1); }
      }

      @keyframes attack-effect-missile {
        0% { opacity: 0; transform: scaleX(0.12); }
        18% { opacity: 1; transform: scaleX(0.72); }
        74% { opacity: 1; transform: scaleX(1); }
        100% { opacity: 0; transform: scaleX(1); }
      }

      @keyframes attack-effect-tracer {
        0% { opacity: 0; transform: translateX(0) scaleX(0.85); }
        18% { opacity: 1; transform: translateX(0) scaleX(1); }
        82% { opacity: 1; transform: translateX(var(--attack-effect-travel-x, 0px)) scaleX(1); }
        100% { opacity: 0; transform: translateX(var(--attack-effect-travel-x, 0px)) scaleX(0.9); }
      }

      @keyframes attack-effect-shockwave {
        0% { opacity: 0; transform: scale(0.18); }
        18% { opacity: 1; transform: scale(0.7); }
        100% { opacity: 0; transform: scale(1.7); }
      }

      @keyframes attack-effect-impact {
        0% { opacity: 0; transform: scale(0.25); }
        35% { opacity: 1; transform: scale(1); }
        100% { opacity: 0; transform: scale(1.35); }
      }

      @keyframes attack-effect-reduced-fade {
        0% { opacity: 0.75; transform: scaleX(1); }
        100% { opacity: 0; transform: scaleX(1); }
      }
    `}</style>
  );
}

export function AttackEffectDefs({
  glowFilterId = 'attack-effect-glow',
}: {
  readonly glowFilterId?: string;
}): React.ReactElement {
  return (
    <defs>
      <filter
        id={glowFilterId}
        x="-35%"
        y="-120%"
        width="170%"
        height="340%"
        colorInterpolationFilters="sRGB"
      >
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

export function ReducedMotionLine({
  start,
  end,
  color,
  opacity = 0.65,
  durationMs = DEFAULT_REDUCED_MOTION_DURATION_MS,
  delayMs = 0,
  testId = 'attack-effect-reduced-line',
}: LineEffectProps): React.ReactElement {
  const geometry = lineGeometry(start, end);
  return (
    <g
      pointerEvents="none"
      opacity={opacity}
      transform={geometry.transform}
      data-testid={testId}
      data-effect="reduced"
      data-duration-ms={durationMs}
      data-delay-ms={delayMs}
    >
      <g
        style={attackAnimationStyle(
          'attack-effect-reduced-fade',
          durationMs,
          delayMs,
          { transformBox: 'view-box' },
        )}
      >
        <line
          x1={0}
          y1={0}
          x2={geometry.length}
          y2={0}
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
        />
      </g>
    </g>
  );
}
