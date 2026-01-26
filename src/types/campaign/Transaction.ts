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
  // Existing
  Income = 'income',
  Expense = 'expense',
  Repair = 'repair',
  Maintenance = 'maintenance',
  Salvage = 'salvage',
  Miscellaneous = 'miscellaneous',
  // New
  Salary = 'salary',
  ContractPayment = 'contract_payment',
  LoanPayment = 'loan_payment',
  LoanDisbursement = 'loan_disbursement',
  Tax = 'tax',
  Overhead = 'overhead',
  FoodAndHousing = 'food_and_housing',
  UnitPurchase = 'unit_purchase',
  PartPurchase = 'part_purchase',
  TurnoverPayout = 'turnover_payout',
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
