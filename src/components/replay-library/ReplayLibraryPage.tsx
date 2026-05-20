/**
 * Replay Library page component.
 *
 * On mount, fetches `/api/replay-library` and renders the manifest
 * entries as a card grid. Each row shows shared fields (id, createdAt,
 * turns, winner, bvTotal) plus source-specific metadata (configName/seed/
 * batchTimestamp for swarm; aiVariant/playerSide for quick; etc.).
 *
 * A source filter (All | Swarm | Quick | PvP | Campaign) restricts the
 * visible rows to one ReplaySource at a time.
 *
 * Click "Watch" to mount `<QuickGameReplayPanel>` inline. The viewer
 * fetches events via `/api/replay-library/<source>/<gameId>` and re-uses
 * the same playback affordances as the in-app quick-game replay.
 *
 * Imports use deep paths (`@/replay-library/types`) — never the barrel —
 * because the barrel re-exports `node:fs`-using modules that Turbopack
 * traces into the client bundle and breaks the Next build.
 *
 * The route file at `src/pages/replay-library.tsx` is a thin re-export
 * so this component can live alongside its storybook story (Next.js's
 * route-type validator inspects every file under `src/pages/`).
 *
 * @spec openspec/changes/add-replay-library/specs/replay-library/spec.md
 */

import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { IReplayManifestEntry } from '@/replay-library/types';

import { QuickGameReplayPanel } from '@/components/quickgame/QuickGameReplayPanel';
import {
  IReplayLibraryListResponse,
  ReplayRow,
  SOURCE_FILTERS,
  SourceFilter,
} from '@/components/replay-library/ReplayLibraryList';
import {
  Button,
  Card,
  EmptyState,
  PageError,
  PageLayout,
  PageLoading,
} from '@/components/ui';
import { IGameEvent } from '@/types/gameplay';
import { logger } from '@/utils/logger';

// =============================================================================
// Page component
// =============================================================================

// Viewer state — set when the user clicks "Watch" on a row. The page
// renders the replay viewer inline (replacing the list) until the user
// clicks "Back to library". Lift the state up to the page so the
// fetch + lifecycle live alongside the list, not hidden inside a row.
interface IViewerState {
  readonly entry: IReplayManifestEntry;
  readonly events: readonly IGameEvent[] | null; // null while fetch in flight
  readonly error: string | null;
}

export function ReplayLibraryPage(): React.ReactElement {
  const router = useRouter();
  const [entries, setEntries] = useState<readonly IReplayManifestEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<SourceFilter>('all');
  const [viewer, setViewer] = useState<IViewerState | null>(null);

  // Fetch the manifest once on mount. Errors surface as the page error
  // state (full-screen card) so the user knows the disk read failed.
  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const res = await fetch('/api/replay-library');
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as IReplayLibraryListResponse;
        if (!cancelled) {
          setEntries(data.entries);
          setLoading(false);
        }
      } catch (err) {
        logger.error('[replay-library] failed to fetch index', err);
        if (!cancelled) {
          setError('Failed to load replay library');
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // When the viewer state has an entry but no events, fetch them. Splitting
  // the fetch into its own effect (rather than inline in handleWatch) keeps
  // the cancel-on-unmount semantics clean — clicking Back during a slow
  // fetch correctly drops the in-flight result.
  useEffect(() => {
    if (viewer === null || viewer.events !== null || viewer.error !== null) {
      return undefined;
    }
    let cancelled = false;
    async function loadEvents(entry: IReplayManifestEntry): Promise<void> {
      try {
        const res = await fetch(
          `/api/replay-library/${entry.replaySource}/${entry.id}`,
        );
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as {
          readonly events: readonly IGameEvent[];
        };
        if (!cancelled) {
          setViewer({ entry, events: data.events, error: null });
        }
      } catch (err) {
        logger.error('[replay-library] failed to fetch events', err);
        if (!cancelled) {
          setViewer({
            entry,
            events: null,
            error: 'Failed to load replay events',
          });
        }
      }
    }
    void loadEvents(viewer.entry);
    return () => {
      cancelled = true;
    };
  }, [viewer]);

  // Mounting the viewer triggers the load effect above. Re-clicking Watch
  // on the same row is a no-op (the events are already loaded); clicking a
  // different row clears `events` so the load fires again for the new id.
  const handleWatch = useCallback((entry: IReplayManifestEntry) => {
    setViewer((prev) =>
      prev !== null && prev.entry.id === entry.id
        ? prev
        : { entry, events: null, error: null },
    );
  }, []);

  const handleBackToList = useCallback(() => {
    setViewer(null);
  }, []);

  const filteredEntries = useMemo(() => {
    if (filter === 'all') return entries;
    return entries.filter((entry) => entry.replaySource === filter);
  }, [entries, filter]);

  if (loading) {
    return <PageLoading message="Loading replay library..." />;
  }

  if (error) {
    return (
      <PageError
        title="Replay library unavailable"
        message={error}
        backLink="/"
        backLabel="Home"
      />
    );
  }

  // Inline viewer mode — replaces the list when the user clicks Watch.
  // Re-using `<QuickGameReplayPanel>` keeps the viewer affordances
  // identical to the in-app quick-game replay tab so users see one
  // consistent UI regardless of where the events came from.
  if (viewer !== null) {
    return (
      <PageLayout
        title="Replay Library"
        subtitle={`Watching ${viewer.entry.id} (${viewer.entry.replaySource})`}
        maxWidth="wide"
      >
        <div className="mb-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleBackToList}
            data-testid="back-to-library"
          >
            ← Back to library
          </Button>
        </div>

        {viewer.error !== null ? (
          <Card data-testid="replay-viewer-error">
            <p className="text-text-theme-primary mb-2 font-medium">
              Failed to load replay
            </p>
            <p className="text-text-theme-secondary text-sm">{viewer.error}</p>
          </Card>
        ) : viewer.events === null ? (
          <PageLoading message="Loading replay events..." />
        ) : (
          <QuickGameReplayPanel
            gameId={viewer.entry.id}
            events={viewer.events}
          />
        )}
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Replay Library"
      subtitle="Browse swarm runs, quick games, and saved replays"
      maxWidth="wide"
    >
      <Card className="mb-6">
        <div className="flex flex-wrap gap-2" data-testid="source-filter">
          {SOURCE_FILTERS.map(({ key, label }) => (
            <Button
              key={key}
              variant={filter === key ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFilter(key)}
              data-testid={`source-filter-${key}`}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="text-text-theme-secondary mt-3 text-sm">
          Showing {filteredEntries.length} of {entries.length} replay
          {entries.length === 1 ? '' : 's'}
        </div>
      </Card>

      {filteredEntries.length === 0 ? (
        <EmptyState
          data-testid="replay-library-empty"
          title={
            entries.length === 0
              ? 'No replays yet'
              : 'No replays match this filter'
          }
          message={
            entries.length === 0
              ? 'Finish a quick game or set up an encounter, and the resulting replay will show up here. Swarm CLI runs land here too.'
              : 'Try a different source filter.'
          }
          action={
            entries.length === 0 ? (
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  variant="primary"
                  onClick={() => router.push('/gameplay/quick')}
                  data-testid="empty-state-quick-game"
                >
                  Start Quick Game
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => router.push('/gameplay/encounters')}
                  data-testid="empty-state-encounters"
                >
                  Browse Encounters
                </Button>
              </div>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 pb-12 md:grid-cols-2 lg:grid-cols-3">
          {filteredEntries.map((entry, idx) => (
            // Composite key as defense-in-depth: the persister now dedupes
            // by `entry.id` (PT-101), but the index file may carry stale
            // duplicates from before the fix landed. Using `${id}-${idx}`
            // keeps React happy even if dedup ever regresses.
            <ReplayRow
              key={`${entry.id}-${idx}`}
              entry={entry}
              onWatch={handleWatch}
            />
          ))}
        </div>
      )}
    </PageLayout>
  );
}

export default ReplayLibraryPage;
