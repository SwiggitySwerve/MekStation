import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { FilterPanel } from '@/components/simulation-viewer/FilterPanel';
import { DrillDownLink } from '@/components/simulation-viewer/DrillDownLink';
import { VirtualizedTimeline } from '@/components/simulation-viewer/VirtualizedTimeline';
import type { IFilterDefinition } from '@/components/simulation-viewer/types';
import { useIsMobile } from '@/utils/responsive';
import { FOCUS_RING_CLASSES, announce } from '@/utils/accessibility';

/* ========================================================================== */
/*  Types                                                                      */
/* ========================================================================== */

/**
 * Props for the Encounter History page component.
 * Displays battle list grouped by mission, detail view with forces,
 * damage matrix, key moments, event timeline with VCR, and comparison.
 *
 * Key moments data is expected to originate from KeyMomentDetector output,
 * mapped to page-level types by the parent container.
 */
export interface IEncounterHistoryProps {
  /** Campaign identifier */
  readonly campaignId: string;
  /** Array of battles to display */
  readonly battles: IBattle[];
  /** Callback when a battle is selected */
  readonly onSelectBattle?: (battleId: string) => void;
  /** Callback for drill-down navigation */
  readonly onDrillDown?: (target: string, context: Record<string, unknown>) => void;
}

/** Battle record within a campaign */
export interface IBattle {
  readonly id: string;
  readonly missionId: string;
  readonly missionName: string;
  readonly timestamp: string;
  readonly duration: number;
  readonly outcome: 'victory' | 'defeat' | 'draw';
  readonly forces: {
    readonly player: IForce;
    readonly enemy: IForce;
  };
  readonly damageMatrix: IDamageMatrix;
  readonly keyMoments: IKeyMoment[];
  readonly events: IBattleEvent[];
  readonly stats: {
    readonly totalKills: number;
    readonly totalDamage: number;
    readonly unitsLost: number;
  };
}

/** Force composition */
export interface IForce {
  readonly units: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly pilot: string;
    readonly status: 'operational' | 'damaged' | 'destroyed';
  }>;
  readonly totalBV: number;
}

/** Damage exchange matrix between attackers and targets */
export interface IDamageMatrix {
  readonly attackers: string[];
  readonly targets: string[];
  readonly cells: ReadonlyArray<{
    readonly attackerId: string;
    readonly targetId: string;
    readonly damage: number;
  }>;
}

/** Key moment identified by KeyMomentDetector, mapped to page-level types */
export interface IKeyMoment {
  readonly id: string;
  readonly turn: number;
  readonly phase: string;
  readonly tier: 'critical' | 'major' | 'minor';
  readonly type: 'kill' | 'cripple' | 'headshot' | 'ammo-explosion' | 'shutdown' | 'fall';
  readonly description: string;
  readonly involvedUnits: string[];
}

/** Battle event for timeline display */
export interface IBattleEvent {
  readonly id: string;
  readonly turn: number;
  readonly phase: string;
  readonly timestamp: number;
  readonly type: 'movement' | 'attack' | 'damage' | 'status-change';
  readonly description: string;
  readonly involvedUnits: string[];
}

/* ========================================================================== */
/*  Internal Types                                                             */
/* ========================================================================== */

type SortKey = 'duration' | 'kills' | 'damage';
type SortDirection = 'asc' | 'desc';
type ComparisonMode = 'campaign-average' | 'specific-battle';

/* ========================================================================== */
/*  Constants                                                                  */
/* ========================================================================== */

const OUTCOME_COLORS: Record<IBattle['outcome'], string> = {
  victory: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200',
  defeat: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200',
  draw: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200',
};

const TIER_COLORS: Record<IKeyMoment['tier'], string> = {
  critical: 'bg-red-600 text-white',
  major: 'bg-amber-500 text-white',
  minor: 'bg-blue-500 text-white',
};

const STATUS_COLORS: Record<string, string> = {
  operational: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  damaged: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  destroyed: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
};

const OUTCOME_FILTER_DEF: IFilterDefinition = {
  id: 'outcome',
  label: 'Outcome',
  options: ['victory', 'defeat', 'draw'],
  optionLabels: { victory: 'Victory', defeat: 'Defeat', draw: 'Draw' },
};

const TIER_FILTER_DEF: IFilterDefinition = {
  id: 'tier',
  label: 'Tier',
  options: ['critical', 'major', 'minor'],
  optionLabels: { critical: 'Critical', major: 'Major', minor: 'Minor' },
};

const TYPE_FILTER_DEF: IFilterDefinition = {
  id: 'type',
  label: 'Type',
  options: ['kill', 'cripple', 'headshot', 'ammo-explosion', 'shutdown', 'fall'],
  optionLabels: {
    kill: 'Kill',
    cripple: 'Cripple',
    headshot: 'Headshot',
    'ammo-explosion': 'Ammo Explosion',
    shutdown: 'Shutdown',
    fall: 'Fall',
  },
};

const SORT_OPTIONS: ReadonlyArray<{ key: SortKey; label: string }> = [
  { key: 'duration', label: 'Duration' },
  { key: 'kills', label: 'Kills' },
  { key: 'damage', label: 'Damage' },
];

const BAR_SEGMENTS = 20;

/* ========================================================================== */
/*  Utility Functions                                                          */
/* ========================================================================== */

/** Format seconds as M:SS display string. */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds) % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Get the highest turn number from a battle's events. */
function getMaxTurn(battle: IBattle): number {
  if (battle.events.length === 0) return 0;
  return Math.max(...battle.events.map(e => e.turn));
}

/** Tailwind class for damage cell heat-map intensity. */
function getDamageIntensityClass(damage: number, maxDamage: number): string {
  if (damage === 0 || maxDamage === 0) return 'bg-gray-50 dark:bg-gray-800';
  const ratio = damage / maxDamage;
  if (ratio < 0.25) return 'bg-red-100 dark:bg-red-900/30';
  if (ratio < 0.5) return 'bg-red-200 dark:bg-red-800/40';
  if (ratio < 0.75) return 'bg-red-400 dark:bg-red-700/50';
  return 'bg-red-600 dark:bg-red-500/70 text-white';
}

/** Resolve a unit ID to its display name from the battle's forces. */
function resolveUnitName(battle: IBattle, unitId: string): string {
  const allUnits = [...battle.forces.player.units, ...battle.forces.enemy.units];
  return allUnits.find(u => u.id === unitId)?.name ?? unitId;
}

/** Compute average metrics across all battles in the campaign. */
function computeCampaignAverage(battles: IBattle[]): {
  duration: number;
  kills: number;
  damage: number;
  unitsLost: number;
} {
  if (battles.length === 0) return { duration: 0, kills: 0, damage: 0, unitsLost: 0 };
  const totals = battles.reduce(
    (acc, b) => ({
      duration: acc.duration + b.duration,
      kills: acc.kills + b.stats.totalKills,
      damage: acc.damage + b.stats.totalDamage,
      unitsLost: acc.unitsLost + b.stats.unitsLost,
    }),
    { duration: 0, kills: 0, damage: 0, unitsLost: 0 },
  );
  const n = battles.length;
  return {
    duration: Math.round(totals.duration / n),
    kills: Math.round((totals.kills / n) * 10) / 10,
    damage: Math.round(totals.damage / n),
    unitsLost: Math.round((totals.unitsLost / n) * 10) / 10,
  };
}

/* ========================================================================== */
/*  Component                                                                  */
/* ========================================================================== */

/**
 * Encounter History — browsable battle list with deep-dive detail views.
 *
 * Renders a responsive sidebar + main layout with five detail sections:
 * 1. Forces — player vs enemy unit rosters with status badges
 * 2. Damage Matrix — heat-map grid of attacker→target damage exchanges
 * 3. Key Moments — horizontal timeline of KeyMomentDetector output
 * 4. Event Timeline — vertical turn-by-turn events with VCR playback
 * 5. Comparison — bar-chart comparison vs campaign average or specific battle
 */
export const EncounterHistory: React.FC<IEncounterHistoryProps> = ({
  campaignId,
  battles,
  onSelectBattle,
  onDrillDown,
}) => {
  /* ---- state ---- */
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedBattleId, setSelectedBattleId] = useState<string | null>(null);
  const [outcomeFilter, setOutcomeFilter] = useState<Record<string, string[]>>({});
  const [sortKey, setSortKey] = useState<SortKey>('duration');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [momentFilter, setMomentFilter] = useState<Record<string, string[]>>({});
  const [currentTurn, setCurrentTurn] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('campaign-average');
  const [comparisonBattleId, setComparisonBattleId] = useState<string | null>(null);
  const [expandedMissions, setExpandedMissions] = useState<Set<string>>(() => new Set());

  const turnRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  /* ---- derived data ---- */
  const selectedBattle = useMemo(
    () => battles.find(b => b.id === selectedBattleId) ?? null,
    [battles, selectedBattleId],
  );

  const maxTurn = useMemo(
    () => (selectedBattle ? getMaxTurn(selectedBattle) : 0),
    [selectedBattle],
  );

  const filteredAndSortedBattles = useMemo(() => {
    let filtered = [...battles];
    const activeOutcomes = outcomeFilter.outcome ?? [];
    if (activeOutcomes.length > 0) {
      filtered = filtered.filter(b => activeOutcomes.includes(b.outcome));
    }
    filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'duration': cmp = a.duration - b.duration; break;
        case 'kills': cmp = a.stats.totalKills - b.stats.totalKills; break;
        case 'damage': cmp = a.stats.totalDamage - b.stats.totalDamage; break;
      }
      return sortDirection === 'desc' ? -cmp : cmp;
    });
    return filtered;
  }, [battles, outcomeFilter, sortKey, sortDirection]);

  const filteredMissionGroups = useMemo(() => {
    const groups = new Map<string, { missionName: string; battles: IBattle[] }>();
    for (const battle of filteredAndSortedBattles) {
      if (!groups.has(battle.missionId)) {
        groups.set(battle.missionId, { missionName: battle.missionName, battles: [] });
      }
      groups.get(battle.missionId)!.battles.push(battle);
    }
    return groups;
  }, [filteredAndSortedBattles]);

  const filteredKeyMoments = useMemo(() => {
    if (!selectedBattle) return [];
    let moments = [...selectedBattle.keyMoments];
    const tiers = momentFilter.tier ?? [];
    if (tiers.length > 0) {
      moments = moments.filter(m => tiers.includes(m.tier));
    }
    const types = momentFilter.type ?? [];
    if (types.length > 0) {
      moments = moments.filter(m => types.includes(m.type));
    }
    return moments;
  }, [selectedBattle, momentFilter]);



  const campaignAverage = useMemo(() => computeCampaignAverage(battles), [battles]);

  const comparisonTarget = useMemo(() => {
    if (comparisonMode === 'campaign-average') return campaignAverage;
    const target = battles.find(b => b.id === comparisonBattleId);
    if (!target) return null;
    return {
      duration: target.duration,
      kills: target.stats.totalKills,
      damage: target.stats.totalDamage,
      unitsLost: target.stats.unitsLost,
    };
  }, [comparisonMode, campaignAverage, battles, comparisonBattleId]);

  const maxDamage = useMemo(() => {
    if (!selectedBattle) return 0;
    return Math.max(...selectedBattle.damageMatrix.cells.map(c => c.damage), 0);
  }, [selectedBattle]);

  /* ---- effects ---- */

  // Expand all missions when battles change
  useEffect(() => {
    setExpandedMissions(new Set(battles.map(b => b.missionId)));
  }, [battles]);

  // Reset turn state when selected battle changes
  useEffect(() => {
    if (selectedBattle) {
      setCurrentTurn(1);
      setIsPlaying(false);
    }
  }, [selectedBattle]);

  // VCR playback interval
  useEffect(() => {
    if (!isPlaying || maxTurn === 0) return;
    const ms = 1000 / speed;
    const id = setInterval(() => {
      setCurrentTurn(prev => {
        if (prev >= maxTurn) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, ms);
    return () => clearInterval(id);
  }, [isPlaying, speed, maxTurn]);

  // Auto-scroll to current turn during playback
  useEffect(() => {
    if (isPlaying) {
      const el = turnRefs.current.get(currentTurn);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentTurn, isPlaying]);

  /* ---- handlers ---- */

  const handleSelectBattle = useCallback(
    (battleId: string) => {
      setSelectedBattleId(battleId);
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

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (currentTurn >= maxTurn && maxTurn > 0) {
        setCurrentTurn(1);
      }
      setIsPlaying(true);
    }
  }, [isPlaying, currentTurn, maxTurn]);

  const handleStepForward = useCallback(() => {
    setIsPlaying(false);
    setCurrentTurn(prev => Math.min(prev + 1, Math.max(maxTurn, 1)));
  }, [maxTurn]);

  const handleStepBack = useCallback(() => {
    setIsPlaying(false);
    setCurrentTurn(prev => Math.max(prev - 1, 1));
  }, []);

  const handleSpeedChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSpeed(Number(e.target.value));
  }, []);

    const handleSortKeyChange = useCallback(
    (key: SortKey) => {
      if (key === sortKey) {
        const newDir = sortDirection === 'asc' ? 'desc' : 'asc';
        setSortDirection(newDir);
        announce(`Sorted by ${key}, ${newDir === 'asc' ? 'ascending' : 'descending'}`);
      } else {
        setSortKey(key);
        setSortDirection('asc');
        announce(`Sorted by ${key}, ascending`);
      }
    },
    [sortKey, sortDirection],
  );

  const toggleMission = useCallback((missionId: string) => {
    setExpandedMissions(prev => {
      const next = new Set(prev);
      if (next.has(missionId)) next.delete(missionId);
      else next.add(missionId);
      return next;
    });
  }, []);

  const handleKeyMomentClick = useCallback((moment: IKeyMoment) => {
    setCurrentTurn(moment.turn);
    setIsPlaying(false);
  }, []);

  const handleComparisonModeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setComparisonMode(e.target.value as ComparisonMode);
  }, []);

  const handleComparisonBattleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setComparisonBattleId(e.target.value || null);
  }, []);

  /* ---- render ---- */
  return (
    <div
      className="p-4 md:p-6 lg:p-8 min-h-screen bg-gray-50 dark:bg-gray-900"
      data-testid="encounter-history"
      data-campaign-id={campaignId}
    >
      <h1
        className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6"
        data-testid="encounter-history-title"
      >
        Encounter History
      </h1>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* ================================================================ */}
        {/*  Battle List Sidebar                                              */}
        {/* ================================================================ */}
        {isMobile && (
          <button
            type="button"
            onClick={() => setSidebarOpen((prev) => !prev)}
            className={`flex items-center justify-between w-full px-4 py-3 min-h-[44px] bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 lg:hidden ${FOCUS_RING_CLASSES}`}
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
              onFilterChange={setOutcomeFilter}
            />
          </div>

          {/* Sort controls */}
          <div
            className="flex items-center gap-1 mb-4 rounded-lg bg-gray-200 dark:bg-gray-700 p-1"
            role="group"
            aria-label="Sort battles by"
            data-testid="sort-controls"
          >
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.key}
                type="button"
                onClick={() => handleSortKeyChange(opt.key)}
                className={[
                  `px-3 py-2 min-h-[44px] md:py-1 md:min-h-0 text-sm rounded-md transition-colors flex items-center gap-1 ${FOCUS_RING_CLASSES}`,
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
                    aria-label={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                    data-testid="sort-direction-indicator"
                  >
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Battle list */}
          {filteredAndSortedBattles.length === 0 ? (
            <p
              className="text-gray-500 dark:text-gray-400 text-sm italic text-center py-8"
              data-testid="empty-battle-list"
            >
              No battles match the current filters.
            </p>
          ) : (
            <div className="space-y-3" data-testid="battle-list">
              {Array.from(filteredMissionGroups.entries()).map(([missionId, group]) => (
                <div
                  key={missionId}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                  data-testid={`mission-group-${missionId}`}
                >
                  <button
                    type="button"
                    onClick={() => toggleMission(missionId)}
                    className={`w-full flex items-center justify-between px-3 py-3 min-h-[44px] md:py-2 md:min-h-0 bg-gray-100 dark:bg-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-300 ${FOCUS_RING_CLASSES}`}
                    aria-expanded={expandedMissions.has(missionId)}
                    aria-label={`${group.missionName} mission group, ${group.battles.length} battle${group.battles.length !== 1 ? 's' : ''}`}
                    data-testid={`mission-group-header-${missionId}`}
                  >
                    <span>{group.missionName}</span>
                    <span className="text-gray-400 dark:text-gray-500" aria-hidden="true">
                      {expandedMissions.has(missionId) ? '▾' : '▸'}
                    </span>
                  </button>
                  {expandedMissions.has(missionId) && (
                    <div className="space-y-1 p-2">
                      {group.battles.map(battle => (
                        <button
                          key={battle.id}
                          type="button"
                          onClick={() => handleSelectBattle(battle.id)}
                          className={[
                            `w-full text-left p-3 rounded-md transition-colors border ${FOCUS_RING_CLASSES}`,
                            selectedBattleId === battle.id
                              ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800',
                          ].join(' ')}
                          aria-current={selectedBattleId === battle.id ? 'true' : undefined}
                          aria-label={`Battle on ${new Date(battle.timestamp).toLocaleDateString()}, ${battle.outcome}, ${battle.stats.totalKills} kills`}
                          data-testid={`battle-card-${battle.id}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(battle.timestamp).toLocaleDateString()}
                            </span>
                            <span
                              className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${OUTCOME_COLORS[battle.outcome]}`}
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
              ))}
            </div>
          )}
        </aside>

        {/* ================================================================ */}
        {/*  Battle Detail                                                    */}
        {/* ================================================================ */}
        <main
          className="w-full lg:w-[70%]"
          aria-label="Battle detail"
          data-testid="battle-detail"
        >
          {!selectedBattle ? (
            <div
              className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400 text-lg"
              data-testid="no-battle-selected"
            >
              Select a battle to view details
            </div>
          ) : (
            <div className="space-y-6">
              {/* ── Forces ────────────────────────────────────────────── */}
              <section aria-label="Forces" data-testid="forces-section">
                <h2
                  className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3"
                  data-testid="section-heading"
                >
                  Forces
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div
                    className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                    data-testid="player-force"
                  >
                    <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2 uppercase tracking-wide">
                      Player Force
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2" data-testid="player-bv">
                      BV: {selectedBattle.forces.player.totalBV.toLocaleString()}
                    </p>
                    <ul className="space-y-1">
                      {selectedBattle.forces.player.units.map(unit => (
                        <li
                          key={unit.id}
                          className="flex items-center justify-between text-sm"
                          data-testid={`unit-${unit.id}`}
                        >
                          <span className="text-gray-800 dark:text-gray-200">
                            {unit.name}
                            <span className="text-gray-500 dark:text-gray-400 ml-1 text-xs">
                              ({unit.pilot})
                            </span>
                          </span>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_COLORS[unit.status]}`}
                            data-testid={`unit-status-badge-${unit.id}`}
                          >
                            {unit.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div
                    className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                    data-testid="enemy-force"
                  >
                    <h3 className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2 uppercase tracking-wide">
                      Enemy Force
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2" data-testid="enemy-bv">
                      BV: {selectedBattle.forces.enemy.totalBV.toLocaleString()}
                    </p>
                    <ul className="space-y-1">
                      {selectedBattle.forces.enemy.units.map(unit => (
                        <li
                          key={unit.id}
                          className="flex items-center justify-between text-sm"
                          data-testid={`unit-${unit.id}`}
                        >
                          <span className="text-gray-800 dark:text-gray-200">
                            {unit.name}
                            <span className="text-gray-500 dark:text-gray-400 ml-1 text-xs">
                              ({unit.pilot})
                            </span>
                          </span>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded ${STATUS_COLORS[unit.status]}`}
                            data-testid={`unit-status-badge-${unit.id}`}
                          >
                            {unit.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div
                  className={`mt-3 p-3 rounded-lg text-center font-semibold ${OUTCOME_COLORS[selectedBattle.outcome]}`}
                  data-testid="outcome-summary"
                >
                  {selectedBattle.outcome === 'victory' && '🏆 Victory'}
                  {selectedBattle.outcome === 'defeat' && '💀 Defeat'}
                  {selectedBattle.outcome === 'draw' && '🤝 Draw'}
                  <span className="ml-3 text-sm font-normal">
                    {selectedBattle.stats.totalKills} kills · {selectedBattle.stats.totalDamage} damage · {selectedBattle.stats.unitsLost} lost
                  </span>
                </div>
              </section>

              {/* ── Damage Matrix ─────────────────────────────────────── */}
              <section aria-label="Damage matrix" data-testid="damage-matrix-section">
                <h2
                  className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3"
                  data-testid="section-heading"
                >
                  Damage Matrix
                </h2>
                {selectedBattle.damageMatrix.cells.length === 0 ? (
                  <p
                    className="text-gray-500 dark:text-gray-400 text-sm italic"
                    data-testid="empty-damage-matrix"
                  >
                    No damage exchanges recorded.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table
                      className="border-collapse bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                      data-testid="damage-matrix"
                    >
                      <thead>
                        <tr>
                          <th className="p-2 text-xs text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                            Attacker ↓ / Target →
                          </th>
                          {selectedBattle.damageMatrix.targets.map(targetId => (
                            <th
                              key={targetId}
                              className="p-2 text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                            >
                              {resolveUnitName(selectedBattle, targetId)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedBattle.damageMatrix.attackers.map(attackerId => (
                          <tr key={attackerId}>
                            <td className="p-2 text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                              {resolveUnitName(selectedBattle, attackerId)}
                            </td>
                            {selectedBattle.damageMatrix.targets.map(targetId => {
                              const cell = selectedBattle.damageMatrix.cells.find(
                                c => c.attackerId === attackerId && c.targetId === targetId,
                              );
                              const damage = cell?.damage ?? 0;
                              return (
                                <td
                                  key={`${attackerId}-${targetId}`}
                                  className={`p-2 text-center text-xs font-mono border border-gray-200 dark:border-gray-700 cursor-pointer hover:ring-2 hover:ring-blue-400 ${FOCUS_RING_CLASSES} ${getDamageIntensityClass(damage, maxDamage)}`}
                                  title={`${damage} damage`}
                                  aria-label={`${resolveUnitName(selectedBattle, attackerId)} dealt ${damage} damage to ${resolveUnitName(selectedBattle, targetId)}`}
                                  onClick={() =>
                                    handleDrillDown('encounter-history', {
                                      attackerId,
                                      targetId,
                                      battleId: selectedBattle.id,
                                    })
                                  }
                                  data-testid={`damage-cell-${attackerId}-${targetId}`}
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      handleDrillDown('encounter-history', {
                                        attackerId,
                                        targetId,
                                        battleId: selectedBattle.id,
                                      });
                                    }
                                  }}
                                >
                                  {damage}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* ── Key Moments Timeline ──────────────────────────────── */}
              <section aria-label="Key moments" data-testid="key-moments-section">
                <h2
                  className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3"
                  data-testid="section-heading"
                >
                  Key Moments
                </h2>
                <div data-testid="key-moments-filter" className="mb-3">
                  <FilterPanel
                    filters={[TIER_FILTER_DEF, TYPE_FILTER_DEF]}
                    activeFilters={momentFilter}
                    onFilterChange={setMomentFilter}
                  />
                </div>
                {filteredKeyMoments.length === 0 ? (
                  <p
                    className="text-gray-500 dark:text-gray-400 text-sm italic"
                    data-testid="empty-key-moments"
                  >
                    No key moments match the current filters.
                  </p>
                ) : (
                  <div
                    className="flex gap-3 overflow-x-auto pb-2"
                    data-testid="key-moments-timeline"
                  >
                    {filteredKeyMoments.map(moment => (
                      <button
                        key={moment.id}
                        type="button"
                        onClick={() => handleKeyMomentClick(moment)}
                        className={`flex-shrink-0 w-44 md:w-48 p-3 min-h-[44px] rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow text-left ${FOCUS_RING_CLASSES}`}
                        aria-label={`${moment.tier} moment: ${moment.description}, turn ${moment.turn}`}
                        data-testid={`key-moment-${moment.id}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${TIER_COLORS[moment.tier]}`}
                            data-testid={`key-moment-tier-badge-${moment.id}`}
                          >
                            {moment.tier}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Turn {moment.turn}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800 dark:text-gray-200">
                          {moment.description}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {moment.phase} · {moment.type}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              {/* ── Event Timeline with VCR ───────────────────────────── */}
              <section aria-label="Event timeline" data-testid="event-timeline-section">
                <h2
                  className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3"
                  data-testid="section-heading"
                >
                  Event Timeline
                </h2>
                <div
                  className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                  data-testid="vcr-controls"
                >
                  <button
                    type="button"
                    onClick={handleStepBack}
                    disabled={currentTurn <= 1}
                    className={`px-3 py-2 min-h-[44px] md:py-1 md:min-h-0 text-sm rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed ${FOCUS_RING_CLASSES}`}
                    aria-label="Step back"
                    data-testid="vcr-step-back"
                  >
                    ⏮ Back
                  </button>
                  <button
                    type="button"
                    onClick={handlePlayPause}
                    disabled={maxTurn === 0}
                    className={`px-4 py-2 min-h-[44px] md:py-1 md:min-h-0 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium ${FOCUS_RING_CLASSES}`}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    data-testid="vcr-play-pause"
                  >
                    {isPlaying ? '⏸ Pause' : '▶ Play'}
                  </button>
                  <button
                    type="button"
                    onClick={handleStepForward}
                    disabled={currentTurn >= maxTurn}
                    className={`px-3 py-2 min-h-[44px] md:py-1 md:min-h-0 text-sm rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed ${FOCUS_RING_CLASSES}`}
                    aria-label="Step forward"
                    data-testid="vcr-step-forward"
                  >
                    Next ⏭
                  </button>
                  <select
                    value={speed}
                    onChange={handleSpeedChange}
                    className={`px-2 py-2 min-h-[44px] md:py-1 md:min-h-0 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 ${FOCUS_RING_CLASSES}`}
                    aria-label="Playback speed"
                    data-testid="vcr-speed-select"
                  >
                    <option value={1}>1x</option>
                    <option value={2}>2x</option>
                    <option value={4}>4x</option>
                  </select>
                  <span
                    className="text-sm text-gray-600 dark:text-gray-400 ml-auto"
                    aria-live="polite"
                    aria-atomic="true"
                    data-testid="vcr-turn-display"
                  >
                    Turn {currentTurn} / {maxTurn}
                  </span>
                </div>

                {selectedBattle.events.length === 0 ? (
                  <p
                    className="text-gray-500 dark:text-gray-400 text-sm italic"
                    data-testid="empty-events"
                  >
                    No events recorded.
                  </p>
                ) : (
                  <div data-testid="event-list">
                    <VirtualizedTimeline
                      events={selectedBattle.events}
                      height={384}
                      itemHeight={52}
                      onEventClick={(event) => {
                        setCurrentTurn(event.turn);
                        setIsPlaying(false);
                      }}
                      resolveUnitName={(unitId) => resolveUnitName(selectedBattle, unitId)}
                    />
                  </div>
                )}
              </section>

              {/* ── Comparison View ───────────────────────────────────── */}
              <section aria-label="Comparison view" data-testid="comparison-section">
                <h2
                  className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3"
                  data-testid="section-heading"
                >
                  Comparison
                </h2>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <select
                    value={comparisonMode}
                    onChange={handleComparisonModeChange}
                    className={`px-3 py-2 min-h-[44px] md:py-1.5 md:min-h-0 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 ${FOCUS_RING_CLASSES}`}
                    aria-label="Comparison mode"
                    data-testid="comparison-mode-toggle"
                  >
                    <option value="campaign-average">vs Campaign Average</option>
                    <option value="specific-battle">vs Specific Battle</option>
                  </select>
                  {comparisonMode === 'specific-battle' && (
                    <select
                      value={comparisonBattleId ?? ''}
                      onChange={handleComparisonBattleChange}
                      className={`px-3 py-2 min-h-[44px] md:py-1.5 md:min-h-0 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 ${FOCUS_RING_CLASSES}`}
                      aria-label="Select battle for comparison"
                      data-testid="comparison-battle-select"
                    >
                      <option value="">Select a battle</option>
                      {battles
                        .filter(b => b.id !== selectedBattleId)
                        .map(b => (
                          <option key={b.id} value={b.id}>
                            {b.missionName} — {new Date(b.timestamp).toLocaleDateString()}
                          </option>
                        ))}
                    </select>
                  )}
                </div>

                {comparisonTarget ? (
                  <div
                    className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 space-y-4"
                    data-testid="comparison-metrics"
                  >
                    {([
                      {
                        key: 'duration',
                        label: 'Duration',
                        current: selectedBattle.duration,
                        baseline: comparisonTarget.duration,
                        fmt: (v: number) => formatDuration(Math.round(v)),
                      },
                      {
                        key: 'kills',
                        label: 'Kills',
                        current: selectedBattle.stats.totalKills,
                        baseline: comparisonTarget.kills,
                        fmt: (v: number) => String(v),
                      },
                      {
                        key: 'damage',
                        label: 'Damage',
                        current: selectedBattle.stats.totalDamage,
                        baseline: comparisonTarget.damage,
                        fmt: (v: number) => String(v),
                      },
                      {
                        key: 'unitsLost',
                        label: 'Units Lost',
                        current: selectedBattle.stats.unitsLost,
                        baseline: comparisonTarget.unitsLost,
                        fmt: (v: number) => String(v),
                      },
                    ] as const).map(metric => {
                      const maxVal = Math.max(metric.current, metric.baseline, 1);
                      const currentFilled = Math.round(
                        (metric.current / maxVal) * BAR_SEGMENTS,
                      );
                      const baselineFilled = Math.round(
                        (metric.baseline / maxVal) * BAR_SEGMENTS,
                      );
                      return (
                        <div key={metric.key} data-testid={`comparison-metric-${metric.key}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {metric.label}
                            </span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {metric.fmt(metric.current)} vs {metric.fmt(metric.baseline)}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-blue-600 dark:text-blue-400 w-16">
                                Current
                              </span>
                              <div
                                className="flex gap-0.5"
                                data-testid={`comparison-bar-current-${metric.key}`}
                              >
                                {Array.from({ length: BAR_SEGMENTS }, (_, i) => (
                                  <div
                                    key={i}
                                    className={`h-3 w-1.5 rounded-sm ${
                                      i < currentFilled
                                        ? 'bg-blue-500 dark:bg-blue-400'
                                        : 'bg-gray-200 dark:bg-gray-700'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-emerald-600 dark:text-emerald-400 w-16">
                                Baseline
                              </span>
                              <div
                                className="flex gap-0.5"
                                data-testid={`comparison-bar-baseline-${metric.key}`}
                              >
                                {Array.from({ length: BAR_SEGMENTS }, (_, i) => (
                                  <div
                                    key={i}
                                    className={`h-3 w-1.5 rounded-sm ${
                                      i < baselineFilled
                                        ? 'bg-emerald-500 dark:bg-emerald-400'
                                        : 'bg-gray-200 dark:bg-gray-700'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <DrillDownLink
                        label="View Detailed Comparison"
                        targetTab="analysis-bugs"
                        filter={{
                          battleId: selectedBattle.id,
                          comparisonMode,
                          comparisonBattleId,
                        }}
                        icon="arrow-right"
                        onClick={handleDrillDown}
                      />
                    </div>
                  </div>
                ) : (
                  <p
                    className="text-gray-500 dark:text-gray-400 text-sm italic"
                    data-testid="no-comparison-target"
                  >
                    Select a battle to compare against.
                  </p>
                )}
              </section>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default EncounterHistory;
