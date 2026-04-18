/**
 * BattleArmorToken — renders a BA point on the hex map.
 *
 * Two render modes:
 *   1. Standalone token: cluster of N dots (1–6) representing surviving troopers.
 *      The squad-leader dot (index 0) is slightly larger.
 *   2. Mounted badge: when `token.mountedOn` is set, this component renders a
 *      compact overlay badge intended to be placed on the host mech token.
 *      The parent (UnitTokenForType) is responsible for positioning the badge
 *      relative to the host mech's pixel centre.
 *
 * Indicators:
 *   - Jump / UMU active: blue glow ring around the token
 *   - Destroyed: cross overlay
 *
 * @spec openspec/changes/add-per-type-hex-tokens/specs/tactical-map-interface/spec.md
 *        §Per-Type Token Rendering — BattleArmor mounted renders as badge
 *        §Selection + Range Scaling — BA selection ring scales down
 */

import React from "react";

import type { IUnitToken } from "@/types/gameplay";

import { HEX_SIZE, HEX_COLORS } from "@/constants/hexMap";
import { GameSide } from "@/types/gameplay";

import type { ITokenSharedProps } from "./tokenTypes";

// BA tokens are deliberately smaller than mech tokens.
export const BA_TOKEN_RADIUS = HEX_SIZE * 0.35;
export const BA_RING_RADIUS = HEX_SIZE * 0.45;

// Dot layout constants for the trooper-pip cluster.
const DOT_LEADER_R = 5;
const DOT_TROOPER_R = 3.5;
const DOT_SPACING = 8;

/**
 * Pre-computed (x,y) offsets for up to 6 troopers arranged in two rows.
 *   Row 1 (leader + 2): y = -DOT_SPACING/2
 *   Row 2 (3): y = +DOT_SPACING/2
 */
function trooperPositions(count: number): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  // Top row: up to 3 dots centred horizontally.
  const topCount = Math.min(count, 3);
  const topOffset = ((topCount - 1) * DOT_SPACING) / 2;
  for (let i = 0; i < topCount; i++) {
    positions.push({ x: i * DOT_SPACING - topOffset, y: -DOT_SPACING / 2 });
  }
  // Bottom row: remaining dots.
  const bottomCount = count - topCount;
  const botOffset = ((bottomCount - 1) * DOT_SPACING) / 2;
  for (let i = 0; i < bottomCount; i++) {
    positions.push({ x: i * DOT_SPACING - botOffset, y: DOT_SPACING / 2 });
  }
  return positions;
}

export interface BattleArmorTokenProps extends ITokenSharedProps {
  token: IUnitToken;
  /** When true the component renders the compact mounted-badge variant. */
  mountedBadge?: boolean;
}

export const BattleArmorToken = React.memo(function BattleArmorToken({
  token,
  eventState,
  mountedBadge = false,
}: BattleArmorTokenProps): React.ReactElement {
  const isDestroyed = token.isDestroyed || eventState.destroyed;
  // Default to 4 troopers (minimum BA squad) when field not yet wired.
  // TODO: remove default when add-battlearmor-combat-behavior wires trooperCount.
  const count = Math.max(1, Math.min(6, token.trooperCount ?? 4));
  const positions = trooperPositions(count);

  const dotColor =
    token.side === GameSide.Player
      ? HEX_COLORS.playerToken
      : HEX_COLORS.opponentToken;
  const ringColor = token.isSelected
    ? "#fbbf24"
    : token.isValidTarget
      ? "#f87171"
      : "transparent";

  if (mountedBadge) {
    // Compact badge variant — small rounded rect with trooper count.
    return (
      <g data-testid={`ba-badge-${token.unitId}`}>
        <rect
          x={-12}
          y={-8}
          width={24}
          height={16}
          rx={4}
          fill={isDestroyed ? HEX_COLORS.destroyedToken : dotColor}
          stroke="#1e293b"
          strokeWidth={1.5}
        />
        <text
          textAnchor="middle"
          fontSize={8}
          fontWeight="bold"
          fill="white"
          dy={3}
        >
          BA×{count}
        </text>
      </g>
    );
  }

  return (
    <>
      {/* Selection ring — smaller radius than mech ring (spec §Selection Scaling) */}
      <circle
        r={BA_RING_RADIUS}
        fill="none"
        stroke={ringColor}
        strokeWidth={2.5}
      />

      {/* Jump/UMU active glow — blue ring outside the selection ring */}
      {token.jumpActive && (
        <circle
          r={BA_RING_RADIUS + 4}
          fill="none"
          stroke="#38bdf8"
          strokeWidth={2}
          opacity={0.7}
          data-testid="ba-jump-active"
        />
      )}

      {/* Background circle to anchor the pip cluster */}
      <circle
        r={BA_TOKEN_RADIUS}
        fill={isDestroyed ? HEX_COLORS.destroyedToken : "#1e293b"}
        stroke={dotColor}
        strokeWidth={2}
      />

      {/* Trooper pips */}
      {positions.map((pos, idx) => (
        <circle
          key={idx}
          cx={pos.x}
          cy={pos.y}
          // Squad leader (index 0) is slightly larger.
          r={idx === 0 ? DOT_LEADER_R : DOT_TROOPER_R}
          fill={isDestroyed ? "#6b7280" : dotColor}
          stroke="white"
          strokeWidth={0.8}
        />
      ))}

      {/* Designation label */}
      <text
        y={BA_TOKEN_RADIUS + 10}
        textAnchor="middle"
        fontSize={7}
        fill="#1e293b"
        style={{ pointerEvents: "none" }}
      >
        {token.designation}
      </text>

      {/* Destroyed cross overlay */}
      {isDestroyed && (
        <g
          stroke="#dc2626"
          strokeWidth={2.5}
          data-testid="unit-destroyed-overlay"
          pointerEvents="none"
          aria-hidden="true"
        >
          <line x1={-10} y1={-10} x2={10} y2={10} />
          <line x1={10} y1={-10} x2={-10} y2={10} />
        </g>
      )}
    </>
  );
});
