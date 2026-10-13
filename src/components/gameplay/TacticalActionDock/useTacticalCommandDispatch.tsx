import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { ITacticalCommand } from '@/types/gameplay';

import { Button } from '@/components/ui/Button';
import { DialogTemplate } from '@/components/ui/DialogTemplate';

import { resolveAvailability } from './TacticalActionDock.commandButton';
import {
  commitTacticalCommand,
  createTacticalCommandDispatcher,
  type ITacticalCommandDispatchInputs,
  type TacticalCommandDispatcher,
} from './TacticalActionDock.dispatch';

interface IPendingCommand {
  readonly command: ITacticalCommand;
  readonly ctx: ITacticalCommandDispatchInputs['ctx'];
  readonly trigger?: HTMLButtonElement;
}

interface ITacticalCommandDispatchSurface {
  readonly dispatchCommand: TacticalCommandDispatcher;
  readonly confirmationDialog: React.ReactElement | null;
  readonly confirmationOpen: boolean;
}

/** One approval boundary for dock buttons and both context menus. */
export function useTacticalCommandDispatch(
  inputs: Omit<ITacticalCommandDispatchInputs, 'onConfirmCommand'>,
): ITacticalCommandDispatchSurface {
  const [pending, setPending] = useState<IPendingCommand | null>(null);
  // Clear synchronously before committing: a second activation cannot reuse approval.
  const pendingRef = useRef<IPendingCommand | null>(null);
  const currentInputs = useRef(inputs);
  currentInputs.current = inputs;

  const dismiss = useCallback(() => {
    const trigger = pendingRef.current?.trigger;
    pendingRef.current = null;
    setPending(null);
    if (trigger?.isConnected) trigger.focus();
  }, []);

  const requestConfirmation = useCallback(
    (command: ITacticalCommand, trigger?: HTMLButtonElement) => {
      if (pendingRef.current) return;
      const next = { command, trigger, ctx: currentInputs.current.ctx };
      pendingRef.current = next;
      setPending(next);
    },
    [],
  );

  const dispatchCommand = useMemo(
    () =>
      createTacticalCommandDispatcher({
        ...inputs,
        onConfirmCommand: requestConfirmation,
      }),
    [inputs, requestConfirmation],
  );

  const available =
    pending !== null &&
    pending.ctx === inputs.ctx &&
    resolveAvailability(pending.command, inputs.ctx, inputs.commandGate)
      .available;

  useEffect(() => {
    if (pendingRef.current && !available) dismiss();
  }, [available, dismiss]);

  const approve = () => {
    const request = pendingRef.current;
    if (!request) return;
    const latest = currentInputs.current;
    dismiss();
    // A pending command belongs to the context that requested it. Refuse stale
    // phase/unit/target/projection snapshots instead of applying captured payloads.
    if (request.ctx !== latest.ctx) return;
    commitTacticalCommand(request.command, latest);
  };

  const confirmationDialog = pending ? (
    <DialogTemplate
      isOpen
      onClose={dismiss}
      title={`${pending.command.label}?`}
      footer={
        <>
          <Button variant="secondary" onClick={dismiss}>
            Cancel
          </Button>
          <Button disabled={!available} onClick={approve}>
            Confirm {pending.command.label}
          </Button>
        </>
      }
    >
      <p>Confirm {pending.command.label.toLowerCase()}?</p>
    </DialogTemplate>
  ) : null;

  return {
    dispatchCommand,
    confirmationDialog,
    confirmationOpen: pending !== null,
  };
}
