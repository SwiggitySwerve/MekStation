import React from 'react';

import type { IReplayManifestEntry } from '@/replay-library/types';

import { Badge, Button, Card } from '@/components/ui';
import { ReplaySource } from '@/types/gameplay';

export type SourceFilter = 'all' | ReplaySource;

export interface IReplayLibraryListResponse {
  readonly entries: readonly IReplayManifestEntry[];
  readonly total: number;
}

export const SOURCE_FILTERS: ReadonlyArray<{
  readonly key: SourceFilter;
  readonly label: string;
}> = [
  { key: 'all', label: 'All' },
  { key: ReplaySource.Swarm, label: 'Swarm' },
  { key: ReplaySource.Quick, label: 'Quick' },
  { key: ReplaySource.PvP, label: 'PvP' },
  { key: ReplaySource.Campaign, label: 'Campaign' },
  { key: ReplaySource.Encounter, label: 'Encounter' },
];

interface ReplayRowProps {
  readonly entry: IReplayManifestEntry;
  readonly onWatch: (entry: IReplayManifestEntry) => void;
}

export function ReplayRow({
  entry,
  onWatch,
}: ReplayRowProps): React.ReactElement {
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
        <Badge variant="slate" size="md" data-testid="replay-source">
          {entry.replaySource}
        </Badge>
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
    case ReplaySource.Encounter:
      return (
        <div
          className="text-text-theme-secondary text-xs"
          data-testid="replay-meta-encounter"
        >
          <div>
            Encounter:{' '}
            <span data-testid="replay-encounter-name">
              {entry.encounterName || '(unnamed)'}
            </span>
          </div>
          <div>
            Template:{' '}
            <span data-testid="replay-template-type">
              {entry.templateType ?? 'Custom'}
            </span>
          </div>
          <div>
            Player:{' '}
            <span data-testid="replay-player-force-summary">
              {entry.playerForceSummary || '(unknown)'}
            </span>
          </div>
          <div>
            Opponent:{' '}
            <span data-testid="replay-opponent-summary">
              {entry.opponentSummary || '(unknown)'}
            </span>
          </div>
        </div>
      );
    default: {
      const _exhaustive: never = entry;
      return <></>;
    }
  }
}
