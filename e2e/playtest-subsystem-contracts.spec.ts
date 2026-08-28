/**
 * W6 Group 4 — Contract Market subsystem write-flow validation
 *
 * Drives the accept flow at /gameplay/campaigns/[id]/contract-market over
 * the page's own deterministic auto-seed (`generateAtBContracts` on first
 * open; manual seeding is impossible for this surface — offers carry live
 * `Money` instances). Renders the grid (the original render assertion),
 * accepts the first offer, and hard-asserts the observable effects of
 * `campaignCommandActions.acceptContractOffer`:
 *   - the contract lands in `campaign.missions` with status `Active`
 *     (`acceptContract` semantics — the status transition, read via a
 *     read-only page evaluate because `missions` is a Map and does not
 *     survive JSON serialization)
 *   - the accepted offer leaves the market pool (store) and its card
 *     leaves the grid (UI feedback)
 */

import { test, expect } from '@playwright/test';

import { createTestCampaign, deleteCampaign } from './fixtures/campaign';
import { gotoWithRetry } from './helpers/navigation';

test.setTimeout(120_000);

/**
 * Read-only snapshot of the contract surfaces this spec asserts on.
 * `missions` is a Map in the store — serialize what we need by hand.
 */
async function readContractState(
  page: import('@playwright/test').Page,
  offerId: string,
): Promise<{
  missionStatus: string | null;
  offerIds: readonly string[];
}> {
  return page.evaluate((id) => {
    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          campaign?: {
            getState: () => {
              campaign: {
                missions: Map<string, { status: string }>;
                contractMarket?: { offers: ReadonlyArray<{ id: string }> };
              } | null;
            };
          };
        };
      }
    ).__ZUSTAND_STORES__;
    const campaign = stores?.campaign?.getState().campaign;
    if (!campaign) return { missionStatus: null, offerIds: [] };
    return {
      missionStatus: campaign.missions.get(id)?.status ?? null,
      offerIds: (campaign.contractMarket?.offers ?? []).map(
        (offer) => offer.id,
      ),
    };
  }, offerId);
}

test.describe(
  'Wave 6.1.C — Contract Market subsystem',
  { tag: ['@subsystem:economy'] },
  () => {
    test('accept flow activates the contract and removes the offer', async ({
      page,
    }) => {
      await page.goto('/gameplay/campaigns');
      await page.waitForLoadState('domcontentloaded');

      const campaignId = await createTestCampaign(page, {
        name: 'Subsystem Contracts',
      });

      try {
        await gotoWithRetry(
          page,
          `/gameplay/campaigns/${campaignId}/contract-market`,
        );

        const grid = page.getByTestId('contract-market-grid');
        await expect(
          grid,
          'contract market grid SHALL render with auto-seeded offers',
        ).toBeVisible({ timeout: 10_000 });

        const firstCard = page.locator('[data-testid^="offer-card-"]').first();
        await expect(firstCard, 'an offer card SHALL render').toBeVisible();
        const cardTestId = await firstCard.getAttribute('data-testid');
        const offerId = cardTestId!.replace('offer-card-', '');

        const before = await readContractState(page, offerId);
        expect(
          before.offerIds,
          'the offer SHALL be on the market before accept',
        ).toContain(offerId);
        expect(
          before.missionStatus,
          'the contract SHALL NOT be a mission before accept',
        ).toBeNull();

        await page.getByTestId(`offer-accept-${offerId}`).click();

        // UI feedback: the accepted offer's card leaves the grid.
        await expect(
          page.getByTestId(`offer-card-${offerId}`),
          'the accepted offer card SHALL leave the grid',
        ).toBeHidden({ timeout: 10_000 });

        const after = await readContractState(page, offerId);
        expect(
          after.missionStatus,
          'the accepted contract SHALL transition to Active',
        ).toBe('Active');
        expect(
          after.offerIds,
          'the accepted offer SHALL leave the market pool',
        ).not.toContain(offerId);
      } finally {
        await deleteCampaign(page, campaignId);
      }
    });
  },
);
