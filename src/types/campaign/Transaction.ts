/**
 * Transaction interface for campaign finances
 * Represents a single financial transaction in a campaign
 */

import { Money } from './Money';

/**
 * Transaction type enum
 * Defines the category of a financial transaction
 */
export enum TransactionType {
  Income = 'income',
  Expense = 'expense',
  Repair = 'repair',
  Maintenance = 'maintenance',
  Salvage = 'salvage',
  Miscellaneous = 'miscellaneous',
}

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
