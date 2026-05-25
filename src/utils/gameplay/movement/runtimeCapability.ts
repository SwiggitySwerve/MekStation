import type {
  IMovementCapability,
  IUnitGameState,
  MovementConversionMode,
  MovementMotiveMode,
  MovementUnitHeightProfile,
} from '@/types/gameplay';

function normalizedHeight(value: number | undefined): number | undefined {
  return value === undefined ? undefined : Math.max(0, Math.floor(value));
}

function normalizedConversionMode(
  value: MovementConversionMode | number | undefined,
  profile: MovementUnitHeightProfile,
): 'mek' | 'airmek' | 'fighter' | 'vehicle' | undefined {
  if (typeof value === 'number') {
    if (value === 0) return 'mek';
    if (profile.kind === 'lam') {
      if (value === 1) return 'airmek';
      if (value === 2) return 'fighter';
    }
    if (profile.kind === 'quadvee' && value === 1) return 'vehicle';
    return undefined;
  }

  switch (value) {
    case 'mek':
    case 'mech':
      return 'mek';
    case 'airmek':
    case 'airmech':
      return 'airmek';
    case 'fighter':
      return 'fighter';
    case 'vehicle':
    case 'tracked':
    case 'wheeled':
      return 'vehicle';
    default:
      return undefined;
  }
}

function conversionModeHeight(
  unit: IUnitGameState,
  profile: MovementUnitHeightProfile,
): number | undefined {
  const mode = normalizedConversionMode(unit.conversionMode, profile);
  if (!mode) return undefined;

  if (profile.kind === 'lam') {
    return mode === 'mek' ? normalizedHeight(profile.standingHeight) : 0;
  }

  if (profile.kind === 'quadvee') {
    return mode === 'vehicle' ? 0 : normalizedHeight(profile.standingHeight);
  }

  return undefined;
}

function quadVeeVehicleMovementMode(
  unit: IUnitGameState,
  capability: IMovementCapability,
): MovementMotiveMode {
  if (unit.conversionMode === 'wheeled') return 'wheeled';
  if (unit.conversionMode === 'tracked') return 'tracked';
  return capability.movementMode === 'wheeled' ? 'wheeled' : 'tracked';
}

function conversionModeMovementMode(
  unit: IUnitGameState,
  capability: IMovementCapability,
  profile: MovementUnitHeightProfile,
): MovementMotiveMode | undefined {
  const mode = normalizedConversionMode(unit.conversionMode, profile);
  if (profile.kind === 'quadvee' && mode === 'vehicle') {
    return quadVeeVehicleMovementMode(unit, capability);
  }
  return undefined;
}

function conversionModeJumpMP(
  unit: IUnitGameState,
  profile: MovementUnitHeightProfile,
): number | undefined {
  const mode = normalizedConversionMode(unit.conversionMode, profile);
  return profile.kind === 'quadvee' && mode === 'vehicle' ? 0 : undefined;
}

function infantryMountHeight(
  unit: IUnitGameState,
  profile: MovementUnitHeightProfile | undefined,
  fallbackHeight: number | undefined,
): number | undefined {
  if (
    unit.infantryMounted === undefined &&
    unit.infantryMountHeight === undefined
  ) {
    return undefined;
  }

  if (unit.infantryMounted === false) return 0;

  const mountedHeight =
    unit.infantryMountHeight ??
    (profile?.kind === 'infantry_mount' ? profile.mountedHeight : undefined) ??
    fallbackHeight;
  return normalizedHeight(mountedHeight);
}

export function runtimeUnitHeightForMovement(
  unit: IUnitGameState,
  capability: IMovementCapability,
): number | undefined {
  const explicitRuntimeHeight = normalizedHeight(unit.unitHeight);
  if (explicitRuntimeHeight !== undefined) return explicitRuntimeHeight;

  const profile = capability.unitHeightProfile;
  const mountedHeight = infantryMountHeight(
    unit,
    profile,
    capability.unitHeight,
  );
  if (mountedHeight !== undefined) return mountedHeight;

  if (profile) {
    return conversionModeHeight(unit, profile);
  }

  return undefined;
}

export function resolveRuntimeMovementCapability(
  unit: IUnitGameState,
  capability: IMovementCapability | undefined,
): IMovementCapability | undefined {
  if (!capability) return undefined;

  const runtimeHeight = runtimeUnitHeightForMovement(unit, capability);
  const profile = capability.unitHeightProfile;
  const runtimeMovementMode = profile
    ? conversionModeMovementMode(unit, capability, profile)
    : undefined;
  const runtimeJumpMP = profile
    ? conversionModeJumpMP(unit, profile)
    : undefined;

  if (
    (runtimeHeight === undefined || runtimeHeight === capability.unitHeight) &&
    (runtimeMovementMode === undefined ||
      runtimeMovementMode === capability.movementMode) &&
    (runtimeJumpMP === undefined || runtimeJumpMP === capability.jumpMP)
  ) {
    return capability;
  }

  return {
    ...capability,
    ...(runtimeHeight !== undefined ? { unitHeight: runtimeHeight } : {}),
    ...(runtimeMovementMode !== undefined
      ? { movementMode: runtimeMovementMode }
      : {}),
    ...(runtimeJumpMP !== undefined ? { jumpMP: runtimeJumpMP } : {}),
  };
}
