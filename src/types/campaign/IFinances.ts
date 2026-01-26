/**
 * IFinances interface for campaign finances
 * Represents the financial state of a campaign
 */

import { Money } from './Money';
import { Transaction } from './Transaction';
import type { ILoan } from './Loan';

export interface IFinances {
  transactions: Transaction[];
  balance: Money;
  loans?: ILoan[];
}
