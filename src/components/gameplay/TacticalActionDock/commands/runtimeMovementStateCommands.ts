import {
  GamePhase,
  type ITacticalCommand,
  type ITacticalCommandContext,
  type MovementConversionMode,
} from '@/types/gameplay';
import { movementDeclarationLockInvalidState } from '@/utils/gameplay/movement';

export function buildRuntimeMovementStateCommands(
  ctx: ITacticalCommandContext | undefined,
): readonly ITacticalCommand[] {
  const profile = ctx?.movementCapability?.unitHeightProfile;
  if (!profile) return [];

  if (profile.kind === 'infantry_mount') {
    return [MovementInfantryMountCommand, MovementInfantryDismountCommand];
  }

  if (profile.kind === 'lam') {
    return [
      createConversionCommand('mek', 'Mek Mode'),
      createConversionCommand('airmek', 'AirMek Mode'),
      createConversionCommand('fighter', 'Fighter Mode'),
    ];
  }

  if (profile.kind === 'quadvee') {
    return [
      createConversionCommand('mek', 'Mek Mode'),
      createConversionCommand('vehicle', 'Vehicle Mode'),
    ];
  }

  return [];
}

function runtimeStateUnavailableReason(
  ctx: ITacticalCommandContext,
): string | null {
  if (!ctx.activeUnitId) return 'No unit is active.';
  if (!ctx.canAct) return 'Not your turn.';
  const locked = movementDeclarationLockInvalidState(ctx.activeUnitLockState);
  return locked?.details ?? null;
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
      return { available: true };
    },
    commit() {
      return {
        actionId: 'runtime-movement-state',
        payload: {
          source: 'conversion_action',
          conversionMode,
          unitHeight: null,
        },
      };
    },
  };
}

function normalizedCommandConversionMode(
  value: MovementConversionMode | number | undefined,
  profile: NonNullable<
    ITacticalCommandContext['movementCapability']
  >['unitHeightProfile'],
): 'mek' | 'airmek' | 'fighter' | 'vehicle' | undefined {
  if (!profile) return undefined;
  if (value === undefined) return 'mek';

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
