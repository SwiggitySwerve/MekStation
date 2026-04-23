/**
 * MechToken — renders a BattleMech on the hex map.
 *
 * Extracted from the original `UnitToken.tsx` (Phase 1) with a clean props
 * interface. Visual behavior is unchanged: circular body, 6-hex facing arrow,
 * selection / target ring, destroyed overlay, and damage-feedback overlays.
 *
 * @spec openspec/changes/add-per-type-hex-tokens/specs/tactical-map-interface/spec.md
 *        §Per-Type Token Rendering — Mech unit renders mech token
 */

import React from 'react';

import type { IUnitToken } from '@/types/gameplay';

import { CritHitOverlay } from '@/components/gameplay/CritHitOverlay';
import { DamageFloater } from '@/components/gameplay/DamageFloater';
import { getFacingRotation } from '@/components/gameplay/HexMapDisplay/renderHelpers';
import { PilotWoundFlash } from '@/components/gameplay/PilotWoundFlash';
import { HEX_SIZE, HEX_COLORS } from '@/constants/hexMap';
import { GameSide } from '@/types/gameplay';

import type { ITokenSharedProps } from './tokenTypes';

// Token radius constants — exported so UnitTokenForType can scale the selection ring.
export const MECH_TOKEN_RADIUS = HEX_SIZE * 0.5;
export const MECH_RING_RADIUS = HEX_SIZE * 0.7;

export interface MechTokenProps extends ITokenSharedProps {
  token: IUnitToken;
}

/**
 * Pure SVG mech token. Rendered inside a `<g transform="translate(x,y)">` by
 * the parent — this component only outputs the token-local SVG children.
 * The `<g>` wrapper with click handler is provided by the parent so the
 * overlay pipeline (CritHit, Pilot, Damage) composees cleanly.
 */
export const MechToken = React.memo(function MechToken({
  token,
  eventState,
}: MechTokenProps): React.ReactElement {
  const rotation = getFacingRotation(token.facing);
  const isDestroyed = token.isDestroyed || eventState.destroyed;

  let color =
    token.side === GameSide.Player
      ? HEX_COLORS.playerToken
      : HEX_COLORS.opponentToken;
  if (isDestroyed) {
    color = HEX_COLORS.destroyedToken;
  }

  // Active target takes precedence over generic valid-target tone; the
  // selection (yellow) ring still wins for the controlled attacker.
  const ringColor = token.isSelected
    ? '#fbbf24'
    : token.isActiveTarget
      ? '#dc2626'
      : token.isValidTarget
        ? '#f87171'
        : 'transparent';

  return (
    <>
      {/* Selection / target ring — radius scales with token size */}
      <circle
        r={MECH_RING_RADIUS}
        fill="none"
        stroke={ringColor}
        strokeWidth={3}
      />

      {/* Pulsing ring overlay — only painted when this unit is the
          attacker's active target (spec: tactical-map-interface §Target
          Lock Visualization). Uses SVG <animate> so the effect works
          inside static SVG snapshots / JSDOM tests. */}
      {token.isActiveTarget && !isDestroyed && (
        <circle
          data-testid="unit-active-target-pulse"
          r={MECH_RING_RADIUS + 2}
          fill="none"
          stroke="#dc2626"
          strokeWidth={3}
          pointerEvents="none"
          aria-hidden="true"
        >
          <animate
            attributeName="stroke-opacity"
            values="1;0.25;1"
            dur="1.1s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="r"
            values={`${MECH_RING_RADIUS + 2};${MECH_RING_RADIUS + 5};${MECH_RING_RADIUS + 2}`}
            dur="1.1s"
            repeatCount="indefinite"
          />
        </circle>
      )}

      {/* Circular mech body */}
      <circle
        r={MECH_TOKEN_RADIUS}
        fill={color}
        stroke="#1e293b"
        strokeWidth={2}
      />

      {/* 6-hex facing arrow — rotated to the current Facing value */}
      <g transform={`rotate(${rotation - 90})`}>
        <path
          d="M0,-20 L8,-8 L0,-12 L-8,-8 Z"
          fill="white"
          stroke="#1e293b"
          strokeWidth={1}
        />
      </g>

      {/* Designation label */}
      <text
        y={4}
        textAnchor="middle"
        fontSize={10}
        fontWeight="bold"
        fill="white"
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

      {/* Damage feedback overlays (pointer-events:none — never intercept clicks) */}
      <PilotWoundFlash
        hitCount={eventState.pilotHitCount}
        unconscious={eventState.unconscious}
        killed={eventState.killed}
        tokenRadius={MECH_TOKEN_RADIUS}
      />
      <CritHitOverlay
        critCount={eventState.critCount}
        radius={MECH_RING_RADIUS}
      />
      <DamageFloater entries={eventState.damageEntries} />
    </>
  );
});
