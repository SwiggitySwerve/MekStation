import React, { useEffect, useRef, useState } from 'react';

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
  /**
   * Per `add-damage-feedback-ui` task 2.4: monotonic damage counter
   * for this rail. When it increments, the rail plays a 400ms red
   * flash with diagonal hatching (reuses the ArmorPip flash palette
   * so the two surfaces read as the same damage cue). The flash is
   * delayed by `flashDelayMs` so `LocationStatusRow` can sequence the
   * armor rail → structure rail animations per spec scenario "Armor
   * then structure animate sequentially".
   */
  readonly flashCount?: number;
  /** Delay (ms) before the flash starts. Used for sequencing. */
  readonly flashDelayMs?: number;
}

export function ArmorPipRail({
  label,
  current,
  max,
  destroyed,
  kind,
  testId,
  flashCount = 0,
  flashDelayMs = 0,
}: ArmorPipRailProps): React.ReactElement | null {
  // Per task 2.4: track flashCount transitions — each increment
  // triggers the 400ms red flash overlay, optionally delayed by
  // `flashDelayMs` so the parent can sequence armor → structure.
  // Dedupe against the last seen counter so re-renders with the same
  // value don't retrigger the pulse.
  const lastSeenCount = useRef(flashCount);
  const [isFlashing, setIsFlashing] = useState(false);
  useEffect(() => {
    if (flashCount > lastSeenCount.current) {
      lastSeenCount.current = flashCount;
      const startTimer = setTimeout(() => {
        setIsFlashing(true);
        const endTimer = setTimeout(() => setIsFlashing(false), 400);
        // capture end timer for cleanup via closure-local ref
        lastEndTimer.current = endTimer;
      }, flashDelayMs);
      return () => {
        clearTimeout(startTimer);
        if (lastEndTimer.current) clearTimeout(lastEndTimer.current);
      };
    }
    lastSeenCount.current = flashCount;
  }, [flashCount, flashDelayMs]);
  const lastEndTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      className="relative flex items-center gap-1"
      data-testid={testId}
      data-flashing={isFlashing || undefined}
      aria-label={`${label}: ${current} of ${max}${destroyed ? ' (location destroyed)' : ''}`}
    >
      <span className="text-text-theme-secondary w-6 text-[10px] tracking-wide uppercase">
        {label}
      </span>
      <span className="relative flex flex-wrap items-center gap-[2px]">
        {pips}
        {isFlashing && (
          <span
            aria-hidden="true"
            data-testid={`${testId}-flash`}
            className="pointer-events-none absolute inset-0 rounded-sm"
            style={{
              // 60% red flash + diagonal hatch, same treatment as
              // ArmorPip per task 9.1 colorblind-safe pattern
              // reinforcement. 400ms fade matches the spec budget.
              backgroundColor: 'rgba(239, 68, 68, 0.6)',
              backgroundImage:
                'repeating-linear-gradient(45deg, rgba(0,0,0,0.18) 0 4px, transparent 4px 8px)',
              opacity: 1,
              transition: 'opacity 400ms ease-out',
            }}
          />
        )}
      </span>
      {overflow && (
        <span className="text-text-theme-secondary text-[10px]">…</span>
      )}
    </div>
  );
}

export default ArmorPipRail;
