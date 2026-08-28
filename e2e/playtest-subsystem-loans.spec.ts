/**
 * W6 Group 4 — Loans + Interest subsystem write-flow validation
 *
 * Drives the full take-loan write flow at /gameplay/campaigns/[id]/finances:
 * renders the take-loan form (the original render assertion), fills the
 * principal, submits, and hard-asserts the observable effects of
 * `campaignCommandActions.takeLoan`:
 *   - a `loan-row-*` renders (UI proof the submit applied)
 *   - the campaign balance is credited by exactly the entered principal
 *   - a `loan_disbursement` transaction posts for the principal
 *   - the appended loan carries a fixed positive `dailyRepayment`
 *
 * Store reads go through `e2e/helpers/store.ts` over the exposed campaign
 * store — never a private store write (spec: Subsystem Tag Taxonomy).
 */

import { test, expect } from '@playwright/test';

import { createTestCampaign, deleteCampaign } from './fixtures/campaign';
import { gotoWithRetry } from './helpers/navigation';
import { getStoreState } from './helpers/store';

test.setTimeout(120_000);

/** Principal driven through the form — asserted exactly on the balance. */
const LOAN_PRINCIPAL = 250_000;

/** Serialized (page-evaluate) view of the campaign store's finances slice. */
interface ICampaignFinancesState {
  readonly campaign: {
    readonly finances: {
      readonly balance: { readonly cents: number };
      readonly transactions: ReadonlyArray<{
        readonly type: string;
        readonly amount: { readonly cents: number };
      }>;
    };
    readonly loans?: ReadonlyArray<{
      readonly id: string;
      readonly principal: number;
      readonly dailyRepayment: number;
    }>;
  } | null;
}

test.describe(
  'Wave 6.1.C — Loans subsystem',
  { tag: ['@subsystem:economy'] },
  () => {
    test('take-loan write flow credits the balance and records the loan', async ({
      page,
    }) => {
      await page.goto('/gameplay/campaigns');
      await page.waitForLoadState('domcontentloaded');

      const campaignId = await createTestCampaign(page, {
        name: 'Subsystem Loans',
      });

      try {
        await gotoWithRetry(page, `/gameplay/campaigns/${campaignId}/finances`);

        const form = page.getByTestId('take-loan-form');
        await expect(form, 'take-loan form SHALL render').toBeVisible({
          timeout: 10_000,
        });

        const before = await getStoreState<ICampaignFinancesState>(
          page,
          'campaign',
        );
        expect(
          before.campaign,
          'campaign SHALL be loaded before the loan',
        ).not.toBeNull();
        const balanceBefore = before.campaign!.finances.balance.cents;
        const loansBefore = before.campaign!.loans?.length ?? 0;

        await page
          .getByTestId('loan-input-principal')
          .fill(String(LOAN_PRINCIPAL));
        await page.getByTestId('loan-submit').click();

        await expect(
          page.locator('[data-testid^="loan-row-"]').first(),
          'a loan row SHALL render after submit',
        ).toBeVisible({ timeout: 10_000 });

        const after = await getStoreState<ICampaignFinancesState>(
          page,
          'campaign',
        );
        const balanceAfter = after.campaign!.finances.balance.cents;
        expect(
          balanceAfter - balanceBefore,
          'balance SHALL be credited by exactly the principal',
        ).toBe(LOAN_PRINCIPAL * 100);

        const loans = after.campaign!.loans ?? [];
        expect(loans.length, 'exactly one loan SHALL be appended').toBe(
          loansBefore + 1,
        );
        const loan = loans[loans.length - 1];
        expect(loan.principal, 'the loan SHALL record the principal').toBe(
          LOAN_PRINCIPAL,
        );
        expect(
          loan.dailyRepayment,
          'dailyRepayment SHALL be fixed positive at creation',
        ).toBeGreaterThan(0);

        const disbursements = after.campaign!.finances.transactions.filter(
          (tx) => tx.type === 'loan_disbursement',
        );
        expect(
          disbursements.length,
          'a LoanDisbursement transaction SHALL post',
        ).toBeGreaterThan(0);
        expect(
          disbursements[disbursements.length - 1].amount.cents,
          'the disbursement SHALL carry the principal',
        ).toBe(LOAN_PRINCIPAL * 100);
      } finally {
        await deleteCampaign(page, campaignId);
      }
    });
  },
);
