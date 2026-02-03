/**
 * Aggregated metrics for campaign dashboard display.
 * Pre-computed to avoid expensive calculations on every render.
 *
 * @example
 * const metrics: ICampaignDashboardMetrics = {
 *   roster: { active: 8, wounded: 3, kia: 1, total: 12 },
 *   force: { operational: 10, damaged: 2, destroyed: 1, totalBV: 15000, damagedBV: 2500 },
 *   financialTrend: [
 *     { date: '2026-01-26', balance: 1000000, income: 50000, expenses: 30000 }
 *   ],
 *   progression: {
 *     missionsCompleted: 5,
 *     missionsTotal: 10,
 *     winRate: 0.8,
 *     totalXP: 1500,
 *     averageXPPerMission: 300
 *   },
 *   topPerformers: [
 *     {
 *       personId: 'person-001',
 *       name: 'Natasha Kerensky',
 *       rank: 'Captain',
 *       kills: 12,
 *       xp: 500,
 *       survivalRate: 1.0,
 *       missionsCompleted: 5
 *     }
 *   ],
 *   warnings: { lowFunds: false, manyWounded: true, lowBV: false }
 * };
 */
export interface ICampaignDashboardMetrics {
  readonly roster: {
    readonly active: number;
    readonly wounded: number;
    readonly kia: number;
    readonly total: number;
  };
  readonly force: {
    readonly operational: number;
    readonly damaged: number;
    readonly destroyed: number;
    readonly totalBV: number;
    readonly damagedBV: number;
  };
  readonly financialTrend: IFinancialDataPoint[];
  readonly progression: {
    readonly missionsCompleted: number;
    readonly missionsTotal: number;
    readonly winRate: number;
    readonly totalXP: number;
    readonly averageXPPerMission: number;
  };
  readonly topPerformers: IPerformerSummary[];
  readonly warnings: {
    readonly lowFunds: boolean;
    readonly manyWounded: boolean;
    readonly lowBV: boolean;
  };
}

/**
 * Single data point in financial trend chart.
 *
 * @example
 * const dataPoint: IFinancialDataPoint = {
 *   date: '2026-01-26',
 *   balance: 1000000,
 *   income: 50000,
 *   expenses: 30000
 * };
 */
export interface IFinancialDataPoint {
  readonly date: string;
  readonly balance: number;
  readonly income: number;
  readonly expenses: number;
}

/**
 * Summary of a top performer for dashboard display.
 *
 * @example
 * const performer: IPerformerSummary = {
 *   personId: 'person-001',
 *   name: 'Natasha Kerensky',
 *   rank: 'Captain',
 *   kills: 12,
 *   xp: 500,
 *   survivalRate: 1.0,
 *   missionsCompleted: 5
 * };
 */
export interface IPerformerSummary {
  readonly personId: string;
  readonly name: string;
  readonly rank: string;
  readonly kills: number;
  readonly xp: number;
  readonly survivalRate: number;
  readonly missionsCompleted: number;
}
