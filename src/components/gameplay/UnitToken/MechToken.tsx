/**
 * MechToken — renders a BattleMech on the hex map using the Phase-7 homemade
 * silhouette sprite set.
 *
 * This file used to emit a flat coloured disc plus an arrow; the Wave-5 UI
 * polish swaps that for:
 *   - `MechSprite` — resolves the right archetype × weight silhouette,
 *     rotates it to match `token.facing`, applies side tint + selection ring
 *     + colorblind-safe shape overlay, and collapses to an archetype glyph
 *     at low zoom.
 *   - `ArmorPipRing` — draws 6 or 8 pip dots around the sprite that encode
 *     per-location armor / structure state.
 *
 * We preserve the existing Phase-1 contract: this component emits
 * token-local SVG children inside the parent `<g transform="translate(x,y)">`,
 * the outer `<g>` (provided by `UnitTokenForType`) remains the click target,
 * the selection ring lives under the sprite, the active-target pulse still
 * runs via `<animate>`, the destroyed cross renders over the top, and
 * damage-feedback overlays (CritHit, PilotWound, DamageFloater) compose in
 * the same order.
 *
 * @spec openspec/changes/add-mech-silhouette-sprite-set/specs/unit-sprite-system/spec.md
 *        §Side Tint and Selection Ring
 *        §Armor Pip Damage Overlay
 *        §Sprite Scaling
 * @spec openspec/changes/add-mech-silhouette-sprite-set/specs/tactical-map-interface/spec.md
 *        §Mech silhouette replaces flat disc marker
 */

import React from 'react';

import type { IMechToken } from '@/types/gameplay';

import { CritHitOverlay } from '@/components/gameplay/CritHitOverlay';
import { DamageFloater } from '@/components/gameplay/DamageFloater';
import { PilotWoundFlash } from '@/components/gameplay/PilotWoundFlash';
import { ArmorPipRing } from '@/components/gameplay/sprites/ArmorPipRing';
import { MechSprite } from '@/components/gameplay/sprites/MechSprite';
import { HEX_SIZE } from '@/constants/hexMap';

import type { ITokenSharedProps } from './tokenTypes';

import { DestroyedCrossOverlay } from './tokenVisuals';

// =============================================================================
// Token radius constants — re-exported so callers (dispatcher, tests) can
// place effects relative to the token body without re-deriving the math.
// =============================================================================

/**
 * Approximate body radius for overlay placement. The new sprite is 80% of
 * hex diameter (= HEX_SIZE * 0.8); keeping the same constant name lets
 * existing consumers (CritHitOverlay, PilotWoundFlash) place their effects
 * without code changes.
 */
export const MECH_TOKEN_RADIUS = HEX_SIZE * 0.5;

/**
 * Outer ring radius for selection / active-target highlights. Matches the
 * previous Phase-1 value so the active-target pulse in this file and the
 * selection halo in `MechSprite` sit at visually compatible radii.
 */
export const MECH_RING_RADIUS = HEX_SIZE * 0.7;

export interface MechTokenProps extends ITokenSharedProps {
  token: IMechToken;
  /**
   * Current map zoom factor (1.0 = 100%). Forwarded to the sprite + pip
   * ring so they can collapse at low zoom. Defaults to 1 so callers that
   * don't pipe zoom through continue to get the full-fidelity render.
   */
  zoom?: number;
}

/**
 * Pure SVG mech token. Renders inside a parent `<g transform="translate"/>`.
 */
export const MechToken = React.memo(function MechToken({
  token,
  eventState,
  zoom = 1,
}: MechTokenProps): React.ReactElement {
  const isDestroyed = token.isDestroyed || eventState.destroyed;

  return (
    <>
      {/* Active-target pulsing ring — painted BEHIND the sprite so the
          silhouette reads on top. Uses SVG <animate> so the effect renders
          inside static snapshots / JSDOM. */}
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

      {/* Secondary-target encoding (attack-phase-intent-composer, D6):
          a DASHED amber ring — distinct from the primary's solid pulsing
          red ring by dash pattern, not hue alone (non-color-redundant per
          the MODIFIED Target Lock Visualization scenarios). */}
      {token.isSecondaryTarget && !token.isActiveTarget && !isDestroyed && (
        <circle
          data-testid="unit-secondary-target-ring"
          r={MECH_RING_RADIUS + 2}
          fill="none"
          stroke="#fbbf24"
          strokeWidth={3}
          strokeDasharray="6 4"
          pointerEvents="none"
          aria-hidden="true"
        />
      )}

      {/* At-source infeasibility encoding (Attack Intent Map Interaction):
          while composing, an enemy no weapon can engage carries a blocked
          glyph + dotted gray ring; the rules-backed reason is available on
          inspection via <title>. Glyph + dash pattern keep the encoding
          non-color-redundant. */}
      {token.attackInfeasibleReason && !isDestroyed && (
        <g data-testid="unit-attack-infeasible" pointerEvents="none">
          <title>{token.attackInfeasibleReason}</title>
          <circle
            r={MECH_RING_RADIUS}
            fill="none"
            stroke="#94a3b8"
            strokeWidth={2}
            strokeDasharray="2 4"
            aria-hidden="true"
          />
          <text
            x={MECH_RING_RADIUS - 2}
            y={-MECH_RING_RADIUS + 6}
            textAnchor="middle"
            fontSize={12}
            fill="#cbd5e1"
            stroke="#0f172a"
            strokeWidth={0.5}
            paintOrder="stroke fill"
            aria-hidden="true"
          >
            {'⊘'}
          </text>
        </g>
      )}

      {/* Valid-target halo (static — red) stays a flat ring. The selection
          ring (yellow) is emitted by `MechSprite` itself when isSelected. */}
      {token.isValidTarget && !token.isSelected && !token.isActiveTarget && (
        <circle
          data-testid="unit-valid-target-ring"
          r={MECH_RING_RADIUS}
          fill="none"
          stroke="#f87171"
          strokeWidth={3}
          pointerEvents="none"
          aria-hidden="true"
        />
      )}

      {/* Armor pip ring — painted under the sprite so the silhouette sits
          above the dots at the ring radius. Passes through zoom so the
          ring simplifies / disappears at low zoom per spec. */}
      <ArmorPipRing
        state={token.armorPipState}
        zoom={zoom}
        patternKey={token.unitId}
      />

      {/* Main silhouette (+ selection ring + colorblind shape overlay). */}
      <MechSprite token={token} zoom={zoom} isSelected={token.isSelected} />

      {/* Designation label — sits just below the sprite. Font size floors
          at 10px per spec scenario "text labels scale with zoom but never
          below 10px"; we compute once at the current zoom and clamp. */}
      <text
        y={MECH_TOKEN_RADIUS + 14}
        textAnchor="middle"
        fontSize={Math.max(10, 10 * Math.min(1.4, Math.max(zoom, 0.5)))}
        fontWeight="bold"
        fill="#f8fafc"
        stroke="#0f172a"
        strokeWidth={0.6}
        paintOrder="stroke fill"
        pointerEvents="none"
      >
        {token.designation}
      </text>

      {/* Destroyed cross overlay */}
      {isDestroyed && <DestroyedCrossOverlay xRadius={12} strokeWidth={3} />}

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
