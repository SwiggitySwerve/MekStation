import React, { useMemo } from 'react';

import type {
  ICriticalHitResolvedPayload,
  IDamageAppliedPayload,
  IGameEvent,
  IPilotHitPayload,
  IUnitDestroyedPayload,
  IUnitToken,
} from '@/types/gameplay';

import { CritHitOverlay } from '@/components/gameplay/CritHitOverlay';
import {
  DamageFloater,
  type DamageFloaterEntry,
} from '@/components/gameplay/DamageFloater';
import { PilotWoundFlash } from '@/components/gameplay/PilotWoundFlash';
import { HEX_SIZE, HEX_COLORS } from '@/constants/hexMap';
import { GameEventType, GameSide } from '@/types/gameplay';

import { hexToPixel, getFacingRotation } from './renderHelpers';

export interface UnitTokenComponentProps {
  token: IUnitToken;
  onClick: () => void;
  /**
   * Optional: full game-event history. UnitTokenComponent filters
   * down to events targeting this unit and feeds the overlays.
   * Caller (HexMapDisplay) passes the full list once; the token
   * component does the per-unit projection so subscriptions tear
   * down automatically when the token unmounts.
   *
   * Per `add-damage-feedback-ui` task 1.2: map subscribes to
   * DamageApplied / CriticalHitResolved / PilotHit / UnitDestroyed
   * for any unit with a token.
   */
  events?: readonly IGameEvent[];
}

/**
 * Per-unit projection of relevant events. Used by the overlay
 * children (CritHitOverlay, PilotWoundFlash, DamageFloater) to know
 * what to animate. Pure projection — derived from `events` via
 * `useMemo` so it only re-computes when the event list changes.
 */
interface UnitEventState {
  readonly critCount: number;
  readonly pilotHitCount: number;
  readonly unconscious: boolean;
  readonly killed: boolean;
  readonly destroyed: boolean;
  readonly damageEntries: readonly DamageFloaterEntry[];
}

const EMPTY_STATE: UnitEventState = {
  critCount: 0,
  pilotHitCount: 0,
  unconscious: false,
  killed: false,
  destroyed: false,
  damageEntries: [],
};

/**
 * Project the full event log down to the per-unit visual state. Pure
 * function — easy to unit-test and easy for `useMemo` to dedupe.
 */
function projectEvents(
  unitId: string,
  events: readonly IGameEvent[] | undefined,
): UnitEventState {
  if (!events || events.length === 0) {
    return EMPTY_STATE;
  }
  let critCount = 0;
  let pilotHitCount = 0;
  let unconscious = false;
  let killed = false;
  let destroyed = false;
  const damageEntries: DamageFloaterEntry[] = [];

  for (const event of events) {
    switch (event.type) {
      case GameEventType.DamageApplied: {
        const payload = event.payload as IDamageAppliedPayload;
        if (payload.unitId !== unitId) break;
        // If armor is gone post-hit but structure remains, the hit
        // bled into structure → variant 'structure'. If both armor
        // and structure are gone (location destroyed), still mark as
        // structure so the floater reads as catastrophic.
        const variant: DamageFloaterEntry['variant'] =
          payload.armorRemaining === 0 ? 'structure' : 'armor';
        damageEntries.push({
          id: event.id,
          amount: payload.damage,
          variant,
        });
        break;
      }
      case GameEventType.CriticalHitResolved: {
        const payload = event.payload as ICriticalHitResolvedPayload;
        if (payload.unitId !== unitId) break;
        critCount += 1;
        break;
      }
      case GameEventType.PilotHit: {
        const payload = event.payload as IPilotHitPayload;
        if (payload.unitId !== unitId) break;
        pilotHitCount += 1;
        // 6+ wounds → dead per BattleTech canon.
        if (payload.totalWounds >= 6) {
          killed = true;
        } else if (payload.consciousnessCheckPassed === false) {
          unconscious = true;
        }
        break;
      }
      case GameEventType.UnitDestroyed: {
        const payload = event.payload as IUnitDestroyedPayload;
        if (payload.unitId !== unitId) break;
        destroyed = true;
        break;
      }
      default:
        // Other event types are ignored at the token-overlay layer.
        break;
    }
  }

  return {
    critCount,
    pilotHitCount,
    unconscious,
    killed,
    destroyed,
    damageEntries,
  };
}

export const UnitTokenComponent = React.memo(function UnitTokenComponent({
  token,
  onClick,
  events,
}: UnitTokenComponentProps): React.ReactElement {
  const { x, y } = hexToPixel(token.position);
  const rotation = getFacingRotation(token.facing);

  const eventState = useMemo(
    () => projectEvents(token.unitId, events),
    [token.unitId, events],
  );

  // Token is destroyed if either the IUnitToken says so OR a
  // UnitDestroyed event is in the projection. Either signal renders
  // the big ✕ overlay.
  const isDestroyed = token.isDestroyed || eventState.destroyed;

  let color =
    token.side === GameSide.Player
      ? HEX_COLORS.playerToken
      : HEX_COLORS.opponentToken;
  if (isDestroyed) {
    color = HEX_COLORS.destroyedToken;
  }

  const ringColor = token.isSelected
    ? '#fbbf24'
    : token.isValidTarget
      ? '#f87171'
      : 'transparent';

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{ cursor: 'pointer' }}
      data-testid={`unit-token-${token.unitId}`}
    >
      {/* Selection/target ring */}
      <circle
        r={HEX_SIZE * 0.7}
        fill="none"
        stroke={ringColor}
        strokeWidth={3}
      />

      {/* Token body */}
      <circle
        r={HEX_SIZE * 0.5}
        fill={color}
        stroke="#1e293b"
        strokeWidth={2}
      />

      {/* Facing indicator (arrow) */}
      <g transform={`rotate(${rotation - 90})`}>
        <path
          d="M0,-20 L8,-8 L0,-12 L-8,-8 Z"
          fill="white"
          stroke="#1e293b"
          strokeWidth={1}
        />
      </g>

      <text
        y={4}
        textAnchor="middle"
        fontSize={10}
        fontWeight="bold"
        fill="white"
      >
        {token.designation}
      </text>

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

      {/* Damage feedback overlays. Order: pilot wound (under), crit
          burst (middle), damage floater (top) so numbers stay
          readable above the ring/glyph layers. All overlays are
          `pointer-events: none` and `aria-hidden` so they never
          intercept clicks or pollute the accessibility tree. */}
      <PilotWoundFlash
        hitCount={eventState.pilotHitCount}
        unconscious={eventState.unconscious}
        killed={eventState.killed}
        tokenRadius={HEX_SIZE * 0.5}
      />
      <CritHitOverlay
        critCount={eventState.critCount}
        radius={HEX_SIZE * 0.7}
      />
      <DamageFloater entries={eventState.damageEntries} />
    </g>
  );
});
