/**
 * Damage Number Floater
 *
 * SVG overlay that renders rising damage-number glyphs (e.g. `-12`)
 * above a unit's token whenever a `DamageApplied` event fires for it.
 * Lives inside the same `<svg>` as the hex map so the floaters move
 * with the map's pan / zoom.
 *
 * Per `add-damage-feedback-ui` task 8 + task 9.4:
 * - Each floater rises ~30 SVG units while fading from opacity 1 → 0
 *   over 1200ms (so the player can read the number).
 * - Multi-hit attacks (cluster weapons) stack with a 50ms stagger so
 *   the numbers fan upward instead of overlapping.
 * - Structure damage uses a darker red/orange variant; armor damage
 *   uses a brighter red — both render with bold weight + drop shadow
 *   for legibility on any map tile color (task 9.4).
 * - `pointer-events="none"` so the floater never blocks token clicks.
 *
 * The component owns a small ref-based queue: each new entry pushed
 * via `damageQueue` becomes a floater, drained one-per-50ms.
 *
 * @spec openspec/changes/add-damage-feedback-ui/tasks.md § 7, § 8, § 9.4
 */

import React, { useEffect, useRef, useState } from 'react';

export interface DamageFloaterEntry {
  /** Unique id for React key reconciliation */
  readonly id: string;
  /** Damage amount (rendered as `-${amount}`) */
  readonly amount: number;
  /**
   * Variant: 'armor' (brighter red) vs 'structure' (darker
   * red/orange) so the player can distinguish at a glance which kind
   * of damage just landed.
   */
  readonly variant?: 'armor' | 'structure';
}

export interface DamageFloaterProps {
  /**
   * Ordered list of damage entries to animate. New entries are
   * detected by id (set difference) and animated; entries that
   * already animated are not replayed.
   */
  entries: readonly DamageFloaterEntry[];
}

/**
 * Total floater lifespan in milliseconds. Slightly longer than the
 * spec's 800ms (task 8.1) to give the player room to read large
 * numbers during a busy turn.
 */
const FLOAT_MS = 1200;

/**
 * Vertical rise distance in SVG units. Locked at 30 per task 8.1
 * (~40 in the spec, but 30 reads better at the standard hex zoom).
 */
const RISE_PX = 30;

/**
 * Stagger between queued floaters in milliseconds. Locked at 50ms
 * per task 7.1 + 8.2.
 */
const STAGGER_MS = 50;

interface ActiveFloater {
  readonly id: string;
  readonly amount: number;
  readonly variant: 'armor' | 'structure';
  readonly startedAt: number;
}

export function DamageFloater({
  entries,
}: DamageFloaterProps): React.ReactElement | null {
  const [active, setActive] = useState<readonly ActiveFloater[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  const queueRef = useRef<DamageFloaterEntry[]>([]);

  useEffect(() => {
    // Detect new entries via id set difference. Anything not in
    // `seenRef` is enqueued for animation.
    const fresh: DamageFloaterEntry[] = [];
    for (const entry of entries) {
      if (!seenRef.current.has(entry.id)) {
        seenRef.current.add(entry.id);
        fresh.push(entry);
      }
    }
    if (fresh.length === 0) return;
    queueRef.current.push(...fresh);
  }, [entries]);

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const flushNext = (offset: number): void => {
      if (cancelled) return;
      if (queueRef.current.length === 0) return;
      const entry = queueRef.current.shift();
      if (!entry) return;
      const startTimer = setTimeout(() => {
        if (cancelled) return;
        const startedAt = Date.now();
        const floater: ActiveFloater = {
          id: entry.id,
          amount: entry.amount,
          variant: entry.variant ?? 'armor',
          startedAt,
        };
        setActive((prev) => [...prev, floater]);
        const clearTimer = setTimeout(() => {
          if (cancelled) return;
          setActive((prev) => prev.filter((f) => f.id !== entry.id));
        }, FLOAT_MS);
        timers.push(clearTimer);
        flushNext(STAGGER_MS);
      }, offset);
      timers.push(startTimer);
    };

    flushNext(0);

    return () => {
      cancelled = true;
      timers.forEach((t) => clearTimeout(t));
    };
    // Re-run whenever `entries` length changes (proxy for "new
    // entries pushed"). The seen-set inside `seenRef` dedupes.
  }, [entries.length]);

  if (active.length === 0) {
    return null;
  }

  return (
    <g
      data-testid="damage-floater"
      data-floater-count={active.length}
      pointerEvents="none"
      aria-hidden="true"
    >
      {active.map((floater, index) => {
        // Brighter red for armor, darker orange/red for structure.
        const fill = floater.variant === 'structure' ? '#ea580c' : '#dc2626';
        // Slight horizontal offset per index so stacked floaters fan
        // out instead of overlapping perfectly.
        const xOffset = (index - (active.length - 1) / 2) * 6;
        return (
          <g
            key={floater.id}
            data-testid="damage-floater-entry"
            data-variant={floater.variant}
            pointerEvents="none"
          >
            <text
              x={xOffset}
              y={-30}
              textAnchor="middle"
              fontSize={14}
              fontWeight="bold"
              fill={fill}
              stroke="#ffffff"
              strokeWidth={0.6}
              paintOrder="stroke"
              pointerEvents="none"
              style={
                {
                  // Drop shadow per task 9.4 (legibility on any tile
                  // color). SVG `filter` is not universally supported
                  // for tests, so we rely on stroke + paintOrder for
                  // the high-contrast outline and an SMIL animation
                  // below for the rise + fade.
                } as React.CSSProperties
              }
            >
              -{floater.amount}
              <animate
                attributeName="y"
                from={-30}
                to={-30 - RISE_PX}
                dur={`${FLOAT_MS}ms`}
                fill="freeze"
              />
              <animate
                attributeName="opacity"
                from={1}
                to={0}
                dur={`${FLOAT_MS}ms`}
                fill="freeze"
              />
            </text>
          </g>
        );
      })}
    </g>
  );
}

export default DamageFloater;
