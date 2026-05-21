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

import type { TacticalAnimation } from '@/stores/useAnimationQueue';
import type { IGameEvent, IUnitToken } from '@/types/gameplay';

import { useMovementTween } from '@/components/gameplay/animation/useMovementTween';
import { hexToPixel } from '@/components/gameplay/HexMapDisplay/renderHelpers';
import { useElectedSpotters } from '@/components/gameplay/TacticalCommandShell';
import { useAnimationQueue } from '@/stores/useAnimationQueue';
import { MovementType, TokenUnitType } from '@/types/gameplay';

import { AerospaceToken } from './AerospaceToken';
import { BattleArmorToken } from './BattleArmorToken';
import { InfantryToken } from './InfantryToken';
import { MechToken } from './MechToken';
import { ProtoMechToken } from './ProtoMechToken';
import {
  renderFogMarker,
  renderJumpArc,
  TokenVisualEffects,
} from './UnitTokenForType.effects';
import {
  projectEvents,
  projectThermalVisualState,
} from './UnitTokenForType.projectors';
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
// Constants
// =============================================================================

/** Radius of the spotter-ring overlay drawn around units currently elected
 *  as LOS spotters for indirect fire. Tuned to fit just outside the typical
 *  token chrome at the standard `HEX_SIZE = 25` rendering scale. */
const HEX_SPOTTER_RING_RADIUS = 22;

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
        : [
            token.fogStatus === 'lastKnown' && token.lastKnownPosition
              ? token.lastKnownPosition
              : token.position,
          ],
    [
      movementAnimation?.path,
      token.fogStatus,
      token.lastKnownPosition,
      token.position,
    ],
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

  // Wave 8 PR-K8 — G1: subscribe to elected-spotter state from the shell
  // context. When this token's unit is currently spotting for an
  // indirect-fire attack, render a yellow/amber ring overlay. Cleared
  // automatically on IndirectFireSpotterLost / turn rollover.
  //
  // Hook MUST be called BEFORE the conditional BA-mounted early return
  // below so React's rules-of-hooks ordering invariant is preserved.
  // `useElectedSpotters` returns [] when no TacticalCommandShell is in
  // the ancestry — token degrades to no-ring in storybook / standalone.
  const shellSpotters = useElectedSpotters();
  const isSpotter = shellSpotters.some((s) => s.spotterId === token.unitId);

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

  const displayPosition =
    token.fogStatus === 'lastKnown' && token.lastKnownPosition
      ? token.lastKnownPosition
      : token.position;
  const { x, y } = movementAnimation
    ? { x: tween.x, y: tween.y }
    : hexToPixel(displayPosition);
  const fogDisplayFields =
    token.fogStatus === 'hidden'
      ? { designation: '?', name: 'Hidden contact' }
      : {};
  // Build the render-time token. The spread preserves `unitType`, but TS
  // can't infer that, so we re-narrow via a generic helper that re-tags the
  // discriminant. The result is the same `IUnitToken` discriminated union;
  // each switch branch below narrows it to its variant per `unitType`.
  const renderToken: IUnitToken = movementAnimation
    ? ({ ...token, ...fogDisplayFields, facing: tween.facing } as IUnitToken)
    : ({
        ...token,
        ...fogDisplayFields,
        position: displayPosition,
      } as IUnitToken);
  const fogOpacity =
    token.fogStatus === 'hidden'
      ? 0.45
      : token.fogStatus === 'lastKnown'
        ? 0.62
        : 1;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(token.unitId);
  };

  const wrapperProps = {
    transform: `translate(${x}, ${y}) scale(${tween.scale})`,
    onClick: handleClick,
    onDoubleClick: handleDoubleClick,
    style: { cursor: 'pointer' as const, opacity: fogOpacity },
    'data-testid': `unit-token-${token.unitId}`,
    'data-animating': movementAnimation ? 'true' : undefined,
    'data-animation-id': movementAnimationId,
    'data-fog-status': token.fogStatus,
    'data-spotter': isSpotter ? 'true' : undefined,
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
          <>
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
                data-testid={`spotter-ring-${token.unitId}`}
              >
                <animate
                  attributeName="opacity"
                  values="0.85;0.45;0.85"
                  dur="1.6s"
                  repeatCount="indefinite"
                />
              </circle>
            )}
            {children}
            {renderFogMarker(token)}
          </>
        </TokenVisualEffects>
      </g>
    </>
  );

  // Route to the correct renderer based on unitType. Switching on
  // `renderToken.unitType` (not `token.unitType`) lets TS narrow
  // `renderToken` to its variant in each arm — the per-type token
  // components accept their narrowed variant directly. The default arm
  // is unreachable because `IUnitToken` is a closed discriminated
  // union, but we keep it as a Mech fallback for runtime safety.
  switch (renderToken.unitType) {
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
      return wrap(<MechToken token={renderToken} eventState={eventState} />);
  }
});
