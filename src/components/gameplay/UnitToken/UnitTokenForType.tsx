/**
 * UnitTokenForType — central dispatcher for per-type hex map tokens.
 *
 * Receives a single `IUnitToken` and routes to the correct per-type renderer
 * based on `token.unitType`. Handles:
 *   - Event projection (shared across all renderers)
 *   - BattleArmor "mounted-on-mech" badge positioning
 *   - Pixel-coordinate translation from hex coords
 *   - Click handler delegation
 *
 * This is the ONLY component HexMapDisplay should import for unit tokens —
 * the per-type components are internal implementation details.
 *
 * @spec openspec/changes/add-per-type-hex-tokens/specs/tactical-map-interface/spec.md
 *        §Per-Type Token Rendering — dispatcher routes to correct renderer
 */

import React, { useCallback, useEffect, useMemo } from 'react';

import type { MovementTweenFrame } from '@/components/gameplay/animation/useMovementTween';
import type { DamageFloaterEntry } from '@/components/gameplay/DamageFloater';
import type { TacticalAnimation } from '@/stores/useAnimationQueue';
import type {
  IAmmoExplosionPayload,
  ICriticalHitResolvedPayload,
  IDamageAppliedPayload,
  IGameEvent,
  IHeatPayload,
  IPilotHitPayload,
  IShutdownCheckPayload,
  IStartupAttemptPayload,
  IUnitDestroyedPayload,
  IUnitToken,
} from '@/types/gameplay';

import { useMovementTween } from '@/components/gameplay/animation/useMovementTween';
import { AmmoExplosionAura } from '@/components/gameplay/effects/AmmoExplosionAura';
import { HeatGlow } from '@/components/gameplay/effects/HeatGlow';
import { HitLocationFlash } from '@/components/gameplay/effects/HitLocationFlash';
import { ShutdownOverlay } from '@/components/gameplay/effects/ShutdownOverlay';
import { StartupPulse } from '@/components/gameplay/effects/StartupPulse';
import { hexToPixel } from '@/components/gameplay/HexMapDisplay/renderHelpers';
import { useAnimationQueue } from '@/stores/useAnimationQueue';
import { GameEventType, MovementType, TokenUnitType } from '@/types/gameplay';
import { getHeatTransitionFromPayload } from '@/utils/effects/heatVisualMap';

import type { IUnitEventState } from './tokenTypes';

import { AerospaceToken } from './AerospaceToken';
import { BattleArmorToken } from './BattleArmorToken';
import { InfantryToken } from './InfantryToken';
import { MechToken } from './MechToken';
import { ProtoMechToken } from './ProtoMechToken';
import { EMPTY_EVENT_STATE } from './tokenTypes';
import { VehicleToken } from './VehicleToken';

// =============================================================================
// Props
// =============================================================================

export interface UnitTokenForTypeProps {
  /** The token descriptor for the unit to render. */
  token: IUnitToken;
  /** Click handler — called with the unitId of the token that was clicked. */
  onClick: (unitId: string) => void;
  /**
   * Double-click handler — per `add-minimap-and-camera-controls`
   * task 2.3, double-clicking a unit centers the camera on it and
   * selects it. The dispatcher stops propagation so the map's own
   * pan-drag doesn't also fire.
   */
  onDoubleClick?: (unitId: string) => void;
  /**
   * Full game-event history. The dispatcher projects down to per-unit state
   * and passes the result into the child renderer as `eventState`.
   */
  events?: readonly IGameEvent[];
  /** Active movement animation for this unit, supplied by HexMapDisplay. */
  movementAnimation?: TacticalAnimation;
  /**
   * All tokens on the map — used to locate the host mech when BA is mounted.
   * Only the token whose `unitId === baToken.mountedOn` is consulted.
   */
  allTokens?: readonly IUnitToken[];
}

// =============================================================================
// Event Projection (shared for all unit types)
// =============================================================================

/**
 * Project the full event log down to the per-unit visual state needed by all
 * token renderers. Extracted as a pure function so `useMemo` can dedupe it
 * without capturing the full closure.
 */
function projectEvents(
  unitId: string,
  events: readonly IGameEvent[] | undefined,
): IUnitEventState {
  if (!events || events.length === 0) return EMPTY_EVENT_STATE;

  let critCount = 0;
  let pilotHitCount = 0;
  let unconscious = false;
  let killed = false;
  let destroyed = false;
  const damageEntries: DamageFloaterEntry[] = [];

  for (const event of events) {
    switch (event.type) {
      case GameEventType.DamageApplied: {
        const p = event.payload as IDamageAppliedPayload;
        if (p.unitId !== unitId) break;
        const variant: DamageFloaterEntry['variant'] =
          p.armorRemaining === 0 ? 'structure' : 'armor';
        damageEntries.push({ id: event.id, amount: p.damage, variant });
        break;
      }
      case GameEventType.CriticalHitResolved: {
        const p = event.payload as ICriticalHitResolvedPayload;
        if (p.unitId !== unitId) break;
        critCount += 1;
        break;
      }
      case GameEventType.PilotHit: {
        const p = event.payload as IPilotHitPayload;
        if (p.unitId !== unitId) break;
        pilotHitCount += 1;
        if (p.totalWounds >= 6) {
          killed = true;
        } else if (p.consciousnessCheckPassed === false) {
          unconscious = true;
        }
        break;
      }
      case GameEventType.UnitDestroyed: {
        const p = event.payload as IUnitDestroyedPayload;
        if (p.unitId !== unitId) break;
        destroyed = true;
        break;
      }
      default:
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

interface UnitThermalVisualState {
  readonly heat: number;
  readonly hasHeatEvent: boolean;
  readonly isShutdown: boolean;
  readonly startupAttemptId: number | string | null;
  readonly startupSucceeded: boolean;
  readonly ammoExplosionRisk: boolean;
}

const EMPTY_THERMAL_VISUAL_STATE: UnitThermalVisualState = {
  heat: 0,
  hasHeatEvent: false,
  isShutdown: false,
  startupAttemptId: null,
  startupSucceeded: false,
  ammoExplosionRisk: false,
};

function projectThermalVisualState(
  unitId: string,
  events: readonly IGameEvent[] | undefined,
): UnitThermalVisualState {
  if (!events || events.length === 0) return EMPTY_THERMAL_VISUAL_STATE;

  let heat = 0;
  let hasHeatEvent = false;
  let isShutdown = false;
  let startupAttemptId: number | string | null = null;
  let startupSucceeded = false;
  let ammoExplosionRisk = false;

  for (const event of events) {
    switch (event.type) {
      case GameEventType.HeatGenerated:
      case GameEventType.HeatDissipated: {
        const payload = event.payload as IHeatPayload;
        if (payload.unitId !== unitId) break;
        const transition = getHeatTransitionFromPayload(payload);
        heat = transition.currentHeat;
        hasHeatEvent = true;
        ammoExplosionRisk = transition.ammoExplosionRisk;
        break;
      }
      case GameEventType.ShutdownCheck: {
        const payload = event.payload as IShutdownCheckPayload;
        if (payload.unitId !== unitId) break;
        if (payload.shutdownOccurred) isShutdown = true;
        break;
      }
      case GameEventType.StartupAttempt: {
        const payload = event.payload as IStartupAttemptPayload;
        if (payload.unitId !== unitId) break;
        startupAttemptId = event.id || event.sequence;
        startupSucceeded = payload.success;
        if (payload.success) isShutdown = false;
        break;
      }
      case GameEventType.AmmoExplosion: {
        const payload = event.payload as IAmmoExplosionPayload;
        if (payload.unitId !== unitId) break;
        ammoExplosionRisk = true;
        break;
      }
      default:
        break;
    }
  }

  return {
    heat,
    hasHeatEvent,
    isShutdown,
    startupAttemptId,
    startupSucceeded,
    ammoExplosionRisk,
  };
}

// =============================================================================
// Dispatcher Component
// =============================================================================

export const UnitTokenForType = React.memo(function UnitTokenForType({
  token,
  onClick,
  onDoubleClick,
  events,
  movementAnimation,
  allTokens,
}: UnitTokenForTypeProps): React.ReactElement | null {
  const eventState = useMemo(
    () => projectEvents(token.unitId, events),
    [token.unitId, events],
  );
  const thermalVisualState = useMemo(
    () => projectThermalVisualState(token.unitId, events),
    [token.unitId, events],
  );
  const movementAnimationId = movementAnimation?.id;
  const tweenPath = useMemo(
    () =>
      movementAnimation?.path && movementAnimation.path.length > 0
        ? movementAnimation.path
        : [token.position],
    [movementAnimation?.path, token.position],
  );
  const tweenMode = movementAnimation?.mode ?? MovementType.Walk;
  const handleAnimationDone = useCallback(() => {
    if (!movementAnimationId) return;
    useAnimationQueue.getState().complete(movementAnimationId);
  }, [movementAnimationId]);
  const tween = useMovementTween(tweenPath, tweenMode, handleAnimationDone, {
    animationKey: movementAnimationId ?? `${token.unitId}:idle`,
    initialFacing: movementAnimation?.initialFacing ?? token.facing,
    finalFacing: movementAnimation?.finalFacing ?? token.facing,
    projectHex: hexToPixel,
  });

  useEffect(() => {
    if (!movementAnimationId) return undefined;
    return () => {
      useAnimationQueue.getState().complete(movementAnimationId);
    };
  }, [movementAnimationId]);

  // Double-click handler shared across mounted-badge and standalone
  // code paths. Per `add-minimap-and-camera-controls` task 2.3, we
  // stop propagation so the map's pan-drag doesn't also fire.
  const handleDoubleClick = (e: React.MouseEvent): void => {
    if (!onDoubleClick) return;
    e.stopPropagation();
    onDoubleClick(token.unitId);
  };

  // BA mounted on a mech: render as a badge overlaid on the host mech token,
  // not as a standalone token at its own hex position.
  if (token.unitType === TokenUnitType.BattleArmor && token.mountedOn) {
    const hostToken = allTokens?.find((t) => t.unitId === token.mountedOn);
    if (hostToken) {
      const { x, y } = hexToPixel(hostToken.position);
      // Badge is offset to the top-right of the host mech token.
      return (
        <g
          transform={`translate(${x + 18}, ${y - 18})`}
          onClick={(e) => {
            e.stopPropagation();
            onClick(token.unitId);
          }}
          onDoubleClick={handleDoubleClick}
          style={{ cursor: 'pointer' }}
          data-testid={`unit-token-${token.unitId}`}
        >
          <BattleArmorToken
            token={token}
            eventState={eventState}
            mountedBadge
          />
        </g>
      );
    }
    // Host not found yet (loading race) — fall through and render standalone.
  }

  const { x, y } = movementAnimation
    ? { x: tween.x, y: tween.y }
    : hexToPixel(token.position);
  const renderToken = movementAnimation
    ? { ...token, facing: tween.facing }
    : token;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(token.unitId);
  };

  const wrapperProps = {
    transform: `translate(${x}, ${y}) scale(${tween.scale})`,
    onClick: handleClick,
    onDoubleClick: handleDoubleClick,
    style: { cursor: 'pointer' as const },
    'data-testid': `unit-token-${token.unitId}`,
    'data-animating': movementAnimation ? 'true' : undefined,
    'data-animation-id': movementAnimationId,
  };

  const jumpArc = renderJumpArc(token.unitId, movementAnimation, tween);
  const wrap = (children: React.ReactElement): React.ReactElement => (
    <>
      {jumpArc}
      <g {...wrapperProps}>
        <TokenVisualEffects
          token={token}
          events={events}
          thermalVisualState={thermalVisualState}
        >
          {children}
        </TokenVisualEffects>
      </g>
    </>
  );

  // Route to the correct renderer based on unitType.
  // `unitType` is optional for backward compat — absent means Mech (Phase 1).
  switch (token.unitType) {
    case TokenUnitType.Vehicle:
      return wrap(<VehicleToken token={renderToken} eventState={eventState} />);

    case TokenUnitType.Aerospace:
      return wrap(
        <AerospaceToken token={renderToken} eventState={eventState} />,
      );

    case TokenUnitType.BattleArmor:
      return wrap(
        <BattleArmorToken token={renderToken} eventState={eventState} />,
      );

    case TokenUnitType.Infantry:
      return wrap(
        <InfantryToken token={renderToken} eventState={eventState} />,
      );

    case TokenUnitType.ProtoMech:
      return wrap(
        <ProtoMechToken token={renderToken} eventState={eventState} />,
      );

    case TokenUnitType.Mech:
    default:
      // Covers TokenUnitType.Mech AND undefined (legacy Phase-1 tokens).
      return wrap(<MechToken token={renderToken} eventState={eventState} />);
  }
});

function TokenVisualEffects({
  token,
  events,
  thermalVisualState,
  children,
}: {
  readonly token: IUnitToken;
  readonly events?: readonly IGameEvent[];
  readonly thermalVisualState: UnitThermalVisualState;
  readonly children: React.ReactElement;
}): React.ReactElement {
  const idSuffix = token.unitId;

  return (
    <>
      <AmmoExplosionAura
        active={thermalVisualState.ammoExplosionRisk}
        heat={thermalVisualState.heat}
        idSuffix={idSuffix}
      />
      {thermalVisualState.hasHeatEvent && (
        <HeatGlow
          heat={thermalVisualState.heat}
          idSuffix={idSuffix}
          isShutdown={thermalVisualState.isShutdown}
        />
      )}
      {children}
      <ShutdownOverlay
        active={thermalVisualState.isShutdown}
        idSuffix={idSuffix}
        unitName={token.name}
      />
      <StartupPulse
        attemptId={thermalVisualState.startupAttemptId}
        success={thermalVisualState.startupSucceeded}
      />
      <HitLocationFlash unitId={token.unitId} events={events} />
    </>
  );
}

function renderJumpArc(
  unitId: string,
  movementAnimation: TacticalAnimation | undefined,
  tween: MovementTweenFrame,
): React.ReactElement | null {
  const path = movementAnimation?.path;
  if (!path || path.length <= 1) return null;
  if (movementAnimation.mode !== MovementType.Jump) return null;
  if (tween.reducedMotion || tween.arcOpacity <= 0) return null;

  const start = hexToPixel(path[0]);
  const end = hexToPixel(path[path.length - 1]);
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  const lift = Math.max(24, distance * 0.2);
  const control = {
    x: start.x + (end.x - start.x) / 2,
    y: start.y + (end.y - start.y) / 2 - lift,
  };

  return (
    <path
      data-testid={`jump-arc-${unitId}`}
      d={`M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`}
      fill="none"
      stroke="#3b82f6"
      strokeWidth={2}
      strokeLinecap="round"
      strokeDasharray="5 5"
      opacity={Math.min(0.45, tween.arcOpacity * 0.45)}
      pointerEvents="none"
      aria-hidden="true"
    />
  );
}
