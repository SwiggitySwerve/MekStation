import {
  GamePhase,
  TerrainType,
  type ITacticalCommand,
  type ITacticalCommandContext,
} from '@/types/gameplay';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { terrainFeaturesFromString } from '@/utils/gameplay/terrainEncoding';
import { parseWaterDepth } from '@/utils/gameplay/waterDepth';

import { lamAirMekLandingControlPatch } from './runtimeAirMekLandingControl';
import { normalizedCommandConversionMode } from './runtimeConversionRules';
import { runtimeStateUnavailableReason } from './runtimeMovementStateAvailability';

export function buildRuntimeAltitudeCommands(
  ctx: ITacticalCommandContext | undefined,
): readonly ITacticalCommand[] {
  return hasVehicleAltitudeControl(ctx) ? RuntimeAltitudeControlCommands : [];
}

function hasVehicleAltitudeControl(
  ctx: ITacticalCommandContext | undefined,
): boolean {
  return (
    ctx?.activeUnitVehicleMotionType === GroundMotionType.VTOL ||
    ctx?.activeUnitVehicleMotionType === GroundMotionType.WIGE ||
    isLamAirMekWigeAltitudeControl(ctx) ||
    isProtoGliderWigeAltitudeControl(ctx)
  );
}

function isLamAirMekWigeAltitudeControl(
  ctx: ITacticalCommandContext | undefined,
): boolean {
  const profile = ctx?.movementCapability?.unitHeightProfile;
  return (
    profile?.kind === 'lam' &&
    normalizedCommandConversionMode(ctx?.activeUnitConversionMode, profile) ===
      'airmek' &&
    ctx?.movementCapability?.movementMode === 'wige'
  );
}

function isProtoGliderWigeAltitudeControl(
  ctx: ITacticalCommandContext | undefined,
): boolean {
  return (
    ctx?.activeUnitProtoGlider === true &&
    ctx.movementCapability?.movementMode === 'wige'
  );
}

function currentVehicleAltitude(ctx: ITacticalCommandContext): number {
  const altitude = isLamAirMekWigeAltitudeControl(ctx)
    ? ctx.activeUnitLamAirMekAltitude
    : isProtoGliderWigeAltitudeControl(ctx)
      ? ctx.activeUnitProtoAltitude
      : ctx.activeUnitVehicleAltitude;
  return altitude === undefined || !Number.isFinite(altitude)
    ? 0
    : Math.max(0, Math.floor(altitude));
}

function activeUnitBaseElevation(ctx: ITacticalCommandContext): number {
  const elevation = ctx.activeUnitElevation;
  return elevation === undefined || !Number.isFinite(elevation)
    ? 0
    : Math.floor(elevation);
}

function activeUnitHeight(ctx: ITacticalCommandContext): number {
  const height = ctx.movementCapability?.unitHeight;
  return height === undefined || !Number.isFinite(height)
    ? 0
    : Math.max(0, Math.floor(height));
}

function maxFeatureLevel(
  ctx: ITacticalCommandContext,
  terrainType: TerrainType,
): number {
  return Math.max(
    0,
    ...terrainFeaturesFromString(ctx.activeUnitTerrain ?? '')
      .filter((feature) => feature.type === terrainType)
      .map((feature) => feature.level),
  );
}

function activeUnitWaterDepth(ctx: ITacticalCommandContext): number {
  return parseWaterDepth(ctx.activeUnitTerrain ?? '');
}

function activeUnitWoodsFoliageElevation(ctx: ITacticalCommandContext): number {
  const hasWoods = terrainFeaturesFromString(ctx.activeUnitTerrain ?? '').some(
    (feature) =>
      feature.type === TerrainType.LightWoods ||
      feature.type === TerrainType.HeavyWoods,
  );
  // MegaMek gates VTOL/WiGE landing below FOLIAGE_ELEV + 1. MekStation does
  // not yet encode FOLIAGE_ELEV separately, so use the represented LOS height.
  return hasWoods ? 2 : 0;
}

function maxVehicleAltitude(ctx: ITacticalCommandContext): number {
  const baseElevation = activeUnitBaseElevation(ctx);
  const bridgeLevel = maxFeatureLevel(ctx, TerrainType.Bridge);
  const altitude = currentVehicleAltitude(ctx);

  if (isProtoGliderWigeAltitudeControl(ctx)) {
    return 12;
  }

  if (isLamAirMekWigeAltitudeControl(ctx)) {
    return 25;
  }

  if (ctx.activeUnitVehicleMotionType === GroundMotionType.VTOL) {
    if (bridgeLevel > 0 && altitude < bridgeLevel) {
      return Math.max(0, bridgeLevel - activeUnitHeight(ctx) - 1);
    }
    return 50;
  }

  if (ctx.activeUnitVehicleMotionType === GroundMotionType.WIGE) {
    const buildingLevel = maxFeatureLevel(ctx, TerrainType.Building);
    if (buildingLevel > 0) {
      return Math.max(
        0,
        Math.max(baseElevation, buildingLevel) + 1 - baseElevation,
      );
    }
    return 1;
  }

  return 0;
}

function climbClearanceBlockedReason(
  ctx: ITacticalCommandContext,
): string | null {
  const altitude = currentVehicleAltitude(ctx);
  if (
    ctx.activeUnitVehicleMotionType !== GroundMotionType.VTOL ||
    altitude < maxVehicleAltitude(ctx)
  ) {
    return null;
  }

  const bridgeLevel = maxFeatureLevel(ctx, TerrainType.Bridge);
  if (bridgeLevel > 0 && altitude < bridgeLevel) {
    return `Bridge clearance blocks climbing from altitude ${altitude}.`;
  }

  return null;
}

function minVehicleAltitude(ctx: ITacticalCommandContext): number {
  const altitude = currentVehicleAltitude(ctx);
  let minElevation = 0;
  const bridgeLevel = maxFeatureLevel(ctx, TerrainType.Bridge);
  if (bridgeLevel > 0 && altitude >= bridgeLevel) {
    minElevation = Math.max(minElevation, bridgeLevel);
  }

  const waterDepth = activeUnitWaterDepth(ctx);
  if (waterDepth > 0 && !isLamAirMekWigeAltitudeControl(ctx)) {
    minElevation = Math.max(minElevation, 1);
  }

  const woodsFoliageElevation = activeUnitWoodsFoliageElevation(ctx);
  if (woodsFoliageElevation > 0) {
    minElevation = Math.max(minElevation, woodsFoliageElevation + 1);
  }

  const buildingLevel = maxFeatureLevel(ctx, TerrainType.Building);
  if (buildingLevel > 0) {
    minElevation = Math.max(minElevation, buildingLevel - waterDepth);
  }

  return Math.max(0, minElevation);
}

function altitudeControlUnavailableReason(
  ctx: ITacticalCommandContext,
): string | null {
  const unavailable = runtimeStateUnavailableReason(ctx);
  if (unavailable) return unavailable;
  if (!hasVehicleAltitudeControl(ctx)) {
    return 'Unit has no represented VTOL/WiGE altitude controls.';
  }
  if (ctx.activeUnitHasPlannedMovement) {
    return 'Clear the current movement preview before changing altitude.';
  }
  return null;
}

function altitudeControlAltitudePatch(
  ctx: ITacticalCommandContext,
  altitude: number,
):
  | { readonly lamAirMekAltitude: number }
  | { readonly protoAltitude: number }
  | { readonly vehicleAltitude: number } {
  if (isLamAirMekWigeAltitudeControl(ctx)) {
    return { lamAirMekAltitude: altitude };
  }
  if (isProtoGliderWigeAltitudeControl(ctx)) {
    return { protoAltitude: altitude };
  }
  return { vehicleAltitude: altitude };
}

const MovementAltitudeUpCommand: ITacticalCommand = {
  id: 'movement.altitudeUp',
  category: 'movement',
  label: 'Climb',
  phaseConstraints: [GamePhase.Movement],
  requiresConfirmation: false,
  undoable: true,
  availability(ctx) {
    const unavailable = altitudeControlUnavailableReason(ctx);
    if (unavailable) return { available: false, reason: unavailable };
    const altitude = currentVehicleAltitude(ctx);
    const maxAltitude = maxVehicleAltitude(ctx);
    if (altitude >= maxAltitude) {
      return {
        available: false,
        reason:
          climbClearanceBlockedReason(ctx) ??
          `Altitude controls are already at maximum altitude ${maxAltitude}.`,
      };
    }
    return { available: true };
  },
  commit(ctx) {
    return {
      actionId: 'runtime-movement-state',
      payload: {
        source: 'altitude_control_action',
        ...altitudeControlAltitudePatch(ctx, currentVehicleAltitude(ctx) + 1),
        altitudeControlStepCount: 1,
        altitudeControlMpCost: 1,
      },
    };
  },
};

const MovementAltitudeDownCommand: ITacticalCommand = {
  id: 'movement.altitudeDown',
  category: 'movement',
  label: 'Descend',
  phaseConstraints: [GamePhase.Movement],
  requiresConfirmation: false,
  undoable: true,
  availability(ctx) {
    const unavailable = altitudeControlUnavailableReason(ctx);
    if (unavailable) return { available: false, reason: unavailable };
    const altitude = currentVehicleAltitude(ctx);
    const minAltitude = minVehicleAltitude(ctx);
    if (altitude <= 0 && minAltitude <= 0) {
      return {
        available: false,
        reason: 'Altitude controls are already at altitude 0.',
      };
    }
    if (altitude <= minAltitude) {
      return {
        available: false,
        reason: `Altitude controls cannot descend below altitude ${minAltitude} over this terrain.`,
      };
    }
    return { available: true };
  },
  commit(ctx) {
    const currentAltitude = currentVehicleAltitude(ctx);
    const nextAltitude = currentAltitude - 1;
    return {
      actionId: 'runtime-movement-state',
      payload: {
        source: 'altitude_control_action',
        ...altitudeControlAltitudePatch(ctx, nextAltitude),
        ...lamAirMekLandingControlPatch(ctx, currentAltitude, nextAltitude),
        altitudeControlStepCount: 1,
        altitudeControlMpCost: 1,
      },
    };
  },
};

const RuntimeAltitudeControlCommands: readonly ITacticalCommand[] = [
  MovementAltitudeUpCommand,
  MovementAltitudeDownCommand,
];
