/**
 * Replay Library page — phase A skeleton.
 *
 * On mount, fetches `/api/replay-library/index` and renders the manifest
 * entries as a card grid. Each row shows shared fields (id, createdAt,
 * turns, winner, bvTotal) plus source-specific metadata (configName/seed/
 * batchTimestamp for swarm; aiVariant/playerSide for quick; etc.).
 *
 * A source filter (All | Swarm | Quick | PvP | Campaign) restricts the
 * visible rows to one ReplaySource at a time.
 *
 * Phase A scope: skeleton + filter + Watch button as a placeholder. The
 * orchestrator wires the Watch button to the replay viewer in phase B.
 *
 * Imports use deep paths (`@/replay-library/types`) — never the barrel —
 * because the barrel re-exports `node:fs`-using modules that Turbopack
 * traces into the client bundle and breaks the Next build.
 *
 * @spec openspec/changes/add-replay-library/specs/replay-library/spec.md
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { IReplayManifestEntry } from '@/replay-library/types';

import {
  Button,
  Card,
  EmptyState,
  PageError,
  PageLayout,
  PageLoading,
} from '@/components/ui';
import { ReplaySource } from '@/types/gameplay';
import { logger } from '@/utils/logger';

// =============================================================================
// Types
// =============================================================================

type SourceFilter = 'all' | ReplaySource;

interface IReplayLibraryListResponse {
  readonly entries: readonly IReplayManifestEntry[];
  readonly total: number;
}

const SOURCE_FILTERS: ReadonlyArray<{
  readonly key: SourceFilter;
  readonly label: string;
}> = [
  { key: 'all', label: 'All' },
  { key: ReplaySource.Swarm, label: 'Swarm' },
  { key: ReplaySource.Quick, label: 'Quick' },
  { key: ReplaySource.PvP, label: 'PvP' },
  { key: ReplaySource.Campaign, label: 'Campaign' },
];

// =============================================================================
// Row component
// =============================================================================

interface ReplayRowProps {
  readonly entry: IReplayManifestEntry;
  readonly onWatch: (entry: IReplayManifestEntry) => void;
}

/**
 * Renders one manifest entry as a card row. The source-specific metadata
 * block discriminates on `entry.replaySource`; TypeScript narrows each
 * branch so e.g. `entry.configName` only compiles inside the Swarm case.
 */
function ReplayRow({ entry, onWatch }: ReplayRowProps): React.ReactElement {
  const winnerLabel = entry.winner ?? 'draw / none';

  return (
    <Card data-testid={`replay-row-${entry.id}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3
          className="text-text-theme-primary truncate font-medium"
          data-testid="replay-id"
        >
          {entry.id}
        </h3>
        <span
          className="bg-surface-raised text-text-theme-secondary rounded px-2 py-1 text-xs"
          data-testid="replay-source"
        >
          {entry.replaySource}
        </span>
      </div>

      <SourceMetadata entry={entry} />

      <div className="text-text-theme-secondary mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div>
          <span className="text-text-theme-muted block">Created</span>
          <span data-testid="replay-created-at">{entry.createdAt}</span>
        </div>
        <div>
          <span className="text-text-theme-muted block">Turns</span>
          <span data-testid="replay-turns">{entry.turns}</span>
        </div>
        <div>
          <span className="text-text-theme-muted block">Winner</span>
          <span data-testid="replay-winner">{winnerLabel}</span>
        </div>
        <div>
          <span className="text-text-theme-muted block">BV total</span>
          <span data-testid="replay-bv-total">{entry.bvTotal}</span>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          variant="primary"
          size="sm"
          onClick={() => onWatch(entry)}
          data-testid={`replay-watch-${entry.id}`}
        >
          Watch
        </Button>
      </div>
    </Card>
  );
}

/**
 * Renders the source-specific metadata strip. Switching on `replaySource`
 * narrows the discriminated union so each branch can read its own fields
 * without further casts.
 */
function SourceMetadata({
  entry,
}: {
  readonly entry: IReplayManifestEntry;
}): React.ReactElement {
  switch (entry.replaySource) {
    case ReplaySource.Swarm:
      return (
        <div
          className="text-text-theme-secondary text-xs"
          data-testid="replay-meta-swarm"
        >
          <div>
            Config:{' '}
            <span data-testid="replay-config-name">
              {entry.configName || '(unknown)'}
            </span>
          </div>
          <div>
            Seed: <span data-testid="replay-seed">{entry.seed}</span>
          </div>
          <div>
            Batch:{' '}
            <span data-testid="replay-batch-timestamp">
              {entry.batchTimestamp}
            </span>
          </div>
        </div>
      );
    case ReplaySource.Quick:
      return (
        <div
          className="text-text-theme-secondary text-xs"
          data-testid="replay-meta-quick"
        >
          <div>
            AI variant:{' '}
            <span data-testid="replay-ai-variant">{entry.aiVariant}</span>
          </div>
          <div>
            Player side:{' '}
            <span data-testid="replay-player-side">{entry.playerSide}</span>
          </div>
        </div>
      );
    case ReplaySource.PvP:
      return (
        <div
          className="text-text-theme-secondary text-xs"
          data-testid="replay-meta-pvp"
        >
          <div>
            Opponent:{' '}
            <span data-testid="replay-opponent-name">
              {entry.opponentName || '(unknown)'}
            </span>
          </div>
          <div>
            Match: <span data-testid="replay-match-id">{entry.matchId}</span>
          </div>
        </div>
      );
    case ReplaySource.Campaign:
      return (
        <div
          className="text-text-theme-secondary text-xs"
          data-testid="replay-meta-campaign"
        >
          <div>
            Campaign:{' '}
            <span data-testid="replay-campaign-id">{entry.campaignId}</span>
          </div>
          <div>
            Mission:{' '}
            <span data-testid="replay-mission-id">{entry.missionId}</span>
          </div>
          <div>
            Difficulty:{' '}
            <span data-testid="replay-difficulty">{entry.difficulty}</span>
          </div>
        </div>
      );
    default: {
      // Exhaustiveness guard — adding a fifth ReplaySource fails compile here
      // so the author cannot forget to add a metadata strip for it.
      const _exhaustive: never = entry;
      return <></>;
    }
  }
}

// =============================================================================
// Page component
// =============================================================================

export default function ReplayLibraryPage(): React.ReactElement {
  const [entries, setEntries] = useState<readonly IReplayManifestEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<SourceFilter>('all');

  // Fetch the manifest once on mount. Errors surface as the page error
  // state (full-screen card) so the user knows the disk read failed.
  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      try {
        const res = await fetch('/api/replay-library/index');
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

  // Phase A "Watch" button is a placeholder — phase B will wire it to the
  // replay viewer route. Logging the click here keeps the affordance live
  // without committing to a target URL the orchestrator hasn't picked yet.
  const handleWatch = useCallback((entry: IReplayManifestEntry) => {
    logger.debug('[replay-library] watch clicked (phase A placeholder)', {
      id: entry.id,
      path: entry.path,
    });
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
              ? 'No replays yet — run a swarm or finish a quick game to populate the library.'
              : 'Try a different source filter.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 pb-12 md:grid-cols-2 lg:grid-cols-3">
          {filteredEntries.map((entry) => (
            <ReplayRow key={entry.id} entry={entry} onWatch={handleWatch} />
          ))}
        </div>
      )}
    </PageLayout>
  );
}
