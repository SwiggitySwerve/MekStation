/**
 * Transaction interface for campaign finances
 * Represents a single financial transaction in a campaign
 */

import { Money } from './Money';
import { TransactionType } from './enums/TransactionType';

export { TransactionType };

/**
 * Transaction interface
 * Represents a single financial transaction with type, date, amount, and description
 */
export interface Transaction {
  /** Unique identifier for the transaction */
  id: string;

  /** Type of transaction */
  type: TransactionType;

  /** Amount of the transaction */
  amount: Money;

  /** Date the transaction occurred */
  date: Date;

  /** Description of the transaction */
  description: string;
}
