/**
 * Quick Game Results Component
 * Displays game results with replay and play again options.
 * Features a tabbed interface for Summary, Units, Damage, and Timeline views.
 *
 * @spec openspec/changes/add-quick-session-mode/proposal.md
 */

import { useRouter } from 'next/router';
import { useState, useRef, useCallback, useMemo } from 'react';

import { Card } from '@/components/ui';
import { useTabKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { useKeyMoments } from '@/hooks/useKeyMoments';
import { useGameplaySelector } from '@/stores/useGameplayStore';
import { useQuickGameSelector } from '@/stores/useQuickGameStore';

import type { ResultsTab } from './quickGameResults.helpers';

import { deriveQuickGameResults } from './quickGameResults.derived';
import { RESULTS_TABS } from './quickGameResults.helpers';
import {
  NoGameResultsCard,
  PersistStatusFooter,
  ResultsActions,
  ResultsTabList,
} from './QuickGameResultsLayout';
import { ResultsTabPanels } from './QuickGameResultsPanels';
import { ResultBanner } from './QuickGameResultsSections';
import { useQuickGameReplayPersist } from './useQuickGameReplayPersist';

export function QuickGameResults(): React.ReactElement {
  const router = useRouter();
  const game = useQuickGameSelector((state) => state.game);
  const playAgain = useQuickGameSelector((state) => state.playAgain);
  const clearGame = useQuickGameSelector((state) => state.clearGame);
  const session = useGameplaySelector((state) => state.session);
  const [activeTab, setActiveTab] = useState<ResultsTab>('summary');
  const tabListRef = useRef<HTMLDivElement>(null);
  const persistStatus = useQuickGameReplayPersist(game);

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId as ResultsTab);
  }, []);

  const handleKeyDown = useTabKeyboardNavigation(
    RESULTS_TABS,
    activeTab,
    handleTabChange,
  );

  const viewModel = useMemo(
    () => deriveQuickGameResults(session, game),
    [session, game],
  );
  const keyMoments = useKeyMoments(
    session?.events ?? [],
    viewModel.battleState ?? { units: [] },
  );

  if (!game) {
    return (
      <NoGameResultsCard
        onStartNewGame={() => router.push('/gameplay/quick')}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4 py-8">
      <div className="mb-6">
        <ResultBanner
          winner={game.winner ?? 'draw'}
          reason={game.victoryReason}
        />
      </div>

      <Card className="mb-6">
        <ResultsTabList
          activeTab={activeTab}
          tabListRef={tabListRef}
          onKeyDown={handleKeyDown}
          onTabChange={setActiveTab}
        />
        <ResultsTabPanels
          activeTab={activeTab}
          gameId={game.id}
          scenario={game.scenario}
          events={game.events}
          viewModel={viewModel}
          keyMoments={keyMoments}
        />
      </Card>

      <ResultsActions
        onPlayAgainSameUnits={() => playAgain(false)}
        onPlayAgainNewUnits={() => playAgain(true)}
        onExit={() => {
          clearGame();
          router.push('/gameplay/games');
        }}
      />

      <PersistStatusFooter
        status={persistStatus}
        onOpenReplayLibrary={() => router.push('/replay-library')}
      />
    </div>
  );
}
