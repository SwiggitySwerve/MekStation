/**
 * PhaseChangeMarkers — overlay for `<ReplayTimeline>` that renders
 * dotted vertical lines at every `TurnStarted` and `PhaseChanged`
 * event. Hovering a line reveals a tooltip with the turn number and
 * human-readable phase name (e.g. "Turn 7 — Weapon Attack").
 *
 * Per `add-replay-timeline-markers` (combat-analytics delta —
 * "Replay Timeline Key-Moment Markers Contract").
 *
 * @spec openspec/changes/add-replay-timeline-markers/specs/combat-analytics/spec.md
 */

import React, { useMemo } from 'react';

import { GameEventType, GamePhase, IGameEvent } from '@/types/gameplay';

// =============================================================================
// Types
// =============================================================================

export interface PhaseChangeMarkersProps {
  /** Gameplay event log used to derive phase / turn boundaries. */
  readonly events: readonly IGameEvent[];
  /** Lower bound of the timeline range (inclusive). */
  readonly minSequence: number;
  /** Upper bound of the timeline range (inclusive). */
  readonly maxSequence: number;
  /** Optional class names appended to the overlay container. */
  readonly className?: string;
}

interface PhaseMarker {
  readonly id: string;
  readonly sequence: number;
  readonly position: number;
  readonly turn: number;
  readonly phase: GamePhase;
}

// =============================================================================
// Phase label mapping
// =============================================================================

const PHASE_LABEL: Record<GamePhase, string> = {
  [GamePhase.Initiative]: 'Initiative',
  [GamePhase.Movement]: 'Movement',
  [GamePhase.WeaponAttack]: 'Weapon Attack',
  [GamePhase.PhysicalAttack]: 'Physical Attack',
  [GamePhase.Heat]: 'Heat',
  [GamePhase.End]: 'End',
};

const TARGET_TYPES: ReadonlySet<GameEventType> = new Set([
  GameEventType.TurnStarted,
  GameEventType.PhaseChanged,
]);

// =============================================================================
// Component
// =============================================================================

/**
 * Render a dotted vertical line per phase / turn boundary. Visual style
 * is intentionally subtle (low-contrast dotted) so it sits behind the
 * key-moment markers without competing for attention.
 */
export function PhaseChangeMarkers({
  events,
  minSequence,
  maxSequence,
  className = '',
}: PhaseChangeMarkersProps): React.ReactElement | null {
  const markers = useMemo<readonly PhaseMarker[]>(() => {
    if (events.length === 0) return [];
    const range = maxSequence - minSequence;
    const denom = range > 0 ? range : 1;
    const out: PhaseMarker[] = [];
    for (const event of events) {
      if (!TARGET_TYPES.has(event.type)) continue;
      const position = (event.sequence - minSequence) / denom;
      const clamped = Math.max(0, Math.min(1, position));
      out.push({
        id: event.id,
        sequence: event.sequence,
        position: clamped,
        turn: event.turn,
        phase: event.phase,
      });
    }
    return out;
  }, [events, minSequence, maxSequence]);

  if (markers.length === 0) return null;

  return (
    <div
      className={`pointer-events-none absolute inset-0 ${className}`}
      data-testid="phase-change-markers"
    >
      {markers.map((marker) => (
        <div
          key={marker.id}
          data-testid={`phase-change-marker-${marker.id}`}
          // pointer-events-auto on the line itself so the hover tooltip
          // (browser-native title) reveals on the marker, not the empty
          // space around it.
          className="pointer-events-auto absolute top-0 h-full w-px border-l border-dotted border-slate-400/60 hover:border-slate-200"
          style={{
            left: `${marker.position * 100}%`,
            transform: 'translateX(-50%)',
          }}
          title={`Turn ${marker.turn} — ${PHASE_LABEL[marker.phase] ?? marker.phase}`}
        />
      ))}
    </div>
  );
}

export default PhaseChangeMarkers;
