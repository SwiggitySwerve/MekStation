/**
 * The dock's single dispatch path (umbrella 19.2, finding #71).
 *
 * This was a `useCallback` closed over inside `TacticalActionDock`, and
 * that is precisely why its most important guard could not be tested. A
 * gated dock renders EVERY dispatch surface - command buttons and
 * context-menu items alike - as a disabled button, and React delivers no
 * click to a disabled button however a test re-enables it (removing the
 * attribute and writing the `disabled` property were both measured: no
 * click arrives). So the refusal below had no reachable caller from the
 * DOM, and the row that claimed to prove it could not fail: deleting the
 * guard outright left the suite green.
 *
 * Extracting the dispatcher gives the guard a caller a test can reach,
 * the same way `buildActionControlContext` made the networked action
 * bar's dispatch half provable. The behaviour is unchanged - this is the
 * dock's callback body, moved.
 */

import type {
  CommandAvailability,
  ITacticalCommand,
  ITacticalCommandContext,
  TacticalActionHandler,
} from '@/types/gameplay';

import { isGmTacticalCommandId } from '@/lib/interventions';

import type {
  IGmPreviewState,
  IGmTacticalInterventionSurface,
} from './TacticalActionDock.gmIntervention';

import { resolveAvailability } from './TacticalActionDock.commandButton';

export interface ITacticalCommandDispatchInputs {
  readonly ctx: ITacticalCommandContext;
  /** Surface-wide refusal; `undefined` leaves each command to answer. */
  readonly commandGate: CommandAvailability | undefined;
  readonly gmIntervention: IGmTacticalInterventionSurface | undefined;
  readonly onAction: TacticalActionHandler;
  /** Raise the GM preview panel for a GM-category command. */
  readonly onGmPreview: (state: IGmPreviewState) => void;
  /** Request explicit app-dialog approval; omission refuses confirmed commands. */
  readonly onConfirmCommand?: TacticalCommandDispatcher;
}

export type TacticalCommandDispatcher = (
  command: ITacticalCommand,
  trigger?: HTMLButtonElement,
) => void;

/**
 * Build the dock's dispatcher.
 *
 * The gate is checked HERE rather than only on the rendered control: a
 * control that is disabled is not the same fact as a command that
 * cannot be applied, and only the second one survives a keyboard path,
 * a context menu, or any future programmatic activation.
 */
export function createTacticalCommandDispatcher(
  inputs: ITacticalCommandDispatchInputs,
): TacticalCommandDispatcher {
  const { ctx, commandGate, gmIntervention, onGmPreview, onConfirmCommand } =
    inputs;
  return (command, trigger) => {
    const availability = resolveAvailability(command, ctx, commandGate);
    if (!availability.available) {
      // Disabled-with-reason: refuse the activation silently. The
      // tooltip is the explanation surface — no secondary toast.
      trigger?.focus();
      return;
    }
    if (
      command.category === 'gm' &&
      gmIntervention &&
      isGmTacticalCommandId(command.id)
    ) {
      const preview = gmIntervention.preview({
        commandId: command.id,
        command,
        ctx,
      });
      onGmPreview({ commandLabel: command.label, preview });
      trigger?.focus();
      return;
    }
    if (command.requiresConfirmation) {
      onConfirmCommand?.(command, trigger);
      return;
    }
    commitTacticalCommand(command, inputs);
  };
}

/** Approval and immediate commands share the same current availability guard. */
export function commitTacticalCommand(
  command: ITacticalCommand,
  inputs: Pick<
    ITacticalCommandDispatchInputs,
    'ctx' | 'commandGate' | 'onAction'
  >,
): void {
  if (!resolveAvailability(command, inputs.ctx, inputs.commandGate).available)
    return;
  const result = command.commit(inputs.ctx);
  if (result.payload === undefined) inputs.onAction(result.actionId);
  else inputs.onAction(result.actionId, result.payload);
}
