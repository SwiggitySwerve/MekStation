/**
 * Loan Repayment via the Daily-Cost Pipeline — integration test
 *
 * Covers tasks.md 3.4 / 5.2 and the spec scenario "Loan repayment flows
 * through the daily-cost pipeline": an active loan's `dailyRepayment` is
 * summed into the daily cost debited by `processDailyCosts`, the loan's
 * `remainingBalance` decreases accordingly, and the loan settles to
 * `repaid` once its balance is exhausted (design D4).
 *
 * @spec openspec/changes/add-campaign-command-ui/specs/campaign-command-ui/spec.md
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignWithCommand } from '@/types/campaign/CampaignCommandExtensions';

import { processDailyCosts } from '@/lib/campaign/dailyCostsProcessing';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { createCampaign } from '@/types/campaign/Campaign';
import { createCampaignLoan } from '@/types/campaign/CampaignLoan';
import { Money } from '@/types/campaign/Money';

/** A campaign with no personnel or units — isolates loan repayment. */
function loanOnlyCampaign(): ICampaignWithCommand {
  const base = createCampaign('Loan Test', 'mercenary', {
    payForSalaries: false,
    payForMaintenance: false,
  });
  const loan = createCampaignLoan({
    id: 'loan-1',
    principal: 100_000,
    interestRate: 0.0, // zero interest keeps the arithmetic exact
    termDays: 10,
    takenOnDate: '3025-01-01T00:00:00.000Z',
  });
  return {
    ...base,
    finances: { balance: new Money(1_000_000), transactions: [] },
    loans: [loan],
  };
}

describe('loan repayment via the daily-cost pipeline', () => {
  beforeEach(() => {
    useCampaignRosterStore.setState({
      campaignId: null,
      units: [],
      pilots: [],
      missions: [],
      activeMissionId: null,
      missionCount: 0,
    });
  });

  it('debits the loan dailyRepayment from the balance', () => {
    const campaign = loanOnlyCampaign();
    const result = processDailyCosts(campaign);

    // 100,000 over 10 days at 0% = 10,000 per day.
    expect(result.costs.loanRepayment.amount).toBeCloseTo(10_000);
    expect(result.finances.balance.amount).toBeCloseTo(1_000_000 - 10_000);
  });

  it('includes loan repayment in the total daily cost', () => {
    const campaign = loanOnlyCampaign();
    const result = processDailyCosts(campaign);
    expect(result.costs.total.amount).toBeCloseTo(10_000);
  });

  it('decreases the loan remainingBalance by one instalment', () => {
    const campaign = loanOnlyCampaign();
    const result = processDailyCosts(campaign);
    const loan = result.loans[0];
    expect(loan.remainingBalance).toBeCloseTo(90_000);
    expect(loan.status).toBe('active');
  });

  it('settles the loan to repaid once the balance is exhausted', () => {
    let campaign: ICampaign = loanOnlyCampaign();

    // Advance ten days — the 10-day, 100k loan repays fully.
    for (let day = 0; day < 10; day++) {
      const result = processDailyCosts(campaign);
      campaign = {
        ...campaign,
        finances: result.finances,
        loans: result.loans,
      } as ICampaign;
    }

    const loan = (campaign as ICampaignWithCommand).loans?.[0];
    expect(loan?.status).toBe('repaid');
    expect(loan?.remainingBalance).toBe(0);
  });

  it('stops debiting once the loan is repaid', () => {
    let campaign: ICampaign = loanOnlyCampaign();

    // Run the loan to completion.
    for (let day = 0; day < 10; day++) {
      const result = processDailyCosts(campaign);
      campaign = {
        ...campaign,
        finances: result.finances,
        loans: result.loans,
      } as ICampaign;
    }
    const balanceAfterRepayment = campaign.finances.balance.amount;

    // One more day — a repaid loan contributes nothing further.
    const extra = processDailyCosts(campaign);
    expect(extra.costs.loanRepayment.amount).toBe(0);
    expect(extra.finances.balance.amount).toBeCloseTo(balanceAfterRepayment);
  });

  it('never overpays past the loan principal-plus-interest', () => {
    // A loan whose dailyRepayment does not divide the total evenly: the
    // final instalment repays only the residual.
    const base = createCampaign('Residual', 'mercenary', {
      payForSalaries: false,
      payForMaintenance: false,
    });
    const loan = createCampaignLoan({
      id: 'loan-residual',
      principal: 100_000,
      interestRate: 0.0,
      termDays: 3, // 33,333.33 / day — does not divide evenly
      takenOnDate: '3025-01-01T00:00:00.000Z',
    });
    let campaign: ICampaign = {
      ...base,
      finances: { balance: new Money(1_000_000), transactions: [] },
      loans: [loan],
    } as ICampaign;

    let totalRepaid = 0;
    for (let day = 0; day < 3; day++) {
      const result = processDailyCosts(campaign);
      totalRepaid += result.costs.loanRepayment.amount;
      campaign = {
        ...campaign,
        finances: result.finances,
        loans: result.loans,
      } as ICampaign;
    }

    // Total repaid equals the loan total, not 3 x dailyRepayment. The
    // per-day `Money` figure rounds to C-bill cents, so the summed
    // displayed total may differ from the exact principal by a couple
    // cents when the term does not divide it evenly — precision 1
    // (tolerance < 0.05) reflects that cent-granularity, not a math error.
    expect(totalRepaid).toBeCloseTo(100_000, 1);
    expect((campaign as ICampaignWithCommand).loans?.[0].status).toBe('repaid');
  });
});
