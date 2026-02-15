/**
 * Quick Game Results Component
 * Displays game results with replay and play again options.
 * Features a tabbed interface for Summary, Units, Damage, and Timeline views.
 *
 * @spec openspec/changes/add-quick-session-mode/proposal.md
 */

import { useRouter } from 'next/router';
import { useState, useRef, useCallback, useMemo } from 'react';

import type { IGameOutcome, ICombatStats } from '@/services/game-resolution';
import type { IDamageAssessment } from '@/services/game-resolution/DamageCalculator';
import type { BattleState } from '@/types/simulation/BattleState';

import { Button, Card } from '@/components/ui';
import { useTabKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { useKeyMoments } from '@/hooks/useKeyMoments';
import {
  calculateGameOutcome,
  calculateCombatStats,
  assessUnitDamage,
} from '@/services/game-resolution';
import { useGameplayStore } from '@/stores/useGameplayStore';
import { useQuickGameStore } from '@/stores/useQuickGameStore';
import { GameSide } from '@/types/gameplay';

import type { ResultsTab } from './quickGameResults.helpers';

import { DamageMatrix } from './DamageMatrix';
import { RESULTS_TABS } from './quickGameResults.helpers';
import {
  ResultBanner,
  BattleSummary,
  UnitStatusRow,
  TimelineEventRow,
} from './QuickGameResultsSections';

export function QuickGameResults(): React.ReactElement {
  const router = useRouter();
  const { game, playAgain, clearGame } = useQuickGameStore();
  const session = useGameplayStore((s) => s.session);
  const [activeTab, setActiveTab] = useState<ResultsTab>('summary');
  const tabListRef = useRef<HTMLDivElement>(null);

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId as ResultsTab);
  }, []);

  const handleKeyDown = useTabKeyboardNavigation(
    RESULTS_TABS,
    activeTab,
    handleTabChange,
  );

  const outcome = useMemo((): IGameOutcome | null => {
    if (!session || !game) return null;
    return calculateGameOutcome({
      state: session.currentState,
      events: session.events,
      config: session.config,
      startedAt: game.startedAt,
      endedAt: game.endedAt ?? new Date().toISOString(),
    });
  }, [session, game]);

  const combatStats = useMemo((): ICombatStats | null => {
    if (!session) return null;
    return calculateCombatStats(session.events, session.currentState.units);
  }, [session]);

  const battleState = useMemo((): BattleState | null => {
    if (!session || !game) return null;
    const allQuickUnits = [
      ...game.playerForce.units,
      ...(game.opponentForce?.units ?? []),
    ];

    return {
      units: allQuickUnits.map((u) => {
        const unitState = session.currentState.units[u.instanceId];
        const side = game.playerForce.units.some(
          (pu) => pu.instanceId === u.instanceId,
        )
          ? GameSide.Player
          : GameSide.Opponent;

        return {
          id: unitState?.id ?? u.instanceId,
          name: u.name,
          side,
          bv: u.bv,
          weaponIds: [],
          initialArmor: u.maxArmor,
          initialStructure: u.maxStructure,
        };
      }),
    };
  }, [session, game]);

  const keyMoments = useKeyMoments(
    session?.events ?? [],
    battleState ?? { units: [] },
  );

  const unitDamageMap = useMemo((): Map<string, IDamageAssessment> => {
    const map = new Map<string, IDamageAssessment>();
    if (!session || !game) return map;

    const allQuickUnits = [
      ...game.playerForce.units,
      ...(game.opponentForce?.units ?? []),
    ];

    for (const qUnit of allQuickUnits) {
      const unitState = Object.values(session.currentState.units).find(
        (u) => u.id === qUnit.instanceId || u.id === qUnit.sourceUnitId,
      );
      if (unitState) {
        const assessment = assessUnitDamage(
          unitState,
          qUnit.maxArmor,
          qUnit.maxStructure,
        );
        map.set(qUnit.instanceId, assessment);
      }
    }
    return map;
  }, [session, game]);

  if (!game) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <Card className="p-8 text-center">
          <p className="text-gray-400">No game results to display.</p>
          <Button
            variant="primary"
            onClick={() => router.push('/gameplay/quick')}
            className="mt-4"
          >
            Start New Game
          </Button>
        </Card>
      </div>
    );
  }

  const handlePlayAgainSameUnits = () => {
    playAgain(false);
  };

  const handlePlayAgainNewUnits = () => {
    playAgain(true);
  };

  const handleExit = () => {
    clearGame();
    router.push('/gameplay/games');
  };

  const allUnits = [
    ...game.playerForce.units.map((u) => ({
      unit: u,
      forceType: 'player' as const,
    })),
    ...(game.opponentForce?.units.map((u) => ({
      unit: u,
      forceType: 'opponent' as const,
    })) ?? []),
  ];

  return (
    <div className="mx-auto max-w-2xl p-4 py-8">
      <div className="mb-6">
        <ResultBanner
          winner={game.winner ?? 'draw'}
          reason={game.victoryReason}
        />
      </div>

      <Card className="mb-6">
        <div
          ref={tabListRef}
          role="tablist"
          aria-label="Battle results tabs"
          className="flex border-b border-gray-700"
          onKeyDown={handleKeyDown}
        >
          {RESULTS_TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => handleTabChange(tab.id)}
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

        <div
          role="tabpanel"
          id="tabpanel-summary"
          aria-labelledby="tab-summary"
          hidden={activeTab !== 'summary'}
          className="p-4"
        >
          <BattleSummary
            outcome={outcome}
            combatStats={combatStats}
            keyMoments={keyMoments}
          />

          {game.scenario && (
            <div className="mt-4 rounded-lg bg-gray-800/50 p-4">
              <h4 className="mb-2 text-sm font-medium text-gray-300">
                Scenario
              </h4>
              <p className="text-white">{game.scenario.template.name}</p>
              <p className="mt-1 text-xs text-gray-500">
                {game.scenario.mapPreset.name} - {game.scenario.mapPreset.biome}
              </p>
            </div>
          )}
        </div>

        <div
          role="tabpanel"
          id="tabpanel-units"
          aria-labelledby="tab-units"
          hidden={activeTab !== 'units'}
        >
          {allUnits.length === 0 ? (
            <p className="p-4 text-center text-gray-400">
              No units in this battle.
            </p>
          ) : (
            <div className="divide-y divide-gray-700/50">
              {allUnits.map(({ unit, forceType }) => (
                <UnitStatusRow
                  key={unit.instanceId}
                  unit={unit}
                  forceType={forceType}
                  events={game.events}
                  damageAssessment={unitDamageMap.get(unit.instanceId)}
                />
              ))}
            </div>
          )}
        </div>

        <div
          role="tabpanel"
          id="tabpanel-damage"
          aria-labelledby="tab-damage"
          hidden={activeTab !== 'damage'}
          className="p-4"
        >
          <DamageMatrix
            events={game.events}
            units={[
              ...game.playerForce.units,
              ...(game.opponentForce?.units ?? []),
            ]}
          />
        </div>

        <div
          role="tabpanel"
          id="tabpanel-timeline"
          aria-labelledby="tab-timeline"
          hidden={activeTab !== 'timeline'}
        >
          {game.events.length === 0 ? (
            <p className="p-4 text-center text-gray-400">No events recorded.</p>
          ) : (
            <div className="max-h-96 divide-y divide-gray-700/30 overflow-y-auto">
              {game.events.map((event, index) => (
                <TimelineEventRow key={event.id} event={event} index={index} />
              ))}
            </div>
          )}
        </div>
      </Card>

      <div className="space-y-3">
        <Button
          variant="primary"
          className="w-full"
          onClick={handlePlayAgainSameUnits}
          data-testid="play-again-same-btn"
        >
          Play Again (Same Units)
        </Button>

        <Button
          variant="secondary"
          className="w-full"
          onClick={handlePlayAgainNewUnits}
          data-testid="play-again-new-btn"
        >
          Play Again (New Force)
        </Button>

        <Button
          variant="secondary"
          className="w-full"
          onClick={handleExit}
          data-testid="exit-btn"
        >
          Exit to Games
        </Button>
      </div>

      <p className="mt-6 text-center text-xs text-gray-500">
        This was a quick game session. No data is persisted.
      </p>
    </div>
  );
}
