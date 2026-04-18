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

import React from "react";

import type { IUnitToken } from "@/types/gameplay";

import { HEX_SIZE, HEX_COLORS } from "@/constants/hexMap";
import { GameSide } from "@/types/gameplay";
import {
  hex6ToRotationDeg,
  velocityVectorEndpoint,
} from "@/lib/gameplay/facingRules";

import type { ITokenSharedProps } from "./tokenTypes";

const RING_R = HEX_SIZE * 0.7;
// Pixels added per velocity unit for the vector arrow.
const PX_PER_VELOCITY = 4;

export interface AerospaceTokenProps extends ITokenSharedProps {
  token: IUnitToken;
}

export const AerospaceToken = React.memo(function AerospaceToken({
  token,
  eventState,
}: AerospaceTokenProps): React.ReactElement {
  const isDestroyed = token.isDestroyed || eventState.destroyed;

  // altitude defaults to 1 (airborne) when not yet wired from combat behavior.
  // TODO: remove default when add-aerospace-combat-behavior wires altitude field.
  const altitude = token.altitude ?? 1;
  const velocity = token.velocity ?? 0;
  const isLanded = altitude === 0;

  let bodyColor =
    token.side === GameSide.Player
      ? HEX_COLORS.playerToken
      : HEX_COLORS.opponentToken;
  if (isDestroyed) {
    bodyColor = HEX_COLORS.destroyedToken;
  } else if (isLanded) {
    // Desaturate slightly for landed state.
    bodyColor = token.side === GameSide.Player ? "#93c5fd" : "#fca5a5";
  }

  const ringColor = token.isSelected
    ? "#fbbf24"
    : token.isValidTarget
      ? "#f87171"
      : "transparent";

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
          stroke="#1e293b"
          strokeWidth={2}
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
          fill={isLanded ? "#475569" : "#1e293b"}
          opacity={0.85}
        />
        <text
          textAnchor="middle"
          fontSize={8}
          fontWeight="bold"
          fill={isLanded ? "#94a3b8" : "#fbbf24"}
          dy={2}
          data-testid="altitude-badge"
        >
          {isLanded ? "GND" : String(altitude)}
        </text>
      </g>

      {/* Designation label */}
      <text
        y={HEX_SIZE * 0.55}
        textAnchor="middle"
        fontSize={8}
        fill="#1e293b"
        style={{ pointerEvents: "none" }}
      >
        {token.designation}
      </text>

      {/* Destroyed cross overlay */}
      {isDestroyed && (
        <g
          stroke="#dc2626"
          strokeWidth={3}
          data-testid="unit-destroyed-overlay"
          pointerEvents="none"
          aria-hidden="true"
        >
          <line x1={-12} y1={-12} x2={12} y2={12} />
          <line x1={12} y1={-12} x2={-12} y2={12} />
        </g>
      )}
    </>
  );
});
