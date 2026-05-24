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

import { GamePhase } from '@/types/gameplay';

import { CommandTooltip } from './CommandTooltip';
import { CommandPreviewPanel } from './TacticalActionDock.preview';
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
  readonly onActivate: () => void;
}

function CommandButton({
  command,
  availability,
  onActivate,
}: CommandButtonProps): React.ReactElement {
  const [hover, setHover] = useState(false);
  const disabled = !availability.available;

  const baseClasses =
    'relative px-3 py-2 min-h-[44px] rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  const enabledClasses =
    'bg-surface-raised hover:bg-surface-deep text-text-theme-primary focus:ring-border-theme cursor-pointer';
  const disabledClasses =
    'bg-surface-base text-text-theme-secondary opacity-50 cursor-not-allowed';

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
        onClick={onActivate}
        className={`${baseClasses} ${disabled ? disabledClasses : enabledClasses}`}
        data-testid={`command-btn-${command.id}`}
        data-command-id={command.id}
        data-command-category={command.category}
        aria-disabled={disabled}
        aria-describedby={
          disabled ? `command-disabled-reason-${command.id}` : undefined
        }
        title={command.label}
      >
        {command.label}
        {command.hotkey && (
          <span className="text-text-theme-secondary ml-2 text-xs opacity-75">
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

/**
 * Group of commands sharing a category.
 */
interface CommandGroupProps {
  readonly category: ITacticalCommand['category'];
  readonly commands: readonly ITacticalCommand[];
  readonly ctx: ITacticalCommandContext;
  readonly onDispatch: (command: ITacticalCommand) => void;
}

function CommandGroup({
  category,
  commands,
  ctx,
  onDispatch,
}: CommandGroupProps): React.ReactElement {
  return (
    <div
      data-testid={`command-group-${category}`}
      data-command-category={category}
      className="flex items-center gap-2"
    >
      <span className="text-text-theme-secondary text-xs font-semibold uppercase">
        {CATEGORY_LABELS[category]}
      </span>
      <div className="flex items-center gap-2">
        {commands.map((command) => (
          <CommandButton
            key={command.id}
            command={command}
            availability={command.availability(ctx)}
            onActivate={() => onDispatch(command)}
          />
        ))}
      </div>
    </div>
  );
}

function previewCommandForContext({
  commands,
  ctx,
  previewInputs,
}: {
  readonly commands: readonly ITacticalCommand[];
  readonly ctx: ITacticalCommandContext;
  readonly previewInputs: ICommandPreviewInputs | undefined;
}): ITacticalCommand | null {
  if (
    ctx.phase === GamePhase.WeaponAttack &&
    (ctx.targetUnitId || previewInputs?.combatInfo)
  ) {
    return (
      commands.find((command) => command.id === 'weapon.fire-volley') ?? null
    );
  }

  const movementMode =
    previewInputs?.movementInfo?.movementType ?? previewInputs?.movementMode;
  const hasMovementPreview =
    Boolean(previewInputs?.movementInfo) ||
    Boolean(previewInputs?.highlightPath?.length);
  if (ctx.phase === GamePhase.Movement && movementMode && hasMovementPreview) {
    return (
      commands.find((command) => command.id === `movement.${movementMode}`) ??
      null
    );
  }

  const physicalAttackType =
    previewInputs?.physicalAttackOption?.attackType ??
    previewInputs?.physicalAttackType;
  if (
    ctx.phase === GamePhase.PhysicalAttack &&
    physicalAttackType &&
    (ctx.targetUnitId || previewInputs?.physicalTargetUnitId)
  ) {
    return (
      commands.find(
        (command) =>
          command.id === commandIdForPhysicalAttack(physicalAttackType),
      ) ?? null
    );
  }

  return null;
}

function commandIdForPhysicalAttack(
  attackType: NonNullable<ICommandPreviewInputs['physicalAttackType']>,
): string {
  switch (attackType) {
    case 'dfa':
      return 'physical.dfa';
    case 'hatchet':
    case 'sword':
    case 'mace':
    case 'lance':
      return 'physical.club';
    default:
      return `physical.${attackType}`;
  }
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
  className = '',
}: TacticalActionDockProps): React.ReactElement {
  const effectiveCtx = useMemo<ITacticalCommandContext>(() => {
    if (
      !previewInputs?.movementInfo &&
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
    (command: ITacticalCommand) => {
      const availability = command.availability(effectiveCtx);
      if (!availability.available) {
        // Disabled-with-reason: refuse the click silently. The
        // tooltip is the explanation surface — no secondary toast.
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
        if (!ok) return;
      }
      const result = command.commit(effectiveCtx);
      if (result.payload === undefined) {
        onAction(result.actionId);
      } else {
        onAction(result.actionId, result.payload);
      }
    },
    [effectiveCtx, onAction],
  );

  return (
    <div
      className={`bg-surface-base border-border-theme flex items-center justify-between border-t px-4 py-3 ${className}`}
      role="toolbar"
      aria-label="Tactical action dock"
      data-testid="tactical-action-dock"
    >
      <div className="flex flex-wrap items-center gap-4">
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
      <div className="flex items-center gap-3">
        {commandPreview && <CommandPreviewPanel preview={commandPreview} />}
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
