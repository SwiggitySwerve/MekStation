import { getHeatMovementPenalty } from '@/constants/heat';
import {
  GamePhase,
  MovementType,
  type IMovementRangeHex,
  type IMovementRangeModeOption,
  type ITacticalCommand,
  type ITacticalCommandContext,
} from '@/types/gameplay';
import {
  getMaxMP,
  isMekStyleHullDownExitCapability,
} from '@/utils/gameplay/movement';

import { movementActiveTurnUnavailableReason } from './movementCommandAvailability';

type MovementTraversalMode = 'walk' | 'run' | 'sprint' | 'evade' | 'jump';

interface IMovementTraversalCommandConfig {
  readonly id: string;
  readonly label: string;
  readonly hotkey: string;
  readonly movementType: MovementType;
  readonly payloadMode: MovementTraversalMode;
  readonly capabilityLabel: MovementTraversalMode;
  readonly extraUnavailableReason?: (
    ctx: ITacticalCommandContext,
  ) => string | null;
}

const MOVEMENT_TRAVERSAL_COMMAND_CONFIGS = [
  {
    id: 'movement.walk',
    label: 'Walk',
    hotkey: 'W',
    movementType: MovementType.Walk,
    payloadMode: 'walk',
    capabilityLabel: 'walk',
  },
  {
    id: 'movement.run',
    label: 'Run',
    hotkey: 'R',
    movementType: MovementType.Run,
    payloadMode: 'run',
    capabilityLabel: 'run',
  },
  {
    id: 'movement.sprint',
    label: 'Sprint',
    hotkey: 'S',
    movementType: MovementType.Sprint,
    payloadMode: 'sprint',
    capabilityLabel: 'sprint',
  },
  {
    id: 'movement.evade',
    label: 'Evade',
    hotkey: 'E',
    movementType: MovementType.Evade,
    payloadMode: 'evade',
    capabilityLabel: 'evade',
  },
  {
    id: 'movement.jump',
    label: 'Jump',
    hotkey: 'J',
    movementType: MovementType.Jump,
    payloadMode: 'jump',
    capabilityLabel: 'jump',
    extraUnavailableReason: jumpMovementUnavailableReason,
  },
] as const satisfies readonly IMovementTraversalCommandConfig[];

export const MovementTraversalCommands: readonly ITacticalCommand[] =
  MOVEMENT_TRAVERSAL_COMMAND_CONFIGS.map(createMovementTraversalCommand);

function createMovementTraversalCommand(
  config: IMovementTraversalCommandConfig,
): ITacticalCommand {
  return {
    id: config.id,
    category: 'movement',
    label: config.label,
    hotkey: config.hotkey,
    phaseConstraints: [GamePhase.Movement],
    requiresConfirmation: false,
    undoable: true,
    targetsHex: true,
    availability(ctx) {
      const unavailable = movementActiveTurnUnavailableReason(ctx);
      if (unavailable) return { available: false, reason: unavailable };

      const modeUnavailable = movementModeUnavailableReason(
        ctx,
        config.movementType,
        config.capabilityLabel,
      );
      if (modeUnavailable) {
        return { available: false, reason: modeUnavailable };
      }

      const extraUnavailable = config.extraUnavailableReason?.(ctx);
      if (extraUnavailable) {
        return { available: false, reason: extraUnavailable };
      }

      const destinationUnavailable = movementProjectionUnavailableReason(
        ctx,
        config.movementType,
      );
      if (destinationUnavailable) {
        return { available: false, reason: destinationUnavailable };
      }

      return { available: true };
    },
    commit() {
      return { actionId: 'lock', payload: { mode: config.payloadMode } };
    },
  };
}

function jumpMovementUnavailableReason(
  ctx: ITacticalCommandContext,
): string | null {
  if (ctx.activeUnitProne === true) {
    return 'Unit is prone and must stand before jumping.';
  }
  if (
    ctx.activeUnitHullDown === true &&
    ctx.movementCapability &&
    isMekStyleHullDownExitCapability(ctx.movementCapability)
  ) {
    return 'Unit is hull-down and must stand before jumping.';
  }
  return null;
}

function movementModeUnavailableReason(
  ctx: ITacticalCommandContext,
  movementType: MovementType,
  label: MovementTraversalMode,
): string | null {
  if (!ctx.movementCapability) return null;

  const rawMP = getMaxMP(ctx.movementCapability, movementType);
  if (rawMP <= 0) return `No ${label} capability.`;

  const heatPenalty = getHeatMovementPenalty(ctx.activeUnitHeat ?? 0);
  const effectiveMP = getMaxMP(
    ctx.movementCapability,
    movementType,
    heatPenalty,
  );
  if (effectiveMP <= 0) return `Heat penalty leaves no ${label} MP.`;

  return null;
}

function movementProjectionUnavailableReason(
  ctx: ITacticalCommandContext,
  movementType: MovementType,
): string | null {
  const projection = ctx.targetMovementProjection;
  if (!projection) return null;

  const option = projection.movementModeOptions?.find(
    (candidate) => candidate.movementType === movementType,
  );
  if (option) {
    return option.reachable ? null : movementProjectionBlockedReason(option);
  }

  if (projection.movementType !== movementType) return null;
  return projection.reachable
    ? null
    : movementProjectionBlockedReason(projection);
}

function movementProjectionBlockedReason(
  projection: IMovementRangeHex | IMovementRangeModeOption,
): string {
  return (
    projection.movementInvalidDetails ??
    projection.blockedReason ??
    projection.movementInvalidReason ??
    'Destination is not reachable.'
  );
}
