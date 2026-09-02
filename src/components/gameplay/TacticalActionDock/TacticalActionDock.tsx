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

import {
  AttackIntentComposer,
  type IAttackComposerContext,
} from '../AttackIntentComposer';
import {
  MovementIntentComposer,
  type IMovementComposerContext,
} from '../MovementIntentComposer';
import {
  CommandButton,
  isDangerCommand,
  resolveAvailability,
} from './TacticalActionDock.commandButton';
import { createTacticalCommandDispatcher } from './TacticalActionDock.dispatch';
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
  /** Optional command ids hidden because a host slot provides that action. */
  readonly suppressCommandIds?: readonly string[];
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
  /**
   * Attack Intent Composer context (attack-phase-intent-composer). When
   * `active`, the composer renders in the weapon-attack zone as the SOLE
   * weapon-attack declaration surface (Single Attack Authority, D9).
   */
  readonly attackComposer?: IAttackComposerContext;
  /**
   * A surface-level availability override (umbrella 19.2). When it refuses,
   * EVERY command is refused with its reason instead of being asked whether
   * it is individually available.
   *
   * Typed as `CommandAvailability` - a type this layer already owns -
   * rather than as a networked lifecycle posture. The dock is the shared
   * tactical surface, single-player included, and no component under
   * `src/components/gameplay` imports from `src/lib/multiplayer`; keeping
   * that boundary means the translation from posture to gate happens in
   * `NetworkedGameSurface`, which legitimately knows both. The dock never
   * learns what a lifecycle is.
   *
   * Omitted on surfaces with no gate behind them, which keeps their
   * pre-19.2 behaviour rather than silently refusing commands that were
   * always safe.
   */
  readonly commandGate?: CommandAvailability;
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

interface CommandGroupProps {
  readonly category: ITacticalCommand['category'];
  readonly commands: readonly ITacticalCommand[];
  readonly ctx: ITacticalCommandContext;
  readonly onDispatch: (
    command: ITacticalCommand,
    trigger?: HTMLButtonElement,
  ) => void;
  readonly commandGate?: CommandAvailability;
}

function CommandGroup({
  category,
  commands,
  commandGate,
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
              availability={resolveAvailability(command, ctx, commandGate)}
              onActivate={(trigger) => onDispatch(command, trigger)}
            />
          ))}
        </div>
      )}
      {dangerCommands.length > 0 && (
        // Wider break + heavier rule than the intra-group gap: the
        // irreversible cluster (Eject / Withdraw / Concede) must not read
        // as just-another-neighbor of routine commands (re-audit IS-04).
        <div
          className="ml-6 flex flex-wrap items-center gap-2 border-l-2 border-red-500/60 pl-4"
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
                availability={resolveAvailability(command, ctx, commandGate)}
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
  suppressCommandIds,
  infoText,
  previewInputs,
  gmIntervention,
  intentComposer,
  attackComposer,
  commandGate,
  className = '',
}: TacticalActionDockProps): React.ReactElement {
  const [gmPreviewState, setGmPreviewState] = useState<IGmPreviewState | null>(
    null,
  );
  // Single Movement Authority: when the composer is active, the command
  // registry must know so movement builders drop the posture/traversal verbs
  // (the composer palette is their only home — re-audit VD-01/UXF-01/IS-02).
  const composerActive = Boolean(intentComposer?.active);
  // Single Attack Authority (D9): when the attack composer is active the
  // registry must know so weapon builders drop fire/clear and route the
  // declare command into composer state.
  const attackComposerIsActive = Boolean(attackComposer?.active);
  const effectiveCtx = useMemo<ITacticalCommandContext>(() => {
    const base: ITacticalCommandContext = {
      ...ctx,
      ...(composerActive ? { movementComposerActive: true } : {}),
      ...(attackComposerIsActive ? { attackComposerActive: true } : {}),
    };
    if (
      !previewInputs?.movementInfo &&
      !previewInputs?.combatInfo &&
      !previewInputs?.combatInfoByTargetId &&
      !previewInputs?.physicalAttackOption &&
      !previewInputs?.physicalTargetUnitId
    ) {
      return base;
    }
    return {
      ...base,
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
    composerActive,
    attackComposerIsActive,
    previewInputs?.movementInfo,
    previewInputs?.combatInfo,
    previewInputs?.combatInfoByTargetId,
    previewInputs?.physicalAttackOption,
    previewInputs?.physicalTargetUnitId,
  ]);
  const commands = useCommandRegistry(effectiveCtx, shellMode);
  const visibleCommands = useMemo(() => {
    if (!suppressCommandIds?.length) return commands;
    const suppressed = new Set(suppressCommandIds);
    return commands.filter((command) => !suppressed.has(command.id));
  }, [commands, suppressCommandIds]);
  const groups = groupCommandsByCategory(visibleCommands);
  const previewCommand = previewCommandForContext({
    commands: visibleCommands,
    ctx: effectiveCtx,
    previewInputs,
  });
  const commandPreview = useCommandPreview(
    previewCommand,
    effectiveCtx,
    previewInputs ?? {},
  );

  // The dispatcher is built by a module-level factory rather than
  // inlined here so its refusal has a caller a test can reach: a
  // gated dock renders every control disabled, and React delivers no
  // click to a disabled button, so an inline guard was unfalsifiable
  // (finding #71).
  //
  // `commandGate` belongs in the deps: without it the dispatcher
  // closes over the gate as it was when the dock last rebuilt it, so
  // a refusal that arrived since would be invisible to the dispatch
  // path and the command would commit against a board the client
  // knows is stale - the exact silent retry the gate exists to stop.
  const dispatchCommand = useMemo(
    () =>
      createTacticalCommandDispatcher({
        ctx: effectiveCtx,
        commandGate,
        gmIntervention,
        onAction,
        onGmPreview: setGmPreviewState,
      }),
    [commandGate, effectiveCtx, gmIntervention, onAction],
  );

  const approveGmPreview = useCallback(() => {
    if (!gmPreviewState || gmPreviewState.preview.status !== 'ready') return;
    const approval = gmIntervention?.approve?.(gmPreviewState.preview);
    if (approval && approval.status !== 'approved') {
      setGmPreviewState({
        ...gmPreviewState,
        approvalIssue:
          approval.reason ??
          `GM intervention approval returned ${approval.status}.`,
      });
      return;
    }
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
      className={`bg-surface-base border-border-theme flex max-h-60 min-h-[80px] flex-shrink-0 flex-wrap items-center justify-between gap-3 overflow-y-auto border-t px-4 py-2 lg:max-h-none lg:overflow-visible ${className}`}
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
        {attackComposer?.active && (
          // Single Attack Authority (D9): the composer is the sole weapon-
          // attack declaration surface, hosted here in the PRIMARY-ACTION
          // zone during the weapon-attack phase.
          <AttackIntentComposer context={attackComposer} />
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
            commandGate={commandGate}
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
        {/* While the composer is active its Lock-In hint carries the guidance
            inline — the trailing copy would duplicate it from ~450px away
            (re-audit VD-03/UXF-03). */}
        {infoText && !composerActive && (
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
