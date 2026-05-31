/**
 * Movement command family — walk, run, jump, stand-up, go prone, stabilize, cancel.
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

import {
  GamePhase,
  type ITacticalCommand,
  type ITacticalCommandContext,
} from '@/types/gameplay';

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
    MovementEvadeCommand,
    MovementJumpCommand,
    MovementStandCommand,
    MovementGoProneCommand,
    MovementActivateMASCCommand,
    MovementActivateSuperchargerCommand,
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

const MovementEvadeCommand: ITacticalCommand = {
  id: 'movement.evade',
  category: 'movement',
  label: 'Evade',
  hotkey: 'E',
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
    return { actionId: 'lock', payload: { mode: 'evade' } };
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
    // Jump-jet availability is a per-unit fact resolved by the engine —
    // today the dock surfaces the command and the engine refuses the
    // commit; Wave 7.3+ will inject the jump-MP envelope so this
    // predicate can return a `disabledReason: "No jump jets equipped."`
    // before the user clicks.
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
    // The unit-is-prone fact lives on the engine state. Until the
    // command context carries it, surface the command and let the
    // engine refuse non-prone stand attempts.
    return { available: true };
  },
  commit() {
    return { actionId: 'stand', payload: {} };
  },
};

const MovementGoProneCommand: ITacticalCommand = {
  id: 'movement.go-prone',
  category: 'movement',
  label: 'Go Prone',
  hotkey: 'P',
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
    return { actionId: 'go-prone', payload: {} };
  },
};

const MovementActivateMASCCommand: ITacticalCommand = {
  id: 'movement.activate-masc',
  category: 'movement',
  label: 'Activate MASC',
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
    return { actionId: 'activate-masc', payload: {} };
  },
};

const MovementActivateSuperchargerCommand: ITacticalCommand = {
  id: 'movement.activate-supercharger',
  category: 'movement',
  label: 'Activate Supercharger',
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
    return { actionId: 'activate-supercharger', payload: {} };
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
