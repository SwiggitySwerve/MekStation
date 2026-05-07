/**
 * KeyMomentMarkers — overlay for `<ReplayTimeline>` that renders colored
 * badges at high-value gameplay events (kills, crits, ammo cookoffs,
 * pilot hits, falls). Click a badge to seek the scrubber to that event.
 *
 * Per `add-replay-timeline-markers` (combat-analytics delta —
 * "Replay Timeline Key-Moment Markers Contract").
 *
 * @spec openspec/changes/add-replay-timeline-markers/specs/combat-analytics/spec.md
 */

import React, { useMemo } from 'react';

import { GameEventType, IGameEvent } from '@/types/gameplay';

// =============================================================================
// Types
// =============================================================================

export interface KeyMomentMarkersProps {
  /** Gameplay event log used to derive key moments. */
  readonly events: readonly IGameEvent[];
  /**
   * Lower bound of the timeline range (inclusive). Used to project an
   * event's `sequence` onto a 0–1 horizontal position. Typically the
   * sequence of the first event in the visible range.
   */
  readonly minSequence: number;
  /**
   * Upper bound of the timeline range (inclusive). When `minSequence
   * === maxSequence` (single-event log), all badges collapse to
   * position 0.
   */
  readonly maxSequence: number;
  /**
   * Seek callback invoked when the user clicks a badge. Receives the
   * 0–1 relative position of the clicked event.
   */
  readonly onSeek: (progress: number) => void;
  /** Optional class names appended to the overlay container. */
  readonly className?: string;
}

interface KeyMoment {
  readonly id: string;
  readonly sequence: number;
  readonly position: number;
  readonly type: GameEventType;
  readonly label: string;
}

// =============================================================================
// Color mapping
// =============================================================================

/**
 * Five key-moment event types and their badge colors. Per the spec
 * scenario "Key-moment markers render at the correct positions": red /
 * orange / purple / yellow / gray.
 *
 * `CriticalHit` and `CriticalHitResolved` share the orange badge —
 * legacy and Phase-4 emitters both surface as critical hits.
 */
const MARKER_COLOR: Partial<Record<GameEventType, string>> = {
  [GameEventType.UnitDestroyed]: 'bg-red-500 hover:bg-red-400',
  [GameEventType.CriticalHit]: 'bg-orange-500 hover:bg-orange-400',
  [GameEventType.CriticalHitResolved]: 'bg-orange-500 hover:bg-orange-400',
  [GameEventType.AmmoExplosion]: 'bg-purple-500 hover:bg-purple-400',
  [GameEventType.PilotHit]: 'bg-yellow-500 hover:bg-yellow-400',
  [GameEventType.UnitFell]: 'bg-gray-400 hover:bg-gray-300',
};

const TARGET_TYPES: ReadonlySet<GameEventType> = new Set(
  Object.keys(MARKER_COLOR) as GameEventType[],
);

// =============================================================================
// Component
// =============================================================================

/**
 * Render a colored badge per key-moment event. Memoizes the filtered
 * marker list on `[events, minSequence, maxSequence]` so re-renders
 * during scrubbing don't re-walk the full event log.
 */
export function KeyMomentMarkers({
  events,
  minSequence,
  maxSequence,
  onSeek,
  className = '',
}: KeyMomentMarkersProps): React.ReactElement | null {
  const moments = useMemo<readonly KeyMoment[]>(() => {
    if (events.length === 0) return [];
    const range = maxSequence - minSequence;
    // Guard against divide-by-zero — single-event ranges collapse to 0.
    const denom = range > 0 ? range : 1;
    const out: KeyMoment[] = [];
    for (const event of events) {
      if (!TARGET_TYPES.has(event.type)) continue;
      const position = (event.sequence - minSequence) / denom;
      // Clamp out-of-range events to [0, 1] so a stray event with
      // `sequence < minSequence` doesn't render at a negative offset.
      const clamped = Math.max(0, Math.min(1, position));
      out.push({
        id: event.id,
        sequence: event.sequence,
        position: clamped,
        type: event.type,
        label: formatLabel(event),
      });
    }
    return out;
  }, [events, minSequence, maxSequence]);

  if (moments.length === 0) return null;

  return (
    <div
      className={`pointer-events-none absolute inset-0 ${className}`}
      data-testid="key-moment-markers"
    >
      {moments.map((moment) => (
        <button
          key={moment.id}
          type="button"
          data-testid={`key-moment-marker-${moment.id}`}
          data-event-type={moment.type}
          className={`pointer-events-auto absolute top-0 h-full w-2 cursor-pointer rounded-sm transition-all duration-150 ${
            MARKER_COLOR[moment.type] ?? 'bg-slate-500'
          } opacity-80 hover:scale-110 hover:opacity-100`}
          style={{
            left: `${moment.position * 100}%`,
            transform: 'translateX(-50%)',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSeek(moment.position);
          }}
          title={moment.label}
        />
      ))}
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Build a hover-tooltip label for a key-moment badge. Plain-English so
 * the user can identify the event without parsing the type string.
 */
function formatLabel(event: IGameEvent): string {
  const baseLabel = ((): string => {
    switch (event.type) {
      case GameEventType.UnitDestroyed:
        return 'Unit destroyed';
      case GameEventType.CriticalHit:
      case GameEventType.CriticalHitResolved:
        return 'Critical hit';
      case GameEventType.AmmoExplosion:
        return 'Ammo explosion';
      case GameEventType.PilotHit:
        return 'Pilot hit';
      case GameEventType.UnitFell:
        return 'Unit fell';
      default:
        return String(event.type);
    }
  })();
  return `${baseLabel} — Turn ${event.turn} (#${event.sequence})`;
}

export default KeyMomentMarkers;
