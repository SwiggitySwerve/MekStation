import React from 'react';

import {
  attackAnimationStyle,
  type PointEffectProps,
  useEffectiveReducedMotion,
} from './shared';

export interface ImpactFlashProps extends PointEffectProps {
  readonly radius?: number;
}

export function ImpactFlash({
  center,
  color,
  opacity = 1,
  durationMs = 150,
  delayMs = 0,
  testId = 'attack-effect-impact-flash',
  reducedMotion,
  radius = 12,
}: ImpactFlashProps): React.ReactElement {
  const prefersReducedMotion = useEffectiveReducedMotion(reducedMotion);
  const effectiveDuration = prefersReducedMotion ? 80 : durationMs;
  const effectiveOpacity = prefersReducedMotion ? opacity * 0.5 : opacity;

  return (
    <g
      pointerEvents="none"
      opacity={effectiveOpacity}
      transform={`translate(${center.x} ${center.y})`}
      data-testid={testId}
      data-effect="impact-flash"
      data-color={color}
      data-duration-ms={effectiveDuration}
      data-delay-ms={delayMs}
    >
      <g
        style={attackAnimationStyle(
          prefersReducedMotion
            ? 'attack-effect-reduced-fade'
            : 'attack-effect-impact',
          effectiveDuration,
          delayMs,
          { transformOrigin: 'center', transformBox: 'fill-box' },
        )}
      >
        <circle
          cx={0}
          cy={0}
          r={radius}
          fill={color}
          fillOpacity={0.38}
          stroke={color}
          strokeWidth={2}
        />
        <line
          x1={-radius}
          y1={0}
          x2={radius}
          y2={0}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
        <line
          x1={0}
          y1={-radius}
          x2={0}
          y2={radius}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </g>
    </g>
  );
}

export default ImpactFlash;
