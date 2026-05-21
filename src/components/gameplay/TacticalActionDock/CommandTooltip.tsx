/**
 * CommandTooltip — shared tooltip / detail-pane content for tactical
 * commands. Renders label + hotkey hint + (when disabled) the
 * engine-derived disabledReason.
 *
 * Per the spec's `Disabled command explains invalidity` scenario, the
 * disabled reason MUST surface in a tooltip OR detail pane. This
 * component is the tooltip surface; the dock's per-command button
 * shows it on hover/focus.
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 * @see openspec/changes/add-tactical-action-menu-system/tasks.md §2.3
 */

import React from 'react';

import {
  buildCommandTooltip,
  type CommandAvailability,
  type ITacticalCommand,
} from '@/types/gameplay';

export interface CommandTooltipProps {
  readonly command: ITacticalCommand;
  readonly availability: CommandAvailability;
}

/**
 * Render the tooltip text for a command. Returns null when there is
 * nothing to show (no hotkey, no disabled reason — the label alone
 * is on the button face).
 */
export function CommandTooltip({
  command,
  availability,
}: CommandTooltipProps): React.ReactElement | null {
  const tooltip = buildCommandTooltip(command, availability);
  const hasHotkey = Boolean(tooltip.hotkey);
  const hasReason = Boolean(tooltip.disabledReason);

  if (!hasHotkey && !hasReason) return null;

  return (
    <div
      role="tooltip"
      data-testid={`command-tooltip-${command.id}`}
      className="bg-surface-deep text-text-theme-primary border-border-theme pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded border px-2 py-1 text-xs whitespace-nowrap shadow"
    >
      <div className="font-medium">{tooltip.label}</div>
      {hasHotkey && (
        <div className="text-text-theme-secondary text-xs">
          Hotkey: <kbd className="font-mono">{tooltip.hotkey}</kbd>
        </div>
      )}
      {hasReason && (
        <div
          className="text-warning mt-1 text-xs"
          data-testid={`command-disabled-reason-${command.id}`}
        >
          {tooltip.disabledReason}
        </div>
      )}
    </div>
  );
}

/**
 * Inline detail-pane variant of the tooltip — used by the right-tray
 * inspector to show the focused command's full reason without
 * requiring hover. Identical content, different layout container.
 */
export function CommandDetailPane({
  command,
  availability,
}: CommandTooltipProps): React.ReactElement {
  const tooltip = buildCommandTooltip(command, availability);
  return (
    <div
      data-testid={`command-detail-${command.id}`}
      className="border-border-theme bg-surface-raised rounded border p-3"
    >
      <div className="text-text-theme-primary font-medium">{tooltip.label}</div>
      {tooltip.hotkey && (
        <div className="text-text-theme-secondary mt-1 text-sm">
          Hotkey: <kbd className="font-mono">{tooltip.hotkey}</kbd>
        </div>
      )}
      {tooltip.disabledReason && (
        <div
          className="text-warning mt-2 text-sm"
          data-testid={`command-detail-reason-${command.id}`}
        >
          {tooltip.disabledReason}
        </div>
      )}
    </div>
  );
}
