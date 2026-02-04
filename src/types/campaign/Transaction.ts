/**
 * Transaction interface for campaign finances
 * Represents a single financial transaction in a campaign
 */

import type { IIdentifiable } from '@/types/core';
import { Money } from './Money';
import { TransactionType } from './enums/TransactionType';

export { TransactionType };

/**
 * Transaction interface
 * Represents a single financial transaction with type, date, amount, and description
 */
export interface Transaction extends IIdentifiable {

  /** Type of transaction */
  type: TransactionType;

  /** Amount of the transaction */
  amount: Money;

  /** Date the transaction occurred */
  date: Date;

  /** Description of the transaction */
  description: string;
}
