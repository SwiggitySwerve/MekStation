/**
 * WeaponPalette (change `attack-phase-intent-composer`, phase 2, task 2.2).
 *
 * One row per weapon: name/location, Direct/Indirect mode selector for
 * indirect-capable weapons, forecast columns (final TN + hit%) against the
 * weapon's ASSIGNED target, the assigned-target badge with the inline
 * secondary penalty (D5/D6), and block-at-source rendering: a weapon that
 * cannot legally assign to the focused working target renders its toggle
 * disabled with the rules-backed reason and a NON-COLOR-ONLY blocked glyph
 * (same a11y encoding as the movement PosturePalette).
 *
 * Toggling calls `onToggleWeapon(weaponId)` — assignment routing (against
 * the focused target) lives in the store reducer, never here.
 *
 * @spec openspec/changes/attack-phase-intent-composer/specs/tactical-attack-intent/spec.md
 */

import React from 'react';

import type { WeaponFireMode } from '@/types/gameplay';

import type { IWeaponPaletteRow } from './composer.types';

export interface WeaponPaletteProps {
  readonly rows: readonly IWeaponPaletteRow[];
  readonly onToggleWeapon: (weaponId: string) => void;
  readonly onSetMode: (weaponId: string, mode: WeaponFireMode) => void;
}

function WeaponRow({
  row,
  onToggleWeapon,
  onSetMode,
}: {
  readonly row: IWeaponPaletteRow;
  readonly onToggleWeapon: (weaponId: string) => void;
  readonly onSetMode: (weaponId: string, mode: WeaponFireMode) => void;
}): React.ReactElement {
  const assigned = row.assignedTargetId !== null;
  const reasonId = row.toggleDisabled
    ? `weapon-blocked-reason-${row.weaponId}`
    : undefined;

  return (
    <div
      className="flex min-w-0 flex-wrap items-center gap-2"
      data-testid={`weapon-palette-row-${row.weaponId}`}
      data-weapon-assigned={assigned ? 'true' : undefined}
      data-weapon-secondary={row.isSecondaryAssignment ? 'true' : undefined}
    >
      <button
        type="button"
        disabled={row.toggleDisabled}
        onClick={() => {
          if (!row.toggleDisabled) onToggleWeapon(row.weaponId);
        }}
        data-testid={`weapon-toggle-${row.weaponId}`}
        data-weapon-blocked={row.toggleDisabled ? 'true' : undefined}
        aria-pressed={assigned}
        aria-disabled={row.toggleDisabled}
        aria-describedby={reasonId}
        aria-label={`${row.weaponName} (${row.location})${
          assigned ? `, assigned to ${row.assignedTargetName}` : ''
        }${
          row.toggleDisabled
            ? ` (blocked: ${row.toggleDisabledReason ?? ''})`
            : ''
        }`}
        className={`focus:ring-border-theme flex min-h-[36px] items-center gap-2 rounded px-2 py-1 text-sm font-medium transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none ${
          row.toggleDisabled
            ? 'bg-surface-base text-text-theme-secondary cursor-not-allowed opacity-50'
            : assigned
              ? 'bg-surface-deep text-text-theme-primary ring-border-theme cursor-pointer ring-1'
              : 'bg-surface-raised hover:bg-surface-deep text-text-theme-primary cursor-pointer'
        }`}
      >
        {row.toggleDisabled && (
          // Non-color-only blocked encoding (mirrors PosturePalette).
          <span aria-hidden="true" data-weapon-blocked-glyph="true">
            {'⊘'}
          </span>
        )}
        <span>{row.weaponName}</span>
        <span className="text-text-theme-secondary text-xs">
          {row.location}
        </span>
      </button>
      {row.supportsIndirectMode && (
        <select
          value={row.mode}
          onChange={(event) =>
            onSetMode(row.weaponId, event.target.value as WeaponFireMode)
          }
          data-testid={`weapon-mode-${row.weaponId}`}
          aria-label={`${row.weaponName} fire mode`}
          className="bg-surface-raised text-text-theme-primary border-border-theme rounded border px-1 py-0.5 text-xs"
        >
          <option value="Direct">Direct</option>
          <option value="Indirect">Indirect</option>
        </select>
      )}
      {assigned && (
        <span
          className="text-text-theme-secondary text-xs"
          data-testid={`weapon-assignment-${row.weaponId}`}
        >
          {'→ '}
          {row.assignedTargetName}
          {row.isSecondaryAssignment && row.secondaryPenalty !== null && (
            // Inline secondary penalty at assignment time (D5/D6): visible
            // before any commit, sourced from secondary-target-tracking.
            <span
              className="ml-1 font-semibold text-amber-300"
              data-testid={`weapon-secondary-penalty-${row.weaponId}`}
            >
              secondary +{row.secondaryPenalty}
            </span>
          )}
        </span>
      )}
      {row.finalToHit !== null && row.hitProbability !== null && (
        <span
          className="text-text-theme-secondary ml-auto text-xs tabular-nums"
          data-testid={`weapon-forecast-${row.weaponId}`}
        >
          TN {row.finalToHit} · {row.hitProbability}%
        </span>
      )}
      {row.toggleDisabled && row.toggleDisabledReason && (
        <span
          id={reasonId}
          className="text-text-theme-secondary text-xs italic"
          data-testid={`weapon-blocked-reason-${row.weaponId}`}
        >
          {row.toggleDisabledReason}
        </span>
      )}
    </div>
  );
}

export function WeaponPalette({
  rows,
  onToggleWeapon,
  onSetMode,
}: WeaponPaletteProps): React.ReactElement {
  return (
    <div
      className="flex flex-col gap-1"
      data-testid="attack-weapon-palette"
      role="group"
      aria-label="Weapon palette"
    >
      <span className="text-text-theme-secondary text-xs font-semibold uppercase">
        Weapons
      </span>
      <div className="flex flex-col gap-1">
        {rows.length === 0 && (
          <span
            className="text-text-theme-secondary text-xs"
            data-testid="attack-weapon-palette-empty"
          >
            No weapons available.
          </span>
        )}
        {rows.map((row) => (
          <WeaponRow
            key={row.weaponId}
            row={row}
            onToggleWeapon={onToggleWeapon}
            onSetMode={onSetMode}
          />
        ))}
      </div>
    </div>
  );
}

export default WeaponPalette;
