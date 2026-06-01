/**
 * UnitTokenForType — central dispatcher for per-type hex map tokens.
 *
 * Receives a single `IUnitToken` and routes to the correct per-type renderer
 * based on `token.unitType`. Handles:
 *   - Event projection (shared across all renderers)
 *   - BattleArmor passenger badges owned by host token groups
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
import type { IGameEvent, IHexCoordinate, IUnitToken } from '@/types/gameplay';

import { useMovementTween } from '@/components/gameplay/animation/useMovementTween';
import { hexToPixel } from '@/components/gameplay/HexMapDisplay/renderHelpers';
import { useElectedSpotters } from '@/components/gameplay/TacticalCommandShell';
import { useAnimationQueue } from '@/stores/useAnimationQueue';
import {
  MovementType,
  TokenUnitType,
  VehicleMotionType,
} from '@/types/gameplay';

import type { IsometricVisibilityRule } from './UnitTokenForType.effects';

import { AerospaceToken } from './AerospaceToken';
import {
  BattleArmorPassengerBadges,
  battleArmorPassengerHostId,
  battleArmorPassengerSlot,
  findBattleArmorPassengerHost,
  isBattleArmorPassengerToken,
} from './BattleArmorPassengerBadges';
import { BattleArmorToken } from './BattleArmorToken';
import { InfantryToken } from './InfantryToken';
import { MechToken } from './MechToken';
import { ProtoMechToken } from './ProtoMechToken';
import {
  renderFogMarker,
  renderIsometricVisibilityRuleBadge,
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
  /** Render an always-visible halo for selected units in the isometric view. */
  isOcclusionHighlighted?: boolean;
  isometricOcclusionReason?: string;
  /** Isometric-only rule reason for contacts limited by fog/visibility rules. */
  isometricVisibilityRule?: IsometricVisibilityRule;
  isometricVisibilityRuleReason?: string;
  /**
   * Combat projection override for valid-target chrome. Undefined keeps the
   * legacy token flag path for callers without weapon-backed projection.
   */
  combatProjectionValidTarget?: boolean;
  /**
   * All tokens on the map. Host tokens render mounted BA passengers as child
   * badges, and mounted BA tokens suppress their standalone wrapper when their
   * host is present.
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

type TokenWrapperMetadata = Record<string, string | number | undefined>;

function formatTokenHex(hex: IHexCoordinate): string {
  return `${hex.q},${hex.r}`;
}

function tokenTypeStateMetadata(token: IUnitToken): TokenWrapperMetadata {
  switch (token.unitType) {
    case TokenUnitType.Aerospace:
      return {
        'data-aerospace-altitude': token.altitude,
        'data-aerospace-velocity': token.velocity,
      };
    case TokenUnitType.BattleArmor: {
      const passengerHostId = battleArmorPassengerHostId(token);
      return {
        'data-mounted-on': token.mountedOn,
        'data-passenger-host': passengerHostId,
        'data-passenger-slot': passengerHostId
          ? battleArmorPassengerSlot(token)
          : undefined,
      };
    }
    case TokenUnitType.Vehicle:
      return {
        'data-vehicle-motion-type': token.vehicleMotionType,
        'data-vehicle-altitude': token.altitude,
      };
    default:
      return {};
  }
}

function formatVehicleMotionTypeLabel(
  motionType: VehicleMotionType | undefined,
): string | null {
  switch (motionType) {
    case VehicleMotionType.Tracked:
      return 'Tracked';
    case VehicleMotionType.Wheeled:
      return 'Wheeled';
    case VehicleMotionType.Hover:
      return 'Hover';
    case VehicleMotionType.VTOL:
      return 'VTOL';
    case VehicleMotionType.Naval:
      return 'Naval';
    case VehicleMotionType.WiGE:
      return 'WiGE';
    default:
      return null;
  }
}

function tokenWrapperMetadata(
  token: IUnitToken,
  displayPosition: IHexCoordinate,
  sourcePosition: IHexCoordinate = token.position,
): TokenWrapperMetadata {
  return {
    'data-unit-type': token.unitType,
    'data-token-map-position': formatTokenHex(displayPosition),
    'data-token-source-position': formatTokenHex(sourcePosition),
    'data-token-facing': token.facing,
    ...tokenTypeStateMetadata(token),
  };
}

function tokenTypeLabelParts(token: IUnitToken): readonly string[] {
  switch (token.unitType) {
    case TokenUnitType.Aerospace: {
      const parts = [`altitude ${token.altitude}`];
      if (token.velocity !== undefined)
        parts.push(`velocity ${token.velocity}`);
      return parts;
    }
    case TokenUnitType.BattleArmor: {
      const passengerHostId = battleArmorPassengerHostId(token);
      if (!passengerHostId) return [];
      return [
        `mounted on ${passengerHostId}`,
        `passenger slot ${battleArmorPassengerSlot(token)}`,
      ];
    }
    case TokenUnitType.Vehicle: {
      const motionLabel = formatVehicleMotionTypeLabel(token.vehicleMotionType);
      return [
        motionLabel ? `motion ${motionLabel}` : null,
        token.altitude !== undefined ? `altitude ${token.altitude}` : null,
      ].filter((part): part is string => Boolean(part));
    }
    default:
      return [];
  }
}

function formatTokenAriaLabel({
  token,
  displayPosition,
  sourcePosition = token.position,
  isSpotter,
  isometricVisibilityLabel,
}: {
  readonly token: IUnitToken;
  readonly displayPosition: IHexCoordinate;
  readonly sourcePosition?: IHexCoordinate;
  readonly isSpotter: boolean;
  readonly isometricVisibilityLabel: string;
}): string {
  return [
    `Unit ${token.name}`,
    `id ${token.unitId}`,
    `side ${token.side}`,
    `type ${token.unitType}`,
    `position ${formatTokenHex(displayPosition)}`,
    `source position ${formatTokenHex(sourcePosition)}`,
    `facing ${token.facing}`,
    ...tokenTypeLabelParts(token),
    isSpotter ? 'indirect-fire spotter' : null,
    isometricVisibilityLabel || null,
  ]
    .filter((part): part is string => Boolean(part))
    .join('; ');
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
  isOcclusionHighlighted = false,
  isometricOcclusionReason,
  isometricVisibilityRule,
  isometricVisibilityRuleReason,
  combatProjectionValidTarget,
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

  // BA passengers are rendered by their host token group, so suppress their
  // standalone wrapper when the host is present.
  if (
    isBattleArmorPassengerToken(token) &&
    findBattleArmorPassengerHost(token, allTokens)
  ) {
    return null;
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
  const projectedIsValidTarget =
    combatProjectionValidTarget ?? token.isValidTarget;
  // Build the render-time token. The spread preserves `unitType`, but TS
  // can't infer that, so we re-narrow via a generic helper that re-tags the
  // discriminant. The result is the same `IUnitToken` discriminated union;
  // each switch branch below narrows it to its variant per `unitType`.
  const renderToken: IUnitToken = movementAnimation
    ? ({
        ...token,
        ...fogDisplayFields,
        isValidTarget: projectedIsValidTarget,
        facing: tween.facing,
      } as IUnitToken)
    : ({
        ...token,
        ...fogDisplayFields,
        isValidTarget: projectedIsValidTarget,
        position: displayPosition,
      } as IUnitToken);
  const fogOpacity =
    token.fogStatus === 'hidden'
      ? 0.45
      : token.fogStatus === 'lastKnown'
        ? 0.62
        : 1;
  const isometricVisibilityLabel = [
    isOcclusionHighlighted
      ? (isometricOcclusionReason ?? 'Isometric visibility highlighted')
      : null,
    isometricVisibilityRuleReason,
  ]
    .filter((part): part is string => Boolean(part))
    .join('; ');
  const tokenAriaLabel = formatTokenAriaLabel({
    token: renderToken,
    displayPosition,
    sourcePosition: token.position,
    isSpotter,
    isometricVisibilityLabel,
  });

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
    'data-visibility-boost': isOcclusionHighlighted ? 'true' : undefined,
    'data-isometric-occlusion-reason': isometricOcclusionReason,
    'data-isometric-visibility-rule': isometricVisibilityRule,
    'data-isometric-visibility-rule-reason': isometricVisibilityRuleReason,
    'data-token-valid-target-source':
      combatProjectionValidTarget === undefined ? 'token' : 'combat-projection',
    'data-token-combat-projection-valid-target':
      combatProjectionValidTarget === undefined
        ? undefined
        : combatProjectionValidTarget
          ? 'true'
          : 'false',
    'aria-label': tokenAriaLabel,
    ...tokenWrapperMetadata(renderToken, displayPosition, token.position),
  };

  const jumpArc = renderJumpArc(token.unitId, movementAnimation, tween);
  const wrap = (children: React.ReactElement): React.ReactElement => (
    <>
      {jumpArc}
      <g {...wrapperProps}>
        <title>{tokenAriaLabel}</title>
        <TokenVisualEffects
          token={token}
          events={events}
          thermalVisualState={thermalVisualState}
        >
          <>
            {isOcclusionHighlighted && (
              <circle
                cx={0}
                cy={0}
                r={30}
                fill="#f8fafc"
                fillOpacity={0.18}
                stroke="#38bdf8"
                strokeWidth={3}
                strokeDasharray="5 3"
                pointerEvents="none"
                data-testid={`isometric-visibility-halo-${token.unitId}`}
              />
            )}
            {isometricOcclusionReason && (
              <g
                pointerEvents="none"
                data-testid={`isometric-visibility-reason-${token.unitId}`}
                data-isometric-occlusion-reason={isometricOcclusionReason}
              >
                <rect
                  x={-18}
                  y={-43}
                  width={36}
                  height={14}
                  rx={3}
                  fill="#0f172a"
                  fillOpacity={0.9}
                  stroke="#38bdf8"
                  strokeWidth={1}
                />
                <text
                  x={0}
                  y={-33}
                  textAnchor="middle"
                  fontSize={8}
                  fontWeight="bold"
                  fill="#f8fafc"
                >
                  ELEV
                </text>
              </g>
            )}
            {renderIsometricVisibilityRuleBadge(
              token.unitId,
              isometricVisibilityRule,
              isometricVisibilityRuleReason,
            )}
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
            <BattleArmorPassengerBadges
              hostToken={renderToken}
              displayPosition={displayPosition}
              allTokens={allTokens}
              events={events}
              electedSpotters={shellSpotters}
              onClick={onClick}
              onDoubleClick={onDoubleClick}
            />
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
