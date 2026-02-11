import React, { useState, useCallback } from 'react';

import type { IKeyMoment, SortKey } from './encounter-history';

import {
  BattleListSidebar,
  ForcesSection,
  DamageMatrixSection,
  KeyMomentsSection,
  EventTimelineSection,
  ComparisonSection,
} from './encounter-history';

export type {
  IEncounterHistoryProps,
  IBattle,
  IForce,
  IDamageMatrix,
  IKeyMoment,
  IBattleEvent,
} from './encounter-history';

export { formatDuration } from './encounter-history';

import type { IEncounterHistoryProps } from './encounter-history';
import type { SortDirection } from './encounter-history';

export const EncounterHistory: React.FC<IEncounterHistoryProps> = ({
  campaignId,
  battles,
  onSelectBattle,
  onDrillDown,
}) => {
  const [selectedBattleId, setSelectedBattleId] = useState<string | null>(null);
  const [outcomeFilter, setOutcomeFilter] = useState<Record<string, string[]>>(
    {},
  );
  const [sortKey, setSortKey] = useState<SortKey>('duration');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentTurn, setCurrentTurn] = useState(1);

  const selectedBattle = battles.find((b) => b.id === selectedBattleId) ?? null;

  const handleSelectBattle = useCallback(
    (battleId: string) => {
      setSelectedBattleId(battleId);
      setCurrentTurn(1);
      onSelectBattle?.(battleId);
    },
    [onSelectBattle],
  );

  const handleDrillDown = useCallback(
    (targetTab: string, filter?: Record<string, unknown>) => {
      onDrillDown?.(targetTab, filter ?? {});
    },
    [onDrillDown],
  );

  const handleSortChange = useCallback(
    (key: SortKey) => {
      if (key === sortKey) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDirection('asc');
      }
    },
    [sortKey],
  );

  const handleKeyMomentClick = useCallback((moment: IKeyMoment) => {
    setCurrentTurn(moment.turn);
  }, []);

  const handleTurnChange = useCallback((turn: number) => {
    setCurrentTurn(turn);
  }, []);

  return (
    <div
      className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8 dark:bg-gray-900"
      data-testid="encounter-history"
      data-campaign-id={campaignId}
    >
      <h1
        className="mb-6 text-2xl font-bold text-gray-900 md:text-3xl dark:text-gray-100"
        data-testid="encounter-history-title"
      >
        Encounter History
      </h1>

      <div className="flex flex-col gap-4 lg:flex-row">
        <BattleListSidebar
          battles={battles}
          selectedBattleId={selectedBattleId}
          onSelectBattle={handleSelectBattle}
          outcomeFilter={outcomeFilter}
          onOutcomeFilterChange={setOutcomeFilter}
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSortChange={handleSortChange}
        />

        <main
          className="w-full lg:w-[70%]"
          aria-label="Battle detail"
          data-testid="battle-detail"
        >
          {!selectedBattle ? (
            <div
              className="flex h-64 items-center justify-center text-lg text-gray-500 dark:text-gray-400"
              data-testid="no-battle-selected"
            >
              Select a battle to view details
            </div>
          ) : (
            <div className="space-y-6">
              <ForcesSection battle={selectedBattle} />
              <DamageMatrixSection
                battle={selectedBattle}
                onDrillDown={handleDrillDown}
              />
              <KeyMomentsSection
                battle={selectedBattle}
                onMomentClick={handleKeyMomentClick}
              />
              <EventTimelineSection
                battle={selectedBattle}
                currentTurn={currentTurn}
                onTurnChange={handleTurnChange}
              />
              <ComparisonSection
                battle={selectedBattle}
                battles={battles}
                onDrillDown={handleDrillDown}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default EncounterHistory;
