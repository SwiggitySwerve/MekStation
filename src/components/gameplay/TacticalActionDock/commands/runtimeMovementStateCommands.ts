import {
  GamePhase,
  type ITacticalCommand,
  type ITacticalCommandContext,
  type MovementConversionMode,
} from '@/types/gameplay';

import { buildRuntimeAltitudeCommands } from './runtimeAltitudeCommands';
import {
  normalizedCommandConversionMode,
  runtimeLamAirMekAutomaticLandingPatch,
  runtimeConversionActionUnavailableReason,
  runtimeConversionCommandMetadata,
} from './runtimeConversionRules';
import { runtimeStateUnavailableReason } from './runtimeMovementStateAvailability';

export function buildRuntimeMovementStateCommands(
  ctx: ITacticalCommandContext | undefined,
): readonly ITacticalCommand[] {
  const commands: ITacticalCommand[] = [...buildRuntimeAltitudeCommands(ctx)];

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
          ...runtimeLamAirMekAutomaticLandingPatch(ctx, conversionMode),
          unitHeight: null,
        },
      };
    },
  };
}
