/**
 * Movement command family - walk, run, sprint, evade, jump, stand-up,
 * posture transitions, MASC/Supercharger activation, stabilize, cancel.
 *
 * Wave 7.2 PR-D: command adapters bind to `activeUnitId` (whose turn it is)
 * from the tactical shell. Availability predicates are PURE - same input,
 * same output, no store reads. The dock and context menus call these
 * factories with the same context and surface the same commands.
 *
 * Engine integration is via the existing `onAction(actionId, payload?)`
 * channel - `commit()` returns the actionId string and mode payload the
 * dock forwards to the existing `GameplayLayout` plumbing. The future
 * direct-dispatch refactor (Wave 7.4+) replaces this thin adapter with
 * an `engineMutation` payload; today's PR-D stays compatible with the
 * existing `getPhaseActions` action ids.
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 * @see openspec/changes/add-tactical-action-menu-system/tasks.md §1.2
 */

import type {
  ITacticalCommand,
  ITacticalCommandContext,
} from '@/types/gameplay';

import { GamePhase } from '@/types/gameplay';

import * as movementAvailability from './movementCommandAvailability';
import { MovementPostureCommands } from './movementPostureCommands';
import { MovementTraversalCommands } from './movementTraversalCommands';
import { buildRuntimeMovementStateCommands } from './runtimeMovementStateCommands';

/**
 * Build the movement-family command list for the current active unit.
 *
 * Wave 8 authorization note: gate by `viewerPlayerId === activeUnit.ownerId`
 * once multi-viewer command authorization lands. Today every movement command
 * is visible to the local viewer when an active unit exists.
 */
export function buildMovementCommands(
  ctx?: ITacticalCommandContext,
): readonly ITacticalCommand[] {
  // Single Movement Authority (tactical-movement-intent spec): while the
  // Movement Intent Composer is active it is the SOLE home for posture and
  // traversal verbs (its PosturePalette imports the command arrays directly,
  // so legality stays single-sourced). The dock keeps only equipment/state
  // commands so the same verb never renders on two surfaces (re-audit
  // VD-01/UXF-01/IS-02).
  const composerOwnsComposition = ctx?.movementComposerActive === true;
  // Equipment-reality gate (re-audit DC-03): a unit that mounts no MASC /
  // Supercharger must not surface the activation affordance at all — the
  // engine refuses the action anyway, so the button was a dead promise.
  // `undefined` (legacy contexts without the flag) keeps the old behavior.
  const showMASC = ctx?.activeUnitHasMASC !== false;
  const showSupercharger = ctx?.activeUnitHasSupercharger !== false;
  return [
    ...(composerOwnsComposition ? [] : MovementTraversalCommands),
    ...(composerOwnsComposition ? [] : MovementPostureCommands),
    ...(showMASC ? [MovementActivateMASCCommand] : []),
    ...(showSupercharger ? [MovementActivateSuperchargerCommand] : []),
    ...buildRuntimeMovementStateCommands(ctx),
    MovementStabilizeCommand,
    MovementCancelCommand,
  ];
}

// Audit 2026-06-09 A-3 restoration: MASC/Supercharger activation routes
// through the existing `activate-masc` / `activate-supercharger` action ids
// that `useGameplayStore` forwards to
// `InteractiveSession.activateMovementEnhancement`. Installed-equipment
// gating stays engine-side - the engine refuses activation for units
// without the equipment, matching the stack-side command surface.
const MovementActivateMASCCommand: ITacticalCommand = {
  ...movementSupportCommandBase(true),
  id: 'movement.activate-masc',
  label: 'Activate MASC',
  availability(ctx) {
    const unavailable =
      movementAvailability.movementActiveTurnUnavailableReason(ctx);
    return unavailable
      ? { available: false, reason: unavailable }
      : { available: true };
  },
  commit() {
    return { actionId: 'activate-masc', payload: {} };
  },
};

const MovementActivateSuperchargerCommand: ITacticalCommand = {
  ...movementSupportCommandBase(true),
  id: 'movement.activate-supercharger',
  label: 'Activate Supercharger',
  availability(ctx) {
    const unavailable =
      movementAvailability.movementActiveTurnUnavailableReason(ctx);
    return unavailable
      ? { available: false, reason: unavailable }
      : { available: true };
  },
  commit() {
    return { actionId: 'activate-supercharger', payload: {} };
  },
};

const MovementStabilizeCommand: ITacticalCommand = {
  ...movementSupportCommandBase(true),
  id: 'movement.stabilize',
  label: 'Stabilize',
  availability(ctx) {
    const unavailable =
      movementAvailability.movementActiveTurnUnavailableReason(ctx);
    return unavailable
      ? { available: false, reason: unavailable }
      : { available: true };
  },
  commit() {
    return { actionId: 'stabilize', payload: {} };
  },
};

const MovementCancelCommand: ITacticalCommand = {
  ...movementSupportCommandBase(false),
  id: 'movement.cancel',
  label: 'Cancel',
  hotkey: 'Esc',
  availability(ctx) {
    // Cancel is ALWAYS available during Movement - its job is to
    // clear a partial preview. No disabled-reason branch.
    const unavailable =
      movementAvailability.movementActiveUnitLockUnavailableReason(
        ctx,
        'Nothing to cancel.',
      );
    return unavailable
      ? { available: false, reason: unavailable }
      : { available: true };
  },
  commit() {
    return { actionId: 'undo', payload: {} };
  },
};

function movementSupportCommandBase(
  undoable: boolean,
): Pick<
  ITacticalCommand,
  'category' | 'phaseConstraints' | 'requiresConfirmation' | 'undoable'
> {
  return {
    category: 'movement',
    phaseConstraints: [GamePhase.Movement],
    requiresConfirmation: false,
    undoable,
  };
}
