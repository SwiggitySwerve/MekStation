/**
 * UnitTokenForType â€” central dispatcher for per-type hex map tokens.
 *
 * Receives a single `IUnitToken` and routes to the correct per-type renderer
 * based on `token.unitType`. Handles:
 *   - Event projection (shared across all renderers)
 *   - BattleArmor passenger badges owned by host token groups
 *   - Pixel-coordinate translation from hex coords
 *   - Click handler delegation
 *
 * This is the ONLY component HexMapDisplay should import for unit tokens â€”
 * the per-type components are internal implementation details.
 *
 * @spec openspec/changes/add-per-type-hex-tokens/specs/tactical-map-interface/spec.md
 *        Â§Per-Type Token Rendering â€” dispatcher routes to correct renderer
 */

import React, { useEffect, useMemo } from 'react';

import type { TacticalAnimation } from '@/stores/useAnimationQueue';
import type { IGameEvent, IUnitToken } from '@/types/gameplay';

import { useMovementTween } from '@/components/gameplay/animation/useMovementTween';
import { hexToPixel } from '@/components/gameplay/HexMapDisplay/renderHelpers';
import { useElectedSpotters } from '@/components/gameplay/TacticalCommandShell';
import { MovementType } from '@/types/gameplay';

import type { IsometricVisibilityRule } from './UnitTokenForType.effects';

import {
  findBattleArmorPassengerHost,
  isBattleArmorPassengerToken,
} from './BattleArmorPassengerBadges';
import {
  buildTokenWrapperProps,
  createAnimationCleanup,
  createAnimationDoneHandler,
  createTokenClickHandler,
  createTokenDoubleClickHandler,
  formatTokenAriaLabel,
  tokenTweenPath,
} from './UnitTokenForType.metadata';
import {
  projectEvents,
  projectThermalVisualState,
} from './UnitTokenForType.projectors';
import { renderUnitTokenForType } from './UnitTokenForType.renderers';
import {
  isometricVisibilityLabel,
  renderTimeToken,
  tokenDisplayPosition,
  tokenFogOpacity,
} from './UnitTokenForType.state';
import { UnitTokenWrapper } from './UnitTokenForType.wrapper';

// =============================================================================
// Props
// =============================================================================

export interface UnitTokenForTypeProps {
  /** The token descriptor for the unit to render. */
  token: IUnitToken;
  /** Click handler â€” called with the unitId of the token that was clicked. */
  onClick: (unitId: string) => void;
  /**
   * Double-click handler â€” per `add-minimap-and-camera-controls`
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
    () => tokenTweenPath(token, movementAnimation),
    [
      movementAnimation?.path,
      token.fogStatus,
      token.lastKnownPosition,
      token.position,
    ],
  );
  const tweenMode = movementAnimation?.mode ?? MovementType.Walk;
  const handleAnimationDone = useMemo(
    () => createAnimationDoneHandler(movementAnimationId),
    [movementAnimationId],
  );
  const tween = useMovementTween(tweenPath, tweenMode, handleAnimationDone, {
    animationKey: movementAnimationId ?? `${token.unitId}:idle`,
    initialFacing: movementAnimation?.initialFacing ?? token.facing,
    finalFacing: movementAnimation?.finalFacing ?? token.facing,
    projectHex: hexToPixel,
  });

  useEffect(
    () => createAnimationCleanup(movementAnimationId),
    [movementAnimationId],
  );

  const handleClick = useMemo(
    () => createTokenClickHandler(onClick, token.unitId),
    [onClick, token.unitId],
  );
  const handleDoubleClick = useMemo(
    () => createTokenDoubleClickHandler(onDoubleClick, token.unitId),
    [onDoubleClick, token.unitId],
  );

  // Wave 8 PR-K8 â€” G1: subscribe to elected-spotter state from the shell
  // context. When this token's unit is currently spotting for an
  // indirect-fire attack, render a yellow/amber ring overlay. Cleared
  // automatically on IndirectFireSpotterLost / turn rollover.
  //
  // Hook MUST be called BEFORE the conditional BA-mounted early return
  // below so React's rules-of-hooks ordering invariant is preserved.
  // `useElectedSpotters` returns [] when no TacticalCommandShell is in
  // the ancestry â€” token degrades to no-ring in storybook / standalone.
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

  const displayPosition = tokenDisplayPosition(token);
  const { x, y } = movementAnimation
    ? { x: tween.x, y: tween.y }
    : hexToPixel(displayPosition);
  const projectedIsValidTarget =
    combatProjectionValidTarget ?? token.isValidTarget;
  const renderToken = renderTimeToken({
    token,
    displayPosition,
    isAnimating: Boolean(movementAnimation),
    facing: tween.facing,
    isValidTarget: projectedIsValidTarget,
  });
  const fogOpacity = tokenFogOpacity(token);
  const visibilityLabel = isometricVisibilityLabel(
    isOcclusionHighlighted,
    isometricOcclusionReason,
    isometricVisibilityRuleReason,
  );
  const tokenAriaLabel = formatTokenAriaLabel({
    token: renderToken,
    displayPosition,
    sourcePosition: token.position,
    isSpotter,
    isometricVisibilityLabel: visibilityLabel,
  });
  const wrapperProps = buildTokenWrapperProps({
    token,
    renderToken,
    displayPosition,
    sourcePosition: token.position,
    x,
    y,
    scale: tween.scale,
    onClick: handleClick,
    onDoubleClick: handleDoubleClick,
    fogOpacity,
    movementAnimationId,
    isAnimating: Boolean(movementAnimation),
    isSpotter,
    isOcclusionHighlighted,
    isometricOcclusionReason,
    isometricVisibilityRule,
    isometricVisibilityRuleReason,
    combatProjectionValidTarget,
    tokenAriaLabel,
  });

  return (
    <UnitTokenWrapper
      token={token}
      renderToken={renderToken}
      displayPosition={displayPosition}
      movementAnimation={movementAnimation}
      tween={tween}
      wrapperProps={wrapperProps}
      tokenAriaLabel={tokenAriaLabel}
      events={events}
      thermalVisualState={thermalVisualState}
      allTokens={allTokens}
      electedSpotters={shellSpotters}
      isOcclusionHighlighted={isOcclusionHighlighted}
      isometricOcclusionReason={isometricOcclusionReason}
      isometricVisibilityRule={isometricVisibilityRule}
      isometricVisibilityRuleReason={isometricVisibilityRuleReason}
      isSpotter={isSpotter}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {renderUnitTokenForType(renderToken, eventState)}
    </UnitTokenWrapper>
  );
});
