/**
 * IFinances interface for campaign finances
 * Represents the financial state of a campaign
 */

import { Money } from './Money';
import { Transaction } from './Transaction';

/**
 * IFinances interface
 * Represents the complete financial state of a campaign
 */
export interface IFinances {
  /** List of all transactions */
  transactions: Transaction[];

  /** Current balance (computed from transactions) */
  balance: Money;
}
