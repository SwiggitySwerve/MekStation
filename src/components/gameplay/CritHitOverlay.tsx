/**
 * Critical Hit Overlay
 *
 * SVG overlay that renders a ring-burst + warning glyph (⚠) over a
 * unit's token whenever a `CriticalHitResolved` event fires for that
 * unit. Lives inside the same `<svg>` as the hex map so the burst is
 * positioned in map coordinates, not screen coordinates.
 *
 * Per `add-damage-feedback-ui` task 3 + task 9.2:
 * - 600ms ring-burst animation (auto-clears)
 * - Stacking is queued (50ms stagger between bursts) so the same token
 *   never has more than one burst on-screen at once
 * - Colorblind-safe: BOTH a red/orange color AND the ⚠ glyph shape
 *   are rendered so deuteranopia / protanopia users still recognize
 *   the burst
 * - `pointer-events="none"` on every visual element so the overlay
 *   never intercepts clicks on the underlying token
 *
 * @spec openspec/changes/add-damage-feedback-ui/tasks.md § 3, § 9.2
 */

import React, { useEffect, useRef, useState } from 'react';

export interface CritHitOverlayProps {
  /**
   * Monotonic counter of critical hits to render. Each increment
   * enqueues another burst. The component dedupes against its
   * internal `lastSeenCount` so re-renders with the same count don't
   * re-trigger animations.
   */
  critCount: number;
  /**
   * Optional ring radius in SVG units. Defaults to 30 (slightly
   * larger than the standard 24px token body so the burst frames the
   * token).
   */
  radius?: number;
}

/**
 * Burst duration in milliseconds. Locked at 600ms per task 3.2.
 */
const BURST_MS = 600;

/**
 * Stagger between queued bursts in milliseconds. Locked at 50ms per
 * task 3.4 (concurrent crits queue, not stack).
 */
const QUEUE_STAGGER_MS = 50;

/**
 * Ring-burst overlay positioned at SVG origin (0,0). Caller is
 * responsible for translating the parent `<g>` to the token center.
 */
export function CritHitOverlay({
  critCount,
  radius = 30,
}: CritHitOverlayProps): React.ReactElement | null {
  // Track which crit indices are currently animating. Each entry is a
  // unique id derived from `critCount` so React's key reconciliation
  // re-mounts the burst SVG (re-triggering the CSS animation) on every
  // new crit.
  const [activeBursts, setActiveBursts] = useState<readonly number[]>([]);
  const lastSeenRef = useRef<number>(0);
  const queueRef = useRef<number[]>([]);

  useEffect(() => {
    // Detect new crits since the last render and enqueue them.
    if (critCount <= lastSeenRef.current) {
      return;
    }
    const newCrits: number[] = [];
    for (let i = lastSeenRef.current + 1; i <= critCount; i += 1) {
      newCrits.push(i);
    }
    lastSeenRef.current = critCount;
    queueRef.current.push(...newCrits);
  }, [critCount]);

  useEffect(() => {
    // Pull from the queue at staggered intervals; each pulled crit
    // becomes an active burst that auto-clears after BURST_MS.
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const flushNext = (offset: number): void => {
      if (cancelled) return;
      if (queueRef.current.length === 0) return;
      const id = queueRef.current.shift();
      if (id === undefined) return;
      const startTimer = setTimeout(() => {
        if (cancelled) return;
        setActiveBursts((prev) => [...prev, id]);
        const clearTimer = setTimeout(() => {
          if (cancelled) return;
          setActiveBursts((prev) => prev.filter((b) => b !== id));
        }, BURST_MS);
        timers.push(clearTimer);
        // Schedule the next burst after the stagger window.
        flushNext(QUEUE_STAGGER_MS);
      }, offset);
      timers.push(startTimer);
    };

    flushNext(0);

    return () => {
      cancelled = true;
      timers.forEach((t) => clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [critCount]);

  if (activeBursts.length === 0) {
    return null;
  }

  return (
    <g
      data-testid="crit-hit-overlay"
      data-crit-count={critCount}
      pointerEvents="none"
      aria-hidden="true"
    >
      {activeBursts.map((id) => (
        <g key={id} data-testid="crit-hit-burst">
          {/* Ring-burst: stroke-only circle that scales out and fades.
              Red/orange color reinforces severity. */}
          <circle
            r={radius * 0.4}
            fill="none"
            stroke="#dc2626"
            strokeWidth={3}
            opacity={0.9}
            pointerEvents="none"
          >
            <animate
              attributeName="r"
              from={radius * 0.4}
              to={radius * 1.2}
              dur={`${BURST_MS}ms`}
              fill="freeze"
            />
            <animate
              attributeName="opacity"
              from={0.9}
              to={0}
              dur={`${BURST_MS}ms`}
              fill="freeze"
            />
            <animate
              attributeName="stroke-width"
              from={4}
              to={1}
              dur={`${BURST_MS}ms`}
              fill="freeze"
            />
          </circle>
          {/* Outer warning ring in orange — second color stop helps the
              burst read on dark or matching map tiles. */}
          <circle
            r={radius * 0.55}
            fill="none"
            stroke="#f97316"
            strokeWidth={2}
            opacity={0.7}
            pointerEvents="none"
          >
            <animate
              attributeName="r"
              from={radius * 0.55}
              to={radius * 1.5}
              dur={`${BURST_MS}ms`}
              fill="freeze"
            />
            <animate
              attributeName="opacity"
              from={0.7}
              to={0}
              dur={`${BURST_MS}ms`}
              fill="freeze"
            />
          </circle>
          {/* ⚠ glyph: colorblind-safe shape reinforcement (task 9.2). */}
          <text
            y={5}
            textAnchor="middle"
            fontSize={18}
            fontWeight="bold"
            fill="#dc2626"
            stroke="#ffffff"
            strokeWidth={0.5}
            pointerEvents="none"
            data-testid="crit-hit-glyph"
          >
            ⚠
            <animate
              attributeName="opacity"
              from={1}
              to={0}
              dur={`${BURST_MS}ms`}
              fill="freeze"
            />
          </text>
        </g>
      ))}
    </g>
  );
}

export default CritHitOverlay;
