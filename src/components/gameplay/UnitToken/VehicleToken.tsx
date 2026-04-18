/**
 * VehicleToken — renders a ground/VTOL vehicle on the hex map.
 *
 * Shape: rectangular base (wider than tall, like a tank silhouette).
 * Indicators:
 *   - Motion-type icon overlay (Tracked / Wheeled / Hover / VTOL / Naval / WiGE)
 *   - Cardinal-direction facing arrow (8 directions)
 *   - Optional turret arrow (rotated separately from body facing)
 *   - Destroyed state: cross overlay on a grey body
 *
 * @spec openspec/changes/add-per-type-hex-tokens/specs/tactical-map-interface/spec.md
 *        §Per-Type Token Rendering — Vehicle renders vehicle token
 *        §Per-Type Facing Rules — Vehicle uses 8-direction facing
 */

import React from "react";

import type { IUnitToken } from "@/types/gameplay";

import { HEX_SIZE, HEX_COLORS } from "@/constants/hexMap";
import { GameSide, VehicleMotionType } from "@/types/gameplay";
import { cardinal8ToRotationDeg } from "@/lib/gameplay/facingRules";

import type { ITokenSharedProps } from "./tokenTypes";

// Token geometry — rectangular body fits inside the hex.
const BODY_W = HEX_SIZE * 0.9;
const BODY_H = HEX_SIZE * 0.6;
const RING_R = HEX_SIZE * 0.65;
const TURRET_R = HEX_SIZE * 0.18;

export interface VehicleTokenProps extends ITokenSharedProps {
  token: IUnitToken;
}

/** Short text abbreviation for each motion type — shown inside the token body. */
function motionLabel(motionType: VehicleMotionType | undefined): string {
  switch (motionType) {
    case VehicleMotionType.Tracked:
      return "TK";
    case VehicleMotionType.Wheeled:
      return "WH";
    case VehicleMotionType.Hover:
      return "HV";
    case VehicleMotionType.VTOL:
      return "VT";
    case VehicleMotionType.Naval:
      return "NV";
    case VehicleMotionType.WiGE:
      return "WG";
    default:
      return "TK";
  }
}

export const VehicleToken = React.memo(function VehicleToken({
  token,
  eventState,
}: VehicleTokenProps): React.ReactElement {
  const isDestroyed = token.isDestroyed || eventState.destroyed;

  let bodyColor =
    token.side === GameSide.Player
      ? HEX_COLORS.playerToken
      : HEX_COLORS.opponentToken;
  if (isDestroyed) {
    bodyColor = HEX_COLORS.destroyedToken;
  }

  const ringColor = token.isSelected
    ? "#fbbf24"
    : token.isValidTarget
      ? "#f87171"
      : "transparent";

  // Body rotation: cardinal8 direction stored in token.facing (0-7).
  // For vehicles the facing value reuses the Facing enum slot but represents
  // one of 8 directions; cardinal8ToRotationDeg handles the conversion.
  const bodyRotation = cardinal8ToRotationDeg(token.facing);

  // Turret facing: independent rotation if the vehicle has a turret.
  const turretRotation =
    token.turretFacing !== undefined
      ? cardinal8ToRotationDeg(token.turretFacing)
      : bodyRotation;

  return (
    <>
      {/* Selection / target ring */}
      <circle r={RING_R} fill="none" stroke={ringColor} strokeWidth={3} />

      {/* Rectangular body rotated to body facing */}
      <g transform={`rotate(${bodyRotation})`}>
        <rect
          x={-BODY_W / 2}
          y={-BODY_H / 2}
          width={BODY_W}
          height={BODY_H}
          rx={4}
          fill={bodyColor}
          stroke="#1e293b"
          strokeWidth={2}
        />

        {/* 8-direction facing arrow pointing "forward" (top of rect = front) */}
        <path
          d={`M0,${-BODY_H / 2 - 6} L5,${-BODY_H / 2 + 2} L0,${-BODY_H / 2 - 1} L-5,${-BODY_H / 2 + 2} Z`}
          fill="white"
          stroke="#1e293b"
          strokeWidth={1}
        />
      </g>

      {/* Motion-type label rendered after body so it stays legible */}
      <text
        y={2}
        textAnchor="middle"
        fontSize={9}
        fontWeight="bold"
        fill="white"
        style={{ pointerEvents: "none" }}
      >
        {motionLabel(token.vehicleMotionType)}
      </text>

      {/* Designation label below the body */}
      <text
        y={BODY_H / 2 + 10}
        textAnchor="middle"
        fontSize={8}
        fill="#1e293b"
        style={{ pointerEvents: "none" }}
      >
        {token.designation}
      </text>

      {/* Turret indicator — small circle + weapon arrow, rotated independently */}
      {token.turretFacing !== undefined && (
        <g transform={`rotate(${turretRotation})`}>
          <circle
            r={TURRET_R}
            fill="#374151"
            stroke="#1e293b"
            strokeWidth={1.5}
          />
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={-(TURRET_R + 8)}
            stroke="white"
            strokeWidth={2}
            strokeLinecap="round"
          />
        </g>
      )}

      {/* Destroyed cross overlay */}
      {isDestroyed && (
        <g
          stroke="#dc2626"
          strokeWidth={3}
          data-testid="unit-destroyed-overlay"
          pointerEvents="none"
          aria-hidden="true"
        >
          <line x1={-14} y1={-10} x2={14} y2={10} />
          <line x1={14} y1={-10} x2={-14} y2={10} />
        </g>
      )}
    </>
  );
});
