/**
 * Quick Game Replay Panel
 *
 * Composed replay panel for the quick-game results page. Drives the
 * existing `<HexMapDisplay>` from `useHexMapStateFromEvents` over the
 * in-memory `game.events` log, with playback state owned by
 * `useSharedReplayPlayer`.
 *
 * Per `add-quickgame-replay-panel/proposal.md`. The standalone replay
 * page (`src/pages/gameplay/games/[id]/replay.tsx`) keeps the file-upload
 * affordance for off-disk NDJSON; this panel deliberately does NOT mount
 * `<JsonlFileLoader>` because the encounter is already loaded.
 *
 * @spec openspec/changes/add-quickgame-replay-panel/proposal.md
 */

import React, { useMemo } from 'react';

import { ReplayControls, ReplayTimeline } from '@/components/audit/replay';
import { HexMapDisplay } from '@/components/gameplay/HexMapDisplay/HexMapDisplay';
import { Card } from '@/components/ui';
import {
  formatSpeed,
  type IEventMarker as IAuditEventMarker,
} from '@/hooks/audit';
import {
  useHexMapStateFromEvents,
  useReplayMovementAnimations,
  useSharedReplayPlayer,
} from '@/hooks/replay';
import { EventCategory } from '@/types/events';
import { IGameEvent } from '@/types/gameplay';

// =============================================================================
// Types
// =============================================================================

export interface IQuickGameReplayPanelProps {
  /** Game ID — passed through to `useSharedReplayPlayer`. */
  readonly gameId: string;
  /** In-memory game event log (typically `game.events`). */
  readonly events: readonly IGameEvent[];
}

// =============================================================================
// Component
// =============================================================================

/**
 * Renders the in-page replay viewer for a completed quick-game.
 *
 * Composition:
 * - `useSharedReplayPlayer({ gameId, events })` owns scrubber + playback
 *   state. The panel never instantiates a separate replay state machine
 *   (per spec scenario "Scrubber state is owned by useSharedReplayPlayer").
 * - `useHexMapStateFromEvents(events, currentSequence)` projects the
 *   event log up to the current scrubber position into hex-map tokens +
 *   terrain.
 * - `<HexMapDisplay>` renders the projected state. `<ReplayTimeline>`
 *   exposes scrubber + markers; `<ReplayControls>` exposes
 *   play/pause/stop/step.
 *
 * Empty-events guard: when `events.length === 0` (the encounter ended
 * without persisting an event log) the panel renders a friendly
 * placeholder instead of mounting the player.
 */
export function QuickGameReplayPanel({
  gameId,
  events,
}: IQuickGameReplayPanelProps): React.ReactElement {
  const replay = useSharedReplayPlayer({ gameId, events });

  // Pure projection — re-derives on every `currentSequence` tick. The
  // hook is memoized internally so the projection only re-walks the
  // event log when `currentSequence` actually changes.
  const hexMapState = useHexMapStateFromEvents(events, replay.currentSequence);

  // Per `add-replay-step-and-effect-animations` (tactical-map-interface
  // delta — "Replay Movement Step Animation Playback"): drive the
  // shared `useAnimationQueue` from the same event log + cursor so
  // tokens visually walk through their step chains during scrub. The
  // `mapId` is scoped to this surface so it never collides with a co-
  // mounted live-play queue.
  useReplayMovementAnimations(events, replay.currentSequence, {
    mapId: 'quickgame-replay',
  });

  // Adapt the shared player's `IEventMarker` (from `@/hooks/replay`)
  // into the audit `IEventMarker` shape that `<ReplayTimeline>` consumes.
  // The two shapes only differ by the `category` field, which the
  // gameplay-event marker doesn't carry — synthesizing
  // `EventCategory.Game` keeps the marker renderer happy for every
  // gameplay event. Mirrors the adapter in `src/pages/gameplay/games/[id]/replay.tsx`.
  const adaptedMarkers = useMemo<readonly IAuditEventMarker[]>(
    () =>
      replay.markers.map((m) => ({
        id: m.id,
        sequence: m.sequence,
        position: m.position,
        type: m.type,
        category: EventCategory.Game,
        label: m.label,
      })),
    [replay.markers],
  );

  // Empty-events guard. Rendered before the player UI because there's
  // nothing useful to show when the log is empty.
  if (events.length === 0) {
    return (
      <Card className="m-4 p-8 text-center">
        <p className="text-text-theme-secondary">
          No events were recorded for this encounter.
        </p>
        <p className="text-text-theme-muted mt-2 text-xs">
          Replay is unavailable.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col" data-testid="quickgame-replay-panel">
      {/* Hex-map area — fills available vertical space; falls back to a
          minimum height so it stays visible inside the tabpanel even if
          the panel sits in a flow-layout parent. */}
      <div className="bg-surface-base/30 flex min-h-[480px] flex-1 items-center justify-center overflow-hidden">
        {hexMapState.tokens.length > 0 ? (
          <HexMapDisplay
            // Per `add-replay-step-and-effect-animations` D6: scope the
            // animation queue's `mapId` to this surface so a co-mounted
            // live-play queue can never block on (or be blocked by)
            // replay animations. `<HexMapDisplay>` already mounts
            // `<AttackEffectsLayer>` internally with this `mapId`, so
            // weapon impact visuals fire in replay alongside movement.
            mapId="quickgame-replay"
            radius={hexMapState.mapRadius > 0 ? hexMapState.mapRadius : 9}
            tokens={hexMapState.tokens}
            hexTerrain={hexMapState.hexTerrain}
            selectedHex={null}
            events={events}
          />
        ) : (
          <div className="p-6 text-center">
            <p className="text-text-theme-secondary">
              Waiting for unit roster…
            </p>
            <p className="text-text-theme-muted mt-2 text-xs">
              Step forward to load the first frame.
            </p>
          </div>
        )}
      </div>

      {/* Bottom controls — timeline above, transport buttons below. */}
      <div className="bg-surface-base border-border-theme-subtle flex-shrink-0 border-t p-4">
        <div className="mb-4">
          <ReplayTimeline
            progress={replay.progress}
            markers={adaptedMarkers}
            onSeek={replay.seek}
            currentSequence={replay.currentSequence}
            // Per `add-replay-timeline-markers`: pass the in-memory
            // gameplay event log so the timeline composes
            // <KeyMomentMarkers> + <PhaseChangeMarkers> overlays.
            keyMoments={events}
            phaseChanges={events}
          />
        </div>

        <div className="flex items-center justify-center">
          <ReplayControls
            playbackState={replay.playbackState}
            canStepBackward={replay.currentIndex > 0}
            canStepForward={replay.currentIndex < replay.totalEvents - 1}
            onPlay={replay.play}
            onPause={replay.pause}
            onStop={replay.stop}
            onGoToEnd={() => replay.jumpToIndex(replay.totalEvents - 1)}
            onStepForward={replay.stepForward}
            onStepBackward={replay.stepBackward}
          />
        </div>

        <div className="text-text-theme-muted mt-3 text-center text-sm">
          {replay.playbackState === 'playing' && (
            <span className="text-emerald-400">
              Playing at {formatSpeed(replay.speed)}
            </span>
          )}
          {replay.playbackState === 'paused' && (
            <span className="text-amber-400">Paused</span>
          )}
          {replay.playbackState === 'stopped' && (
            <span>
              Event {replay.currentIndex + 1} of {replay.totalEvents} — Press
              Play to start
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default QuickGameReplayPanel;
