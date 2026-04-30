import React from 'react';

import {
  attackAnimationStyle,
  lineGeometry,
  ReducedMotionLine,
  type LineEffectProps,
  useEffectiveReducedMotion,
} from './shared';

export interface LaserBeamProps extends LineEffectProps {
  readonly glowFilterId?: string;
}

export function LaserBeam({
  start,
  end,
  color,
  opacity = 1,
  durationMs = 400,
  delayMs = 0,
  projectileIndex = 0,
  projectileCount = 1,
  staggerMs = 0,
  testId = 'attack-effect-laser',
  reducedMotion,
  glowFilterId = 'attack-effect-glow',
}: LaserBeamProps): React.ReactElement {
  const prefersReducedMotion = useEffectiveReducedMotion(reducedMotion);
  const delay = delayMs + projectileIndex * staggerMs;

  if (prefersReducedMotion) {
    return (
      <ReducedMotionLine
        start={start}
        end={end}
        color={color}
        opacity={opacity}
        delayMs={delay}
        testId={testId}
      />
    );
  }

  const geometry = lineGeometry(start, end);
  return (
    <g
      pointerEvents="none"
      opacity={opacity}
      transform={geometry.transform}
      data-testid={testId}
      data-effect="laser"
      data-color={color}
      data-duration-ms={durationMs}
      data-delay-ms={delay}
      data-projectile-index={projectileIndex}
      data-projectile-count={projectileCount}
      data-stagger-ms={staggerMs}
    >
      <g
        style={attackAnimationStyle('attack-effect-beam', durationMs, delay, {
          transformBox: 'view-box',
        })}
      >
        <line
          x1={0}
          y1={0}
          x2={geometry.length}
          y2={0}
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeOpacity={0.35}
          filter={`url(#${glowFilterId})`}
        />
        <line
          x1={0}
          y1={0}
          x2={geometry.length}
          y2={0}
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          strokeOpacity={0.95}
        />
      </g>
    </g>
  );
}

export default LaserBeam;
