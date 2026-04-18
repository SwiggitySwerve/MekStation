/**
 * Pilot Wound Flash
 *
 * SVG overlay that signals pilot-hit state for a unit's token. Sits
 * inside the same `<svg>` as the hex map, translated to the token's
 * coordinate by the parent `<g>`.
 *
 * Per `add-damage-feedback-ui` task 5 + task 9.3:
 * - On a fresh `PilotHit` event, a yellow pulsing ring frames the
 *   token for ~800ms (the "roll happening" pulse).
 * - If the pilot is now unconscious, a persistent yellow `Z` badge is
 *   rendered (with `Z` glyph for colorblind safety per task 9.3).
 * - If the pilot is now dead, a persistent red "PILOT KILLED" banner
 *   replaces the badge.
 *
 * The component is fully driven by props: parent decides which state
 * to show. Animation is internal (the yellow flash auto-clears after
 * 800ms; the badge / banner persist until props change).
 *
 * @spec openspec/changes/add-damage-feedback-ui/tasks.md § 5, § 6, § 9.3
 */

import React, { useEffect, useRef, useState } from 'react';

export interface PilotWoundFlashProps {
  /**
   * Monotonic counter of pilot-hit events. Each increment re-triggers
   * the yellow pulse. Used so the same `unconscious` / `killed`
   * snapshot doesn't replay the pulse on every render.
   */
  hitCount: number;
  /**
   * Persistent state: pilot is unconscious. Renders the yellow `Z`
   * badge until cleared by the caller.
   */
  unconscious?: boolean;
  /**
   * Persistent state: pilot is dead. Renders the red "PILOT KILLED"
   * banner. Takes precedence over `unconscious`.
   */
  killed?: boolean;
  /**
   * Token half-radius in SVG units. Used to size the pulse ring.
   * Defaults to 24 (matches the standard `HEX_SIZE * 0.5` token body).
   */
  tokenRadius?: number;
}

/**
 * Pulse duration in milliseconds. Longer than the crit burst (800ms
 * vs 600ms) to give the player time to read the badge / banner that
 * settles in afterward.
 */
const PULSE_MS = 800;

export function PilotWoundFlash({
  hitCount,
  unconscious = false,
  killed = false,
  tokenRadius = 24,
}: PilotWoundFlashProps): React.ReactElement | null {
  const [isPulsing, setIsPulsing] = useState(false);
  // Use a ref (not state) so updating it doesn't re-trigger the
  // effect's cleanup. Prior bug: `setLastSeen(hitCount)` caused the
  // effect to re-run with `lastSeen === hitCount`, returning early
  // and calling the cleanup which cleared the 800ms timer — leaving
  // the pulse stuck on screen forever.
  const lastSeenRef = useRef(0);

  useEffect(() => {
    if (hitCount <= lastSeenRef.current) {
      return;
    }
    lastSeenRef.current = hitCount;
    setIsPulsing(true);
    const timer = setTimeout(() => setIsPulsing(false), PULSE_MS);
    return () => clearTimeout(timer);
  }, [hitCount]);

  // If nothing to show, render nothing (so React unmounts cleanly).
  if (!isPulsing && !unconscious && !killed) {
    return null;
  }

  return (
    <g
      data-testid="pilot-wound-flash"
      data-pulsing={isPulsing || undefined}
      data-unconscious={unconscious || undefined}
      data-killed={killed || undefined}
      pointerEvents="none"
      aria-hidden="true"
    >
      {/* Yellow pulsing ring: only visible during the active pulse. */}
      {isPulsing && (
        <circle
          data-testid="pilot-wound-pulse"
          r={tokenRadius * 1.15}
          fill="none"
          stroke="#facc15"
          strokeWidth={3}
          opacity={0.9}
          pointerEvents="none"
        >
          <animate
            attributeName="r"
            from={tokenRadius * 1.05}
            to={tokenRadius * 1.4}
            dur={`${PULSE_MS}ms`}
            fill="freeze"
          />
          <animate
            attributeName="opacity"
            values="0.9;0.4;0.9;0"
            keyTimes="0;0.33;0.66;1"
            dur={`${PULSE_MS}ms`}
            fill="freeze"
          />
        </circle>
      )}
      {/* Pilot killed banner: takes precedence over unconscious badge. */}
      {killed && (
        <g
          data-testid="pilot-killed-banner"
          transform={`translate(0, ${tokenRadius * 1.6})`}
          pointerEvents="none"
        >
          <rect
            x={-tokenRadius * 1.4}
            y={-9}
            width={tokenRadius * 2.8}
            height={18}
            rx={3}
            fill="#dc2626"
            stroke="#7f1d1d"
            strokeWidth={1}
            pointerEvents="none"
          />
          <text
            y={4}
            textAnchor="middle"
            fontSize={10}
            fontWeight="bold"
            fill="#ffffff"
            pointerEvents="none"
          >
            ✕ PILOT KILLED
          </text>
        </g>
      )}
      {/* Unconscious badge: only when alive but unconscious. */}
      {!killed && unconscious && (
        <g
          data-testid="pilot-unconscious-badge"
          transform={`translate(${tokenRadius * 0.9}, ${-tokenRadius * 0.9})`}
          pointerEvents="none"
        >
          <circle
            r={9}
            fill="#facc15"
            stroke="#854d0e"
            strokeWidth={1.5}
            pointerEvents="none"
          />
          {/* `Z` glyph: colorblind-safe shape (task 9.3). */}
          <text
            y={4}
            textAnchor="middle"
            fontSize={12}
            fontWeight="bold"
            fill="#1f2937"
            pointerEvents="none"
            data-testid="pilot-unconscious-glyph"
          >
            Z
          </text>
        </g>
      )}
    </g>
  );
}

export default PilotWoundFlash;
