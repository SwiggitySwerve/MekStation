/**
 * Financial summary interface for campaign finances
 * Aggregates key financial metrics for a campaign
 */

import { Money } from './Money';

/**
 * Financial summary interface
 * Provides aggregated financial metrics including income, expenses, and loan payments
 */
export interface IFinancialSummary {
  /** Total income from all sources */
  readonly totalIncome: Money;

  /** Total expenses from all sources */
  readonly totalExpenses: Money;

  /** Net profit (income minus expenses) */
  readonly netProfit: Money;

  /** Total salary payments */
  readonly salaryTotal: Money;

  /** Total maintenance costs */
  readonly maintenanceTotal: Money;

  /** Total loan payments made */
  readonly loanPaymentTotal: Money;

  /** Total taxes paid */
  readonly taxesPaid: Money;

  /** Current cash balance */
  readonly balance: Money;
}
