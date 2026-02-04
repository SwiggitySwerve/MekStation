/**
 * Configuration for campaign dashboard display.
 * Controls which metrics are shown and how they are calculated.
 *
 * @example
 * const config: IDashboardConfig = {
 *   financialTrendDays: 30,
 *   atRiskThresholds: {
 *     lowFundsAmount: 100000,
 *     woundedPercent: 0.2,
 *     lowBVPercent: 0.3
 *   },
 *   topPerformers: {
 *     count: 5,
 *     sortBy: 'kills'
 *   }
 * };
 */
export interface IDashboardConfig {
  readonly financialTrendDays: number;
  readonly atRiskThresholds: {
    readonly lowFundsAmount: number;
    readonly woundedPercent: number;
    readonly lowBVPercent: number;
  };
  readonly topPerformers: {
    readonly count: number;
    readonly sortBy: 'kills' | 'xp' | 'survival-rate';
  };
}
