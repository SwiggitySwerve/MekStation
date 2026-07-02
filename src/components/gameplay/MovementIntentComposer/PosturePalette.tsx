/**
 * PosturePalette (change `tactical-movement-intent-composer`, phase 4,
 * tactical-movement-intent capability, task 4.2).
 *
 * Renders the Posture Actions legal for the unit's current state (Stand Up,
 * Careful Stand, Go Prone, Hull Down, Evade where legal), each labeled with its
 * rules-derived MP cost. Actions that Live Intersection marks unaffordable
 * render disabled with a NON-COLOR-ONLY disabled encoding (a "blocked" glyph +
 * text alongside the dimmed style), satisfying the spec's a11y requirement.
 * Illegal-for-state actions are never rendered (the source already filtered
 * them out).
 *
 * Adding a posture calls `onAddPosture(action, mpCost)` — the store reducer
 * takes the rules-derived cost from the caller; the palette never derives cost.
 *
 * @spec openspec/changes/tactical-movement-intent-composer/specs/tactical-movement-intent/spec.md
 */

import React from 'react';

import type { PostureActionType } from '@/types/gameplay';

import type { IPosturePaletteEntry } from './composer.types';

export interface PosturePaletteProps {
  readonly entries: readonly IPosturePaletteEntry[];
  readonly onAddPosture: (action: PostureActionType, mpCost: number) => void;
}

function PostureButton({
  entry,
  onAddPosture,
}: {
  readonly entry: IPosturePaletteEntry;
  readonly onAddPosture: (action: PostureActionType, mpCost: number) => void;
}): React.ReactElement {
  const disabled = entry.disabled;
  const reasonId = disabled
    ? `posture-disabled-reason-${entry.action}`
    : undefined;

  return (
    <div className="relative flex flex-col">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) onAddPosture(entry.action, entry.mpCost);
        }}
        data-testid={`posture-action-${entry.action}`}
        data-posture-action={entry.action}
        data-posture-mp={entry.mpCost}
        data-posture-disabled={disabled ? 'true' : undefined}
        aria-disabled={disabled}
        aria-describedby={reasonId}
        aria-label={`${entry.label}, ${entry.mpCost} MP${
          disabled ? ` (unavailable: ${entry.disabledReason ?? ''})` : ''
        }`}
        className={`focus:ring-border-theme flex min-h-[40px] items-center gap-2 rounded px-3 py-2 text-sm font-medium transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none ${
          disabled
            ? 'bg-surface-base text-text-theme-secondary cursor-not-allowed opacity-50'
            : 'bg-surface-raised hover:bg-surface-deep text-text-theme-primary cursor-pointer'
        }`}
      >
        {disabled && (
          // Non-color-only disabled encoding: a blocked glyph so the disabled
          // state is distinguishable without relying on the dimmed hue alone.
          <span aria-hidden="true" data-posture-disabled-glyph="true">
            {'⊘'}
          </span>
        )}
        <span>{entry.label}</span>
        <span className="text-text-theme-secondary text-xs">
          {entry.mpCost} MP
        </span>
        {entry.hotkey && (
          <span className="text-text-theme-secondary text-xs opacity-75">
            ({entry.hotkey})
          </span>
        )}
      </button>
      {disabled && entry.disabledReason && (
        <span id={reasonId} className="sr-only">
          {entry.disabledReason}
        </span>
      )}
    </div>
  );
}

export function PosturePalette({
  entries,
  onAddPosture,
}: PosturePaletteProps): React.ReactElement {
  return (
    <div
      className="flex flex-col gap-1"
      data-testid="movement-posture-palette"
      role="group"
      aria-label="Posture actions"
    >
      <span className="text-text-theme-secondary text-xs font-semibold uppercase">
        Posture
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {entries.length === 0 && (
          <span
            className="text-text-theme-secondary text-xs"
            data-testid="movement-posture-palette-empty"
          >
            No posture actions available.
          </span>
        )}
        {entries.map((entry) => (
          <PostureButton
            key={entry.action}
            entry={entry}
            onAddPosture={onAddPosture}
          />
        ))}
      </div>
    </div>
  );
}

export default PosturePalette;
