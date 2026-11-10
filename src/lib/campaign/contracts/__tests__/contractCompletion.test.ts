import type { Transaction } from '@/types/campaign/Transaction';

import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { TransactionType } from '@/types/campaign/enums/TransactionType';
import { Money } from '@/types/campaign/Money';

import {
  completionReadiness,
  completeContract,
  planInstallments,
  recommendedVerdict,
  settlementAmount,
} from '../contractCompletion';
import { stagedContract } from './contractCompletion.fixtures';

function ledger(
  amount: number,
  id = 'tx-contract-installment-contract-s1-1',
): Transaction[] {
  return [
    {
      id,
      type: TransactionType.ContractPayment,
      amount: Money.fromCents(amount),
      date: new Date('3025-01-31T00:00:00.000Z'),
      description: 'installment',
    },
  ];
}

describe('staged completion owner (no production callers)', () => {
  it('rejects amounts beyond exact-cent Money conversion range', () => {
    expect(() => planInstallments(stagedContract(90, 2 ** 50))).toThrow();
    expect(() =>
      settlementAmount(
        stagedContract(90, 2 ** 50 - 1),
        MissionStatus.SUCCESS,
        [],
      ),
    ).toThrow();
  });
  it.each([1, 29, 30, 31, 59, 60, 61, 90, 180])(
    'plans exact cents for term %i',
    (term) => {
      for (const base of [0, 1, 2, 17, 10001, 132000000, 999999999999]) {
        const contract = stagedContract(term, base);
        const plan = planInstallments(contract);
        const n = Math.max(1, Math.ceil(term / 30));
        expect(plan).toHaveLength(n - 1);
        for (const [index, installment] of plan.entries()) {
          expect(installment.amountCents).toBe(Math.floor(base / n));
          expect(Number.isSafeInteger(installment.amountCents)).toBe(true);
          expect(installment.dueOn).toBe(
            new Date(
              Date.UTC(3025, 0, 1) + (index + 1) * 30 * 86400000,
            ).toISOString(),
          );
          expect(installment.txId).toBe(
            `tx-contract-installment-contract-s1-${index + 1}`,
          );
        }
        for (const verdict of [
          MissionStatus.SUCCESS,
          MissionStatus.PARTIAL,
          MissionStatus.FAILED,
          MissionStatus.BREACH,
        ] as const) {
          const credited = plan.reduce(
            (sum, entry) => sum + entry.amountCents,
            0,
          );
          const saved = {
            ...contract,
            lifecycle: {
              ...contract.lifecycle!,
              installments: { paidThrough: n - 1, creditedCents: credited },
            },
          };
          const amount = settlementAmount(saved, verdict, []);
          const bonus =
            verdict === MissionStatus.SUCCESS
              ? 71
              : verdict === MissionStatus.PARTIAL
                ? 37
                : 11;
          expect(amount.totalCents).toBe(base + bonus + 8);
          expect(amount.paidCents).toBe(base + bonus + 8 - credited);
          expect(amount.paidCents).toBeGreaterThanOrEqual(0);
          expect(credited + amount.paidCents).toBe(amount.totalCents);
        }
      }
    },
  );

  it('subtracts the maximum of record and ledger credits in both directions', () => {
    const contract = stagedContract();
    const saved = {
      ...contract,
      lifecycle: {
        ...contract.lifecycle!,
        installments: { paidThrough: 1, creditedCents: 3333 },
      },
    };
    expect(
      settlementAmount(saved, MissionStatus.SUCCESS, []).creditedCents,
    ).toBe(3333);
    expect(
      settlementAmount(contract, MissionStatus.SUCCESS, ledger(3333))
        .creditedCents,
    ).toBe(3333);
    expect(
      settlementAmount(saved, MissionStatus.SUCCESS, ledger(3333))
        .creditedCents,
    ).toBe(3333);
    expect(
      settlementAmount(
        contract,
        MissionStatus.SUCCESS,
        ledger(3333, 'unrelated'),
      ).creditedCents,
    ).toBe(0);
  });

  it('refuses corrupt financial evidence rather than clamp or round it', () => {
    expect(() =>
      settlementAmount(stagedContract(), MissionStatus.SUCCESS, ledger(10002)),
    ).toThrow();
    expect(() => planInstallments(stagedContract(90, -1))).toThrow();
    expect(() => planInstallments(stagedContract(90, Number.NaN))).toThrow();
  });

  it('uses saved generation date and keeps the original term after an end shortening', () => {
    const contract = {
      ...stagedContract(180),
      endDate: '3025-03-17T00:00:00.000Z',
    };
    expect(planInstallments(contract)).toHaveLength(5);
    expect(planInstallments(contract)[0].dueOn).toBe(
      '3025-01-31T00:00:00.000Z',
    );
    expect(completionReadiness(contract, '3025-03-16')).toMatchObject({
      kind: 'not-ready',
    });
    expect(completionReadiness(contract, '3025-03-17')).toMatchObject({
      kind: 'ready',
    });
    expect(
      completionReadiness(contract, '3025-03-17', ['pending']),
    ).toMatchObject({ kind: 'ready', blockers: ['pending'] });
  });

  it('recommends from lifetime results and reports incomplete history', () => {
    expect(recommendedVerdict(stagedContract())).toMatchObject({
      kind: 'recommended',
      verdict: MissionStatus.SUCCESS,
      score: 0,
    });
    const withResults = (
      results: readonly ('victory' | 'defeat' | 'draw' | 'unscored')[],
    ) => ({
      ...stagedContract(),
      lifecycle: {
        ...stagedContract().lifecycle!,
        results: results.map((result, i) => ({
          matchId: String(i),
          appliedOn: '3025-03-01',
          result,
        })),
      },
    });
    expect(recommendedVerdict(withResults(['defeat']))).toMatchObject({
      verdict: MissionStatus.FAILED,
      score: -2,
    });
    expect(
      recommendedVerdict(withResults(['victory', 'defeat', 'draw'])),
    ).toMatchObject({ verdict: MissionStatus.SUCCESS, score: 0 });
    expect(recommendedVerdict(withResults(['unscored']))).toMatchObject({
      verdict: MissionStatus.SUCCESS,
      unscored: 1,
    });
    expect(recommendedVerdict(stagedContract(), false)).toEqual({
      kind: 'insufficient-history',
    });
  });

  it('completes purely at term end and a receipt prevents a second payment', () => {
    const contract = stagedContract();
    const before = JSON.stringify(contract);
    const result = completeContract(
      contract,
      '3025-04-01',
      MissionStatus.SUCCESS,
      [],
    );
    expect(result.kind).toBe('completed');
    if (result.kind !== 'completed') throw new Error(result.kind);
    expect(result.contract.status).toBe(MissionStatus.SUCCESS);
    expect(result.transaction.id).toBe('tx-contract-settlement-contract-s1');
    expect(result.contract.lifecycle?.settlement).toEqual({
      verdict: 'SUCCESS',
      settledOn: '3025-04-01',
      paidCents: 10080,
      txId: result.transaction.id,
    });
    expect(JSON.stringify(contract)).toBe(before);
    expect(
      completeContract(result.contract, '3025-04-01', MissionStatus.SUCCESS, [
        result.transaction,
      ]).kind,
    ).toBe('already-settled');
    expect(
      completeContract(contract, '3025-04-01', MissionStatus.SUCCESS, [
        result.transaction,
      ]).kind,
    ).toBe('already-settled');
    expect(
      completeContract(result.contract, '3025-04-01', MissionStatus.SUCCESS, [])
        .kind,
    ).toBe('settlement-mismatch');
    expect(
      completeContract(contract, '3025-01-02', MissionStatus.SUCCESS, []).kind,
    ).toBe('not-ready');
    expect(
      completeContract(
        contract,
        '3025-04-01',
        MissionStatus.SUCCESS,
        [],
        ['pending'],
      ).kind,
    ).toBe('blocked');
  });
});
