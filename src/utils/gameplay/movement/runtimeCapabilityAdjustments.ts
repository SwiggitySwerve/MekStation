import type {
  IMovementCapability,
  MovementMotiveMode,
  MovementUnitHeightProfile,
} from '@/types/gameplay';

export interface IRuntimeMovementCapabilityAdjustments {
  readonly runtimeHeight?: number;
  readonly runtimeMovementMode?: MovementMotiveMode;
  readonly runtimeMovementPoints?: Pick<
    IMovementCapability,
    'walkMP' | 'runMP'
  >;
  readonly runtimeJumpMP?: number;
  readonly runtimeMovementHeatProfile?: IMovementCapability['movementHeatProfile'];
}

export function runtimeCapabilityHasChanges(
  capability: IMovementCapability,
  adjustments: IRuntimeMovementCapabilityAdjustments,
): boolean {
  return [
    runtimeHeightChanged(capability, adjustments.runtimeHeight),
    runtimeMovementModeChanged(capability, adjustments.runtimeMovementMode),
    runtimeMovementPointsChanged(capability, adjustments.runtimeMovementPoints),
    runtimeJumpMPChanged(capability, adjustments.runtimeJumpMP),
    runtimeMovementHeatProfileChanged(
      capability,
      adjustments.runtimeMovementHeatProfile,
    ),
  ].some(Boolean);
}

function runtimeHeightChanged(
  capability: IMovementCapability,
  runtimeHeight: number | undefined,
): boolean {
  return runtimeHeight !== undefined && runtimeHeight !== capability.unitHeight;
}

function runtimeMovementModeChanged(
  capability: IMovementCapability,
  runtimeMovementMode: MovementMotiveMode | undefined,
): boolean {
  return (
    runtimeMovementMode !== undefined &&
    runtimeMovementMode !== capability.movementMode
  );
}

function runtimeMovementPointsChanged(
  capability: IMovementCapability,
  runtimeMovementPoints:
    | Pick<IMovementCapability, 'walkMP' | 'runMP'>
    | undefined,
): boolean {
  return (
    runtimeMovementPoints !== undefined &&
    (runtimeMovementPoints.walkMP !== capability.walkMP ||
      runtimeMovementPoints.runMP !== capability.runMP)
  );
}

function runtimeJumpMPChanged(
  capability: IMovementCapability,
  runtimeJumpMP: number | undefined,
): boolean {
  return runtimeJumpMP !== undefined && runtimeJumpMP !== capability.jumpMP;
}

function runtimeMovementHeatProfileChanged(
  capability: IMovementCapability,
  runtimeMovementHeatProfile: IMovementCapability['movementHeatProfile'],
): boolean {
  return (
    runtimeMovementHeatProfile !== undefined &&
    runtimeMovementHeatProfile !== capability.movementHeatProfile
  );
}

export function applyRuntimeCapabilityAdjustments(
  capability: IMovementCapability,
  profile: MovementUnitHeightProfile | undefined,
  adjustments: IRuntimeMovementCapabilityAdjustments,
): IMovementCapability {
  const next = { ...capability };
  if (adjustments.runtimeHeight !== undefined) {
    next.unitHeight = adjustments.runtimeHeight;
  }
  if (adjustments.runtimeMovementMode !== undefined) {
    next.movementMode = adjustments.runtimeMovementMode;
  }
  if (adjustments.runtimeMovementPoints !== undefined) {
    next.walkMP = adjustments.runtimeMovementPoints.walkMP;
    next.runMP = adjustments.runtimeMovementPoints.runMP;
  }
  if (adjustments.runtimeJumpMP !== undefined) {
    next.jumpMP = adjustments.runtimeJumpMP;
  }
  if (adjustments.runtimeMovementHeatProfile !== undefined) {
    next.movementHeatProfile = adjustments.runtimeMovementHeatProfile;
  }
  if (profile?.kind === 'lam') {
    next.conversionThrustMP =
      capability.conversionThrustMP ?? capability.jumpMP;
  }
  return next;
}
