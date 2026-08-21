/**
 * W6 Group 4 — Hiring Hall subsystem write-flow validation
 *
 * Drives the full hire write flow at /gameplay/campaigns/[id]/hiring over
 * the seeded PRE-hire market (`seedHiringHall` — the correct pre-action
 * state; the W4 personnel pack's genesis is post-hire and is deliberately
 * NOT consumed, design D6). Renders the candidate grid (the original
 * render assertion), clicks the hire affordance, and hard-asserts the
 * observable effects of `campaignCommandActions.hireCandidate`:
 *   - the roster gains exactly one entry with the hired candidate's id
 *     (`hired-<offerId>`, campaignRoster store read)
 *   - the ledger is debited the hire cost (cross-subsystem propagation)
 *   - the hired candidate's card leaves the market grid (UI feedback)
 */

import { test, expect } from '@playwright/test';

import { createTestCampaign, deleteCampaign } from './fixtures/campaign';
import { seedHiringHall } from './helpers/campaignSeeders';
import { gotoWithRetry } from './helpers/navigation';
import { getStoreState } from './helpers/store';

test.setTimeout(120_000);

const OFFER_ID = 'hire-offer-test-1';
const HIRE_COST = 5_000;

/** Serialized (page-evaluate) views of the stores this spec reads. */
interface ICampaignRosterState {
  readonly pilots: ReadonlyArray<{ readonly pilotId: string }>;
}
interface ICampaignFinancesState {
  readonly campaign: {
    readonly finances: {
      readonly balance: { readonly cents: number };
      readonly transactions: ReadonlyArray<{
        readonly type: string;
        readonly amount: { readonly cents: number };
      }>;
    };
  } | null;
}

test.describe(
  'Wave 6.1.C — Hiring Hall subsystem',
  { tag: ['@subsystem:personnel'] },
  () => {
    test('hire write flow adds the recruit and debits the ledger', async ({
      page,
    }) => {
      await page.goto('/gameplay/campaigns');
      await page.waitForLoadState('domcontentloaded');

      const campaignId = await createTestCampaign(page, {
        name: 'Subsystem Hiring',
      });

      try {
        await gotoWithRetry(page, `/gameplay/campaigns/${campaignId}/hiring`);

        // Seed the pre-hire market deterministically (the page's own
        // auto-seed depends on `generatePersonnelForDay` rng output).
        await seedHiringHall(page, [
          {
            offerId: OFFER_ID,
            pilotName: 'Test Pilot Alpha',
            hireBonus: HIRE_COST,
          },
        ]);

        // Re-navigate so the seeded market is read on first paint.
        await gotoWithRetry(page, `/gameplay/campaigns/${campaignId}/hiring`);

        const grid = page.getByTestId('hiring-panel-grid');
        await expect(grid, 'hiring panel grid SHALL render').toBeVisible({
          timeout: 10_000,
        });
        const hireButton = page.getByTestId(`candidate-hire-${OFFER_ID}`);
        await expect(
          hireButton,
          'the seeded candidate SHALL render a hire affordance',
        ).toBeVisible({ timeout: 10_000 });

        const rosterBefore = await getStoreState<ICampaignRosterState>(
          page,
          'campaignRoster',
        );
        const financesBefore = await getStoreState<ICampaignFinancesState>(
          page,
          'campaign',
        );
        expect(financesBefore.campaign).not.toBeNull();
        const balanceBefore = financesBefore.campaign!.finances.balance.cents;

        await hireButton.click();

        // UI feedback: the hired candidate's card leaves the market grid.
        await expect(
          hireButton,
          'the hired candidate SHALL leave the market grid',
        ).toBeHidden({ timeout: 10_000 });

        const rosterAfter = await getStoreState<ICampaignRosterState>(
          page,
          'campaignRoster',
        );
        expect(
          rosterAfter.pilots.length,
          'the roster SHALL gain exactly one entry',
        ).toBe(rosterBefore.pilots.length + 1);
        expect(
          rosterAfter.pilots.some(
            (pilot) => pilot.pilotId === `hired-${OFFER_ID}`,
          ),
          'the hired candidate id SHALL be present in the roster',
        ).toBe(true);

        const financesAfter = await getStoreState<ICampaignFinancesState>(
          page,
          'campaign',
        );
        const balanceAfter = financesAfter.campaign!.finances.balance.cents;
        expect(
          balanceBefore - balanceAfter,
          'the ledger SHALL be debited exactly the hire cost',
        ).toBe(HIRE_COST * 100);
      } finally {
        await deleteCampaign(page, campaignId);
      }
    });
  },
);
