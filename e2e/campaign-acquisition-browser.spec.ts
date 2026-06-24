/**
 * Strict Campaign Acquisition Browser Proof
 *
 * Browser-drives the acquisition shopping-list UI: add a request, survive a
 * route reload, process a due delivery through the campaign day pipeline, and
 * prove the delivered part materializes into acquisition inventory.
 *
 * @tags @campaign @economy @strict
 */

import { expect, test, type Page } from '@playwright/test';

interface SeededAcquisitionCampaign {
  readonly campaignId: string;
  readonly dueRequestId: string;
  readonly duePartId: string;
  readonly addedRequestId: string;
}

async function waitForCampaignStoresReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const win = window as unknown as {
        __ZUSTAND_STORES__?: { campaign?: unknown };
      };
      return Boolean(win.__ZUSTAND_STORES__?.campaign);
    },
    { timeout: 15_000 },
  );
}

async function seedAcquisitionCampaign(
  page: Page,
): Promise<SeededAcquisitionCampaign> {
  await waitForCampaignStoresReady(page);

  return page.evaluate(() => {
    type StoreApi = {
      getState: () => Record<string, any>;
    };
    type ExposedStore = StoreApi | (() => StoreApi);
    const resolveStore = (store: ExposedStore): StoreApi =>
      typeof (store as StoreApi).getState === 'function'
        ? (store as StoreApi)
        : (store as () => StoreApi)();

    const campaignStore = resolveStore(
      (
        window as unknown as {
          __ZUSTAND_STORES__?: { campaign?: ExposedStore };
        }
      ).__ZUSTAND_STORES__?.campaign as ExposedStore,
    );
    const campaignState = campaignStore.getState();
    const campaignId = campaignState.createCampaign(
      'E2E Acquisition Company',
      'mercenary',
      {
        startingFunds: 1_500_000,
        useAcquisitionSystem: true,
        acquisitionTransitUnit: 'day',
      },
    );

    const currentDate = '3025-02-01T00:00:00.000Z';
    const dueRequestId = 'req-e2e-srm-ammo';
    const duePartId = 'srm-ammo';
    campaignState.updateCampaign({
      currentDate: new Date(currentDate),
      shoppingList: {
        items: [
          {
            id: dueRequestId,
            partId: duePartId,
            partName: 'SRM Ammo',
            quantity: 2,
            availability: 'C',
            isConsumable: true,
            status: 'in_transit',
            orderedDate: '3025-01-30T00:00:00.000Z',
            deliveryDate: currentDate,
            attempts: 1,
            lastAttemptDate: '3025-01-30T00:00:00.000Z',
          },
        ],
      },
      partsInventory: [],
    });

    return {
      campaignId,
      dueRequestId,
      duePartId,
      addedRequestId: `req-${campaignId}-ppc-1`,
    };
  });
}

test.describe('campaign acquisition browser proof', () => {
  test(
    'adds, reloads, processes, and persists acquisition shopping-list delivery',
    { tag: ['@campaign', '@economy', '@strict'] },
    async ({ page }) => {
      const pageErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));

      await page.goto('/gameplay/campaigns');
      const seeded = await seedAcquisitionCampaign(page);

      await page.goto(`/gameplay/campaigns/${seeded.campaignId}/acquisitions`);
      await expect(page.getByTestId('acquisitions-panel')).toBeVisible({
        timeout: 20_000,
      });
      await expect(
        page.getByRole('link', { name: 'Acquisitions' }),
      ).toHaveAttribute('aria-current', 'page');
      await expect(
        page.getByTestId(`acquisition-status-${seeded.dueRequestId}`),
      ).toContainText('in transit');
      await expect(
        page.getByTestId('acquisitions-transit-count'),
      ).toContainText('1');

      await page.getByTestId('acquisition-part-name').fill('PPC');
      await page.getByTestId('acquisition-quantity').fill('2');
      await page.getByTestId('acquisition-availability').selectOption('E');
      await page.getByTestId('acquisition-add-request').click();
      await expect(
        page.getByTestId(`acquisition-request-${seeded.addedRequestId}`),
      ).toContainText('PPC');
      await expect(
        page.getByTestId(`acquisition-status-${seeded.addedRequestId}`),
      ).toContainText('pending');
      await expect(
        page.getByTestId('acquisitions-pending-count'),
      ).toContainText('1');

      await page.reload({ waitUntil: 'networkidle' });
      await waitForCampaignStoresReady(page);
      await expect(
        page.getByTestId(`acquisition-status-${seeded.dueRequestId}`),
      ).toContainText('in transit');
      await expect(
        page.getByTestId(`acquisition-status-${seeded.addedRequestId}`),
      ).toContainText('pending');

      await page.getByTestId('acquisitions-advance-day').click();
      await expect(
        page.getByTestId(`acquisition-status-${seeded.dueRequestId}`),
      ).toContainText('delivered');
      await expect(
        page.getByTestId(`acquisition-inventory-${seeded.duePartId}`),
      ).toContainText('SRM Ammo');
      await expect(
        page.getByTestId(`acquisition-inventory-qty-${seeded.duePartId}`),
      ).toContainText('x2');
      await expect(page.getByTestId('acquisition-current-date')).toContainText(
        '3025-02-02',
      );

      await page.reload({ waitUntil: 'networkidle' });
      await waitForCampaignStoresReady(page);
      await expect(
        page.getByTestId(`acquisition-status-${seeded.dueRequestId}`),
      ).toContainText('delivered');
      await expect(
        page.getByTestId(`acquisition-inventory-qty-${seeded.duePartId}`),
      ).toContainText('x2');

      await page
        .getByTestId(`acquisition-remove-${seeded.dueRequestId}`)
        .click();
      await expect(
        page.getByTestId(`acquisition-request-${seeded.dueRequestId}`),
      ).toHaveCount(0);
      await expect(
        page.getByTestId(`acquisition-inventory-qty-${seeded.duePartId}`),
      ).toContainText('x2');

      expect(pageErrors).toEqual([]);
    },
  );
});
