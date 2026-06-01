import type {
  IHexCoordinate,
  IMovementRangeHex,
  IUnitGameState,
} from '@/types/gameplay';
import type { IRuntimeMovementStateChangedPayload } from '@/types/gameplay/GameSessionMovementEvents';

import { MovementType } from '@/types/gameplay';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';
import { hexDistance } from '@/utils/gameplay/hexMath';

export const AUTOMATIC_WIGE_LANDING_REASON =
  'MegaMek automatic WiGE landing: unit moved below the minimum airborne distance';

interface IAutomaticWigeLandingOwner {
  readonly kind: 'vehicle' | 'proto' | 'lam';
  readonly altitude: number;
  readonly minimumDistance: number;
}

export interface IAutomaticWigeLandingContext {
  readonly automaticLandingRequired: true;
  readonly automaticLandingReason: string;
  readonly automaticLandingMode: 'wige';
  readonly automaticLandingDistance: number;
  readonly automaticLandingMinimumDistance: number;
}

interface IAutomaticWigeLandingOptions {
  readonly movementMode?: string;
}

function normalizedAltitude(value: number | undefined): number {
  return value === undefined || !Number.isFinite(value)
    ? 0
    : Math.max(0, Math.floor(value));
}

function isLamAirMekMode(unit: IUnitGameState): boolean {
  return (
    unit.conversionMode === 1 ||
    unit.conversionMode === 'airmek' ||
    unit.conversionMode === 'airmech'
  );
}

function automaticWigeLandingOwner(
  unit: IUnitGameState,
): IAutomaticWigeLandingOwner | undefined {
  if (
    unit.combatState?.kind === 'vehicle' &&
    unit.combatState.state.motionType === GroundMotionType.WIGE
  ) {
    const altitude = normalizedAltitude(unit.combatState.state.altitude);
    return altitude > 0
      ? { kind: 'vehicle', altitude, minimumDistance: 5 }
      : undefined;
  }

  if (
    unit.combatState?.kind === 'proto' &&
    unit.combatState.state.chassisType === ProtoChassis.GLIDER
  ) {
    const altitude = normalizedAltitude(unit.combatState.state.altitude);
    return altitude > 0
      ? { kind: 'proto', altitude, minimumDistance: 4 }
      : undefined;
  }

  if (isLamAirMekMode(unit)) {
    const altitude = normalizedAltitude(unit.lamAirMekAltitude);
    return altitude > 0
      ? { kind: 'lam', altitude, minimumDistance: 5 }
      : undefined;
  }

  return undefined;
}

function pathHexesMoved(
  origin: IHexCoordinate,
  destination: IHexCoordinate,
  path: readonly IHexCoordinate[] | undefined,
): number {
  if (path && path.length > 1) return path.length - 1;
  return hexDistance(origin, destination);
}

function hexesMovedThisTurn(
  unit: Pick<IUnitGameState, 'hexesMovedThisTurn'>,
): number {
  const moved = unit.hexesMovedThisTurn;
  return moved === undefined || !Number.isFinite(moved)
    ? 0
    : Math.max(0, Math.floor(moved));
}

function isHoverExemptMovement(options: IAutomaticWigeLandingOptions): boolean {
  return options.movementMode === 'hover';
}

export function automaticWigeLandingContext(
  unit: IUnitGameState,
  movementType: MovementType,
  path: readonly IHexCoordinate[] | undefined,
  destination: IHexCoordinate,
  options: IAutomaticWigeLandingOptions = {},
): IAutomaticWigeLandingContext | undefined {
  const owner = automaticWigeLandingOwner(unit);
  if (!owner) return undefined;
  if (movementType === MovementType.Jump) return undefined;
  if (isHoverExemptMovement(options)) return undefined;
  if (normalizedAltitudeControlSteps(unit) > 0) return undefined;

  const distance =
    hexesMovedThisTurn(unit) + pathHexesMoved(unit.position, destination, path);
  if (distance >= owner.minimumDistance) return undefined;

  return {
    automaticLandingRequired: true,
    automaticLandingReason: AUTOMATIC_WIGE_LANDING_REASON,
    automaticLandingMode: 'wige',
    automaticLandingDistance: distance,
    automaticLandingMinimumDistance: owner.minimumDistance,
  };
}

export function withAutomaticWigeLandingProjection(
  movementHex: IMovementRangeHex,
  unit: IUnitGameState,
): IMovementRangeHex {
  if (!movementHex.reachable) return movementHex;
  const context = automaticWigeLandingContext(
    unit,
    movementHex.movementType,
    movementHex.path,
    movementHex.hex,
    { movementMode: movementHex.movementMode },
  );
  return context ? { ...movementHex, ...context } : movementHex;
}

export function automaticWigeLandingRuntimePatch(
  unit: IUnitGameState,
  movementType: MovementType,
  path: readonly IHexCoordinate[] | undefined,
  destination: IHexCoordinate,
  options: IAutomaticWigeLandingOptions = {},
): Omit<IRuntimeMovementStateChangedPayload, 'unitId'> | undefined {
  const owner = automaticWigeLandingOwner(unit);
  const context = automaticWigeLandingContext(
    unit,
    movementType,
    path,
    destination,
    options,
  );
  if (!owner || !context) return undefined;

  switch (owner.kind) {
    case 'vehicle':
      return { source: 'automatic_wige_landing', vehicleAltitude: 0 };
    case 'proto':
      return { source: 'automatic_wige_landing', protoAltitude: 0 };
    case 'lam':
      return { source: 'automatic_wige_landing', lamAirMekAltitude: 0 };
  }
}

function normalizedAltitudeControlSteps(
  unit: Pick<IUnitGameState, 'pendingAltitudeControlStepCount'>,
): number {
  const steps = unit.pendingAltitudeControlStepCount;
  return steps === undefined || !Number.isFinite(steps)
    ? 0
    : Math.max(0, Math.floor(steps));
}
