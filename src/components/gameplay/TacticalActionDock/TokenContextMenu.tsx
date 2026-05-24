/**
 * TokenContextMenu — right-click / long-press menu on a unit token.
 *
 * Per the spec's `Unit token context menu filters commands` and `Enemy
 * token context menu targets enemy` scenarios:
 *   - Friendly token: surfaces movement/facing/utility commands valid
 *     for that unit and current phase.
 *   - Enemy token: surfaces weapon/physical/utility commands AND
 *     preselects the right-clicked enemy as the command target.
 *   - Selecting a command updates the SAME selected-command state used
 *     by the action dock (spec invariant: no parallel dispatch).
 *
 * The menu pulls from `useCommandRegistry` with the same context the
 * dock uses, then filters by friendly / enemy ownership. Both surfaces
 * dispatch through `onAction` — no shadow dispatch path.
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 * @see openspec/changes/add-tactical-action-menu-system/tasks.md §2.2
 */

import React, { useCallback, useMemo } from 'react';

import type {
  CommandAvailability,
  ITacticalCommand,
  ITacticalCommandContext,
  TacticalActionHandler,
} from '@/types/gameplay';
import type { ShellMode } from '@/types/gameplay/TacticalShellInterfaces';

import {
  filterCommandsForEnemyToken,
  filterCommandsForFriendlyToken,
  useCommandRegistry,
} from './useCommandRegistry';

export interface TokenContextMenuProps {
  /** Unit id of the token the player right-clicked. */
  readonly tokenUnitId: string;
  /** True if the token belongs to the local viewer (friendly). */
  readonly isFriendly: boolean;
  /**
   * Shell command context. The menu uses the SAME context the dock
   * uses so command availability is identical. When `isFriendly` is
   * false (enemy), the menu OVERRIDES `targetUnitId` with the
   * right-clicked token so target-aware commands preselect that
   * enemy per the spec's enemy-token scenario.
   */
  readonly ctx: ITacticalCommandContext;
  /** Shell mode — gates GM commands. */
  readonly shellMode: ShellMode;
  /**
   * Pixel position to anchor the menu at (clientX/clientY from the
   * triggering pointer event). The menu uses fixed positioning.
   */
  readonly anchor: { readonly x: number; readonly y: number };
  /** Close callback fired on Escape, outside-click, or after dispatch. */
  readonly onClose: () => void;
  /** Same dispatch contract as the dock — actionId routes to engine. */
  readonly onAction: TacticalActionHandler;
  /**
   * Optional callback fired when an enemy-target command is selected
   * — the host updates `targetUnitId` in shell state so the dock and
   * preview surfaces see the same selection.
   */
  readonly onTargetEnemy?: (targetId: string) => void;
}

interface MenuItemProps {
  readonly command: ITacticalCommand;
  readonly availability: CommandAvailability;
  readonly onActivate: () => void;
}

function MenuItem({
  command,
  availability,
  onActivate,
}: MenuItemProps): React.ReactElement {
  const disabled = !availability.available;
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onActivate}
      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
        disabled
          ? 'text-text-theme-secondary cursor-not-allowed opacity-50'
          : 'text-text-theme-primary hover:bg-surface-deep cursor-pointer'
      }`}
      data-testid={`token-menu-item-${command.id}`}
      data-command-id={command.id}
      aria-disabled={disabled}
    >
      <span>{command.label}</span>
      {command.hotkey && (
        <span className="text-text-theme-secondary ml-3 text-xs">
          {command.hotkey}
        </span>
      )}
      {disabled && (
        <span
          className="text-warning sr-only"
          data-testid={`token-menu-item-reason-${command.id}`}
        >
          {availability.reason}
        </span>
      )}
    </button>
  );
}

/**
 * The token context menu. Mounts as a fixed-positioned panel
 * anchored to the pointer event coordinates.
 */
export function TokenContextMenu({
  tokenUnitId,
  isFriendly,
  ctx,
  shellMode,
  anchor,
  onClose,
  onAction,
  onTargetEnemy,
}: TokenContextMenuProps): React.ReactElement {
  // For enemy tokens, override the target field per the spec's
  // `Enemy token context menu targets enemy` scenario.
  const effectiveCtx = useMemo<ITacticalCommandContext>(
    () =>
      isFriendly
        ? ctx
        : {
            ...ctx,
            targetUnitId: tokenUnitId,
            targetCombatProjection:
              ctx.combatProjectionByTargetId?.[tokenUnitId] ??
              ctx.targetCombatProjection,
            targetPhysicalAttackOptions:
              ctx.physicalAttackOptionsByTargetId?.[tokenUnitId] ??
              ctx.targetPhysicalAttackOptions,
          },
    [ctx, isFriendly, tokenUnitId],
  );

  // Same registry as the dock — single source of truth.
  const commands = useCommandRegistry(effectiveCtx, shellMode);
  const visible = isFriendly
    ? filterCommandsForFriendlyToken(commands)
    : filterCommandsForEnemyToken(commands);

  const dispatchCommand = useCallback(
    (command: ITacticalCommand) => {
      const availability = command.availability(effectiveCtx);
      if (!availability.available) return;
      if (command.requiresConfirmation) {
        const ok =
          typeof window === 'undefined'
            ? true
            : window.confirm(`Confirm: ${command.label}?`);
        if (!ok) return;
      }
      // Per spec, enemy-targeting commands MUST also persist the
      // preselected target back to shell state so the dock and
      // preview see the same enemy.
      if (!isFriendly && command.targetsEnemy && onTargetEnemy) {
        onTargetEnemy(tokenUnitId);
      }
      const result = command.commit(effectiveCtx);
      if (result.payload === undefined) {
        onAction(result.actionId);
      } else {
        onAction(result.actionId, result.payload);
      }
      onClose();
    },
    [effectiveCtx, isFriendly, onAction, onClose, onTargetEnemy, tokenUnitId],
  );

  // Escape closes the menu.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="menu"
      data-testid="token-context-menu"
      data-token-unit-id={tokenUnitId}
      data-token-side={isFriendly ? 'friendly' : 'enemy'}
      style={{ position: 'fixed', left: anchor.x, top: anchor.y, zIndex: 50 }}
      className="bg-surface-base border-border-theme min-w-[12rem] rounded border shadow-lg"
    >
      <div className="border-border-theme text-text-theme-secondary border-b px-3 py-1 text-xs font-semibold uppercase">
        {isFriendly ? 'Friendly Unit' : 'Enemy Unit'}
      </div>
      {visible.length === 0 ? (
        <div
          className="text-text-theme-secondary px-3 py-2 text-sm"
          data-testid="token-context-menu-empty"
        >
          No commands available.
        </div>
      ) : (
        <div className="py-1">
          {visible.map((command) => (
            <MenuItem
              key={command.id}
              command={command}
              availability={command.availability(effectiveCtx)}
              onActivate={() => dispatchCommand(command)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default TokenContextMenu;
