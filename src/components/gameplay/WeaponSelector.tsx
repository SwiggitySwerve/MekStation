/**
 * WeaponSelector
 *
 * Per `add-combat-phase-ui-flows`: list of the attacker's weapons in
 * the Attack-phase action panel. Each row exposes a checkbox so the
 * player can multi-select which weapons to fire this round, plus
 * status badges for "Destroyed", "No ammo", and "Out of range".
 *
 * Selection is propagated up via `onToggle` so the parent (the action
 * panel wrapper) can call `useGameplayStore.togglePlannedWeapon`.
 *
 * Heat impact: the footer sums the heat cost of the currently
 * selected weapons so the player can sanity-check before opening the
 * forecast modal.
 */

import React, { useMemo } from 'react';

import type { IWeapon } from '@/simulation/ai/types';

export interface WeaponSelectorProps {
  /** All weapons mounted on the attacker */
  weapons: readonly IWeapon[];
  /** Distance in hexes from attacker to target */
  rangeToTarget: number;
  /** Currently selected weapon ids */
  selectedWeaponIds: readonly string[];
  /** Ammo remaining per weapon id (-1 = energy / unlimited) */
  ammo: Readonly<Record<string, number>>;
  /** Callback fired when a weapon is toggled */
  onToggle: (weaponId: string) => void;
  /** Optional className */
  className?: string;
}

interface RangeBadgeProps {
  label: string;
  range: number;
}

function RangeBadge({ label, range }: RangeBadgeProps): React.ReactElement {
  return (
    <span
      className="text-text-theme-muted rounded bg-gray-100 px-1.5 py-0.5 text-xs"
      data-testid={`range-badge-${label.toLowerCase()}`}
    >
      {label}:{range}
    </span>
  );
}

interface StatusBadgeProps {
  label: string;
  testid: string;
  tone: 'red' | 'amber' | 'gray';
}

function StatusBadge({
  label,
  testid,
  tone,
}: StatusBadgeProps): React.ReactElement {
  const toneClasses =
    tone === 'red'
      ? 'bg-red-100 text-red-700'
      : tone === 'amber'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-gray-100 text-gray-600';

  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${toneClasses}`}
      data-testid={testid}
    >
      {label}
    </span>
  );
}

interface WeaponRowProps {
  weapon: IWeapon;
  rangeToTarget: number;
  selected: boolean;
  ammoRemaining: number;
  onToggle: () => void;
}

/**
 * Single weapon row with its checkbox + badges. Out-of-range and
 * no-ammo conditions both disable the checkbox so the player can't
 * accidentally queue an unfireable weapon.
 */
function WeaponRow({
  weapon,
  rangeToTarget,
  selected,
  ammoRemaining,
  onToggle,
}: WeaponRowProps): React.ReactElement {
  const destroyed = weapon.destroyed;
  // Reasoning: ammoRemaining of -1 means energy weapon (unlimited).
  // Anything > 0 has ammo. Exactly 0 is empty. The lookup defaults to
  // -1 in the parent so weapons without bins are treated as energy.
  const noAmmo = ammoRemaining === 0;
  const outOfRange =
    rangeToTarget > weapon.longRange ||
    (weapon.minRange > 0 && rangeToTarget < weapon.minRange);

  const disabled = destroyed || noAmmo || outOfRange;

  return (
    <li
      className={`bg-surface-base flex flex-col gap-1 rounded border border-gray-200 p-2 ${
        disabled ? 'opacity-60' : ''
      }`}
      data-testid={`weapon-row-${weapon.id}`}
      data-disabled={disabled}
    >
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={selected}
          disabled={disabled}
          onChange={onToggle}
          className="h-4 w-4"
          data-testid={`weapon-checkbox-${weapon.id}`}
        />
        <span className="text-text-theme-primary flex-1 text-sm font-medium">
          {weapon.name}
        </span>
        <span className="text-text-theme-muted text-xs">
          Heat {weapon.heat}
        </span>
      </label>
      <div className="ml-6 flex flex-wrap items-center gap-1.5">
        <RangeBadge label="S" range={weapon.shortRange} />
        <RangeBadge label="M" range={weapon.mediumRange} />
        <RangeBadge label="L" range={weapon.longRange} />
        {ammoRemaining >= 0 && (
          <span
            className="text-text-theme-muted rounded bg-gray-100 px-1.5 py-0.5 text-xs"
            data-testid={`ammo-remaining-${weapon.id}`}
          >
            Ammo: {ammoRemaining}
          </span>
        )}
        {destroyed && (
          <StatusBadge
            label="Destroyed"
            testid={`weapon-destroyed-${weapon.id}`}
            tone="gray"
          />
        )}
        {!destroyed && noAmmo && (
          <StatusBadge
            label="No ammo"
            testid={`weapon-no-ammo-${weapon.id}`}
            tone="red"
          />
        )}
        {!destroyed && outOfRange && (
          <StatusBadge
            label="Out of range"
            testid={`weapon-out-of-range-${weapon.id}`}
            tone="amber"
          />
        )}
      </div>
    </li>
  );
}

export function WeaponSelector({
  weapons,
  rangeToTarget,
  selectedWeaponIds,
  ammo,
  onToggle,
  className = '',
}: WeaponSelectorProps): React.ReactElement {
  const totalHeat = useMemo(() => {
    return weapons
      .filter((w) => selectedWeaponIds.includes(w.id))
      .reduce((sum, w) => sum + w.heat, 0);
  }, [weapons, selectedWeaponIds]);

  if (weapons.length === 0) {
    return (
      <div
        className={`text-text-theme-muted text-sm ${className}`}
        data-testid="weapon-selector-empty"
      >
        No weapons available.
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-2 ${className}`}
      data-testid="weapon-selector"
    >
      <ul className="flex flex-col gap-2" data-testid="weapon-list">
        {weapons.map((weapon) => {
          // Default to -1 (energy / unlimited) when the unit has no
          // ammo entry — matches how `IAIUnitState.ammo` is shaped.
          const ammoRemaining = ammo[weapon.id] ?? -1;
          return (
            <WeaponRow
              key={weapon.id}
              weapon={weapon}
              rangeToTarget={rangeToTarget}
              selected={selectedWeaponIds.includes(weapon.id)}
              ammoRemaining={ammoRemaining}
              onToggle={() => onToggle(weapon.id)}
            />
          );
        })}
      </ul>
      <div
        className="text-text-theme-secondary border-t border-gray-200 pt-2 text-xs"
        data-testid="weapon-selector-total-heat"
      >
        Total heat if fired: <span className="font-semibold">+{totalHeat}</span>
      </div>
    </div>
  );
}

export default WeaponSelector;
