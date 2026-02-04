/**
 * Comparison data for a battle vs baseline (campaign average or specific battle).
 * Includes current metrics, baseline metrics, and computed delta.
 *
 * @example
 * const comparison: IBattleComparisonData = {
 *   current: { turns: 15, kills: 3, totalDamage: 2500, averageDamagePerTurn: 166.67, duration: 45000, bvDestroyed: 5000 },
 *   baseline: { turns: 12, kills: 2, totalDamage: 2000, averageDamagePerTurn: 166.67, duration: 36000, bvDestroyed: 4000 },
 *   delta: { turns: 3, kills: 1, totalDamage: 500, averageDamagePerTurn: 0, duration: 9000, bvDestroyed: 1000 },
 *   baselineType: 'campaign-average'
 * };
 */
export interface IBattleComparisonData {
  readonly current: IBattleMetrics;
  readonly baseline: IBattleMetrics;
  readonly delta: IBattleMetrics;
  readonly baselineType: 'campaign-average' | 'specific-battle';
  readonly comparisonBattleId?: string;
}

/**
 * Metrics for a single battle (used in comparisons).
 *
 * @example
 * const metrics: IBattleMetrics = {
 *   turns: 15,
 *   kills: 3,
 *   totalDamage: 2500,
 *   averageDamagePerTurn: 166.67,
 *   duration: 45000,
 *   bvDestroyed: 5000
 * };
 */
export interface IBattleMetrics {
  readonly turns: number;
  readonly kills: number;
  readonly totalDamage: number;
  readonly averageDamagePerTurn: number;
  readonly duration: number;
  readonly bvDestroyed: number;
}
