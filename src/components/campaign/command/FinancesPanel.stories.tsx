/**
 * Finances Panel — Storybook stories
 *
 * Covers tasks.md 3.6: populated, empty, and error variants of the
 * Finances & Loans surface (CP2b — `add-campaign-command-ui`, design D8).
 *
 * @spec openspec/changes/add-campaign-command-ui/specs/campaign-command-ui/spec.md
 */

import type { Meta, StoryObj } from '@storybook/react';

import { Money } from '@/types/campaign/Money';

import { paddedDarkCampaignStoryParameters } from '../campaignStoryParameters';
import {
  SAMPLE_DAILY_COST,
  SAMPLE_LOANS,
  SAMPLE_TRANSACTIONS,
} from './__fixtures__/commandFixtures';
import { CommandError } from './CommandStates';
import { FinancesPanel } from './FinancesPanel';

const meta = {
  title: 'Campaign/Command/FinancesPanel',
  component: FinancesPanel,
  parameters: paddedDarkCampaignStoryParameters,
  tags: ['autodocs'],
} satisfies Meta<typeof FinancesPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Populated — a balance, a ledger, an active loan, and the take-loan form. */
export const Populated: Story = {
  args: {
    balance: new Money(2_450_000),
    transactions: SAMPLE_TRANSACTIONS,
    dailyCost: SAMPLE_DAILY_COST,
    activeLoans: SAMPLE_LOANS,
    onTakeLoan: () => undefined,
    isTakingLoan: false,
  },
};

/** Empty — a fresh campaign: no transactions, no loans (design D7). */
export const Empty: Story = {
  args: {
    balance: new Money(5_000_000),
    transactions: [],
    dailyCost: {
      salaries: 0,
      maintenance: 0,
      loanRepayment: 0,
      total: 0,
    },
    activeLoans: [],
    onTakeLoan: () => undefined,
    isTakingLoan: false,
  },
};

/** Error — a loan request could not be processed; shows the retry affordance. */
export const ErrorState: Story = {
  args: {
    balance: new Money(0),
    transactions: [],
    dailyCost: {
      salaries: 0,
      maintenance: 0,
      loanRepayment: 0,
      total: 0,
    },
    activeLoans: [],
    onTakeLoan: () => undefined,
    isTakingLoan: false,
  },
  render: () => (
    <CommandError
      message="The loan could not be processed — principal must be positive."
      onRetry={() => undefined}
    />
  ),
};
