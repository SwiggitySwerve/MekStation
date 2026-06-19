import React from 'react';

import { FOCUS_RING_CLASSES } from '@/utils/accessibility';

import type { IBattle, SortDirection, SortKey } from './types';

import { OUTCOME_COLORS, SORT_OPTIONS, formatDuration } from './types';

export interface MissionBattleGroup {
  readonly missionName: string;
  readonly battles: IBattle[];
}

export function filterAndSortBattles(
  battles: readonly IBattle[],
  outcomeFilter: Record<string, string[]>,
  sortKey: SortKey,
  sortDirection: SortDirection,
): IBattle[] {
  const activeOutcomes = outcomeFilter.outcome ?? [];
  const filtered =
    activeOutcomes.length > 0
      ? battles.filter((battle) => activeOutcomes.includes(battle.outcome))
      : [...battles];

  return filtered.sort((a, b) => {
    const cmp = compareBattles(a, b, sortKey);
    return sortDirection === 'desc' ? -cmp : cmp;
  });
}

export function groupBattlesByMission(
  battles: readonly IBattle[],
): Map<string, MissionBattleGroup> {
  const groups = new Map<string, MissionBattleGroup>();
  for (const battle of battles) {
    const group = groups.get(battle.missionId);
    if (group) {
      group.battles.push(battle);
      continue;
    }
    groups.set(battle.missionId, {
      missionName: battle.missionName,
      battles: [battle],
    });
  }
  return groups;
}

export function BattleListToggle({
  battleCount,
  isOpen,
  onToggle,
}: {
  readonly battleCount: number;
  readonly isOpen: boolean;
  readonly onToggle: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex min-h-[44px] w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 lg:hidden dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 ${FOCUS_RING_CLASSES}`}
      aria-expanded={isOpen}
      data-testid="sidebar-toggle"
    >
      <span>Battle List ({battleCount})</span>
      <span aria-hidden="true">{isOpen ? '▾' : '▸'}</span>
    </button>
  );
}

export function BattleSortControls({
  sortKey,
  sortDirection,
  onSortKeyChange,
}: {
  readonly sortKey: SortKey;
  readonly sortDirection: SortDirection;
  readonly onSortKeyChange: (key: SortKey) => void;
}): React.ReactElement {
  return (
    <div
      className="mb-4 flex items-center gap-1 rounded-lg bg-gray-200 p-1 dark:bg-gray-700"
      role="group"
      aria-label="Sort battles by"
      data-testid="sort-controls"
    >
      {SORT_OPTIONS.map((opt) => (
        <SortButton
          key={opt.key}
          option={opt}
          isActive={sortKey === opt.key}
          sortDirection={sortDirection}
          onClick={() => onSortKeyChange(opt.key)}
        />
      ))}
    </div>
  );
}

export function BattleListContent({
  battles,
  missionGroups,
  expandedMissions,
  selectedBattleId,
  onSelectBattle,
  onToggleMission,
}: {
  readonly battles: readonly IBattle[];
  readonly missionGroups: Map<string, MissionBattleGroup>;
  readonly expandedMissions: ReadonlySet<string>;
  readonly selectedBattleId: string | null;
  readonly onSelectBattle: (battleId: string) => void;
  readonly onToggleMission: (missionId: string) => void;
}): React.ReactElement {
  if (battles.length === 0) {
    return (
      <p
        className="py-8 text-center text-sm text-gray-500 italic dark:text-gray-400"
        data-testid="empty-battle-list"
      >
        No battles match the current filters.
      </p>
    );
  }

  return (
    <div className="space-y-3" data-testid="battle-list">
      {Array.from(missionGroups.entries()).map(([missionId, group]) => (
        <MissionGroup
          key={missionId}
          missionId={missionId}
          group={group}
          isExpanded={expandedMissions.has(missionId)}
          selectedBattleId={selectedBattleId}
          onSelectBattle={onSelectBattle}
          onToggleMission={onToggleMission}
        />
      ))}
    </div>
  );
}

function compareBattles(a: IBattle, b: IBattle, sortKey: SortKey): number {
  switch (sortKey) {
    case 'duration':
      return a.duration - b.duration;
    case 'kills':
      return a.stats.totalKills - b.stats.totalKills;
    case 'damage':
      return a.stats.totalDamage - b.stats.totalDamage;
  }
}

function SortButton({
  option,
  isActive,
  sortDirection,
  onClick,
}: {
  readonly option: (typeof SORT_OPTIONS)[number];
  readonly isActive: boolean;
  readonly sortDirection: SortDirection;
  readonly onClick: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        `flex min-h-[44px] items-center gap-1 rounded-md px-3 py-2 text-sm transition-colors md:min-h-0 md:py-1 ${FOCUS_RING_CLASSES}`,
        isActive
          ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm font-medium'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
      ].join(' ')}
      aria-pressed={isActive}
      data-testid={`sort-button-${option.key}`}
    >
      {option.label}
      {isActive && <SortDirectionIndicator sortDirection={sortDirection} />}
    </button>
  );
}

function SortDirectionIndicator({
  sortDirection,
}: {
  readonly sortDirection: SortDirection;
}): React.ReactElement {
  return (
    <span
      aria-label={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
      data-testid="sort-direction-indicator"
    >
      {sortDirection === 'asc' ? '↑' : '↓'}
    </span>
  );
}

function MissionGroup({
  missionId,
  group,
  isExpanded,
  selectedBattleId,
  onSelectBattle,
  onToggleMission,
}: {
  readonly missionId: string;
  readonly group: MissionBattleGroup;
  readonly isExpanded: boolean;
  readonly selectedBattleId: string | null;
  readonly onSelectBattle: (battleId: string) => void;
  readonly onToggleMission: (missionId: string) => void;
}): React.ReactElement {
  return (
    <div
      className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700"
      data-testid={`mission-group-${missionId}`}
    >
      <MissionGroupHeader
        missionId={missionId}
        group={group}
        isExpanded={isExpanded}
        onToggleMission={onToggleMission}
      />
      {isExpanded && (
        <div className="space-y-1 p-2">
          {group.battles.map((battle) => (
            <BattleCard
              key={battle.id}
              battle={battle}
              isSelected={selectedBattleId === battle.id}
              onSelectBattle={onSelectBattle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MissionGroupHeader({
  missionId,
  group,
  isExpanded,
  onToggleMission,
}: {
  readonly missionId: string;
  readonly group: MissionBattleGroup;
  readonly isExpanded: boolean;
  readonly onToggleMission: (missionId: string) => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={() => onToggleMission(missionId)}
      className={`flex min-h-[44px] w-full items-center justify-between bg-gray-100 px-3 py-3 text-sm font-semibold text-gray-700 md:min-h-0 md:py-2 dark:bg-gray-800 dark:text-gray-300 ${FOCUS_RING_CLASSES}`}
      aria-expanded={isExpanded}
      aria-label={`${group.missionName} mission group, ${group.battles.length} battle${group.battles.length !== 1 ? 's' : ''}`}
      data-testid={`mission-group-header-${missionId}`}
    >
      <span>{group.missionName}</span>
      <span className="text-gray-400 dark:text-gray-500" aria-hidden="true">
        {isExpanded ? '▾' : '▸'}
      </span>
    </button>
  );
}

function BattleCard({
  battle,
  isSelected,
  onSelectBattle,
}: {
  readonly battle: IBattle;
  readonly isSelected: boolean;
  readonly onSelectBattle: (battleId: string) => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={() => onSelectBattle(battle.id)}
      className={[
        `w-full rounded-md border p-3 text-left transition-colors ${FOCUS_RING_CLASSES}`,
        isSelected
          ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
          : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800',
      ].join(' ')}
      aria-current={isSelected ? 'true' : undefined}
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
  );
}
