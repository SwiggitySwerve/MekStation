import React from 'react';

import type { MovementTweenFrame } from '@/components/gameplay/animation/useMovementTween';
import type { TacticalAnimation } from '@/stores/useAnimationQueue';
import type { IGameEvent, IHexCoordinate, IUnitToken } from '@/types/gameplay';

import type { IsometricVisibilityRule } from './UnitTokenForType.effects';
import type { UnitTokenWrapperAttributes } from './UnitTokenForType.metadata';
import type { UnitThermalVisualState } from './UnitTokenForType.projectors';

import { BattleArmorPassengerBadges } from './BattleArmorPassengerBadges';
import {
  renderFogMarker,
  renderJumpArc,
  TokenVisualEffects,
} from './UnitTokenForType.effects';
import { TokenOverlayBadges } from './UnitTokenForType.overlays';

interface UnitTokenWrapperProps {
  readonly token: IUnitToken;
  readonly renderToken: IUnitToken;
  readonly displayPosition: IHexCoordinate;
  readonly movementAnimation?: TacticalAnimation;
  readonly tween: MovementTweenFrame;
  readonly wrapperProps: UnitTokenWrapperAttributes;
  readonly tokenAriaLabel: string;
  readonly events?: readonly IGameEvent[];
  readonly thermalVisualState: UnitThermalVisualState;
  readonly allTokens?: readonly IUnitToken[];
  readonly electedSpotters: readonly { readonly spotterId: string }[];
  readonly isOcclusionHighlighted: boolean;
  readonly isometricOcclusionReason?: string;
  readonly isometricVisibilityRule?: IsometricVisibilityRule;
  readonly isometricVisibilityRuleReason?: string;
  readonly isSpotter: boolean;
  readonly onClick: (unitId: string) => void;
  readonly onDoubleClick?: (unitId: string) => void;
  readonly children: React.ReactElement;
}

export function UnitTokenWrapper({
  token,
  renderToken,
  displayPosition,
  movementAnimation,
  tween,
  wrapperProps,
  tokenAriaLabel,
  events,
  thermalVisualState,
  allTokens,
  electedSpotters,
  isOcclusionHighlighted,
  isometricOcclusionReason,
  isometricVisibilityRule,
  isometricVisibilityRuleReason,
  isSpotter,
  onClick,
  onDoubleClick,
  children,
}: UnitTokenWrapperProps): React.ReactElement {
  return (
    <>
      {renderJumpArc(token.unitId, movementAnimation, tween)}
      <g {...wrapperProps}>
        <title>{tokenAriaLabel}</title>
        <TokenVisualEffects
          token={token}
          events={events}
          thermalVisualState={thermalVisualState}
        >
          <>
            <TokenOverlayBadges
              unitId={token.unitId}
              isOcclusionHighlighted={isOcclusionHighlighted}
              isometricOcclusionReason={isometricOcclusionReason}
              isometricVisibilityRule={isometricVisibilityRule}
              isometricVisibilityRuleReason={isometricVisibilityRuleReason}
              isSpotter={isSpotter}
            />
            {children}
            <BattleArmorPassengerBadges
              hostToken={renderToken}
              displayPosition={displayPosition}
              allTokens={allTokens}
              events={events}
              electedSpotters={electedSpotters}
              onClick={onClick}
              onDoubleClick={onDoubleClick}
            />
            {renderFogMarker(token)}
          </>
        </TokenVisualEffects>
      </g>
    </>
  );
}
