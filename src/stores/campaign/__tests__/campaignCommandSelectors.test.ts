/**
 * Campaign Command Selectors — unit tests
 *
 * Covers tasks.md 1.4: the command selectors return expected projections
 * from a populated campaign and empty results from a fresh campaign.
 *
 * @spec openspec/changes/add-campaign-command-ui/specs/campaign-command-ui/spec.md
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignWithCommand } from '@/types/campaign/CampaignCommandExtensions';

import {
  SAMPLE_CANDIDATES,
  SAMPLE_OFFERS,
} from '@/components/campaign/command/__fixtures__/commandFixtures';
import { createCampaign } from '@/types/campaign/Campaign';
import { createCampaignLoan } from '@/types/campaign/CampaignLoan';
import { TransactionType } from '@/types/campaign/enums/TransactionType';
import { Money } from '@/types/campaign/Money';

import {
  selectActiveLoanDailyRepayment,
  selectActiveLoans,
  selectBalance,
  selectDailyCostProjection,
  selectLoans,
  selectPersonnelMarket,
  selectTransactionLedger,
  selectVisibleContractOffers,
} from '../campaignCommandSelectors';

describe('campaignCommandSelectors', () => {
  describe('fresh campaign — empty projections', () => {
    const fresh = createCampaign('Fresh', 'mercenary');

    it('returns an empty personnel market', () => {
      expect(selectPersonnelMarket(fresh)).toEqual([]);
    });

    it('returns an empty transaction ledger', () => {
      expect(selectTransactionLedger(fresh)).toEqual([]);
    });

    it('returns an empty loan ledger', () => {
      expect(selectLoans(fresh)).toEqual([]);
      expect(selectActiveLoans(fresh)).toEqual([]);
    });

    it('returns an empty visible contract market', () => {
      expect(selectVisibleContractOffers(fresh)).toEqual([]);
    });

    it('returns a zero loan daily repayment', () => {
      expect(selectActiveLoanDailyRepayment(fresh)).toBe(0);
    });

    it('handles a null campaign without throwing', () => {
      expect(selectPersonnelMarket(null)).toEqual([]);
      expect(selectBalance(null)).toEqual(Money.ZERO);
      expect(selectLoans(null)).toEqual([]);
      expect(selectVisibleContractOffers(null)).toEqual([]);
    });
  });

  describe('populated campaign — expected projections', () => {
    function populated(): ICampaignWithCommand {
      const base = createCampaign('Populated', 'mercenary');
      const loan = createCampaignLoan({
        id: 'loan-1',
        principal: 1_000_000,
        interestRate: 0.1,
        termDays: 100,
        takenOnDate: '3025-01-01T00:00:00.000Z',
      });
      return {
        ...base,
        finances: {
          balance: new Money(500_000),
          transactions: [
            {
              id: 'tx-old',
              type: TransactionType.Expense,
              amount: new Money(1000),
              date: new Date('3025-01-01'),
              description: 'Old',
            },
            {
              id: 'tx-new',
              type: TransactionType.Income,
              amount: new Money(2000),
              date: new Date('3025-01-05'),
              description: 'New',
            },
          ],
        },
        personnelMarket: SAMPLE_CANDIDATES,
        loans: [loan],
        contractMarket: {
          offers: SAMPLE_OFFERS,
          declinedOfferIds: [SAMPLE_OFFERS[0].id],
        },
      };
    }

    it('projects the personnel market', () => {
      expect(selectPersonnelMarket(populated())).toEqual(SAMPLE_CANDIDATES);
    });

    it('projects the transaction ledger newest-first', () => {
      const ledger = selectTransactionLedger(populated());
      expect(ledger[0].id).toBe('tx-new');
      expect(ledger[1].id).toBe('tx-old');
    });

    it('projects the balance', () => {
      expect(selectBalance(populated()).amount).toBe(500_000);
    });

    it('projects the loan ledger', () => {
      expect(selectLoans(populated())).toHaveLength(1);
      expect(selectActiveLoans(populated())).toHaveLength(1);
    });

    it('sums the active-loan daily repayment', () => {
      // 1,000,000 * 1.1 / 100 = 11,000 / day.
      expect(selectActiveLoanDailyRepayment(populated())).toBeCloseTo(11_000);
    });

    it('includes loan repayment in the daily-cost projection', () => {
      const projection = selectDailyCostProjection(populated(), 0);
      expect(projection.loanRepayment).toBeCloseTo(11_000);
      expect(projection.total).toBeCloseTo(
        projection.salaries + projection.maintenance + 11_000,
      );
    });

    it('hides declined offers from the visible contract market', () => {
      const visible = selectVisibleContractOffers(populated());
      // SAMPLE_OFFERS[0] was declined — only the other two are visible.
      expect(visible).toHaveLength(SAMPLE_OFFERS.length - 1);
      expect(visible.some((o) => o.id === SAMPLE_OFFERS[0].id)).toBe(false);
    });
  });

  describe('selectActiveLoans — repaid loans excluded', () => {
    it('excludes a repaid loan', () => {
      const base = createCampaign('Mixed', 'mercenary');
      const active = createCampaignLoan({
        id: 'loan-active',
        principal: 100_000,
        interestRate: 0.1,
        termDays: 50,
        takenOnDate: '3025-01-01T00:00:00.000Z',
      });
      const campaign: ICampaign = {
        ...base,
        loans: [
          active,
          { ...active, id: 'loan-repaid', status: 'repaid' as const },
        ],
      } as ICampaign;
      expect(selectActiveLoans(campaign)).toHaveLength(1);
      expect(selectActiveLoans(campaign)[0].id).toBe('loan-active');
    });
  });
});
