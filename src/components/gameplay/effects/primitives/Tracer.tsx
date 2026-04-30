import React from 'react';

import {
  attackAnimationStyle,
  lineGeometry,
  ReducedMotionLine,
  type LineEffectProps,
  useEffectiveReducedMotion,
} from './shared';

export function Tracer({
  start,
  end,
  color,
  opacity = 1,
  durationMs = 300,
  delayMs = 0,
  projectileIndex = 0,
  projectileCount = 1,
  staggerMs = 0,
  testId = 'attack-effect-tracer',
  reducedMotion,
}: LineEffectProps): React.ReactElement {
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
  const dashLength = Math.min(28, Math.max(12, geometry.length * 0.18));
  const travelX = Math.max(0, geometry.length - dashLength);
  return (
    <g
      pointerEvents="none"
      opacity={opacity}
      transform={geometry.transform}
      data-testid={testId}
      data-effect="tracer"
      data-color={color}
      data-duration-ms={durationMs}
      data-delay-ms={delay}
      data-projectile-index={projectileIndex}
      data-projectile-count={projectileCount}
      data-stagger-ms={staggerMs}
    >
      <g
        style={attackAnimationStyle('attack-effect-tracer', durationMs, delay, {
          transformBox: 'view-box',
          travelX,
        })}
      >
        <line
          x1={0}
          y1={0}
          x2={dashLength}
          y2={0}
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
        />
        <line
          x1={-18}
          y1={0}
          x2={-8}
          y2={0}
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          strokeOpacity={0.75}
        />
        <line
          x1={-32}
          y1={0}
          x2={-26}
          y2={0}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeOpacity={0.45}
        />
      </g>
    </g>
  );
}

export default Tracer;
