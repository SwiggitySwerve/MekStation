/**
 * HexContextMenu — right-click menu on an empty hex.
 *
 * Surfaces hex-targetable commands (move-to-hex, indirect-fire-spot,
 * etc) — anything in the registry flagged `targetsHex`. Like
 * TokenContextMenu, it pulls from the SAME `useCommandRegistry`
 * the dock uses, so no parallel dispatch.
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 * @see openspec/changes/add-tactical-action-menu-system/tasks.md §2.2
 */

import React, { useCallback, useMemo } from 'react';

import type {
  CommandAvailability,
  IHexCoordinate,
  ITacticalCommand,
  ITacticalCommandContext,
  TacticalActionHandler,
} from '@/types/gameplay';
import type { ShellMode } from '@/types/gameplay/TacticalShellInterfaces';

import { coordToKey } from '@/utils/gameplay/hexMath';

import { filterCommandsForHex, useCommandRegistry } from './useCommandRegistry';

export interface HexContextMenuProps {
  /** Axial hex coordinate the player right-clicked. */
  readonly hex: IHexCoordinate;
  /**
   * Shell command context. The menu uses the SAME context the dock
   * uses; the right-clicked hex is overridden into `hoveredHex` so
   * hex-targeting commands preview against THAT hex.
   */
  readonly ctx: ITacticalCommandContext;
  /** Shell mode — gates GM commands. */
  readonly shellMode: ShellMode;
  /** Pixel anchor for fixed positioning. */
  readonly anchor: { readonly x: number; readonly y: number };
  /** Close callback. */
  readonly onClose: () => void;
  /** Same dispatch contract as the dock. */
  readonly onAction: TacticalActionHandler;
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
      data-testid={`hex-menu-item-${command.id}`}
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
          data-testid={`hex-menu-item-reason-${command.id}`}
        >
          {availability.reason}
        </span>
      )}
    </button>
  );
}

export function HexContextMenu({
  hex,
  ctx,
  shellMode,
  anchor,
  onClose,
  onAction,
}: HexContextMenuProps): React.ReactElement {
  const effectiveCtx = useMemo<ITacticalCommandContext>(() => {
    const hexKey = coordToKey(hex);
    const projectedTarget =
      ctx.targetMovementProjection &&
      coordToKey(ctx.targetMovementProjection.hex) === hexKey
        ? ctx.targetMovementProjection
        : null;
    return {
      ...ctx,
      hoveredHex: hex,
      targetMovementProjection:
        ctx.movementProjectionByHex?.[hexKey] ?? projectedTarget,
    };
  }, [ctx, hex]);
  const commands = useCommandRegistry(effectiveCtx, shellMode);
  const visible = filterCommandsForHex(commands);

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
      const result = command.commit(effectiveCtx);
      if (result.payload === undefined) {
        onAction(result.actionId);
      } else {
        onAction(result.actionId, result.payload);
      }
      onClose();
    },
    [effectiveCtx, onAction, onClose],
  );

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
      data-testid="hex-context-menu"
      data-hex-q={hex.q}
      data-hex-r={hex.r}
      style={{ position: 'fixed', left: anchor.x, top: anchor.y, zIndex: 50 }}
      className="bg-surface-base border-border-theme min-w-[12rem] rounded border shadow-lg"
    >
      <div className="border-border-theme text-text-theme-secondary border-b px-3 py-1 text-xs font-semibold uppercase">
        Hex ({hex.q}, {hex.r})
      </div>
      {visible.length === 0 ? (
        <div
          className="text-text-theme-secondary px-3 py-2 text-sm"
          data-testid="hex-context-menu-empty"
        >
          No commands available for this hex.
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

export default HexContextMenu;
