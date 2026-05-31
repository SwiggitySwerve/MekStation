import {
  GamePhase,
  type ITacticalCommand,
  type ITacticalCommandContext,
  type MovementConversionMode,
} from '@/types/gameplay';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { movementDeclarationLockInvalidState } from '@/utils/gameplay/movement';

import {
  normalizedCommandConversionMode,
  runtimeConversionActionUnavailableReason,
  runtimeConversionCommandMetadata,
} from './runtimeConversionRules';

export function buildRuntimeMovementStateCommands(
  ctx: ITacticalCommandContext | undefined,
): readonly ITacticalCommand[] {
  const commands: ITacticalCommand[] = [];
  if (hasVehicleAltitudeControl(ctx)) {
    commands.push(MovementAltitudeUpCommand, MovementAltitudeDownCommand);
  }

  const profile = ctx?.movementCapability?.unitHeightProfile;
  if (!profile) return commands;

  if (profile.kind === 'infantry_mount') {
    commands.push(
      MovementInfantryMountCommand,
      MovementInfantryDismountCommand,
    );
    return commands;
  }

  if (profile.kind === 'lam') {
    commands.push(
      createConversionCommand('mek', 'Mek Mode'),
      createConversionCommand('airmek', 'AirMek Mode'),
      createConversionCommand('fighter', 'Fighter Mode'),
    );
    return commands;
  }

  if (profile.kind === 'quadvee') {
    commands.push(
      createConversionCommand('mek', 'Mek Mode'),
      createConversionCommand('vehicle', 'Vehicle Mode'),
    );
    return commands;
  }

  return commands;
}

function runtimeStateUnavailableReason(
  ctx: ITacticalCommandContext,
): string | null {
  if (!ctx.activeUnitId) return 'No unit is active.';
  if (!ctx.canAct) return 'Not your turn.';
  const locked = movementDeclarationLockInvalidState(ctx.activeUnitLockState);
  return locked?.details ?? null;
}

function hasVehicleAltitudeControl(
  ctx: ITacticalCommandContext | undefined,
): boolean {
  return (
    ctx?.activeUnitVehicleMotionType === GroundMotionType.VTOL ||
    ctx?.activeUnitVehicleMotionType === GroundMotionType.WIGE
  );
}

function currentVehicleAltitude(ctx: ITacticalCommandContext): number {
  const altitude = ctx.activeUnitVehicleAltitude;
  return altitude === undefined || !Number.isFinite(altitude)
    ? 0
    : Math.max(0, Math.floor(altitude));
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

function maxVehicleAltitude(ctx: ITacticalCommandContext): number {
  return ctx.activeUnitVehicleMotionType === GroundMotionType.VTOL ? 50 : 1;
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
        reason: `Altitude controls are already at maximum altitude ${maxAltitude}.`,
      };
    }
    return { available: true };
  },
  commit(ctx) {
    return {
      actionId: 'runtime-movement-state',
      payload: {
        source: 'altitude_control_action',
        vehicleAltitude: currentVehicleAltitude(ctx) + 1,
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
    if (altitude <= 0) {
      return {
        available: false,
        reason: 'Altitude controls are already at altitude 0.',
      };
    }
    return { available: true };
  },
  commit(ctx) {
    return {
      actionId: 'runtime-movement-state',
      payload: {
        source: 'altitude_control_action',
        vehicleAltitude: currentVehicleAltitude(ctx) - 1,
        altitudeControlStepCount: 1,
        altitudeControlMpCost: 1,
      },
    };
  },
};

const MovementInfantryMountCommand: ITacticalCommand = {
  id: 'movement.infantryMount',
  category: 'movement',
  label: 'Mount',
  phaseConstraints: [GamePhase.Movement],
  requiresConfirmation: false,
  undoable: true,
  availability(ctx) {
    const unavailable = runtimeStateUnavailableReason(ctx);
    if (unavailable) return { available: false, reason: unavailable };
    if (ctx.movementCapability?.unitHeightProfile?.kind !== 'infantry_mount') {
      return {
        available: false,
        reason: 'Unit has no infantry mount profile.',
      };
    }
    if (ctx.activeUnitInfantryMounted !== false) {
      return { available: false, reason: 'Infantry is already mounted.' };
    }
    return { available: true };
  },
  commit(ctx) {
    const mountedHeight =
      ctx.activeUnitInfantryMountHeight ??
      (ctx.movementCapability?.unitHeightProfile?.kind === 'infantry_mount'
        ? ctx.movementCapability.unitHeightProfile.mountedHeight
        : undefined) ??
      ctx.movementCapability?.unitHeight;
    return {
      actionId: 'runtime-movement-state',
      payload: {
        source: 'infantry_mount_action',
        infantryMounted: true,
        ...(mountedHeight !== undefined
          ? { infantryMountHeight: mountedHeight }
          : {}),
      },
    };
  },
};

const MovementInfantryDismountCommand: ITacticalCommand = {
  id: 'movement.infantryDismount',
  category: 'movement',
  label: 'Dismount',
  phaseConstraints: [GamePhase.Movement],
  requiresConfirmation: false,
  undoable: true,
  availability(ctx) {
    const unavailable = runtimeStateUnavailableReason(ctx);
    if (unavailable) return { available: false, reason: unavailable };
    if (ctx.movementCapability?.unitHeightProfile?.kind !== 'infantry_mount') {
      return {
        available: false,
        reason: 'Unit has no infantry mount profile.',
      };
    }
    if (ctx.activeUnitInfantryMounted === false) {
      return { available: false, reason: 'Infantry is already dismounted.' };
    }
    return { available: true };
  },
  commit() {
    return {
      actionId: 'runtime-movement-state',
      payload: {
        source: 'infantry_mount_action',
        infantryMounted: false,
      },
    };
  },
};

function createConversionCommand(
  conversionMode: MovementConversionMode,
  label: string,
): ITacticalCommand {
  return {
    id: `movement.convert.${conversionMode}`,
    category: 'movement',
    label,
    phaseConstraints: [GamePhase.Movement],
    requiresConfirmation: false,
    undoable: true,
    availability(ctx) {
      const unavailable = runtimeStateUnavailableReason(ctx);
      if (unavailable) return { available: false, reason: unavailable };
      const profile = ctx.movementCapability?.unitHeightProfile;
      if (profile?.kind !== 'lam' && profile?.kind !== 'quadvee') {
        return {
          available: false,
          reason: 'Unit has no conversion movement profile.',
        };
      }
      if (
        normalizedCommandConversionMode(
          ctx.activeUnitConversionMode,
          profile,
        ) === normalizedCommandConversionMode(conversionMode, profile)
      ) {
        return {
          available: false,
          reason: `Unit is already in ${label}.`,
        };
      }
      const conversionUnavailable = runtimeConversionActionUnavailableReason(
        ctx,
        conversionMode,
      );
      if (conversionUnavailable) {
        return { available: false, reason: conversionUnavailable };
      }
      return { available: true };
    },
    commit(ctx) {
      const metadata = runtimeConversionCommandMetadata(ctx, conversionMode);

      return {
        actionId: 'runtime-movement-state',
        payload: {
          source: 'conversion_action',
          conversionMode,
          conversionStepCount: metadata.conversionStepCount,
          conversionMpCost: metadata.conversionMpCost,
          unitHeight: null,
        },
      };
    },
  };
}
