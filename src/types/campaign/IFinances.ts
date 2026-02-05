/**
 * IFinances interface for campaign finances
 * Represents the financial state of a campaign
 */

import type { ILoan } from './Loan';

import { Money } from './Money';
import { Transaction } from './Transaction';

export interface IFinances {
  transactions: Transaction[];
  balance: Money;
  loans?: ILoan[];
}
