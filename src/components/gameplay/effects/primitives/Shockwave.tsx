import React from 'react';

import {
  attackAnimationStyle,
  ReducedMotionLine,
  type EffectPoint,
  type PointEffectProps,
  useEffectiveReducedMotion,
} from './shared';

export interface ShockwaveProps extends PointEffectProps {
  readonly radius?: number;
  readonly strokeWidth?: number;
  readonly fallbackStart?: EffectPoint;
  readonly fallbackEnd?: EffectPoint;
}

export function Shockwave({
  center,
  color,
  opacity = 1,
  durationMs = 400,
  delayMs = 0,
  testId = 'attack-effect-shockwave',
  reducedMotion,
  radius = 18,
  strokeWidth = 2,
  fallbackStart,
  fallbackEnd,
}: ShockwaveProps): React.ReactElement {
  const prefersReducedMotion = useEffectiveReducedMotion(reducedMotion);

  if (prefersReducedMotion && fallbackStart && fallbackEnd) {
    return (
      <ReducedMotionLine
        start={fallbackStart}
        end={fallbackEnd}
        color={color}
        opacity={opacity}
        delayMs={delayMs}
        testId={testId}
      />
    );
  }

  return (
    <g
      pointerEvents="none"
      opacity={opacity}
      transform={`translate(${center.x} ${center.y})`}
      data-testid={testId}
      data-effect="shockwave"
      data-color={color}
      data-duration-ms={durationMs}
      data-delay-ms={delayMs}
      data-stroke-width={strokeWidth}
    >
      <g
        style={attackAnimationStyle(
          prefersReducedMotion
            ? 'attack-effect-reduced-fade'
            : 'attack-effect-shockwave',
          prefersReducedMotion ? 300 : durationMs,
          delayMs,
          { transformOrigin: 'center', transformBox: 'fill-box' },
        )}
      >
        <circle
          cx={0}
          cy={0}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
        />
      </g>
    </g>
  );
}

export default Shockwave;
