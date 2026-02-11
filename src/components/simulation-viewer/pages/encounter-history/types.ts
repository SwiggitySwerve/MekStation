import type { IFilterDefinition } from '@/components/simulation-viewer/types';

/* ========================================================================== */
/*  Public Types (re-exported from barrel)                                     */
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
  readonly onDrillDown?: (
    target: string,
    context: Record<string, unknown>,
  ) => void;
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
  readonly type:
    | 'kill'
    | 'cripple'
    | 'headshot'
    | 'ammo-explosion'
    | 'shutdown'
    | 'fall';
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

export type SortKey = 'duration' | 'kills' | 'damage';
export type SortDirection = 'asc' | 'desc';
export type ComparisonMode = 'campaign-average' | 'specific-battle';

/* ========================================================================== */
/*  Constants                                                                  */
/* ========================================================================== */

export const OUTCOME_COLORS: Record<IBattle['outcome'], string> = {
  victory:
    'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-200',
  defeat: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200',
  draw: 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200',
};

export const TIER_COLORS: Record<IKeyMoment['tier'], string> = {
  critical: 'bg-red-600 text-white',
  major: 'bg-amber-500 text-white',
  minor: 'bg-blue-500 text-white',
};

export const STATUS_COLORS: Record<string, string> = {
  operational:
    'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  damaged:
    'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  destroyed: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
};

export const OUTCOME_FILTER_DEF: IFilterDefinition = {
  id: 'outcome',
  label: 'Outcome',
  options: ['victory', 'defeat', 'draw'],
  optionLabels: { victory: 'Victory', defeat: 'Defeat', draw: 'Draw' },
};

export const TIER_FILTER_DEF: IFilterDefinition = {
  id: 'tier',
  label: 'Tier',
  options: ['critical', 'major', 'minor'],
  optionLabels: { critical: 'Critical', major: 'Major', minor: 'Minor' },
};

export const TYPE_FILTER_DEF: IFilterDefinition = {
  id: 'type',
  label: 'Type',
  options: [
    'kill',
    'cripple',
    'headshot',
    'ammo-explosion',
    'shutdown',
    'fall',
  ],
  optionLabels: {
    kill: 'Kill',
    cripple: 'Cripple',
    headshot: 'Headshot',
    'ammo-explosion': 'Ammo Explosion',
    shutdown: 'Shutdown',
    fall: 'Fall',
  },
};

export const SORT_OPTIONS: ReadonlyArray<{ key: SortKey; label: string }> = [
  { key: 'duration', label: 'Duration' },
  { key: 'kills', label: 'Kills' },
  { key: 'damage', label: 'Damage' },
];

export const BAR_SEGMENTS = 20;

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
export function getMaxTurn(battle: IBattle): number {
  if (battle.events.length === 0) return 0;
  return Math.max(...battle.events.map((e) => e.turn));
}

/** Tailwind class for damage cell heat-map intensity. */
export function getDamageIntensityClass(
  damage: number,
  maxDamage: number,
): string {
  if (damage === 0 || maxDamage === 0) return 'bg-gray-50 dark:bg-gray-800';
  const ratio = damage / maxDamage;
  if (ratio < 0.25) return 'bg-red-100 dark:bg-red-900/30';
  if (ratio < 0.5) return 'bg-red-200 dark:bg-red-800/40';
  if (ratio < 0.75) return 'bg-red-400 dark:bg-red-700/50';
  return 'bg-red-600 dark:bg-red-500/70 text-white';
}

/** Resolve a unit ID to its display name from the battle's forces. */
export function resolveUnitName(battle: IBattle, unitId: string): string {
  const allUnits = [
    ...battle.forces.player.units,
    ...battle.forces.enemy.units,
  ];
  return allUnits.find((u) => u.id === unitId)?.name ?? unitId;
}

/** Compute average metrics across all battles in the campaign. */
export function computeCampaignAverage(battles: IBattle[]): {
  duration: number;
  kills: number;
  damage: number;
  unitsLost: number;
} {
  if (battles.length === 0)
    return { duration: 0, kills: 0, damage: 0, unitsLost: 0 };
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
