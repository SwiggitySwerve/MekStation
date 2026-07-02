/**
 * TacticalActionDock — the primary command surface inside the
 * `bottom-dock` ShellSlot.
 *
 * Replaces ActionBar's flat action list with a category-grouped view
 * over the unified command registry. Same `onAction(actionId, payload?)`
 * dispatch contract, same data-testid for the bar, so existing
 * GameplayLayout plumbing and the e2e gate test (`gameplay-layout-
 * slots.spec.ts`) keep working.
 *
 * Per the spec's `Active unit command set follows phase` scenario,
 * the dock renders ONLY commands whose `phaseConstraints` include
 * the current phase. The registry hook already applies that filter;
 * the dock further groups by category for visual presentation.
 *
 * Per the spec's `Disabled command explains invalidity` scenario,
 * a command with `available: false` STAYS in the dock with a visible
 * label, a `disabled` button state, and a tooltip carrying the
 * engine-derived reason.
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 * @see openspec/changes/add-tactical-action-menu-system/tasks.md §2.1, §2.3
 */

import React, { useCallback, useMemo, useState } from 'react';

import type {
  CommandAvailability,
  ITacticalCommand,
  ITacticalCommandContext,
  TacticalActionHandler,
} from '@/types/gameplay';
import type { ShellMode } from '@/types/gameplay/TacticalShellInterfaces';

import { isGmTacticalCommandId } from '@/lib/interventions';

import {
  MovementIntentComposer,
  type IMovementComposerContext,
} from '../MovementIntentComposer';
import { CommandTooltip } from './CommandTooltip';
import {
  GmInterventionConfirmationPanel,
  GmInterventionPlayerLog,
  type IGmPreviewState,
  type IGmTacticalInterventionSurface,
} from './TacticalActionDock.gmIntervention';
import { CommandPreviewPanel } from './TacticalActionDock.preview';
import { previewCommandForContext } from './TacticalActionDock.previewSelect';
import {
  useCommandPreview,
  type ICommandPreviewInputs,
} from './useCommandPreview';
import {
  groupCommandsByCategory,
  useCommandRegistry,
} from './useCommandRegistry';

export interface TacticalActionDockProps {
  /** Command context — drives availability + preview. */
  readonly ctx: ITacticalCommandContext;
  /** Shell mode — gates GM commands. */
  readonly shellMode: ShellMode;
  /**
   * Dispatch callback — same action channel the legacy ActionBar uses.
   * The dock calls this with the command's `commit(ctx)` action id and
   * any structured payload needed by the host.
   */
  readonly onAction: TacticalActionHandler;
  /** Optional content rendered in the trailing region (Concede, etc). */
  readonly trailingActions?: React.ReactNode;
  /** Optional informational text shown in the trailing region. */
  readonly infoText?: string;
  /** Rules-backed projection inputs for the active command preview. */
  readonly previewInputs?: ICommandPreviewInputs;
  /** Optional GM intervention service for command previews and approval. */
  readonly gmIntervention?: IGmTacticalInterventionSurface;
  /**
   * Movement Intent Composer context (tactical-movement-intent-composer). When
   * `active`, the composer renders in the movement zone as the SOLE movement-
   * composition surface (Single Movement Authority) — the dock no longer renders
   * movement-verb buttons; it keeps facing/phase/utility (+ Evade posture).
   */
  readonly intentComposer?: IMovementComposerContext;
  /** Optional className for styling. */
  readonly className?: string;
}

const CATEGORY_LABELS: Record<ITacticalCommand['category'], string> = {
  movement: 'Movement',
  facing: 'Facing',
  weapon: 'Weapons',
  physical: 'Physical',
  'heat-end': 'Phase',
  utility: 'Utility',
  gm: 'GM',
};

interface CommandButtonProps {
  readonly command: ITacticalCommand;
  readonly availability: CommandAvailability;
  readonly onActivate: (trigger: HTMLButtonElement) => void;
}

function CommandButton({
  command,
  availability,
  onActivate,
}: CommandButtonProps): React.ReactElement {
  const [hover, setHover] = useState(false);
  const disabled = !availability.available;
  const danger = isDangerCommand(command);

  const baseClasses =
    'relative px-3 py-2 min-h-[40px] whitespace-nowrap rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  const enabledClasses = danger
    ? 'border border-red-500 bg-red-950/80 text-red-50 hover:bg-red-900 focus:ring-red-400 cursor-pointer'
    : 'bg-surface-raised hover:bg-surface-deep text-text-theme-primary focus:ring-border-theme cursor-pointer';
  const disabledClasses = danger
    ? 'border border-red-800 bg-red-950/30 text-red-200/60 opacity-60 cursor-not-allowed'
    : 'bg-surface-base text-text-theme-secondary opacity-50 cursor-not-allowed';

  return (
    <div
      className="relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={(event) => onActivate(event.currentTarget)}
        className={`${baseClasses} ${disabled ? disabledClasses : enabledClasses}`}
        data-testid={`command-btn-${command.id}`}
        data-command-id={command.id}
        data-command-category={command.category}
        data-command-danger={danger ? 'true' : 'false'}
        aria-disabled={disabled}
        aria-describedby={
          disabled ? `command-disabled-reason-${command.id}` : undefined
        }
        aria-label={
          danger ? `${command.label} (requires confirmation)` : command.label
        }
        title={command.label}
      >
        {command.label}
        {command.hotkey && (
          <span
            className={`ml-2 text-xs opacity-75 ${
              danger ? 'text-red-100' : 'text-text-theme-secondary'
            }`}
          >
            ({command.hotkey})
          </span>
        )}
      </button>
      {hover && (
        <CommandTooltip command={command} availability={availability} />
      )}
    </div>
  );
}

function isDangerCommand(command: ITacticalCommand): boolean {
  return (
    command.requiresConfirmation &&
    (command.id === 'utility.eject' ||
      command.id === 'utility.withdraw' ||
      command.id === 'utility.concede')
  );
}

/**
 * Group of commands sharing a category.
 */
interface CommandGroupProps {
  readonly category: ITacticalCommand['category'];
  readonly commands: readonly ITacticalCommand[];
  readonly ctx: ITacticalCommandContext;
  readonly onDispatch: (
    command: ITacticalCommand,
    trigger?: HTMLButtonElement,
  ) => void;
}

function CommandGroup({
  category,
  commands,
  ctx,
  onDispatch,
}: CommandGroupProps): React.ReactElement {
  const regularCommands = commands.filter(
    (command) => !isDangerCommand(command),
  );
  const dangerCommands = commands.filter(isDangerCommand);

  return (
    <div
      data-testid={`command-group-${category}`}
      data-command-category={category}
      className="flex min-w-0 flex-wrap items-center gap-2"
    >
      <span className="text-text-theme-secondary text-xs font-semibold uppercase">
        {CATEGORY_LABELS[category]}
      </span>
      {regularCommands.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {regularCommands.map((command) => (
            <CommandButton
              key={command.id}
              command={command}
              availability={command.availability(ctx)}
              onActivate={(trigger) => onDispatch(command, trigger)}
            />
          ))}
        </div>
      )}
      {dangerCommands.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-2 border-l border-red-500/50 pl-2"
          data-testid={`command-group-${category}-danger`}
        >
          <span className="text-xs font-semibold text-red-200 uppercase">
            Critical
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {dangerCommands.map((command) => (
              <CommandButton
                key={command.id}
                command={command}
                availability={command.availability(ctx)}
                onActivate={(trigger) => onDispatch(command, trigger)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The tactical action dock — primary command surface.
 *
 * Renders inside the `bottom-dock` ShellSlot of GameplayLayout.
 * Replaces the old ActionBar content; the slot wrapper itself is
 * unchanged, so the e2e gate test continues to pass.
 */
export function TacticalActionDock({
  ctx,
  shellMode,
  onAction,
  trailingActions,
  infoText,
  previewInputs,
  gmIntervention,
  intentComposer,
  className = '',
}: TacticalActionDockProps): React.ReactElement {
  const [gmPreviewState, setGmPreviewState] = useState<IGmPreviewState | null>(
    null,
  );
  const effectiveCtx = useMemo<ITacticalCommandContext>(() => {
    if (
      !previewInputs?.movementInfo &&
      !previewInputs?.combatInfo &&
      !previewInputs?.combatInfoByTargetId &&
      !previewInputs?.physicalAttackOption &&
      !previewInputs?.physicalTargetUnitId
    ) {
      return ctx;
    }
    return {
      ...ctx,
      ...(previewInputs.movementInfo
        ? { targetMovementProjection: previewInputs.movementInfo }
        : {}),
      ...(previewInputs.combatInfo
        ? { targetCombatProjection: previewInputs.combatInfo }
        : {}),
      ...(previewInputs.combatInfoByTargetId
        ? { combatProjectionByTargetId: previewInputs.combatInfoByTargetId }
        : {}),
      ...(previewInputs.physicalTargetUnitId
        ? { targetUnitId: previewInputs.physicalTargetUnitId }
        : {}),
      ...(previewInputs.physicalAttackOption
        ? { targetPhysicalAttackOption: previewInputs.physicalAttackOption }
        : {}),
    };
  }, [
    ctx,
    previewInputs?.movementInfo,
    previewInputs?.combatInfo,
    previewInputs?.combatInfoByTargetId,
    previewInputs?.physicalAttackOption,
    previewInputs?.physicalTargetUnitId,
  ]);
  const commands = useCommandRegistry(effectiveCtx, shellMode);
  const groups = groupCommandsByCategory(commands);
  const previewCommand = previewCommandForContext({
    commands,
    ctx: effectiveCtx,
    previewInputs,
  });
  const commandPreview = useCommandPreview(
    previewCommand,
    effectiveCtx,
    previewInputs ?? {},
  );

  const dispatchCommand = useCallback(
    (command: ITacticalCommand, trigger?: HTMLButtonElement) => {
      const availability = command.availability(effectiveCtx);
      if (!availability.available) {
        // Disabled-with-reason: refuse the click silently. The
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
          ctx: effectiveCtx,
        });
        setGmPreviewState({ commandLabel: command.label, preview });
        trigger?.focus();
        return;
      }
      if (command.requiresConfirmation) {
        // Spec `End phase distinguishes no-op from unresolved
        // actions` — irreversible commits route through the
        // global confirm. Today we wrap the existing native
        // confirm() so the dock has the gate in place without
        // depending on a modal stack that doesn't exist yet.
        // Wave 7.3+ replaces this with the dedicated confirm UI.
        const ok =
          typeof window === 'undefined'
            ? true
            : window.confirm(`Confirm: ${command.label}?`);
        trigger?.focus();
        if (!ok) return;
      }
      const result = command.commit(effectiveCtx);
      if (result.payload === undefined) {
        onAction(result.actionId);
      } else {
        onAction(result.actionId, result.payload);
      }
    },
    [effectiveCtx, gmIntervention, onAction],
  );

  const approveGmPreview = useCallback(() => {
    if (!gmPreviewState || gmPreviewState.preview.status !== 'ready') return;
    gmIntervention?.approve?.(gmPreviewState.preview);
    setGmPreviewState(null);
  }, [gmIntervention, gmPreviewState]);

  const cancelGmPreview = useCallback(() => {
    if (gmPreviewState) {
      gmIntervention?.cancel?.(gmPreviewState.preview);
    }
    setGmPreviewState(null);
  }, [gmIntervention, gmPreviewState]);

  const takeManualControl = useCallback(() => {
    if (!gmPreviewState) return;
    gmIntervention?.manualTakeover?.(gmPreviewState.preview);
    setGmPreviewState(null);
  }, [gmIntervention, gmPreviewState]);

  return (
    <div
      className={`bg-surface-base border-border-theme flex min-h-[80px] flex-wrap items-center justify-between gap-3 border-t px-4 py-2 ${className}`}
      role="toolbar"
      aria-label="Tactical action dock"
      data-testid="tactical-action-dock"
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
        {intentComposer?.active && (
          // Single Movement Authority: the composer is the sole movement-
          // composition surface, hosted here in the PRIMARY-ACTION zone. The
          // dock's movement-verb buttons are removed; facing/phase/utility (and
          // the Evade posture) still render as command groups below.
          <MovementIntentComposer context={intentComposer} />
        )}
        {groups.length === 0 && (
          <span
            className="text-text-theme-secondary text-sm"
            data-testid="tactical-action-dock-empty"
          >
            No commands available in this phase.
          </span>
        )}
        {groups.map((g) => (
          <CommandGroup
            key={g.category}
            category={g.category}
            commands={g.commands}
            ctx={effectiveCtx}
            onDispatch={dispatchCommand}
          />
        ))}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {commandPreview && <CommandPreviewPanel preview={commandPreview} />}
        {gmPreviewState && (
          <GmInterventionConfirmationPanel
            previewState={gmPreviewState}
            onApprove={gmIntervention?.approve ? approveGmPreview : undefined}
            onCancel={cancelGmPreview}
            onManualTakeover={
              gmIntervention?.manualTakeover ? takeManualControl : undefined
            }
          />
        )}
        {gmIntervention?.playerLog && (
          <GmInterventionPlayerLog records={gmIntervention.playerLog} />
        )}
        {infoText && (
          <div className="text-text-theme-secondary text-sm">{infoText}</div>
        )}
        {trailingActions && (
          <div
            className="flex items-center gap-2"
            data-testid="tactical-action-dock-trailing"
          >
            {trailingActions}
          </div>
        )}
      </div>
    </div>
  );
}

export default TacticalActionDock;
