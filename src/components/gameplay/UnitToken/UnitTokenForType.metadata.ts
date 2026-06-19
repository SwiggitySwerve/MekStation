import type React from 'react';

import type { TacticalAnimation } from '@/stores/useAnimationQueue';
import type { IHexCoordinate, IUnitToken } from '@/types/gameplay';

import { useAnimationQueue } from '@/stores/useAnimationQueue';
import { TokenUnitType, VehicleMotionType } from '@/types/gameplay';

import {
  battleArmorPassengerHostId,
  battleArmorPassengerSlot,
} from './BattleArmorPassengerBadges';
import {
  tokenCombatProjectionData,
  tokenDisplayPosition,
} from './UnitTokenForType.state';

export type TokenWrapperMetadata = Record<
  `data-${string}`,
  string | number | undefined
>;

export type UnitTokenWrapperAttributes = React.SVGProps<SVGGElement> &
  TokenWrapperMetadata;

export function tokenTweenPath(
  token: IUnitToken,
  movementAnimation: TacticalAnimation | undefined,
): readonly IHexCoordinate[] {
  if (movementAnimation?.path && movementAnimation.path.length > 0) {
    return movementAnimation.path;
  }
  return [tokenDisplayPosition(token)];
}

export function createAnimationDoneHandler(
  movementAnimationId: string | undefined,
): () => void {
  return () => completeAnimation(movementAnimationId);
}

export function createAnimationCleanup(
  movementAnimationId: string | undefined,
): (() => void) | undefined {
  if (!movementAnimationId) return undefined;
  return () => completeAnimation(movementAnimationId);
}

export function createTokenClickHandler(
  onClick: (unitId: string) => void,
  unitId: string,
): React.MouseEventHandler<SVGGElement> {
  return (event) => {
    event.stopPropagation();
    onClick(unitId);
  };
}

export function createTokenDoubleClickHandler(
  onDoubleClick: ((unitId: string) => void) | undefined,
  unitId: string,
): React.MouseEventHandler<SVGGElement> {
  return (event) => {
    if (!onDoubleClick) return;
    event.stopPropagation();
    onDoubleClick(unitId);
  };
}

export function buildTokenWrapperProps({
  token,
  renderToken,
  displayPosition,
  sourcePosition,
  x,
  y,
  scale,
  onClick,
  onDoubleClick,
  fogOpacity,
  movementAnimationId,
  isAnimating,
  isSpotter,
  isOcclusionHighlighted,
  isometricOcclusionReason,
  isometricVisibilityRule,
  isometricVisibilityRuleReason,
  combatProjectionValidTarget,
  tokenAriaLabel,
}: {
  readonly token: IUnitToken;
  readonly renderToken: IUnitToken;
  readonly displayPosition: IHexCoordinate;
  readonly sourcePosition: IHexCoordinate;
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly onClick: React.MouseEventHandler<SVGGElement>;
  readonly onDoubleClick: React.MouseEventHandler<SVGGElement>;
  readonly fogOpacity: number;
  readonly movementAnimationId: string | undefined;
  readonly isAnimating: boolean;
  readonly isSpotter: boolean;
  readonly isOcclusionHighlighted: boolean;
  readonly isometricOcclusionReason: string | undefined;
  readonly isometricVisibilityRule: string | undefined;
  readonly isometricVisibilityRuleReason: string | undefined;
  readonly combatProjectionValidTarget: boolean | undefined;
  readonly tokenAriaLabel: string;
}): UnitTokenWrapperAttributes {
  return {
    transform: `translate(${x}, ${y}) scale(${scale})`,
    onClick,
    onDoubleClick,
    style: { cursor: 'pointer', opacity: fogOpacity },
    'data-testid': `unit-token-${token.unitId}`,
    'data-animating': isAnimating ? 'true' : undefined,
    'data-animation-id': movementAnimationId,
    'data-fog-status': token.fogStatus,
    'data-spotter': isSpotter ? 'true' : undefined,
    'data-visibility-boost': isOcclusionHighlighted ? 'true' : undefined,
    'data-isometric-occlusion-reason': isometricOcclusionReason,
    'data-isometric-visibility-rule': isometricVisibilityRule,
    'data-isometric-visibility-rule-reason': isometricVisibilityRuleReason,
    'data-token-valid-target-source':
      combatProjectionValidTarget === undefined ? 'token' : 'combat-projection',
    'data-token-combat-projection-valid-target': tokenCombatProjectionData(
      combatProjectionValidTarget,
    ),
    'aria-label': tokenAriaLabel,
    ...tokenWrapperMetadata(renderToken, displayPosition, sourcePosition),
  };
}

export function formatTokenAriaLabel({
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

function tokenTypeLabelParts(token: IUnitToken): readonly string[] {
  switch (token.unitType) {
    case TokenUnitType.Aerospace: {
      const parts = [`altitude ${token.altitude}`];
      if (token.velocity !== undefined) {
        parts.push(`velocity ${token.velocity}`);
      }
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

function formatTokenHex(hex: IHexCoordinate): string {
  return `${hex.q},${hex.r}`;
}

function completeAnimation(movementAnimationId: string | undefined): void {
  if (!movementAnimationId) return;
  useAnimationQueue.getState().complete(movementAnimationId);
}
