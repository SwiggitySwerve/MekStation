import React from 'react';

import type { IsometricVisibilityRule } from './UnitTokenForType.effects';

import { renderIsometricVisibilityRuleBadge } from './UnitTokenForType.effects';

/** Radius of the spotter-ring overlay drawn around units currently elected
 *  as LOS spotters for indirect fire. Tuned to fit just outside the typical
 *  token chrome at the standard `HEX_SIZE = 25` rendering scale. */
const HEX_SPOTTER_RING_RADIUS = 22;

export function TokenOverlayBadges({
  unitId,
  isOcclusionHighlighted,
  isometricOcclusionReason,
  isometricVisibilityRule,
  isometricVisibilityRuleReason,
  isSpotter,
}: {
  readonly unitId: string;
  readonly isOcclusionHighlighted: boolean;
  readonly isometricOcclusionReason: string | undefined;
  readonly isometricVisibilityRule: IsometricVisibilityRule | undefined;
  readonly isometricVisibilityRuleReason: string | undefined;
  readonly isSpotter: boolean;
}): React.ReactElement {
  return (
    <>
      {isOcclusionHighlighted && (
        <circle
          cx={0}
          cy={0}
          r={30}
          fill="#f8fafc"
          fillOpacity={0.18}
          stroke="#38bdf8"
          strokeWidth={3}
          strokeDasharray="5 3"
          pointerEvents="none"
          data-testid={`isometric-visibility-halo-${unitId}`}
        />
      )}
      {isometricOcclusionReason && (
        <g
          pointerEvents="none"
          data-testid={`isometric-visibility-reason-${unitId}`}
          data-isometric-occlusion-reason={isometricOcclusionReason}
        >
          <rect
            x={-18}
            y={-43}
            width={36}
            height={14}
            rx={3}
            fill="#0f172a"
            fillOpacity={0.9}
            stroke="#38bdf8"
            strokeWidth={1}
          />
          <text
            x={0}
            y={-33}
            textAnchor="middle"
            fontSize={8}
            fontWeight="bold"
            fill="#f8fafc"
          >
            ELEV
          </text>
        </g>
      )}
      {renderIsometricVisibilityRuleBadge(
        unitId,
        isometricVisibilityRule,
        isometricVisibilityRuleReason,
      )}
      {isSpotter && (
        <circle
          cx={0}
          cy={0}
          r={HEX_SPOTTER_RING_RADIUS}
          fill="none"
          stroke="#facc15"
          strokeWidth={2.5}
          strokeDasharray="4 3"
          opacity={0.85}
          pointerEvents="none"
          data-testid={`spotter-ring-${unitId}`}
        >
          <animate
            attributeName="opacity"
            values="0.85;0.45;0.85"
            dur="1.6s"
            repeatCount="indefinite"
          />
        </circle>
      )}
    </>
  );
}
