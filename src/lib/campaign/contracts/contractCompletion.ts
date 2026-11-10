/** Pure staged completion rules. No persistence or production callers in S1.
 * @spec openspec/changes/add-contract-lifecycle-s1/specs/mission-contracts/spec.md
 */
import type {
  ContractLifecyclePolicy,
  IContractLifecycleState,
} from '@/types/campaign/ContractLifecycleRules';
import type { IContract } from '@/types/campaign/Mission';
import type { Transaction } from '@/types/campaign/Transaction';

import {
  getContractLifecyclePolicy,
  validateContractLifecycleState,
} from '@/types/campaign/ContractLifecycleRules';
import {
  MissionStatus,
  missionPayoutOutcome,
} from '@/types/campaign/enums/MissionStatus';
import { TransactionType } from '@/types/campaign/enums/TransactionType';
import { Money } from '@/types/campaign/Money';
import { calculateTotalPayout } from '@/types/campaign/PaymentTerms';

import { missionTransitionRefusal } from '../missionStatusMachine';
import { contractLengthToDays } from './contractLength';

export type ContractVerdict =
  | MissionStatus.SUCCESS
  | MissionStatus.PARTIAL
  | MissionStatus.FAILED
  | MissionStatus.BREACH;
type NonStagedPolicy = Exclude<ContractLifecyclePolicy, { kind: 'staged' }>;
export type CompletionReadiness =
  | NonStagedPolicy
  | { readonly kind: 'not-ready' }
  | { readonly kind: 'ready'; readonly blockers: readonly string[] };
export type RecommendedVerdict =
  | NonStagedPolicy
  | { readonly kind: 'insufficient-history' }
  | {
      readonly kind: 'recommended';
      readonly verdict: MissionStatus.SUCCESS | MissionStatus.FAILED;
      readonly score: number;
      readonly unscored: number;
    };
export interface IContractInstallment {
  readonly number: number;
  readonly dueOn: string;
  readonly amountCents: number;
  readonly txId: string;
}
export interface IContractSettlementAmount {
  readonly totalCents: number;
  readonly creditedCents: number;
  readonly paidCents: number;
}
export type CompleteContractResult =
  | Exclude<CompletionReadiness, { kind: 'ready' }>
  | { readonly kind: 'blocked'; readonly blockers: readonly string[] }
  | {
      readonly kind: 'already-settled' | 'settlement-mismatch';
      readonly contract: IContract;
    }
  | {
      readonly kind: 'completed';
      readonly contract: IContract;
      readonly transaction: Transaction;
    };

function stateOf(contract: IContract): IContractLifecycleState {
  if (
    getContractLifecyclePolicy(contract.lifecycleRulesVersion).kind !== 'staged'
  )
    throw new Error('Contract does not support staged lifecycle');
  validateContractLifecycleState(contract.lifecycle);
  return contract.lifecycle;
}

function cents(value: number): number {
  // Money's payout owner converts cents to C-bills and back on each addition.
  // Keep rounding error below half a cent without changing legacy arithmetic.
  if (!Number.isSafeInteger(value) || value < 0 || value >= 2 ** 50)
    throw new Error(
      'Contract amount must be nonnegative integer cents below 2^50',
    );
  return value;
}

function dateOf(value: string | undefined): Date {
  const date = new Date(value ?? '');
  if (!Number.isFinite(date.getTime()))
    throw new Error('Contract date is missing or invalid');
  return date;
}

export function completionReadiness(
  contract: IContract,
  campaignDate: string,
  pendingMatchIds: readonly string[] = [],
): CompletionReadiness {
  const policy = getContractLifecyclePolicy(contract.lifecycleRulesVersion);
  if (policy.kind !== 'staged') return policy;
  stateOf(contract);
  if (
    contract.status !== MissionStatus.ACTIVE ||
    dateOf(campaignDate) < dateOf(contract.endDate)
  )
    return { kind: 'not-ready' } as const;
  return {
    kind: 'ready',
    blockers: [...new Set(pendingMatchIds)].sort(),
  } as const;
}

/** At term, a negative score fails. The pin's PARTIAL/early BREACH arms are
 * unreachable without victory-point targets or a manual early-end policy. */
export function recommendedVerdict(
  contract: IContract,
  historyComplete = true,
): RecommendedVerdict {
  const policy = getContractLifecyclePolicy(contract.lifecycleRulesVersion);
  if (policy.kind !== 'staged') return policy;
  const state = stateOf(contract);
  if (!historyComplete) return { kind: 'insufficient-history' } as const;
  const score = state.results.reduce(
    (sum, entry) =>
      sum +
      (entry.result === 'victory' ? 2 : entry.result === 'defeat' ? -2 : 0),
    0,
  );
  return {
    kind: 'recommended',
    verdict: score >= 0 ? MissionStatus.SUCCESS : MissionStatus.FAILED,
    score,
    unscored: state.results.filter((entry) => entry.result === 'unscored')
      .length,
  } as const;
}

export function planInstallments(
  contract: IContract,
): readonly IContractInstallment[] {
  const state = stateOf(contract);
  const baseCents = cents(contract.paymentTerms.basePayment.centsValue);
  const count = Math.max(
    1,
    Math.ceil(state.termDays / contractLengthToDays(1)),
  );
  const amountCents = Math.floor(baseCents / count);
  const start = dateOf(contract.startDate);
  return Array.from({ length: count - 1 }, (_, index) => {
    const number = index + 1;
    const due = new Date(start);
    due.setUTCDate(due.getUTCDate() + contractLengthToDays(number));
    return {
      number,
      dueOn: due.toISOString(),
      amountCents,
      txId: `tx-contract-installment-${contract.id}-${number}`,
    };
  });
}

export function settlementAmount(
  contract: IContract,
  verdict: ContractVerdict,
  transactions: readonly Transaction[],
): IContractSettlementAmount {
  const state = stateOf(contract);
  const plan = planInstallments(contract);
  const ids = new Set(plan.map((entry) => entry.txId));
  const seen = new Set<string>();
  let ledgerCents = 0;
  for (const transaction of transactions) {
    if (!ids.has(transaction.id)) continue;
    if (seen.has(transaction.id))
      throw new Error('Duplicate contract installment transaction');
    seen.add(transaction.id);
    if (transaction.type !== TransactionType.ContractPayment)
      throw new Error('Invalid contract installment transaction type');
    ledgerCents = cents(ledgerCents + cents(transaction.amount.centsValue));
  }
  const creditedCents = Math.max(
    cents(state.installments.creditedCents),
    ledgerCents,
  );
  if (creditedCents > contract.paymentTerms.basePayment.centsValue)
    throw new Error('Contract credits exceed saved base');
  for (const amount of [
    contract.paymentTerms.basePayment,
    contract.paymentTerms.successPayment,
    contract.paymentTerms.partialPayment,
    contract.paymentTerms.failurePayment,
    contract.paymentTerms.transportPayment,
    contract.paymentTerms.supportPayment,
  ])
    cents(amount.centsValue);
  const totalCents = cents(
    calculateTotalPayout(contract.paymentTerms, missionPayoutOutcome(verdict))
      .centsValue,
  );
  return {
    totalCents,
    creditedCents,
    paidCents: cents(totalCents - creditedCents),
  };
}

const settlementVerdicts = {
  [MissionStatus.SUCCESS]: 'SUCCESS',
  [MissionStatus.PARTIAL]: 'PARTIAL',
  [MissionStatus.FAILED]: 'FAILED',
  [MissionStatus.BREACH]: 'BREACH',
} as const;

export function completeContract(
  contract: IContract,
  campaignDate: string,
  verdict: ContractVerdict,
  transactions: readonly Transaction[],
  pendingMatchIds: readonly string[] = [],
): CompleteContractResult {
  const policy = getContractLifecyclePolicy(contract.lifecycleRulesVersion);
  if (policy.kind !== 'staged') return policy;
  const state = stateOf(contract);
  const txId = `tx-contract-settlement-${contract.id}`;
  const existing = transactions.find((transaction) => transaction.id === txId);
  if (state.settlement || existing) {
    return {
      kind:
        state.settlement && !existing
          ? 'settlement-mismatch'
          : 'already-settled',
      contract,
    } as const;
  }
  const readiness = completionReadiness(
    contract,
    campaignDate,
    pendingMatchIds,
  );
  if (readiness.kind !== 'ready') return readiness;
  if (readiness.blockers.length)
    return { kind: 'blocked', blockers: readiness.blockers } as const;
  if (missionTransitionRefusal(contract.status, verdict) !== null)
    return { kind: 'not-ready' } as const;
  const amount = settlementAmount(contract, verdict, transactions);
  const completed: IContract = {
    ...contract,
    status: verdict,
    updatedAt: campaignDate,
    lifecycle: {
      ...state,
      settlement: {
        verdict: settlementVerdicts[verdict],
        settledOn: campaignDate,
        paidCents: amount.paidCents,
        txId,
      },
    },
  };
  const transaction: Transaction = {
    id: txId,
    type: TransactionType.ContractPayment,
    amount: Money.fromCents(amount.paidCents),
    date: dateOf(campaignDate),
    description: `Final payment for contract ${contract.name} (${verdict})`,
  };
  return { kind: 'completed', contract: completed, transaction } as const;
}
