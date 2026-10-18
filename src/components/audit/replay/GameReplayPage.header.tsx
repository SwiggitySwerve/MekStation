import Link from 'next/link';

import { ReplaySpeedSelector } from '@/components/audit/replay';

import type { ReplayProjection } from './GameReplayPage.types';

import { BackIcon, HelpIcon } from './GameReplayPage.icons';

interface ReplayHeaderProps {
  readonly gameId: string;
  readonly replaySourceLabel: string | null;
  readonly replay: ReplayProjection;
  readonly showKeyboardHelp: boolean;
  readonly onToggleKeyboardHelp: () => void;
}

export function ReplayHeader({
  gameId,
  replaySourceLabel,
  replay,
  showKeyboardHelp,
  onToggleKeyboardHelp,
}: ReplayHeaderProps): React.ReactElement {
  return (
    <div
      className="bg-surface-base border-border-theme-subtle flex h-14 flex-shrink-0 items-center justify-between border-b px-4"
      data-testid="replay-header"
    >
      <div className="flex items-center gap-4">
        <Link
          href={gameId ? `/gameplay/games/${gameId}` : '/gameplay/games'}
          className="text-text-theme-secondary hover:text-text-theme-primary transition-colors"
          aria-label="Back to game details"
        >
          <BackIcon />
        </Link>
        <h1
          className="text-text-theme-primary text-lg font-semibold"
          data-testid="replay-title"
        >
          Game Replay
        </h1>
        {replaySourceLabel !== null && (
          <span
            className="bg-accent/20 text-accent rounded-full px-2 py-0.5 text-xs font-medium"
            data-testid="replay-loaded-source"
          >
            {replaySourceLabel}
          </span>
        )}
        <span
          className="text-text-theme-muted text-sm"
          data-testid="replay-event-count"
        >
          {replay.totalEvents} events
        </span>
      </div>

      <div className="flex items-center gap-3">
        <ReplaySpeedSelector
          speed={replay.speed}
          onSpeedChange={replay.setSpeed}
        />
        <button
          onClick={onToggleKeyboardHelp}
          className={`rounded-lg p-2 transition-colors ${
            showKeyboardHelp
              ? 'bg-accent/20 text-accent'
              : 'text-text-theme-secondary hover:text-text-theme-primary hover:bg-surface-raised'
          }`}
          title="Keyboard shortcuts (?)"
          aria-label="Show keyboard shortcuts"
          aria-expanded={showKeyboardHelp}
        >
          <HelpIcon />
        </button>
      </div>
    </div>
  );
}
