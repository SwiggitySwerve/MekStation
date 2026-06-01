/**
 * Movement command family — walk, run, jump, stand-up, stabilize, cancel.
 *
 * Wave 7.2 PR-D: command adapters bind to `activeUnitId` (whose turn it is)
 * from the tactical shell. Availability predicates are PURE — same input,
 * same output, no store reads. The dock and context menus call these
 * factories with the same context and surface the same commands.
 *
 * Engine integration is via the existing `onAction(actionId, payload?)`
 * channel — `commit()` returns the actionId string and mode payload the
 * dock forwards to the existing `GameplayLayout` plumbing. The future
 * direct-dispatch refactor (Wave 7.4+) replaces this thin adapter with
 * an `engineMutation` payload; today's PR-D stays compatible with the
 * existing `getPhaseActions` action ids.
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 * @see openspec/changes/add-tactical-action-menu-system/tasks.md §1.2
 */

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
  getHullDownEntryCost,
  getMaxMP,
  getStandingCost,
  hullDownSupportDestroyedReason,
  isMekStyleHullDownExitCapability,
  movementDeclarationLockInvalidState,
} from '@/utils/gameplay/movement';

import { buildRuntimeMovementStateCommands } from './runtimeMovementStateCommands';

/**
 * Build the movement-family command list for the current active unit.
 *
 * TODO(wave-8): gate by `viewerPlayerId === activeUnit.ownerId` once
 * multi-viewer command authorization lands. Today every movement
 * command is visible to the local viewer when an active unit exists.
 */
export function buildMovementCommands(
  ctx?: ITacticalCommandContext,
): readonly ITacticalCommand[] {
  return [
    MovementWalkCommand,
    MovementRunCommand,
    MovementJumpCommand,
    MovementStandCommand,
    MovementCarefulStandCommand,
    MovementHullDownCommand,
    MovementGoProneCommand,
    ...buildRuntimeMovementStateCommands(ctx),
    MovementStabilizeCommand,
    MovementCancelCommand,
  ];
}

const MovementWalkCommand: ITacticalCommand = {
  id: 'movement.walk',
  category: 'movement',
  label: 'Walk',
  hotkey: 'W',
  phaseConstraints: [GamePhase.Movement],
  requiresConfirmation: false,
  undoable: true,
  targetsHex: true,
  availability(ctx: ITacticalCommandContext) {
    if (!ctx.activeUnitId) {
      return { available: false, reason: 'No unit is active.' };
    }
    if (!ctx.canAct) {
      return { available: false, reason: 'Not your turn.' };
    }
    const locked = movementDeclarationLockInvalidState(ctx.activeUnitLockState);
    if (locked) {
      return { available: false, reason: locked.details };
    }
    const modeUnavailable = movementModeUnavailableReason(
      ctx,
      MovementType.Walk,
      'walk',
    );
    if (modeUnavailable) {
      return { available: false, reason: modeUnavailable };
    }
    const destinationUnavailable = movementProjectionUnavailableReason(
      ctx,
      MovementType.Walk,
    );
    if (destinationUnavailable) {
      return { available: false, reason: destinationUnavailable };
    }
    return { available: true };
  },
  commit() {
    // Walk commits by locking the previewed path. Today the existing
    // GameplayLayout plumbing handles this through the `lock` action id.
    return { actionId: 'lock', payload: { mode: 'walk' } };
  },
};

const MovementRunCommand: ITacticalCommand = {
  id: 'movement.run',
  category: 'movement',
  label: 'Run',
  hotkey: 'R',
  phaseConstraints: [GamePhase.Movement],
  requiresConfirmation: false,
  undoable: true,
  targetsHex: true,
  availability(ctx) {
    if (!ctx.activeUnitId)
      return { available: false, reason: 'No unit is active.' };
    if (!ctx.canAct) return { available: false, reason: 'Not your turn.' };
    const locked = movementDeclarationLockInvalidState(ctx.activeUnitLockState);
    if (locked) return { available: false, reason: locked.details };
    const modeUnavailable = movementModeUnavailableReason(
      ctx,
      MovementType.Run,
      'run',
    );
    if (modeUnavailable) {
      return { available: false, reason: modeUnavailable };
    }
    const destinationUnavailable = movementProjectionUnavailableReason(
      ctx,
      MovementType.Run,
    );
    if (destinationUnavailable) {
      return { available: false, reason: destinationUnavailable };
    }
    return { available: true };
  },
  commit() {
    return { actionId: 'lock', payload: { mode: 'run' } };
  },
};

const MovementJumpCommand: ITacticalCommand = {
  id: 'movement.jump',
  category: 'movement',
  label: 'Jump',
  hotkey: 'J',
  phaseConstraints: [GamePhase.Movement],
  requiresConfirmation: false,
  undoable: true,
  targetsHex: true,
  availability(ctx) {
    if (!ctx.activeUnitId)
      return { available: false, reason: 'No unit is active.' };
    if (!ctx.canAct) return { available: false, reason: 'Not your turn.' };
    const locked = movementDeclarationLockInvalidState(ctx.activeUnitLockState);
    if (locked) return { available: false, reason: locked.details };
    const modeUnavailable = movementModeUnavailableReason(
      ctx,
      MovementType.Jump,
      'jump',
    );
    if (modeUnavailable) {
      return { available: false, reason: modeUnavailable };
    }
    if (ctx.activeUnitProne === true) {
      return {
        available: false,
        reason: 'Unit is prone and must stand before jumping.',
      };
    }
    if (
      ctx.activeUnitHullDown === true &&
      ctx.movementCapability &&
      isMekStyleHullDownExitCapability(ctx.movementCapability)
    ) {
      return {
        available: false,
        reason: 'Unit is hull-down and must stand before jumping.',
      };
    }
    const destinationUnavailable = movementProjectionUnavailableReason(
      ctx,
      MovementType.Jump,
    );
    if (destinationUnavailable) {
      return { available: false, reason: destinationUnavailable };
    }
    return { available: true };
  },
  commit() {
    return { actionId: 'lock', payload: { mode: 'jump' } };
  },
};

function movementModeUnavailableReason(
  ctx: ITacticalCommandContext,
  movementType: MovementType,
  label: 'walk' | 'run' | 'jump',
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

const MovementStandCommand: ITacticalCommand = {
  id: 'movement.stand',
  category: 'movement',
  label: 'Stand Up',
  phaseConstraints: [GamePhase.Movement],
  requiresConfirmation: false,
  undoable: true,
  availability(ctx) {
    if (!ctx.activeUnitId)
      return { available: false, reason: 'No unit is active.' };
    if (!ctx.canAct) return { available: false, reason: 'Not your turn.' };
    const locked = movementDeclarationLockInvalidState(ctx.activeUnitLockState);
    if (locked) return { available: false, reason: locked.details };
    if (ctx.activeUnitProne !== true && ctx.activeUnitHullDown !== true) {
      return { available: false, reason: 'Unit is not prone or hull-down.' };
    }
    if (!ctx.movementCapability) {
      return { available: false, reason: 'No movement capability.' };
    }
    if (
      ctx.activeUnitProne !== true &&
      !isMekStyleHullDownExitCapability(ctx.movementCapability)
    ) {
      return {
        available: false,
        reason:
          'Hull-down stand action is only available for Mek-style movement.',
      };
    }
    if (ctx.activeUnitProne === true && ctx.activeUnitStandUpImpossibleReason) {
      return {
        available: false,
        reason: ctx.activeUnitStandUpImpossibleReason,
      };
    }
    if (ctx.movementCapability.walkMP <= 0) {
      return { available: false, reason: 'Unit cannot stand.' };
    }
    const standingCost = getStandingCost(ctx.movementCapability);
    const heatPenalty = getHeatMovementPenalty(ctx.activeUnitHeat ?? 0);
    const effectiveWalkMP = getMaxMP(
      ctx.movementCapability,
      MovementType.Walk,
      heatPenalty,
    );
    const effectiveRunMP = getMaxMP(
      ctx.movementCapability,
      MovementType.Run,
      heatPenalty,
    );
    if (Math.max(effectiveWalkMP, effectiveRunMP) < standingCost) {
      return {
        available: false,
        reason:
          heatPenalty > 0
            ? `Needs ${standingCost} MP to stand after heat penalty.`
            : `Needs ${standingCost} MP to stand.`,
      };
    }
    return { available: true };
  },
  commit() {
    return { actionId: 'stand', payload: {} };
  },
};

const MovementCarefulStandCommand: ITacticalCommand = {
  id: 'movement.carefulStand',
  category: 'movement',
  label: 'Careful Stand',
  phaseConstraints: [GamePhase.Movement],
  requiresConfirmation: false,
  undoable: true,
  availability(ctx) {
    const base = MovementStandCommand.availability(ctx);
    if (!base.available) return base;
    if (ctx.activeUnitHullDown === true && ctx.activeUnitProne !== true) {
      return {
        available: false,
        reason: 'Careful Stand is only available when prone.',
      };
    }
    if (!ctx.movementCapability) {
      return { available: false, reason: 'No movement capability.' };
    }
    const heatPenalty = getHeatMovementPenalty(ctx.activeUnitHeat ?? 0);
    const effectiveWalkMP = getMaxMP(
      ctx.movementCapability,
      MovementType.Walk,
      heatPenalty,
    );
    if (effectiveWalkMP <= 2) {
      return {
        available: false,
        reason:
          heatPenalty > 0
            ? 'Careful Stand needs more than 2 walk MP after heat penalty.'
            : 'Careful Stand needs more than 2 walk MP.',
      };
    }
    return { available: true };
  },
  commit() {
    return { actionId: 'stand-careful', payload: { mode: 'careful' } };
  },
};

const MovementHullDownCommand: ITacticalCommand = {
  id: 'movement.hullDown',
  category: 'movement',
  label: 'Hull Down',
  phaseConstraints: [GamePhase.Movement],
  requiresConfirmation: false,
  undoable: true,
  availability(ctx) {
    if (!ctx.activeUnitId)
      return { available: false, reason: 'No unit is active.' };
    if (!ctx.canAct) return { available: false, reason: 'Not your turn.' };
    const locked = movementDeclarationLockInvalidState(ctx.activeUnitLockState);
    if (locked) return { available: false, reason: locked.details };
    if (ctx.activeUnitHullDown === true) {
      return { available: false, reason: 'Unit is already hull-down.' };
    }
    if (!ctx.movementCapability) {
      return { available: false, reason: 'No movement capability.' };
    }
    if (!isMekStyleHullDownExitCapability(ctx.movementCapability)) {
      return {
        available: false,
        reason: 'Hull-down entry is only available for Mek-style movement.',
      };
    }
    const entryUnit = {
      componentDamage: ctx.activeUnitComponentDamage,
      destroyedLocations: ctx.activeUnitDestroyedLocations ?? [],
      hullDown: ctx.activeUnitHullDown ?? false,
      prone: ctx.activeUnitProne ?? false,
    };
    const destroyedSupportReason = hullDownSupportDestroyedReason(
      entryUnit,
      ctx.movementCapability,
    );
    if (destroyedSupportReason) {
      return { available: false, reason: `${destroyedSupportReason}.` };
    }
    const hullDownEntryCost = getHullDownEntryCost(
      entryUnit,
      ctx.movementCapability,
    );
    const heatPenalty = getHeatMovementPenalty(ctx.activeUnitHeat ?? 0);
    const effectiveWalkMP = getMaxMP(
      ctx.movementCapability,
      MovementType.Walk,
      heatPenalty,
    );
    if (effectiveWalkMP < hullDownEntryCost) {
      return {
        available: false,
        reason:
          heatPenalty > 0
            ? `Needs ${hullDownEntryCost} MP to enter hull-down after heat penalty.`
            : `Needs ${hullDownEntryCost} MP to enter hull-down.`,
      };
    }
    return { available: true };
  },
  commit() {
    return { actionId: 'hull-down', payload: {} };
  },
};

const MovementGoProneCommand: ITacticalCommand = {
  id: 'movement.goProne',
  category: 'movement',
  label: 'Go Prone',
  phaseConstraints: [GamePhase.Movement],
  requiresConfirmation: false,
  undoable: true,
  availability(ctx) {
    if (!ctx.activeUnitId)
      return { available: false, reason: 'No unit is active.' };
    if (!ctx.canAct) return { available: false, reason: 'Not your turn.' };
    const locked = movementDeclarationLockInvalidState(ctx.activeUnitLockState);
    if (locked) return { available: false, reason: locked.details };
    if (ctx.activeUnitProne === true) {
      return { available: false, reason: 'Unit is already prone.' };
    }
    if (ctx.activeUnitHullDown !== true) {
      return { available: false, reason: 'Unit must be hull-down.' };
    }
    if (!ctx.movementCapability) {
      return { available: false, reason: 'No movement capability.' };
    }
    if (!isMekStyleHullDownExitCapability(ctx.movementCapability)) {
      return {
        available: false,
        reason:
          'Hull-down go-prone action is only available for Mek-style movement.',
      };
    }
    return { available: true };
  },
  commit() {
    return { actionId: 'go-prone', payload: {} };
  },
};

const MovementStabilizeCommand: ITacticalCommand = {
  id: 'movement.stabilize',
  category: 'movement',
  label: 'Stabilize',
  phaseConstraints: [GamePhase.Movement],
  requiresConfirmation: false,
  undoable: true,
  availability(ctx) {
    if (!ctx.activeUnitId)
      return { available: false, reason: 'No unit is active.' };
    if (!ctx.canAct) return { available: false, reason: 'Not your turn.' };
    const locked = movementDeclarationLockInvalidState(ctx.activeUnitLockState);
    if (locked) return { available: false, reason: locked.details };
    return { available: true };
  },
  commit() {
    return { actionId: 'stabilize', payload: {} };
  },
};

const MovementCancelCommand: ITacticalCommand = {
  id: 'movement.cancel',
  category: 'movement',
  label: 'Cancel',
  hotkey: 'Esc',
  phaseConstraints: [GamePhase.Movement],
  requiresConfirmation: false,
  undoable: false,
  availability(ctx) {
    // Cancel is ALWAYS available during Movement — its job is to
    // clear a partial preview. No disabled-reason branch.
    if (!ctx.activeUnitId)
      return { available: false, reason: 'Nothing to cancel.' };
    const locked = movementDeclarationLockInvalidState(ctx.activeUnitLockState);
    if (locked) return { available: false, reason: locked.details };
    return { available: true };
  },
  commit() {
    return { actionId: 'undo', payload: {} };
  },
};
