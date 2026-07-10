/**
 * Reusable campaign UI flow sequences for journey and flow-audit coverage.
 *
 * Each helper records the same strict user-visible steps the deep-play audit
 * uses today. Callers may adapt `step` to a normal walkthrough step or a
 * future checkpoint recorder, while the UI actions and their ordering remain
 * shared.
 */

import { expect, type Locator, type Page } from '@playwright/test';

import { assertNoMekStationLoading } from './wait';

export const CAMPAIGN_ROSTER_SIZE = 4;

/**
 * Minimal recorder contract shared by the deep-play driver and future flow
 * audit adapters. All sequences below are intentionally strict steps.
 */
export interface CampaignFlowRecorder {
  step(title: string, action: (page: Page) => Promise<void>): Promise<number>;
}

export interface CampaignWizardOptions {
  readonly name: string;
  readonly description: string;
  readonly rosterSize?: number;
}

export interface CampaignResult {
  readonly campaignId: string;
  readonly campaignUrl: string;
}

export interface ContractAcceptOptions {
  readonly campaignId: string;
}

export interface MissionLaunchOptions {
  readonly rosterSize?: number;
}

export interface MissionLaunchObservation {
  readonly selectedUnitCount: number;
  readonly preBattleUrl: string;
  readonly encounterId: string;
  readonly playerForceText: string;
  readonly playerUnitListCount: number;
  readonly playerForceBvText: string | null;
}

export interface MissionLaunchResult {
  readonly step: number;
  readonly observation: MissionLaunchObservation;
}

/**
 * Create a campaign through the wizard and leave the browser on its dashboard.
 * Assumes the app can create a standard mercenary campaign from the campaign
 * list; leaves a complete, unsaved campaign selected in the UI.
 */
export async function createCampaignViaWizard(
  recorder: CampaignFlowRecorder,
  page: Page,
  options: CampaignWizardOptions,
): Promise<CampaignResult> {
  const rosterSize = options.rosterSize ?? CAMPAIGN_ROSTER_SIZE;

  await recorder.step('open campaign list', async () => {
    await page.goto('/gameplay/campaigns');
    await expect(page.getByTestId('create-campaign-btn')).toBeVisible({
      timeout: 20_000,
    });
    await assertNoMekStationLoading(page);
  });

  await recorder.step('start campaign wizard', async () => {
    await page.getByTestId('create-campaign-btn').click();
    await expect(page.getByTestId('campaign-name-input')).toBeVisible({
      timeout: 20_000,
    });
  });

  await recorder.step('name campaign', async () => {
    await page.getByTestId('campaign-name-input').fill(options.name);
    await page
      .getByTestId('campaign-description-input')
      .fill(options.description);
    await page.getByTestId('wizard-next-btn').click();
    await expect(
      page.getByRole('heading', { name: 'Campaign Type' }),
    ).toBeVisible();
  });

  await recorder.step('keep default mercenary campaign type', async () => {
    await page.getByTestId('wizard-next-btn').click();
    await expect(
      page.getByRole('heading', { name: 'Campaign Preset' }),
    ).toBeVisible();
  });

  await recorder.step('keep standard campaign preset', async () => {
    await page.getByTestId('wizard-next-btn').click();
    await expect(
      page.getByRole('heading', { name: 'Configure Roster' }),
    ).toBeVisible();
  });

  await recorder.step('add four units and four assigned pilots', async () => {
    const addUnitButtons = page.locator('[data-testid^="add-unit-"]');
    await expect(addUnitButtons.first()).toBeVisible({ timeout: 10_000 });
    const availableUnitButtons = await addUnitButtons.count();
    for (let index = 0; index < rosterSize; index += 1) {
      await addUnitButtons.nth(index % availableUnitButtons).click();
    }
    for (let index = 0; index < rosterSize; index += 1) {
      await page.getByTestId('add-pilot-btn').click();
    }

    const unitPilotSelects = page.locator('select');
    await expect(unitPilotSelects).toHaveCount(rosterSize);
    for (let index = 0; index < rosterSize; index += 1) {
      await unitPilotSelects.nth(index).selectOption({ index: index + 1 });
    }

    await page.getByTestId('wizard-next-btn').click();
    await expect(
      page.getByRole('heading', { name: 'Review Campaign' }),
    ).toBeVisible();
  });

  await recorder.step(
    'submit campaign wizard and land on dashboard',
    async () => {
      await page.getByTestId('wizard-submit-btn').click();
      await expect(page).toHaveURL(/\/gameplay\/campaigns\/[^/]+$/, {
        timeout: 30_000,
      });
      await expect(page.getByTestId('campaign-save-status-card')).toBeVisible({
        timeout: 20_000,
      });
      await assertNoMekStationLoading(page);
    },
  );

  return {
    campaignId: campaignIdFromUrl(page),
    campaignUrl: page.url(),
  };
}

/**
 * Navigate a campaign to its contract market and wait for the offer grid to
 * render. Split out of `acceptContractAndOpenLaunch` (design D1's "flow
 * helpers drift from journey specs" risk) so checkpoint-based callers (flow
 * audits) and step-based callers (umbrella journeys) share this exact action
 * body instead of each re-implementing it.
 */
export async function openContractMarketAction(
  page: Page,
  campaignId: string,
): Promise<void> {
  await page.goto(`/gameplay/campaigns/${campaignId}/contract-market`);
  await expect(page.getByTestId('contract-market-grid')).toBeVisible({
    timeout: 20_000,
  });
}

/** Click the first available contract offer's accept button. */
export async function acceptFirstContractAction(page: Page): Promise<void> {
  const acceptButton = page.locator('[data-testid^="offer-accept-"]').first();
  await expect(acceptButton).toBeVisible({ timeout: 20_000 });
  await acceptButton.click();
  await page.waitForTimeout(1_000);
}

/** Navigate to a campaign's mission list and wait for at least one mission card. */
export async function openMissionListAction(
  page: Page,
  campaignId: string,
): Promise<void> {
  await page.goto(`/gameplay/campaigns/${campaignId}/missions`);
  await expect(
    page.locator('[data-testid^="mission-card-"]').first(),
  ).toBeVisible({
    timeout: 20_000,
  });
}

/** Click the first mission's launch control and wait for the launch briefing. */
export async function openLaunchBriefingAction(page: Page): Promise<void> {
  const launch = page.locator('[data-testid^="mission-launch-"]').first();
  await expect(launch).toBeVisible({ timeout: 20_000 });
  await launch.click();
  await expect(page.getByTestId('mission-launch-briefing')).toBeVisible({
    timeout: 20_000,
  });
}

/**
 * Accept the first market contract and leave the browser at its mission launch
 * briefing. Assumes the supplied campaign has a renderable contract market.
 * Composed from the four action bodies above (no behavior change from the
 * pre-split version — same steps, same order, same recorder calls).
 */
export async function acceptContractAndOpenLaunch(
  recorder: CampaignFlowRecorder,
  page: Page,
  options: ContractAcceptOptions,
): Promise<void> {
  await recorder.step('open contract market', () =>
    openContractMarketAction(page, options.campaignId),
  );
  await recorder.step('accept first available contract', () =>
    acceptFirstContractAction(page),
  );
  await recorder.step('open campaign missions', () =>
    openMissionListAction(page, options.campaignId),
  );
  await recorder.step('open mission launch briefing', () =>
    openLaunchBriefingAction(page),
  );
}

/**
 * Select the available roster and launch to pre-battle. Assumes the mission
 * launch briefing is already open; leaves the browser on the pre-battle page.
 */
export async function launchMissionToPreBattle(
  recorder: CampaignFlowRecorder,
  page: Page,
  options: MissionLaunchOptions = {},
): Promise<MissionLaunchResult> {
  const rosterSize = options.rosterSize ?? CAMPAIGN_ROSTER_SIZE;
  let observation: MissionLaunchObservation | null = null;
  const step = await recorder.step(
    'select roster and launch mission to pre-battle',
    async () => {
      await selectAvailableRoster(page, rosterSize);
      const selectedUnitCount = await selectedRosterCount(page);
      await page.getByTestId('launch-mission-direct').click();
      await expect(page).toHaveURL(/\/gameplay\/encounters\/[^/]+/, {
        timeout: 30_000,
      });
      if (!(await isVisible(page.getByTestId('pre-battle-page')))) {
        await page.getByRole('button', { name: 'Launch Battle' }).click();
      }
      await expect(page).toHaveURL(
        /\/gameplay\/encounters\/[^/]+\/pre-battle/,
        {
          timeout: 30_000,
        },
      );
      await expect(page.getByTestId('pre-battle-page')).toBeVisible({
        timeout: 20_000,
      });
      const playerForce = page.getByTestId('player-force-card');
      await expect(playerForce).toBeVisible({ timeout: 20_000 });
      const playerUnitListCount = await page
        .getByTestId('player-unit-list')
        .locator('> div')
        .count();
      observation = {
        selectedUnitCount,
        preBattleUrl: page.url(),
        encounterId: encounterIdFromUrl(page),
        playerForceText: (await playerForce.textContent())?.trim() ?? '',
        playerUnitListCount,
        playerForceBvText: await locatorText(
          page.getByTestId('player-force-bv'),
        ),
      };
    },
  );

  if (!observation) {
    throw new Error('Mission launch observation was not captured');
  }
  return { step, observation };
}

function campaignIdFromUrl(page: Page): string {
  const match = page.url().match(/\/gameplay\/campaigns\/([^/?#]+)/);
  if (!match) {
    throw new Error(`Could not read campaign id from ${page.url()}`);
  }
  return decodeURIComponent(match[1]);
}

function encounterIdFromUrl(page: Page): string {
  const match = page
    .url()
    .match(/\/gameplay\/encounters\/([^/?#]+)(?:\/pre-battle)?/);
  if (!match) {
    throw new Error(`Could not read encounter id from ${page.url()}`);
  }
  return decodeURIComponent(match[1]);
}

async function locatorText(locator: Locator): Promise<string | null> {
  if ((await locator.count()) === 0) return null;
  const text = await locator.first().textContent();
  return text?.trim() ?? null;
}

async function isVisible(locator: Locator): Promise<boolean> {
  if ((await locator.count()) === 0) return false;
  return locator.first().isVisible();
}

async function selectAvailableRoster(
  page: Page,
  desiredCount: number,
): Promise<void> {
  await expect(page.getByTestId('mission-readiness-panel')).toBeVisible({
    timeout: 20_000,
  });
  const checkboxes = page
    .getByTestId('mission-readiness-panel')
    .locator('input[type="checkbox"]');
  const count = await checkboxes.count();
  const limit = Math.min(count, desiredCount);
  for (let index = 0; index < limit; index += 1) {
    const checkbox = checkboxes.nth(index);
    if ((await checkbox.isEnabled()) && !(await checkbox.isChecked())) {
      await checkbox.check();
    }
  }
}

async function selectedRosterCount(page: Page): Promise<number> {
  const checkboxes = page
    .getByTestId('mission-readiness-panel')
    .locator('input[type="checkbox"]');
  const count = await checkboxes.count();
  let selected = 0;
  for (let index = 0; index < count; index += 1) {
    if (await checkboxes.nth(index).isChecked()) {
      selected += 1;
    }
  }
  return selected;
}
