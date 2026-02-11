import React, { useCallback, useMemo, useState } from 'react';

import { FilterPanel } from '@/components/simulation-viewer/FilterPanel';
import { FOCUS_RING_CLASSES, announce } from '@/utils/accessibility';
import { useIsMobile } from '@/utils/responsive';

import type { IBattle, SortKey, SortDirection } from './types';

import {
  OUTCOME_COLORS,
  OUTCOME_FILTER_DEF,
  SORT_OPTIONS,
  formatDuration,
} from './types';

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

  const filteredAndSortedBattles = useMemo(() => {
    let filtered = [...battles];
    const activeOutcomes = outcomeFilter.outcome ?? [];
    if (activeOutcomes.length > 0) {
      filtered = filtered.filter((b) => activeOutcomes.includes(b.outcome));
    }
    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'duration':
          cmp = a.duration - b.duration;
          break;
        case 'kills':
          cmp = a.stats.totalKills - b.stats.totalKills;
          break;
        case 'damage':
          cmp = a.stats.totalDamage - b.stats.totalDamage;
          break;
      }
      return sortDirection === 'desc' ? -cmp : cmp;
    });
    return filtered;
  }, [battles, outcomeFilter, sortKey, sortDirection]);

  const filteredMissionGroups = useMemo(() => {
    const groups = new Map<
      string,
      { missionName: string; battles: IBattle[] }
    >();
    for (const battle of filteredAndSortedBattles) {
      if (!groups.has(battle.missionId)) {
        groups.set(battle.missionId, {
          missionName: battle.missionName,
          battles: [],
        });
      }
      groups.get(battle.missionId)!.battles.push(battle);
    }
    return groups;
  }, [filteredAndSortedBattles]);

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
        <button
          type="button"
          onClick={() => setSidebarOpen((prev) => !prev)}
          className={`flex min-h-[44px] w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 lg:hidden dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 ${FOCUS_RING_CLASSES}`}
          aria-expanded={sidebarOpen}
          data-testid="sidebar-toggle"
        >
          <span>Battle List ({filteredAndSortedBattles.length})</span>
          <span aria-hidden="true">{sidebarOpen ? '▾' : '▸'}</span>
        </button>
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

        <div
          className="mb-4 flex items-center gap-1 rounded-lg bg-gray-200 p-1 dark:bg-gray-700"
          role="group"
          aria-label="Sort battles by"
          data-testid="sort-controls"
        >
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => handleSortKeyChange(opt.key)}
              className={[
                `flex min-h-[44px] items-center gap-1 rounded-md px-3 py-2 text-sm transition-colors md:min-h-0 md:py-1 ${FOCUS_RING_CLASSES}`,
                sortKey === opt.key
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
              ].join(' ')}
              aria-pressed={sortKey === opt.key}
              data-testid={`sort-button-${opt.key}`}
            >
              {opt.label}
              {sortKey === opt.key && (
                <span
                  aria-label={
                    sortDirection === 'asc' ? 'Ascending' : 'Descending'
                  }
                  data-testid="sort-direction-indicator"
                >
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </button>
          ))}
        </div>

        {filteredAndSortedBattles.length === 0 ? (
          <p
            className="py-8 text-center text-sm text-gray-500 italic dark:text-gray-400"
            data-testid="empty-battle-list"
          >
            No battles match the current filters.
          </p>
        ) : (
          <div className="space-y-3" data-testid="battle-list">
            {Array.from(filteredMissionGroups.entries()).map(
              ([missionId, group]) => (
                <div
                  key={missionId}
                  className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
                  data-testid={`mission-group-${missionId}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleMission(missionId)}
                    className={`flex min-h-[44px] w-full items-center justify-between bg-gray-100 px-3 py-3 text-sm font-semibold text-gray-700 md:min-h-0 md:py-2 dark:bg-gray-800 dark:text-gray-300 ${FOCUS_RING_CLASSES}`}
                    aria-expanded={expandedMissions.has(missionId)}
                    aria-label={`${group.missionName} mission group, ${group.battles.length} battle${group.battles.length !== 1 ? 's' : ''}`}
                    data-testid={`mission-group-header-${missionId}`}
                  >
                    <span>{group.missionName}</span>
                    <span
                      className="text-gray-400 dark:text-gray-500"
                      aria-hidden="true"
                    >
                      {expandedMissions.has(missionId) ? '▾' : '▸'}
                    </span>
                  </button>
                  {expandedMissions.has(missionId) && (
                    <div className="space-y-1 p-2">
                      {group.battles.map((battle) => (
                        <button
                          key={battle.id}
                          type="button"
                          onClick={() => onSelectBattle(battle.id)}
                          className={[
                            `w-full rounded-md border p-3 text-left transition-colors ${FOCUS_RING_CLASSES}`,
                            selectedBattleId === battle.id
                              ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800',
                          ].join(' ')}
                          aria-current={
                            selectedBattleId === battle.id ? 'true' : undefined
                          }
                          aria-label={`Battle on ${new Date(battle.timestamp).toLocaleDateString()}, ${battle.outcome}, ${battle.stats.totalKills} kills`}
                          data-testid={`battle-card-${battle.id}`}
                        >
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(battle.timestamp).toLocaleDateString()}
                            </span>
                            <span
                              className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${OUTCOME_COLORS[battle.outcome]}`}
                              data-testid={`battle-outcome-badge-${battle.id}`}
                            >
                              {battle.outcome}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                            <span data-testid={`battle-duration-${battle.id}`}>
                              ⏱ {formatDuration(battle.duration)}
                            </span>
                            <span data-testid={`battle-kills-${battle.id}`}>
                              ⚔ {battle.stats.totalKills} kills
                            </span>
                            <span data-testid={`battle-damage-${battle.id}`}>
                              💥 {battle.stats.totalDamage} dmg
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ),
            )}
          </div>
        )}
      </aside>
    </>
  );
};
