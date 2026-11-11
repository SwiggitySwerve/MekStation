/**
 * Reusable campaign UI flow sequences for journey and flow-audit coverage.
 *
 * Each helper records the same strict user-visible steps the deep-play audit
 * uses today. Callers may adapt `step` to a normal walkthrough step or a
 * future checkpoint recorder, while the UI actions and their ordering remain
 * shared.
 */

import {
  expect,
  type Locator,
  type Page,
  type Request,
  type Response,
} from '@playwright/test';

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
    await page.waitForFunction(
      () => (window as { __E2E_MODE__?: boolean }).__E2E_MODE__ === true,
      undefined,
      { timeout: 15_000 },
    );
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
      await submitCampaignWizard(page);
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

/** Require a successful save and a real dashboard before inspecting its widgets. */
export async function submitCampaignWizard(page: Page): Promise<void> {
  const isCampaignSave = (request: Request) =>
    request.method() === 'PUT' &&
    /\/api\/campaigns\/[^/?]+$/.test(new URL(request.url()).pathname);
  let saveStarted = false;
  const onRequest = (request: Request) => {
    if (isCampaignSave(request)) saveStarted = true;
  };
  page.on('request', onRequest);
  // Playwright's response and URL waits have no abort option. Own their
  // listeners/timers so a losing wait cannot consume the caller's test budget.
  let cancelSave: (() => void) | undefined;
  const saved = new Promise<void>((resolve, reject) => {
    let finished = false;
    const finish = (settle: () => void) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      page.off('response', onResponse);
      page.off('close', onClose);
      settle();
    };
    const onResponse = (response: Response) => {
      if (!isCampaignSave(response.request())) return;
      page.off('response', onResponse);
      if (response.ok()) finish(resolve);
      else {
        void response.text().then(
          (body) =>
            finish(() =>
              reject(
                new Error(
                  `Campaign create save failed: PUT ${response.url()} returned ${response.status()}\n${body}`,
                ),
              ),
            ),
          (error: unknown) => finish(() => reject(error)),
        );
      }
    };
    const onClose = () =>
      finish(() =>
        reject(
          new Error('Campaign create page closed before submission completed'),
        ),
      );
    const timer = setTimeout(
      () =>
        finish(() =>
          reject(new Error('Campaign create save timed out after 30000ms')),
        ),
      30_000,
    );
    cancelSave = () => finish(resolve);
    page.on('response', onResponse);
    page.on('close', onClose);
  });
  const errorLocator = page.getByTestId('name-error');
  const submissionDeadline = Date.now() + 30_000;
  let stopped = false;
  let wakeProbe: (() => void) | undefined;
  const dashboard = (async () => {
    while (!stopped) {
      if (
        /\/gameplay\/campaigns\/(?!create(?:[/?#]|$))[^/?#]+\/?(?:[?#].*)?$/.test(
          page.url(),
        )
      ) {
        return;
      }
      const visible = await errorLocator.isVisible();
      if (stopped) return;
      if (visible) {
        // Once a PUT starts, its status/body owns the diagnostic. The inline
        // error can render before response.text() finishes reading that body.
        if (saveStarted) await saved;
        if (stopped) return;
        // The error can disappear after isVisible. Unlike innerText, this
        // probe does not retry a missing element and create another long wait.
        const [message] = await errorLocator.allInnerTexts();
        if (stopped) return;
        if (message !== undefined) {
          throw new Error(`Campaign create failed: ${message}`);
        }
      }
      const remaining = submissionDeadline - Date.now();
      if (remaining <= 0) {
        throw new Error('Campaign create dashboard timed out after 30000ms');
      }
      // URL reads are synchronous and isVisible does not retry. Only an
      // already-started locator probe needs draining after this pause stops.
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, Math.min(100, remaining));
        wakeProbe = () => {
          clearTimeout(timer);
          resolve();
        };
      });
      wakeProbe = undefined;
    }
  })();
  // Install all rejection handlers before clicking: a fast failed PUT must
  // surface its status/body, and a local save error may precede any request.
  const completed = Promise.all([saved, dashboard]);
  let clicked: Promise<void> | undefined;
  try {
    clicked = page.getByTestId('wizard-submit-btn').click();
    await Promise.all([completed, clicked]);
  } finally {
    stopped = true;
    wakeProbe?.();
    cancelSave?.();
    page.off('request', onRequest);
    // All losing waits are stopped before draining in-flight work. Preserve
    // the winning error and leave the caller's page open for its assertions.
    await Promise.allSettled([saved, dashboard, completed, clicked]);
  }
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
  // The accept is a client-side store mutation whose debounced auto-save
  // (AUTO_SAVE_DEBOUNCE_MS = 2s) must land BEFORE the next hard
  // navigation: the campaign-authority hydration rules refetch-replace a
  // rehydrated-but-unvalidated cache, so an un-PUT-ed accept is discarded
  // on reload. Wait for the PUT to return instead of sleeping a fixed
  // interval shorter than the debounce (the old 1s wait raced it).
  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === 'PUT' &&
      response.url().includes('/api/campaigns/') &&
      response.ok(),
    { timeout: 30_000 },
  );
  await acceptButton.click();
  await saved;
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

type CreateCampaign = (
  name: string,
  factionId: string,
  options?: { startingFunds?: number },
) => string;

type CampaignStoreWindow = {
  __ZUSTAND_STORES__?: {
    campaign?: { getState: () => { createCampaign: CreateCampaign } };
    campaignPersistence?: {
      getState: () => {
        legacyUnadopted: boolean;
        adoptLegacyCampaign: () => Promise<boolean>;
      };
    };
  };
};

/** The dashboard's rendered campaign date, read from the header block. */
export function campaignDateText(page: Page): Promise<string> {
  return page.locator('p:has-text("Current Date") + p').innerText();
}

/** Load a campaign dashboard and wait for its save-status card. */
export async function openDashboard(
  page: Page,
  campaignId: string,
): Promise<void> {
  await page.goto(`/gameplay/campaigns/${campaignId}`);
  await expect(page.getByTestId('campaign-save-status-card')).toBeVisible({
    timeout: 20_000,
  });
}

/**
 * Seed a campaign through the exposed store and adopt it, so the row exists
 * server-side and the copy is NOT `legacyUnadopted` — an unadopted copy is a
 * case both the ordinary save and the flush deliberately decline, not the
 * case under test. Adoption, not the dashboard's "Save now": that button
 * routes to `saveCampaign`, which skips an unadopted copy by design.
 */
export async function seedSavedCampaign(
  page: Page,
  label: string,
): Promise<string> {
  await page.goto('/gameplay/campaigns');
  await page.waitForFunction(
    () => Boolean((window as CampaignStoreWindow).__ZUSTAND_STORES__?.campaign),
    undefined,
    { timeout: 20_000 },
  );
  const campaignId = await page.evaluate((name: string) => {
    const store = (window as CampaignStoreWindow).__ZUSTAND_STORES__?.campaign;
    if (!store) throw new Error('campaign store is not exposed');
    return store
      .getState()
      .createCampaign(name, 'mercenary', { startingFunds: 3_000_000 });
  }, `${label} ${Date.now()}`);
  await openDashboard(page, campaignId);
  // Polled rather than fired once: the dashboard's route loader raises
  // `legacyUnadopted` asynchronously, so an adopt attempted before that
  // load lands is a no-op. The server row is the condition, not the call.
  await expect
    .poll(
      async () => {
        await page.evaluate(async () => {
          const store = (window as CampaignStoreWindow).__ZUSTAND_STORES__
            ?.campaignPersistence;
          if (store?.getState().legacyUnadopted) {
            await store.getState().adoptLegacyCampaign();
          }
        });
        return (
          await page.request.get(`/api/campaigns/${campaignId}`)
        ).status();
      },
      { timeout: 30_000 },
    )
    .toBe(200);
  return campaignId;
}

/** Advance the campaign one day and wait for the header to show the change. */
export async function advanceDayInUi(page: Page): Promise<string> {
  const before = await campaignDateText(page);
  await page.getByTestId('advance-day-btn').click();
  await expect
    .poll(() => campaignDateText(page), { timeout: 10_000 })
    .not.toBe(before);
  return campaignDateText(page);
}
