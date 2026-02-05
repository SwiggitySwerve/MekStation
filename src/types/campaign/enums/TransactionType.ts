/**
 * TransactionType - Campaign financial transaction type enumeration
 * Defines the types of financial transactions in a campaign.
 */

/**
 * Financial transaction type
 * Defines the category of a financial transaction
 */
export enum TransactionType {
  /** General income */
  Income = 'income',

  /** General expense */
  Expense = 'expense',

  /** Equipment repair cost */
  Repair = 'repair',

  /** Equipment maintenance cost */
  Maintenance = 'maintenance',

  /** Income from salvage */
  Salvage = 'salvage',

  /** Miscellaneous transaction */
  Miscellaneous = 'miscellaneous',

  /** Personnel salary payment */
  Salary = 'salary',

  /** Contract payment received */
  ContractPayment = 'contract_payment',

  /** Loan repayment */
  LoanPayment = 'loan_payment',

  /** Loan disbursement received */
  LoanDisbursement = 'loan_disbursement',

  /** Tax payment */
  Tax = 'tax',

  /** Overhead costs */
  Overhead = 'overhead',

  /** Food and housing expenses */
  FoodAndHousing = 'food_and_housing',

  /** Unit purchase */
  UnitPurchase = 'unit_purchase',

  /** Part purchase */
  PartPurchase = 'part_purchase',

  /** Turnover payout */
  TurnoverPayout = 'turnover_payout',
}

/**
 * Array of all valid TransactionType values for iteration
 */
export const ALL_TRANSACTION_TYPES: readonly TransactionType[] = Object.freeze([
  TransactionType.Income,
  TransactionType.Expense,
  TransactionType.Repair,
  TransactionType.Maintenance,
  TransactionType.Salvage,
  TransactionType.Miscellaneous,
  TransactionType.Salary,
  TransactionType.ContractPayment,
  TransactionType.LoanPayment,
  TransactionType.LoanDisbursement,
  TransactionType.Tax,
  TransactionType.Overhead,
  TransactionType.FoodAndHousing,
  TransactionType.UnitPurchase,
  TransactionType.PartPurchase,
  TransactionType.TurnoverPayout,
]);

/**
 * Check if a value is a valid TransactionType
 */
export function isValidTransactionType(
  value: unknown,
): value is TransactionType {
  return Object.values(TransactionType).includes(value as TransactionType);
}

/**
 * Display name for TransactionType
 */
export function displayTransactionType(type: TransactionType): string {
  const displayNames: Record<TransactionType, string> = {
    [TransactionType.Income]: 'Income',
    [TransactionType.Expense]: 'Expense',
    [TransactionType.Repair]: 'Repair',
    [TransactionType.Maintenance]: 'Maintenance',
    [TransactionType.Salvage]: 'Salvage',
    [TransactionType.Miscellaneous]: 'Miscellaneous',
    [TransactionType.Salary]: 'Salary',
    [TransactionType.ContractPayment]: 'Contract Payment',
    [TransactionType.LoanPayment]: 'Loan Payment',
    [TransactionType.LoanDisbursement]: 'Loan Disbursement',
    [TransactionType.Tax]: 'Tax',
    [TransactionType.Overhead]: 'Overhead',
    [TransactionType.FoodAndHousing]: 'Food & Housing',
    [TransactionType.UnitPurchase]: 'Unit Purchase',
    [TransactionType.PartPurchase]: 'Part Purchase',
    [TransactionType.TurnoverPayout]: 'Turnover Payout',
  };
  return displayNames[type] ?? type;
}
