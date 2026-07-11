/**
 * Economy ledger invariant tests (design R4, spec "Economy Ledger
 * Invariants Across a Fast-Forwarded Run").
 *
 * @spec openspec/changes/add-campaign-fast-forward-api/specs/campaign-fast-forward-api/spec.md
 */
import { describe, expect, it } from '@jest/globals';

import type { Transaction } from '@/types/campaign/Transaction';

import { TransactionType } from '@/types/campaign/enums/TransactionType';
import { Money } from '@/types/campaign/Money';

import {
  assertContractPayoutExactlyOnce,
  assertLedgerReconciles,
  assertSalaryPathMutualExclusion,
  signFor,
  TRANSACTION_TYPE_SIGN,
} from '../ledger';

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    type: TransactionType.Expense,
    amount: new Money(100),
    date: new Date('3025-06-15T00:00:00Z'),
    description: 'test transaction',
    ...overrides,
  };
}

describe('TRANSACTION_TYPE_SIGN / signFor', () => {
  it('gives every declared TransactionType a definitive sign', () => {
    for (const type of Object.values(TransactionType)) {
      expect(() => signFor(type)).not.toThrow();
    }
  });

  it('classifies Income, Salvage, LoanDisbursement, and ContractPayment as additive', () => {
    expect(TRANSACTION_TYPE_SIGN[TransactionType.Income]).toBe(1);
    expect(TRANSACTION_TYPE_SIGN[TransactionType.Salvage]).toBe(1);
    expect(TRANSACTION_TYPE_SIGN[TransactionType.LoanDisbursement]).toBe(1);
    expect(TRANSACTION_TYPE_SIGN[TransactionType.ContractPayment]).toBe(1);
  });

  it('classifies Expense and Maintenance as subtractive', () => {
    expect(TRANSACTION_TYPE_SIGN[TransactionType.Expense]).toBe(-1);
    expect(TRANSACTION_TYPE_SIGN[TransactionType.Maintenance]).toBe(-1);
  });

  it('throws on an unknown transaction type (design R4: fails on unknown types)', () => {
    expect(() => signFor('not-a-real-type' as TransactionType)).toThrow(
      /unknown TransactionType/,
    );
  });
});

describe('assertLedgerReconciles', () => {
  it('passes when the ending balance equals starting balance + Income - a subtractive type in one run', () => {
    const starting = new Money(1000);
    const transactions = [
      makeTx({
        id: 'tx-income',
        type: TransactionType.Income,
        amount: new Money(500),
      }),
      makeTx({
        id: 'tx-maint',
        type: TransactionType.Maintenance,
        amount: new Money(200),
      }),
    ];
    const ending = new Money(1000 + 500 - 200);

    expect(() =>
      assertLedgerReconciles(starting, transactions, ending),
    ).not.toThrow();
  });

  it('fails loud on a deliberately-broken ledger (ending balance does not match the signed sum)', () => {
    const starting = new Money(1000);
    const transactions = [
      makeTx({
        id: 'tx-income',
        type: TransactionType.Income,
        amount: new Money(500),
      }),
    ];
    const wrongEnding = new Money(1000); // should be 1500

    expect(() =>
      assertLedgerReconciles(starting, transactions, wrongEnding),
    ).toThrow(/does not reconcile/);
  });

  it('propagates the unknown-type failure through reconciliation rather than silently summing wrong', () => {
    const starting = Money.ZERO;
    const transactions = [makeTx({ type: 'bogus' as TransactionType })];

    expect(() =>
      assertLedgerReconciles(starting, transactions, Money.ZERO),
    ).toThrow(/unknown TransactionType/);
  });
});

describe('assertContractPayoutExactlyOnce', () => {
  it('passes when the contract closure posted exactly once and is recorded exactly once in processedFulfilledContractIds', () => {
    const transactions = [
      makeTx({
        id: 'tx-contract-close-contract-1-2026-01-01T00:00:00.000Z',
        type: TransactionType.Income,
      }),
    ];
    expect(() =>
      assertContractPayoutExactlyOnce('contract-1', transactions, [
        'contract-1',
      ]),
    ).not.toThrow();
  });

  it('fails loud on a deliberately-violated fixture where the contract paid out twice (the R9 shape)', () => {
    const transactions = [
      makeTx({
        id: 'tx-contract-close-contract-1-2026-01-01T00:00:00.000Z',
        type: TransactionType.Income,
      }),
      makeTx({
        id: 'tx-contract-close-contract-1-2026-01-08T00:00:00.000Z',
        type: TransactionType.Income,
      }),
    ];
    expect(() =>
      assertContractPayoutExactlyOnce('contract-1', transactions, [
        'contract-1',
        'contract-1',
      ]),
    ).toThrow(/2 closure posting/);
  });

  it('fails loud when the contract never posted (zero closure transactions)', () => {
    expect(() => assertContractPayoutExactlyOnce('contract-1', [], [])).toThrow(
      /0 closure posting/,
    );
  });
});

describe('assertSalaryPathMutualExclusion', () => {
  it('passes when useRoleBasedSalaries=false and only the legacy Expense/tx-salary- path posted', () => {
    const transactions = [
      makeTx({
        id: 'tx-salary-2026-01-01T00:00:00.000Z',
        type: TransactionType.Expense,
      }),
    ];
    expect(() =>
      assertSalaryPathMutualExclusion(false, transactions),
    ).not.toThrow();
  });

  it('passes when useRoleBasedSalaries=true and only the role-based Salary path posted', () => {
    const transactions = [
      makeTx({
        id: 'tx-salary-2026-01-01T00:00:00.000Z',
        type: TransactionType.Salary,
      }),
    ];
    expect(() =>
      assertSalaryPathMutualExclusion(true, transactions),
    ).not.toThrow();
  });

  it('fails loud on a deliberately-violated fixture where both salary paths posted (double-charge regression)', () => {
    const transactions = [
      makeTx({
        id: 'tx-salary-2026-01-01T00:00:00.000Z',
        type: TransactionType.Expense,
      }),
      makeTx({
        id: 'tx-salary-2026-01-01T00:00:01.000Z',
        type: TransactionType.Salary,
      }),
    ];
    expect(() => assertSalaryPathMutualExclusion(true, transactions)).toThrow(
      /legacy flat-rate salary path/,
    );
    expect(() => assertSalaryPathMutualExclusion(false, transactions)).toThrow(
      /role-based salary path/,
    );
  });
});
