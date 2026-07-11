/**
 * Strict organic campaign contract proof.
 *
 * Browser-drives the first release-signoff segment of the campaign loop:
 * create a campaign through the wizard, build a minimal roster, browse the
 * real contract market, accept an offer, and prove the accepted contract
 * survives a route reload.
 *
 * @tags @campaign @economy @strict
 */

import { expect, test, type Page } from '@playwright/test';

import { withBrowserDiagnostics } from './helpers';

interface CampaignContractSnapshot {
  readonly campaignId: string | null;
  readonly missionIds: readonly string[];
  readonly missionNames: readonly string[];
  readonly missionStatuses: readonly string[];
  readonly missionScenarioIds: readonly string[];
  readonly contractMarketOfferIds: readonly string[];
  readonly rosterUnitNames: readonly string[];
  readonly rosterPilotNames: readonly string[];
}

test.setTimeout(90_000);

async function waitForE2EHydration(page: Page): Promise<void> {
  await page.waitForFunction(
    () => (window as { __E2E_MODE__?: boolean }).__E2E_MODE__ === true,
    undefined,
    { timeout: 15_000 },
  );
}

async function createCampaignViaWizard(page: Page): Promise<string> {
  const campaignName = `E2E Organic Contract ${Date.now()}`;

  await page.goto('/gameplay/campaigns/create');
  await waitForE2EHydration(page);

  await page.getByTestId('campaign-name-input').fill(campaignName);
  await page
    .getByTestId('campaign-description-input')
    .fill('Strict browser proof for campaign contract acceptance.');

  await page.getByTestId('wizard-next-btn').click();
  await expect(page.getByText('Campaign Type')).toBeVisible();

  await page.getByTestId('wizard-next-btn').click();
  await expect(page.getByText('Campaign Preset')).toBeVisible();

  await page.getByTestId('wizard-next-btn').click();
  await expect(page.getByText('Configure Roster')).toBeVisible();
  await page.getByTestId('add-unit-light-mech').click();
  await page.getByTestId('add-pilot-btn').click();
  await page.locator('select').first().selectOption({ index: 1 });

  await page.getByTestId('wizard-next-btn').click();
  await expect(page.getByText('Review Campaign')).toBeVisible();

  await page.getByTestId('wizard-submit-btn').click();
  await page.waitForURL(/\/gameplay\/campaigns\/[^/]+$/, {
    timeout: 20_000,
  });
  await expect(page.getByTestId('campaign-dashboard')).toBeVisible({
    timeout: 20_000,
  });
  // Post-#1035 the dashboard roster rehydrates from the server projection and
  // renders the resolved catalog identity, not the wizard's template label.
  // add-unit-light-mech deterministically adds Locust LCT-1V (pinned by
  // CreateCampaignPage.RosterStep.test.tsx).
  await expect(page.getByTestId('roster-unit-card')).toContainText(
    'Locust LCT-1V',
  );

  const match = page.url().match(/\/gameplay\/campaigns\/([^/?#]+)/);
  expect(match?.[1]).toBeTruthy();
  return match![1];
}

async function getCampaignContractSnapshot(
  page: Page,
): Promise<CampaignContractSnapshot> {
  return page.evaluate(() => {
    type StoreApi = {
      getState: () => Record<string, unknown>;
    };
    type ExposedStore = StoreApi | (() => StoreApi);
    type MissionRecord = {
      id?: unknown;
      name?: unknown;
      status?: unknown;
    };
    type CampaignRecord = {
      id?: unknown;
      missions?: unknown;
      contractMarket?: {
        offers?: readonly { id?: unknown }[];
      };
    };
    type RosterState = {
      units?: readonly { unitName?: unknown }[];
      pilots?: readonly { pilotName?: unknown }[];
    };

    const resolveStore = (raw: ExposedStore | undefined): StoreApi => {
      if (!raw) {
        throw new Error('Expected E2E store to be exposed');
      }
      return 'getState' in raw ? raw : raw();
    };

    const stores = (
      window as unknown as {
        __ZUSTAND_STORES__?: {
          campaign?: ExposedStore;
          campaignRoster?: ExposedStore;
        };
      }
    ).__ZUSTAND_STORES__;
    const campaignState = resolveStore(stores?.campaign).getState() as {
      getCampaign?: () => CampaignRecord | null;
    };
    const rosterState = resolveStore(stores?.campaignRoster).getState() as
      | RosterState
      | undefined;
    const campaign = campaignState.getCampaign?.() ?? null;
    const missions =
      campaign?.missions instanceof Map
        ? (Array.from(campaign.missions.values()) as MissionRecord[])
        : [];

    return {
      campaignId: typeof campaign?.id === 'string' ? campaign.id : null,
      missionIds: missions
        .map((mission) => mission.id)
        .filter((id): id is string => typeof id === 'string'),
      missionNames: missions
        .map((mission) => mission.name)
        .filter((name): name is string => typeof name === 'string'),
      missionStatuses: missions
        .map((mission) => mission.status)
        .filter((status): status is string => typeof status === 'string'),
      missionScenarioIds: missions.flatMap((mission) =>
        Array.isArray((mission as { scenarioIds?: unknown }).scenarioIds)
          ? ((mission as { scenarioIds: unknown[] }).scenarioIds.filter(
              (scenarioId): scenarioId is string =>
                typeof scenarioId === 'string',
            ) ?? [])
          : [],
      ),
      contractMarketOfferIds:
        campaign?.contractMarket?.offers
          ?.map((offer) => offer.id)
          .filter((id): id is string => typeof id === 'string') ?? [],
      rosterUnitNames:
        rosterState?.units
          ?.map((unit) => unit.unitName)
          .filter((name): name is string => typeof name === 'string') ?? [],
      rosterPilotNames:
        rosterState?.pilots
          ?.map((pilot) => pilot.pilotName)
          .filter((name): name is string => typeof name === 'string') ?? [],
    };
  });
}

test.describe('organic campaign contract acceptance', () => {
  test(
    'creates a rostered campaign, accepts a market contract, and reloads the accepted mission',
    { tag: ['@campaign', '@economy', '@strict'] },
    async ({ page }, testInfo) =>
      withBrowserDiagnostics(page, testInfo, async () => {
        const campaignId = await createCampaignViaWizard(page);

        const created = await getCampaignContractSnapshot(page);
        expect(created.campaignId).toBe(campaignId);
        expect(created.rosterUnitNames).toContain('Locust LCT-1V');
        expect(created.rosterPilotNames).toContain('MechWarrior 1');

        await page.getByTestId('quick-action-browse-contracts').click();
        await page.waitForURL(
          new RegExp(`/gameplay/campaigns/${campaignId}/contract-market$`),
          { timeout: 20_000 },
        );
        await expect(page.getByTestId('contract-market-grid')).toBeVisible({
          timeout: 20_000,
        });

        const firstOffer = page.locator('[data-testid^="offer-card-"]').first();
        await expect(firstOffer).toBeVisible();
        const offerTestId = await firstOffer.getAttribute('data-testid');
        const offerName = (
          await firstOffer.locator('h3').textContent()
        )?.trim();
        const offerId = offerTestId?.replace(/^offer-card-/, '');
        expect(offerId).toBeTruthy();
        expect(offerName).toBeTruthy();

        await page.getByTestId(`offer-accept-${offerId}`).click();
        await expect(page.getByTestId(`offer-card-${offerId}`)).toHaveCount(0);

        const accepted = await getCampaignContractSnapshot(page);
        expect(accepted.missionIds).toContain(offerId);
        expect(accepted.missionNames).toContain(offerName);
        expect(accepted.missionStatuses).toContain('Active');
        expect(accepted.contractMarketOfferIds).not.toContain(offerId);

        await page.goto(`/gameplay/campaigns/${campaignId}/missions`);
        await expect(page.getByTestId(`mission-card-${offerId}`)).toContainText(
          offerName!,
          {
            timeout: 20_000,
          },
        );
        await expect(
          page.getByTestId(`mission-status-${offerId}`),
        ).toContainText('Active');
        await expect(page.getByText(offerName!)).toBeVisible({
          timeout: 20_000,
        });

        await page.reload({ waitUntil: 'networkidle' });
        await waitForE2EHydration(page);
        await expect(page.getByTestId(`mission-card-${offerId}`)).toContainText(
          offerName!,
          {
            timeout: 20_000,
          },
        );
        await expect(
          page.getByTestId(`mission-status-${offerId}`),
        ).toContainText('Active');
        await expect(page.getByText(offerName!)).toBeVisible({
          timeout: 20_000,
        });

        const reloaded = await getCampaignContractSnapshot(page);
        expect(reloaded.campaignId).toBe(campaignId);
        expect(reloaded.missionIds).toContain(offerId);
        expect(reloaded.missionNames).toContain(offerName);
        expect(reloaded.contractMarketOfferIds).not.toContain(offerId);

        await page.goto(
          `/gameplay/campaigns/${campaignId}/missions/${offerId}/launch`,
        );
        await waitForE2EHydration(page);
        await expect(page.getByTestId('launch-mission-direct')).toBeVisible({
          timeout: 20_000,
        });
        await page.getByTestId('launch-mission-direct').click();
        await page.waitForURL(
          (url) =>
            url.pathname.startsWith('/gameplay/encounters/') &&
            url.searchParams.get('campaignId') === campaignId &&
            url.searchParams.get('missionId') === offerId,
          { timeout: 30_000 },
        );
        await expect(page.getByTestId('encounter-detail-page')).toBeVisible({
          timeout: 20_000,
        });
        await expect(page.getByTestId('launch-encounter-btn')).toBeEnabled({
          timeout: 20_000,
        });

        const encounterId = page
          .url()
          .match(/\/gameplay\/encounters\/([^/?#]+)/)?.[1];
        expect(encounterId).toBeTruthy();
        expect(encounterId).not.toBe(offerId);

        const materialized = await getCampaignContractSnapshot(page);
        expect(materialized.missionScenarioIds).toContain(encounterId);
      }),
  );
});
