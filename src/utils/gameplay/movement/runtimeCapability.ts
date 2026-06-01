import type {
  IMovementCapability,
  IUnitGameState,
  MovementConversionMode,
  MovementMotiveMode,
  MovementTravelMode,
  MovementUnitHeightProfile,
} from '@/types/gameplay';

import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';
import { isGyroDestroyedForType } from '@/utils/gameplay/gyroRules';

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

function isAirborneAeroState(unit: IUnitGameState): boolean {
  if (unit.combatState?.kind !== 'aero') return false;
  return (
    unit.combatState.state.altitude > 0 ||
    unit.combatState.state.airborneState === 'airborne' ||
    unit.combatState.state.airborneState === 'taking-off'
  );
}

function isAltitudeTrackedAirborneState(unit: IUnitGameState): boolean {
  switch (unit.combatState?.kind) {
    case 'vehicle':
    case 'proto':
      return (unit.combatState.state.altitude ?? 0) > 0;
    case 'aero':
      return isAirborneAeroState(unit);
    default:
      return false;
  }
}

export interface IRuntimeMovementAltitudeControlContext {
  readonly altitudeControlRequired: true;
  readonly altitudeControlMode: 'vtol' | 'wige';
  readonly altitudeControlAltitude: number;
  readonly blockedReason: string;
}

function altitudePositiveVehicleMotionControlMode(
  unit: IUnitGameState,
): 'vtol' | 'wige' | undefined {
  if (unit.combatState?.kind !== 'vehicle') return undefined;
  if ((unit.combatState.state.altitude ?? 0) <= 0) return undefined;
  switch (unit.combatState.state.motionType) {
    case GroundMotionType.VTOL:
      return 'vtol';
    case GroundMotionType.WIGE:
      return 'wige';
    default:
      return undefined;
  }
}

function altitudePositiveProtoControlMode(
  unit: IUnitGameState,
): 'wige' | undefined {
  if (unit.combatState?.kind !== 'proto') return undefined;
  if (unit.combatState.state.chassisType !== ProtoChassis.GLIDER) {
    return undefined;
  }
  return (unit.combatState.state.altitude ?? 0) > 0 ? 'wige' : undefined;
}

function normalizedLamAirMekAltitude(unit: IUnitGameState): number {
  const altitude = unit.lamAirMekAltitude;
  return altitude === undefined || !Number.isFinite(altitude)
    ? 0
    : Math.max(0, Math.floor(altitude));
}

function isLamAirMekAltitudeState(unit: IUnitGameState): boolean {
  return (
    unit.conversionMode === 1 ||
    unit.conversionMode === 'airmek' ||
    unit.conversionMode === 'airmech'
  );
}

function altitudeControlBlockedReason(mode: 'vtol' | 'wige'): string {
  return mode === 'vtol'
    ? AIRBORNE_VTOL_GROUND_MOVEMENT_BLOCKED_REASON
    : AIRBORNE_WIGE_GROUND_MOVEMENT_BLOCKED_REASON;
}

export function runtimeMovementAltitudeControlContext(
  unit: IUnitGameState,
): IRuntimeMovementAltitudeControlContext | undefined {
  const vehicleState =
    unit.combatState?.kind === 'vehicle' ? unit.combatState.state : undefined;
  const vehicleMode = altitudePositiveVehicleMotionControlMode(unit);
  if (vehicleState && vehicleMode) {
    return {
      altitudeControlRequired: true,
      altitudeControlMode: vehicleMode,
      altitudeControlAltitude: vehicleState.altitude ?? 0,
      blockedReason: altitudeControlBlockedReason(vehicleMode),
    };
  }

  const protoState =
    unit.combatState?.kind === 'proto' ? unit.combatState.state : undefined;
  const protoMode = altitudePositiveProtoControlMode(unit);
  if (protoState && protoMode) {
    return {
      altitudeControlRequired: true,
      altitudeControlMode: protoMode,
      altitudeControlAltitude: protoState.altitude ?? 0,
      blockedReason: altitudeControlBlockedReason(protoMode),
    };
  }

  const lamAirMekAltitude = normalizedLamAirMekAltitude(unit);
  if (lamAirMekAltitude <= 0 || !isLamAirMekAltitudeState(unit)) {
    return undefined;
  }
  return {
    altitudeControlRequired: true,
    altitudeControlMode: 'wige',
    altitudeControlAltitude: lamAirMekAltitude,
    blockedReason: AIRBORNE_LAM_AIRMEK_GROUND_MOVEMENT_BLOCKED_REASON,
  };
}

function airborneVtolOrWigeGroundMovementBlockedReason(
  movementMode: MovementTravelMode,
  unit: IUnitGameState,
): string | undefined {
  if (!isAltitudeTrackedAirborneState(unit)) return undefined;
  const altitudeContext = runtimeMovementAltitudeControlContext(unit);
  if (movementMode === 'vtol') {
    return AIRBORNE_VTOL_GROUND_MOVEMENT_BLOCKED_REASON;
  }
  if (altitudeContext?.altitudeControlMode === 'wige') {
    return movementMode === 'wige' ? undefined : altitudeContext.blockedReason;
  }
  if (altitudeContext) return altitudeContext.blockedReason;
  if (movementMode === 'wige') {
    return AIRBORNE_WIGE_GROUND_MOVEMENT_BLOCKED_REASON;
  }
  return undefined;
}

function isLamFighterMode(
  unit: IUnitGameState,
  profile: MovementUnitHeightProfile,
): boolean {
  return (
    profile.kind === 'lam' &&
    normalizedConversionMode(unit.conversionMode, profile) === 'fighter'
  );
}

function isLamAirMekMode(
  unit: IUnitGameState,
  profile: MovementUnitHeightProfile,
): boolean {
  return (
    profile.kind === 'lam' &&
    normalizedConversionMode(unit.conversionMode, profile) === 'airmek'
  );
}

export const AIRBORNE_LAM_FIGHTER_GROUND_MOVEMENT_BLOCKED_REASON =
  'Airborne LAM Fighter movement uses aerospace flight rules and is not available in the ground movement projection';

export const AIRBORNE_LAM_AIRMEK_GROUND_MOVEMENT_BLOCKED_REASON =
  'Airborne LAM AirMek movement uses airborne WiGE rules and is not available in the ground movement projection';

export const AIRBORNE_VTOL_GROUND_MOVEMENT_BLOCKED_REASON =
  'Airborne VTOL movement uses altitude controls and is not available in the ground movement projection';

export const AIRBORNE_WIGE_GROUND_MOVEMENT_BLOCKED_REASON =
  'Airborne WiGE movement uses altitude controls and is not available in the ground movement projection';

export const DESTROYED_GYRO_NON_TRACKED_MOVEMENT_BLOCKED_REASON =
  'Destroyed gyro only permits tracked or wheeled movement';

interface IRuntimeMovementRuleOptions {
  readonly optionalRules?: readonly string[];
}

export function runtimeMovementProjectionBlockedReason(
  unit: IUnitGameState,
  capability: IMovementCapability,
  movementMode: MovementTravelMode,
  ruleOptions: IRuntimeMovementRuleOptions = {},
): string | undefined {
  const profile = capability.unitHeightProfile;
  if (profile && isLamFighterMode(unit, profile) && isAirborneAeroState(unit)) {
    return AIRBORNE_LAM_FIGHTER_GROUND_MOVEMENT_BLOCKED_REASON;
  }
  if (profile && isLamAirMekMode(unit, profile) && isAirborneAeroState(unit)) {
    return AIRBORNE_LAM_AIRMEK_GROUND_MOVEMENT_BLOCKED_REASON;
  }
  if (
    profile &&
    isLamAirMekMode(unit, profile) &&
    normalizedLamAirMekAltitude(unit) > 0 &&
    movementMode !== 'wige'
  ) {
    return AIRBORNE_LAM_AIRMEK_GROUND_MOVEMENT_BLOCKED_REASON;
  }
  const airborneVtolOrWigeReason =
    airborneVtolOrWigeGroundMovementBlockedReason(movementMode, unit);
  if (airborneVtolOrWigeReason) return airborneVtolOrWigeReason;
  if (
    !unit.prone &&
    unit.componentDamage &&
    isGyroDestroyedForType(unit.componentDamage, unit.gyroType, {
      optionalRules: ruleOptions.optionalRules,
    }) &&
    movementMode !== 'tracked' &&
    movementMode !== 'wheeled'
  ) {
    return DESTROYED_GYRO_NON_TRACKED_MOVEMENT_BLOCKED_REASON;
  }
  return undefined;
}

function conversionModeMovementMode(
  unit: IUnitGameState,
  capability: IMovementCapability,
  profile: MovementUnitHeightProfile,
): MovementMotiveMode | undefined {
  const mode = normalizedConversionMode(unit.conversionMode, profile);
  if (profile.kind === 'lam' && mode === 'airmek') {
    return 'wige';
  }
  if (
    profile.kind === 'lam' &&
    mode === 'fighter' &&
    !isAirborneAeroState(unit)
  ) {
    return 'wheeled';
  }
  if (profile.kind === 'quadvee' && mode === 'vehicle') {
    return quadVeeVehicleMovementMode(unit, capability);
  }
  return undefined;
}

function conversionModeMovementPoints(
  unit: IUnitGameState,
  capability: IMovementCapability,
  profile: MovementUnitHeightProfile,
): Pick<IMovementCapability, 'walkMP' | 'runMP'> | undefined {
  const mode = normalizedConversionMode(unit.conversionMode, profile);
  if (profile.kind !== 'lam') return undefined;

  const thrust = Math.max(
    0,
    Math.floor(capability.conversionThrustMP ?? capability.jumpMP),
  );
  if (mode === 'airmek') {
    const walkMP = thrust * 3;
    return { walkMP, runMP: Math.ceil(walkMP * 1.5) };
  }

  if (mode === 'fighter') {
    if (isAirborneAeroState(unit)) {
      return { walkMP: thrust, runMP: Math.ceil(thrust * 1.5) };
    }
    const walkMP = Math.floor(thrust / 2);
    return { walkMP, runMP: walkMP };
  }

  return undefined;
}

function conversionModeJumpMP(
  unit: IUnitGameState,
  profile: MovementUnitHeightProfile,
): number | undefined {
  const mode = normalizedConversionMode(unit.conversionMode, profile);
  if (profile.kind === 'lam' && mode === 'fighter') return 0;
  return profile.kind === 'quadvee' && mode === 'vehicle' ? 0 : undefined;
}

function conversionModeMovementHeatProfile(
  unit: IUnitGameState,
  profile: MovementUnitHeightProfile,
): IMovementCapability['movementHeatProfile'] | undefined {
  const mode = normalizedConversionMode(unit.conversionMode, profile);
  return profile.kind === 'lam' && mode === 'airmek' ? 'airmek' : undefined;
}

function infantryMountHeight(
  unit: IUnitGameState,
  profile: MovementUnitHeightProfile | undefined,
  fallbackHeight: number | undefined,
  runtimeHeight: number | undefined,
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
    runtimeHeight ??
    (profile?.kind === 'infantry_mount' ? profile.mountedHeight : undefined) ??
    fallbackHeight;
  return normalizedHeight(mountedHeight);
}

export function runtimeUnitHeightForMovement(
  unit: IUnitGameState,
  capability: IMovementCapability,
): number | undefined {
  const profile = capability.unitHeightProfile;
  const explicitRuntimeHeight = normalizedHeight(unit.unitHeight);
  const mountedHeight = infantryMountHeight(
    unit,
    profile,
    capability.unitHeight,
    explicitRuntimeHeight,
  );
  if (mountedHeight !== undefined) return mountedHeight;

  if (explicitRuntimeHeight !== undefined) return explicitRuntimeHeight;

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
  const runtimeMovementPoints = profile
    ? conversionModeMovementPoints(unit, capability, profile)
    : undefined;
  const runtimeJumpMP = profile
    ? conversionModeJumpMP(unit, profile)
    : undefined;
  const runtimeMovementHeatProfile = profile
    ? conversionModeMovementHeatProfile(unit, profile)
    : undefined;

  if (
    (runtimeHeight === undefined || runtimeHeight === capability.unitHeight) &&
    (runtimeMovementMode === undefined ||
      runtimeMovementMode === capability.movementMode) &&
    (runtimeMovementPoints === undefined ||
      (runtimeMovementPoints.walkMP === capability.walkMP &&
        runtimeMovementPoints.runMP === capability.runMP)) &&
    (runtimeJumpMP === undefined || runtimeJumpMP === capability.jumpMP) &&
    (runtimeMovementHeatProfile === undefined ||
      runtimeMovementHeatProfile === capability.movementHeatProfile)
  ) {
    return capability;
  }

  return {
    ...capability,
    ...(runtimeHeight !== undefined ? { unitHeight: runtimeHeight } : {}),
    ...(runtimeMovementMode !== undefined
      ? { movementMode: runtimeMovementMode }
      : {}),
    ...(runtimeMovementPoints !== undefined ? runtimeMovementPoints : {}),
    ...(runtimeJumpMP !== undefined ? { jumpMP: runtimeJumpMP } : {}),
    ...(runtimeMovementHeatProfile !== undefined
      ? { movementHeatProfile: runtimeMovementHeatProfile }
      : {}),
    ...(profile?.kind === 'lam'
      ? {
          conversionThrustMP:
            capability.conversionThrustMP ?? capability.jumpMP,
        }
      : {}),
  };
}
