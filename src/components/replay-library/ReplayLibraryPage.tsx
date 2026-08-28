/**
 * Replay Library page component.
 *
 * On mount, fetches `/api/replay-library` and renders the manifest
 * entries as a card grid. Each row shows shared fields (id, createdAt,
 * turns, winner, bvTotal) plus source-specific metadata.
 *
 * @spec openspec/changes/add-replay-library/specs/replay-library/spec.md
 */

import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { IReplayManifestEntry } from '@/replay-library/types';

import { QuickGameReplayPanel } from '@/components/quickgame/QuickGameReplayPanel';
import {
  ReplayBlockedHistoryPanel,
  type IReplayBlockedHistoryInfo,
} from '@/components/replay-library/ReplayBlockedHistoryPanel';
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

interface IViewerState {
  readonly entry: IReplayManifestEntry;
  readonly events: readonly IGameEvent[] | null;
  readonly error: string | null;
  /** Typed blocked-history payload (422 REPLAY_HISTORY_BLOCKED). */
  readonly blocked: IReplayBlockedHistoryInfo | null;
}

interface ReplayManifestState {
  readonly entries: readonly IReplayManifestEntry[];
  readonly loading: boolean;
  readonly error: string | null;
}

interface ReplayViewerController {
  readonly viewer: IViewerState | null;
  readonly handleBackToList: () => void;
  readonly handleWatch: (entry: IReplayManifestEntry) => void;
}

function useReplayManifestEntries(): ReplayManifestState {
  const [entries, setEntries] = useState<readonly IReplayManifestEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { entries, loading, error };
}

function useReplayViewer(): ReplayViewerController {
  const [viewer, setViewer] = useState<IViewerState | null>(null);

  useEffect(() => {
    if (
      viewer === null ||
      viewer.events !== null ||
      viewer.error !== null ||
      viewer.blocked !== null
    ) {
      return undefined;
    }

    let cancelled = false;
    async function loadEvents(entry: IReplayManifestEntry): Promise<void> {
      try {
        const res = await fetch(
          `/api/replay-library/${entry.replaySource}/${entry.id}`,
        );
        // Replay-safety PR 20: a 422 REPLAY_HISTORY_BLOCKED is the typed
        // blocked-history state, not a generic failure - render the
        // persistent truthful panel with the evidence.
        if (res.status === 422) {
          const body = (await res.json()) as {
            readonly code?: string;
            readonly blocked?: IReplayBlockedHistoryInfo;
          };
          if (
            body.code === 'REPLAY_HISTORY_BLOCKED' &&
            body.blocked !== undefined &&
            !cancelled
          ) {
            setViewer({
              entry,
              events: null,
              error: null,
              blocked: body.blocked,
            });
            return;
          }
        }
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as {
          readonly events: readonly IGameEvent[];
        };
        if (!cancelled) {
          setViewer({ entry, events: data.events, error: null, blocked: null });
        }
      } catch (err) {
        logger.error('[replay-library] failed to fetch events', err);
        if (!cancelled) {
          setViewer({
            entry,
            events: null,
            error: 'Failed to load replay events',
            blocked: null,
          });
        }
      }
    }

    void loadEvents(viewer.entry);
    return () => {
      cancelled = true;
    };
  }, [viewer]);

  const handleWatch = useCallback((entry: IReplayManifestEntry) => {
    setViewer((prev) =>
      prev !== null && prev.entry.id === entry.id
        ? prev
        : { entry, events: null, error: null, blocked: null },
    );
  }, []);

  const handleBackToList = useCallback(() => {
    setViewer(null);
  }, []);

  return { viewer, handleBackToList, handleWatch };
}

export function ReplayLibraryPage(): React.ReactElement {
  const router = useRouter();
  const [filter, setFilter] = useState<SourceFilter>('all');
  const { entries, loading, error } = useReplayManifestEntries();
  const { viewer, handleBackToList, handleWatch } = useReplayViewer();
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

  if (viewer !== null) {
    return (
      <ReplayViewerLayout viewer={viewer} onBackToList={handleBackToList} />
    );
  }

  return (
    <ReplayLibraryListView
      entries={entries}
      filteredEntries={filteredEntries}
      filter={filter}
      onFilterChange={setFilter}
      onStartEncounter={() => router.push('/gameplay/encounters')}
      onStartQuickGame={() => router.push('/gameplay/quick')}
      onWatch={handleWatch}
    />
  );
}

function ReplayViewerLayout({
  viewer,
  onBackToList,
}: {
  readonly viewer: IViewerState;
  readonly onBackToList: () => void;
}): React.ReactElement {
  return (
    <PageLayout
      title="Replay Library"
      subtitle={
        viewer.blocked !== null
          ? `Blocked replay ${viewer.entry.id} (${viewer.entry.replaySource})`
          : `Watching ${viewer.entry.id} (${viewer.entry.replaySource})`
      }
      maxWidth="wide"
    >
      <div className="mb-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={onBackToList}
          data-testid="back-to-library"
        >
          ← Back to library
        </Button>
      </div>

      <ReplayViewerBody viewer={viewer} onBackToList={onBackToList} />
    </PageLayout>
  );
}

function ReplayViewerBody({
  viewer,
  onBackToList,
}: {
  readonly viewer: IViewerState;
  readonly onBackToList: () => void;
}): React.ReactElement {
  if (viewer.blocked !== null) {
    return (
      <ReplayBlockedHistoryPanel
        blocked={viewer.blocked}
        onBack={onBackToList}
      />
    );
  }

  if (viewer.error !== null) {
    return (
      <Card data-testid="replay-viewer-error">
        <p className="text-text-theme-primary mb-2 font-medium">
          Failed to load replay
        </p>
        <p className="text-text-theme-secondary text-sm">{viewer.error}</p>
      </Card>
    );
  }

  if (viewer.events === null) {
    return <PageLoading message="Loading replay events..." />;
  }

  return (
    <QuickGameReplayPanel gameId={viewer.entry.id} events={viewer.events} />
  );
}

function ReplayLibraryListView({
  entries,
  filteredEntries,
  filter,
  onFilterChange,
  onStartEncounter,
  onStartQuickGame,
  onWatch,
}: {
  readonly entries: readonly IReplayManifestEntry[];
  readonly filteredEntries: readonly IReplayManifestEntry[];
  readonly filter: SourceFilter;
  readonly onFilterChange: (filter: SourceFilter) => void;
  readonly onStartEncounter: () => void;
  readonly onStartQuickGame: () => void;
  readonly onWatch: (entry: IReplayManifestEntry) => void;
}): React.ReactElement {
  return (
    <PageLayout
      title="Replay Library"
      subtitle="Browse swarm runs, quick games, and saved replays"
      maxWidth="wide"
    >
      <ReplaySourceFilter
        entries={entries}
        filteredEntries={filteredEntries}
        filter={filter}
        onFilterChange={onFilterChange}
      />

      {filteredEntries.length === 0 ? (
        <ReplayLibraryEmptyState
          hasEntries={entries.length > 0}
          onStartEncounter={onStartEncounter}
          onStartQuickGame={onStartQuickGame}
        />
      ) : (
        <ReplayLibraryGrid entries={filteredEntries} onWatch={onWatch} />
      )}
    </PageLayout>
  );
}

function ReplaySourceFilter({
  entries,
  filteredEntries,
  filter,
  onFilterChange,
}: {
  readonly entries: readonly IReplayManifestEntry[];
  readonly filteredEntries: readonly IReplayManifestEntry[];
  readonly filter: SourceFilter;
  readonly onFilterChange: (filter: SourceFilter) => void;
}): React.ReactElement {
  return (
    <Card className="mb-6">
      <div className="flex flex-wrap gap-2" data-testid="source-filter">
        {SOURCE_FILTERS.map(({ key, label }) => (
          <Button
            key={key}
            variant={filter === key ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => onFilterChange(key)}
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
  );
}

function ReplayLibraryEmptyState({
  hasEntries,
  onStartEncounter,
  onStartQuickGame,
}: {
  readonly hasEntries: boolean;
  readonly onStartEncounter: () => void;
  readonly onStartQuickGame: () => void;
}): React.ReactElement {
  return (
    <EmptyState
      data-testid="replay-library-empty"
      title={hasEntries ? 'No replays match this filter' : 'No replays yet'}
      message={
        hasEntries
          ? 'Try a different source filter.'
          : 'Finish a quick game or set up an encounter, and the resulting replay will show up here. Swarm CLI runs land here too.'
      }
      action={
        hasEntries ? undefined : (
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              variant="primary"
              onClick={onStartQuickGame}
              data-testid="empty-state-quick-game"
            >
              Start Quick Game
            </Button>
            <Button
              variant="secondary"
              onClick={onStartEncounter}
              data-testid="empty-state-encounters"
            >
              Browse Encounters
            </Button>
          </div>
        )
      }
    />
  );
}

function ReplayLibraryGrid({
  entries,
  onWatch,
}: {
  readonly entries: readonly IReplayManifestEntry[];
  readonly onWatch: (entry: IReplayManifestEntry) => void;
}): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-4 pb-12 md:grid-cols-2 lg:grid-cols-3">
      {entries.map((entry, idx) => (
        <ReplayRow key={`${entry.id}-${idx}`} entry={entry} onWatch={onWatch} />
      ))}
    </div>
  );
}

export default ReplayLibraryPage;
