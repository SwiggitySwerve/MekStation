import type { KeyboardEventHandler, RefObject } from 'react';

import { Button, Card } from '@/components/ui';

import type { ResultsTab } from './quickGameResults.helpers';
import type { QuickGamePersistStatus } from './useQuickGameReplayPersist';

import { RESULTS_TABS } from './quickGameResults.helpers';

export function NoGameResultsCard({
  onStartNewGame,
}: {
  readonly onStartNewGame: () => void;
}): React.ReactElement {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900">
      <Card className="p-8 text-center">
        <p className="text-gray-400">No game results to display.</p>
        <Button variant="primary" onClick={onStartNewGame} className="mt-4">
          Start New Game
        </Button>
      </Card>
    </div>
  );
}

export function ResultsTabList({
  activeTab,
  tabListRef,
  onKeyDown,
  onTabChange,
}: {
  readonly activeTab: ResultsTab;
  readonly tabListRef: RefObject<HTMLDivElement | null>;
  readonly onKeyDown: KeyboardEventHandler<HTMLDivElement>;
  readonly onTabChange: (tabId: ResultsTab) => void;
}): React.ReactElement {
  return (
    <div
      ref={tabListRef}
      role="tablist"
      aria-label="Battle results tabs"
      className="flex border-b border-gray-700"
      onKeyDown={onKeyDown}
    >
      {RESULTS_TABS.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          id={`tab-${tab.id}`}
          aria-selected={activeTab === tab.id}
          aria-controls={`tabpanel-${tab.id}`}
          tabIndex={activeTab === tab.id ? 0 : -1}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none focus:ring-inset ${
            activeTab === tab.id
              ? 'border-b-2 border-blue-500 bg-gray-800/50 text-white'
              : 'text-gray-400 hover:bg-gray-800/30 hover:text-white'
          } `}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function ResultsActions({
  onPlayAgainSameUnits,
  onPlayAgainNewUnits,
  onExit,
}: {
  readonly onPlayAgainSameUnits: () => void;
  readonly onPlayAgainNewUnits: () => void;
  readonly onExit: () => void;
}): React.ReactElement {
  return (
    <div className="space-y-3">
      <Button
        variant="primary"
        className="w-full"
        onClick={onPlayAgainSameUnits}
        data-testid="play-again-same-btn"
      >
        Play Again (Same Units)
      </Button>

      <Button
        variant="secondary"
        className="w-full"
        onClick={onPlayAgainNewUnits}
        data-testid="play-again-new-btn"
      >
        Play Again (New Force)
      </Button>

      <Button
        variant="secondary"
        className="w-full"
        onClick={onExit}
        data-testid="exit-btn"
      >
        Exit to Games
      </Button>
    </div>
  );
}

export function PersistStatusFooter({
  status,
  onOpenReplayLibrary,
}: {
  readonly status: QuickGamePersistStatus;
  readonly onOpenReplayLibrary: () => void;
}): React.ReactElement {
  return (
    <p
      className="mt-6 text-center text-xs text-gray-500"
      data-testid="quick-game-persist-status"
    >
      {status === 'saved' && (
        <>
          Saved to{' '}
          <button
            type="button"
            onClick={onOpenReplayLibrary}
            className="text-cyan-400 underline-offset-2 hover:underline"
          >
            Replay Library
          </button>
          .
        </>
      )}
      {status === 'saving' && 'Saving replay...'}
      {status === 'failed' && 'Replay save failed (game state intact).'}
      {status === 'idle' && 'This was a quick game session.'}
    </p>
  );
}
