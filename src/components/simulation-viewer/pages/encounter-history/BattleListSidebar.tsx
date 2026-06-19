import React, { useCallback, useMemo, useState } from 'react';

import { FilterPanel } from '@/components/simulation-viewer/FilterPanel';
import { announce } from '@/utils/accessibility';
import { useIsMobile } from '@/utils/responsive';

import type { IBattle, SortDirection, SortKey } from './types';

import {
  BattleListContent,
  BattleListToggle,
  BattleSortControls,
  filterAndSortBattles,
  groupBattlesByMission,
} from './BattleListSidebar.sections';
import { OUTCOME_FILTER_DEF } from './types';

export interface IBattleListSidebarProps {
  readonly battles: IBattle[];
  readonly selectedBattleId: string | null;
  readonly onSelectBattle: (battleId: string) => void;
  readonly outcomeFilter: Record<string, string[]>;
  readonly onOutcomeFilterChange: (filter: Record<string, string[]>) => void;
  readonly sortKey: SortKey;
  readonly sortDirection: SortDirection;
  readonly onSortChange: (key: SortKey) => void;
}

export const BattleListSidebar: React.FC<IBattleListSidebarProps> = ({
  battles,
  selectedBattleId,
  onSelectBattle,
  outcomeFilter,
  onOutcomeFilterChange,
  sortKey,
  sortDirection,
  onSortChange,
}) => {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMissions, setExpandedMissions] = useState<Set<string>>(
    () => new Set(battles.map((b) => b.missionId)),
  );

  const filteredAndSortedBattles = useMemo(
    () => filterAndSortBattles(battles, outcomeFilter, sortKey, sortDirection),
    [battles, outcomeFilter, sortKey, sortDirection],
  );
  const filteredMissionGroups = useMemo(
    () => groupBattlesByMission(filteredAndSortedBattles),
    [filteredAndSortedBattles],
  );

  React.useEffect(() => {
    setExpandedMissions(new Set(battles.map((b) => b.missionId)));
  }, [battles]);

  const handleSortKeyChange = useCallback(
    (key: SortKey) => {
      if (key === sortKey) {
        const newDir = sortDirection === 'asc' ? 'desc' : 'asc';
        announce(
          `Sorted by ${key}, ${newDir === 'asc' ? 'ascending' : 'descending'}`,
        );
      } else {
        announce(`Sorted by ${key}, ascending`);
      }
      onSortChange(key);
    },
    [sortKey, sortDirection, onSortChange],
  );

  const toggleMission = useCallback((missionId: string) => {
    setExpandedMissions((prev) => {
      const next = new Set(prev);
      if (next.has(missionId)) next.delete(missionId);
      else next.add(missionId);
      return next;
    });
  }, []);

  return (
    <>
      {isMobile && (
        <BattleListToggle
          battleCount={filteredAndSortedBattles.length}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen((prev) => !prev)}
        />
      )}
      <aside
        className={`w-full lg:w-[30%] ${isMobile && !sidebarOpen ? 'hidden' : ''} lg:block`}
        aria-label="Battle list"
        data-testid="battle-list-sidebar"
      >
        <div data-testid="battle-list-filter" className="mb-4">
          <FilterPanel
            filters={[OUTCOME_FILTER_DEF]}
            activeFilters={outcomeFilter}
            onFilterChange={onOutcomeFilterChange}
          />
        </div>

        <BattleSortControls
          sortKey={sortKey}
          sortDirection={sortDirection}
          onSortKeyChange={handleSortKeyChange}
        />

        <BattleListContent
          battles={filteredAndSortedBattles}
          missionGroups={filteredMissionGroups}
          expandedMissions={expandedMissions}
          selectedBattleId={selectedBattleId}
          onSelectBattle={onSelectBattle}
          onToggleMission={toggleMission}
        />
      </aside>
    </>
  );
};
