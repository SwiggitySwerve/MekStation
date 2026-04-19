import React from 'react';

import { IWeaponStatus } from '@/types/gameplay';

interface WeaponRowProps {
  weapon: IWeaponStatus;
  isSelected: boolean;
  onToggle?: () => void;
}

/**
 * Per `add-interactive-combat-core-ui` § 7.2: compact inline ammo
 * renderer reused by both mobile and desktop layouts. When
 * `ammoMax` is known the renderer shows `N/M rds` and tints the
 * number red once ammo drops to 25% or below; when only
 * `ammoRemaining` is available it falls back to the legacy "N rds"
 * shape so callers that haven't adopted `ammoMax` keep working.
 */
function InlineAmmoCounter({
  weapon,
  testIdSuffix,
}: {
  weapon: IWeaponStatus;
  testIdSuffix: string;
}): React.ReactElement | null {
  if (weapon.ammoRemaining === undefined) return null;
  const max = weapon.ammoMax;
  const low =
    max !== undefined && max > 0 && weapon.ammoRemaining / max <= 0.25;
  const empty = weapon.ammoRemaining === 0;
  const color = empty
    ? 'text-red-600'
    : low
      ? 'text-amber-600'
      : 'text-text-theme-secondary';
  return (
    <span
      className={`${color} text-xs`}
      data-testid={`weapon-ammo-${weapon.id}${testIdSuffix}`}
      data-ammo-low={low || empty}
    >
      {weapon.ammoRemaining}
      {max !== undefined ? `/${max}` : ''} rds
    </span>
  );
}

/**
 * Per `add-interactive-combat-core-ui` § 7.3: DESTROYED and JAMMED
 * badges rendered inline next to the weapon name. They are
 * rendered as pill-shaped spans so they read correctly at small
 * text sizes AND carry stable data-testids the smoke tests key
 * against. Both can appear at once (e.g. a destroyed weapon whose
 * last state before destruction was jammed) — the layout is
 * flex-gap driven so it handles 0/1/2 badges the same way.
 */
function WeaponStatusBadges({
  weapon,
}: {
  weapon: IWeaponStatus;
}): React.ReactElement | null {
  if (!weapon.destroyed && !weapon.jammed) return null;
  return (
    <span className="flex items-center gap-1">
      {weapon.destroyed && (
        <span
          className="rounded bg-red-600/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-red-600 uppercase"
          data-testid={`weapon-destroyed-${weapon.id}`}
        >
          Destroyed
        </span>
      )}
      {weapon.jammed && !weapon.destroyed && (
        <span
          className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-600 uppercase"
          data-testid={`weapon-jammed-${weapon.id}`}
        >
          Jammed
        </span>
      )}
    </span>
  );
}

export function WeaponRow({
  weapon,
  isSelected,
  onToggle,
}: WeaponRowProps): React.ReactElement {
  // Per `add-interactive-combat-core-ui` § 7.3: jammed weapons are
  // disabled for the turn just like destroyed ones, but they stay
  // visible (strike-through is reserved for destroyed rows so the
  // two states stay visually distinguishable in the list).
  const isAvailable = !weapon.destroyed && !weapon.jammed;
  const rowClasses = weapon.destroyed
    ? 'opacity-50 line-through'
    : weapon.jammed
      ? 'opacity-70'
      : weapon.firedThisTurn
        ? 'bg-yellow-50'
        : '';

  return (
    <div
      className={`hover:bg-surface-deep px-3 py-3 md:flex md:items-center md:px-2 md:py-1 ${rowClasses}`}
      onClick={isAvailable && onToggle ? onToggle : undefined}
      style={{ cursor: isAvailable && onToggle ? 'pointer' : 'default' }}
      data-testid={`weapon-row-${weapon.id}`}
      data-destroyed={weapon.destroyed}
      data-jammed={weapon.jammed ?? false}
    >
      <div className="md:hidden">
        <div className="mb-2 flex items-center gap-3">
          {onToggle && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggle}
              disabled={!isAvailable}
              className="h-5 min-h-[44px] w-5 min-w-[44px] touch-manipulation"
              data-testid={`weapon-checkbox-${weapon.id}-mobile`}
            />
          )}
          <span
            className="flex-1 text-base font-medium"
            data-testid={`weapon-name-${weapon.id}`}
          >
            {weapon.name}
          </span>
          <WeaponStatusBadges weapon={weapon} />
          <span className="text-text-theme-secondary text-sm">
            {weapon.location}
          </span>
        </div>
        <div className="text-text-theme-secondary flex items-center gap-4 pl-8 text-sm">
          <span data-testid={`weapon-heat-${weapon.id}-mobile`}>
            {weapon.heat}H
          </span>
          <span data-testid={`weapon-damage-${weapon.id}-mobile`}>
            {weapon.damage}D
          </span>
          <span>
            S/M/L: {weapon.ranges.short}/{weapon.ranges.medium}/
            {weapon.ranges.long}
          </span>
          <InlineAmmoCounter weapon={weapon} testIdSuffix="-mobile" />
        </div>
      </div>

      <div className="hidden md:contents">
        {onToggle && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggle}
            disabled={!isAvailable}
            className="mr-2"
            data-testid={`weapon-checkbox-${weapon.id}`}
          />
        )}
        <span
          className="flex-1 text-sm"
          data-testid={`weapon-name-${weapon.id}-desktop`}
        >
          {weapon.name}
        </span>
        <WeaponStatusBadges weapon={weapon} />
        <span className="text-text-theme-secondary w-16 text-xs">
          {weapon.location}
        </span>
        <span
          className="text-text-theme-secondary w-8 text-center text-xs"
          data-testid={`weapon-heat-${weapon.id}`}
        >
          {weapon.heat}H
        </span>
        <span
          className="text-text-theme-secondary w-8 text-center text-xs"
          data-testid={`weapon-damage-${weapon.id}`}
        >
          {weapon.damage}D
        </span>
        <span className="text-text-theme-secondary w-20 text-xs">
          {weapon.ranges.short}/{weapon.ranges.medium}/{weapon.ranges.long}
        </span>
        <span className="w-20 text-right">
          <InlineAmmoCounter weapon={weapon} testIdSuffix="" />
        </span>
      </div>
    </div>
  );
}

export default WeaponRow;
