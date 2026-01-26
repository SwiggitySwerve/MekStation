/**
 * TransactionType - Campaign financial transaction type enumeration
 * Defines the types of financial transactions in a campaign.
 */

/**
 * Financial transaction type
 */
export enum TransactionType {
  /** Contract payment received */
  CONTRACT_PAYMENT = 'Contract Payment',
  
  /** Personnel salary payment */
  SALARY = 'Salary',
  
  /** Equipment maintenance cost */
  MAINTENANCE = 'Maintenance',
  
  /** Equipment repair cost */
  REPAIR = 'Repair',
  
  /** Equipment purchase */
  PURCHASE = 'Purchase',
  
  /** Ammunition/supplies cost */
  SUPPLIES = 'Supplies',
  
  /** Facility/base cost */
  FACILITY = 'Facility',
  
  /** Miscellaneous expense */
  EXPENSE = 'Expense',
  
  /** Income from salvage */
  SALVAGE = 'Salvage',
  
  /** Bonus or reward */
  BONUS = 'Bonus',
}

/**
 * Array of all valid TransactionType values for iteration
 */
export const ALL_TRANSACTION_TYPES: readonly TransactionType[] = Object.freeze([
  TransactionType.CONTRACT_PAYMENT,
  TransactionType.SALARY,
  TransactionType.MAINTENANCE,
  TransactionType.REPAIR,
  TransactionType.PURCHASE,
  TransactionType.SUPPLIES,
  TransactionType.FACILITY,
  TransactionType.EXPENSE,
  TransactionType.SALVAGE,
  TransactionType.BONUS,
]);

/**
 * Check if a value is a valid TransactionType
 */
export function isValidTransactionType(value: unknown): value is TransactionType {
  return Object.values(TransactionType).includes(value as TransactionType);
}

/**
 * Display name for TransactionType
 */
export function displayTransactionType(type: TransactionType): string {
  return type;
}
