/**
 * Movement command family — walk, run, jump, stand-up, stabilize, cancel.
 *
 * Wave 7.2 PR-D: command adapters bind to `activeUnitId` (whose turn it is)
 * from the tactical shell. Availability predicates are PURE — same input,
 * same output, no store reads. The dock and context menus call these
 * factories with the same context and surface the same commands.
 *
 * Engine integration is via the existing `onAction(actionId)` channel —
 * `commit()` returns the actionId string the dock forwards to the
 * existing `ActionBar` plumbing in `GameplayLayout`. The future direct-
 * dispatch refactor (Wave 7.4+) replaces this thin adapter with an
 * `engineMutation` payload; today's PR-D stays compatible with the
 * existing `getPhaseActions` action ids.
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 * @see openspec/changes/add-tactical-action-menu-system/tasks.md §1.2
 */

import { getHeatMovementPenalty } from '@/constants/heat';
import {
  GamePhase,
  MovementType,
  type ITacticalCommand,
  type ITacticalCommandContext,
} from '@/types/gameplay';
import { getMaxMP, getStandingCost } from '@/utils/gameplay/movement';

/**
 * Build the movement-family command list for the current active unit.
 *
 * TODO(wave-8): gate by `viewerPlayerId === activeUnit.ownerId` once
 * multi-viewer command authorization lands. Today every movement
 * command is visible to the local viewer when an active unit exists.
 */
export function buildMovementCommands(): readonly ITacticalCommand[] {
  return [
    MovementWalkCommand,
    MovementRunCommand,
    MovementJumpCommand,
    MovementStandCommand,
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
    if (ctx.movementCapability && ctx.movementCapability.jumpMP <= 0) {
      return { available: false, reason: 'No jump capability.' };
    }
    if (ctx.activeUnitProne === true) {
      return {
        available: false,
        reason: 'Unit is prone and must stand before jumping.',
      };
    }
    return { available: true };
  },
  commit() {
    return { actionId: 'lock', payload: { mode: 'jump' } };
  },
};

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
    if (ctx.activeUnitProne !== true) {
      return { available: false, reason: 'Unit is not prone.' };
    }
    if (!ctx.movementCapability) {
      return { available: false, reason: 'No movement capability.' };
    }
    if (ctx.activeUnitStandUpImpossibleReason) {
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
    return { available: true };
  },
  commit() {
    return { actionId: 'undo', payload: {} };
  },
};
