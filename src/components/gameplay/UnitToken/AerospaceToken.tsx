/**
 * AerospaceToken — renders an aerospace fighter on the hex map.
 *
 * Shape: triangular / wedge silhouette oriented along current heading.
 * Indicators:
 *   - Velocity vector arrow: length proportional to velocity, oriented along heading
 *   - Altitude badge: "ALT:N" in a stable corner of the token
 *   - Landed visual distinction: velocity vector omitted, token desaturated
 *
 * @spec openspec/changes/add-per-type-hex-tokens/specs/tactical-map-interface/spec.md
 *        §Per-Type Token Rendering — Aerospace renders aerospace token
 *        §Per-Type Facing Rules — Aerospace uses velocity vector
 *        §Aerospace Velocity + Altitude Indicators
 */

import React from 'react';

import type { IAerospaceToken } from '@/types/gameplay';

import { HEX_SIZE } from '@/constants/hexMap';
import {
  hex6ToRotationDeg,
  velocityVectorEndpoint,
} from '@/lib/gameplay/facingRules';

import type { ITokenSharedProps } from './tokenTypes';

import {
  DestroyedCrossOverlay,
  TOKEN_BODY_OUTLINE_COLOR,
  TOKEN_BODY_STROKE_WIDTH,
  TokenDesignationLabel,
  landedAerospaceBodyColor,
  selectionTargetRingColor,
  tokenSideBodyColor,
} from './tokenVisuals';

const RING_R = HEX_SIZE * 0.7;
// Pixels added per velocity unit for the vector arrow.
const PX_PER_VELOCITY = 4;

export interface AerospaceTokenProps extends ITokenSharedProps {
  token: IAerospaceToken;
}

export const AerospaceToken = React.memo(function AerospaceToken({
  token,
  eventState,
}: AerospaceTokenProps): React.ReactElement {
  const isDestroyed = token.isDestroyed || eventState.destroyed;

  // altitude is wired from IAerospaceCombatState.altitude via the
  // unitStateToToken adapter (per `wire-combat-behavior-dispatch`,
  // Council #1 PR7).
  const altitude = token.altitude;
  // Hand-authored fixtures may still omit velocity; engine-backed tokens
  // receive this from IAerospaceCombatState.currentVelocity.
  const velocity = token.velocity ?? 0;
  const isLanded = altitude === 0;

  let bodyColor = tokenSideBodyColor(token.side, isDestroyed);
  if (!isDestroyed && isLanded) {
    // Desaturate slightly for landed state.
    bodyColor = landedAerospaceBodyColor(token.side);
  }

  const ringColor = selectionTargetRingColor(token);

  // Heading from 6-hex Facing → degrees for the wedge rotation.
  const headingDeg = hex6ToRotationDeg(token.facing);

  // Velocity vector endpoint (relative to token centre).
  const vecEnd = velocityVectorEndpoint(headingDeg, velocity, PX_PER_VELOCITY);

  return (
    <>
      {/* Selection / target ring */}
      <circle r={RING_R} fill="none" stroke={ringColor} strokeWidth={3} />

      {/* Wedge silhouette rotated to heading */}
      <g transform={`rotate(${headingDeg})`}>
        {/* Main delta-wing body */}
        <polygon
          points="0,-22 14,10 0,4 -14,10"
          fill={bodyColor}
          stroke={TOKEN_BODY_OUTLINE_COLOR}
          strokeWidth={TOKEN_BODY_STROKE_WIDTH}
        />
        {/* Canopy dot */}
        <circle cx={0} cy={-10} r={3} fill="white" opacity={0.8} />
      </g>

      {/* Velocity vector arrow — omitted when landed */}
      {!isLanded && velocity > 0 && (
        <line
          x1={0}
          y1={0}
          x2={vecEnd.x}
          y2={vecEnd.y}
          stroke="#facc15"
          strokeWidth={2}
          strokeLinecap="round"
          markerEnd="url(#vel-arrowhead)"
          data-testid="velocity-vector"
        />
      )}

      {/* Altitude badge — top-right corner, stable regardless of token rotation */}
      <g transform={`translate(${HEX_SIZE * 0.35}, ${-HEX_SIZE * 0.5})`}>
        <rect
          x={-14}
          y={-9}
          width={28}
          height={14}
          rx={3}
          fill={isLanded ? '#475569' : '#1e293b'}
          opacity={0.85}
        />
        <text
          textAnchor="middle"
          fontSize={8}
          fontWeight="bold"
          fill={isLanded ? '#94a3b8' : '#fbbf24'}
          dy={2}
          data-testid="altitude-badge"
        >
          {isLanded ? 'GND' : String(altitude)}
        </text>
      </g>

      {/* Designation label */}
      <TokenDesignationLabel y={HEX_SIZE * 0.55} fontSize={8}>
        {token.designation}
      </TokenDesignationLabel>

      {/* Destroyed cross overlay */}
      {isDestroyed && <DestroyedCrossOverlay xRadius={12} strokeWidth={3} />}
    </>
  );
});
