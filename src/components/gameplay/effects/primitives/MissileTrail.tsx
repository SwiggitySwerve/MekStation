import React from 'react';

import {
  attackAnimationStyle,
  lineGeometry,
  ReducedMotionLine,
  stableSvgId,
  type LineEffectProps,
  useEffectiveReducedMotion,
} from './shared';

export function MissileTrail({
  start,
  end,
  color,
  opacity = 1,
  durationMs = 600,
  delayMs = 0,
  projectileIndex = 0,
  projectileCount = 1,
  staggerMs = 30,
  testId = 'attack-effect-missile',
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
  const markerId = stableSvgId(`${testId}-arrow-${projectileIndex}`);
  return (
    <g
      pointerEvents="none"
      opacity={opacity}
      data-testid={testId}
      data-effect="missile"
      data-color={color}
      data-duration-ms={durationMs}
      data-delay-ms={delay}
      data-projectile-index={projectileIndex}
      data-projectile-count={projectileCount}
      data-stagger-ms={staggerMs}
    >
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 12 12"
          refX={10}
          refY={6}
          markerWidth={7}
          markerHeight={7}
          orient="auto"
        >
          <path d="M0,0 L12,6 L0,12 L3,6 Z" fill={color} />
        </marker>
      </defs>
      <g transform={geometry.transform}>
        <g
          style={attackAnimationStyle(
            'attack-effect-missile',
            durationMs,
            delay,
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
            strokeDasharray="8 7"
            markerEnd={`url(#${markerId})`}
          />
        </g>
      </g>
    </g>
  );
}

export default MissileTrail;
