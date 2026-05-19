/**
 * Contract Payment - Payment-terms and contract-record assembly helpers
 *
 * Provides the two pieces of construction logic that every contract generator
 * shared verbatim: deriving outcome payment terms from a base payment via the
 * success/partial/failure multipliers, and assembling an IContract from its
 * resolved attributes plus campaign-relative start/end dates. Extracted from
 * contractMarket.ts to remove four-way / three-way duplication while keeping
 * the exact same arithmetic and field shape.
 *
 * @module lib/campaign/contracts/contractPayment
 */

import { MissionStatus } from '@/types/campaign/enums/MissionStatus';
import { IContract, createContract } from '@/types/campaign/Mission';
import { Money } from '@/types/campaign/Money';
import {
  IPaymentTerms,
  createPaymentTerms,
} from '@/types/campaign/PaymentTerms';

import { PAYMENT_MULTIPLIERS } from './contractMarketConstants';

/**
 * Number of milliseconds in one day, used to offset a contract's end date.
 */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Build outcome payment terms from a base payment.
 *
 * Applies the success/partial/failure multipliers to the base payment so every
 * generator derives outcome payments identically instead of repeating the
 * four multiply calls inline.
 *
 * @param basePayment - Base contract payment
 * @param salvagePercent - Salvage percentage for the contract (40-60)
 * @returns Payment terms with all four outcome payments populated
 */
export function buildOutcomePaymentTerms(
  basePayment: Money,
  salvagePercent: number,
): IPaymentTerms {
  return createPaymentTerms({
    basePayment,
    successPayment: basePayment.multiply(PAYMENT_MULTIPLIERS.success),
    partialPayment: basePayment.multiply(PAYMENT_MULTIPLIERS.partial),
    failurePayment: basePayment.multiply(PAYMENT_MULTIPLIERS.failure),
    salvagePercent,
  });
}

/**
 * Attributes needed to assemble a pending contract record.
 */
export interface ContractRecordInput {
  /** Unique contract ID. */
  id: string;
  /** Display name of the contract. */
  name: string;
  /** Star system the contract takes place in. */
  system: string;
  /** Employer faction ID. */
  employer: string;
  /** Target faction ID. */
  target: string;
  /** Resolved payment terms. */
  paymentTerms: IPaymentTerms;
  /** Campaign current date used as the contract start date. */
  startDate: Date;
  /** Contract duration in days, used to derive the end date. */
  durationDays: number;
}

/**
 * Assemble a pending IContract from resolved attributes.
 *
 * Centralises the createContract call and the start/end date math so the three
 * contract generators no longer repeat the identical record shape and the
 * day-offset arithmetic.
 *
 * @param input - Resolved contract attributes
 * @returns A new pending contract
 */
export function buildContractRecord(input: ContractRecordInput): IContract {
  const endDate = new Date(
    input.startDate.getTime() + input.durationDays * MS_PER_DAY,
  );

  return createContract({
    id: input.id,
    name: input.name,
    status: MissionStatus.PENDING,
    systemId: input.system,
    employerId: input.employer,
    targetId: input.target,
    paymentTerms: input.paymentTerms,
    startDate: input.startDate.toISOString(),
    endDate: endDate.toISOString(),
  });
}
