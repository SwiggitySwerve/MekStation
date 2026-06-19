/**
 * ProtoMechToken — renders a ProtoMech point on the hex map.
 *
 * Shape: compact bipedal silhouette (smaller than a mech).
 * A point contains up to 5 ProtoMechs; surviving units are shown as a tight
 * cluster within the single hex token using a point-of-5 arrangement.
 *
 * Indicators:
 *   - Glider mode: extended triangular wing overlays replace the standard body
 *   - Main gun: small weapon-circle symbol overlay
 *   - 6-hex facing arrow (ProtoMechs use the same facing rules as mechs)
 *
 * @spec openspec/changes/add-per-type-hex-tokens/specs/tactical-map-interface/spec.md
 *        §Per-Type Token Rendering — ProtoMech point clusters in one hex
 */

import React from 'react';

import type { IProtoMechToken } from '@/types/gameplay';

import { HEX_SIZE } from '@/constants/hexMap';
import { hex6ToRotationDeg } from '@/lib/gameplay/facingRules';

import type { ITokenSharedProps } from './tokenTypes';

import {
  DestroyedCrossOverlay,
  TOKEN_BODY_STROKE_WIDTH,
  TokenDesignationLabel,
  selectionTargetRingColor,
  tokenSideBodyColor,
} from './tokenVisuals';

export const PROTO_TOKEN_RADIUS = HEX_SIZE * 0.38;
export const PROTO_RING_RADIUS = HEX_SIZE * 0.5;

// Radius of each individual proto silhouette pip.
const PIP_R = 5.5;

/**
 * Point-of-5 layout: positions for up to 5 proto pips arranged in a
 * dice-5 / "+" pattern centred at (0,0).
 *
 *   [TL] [TR]
 *      [C]
 *   [BL] [BR]
 */
const POINT_POSITIONS: ReadonlyArray<{ x: number; y: number }> = [
  { x: 0, y: 0 }, // centre (always present)
  { x: -9, y: -8 }, // top-left
  { x: 9, y: -8 }, // top-right
  { x: -9, y: 8 }, // bottom-left
  { x: 9, y: 8 }, // bottom-right
];

export interface ProtoMechTokenProps extends ITokenSharedProps {
  token: IProtoMechToken;
}

export const ProtoMechToken = React.memo(function ProtoMechToken({
  token,
  eventState,
}: ProtoMechTokenProps): React.ReactElement {
  const isDestroyed = token.isDestroyed || eventState.destroyed;
  // protoCount / isGlider / hasMainGun are wired from
  // IProtoMechCombatState via the unitStateToToken adapter (per
  // `wire-combat-behavior-dispatch`, Council #1 PR7).
  const protoCount = Math.max(1, Math.min(5, token.protoCount));
  const isGlider = token.isGlider;
  const hasMainGun = token.hasMainGun;

  const bodyColor = tokenSideBodyColor(token.side, isDestroyed);

  const ringColor = selectionTargetRingColor(token);

  // ProtoMechs use 6-hex facing (same as mechs).
  const headingDeg = hex6ToRotationDeg(token.facing);

  return (
    <>
      {/* Selection ring — smaller than mech ring (spec §Selection Scaling) */}
      <circle
        r={PROTO_RING_RADIUS}
        fill="none"
        stroke={ringColor}
        strokeWidth={2.5}
      />

      {/* Background circle */}
      <circle
        r={PROTO_TOKEN_RADIUS}
        fill="#0f172a"
        stroke={bodyColor}
        strokeWidth={TOKEN_BODY_STROKE_WIDTH}
      />

      {/* Glider wing overlays — extended triangles replacing normal body */}
      {isGlider && (
        <g data-testid="proto-glider-wings">
          <polygon
            points="-6,-4 -20,6 -6,6"
            fill={bodyColor}
            opacity={0.8}
            stroke="#1e293b"
            strokeWidth={1}
          />
          <polygon
            points="6,-4 20,6 6,6"
            fill={bodyColor}
            opacity={0.8}
            stroke="#1e293b"
            strokeWidth={1}
          />
        </g>
      )}

      {/* Point cluster: surviving proto pips */}
      {POINT_POSITIONS.slice(0, protoCount).map((pos, idx) => (
        <circle
          key={idx}
          cx={pos.x}
          cy={pos.y}
          r={PIP_R}
          fill={isDestroyed ? '#6b7280' : bodyColor}
          stroke="white"
          strokeWidth={0.8}
          data-testid={idx === 0 ? 'proto-pip-lead' : `proto-pip-${idx}`}
        />
      ))}

      {/* 6-hex facing arrow — same convention as MechToken */}
      <g transform={`rotate(${headingDeg - 90})`}>
        <path
          d="M0,-18 L5,-10 L0,-13 L-5,-10 Z"
          fill="white"
          stroke="#1e293b"
          strokeWidth={1}
        />
      </g>

      {/* Main gun symbol — small circle overlay at bottom-right of token */}
      {hasMainGun && (
        <g
          transform={`translate(${PROTO_TOKEN_RADIUS - 4}, ${PROTO_TOKEN_RADIUS - 4})`}
          data-testid="proto-main-gun"
        >
          <circle r={5} fill="#7c3aed" stroke="white" strokeWidth={1} />
          <text textAnchor="middle" fontSize={5} fill="white" dy={2}>
            G
          </text>
        </g>
      )}

      {/* Designation label */}
      <TokenDesignationLabel y={PROTO_RING_RADIUS + 10} fontSize={7}>
        {token.designation}
      </TokenDesignationLabel>

      {/* Destroyed cross overlay */}
      {isDestroyed && <DestroyedCrossOverlay xRadius={10} strokeWidth={2.5} />}
    </>
  );
});
