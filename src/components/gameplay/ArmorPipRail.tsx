import React from 'react';

/**
 * Per `add-interactive-combat-core-ui` § 5.1: compact pip rail that
 * renders per-location armor and internal structure as individual
 * dots, so the player can read damage at a glance ("3 of 8 armor
 * pips filled") without parsing numbers. Reuses the same palette
 * language as the full `ArmorPip` button component — green = filled,
 * gray = empty, red = destroyed — but at a dense 8×8 px size suitable
 * for inline rendering inside `LocationStatusRow`. Non-interactive
 * by design; the interactive `ArmorPip` button lives in the damage-
 * feedback record sheet, which is a different surface.
 *
 * Rail caps the rendered pip count at 30 (≈ largest possible mech
 * location armor in canonical TW rules) to protect the layout. If a
 * location is destroyed every pip renders as red.
 */
const ARMOR_PIP_RAIL_CAP = 30;

export interface ArmorPipRailProps {
  readonly label: string;
  readonly current: number;
  readonly max: number;
  readonly destroyed: boolean;
  readonly kind: 'armor' | 'structure';
  readonly testId: string;
}

export function ArmorPipRail({
  label,
  current,
  max,
  destroyed,
  kind,
  testId,
}: ArmorPipRailProps): React.ReactElement | null {
  if (max === 0) return null;
  const shown = Math.min(max, ARMOR_PIP_RAIL_CAP);
  const overflow = max > ARMOR_PIP_RAIL_CAP;
  const pips: React.ReactElement[] = [];
  // Structure pips use a square, armor pips use a circle so the two
  // rails stay visually distinguishable even at the compact size.
  const shapeClass = kind === 'armor' ? 'rounded-full' : 'rounded-sm';

  for (let i = 0; i < shown; i++) {
    const filled = i < current;
    const destroyedPip = destroyed;
    let bg = 'bg-gray-300';
    if (destroyedPip) {
      bg = 'bg-red-500';
    } else if (filled) {
      bg = kind === 'armor' ? 'bg-green-500' : 'bg-amber-500';
    }
    pips.push(
      <span
        key={i}
        aria-hidden="true"
        data-testid={`${testId}-pip-${i}`}
        data-filled={filled && !destroyedPip}
        data-destroyed={destroyedPip}
        className={`inline-block h-2 w-2 ${shapeClass} ${bg}`}
      />,
    );
  }

  return (
    <div
      className="flex items-center gap-1"
      data-testid={testId}
      aria-label={`${label}: ${current} of ${max}${destroyed ? ' (location destroyed)' : ''}`}
    >
      <span className="text-text-theme-secondary w-6 text-[10px] tracking-wide uppercase">
        {label}
      </span>
      <span className="flex flex-wrap items-center gap-[2px]">{pips}</span>
      {overflow && (
        <span className="text-text-theme-secondary text-[10px]">…</span>
      )}
    </div>
  );
}

export default ArmorPipRail;
