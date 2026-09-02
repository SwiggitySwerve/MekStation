/**
 * The dock's single command control, its danger predicate, and the gate
 * resolver that decides whether a command may answer for itself.
 *
 * Extracted from `TacticalActionDock.tsx` when the umbrella 19.2 command
 * gate pushed that file past `max-lines`. The split follows the seam the
 * dock already uses for its `.preview` / `.previewSelect` /
 * `.gmIntervention` siblings rather than inventing a new one.
 */

import React, { useState } from 'react';

import type {
  CommandAvailability,
  ITacticalCommand,
  ITacticalCommandContext,
} from '@/types/gameplay';

import { CommandTooltip } from './CommandTooltip';

interface CommandButtonProps {
  readonly command: ITacticalCommand;
  readonly availability: CommandAvailability;
  readonly onActivate: (trigger: HTMLButtonElement) => void;
}

export function CommandButton({
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
      {/*
        The disabled reason, always in the DOM (umbrella 19.2).

        The button has carried `aria-describedby="command-disabled-reason-<id>"`
        since the dock shipped, but nothing ever set that ID - the tooltip
        marks its reason with `data-testid`, which is not an id - so the
        reference dangled and the description reached nobody. Rendering it
        on hover alone could not have fixed that either: a disabled button
        is out of the tab order, so `onFocus` never fires for exactly the
        controls whose reason matters, leaving it reachable only by mouse
        hover. This element is the accessible description; the tooltip
        remains the visible one for sighted users.
      */}
      {/*
        The disabled reason, always in the DOM (umbrella 19.2).

        The button has carried `aria-describedby="command-disabled-reason-<id>"`
        since the dock shipped, but nothing ever set that ID - the tooltip
        marks its reason with `data-testid`, which is not an id - so the
        reference dangled and the description reached nobody. Rendering it
        on hover alone could not have fixed that either: a disabled button
        is out of the tab order, so `onFocus` never fires for exactly the
        controls whose reason matters, leaving it reachable only by mouse
        hover. This element is the accessible description; the tooltip
        remains the visible one for sighted users.
      */}
      {!availability.available && (
        <span id={`command-disabled-reason-${command.id}`} className="sr-only">
          {availability.reason}
        </span>
      )}
      {hover && (
        <CommandTooltip command={command} availability={availability} />
      )}
    </div>
  );
}

export function isDangerCommand(command: ITacticalCommand): boolean {
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
/**
 * Applies the surface gate ahead of a command's own availability.
 *
 * Uniform by construction: when the gate refuses, no command gets to
 * answer for itself. A per-command exception here would be a command
 * dispatching against a board the client already knows is stale.
 *
 * Module-level so the rendering path and the dispatch guard share one
 * definition - a gate that disabled the button but let a programmatic
 * dispatch through would be the worst of both.
 */
export function resolveAvailability(
  command: ITacticalCommand,
  context: ITacticalCommandContext,
  gate: CommandAvailability | undefined,
): CommandAvailability {
  return gate && !gate.available ? gate : command.availability(context);
}
