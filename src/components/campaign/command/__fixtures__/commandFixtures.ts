/**
 * Command UI Test / Storybook Fixtures
 *
 * Shared sample data for the command-tier surfaces (CP2b —
 * `add-campaign-command-ui`). Used by both the Storybook stories and the
 * component / integration tests so the populated states are consistent.
 *
 * @module components/campaign/command/__fixtures__/commandFixtures
 */

import type { IDailyCostProjection } from '@/stores/campaign/campaignCommandSelectors';
import type { ICampaignLoan } from '@/types/campaign/CampaignLoan';
import type { IPersonnelMarketOffer } from '@/types/campaign/markets/marketTypes';
import type { IContract } from '@/types/campaign/Mission';
import type { Transaction } from '@/types/campaign/Transaction';

import { createCampaignLoan } from '@/types/campaign/CampaignLoan';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { TransactionType } from '@/types/campaign/enums/TransactionType';
import { MarketExperienceLevel } from '@/types/campaign/markets/marketTypes';
import { createContract } from '@/types/campaign/Mission';
import { Money } from '@/types/campaign/Money';
import { createDefaultPaymentTerms } from '@/types/campaign/PaymentTerms';

// =============================================================================
// Personnel Market (Hiring Panel)
// =============================================================================

/** A populated personnel-market pool — a mix of roles and experience. */
export const SAMPLE_CANDIDATES: readonly IPersonnelMarketOffer[] = [
  {
    id: 'pmo-elite-pilot',
    name: 'Natasha Kerensky',
    role: CampaignPersonnelRole.PILOT,
    experienceLevel: MarketExperienceLevel.ELITE,
    skills: { gunnery: 2, piloting: 2 },
    hireCost: 200000,
    expirationDate: '3025-02-01',
  },
  {
    id: 'pmo-regular-tech',
    name: 'Morgan Allard',
    role: CampaignPersonnelRole.MEK_TECH,
    experienceLevel: MarketExperienceLevel.REGULAR,
    skills: { technician: 4 },
    hireCost: 30000,
    expirationDate: '3025-02-14',
  },
  {
    id: 'pmo-green-pilot',
    name: 'Aidan Ward',
    role: CampaignPersonnelRole.PILOT,
    experienceLevel: MarketExperienceLevel.GREEN,
    skills: { gunnery: 5, piloting: 5 },
    hireCost: 25000,
    expirationDate: '3025-03-01',
  },
];

// =============================================================================
// Finances (Finances Panel)
// =============================================================================

/** A populated transaction ledger, newest first. */
export const SAMPLE_TRANSACTIONS: readonly Transaction[] = [
  {
    id: 'tx-001',
    type: TransactionType.LoanDisbursement,
    amount: new Money(1000000),
    date: new Date('3025-01-10'),
    description: 'Loan disbursement: 1,000,000.00 C-bills',
  },
  {
    id: 'tx-002',
    type: TransactionType.Expense,
    amount: new Money(7500),
    date: new Date('3025-01-09'),
    description: 'Daily salaries for 5 personnel',
  },
  {
    id: 'tx-003',
    type: TransactionType.ContractPayment,
    amount: new Money(450000),
    date: new Date('3025-01-08'),
    description: 'Contract payout: Raid on Hesperus',
  },
];

/** A populated daily-cost projection — salary + maintenance + loan. */
export const SAMPLE_DAILY_COST: IDailyCostProjection = {
  salaries: 7500,
  maintenance: 4000,
  loanRepayment: 3013.7,
  total: 14513.7,
};

/** A populated active-loan ledger. */
export const SAMPLE_LOANS: readonly ICampaignLoan[] = [
  createCampaignLoan({
    id: 'loan-sample-1',
    principal: 1000000,
    interestRate: 0.1,
    termDays: 365,
    takenOnDate: '3025-01-10T00:00:00.000Z',
  }),
];

// =============================================================================
// Contract Market (Contract Market Panel)
// =============================================================================

/** Build a sample contract offer via the canonical `createContract` factory. */
interface ContractFixture {
  readonly id: string;
  readonly name: string;
  readonly employerId: string;
  readonly basePayment: number;
  readonly salvageRights: 'None' | 'Exchange' | 'Integrated';
  readonly startDate: string;
  readonly endDate: string;
}

function makeContract(fixture: ContractFixture): IContract {
  return createContract({
    id: fixture.id,
    name: fixture.name,
    employerId: fixture.employerId,
    targetId: 'liao',
    startDate: fixture.startDate,
    endDate: fixture.endDate,
    salvageRights: fixture.salvageRights,
    paymentTerms: {
      ...createDefaultPaymentTerms(),
      basePayment: new Money(fixture.basePayment),
    },
  });
}

/** A populated contract-market pool. */
export const SAMPLE_OFFERS: readonly IContract[] = [
  makeContract({
    id: 'contract-raid',
    name: 'Raid on Hesperus II',
    employerId: 'davion',
    basePayment: 600000,
    salvageRights: 'Exchange',
    startDate: '3025-02-01',
    endDate: '3025-05-01',
  }),
  makeContract({
    id: 'contract-garrison',
    name: 'Garrison Duty — New Avalon',
    employerId: 'steiner',
    basePayment: 350000,
    salvageRights: 'None',
    startDate: '3025-02-01',
    endDate: '3025-08-01',
  }),
  makeContract({
    id: 'contract-recon',
    name: 'Recon Sweep — Galtor',
    employerId: 'marik',
    basePayment: 420000,
    salvageRights: 'Integrated',
    startDate: '3025-02-01',
    endDate: '3025-04-01',
  }),
];
