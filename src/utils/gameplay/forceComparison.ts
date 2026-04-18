/**
 * Force Comparison — Pre-Battle Delta Computation
 *
 * Pure helpers that diff two `IForceSummary` values into an
 * `IForceComparison` with signed deltas, BV ratio, and per-metric
 * severity tiers. The pre-battle force comparison panel renders this
 * structure directly — utility functions like
 * `getHighestSeverityHint` and `formatDelta` keep the component thin.
 *
 * @spec openspec/changes/add-pre-battle-force-comparison/specs/after-combat-report/spec.md
 */

import type { IForceSummary } from './forceSummary';

// =============================================================================
// Public Types
// =============================================================================

/** Severity tier driving the panel's visual accent and decision hint. */
export type DeltaSeverity = 'low' | 'moderate' | 'high';

/** Single delta entry — signed value plus computed severity. */
export interface IForceDelta {
  readonly value: number;
  readonly severity: DeltaSeverity;
}

/**
 * Stable union of metric ids used by the comparison. Indexing the
 * `deltas` map by a literal type lets the component iterate without
 * stringly-typed lookups.
 */
export type ForceComparisonMetric =
  | 'totalBV'
  | 'totalTonnage'
  | 'heatDissipation'
  | 'avgGunnery'
  | 'avgPiloting'
  | 'weaponDamagePerTurnPotential';

/**
 * Aggregated comparison wrapping both summaries with computed deltas
 * and BV ratio. `deltas` is keyed by `ForceComparisonMetric` so the
 * panel can render rows in a stable order.
 */
export interface IForceComparison {
  readonly player: IForceSummary;
  readonly opponent: IForceSummary;
  readonly deltas: Readonly<Record<ForceComparisonMetric, IForceDelta>>;
  /**
   * `max(player.totalBV, opponent.totalBV) /
   *  min(player.totalBV, opponent.totalBV)`. Defaults to 1 when either
   * side has zero BV (avoids divide-by-zero, panel reads as "no
   * imbalance" until both sides are configured).
   */
  readonly bvRatio: number;
}

// =============================================================================
// Severity Thresholds (per spec § 3.4)
// =============================================================================

const BV_RATIO_HIGH = 1.25;
const BV_RATIO_MODERATE = 1.1;

const TONNAGE_PCT_HIGH = 0.2;
const TONNAGE_PCT_MODERATE = 0.1;

const SKILL_DELTA_HIGH = 1.0;
const SKILL_DELTA_MODERATE = 0.5;

const DPT_PCT_HIGH = 0.25;
const DPT_PCT_MODERATE = 0.15;

const HEAT_PCT_HIGH = 0.3;
const HEAT_PCT_MODERATE = 0.15;

// =============================================================================
// Severity Helpers
// =============================================================================

/**
 * BV severity — driven by the ratio (max / min) so a 25% advantage
 * lands on `high` regardless of which side leads.
 */
function bvSeverity(bvRatio: number): DeltaSeverity {
  if (bvRatio > BV_RATIO_HIGH) return 'high';
  if (bvRatio >= BV_RATIO_MODERATE) return 'moderate';
  return 'low';
}

/**
 * Generic percentage-of-max severity helper used by tonnage / DPT /
 * heat metrics. Returns `low` when both sides are zero (avoids
 * divide-by-zero NaN).
 */
function pctSeverity(
  delta: number,
  player: number,
  opponent: number,
  highThreshold: number,
  moderateThreshold: number,
): DeltaSeverity {
  const max = Math.max(Math.abs(player), Math.abs(opponent));
  if (max === 0) return 'low';
  const pct = Math.abs(delta) / max;
  if (pct > highThreshold) return 'high';
  if (pct > moderateThreshold) return 'moderate';
  return 'low';
}

/**
 * Skill severity — pilot skill deltas use absolute thresholds (1.0 →
 * high, 0.5 → moderate). Lower skill values are better in BattleTech,
 * but severity is computed on the absolute delta because the panel
 * decides which side has the advantage separately.
 */
function skillSeverity(delta: number): DeltaSeverity {
  const abs = Math.abs(delta);
  if (abs >= SKILL_DELTA_HIGH) return 'high';
  if (abs >= SKILL_DELTA_MODERATE) return 'moderate';
  return 'low';
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Diff two force summaries. Returns a fully-populated comparison —
 * even when one or both forces are empty, every metric has a delta
 * (zero-valued, low severity).
 *
 * Convention: `deltas[*].value = player − opponent`. For pilot skill
 * (gunnery / piloting) lower is better, so a negative value means the
 * player has the skill advantage. The panel inverts the rendered
 * "advantage" label for these two metrics — see `isPlayerAdvantage`.
 */
export function compareForces(
  player: IForceSummary,
  opponent: IForceSummary,
): IForceComparison {
  const bvDelta = player.totalBV - opponent.totalBV;
  const bvMax = Math.max(player.totalBV, opponent.totalBV);
  const bvMin = Math.min(player.totalBV, opponent.totalBV);
  const bvRatio = bvMin > 0 ? bvMax / bvMin : 1;

  const tonnageDelta = player.totalTonnage - opponent.totalTonnage;
  const heatDelta = player.heatDissipation - opponent.heatDissipation;
  const gunneryDelta = player.avgGunnery - opponent.avgGunnery;
  const pilotingDelta = player.avgPiloting - opponent.avgPiloting;
  const dptDelta =
    player.weaponDamagePerTurnPotential - opponent.weaponDamagePerTurnPotential;

  const deltas: Record<ForceComparisonMetric, IForceDelta> = {
    totalBV: { value: bvDelta, severity: bvSeverity(bvRatio) },
    totalTonnage: {
      value: tonnageDelta,
      severity: pctSeverity(
        tonnageDelta,
        player.totalTonnage,
        opponent.totalTonnage,
        TONNAGE_PCT_HIGH,
        TONNAGE_PCT_MODERATE,
      ),
    },
    heatDissipation: {
      value: heatDelta,
      severity: pctSeverity(
        heatDelta,
        player.heatDissipation,
        opponent.heatDissipation,
        HEAT_PCT_HIGH,
        HEAT_PCT_MODERATE,
      ),
    },
    avgGunnery: {
      value: gunneryDelta,
      severity: skillSeverity(gunneryDelta),
    },
    avgPiloting: {
      value: pilotingDelta,
      severity: skillSeverity(pilotingDelta),
    },
    weaponDamagePerTurnPotential: {
      value: dptDelta,
      severity: pctSeverity(
        dptDelta,
        player.weaponDamagePerTurnPotential,
        opponent.weaponDamagePerTurnPotential,
        DPT_PCT_HIGH,
        DPT_PCT_MODERATE,
      ),
    },
  };

  return { player, opponent, deltas, bvRatio };
}

// =============================================================================
// Render Helpers
// =============================================================================

/**
 * For each metric, "player advantage" means a different sign:
 * - BV / Tonnage / Heat / DPT: positive delta favors the player
 * - Gunnery / Piloting: negative delta favors the player (lower is better)
 *
 * Returns `null` for a zero delta so the panel can show a neutral
 * label.
 */
export function isPlayerAdvantage(
  metric: ForceComparisonMetric,
  delta: number,
): boolean | null {
  if (delta === 0) return null;
  if (metric === 'avgGunnery' || metric === 'avgPiloting') {
    return delta < 0;
  }
  return delta > 0;
}

/**
 * Format a delta value with appropriate sign + unit suffix for the
 * panel badge. Handles negative numbers, integer / decimal styles, and
 * the BV-specific shorthand. Examples:
 *   - `formatDelta('totalBV', 325)`     → `"+325 BV"`
 *   - `formatDelta('totalTonnage', -4.2)` → `"−4.2 tons"`
 *   - `formatDelta('avgGunnery', 0.5)`  → `"+0.5"`
 */
export function formatDelta(
  metric: ForceComparisonMetric,
  value: number,
): string {
  // Use the en-dash minus character so it's visually distinguishable
  // from a hyphen — matches the spec example `"−4.2 tons"`.
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  const abs = Math.abs(value);
  switch (metric) {
    case 'totalBV':
      return `${sign}${Math.round(abs).toLocaleString()} BV`;
    case 'totalTonnage':
      return `${sign}${formatNumber(abs)} tons`;
    case 'heatDissipation':
      return `${sign}${formatNumber(abs)} heat`;
    case 'weaponDamagePerTurnPotential':
      return `${sign}${formatNumber(abs)} DPT`;
    case 'avgGunnery':
    case 'avgPiloting':
      return `${sign}${abs.toFixed(1)}`;
    default:
      return `${sign}${formatNumber(abs)}`;
  }
}

/**
 * Compact number formatter — integer when whole, single-decimal
 * otherwise. Avoids `4.0` when `4` would suffice.
 */
function formatNumber(n: number): string {
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(1);
}

/**
 * Decision hint generator (spec § 8.1). Returns a one-liner derived
 * from the highest-severity delta. Never recommends swaps — neutral
 * descriptive text only.
 */
export function getDecisionHint(comparison: IForceComparison): string {
  // Find the metric with the worst (most extreme) severity. Tie-break
  // by checking BV first since it's the headline number.
  const order: ForceComparisonMetric[] = [
    'totalBV',
    'avgGunnery',
    'avgPiloting',
    'weaponDamagePerTurnPotential',
    'totalTonnage',
    'heatDissipation',
  ];
  const severityRank: Record<DeltaSeverity, number> = {
    low: 0,
    moderate: 1,
    high: 2,
  };

  let topMetric: ForceComparisonMetric | null = null;
  let topRank = -1;
  for (const metric of order) {
    const delta = comparison.deltas[metric];
    const rank = severityRank[delta.severity];
    if (rank > topRank) {
      topRank = rank;
      topMetric = metric;
    }
  }

  if (!topMetric || topRank <= 0) {
    return 'Forces look evenly matched';
  }

  const delta = comparison.deltas[topMetric];
  const playerAdv = isPlayerAdvantage(topMetric, delta.value);
  const advLabel =
    playerAdv === null ? '' : playerAdv ? 'Player has' : 'Opponent has';

  switch (topMetric) {
    case 'totalBV': {
      // Use the BV ratio for a percentage hint — easier to read than
      // "+1234 BV".
      const pct = Math.round((comparison.bvRatio - 1) * 100);
      return `${advLabel} a ${pct}% BV advantage`;
    }
    case 'avgGunnery':
      return `${advLabel} the gunnery edge (avg ${Math.abs(delta.value).toFixed(1)} better)`;
    case 'avgPiloting':
      return `${advLabel} the piloting edge (avg ${Math.abs(delta.value).toFixed(1)} better)`;
    case 'weaponDamagePerTurnPotential':
      return `${advLabel} more damage potential per turn`;
    case 'totalTonnage':
      return `${advLabel} a tonnage advantage`;
    case 'heatDissipation':
      return `${advLabel} better heat management`;
    default:
      return 'Forces look evenly matched';
  }
}

/**
 * Returns the highest severity present anywhere in the comparison.
 * Used by the panel header to decide whether to show a warning icon.
 */
export function getHighestSeverity(
  comparison: IForceComparison,
): DeltaSeverity {
  const severityRank: Record<DeltaSeverity, number> = {
    low: 0,
    moderate: 1,
    high: 2,
  };
  let top: DeltaSeverity = 'low';
  let topRank = 0;
  for (const key of Object.keys(comparison.deltas) as ForceComparisonMetric[]) {
    const rank = severityRank[comparison.deltas[key].severity];
    if (rank > topRank) {
      topRank = rank;
      top = comparison.deltas[key].severity;
    }
  }
  return top;
}

// =============================================================================
// Metric Display Order
// =============================================================================

/**
 * Canonical metric order for table rendering. Matches the spec's
 * "Total BV, Total Tonnage, Heat Dissipation, Avg Gunnery, Avg
 * Piloting, Weapon DPT Potential" sequence (task 4.3).
 */
export const FORCE_COMPARISON_METRIC_ORDER: readonly ForceComparisonMetric[] = [
  'totalBV',
  'totalTonnage',
  'heatDissipation',
  'avgGunnery',
  'avgPiloting',
  'weaponDamagePerTurnPotential',
];

/** Human-readable label per metric for the table's first column. */
export const FORCE_COMPARISON_METRIC_LABEL: Readonly<
  Record<ForceComparisonMetric, string>
> = {
  totalBV: 'Total BV',
  totalTonnage: 'Total Tonnage',
  heatDissipation: 'Heat Dissipation',
  avgGunnery: 'Avg Gunnery',
  avgPiloting: 'Avg Piloting',
  weaponDamagePerTurnPotential: 'Weapon DPT Potential',
};

/**
 * Format the raw value of a metric for display in the side columns
 * (not the delta — see `formatDelta` for that).
 */
export function formatMetricValue(
  metric: ForceComparisonMetric,
  value: number,
): string {
  switch (metric) {
    case 'totalBV':
      return Math.round(value).toLocaleString();
    case 'totalTonnage':
      return `${formatNumber(value)} t`;
    case 'heatDissipation':
      return `${formatNumber(value)}`;
    case 'weaponDamagePerTurnPotential':
      return `${formatNumber(value)}`;
    case 'avgGunnery':
    case 'avgPiloting':
      return value === 0 ? '—' : value.toFixed(1);
    default:
      return formatNumber(value);
  }
}
