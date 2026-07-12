/**
 * UX Deep-Play Audit - long-form campaign, multiplayer, and GM journeys.
 *
 * Run via `npm run qc:ux-audit:deep` (see scripts/qc/run-ux-walkthrough.mjs).
 * These tests keep setup/navigation strict and capture known-fragile product
 * outcomes through soft steps plus structured findings.
 */

import {
  expect,
  test,
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
} from '@playwright/test';

import {
  acceptContractAndOpenLaunch,
  CAMPAIGN_ROSTER_SIZE,
  createCampaignViaWizard,
  launchMissionToPreBattle,
  type MissionLaunchObservation,
} from './helpers/campaignFlow';
import {
  createWalkthroughRecorder,
  type WalkthroughRecorder,
  type WalkthroughFindingSeverity,
  type WalkthroughSoftStepOptions,
  type WalkthroughStepOptions,
} from './helpers/uxWalkthrough';
import { assertNoMekStationLoading } from './helpers/wait';

const RUN_ID_HEADER = 'x-playwright-e2e-run-id';
const HOST_PASSWORD = 'HostPassword123!';
const GUEST_PASSWORD = 'GuestPassword123!';

interface SeededIdentity {
  readonly id: string;
  readonly displayName: string;
}

interface TokenResponse {
  readonly token: string;
  readonly playerId: string;
  readonly displayName: string;
}

interface CreateMatchResponse {
  readonly matchId: string;
  readonly roomCode?: string;
  readonly meta: {
    readonly roomCode?: string;
    readonly config: { readonly fogOfWar?: boolean };
  };
}

interface CleanupMatch {
  readonly matchId: string;
  readonly wireToken: string;
}

interface TacticalObservation {
  readonly route: string;
  readonly phase: string | null;
  readonly terminalOutcome: string | null;
  readonly hasGameSession: boolean;
  readonly hasSpAdvance: boolean;
  readonly hasMovementComposer: boolean;
  readonly hasMovementLockIn: boolean;
  readonly errorText: string | null;
}

interface CoopJoinObservation {
  readonly hostCampaignId: string | null;
  readonly guestCampaignId: string | null;
  readonly roomCode: string | null;
  readonly hostBadge: string | null;
  readonly guestBadge: string | null;
  readonly joinError: string | null;
  readonly connected: boolean;
}

interface GuestLedgerObservation {
  readonly checked: boolean;
  readonly noticeVisible: boolean;
  readonly playerOnlyViewVisible: boolean;
  readonly playerLogVisible: boolean;
  readonly hiddenTextAbsent: boolean;
  readonly controlsAbsent: boolean;
  readonly privateLogAbsent: boolean;
  readonly navLinkAbsent: boolean;
  readonly gmSurfaceAfterReload: boolean;
  readonly survivedReload: boolean;
}

interface LobbyObservation {
  readonly alphaOccupied: boolean;
  readonly bravoOccupied: boolean;
  readonly alphaText: string;
  readonly bravoText: string;
}

interface CoopTokenCandidate {
  readonly matchId: string;
  readonly wireToken: string;
}

interface JourneyDriver {
  attachSurface(name: string, page: Page): void;
  step(
    title: string,
    action: (page: Page) => Promise<void>,
    options?: WalkthroughStepOptions,
  ): Promise<number>;
  softStep(
    title: string,
    action: (page: Page) => Promise<void>,
    options?: WalkthroughSoftStepOptions,
  ): Promise<number>;
  finding(input: {
    readonly id: string;
    readonly severity: WalkthroughFindingSeverity;
    readonly summary: string;
    readonly steps: readonly number[];
  }): void;
  note(text: string): void;
  finish(): void;
}

/** Create the shared recorder adapter with a local, monotonic journey index. */
function createJourneyDriver(recorder: WalkthroughRecorder): JourneyDriver {
  let nextStepIndex = 0;

  const nextStep = async (
    title: string,
    action: (page: Page) => Promise<void>,
    options?: WalkthroughStepOptions,
  ): Promise<number> => {
    nextStepIndex += 1;
    await recorder.step(title, action, options);
    return nextStepIndex;
  };

  const nextSoftStep = async (
    title: string,
    action: (page: Page) => Promise<void>,
    options?: WalkthroughSoftStepOptions,
  ): Promise<number> => {
    nextStepIndex += 1;
    await recorder.softStep(title, action, options);
    return nextStepIndex;
  };

  return {
    attachSurface: (name, page) => recorder.attachSurface(name, page),
    step: nextStep,
    softStep: nextSoftStep,
    finding: (input) => recorder.finding(input),
    note: (text) => recorder.note(text),
    finish: () => recorder.finish(),
  };
}

function e2eRunId(): string {
  const runId = process.env.PLAYWRIGHT_E2E_RUN_ID;
  if (!runId) {
    throw new Error('PLAYWRIGHT_E2E_RUN_ID missing from Playwright config');
  }
  return runId;
}

async function seedIdentity(
  request: APIRequestContext,
  displayName: string,
  password: string,
): Promise<SeededIdentity> {
  const response = await request.post('/api/e2e/vault-identity', {
    headers: { [RUN_ID_HEADER]: e2eRunId() },
    data: { displayName, password },
  });
  expect(response.status(), await response.text()).toBe(201);
  return (await response.json()) as SeededIdentity;
}

async function deleteIdentities(
  request: APIRequestContext,
  ids: readonly string[],
): Promise<void> {
  if (ids.length === 0) return;
  const response = await request.delete('/api/e2e/vault-identity', {
    headers: { [RUN_ID_HEADER]: e2eRunId() },
    data: { ids },
  });
  expect(response.status(), await response.text()).toBe(200);
}

async function deleteCreatedMatches(
  request: APIRequestContext,
  matches: readonly CleanupMatch[],
): Promise<void> {
  const unique = new Map<string, CleanupMatch>();
  for (const match of matches) {
    unique.set(match.matchId, match);
  }

  for (const match of Array.from(unique.values())) {
    const response = await request.delete(
      `/api/multiplayer/matches/${encodeURIComponent(match.matchId)}`,
      { headers: { Authorization: `Bearer ${match.wireToken}` } },
    );
    expect([200, 404].includes(response.status()), await response.text()).toBe(
      true,
    );
  }
}

async function openContextPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  return context.newPage();
}

async function closeContexts(
  contexts: readonly BrowserContext[],
): Promise<void> {
  for (const context of contexts) {
    await context.close();
  }
}

function campaignIdFromUrl(page: Page): string {
  const match = page.url().match(/\/gameplay\/campaigns\/([^/?#]+)/);
  if (!match) {
    throw new Error(`Could not read campaign id from ${page.url()}`);
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

async function waitBrieflyForVisible(
  locator: Locator,
  timeoutMs = 5_000,
): Promise<boolean> {
  try {
    await locator.first().waitFor({ state: 'visible', timeout: timeoutMs });
    return true;
  } catch {
    return false;
  }
}

async function terminalOutcomeText(page: Page): Promise<string | null> {
  const victoryOutcome = await locatorText(page.getByTestId('victory-outcome'));
  if (victoryOutcome !== null) return victoryOutcome;
  const completed = page.getByTestId('game-completed');
  if ((await completed.count()) === 0) return null;
  const text = await completed.first().innerText();
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized : null;
}

async function saveCampaignToServer(
  driver: JourneyDriver,
  page: Page,
): Promise<number> {
  return driver.step('save campaign to server', async () => {
    await expect(page.getByTestId('campaign-save-status-card')).toBeVisible({
      timeout: 20_000,
    });
    const saveNow = page.getByTestId('campaign-save-now-btn');
    if (await isVisible(saveNow)) {
      await saveNow.click();
    }
    await expect(page.getByTestId('campaign-save-status-card')).toContainText(
      /saved|server|sync|clean/i,
      { timeout: 30_000 },
    );
  });
}

function recordRosterHandoffFinding(
  driver: JourneyDriver,
  step: number,
  observation: MissionLaunchObservation,
): void {
  const text = `${observation.playerForceText} ${observation.playerForceBvText ?? ''}`;
  const selectedMany = observation.selectedUnitCount >= CAMPAIGN_ROSTER_SIZE;
  const collapsed =
    selectedMany &&
    (/1\s+unit/i.test(text) ||
      /0\s+Battle Value/i.test(text) ||
      observation.playerUnitListCount === 1);

  driver.finding({
    id: collapsed ? 'C4' : 'C4-STATUS',
    severity: collapsed ? 'major' : 'minor',
    summary: collapsed
      ? `Pre-battle roster handoff still collapses after ${observation.selectedUnitCount} selected units: ${text}`
      : `Pre-battle roster handoff did not show the prior one-unit collapse; ${observation.selectedUnitCount} selected units produced: ${text}`,
    steps: [step],
  });
}

async function observeTacticalSurface(
  page: Page,
): Promise<TacticalObservation> {
  const errorText =
    (await locatorText(
      page.getByText(
        /Not in movement phase|Unhandled Runtime Error|Application error|Error:/i,
      ),
    )) ?? null;
  return {
    route: page.url(),
    phase: await locatorText(page.getByTestId('phase-name')),
    terminalOutcome: await terminalOutcomeText(page),
    hasGameSession: await isVisible(page.getByTestId('game-session')),
    hasSpAdvance: await isVisible(page.getByTestId('sp-advance-phase-button')),
    hasMovementComposer: await isVisible(
      page.getByTestId('movement-intent-composer'),
    ),
    hasMovementLockIn: await isVisible(
      page.getByTestId('movement-lock-in-btn'),
    ),
    errorText,
  };
}

async function attemptManualBattleInteraction(
  page: Page,
): Promise<TacticalObservation> {
  await page.getByTestId('play-manually-btn').click();
  await page.waitForURL(/\/gameplay\/games\/[^/?#]+/, { timeout: 30_000 });
  await waitBrieflyForVisible(page.getByTestId('game-session'));

  const advance = page.getByTestId('sp-advance-phase-button');
  if (await isVisible(advance)) {
    await advance.click();
    await page.waitForTimeout(1_000);
  }

  const railUnit = page.locator('[data-testid^="rail-unit-"]').first();
  if (await isVisible(railUnit)) {
    await railUnit.click();
    await page.waitForTimeout(300);
  } else {
    const token = page.locator('[data-testid^="unit-token-"]').first();
    if (await isVisible(token)) {
      await token.click();
      await page.waitForTimeout(300);
    }
  }

  const hex = page
    .locator('[data-testid^="hex-overlay-"], [data-testid^="hex-"]')
    .first();
  if (await isVisible(hex)) {
    await hex.click({ force: true });
    await page.waitForTimeout(500);
  }

  const budget = page.locator('[data-testid^="budget-option-"]').first();
  if (await isVisible(budget)) {
    await budget.click();
    await page.waitForTimeout(300);
  }

  const lockIn = page.getByTestId('movement-lock-in-btn');
  if ((await isVisible(lockIn)) && (await lockIn.isEnabled())) {
    await lockIn.click();
    await page.waitForTimeout(1_000);
  }

  return observeTacticalSurface(page);
}

function recordManualBattleFinding(
  driver: JourneyDriver,
  step: number,
  observation: TacticalObservation,
): void {
  const signature = [
    observation.phase ? `phase=${observation.phase}` : 'phase unavailable',
    `spAdvance=${observation.hasSpAdvance}`,
    `composer=${observation.hasMovementComposer}`,
    `lockIn=${observation.hasMovementLockIn}`,
    observation.errorText
      ? `error=${observation.errorText}`
      : 'no movement error captured',
  ].join('; ');
  const reproduced =
    /not in movement phase|Unhandled Runtime Error|Application error/i.test(
      observation.errorText ?? '',
    ) ||
    (/initiative/i.test(observation.phase ?? '') && !observation.hasSpAdvance);

  driver.finding({
    id: reproduced ? 'C1' : 'C1-STATUS',
    severity: reproduced ? 'major' : 'minor',
    summary: reproduced
      ? `Manual battle attempt still shows the old initiative/movement blocker signature: ${signature}`
      : `Manual battle attempt reached a playable tactical state or a changed failure mode: ${signature}`,
    steps: [step],
  });
}

function recordStarmapFinding(
  driver: JourneyDriver,
  step: number,
  pageText: string,
): void {
  const crashed =
    /drawImage|canvas|Application error|Unhandled Runtime Error/i.test(
      pageText,
    );
  driver.finding({
    id: crashed ? 'C5' : 'C5-STATUS',
    severity: crashed ? 'major' : 'minor',
    summary: crashed
      ? `Starmap still exposes the canvas/error-boundary crash signature: ${pageText.slice(0, 240)}`
      : 'Starmap loaded during the deep-play sweep without the prior canvas crash signature.',
    steps: [step],
  });
}

async function sweepCampaignSurface(
  driver: JourneyDriver,
  page: Page,
  campaignId: string,
  title: string,
  route: string,
): Promise<void> {
  await driver.step(title, async () => {
    await page.goto(`/gameplay/campaigns/${campaignId}${route}`);
    await expect(page.getByTestId('page-title')).toBeVisible({
      timeout: 20_000,
    });
    await assertNoMekStationLoading(page);
  });
}

async function extractCoopToken(
  page: Page,
): Promise<CoopTokenCandidate | null> {
  return page.evaluate((): CoopTokenCandidate | null => {
    const prefix = 'mekstation.coopCampaign.token.';
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const raw = window.sessionStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as Partial<CoopTokenCandidate>;
        if (
          typeof parsed.matchId === 'string' &&
          typeof parsed.wireToken === 'string'
        ) {
          return { matchId: parsed.matchId, wireToken: parsed.wireToken };
        }
      } catch {
        // Ignore malformed test-local storage.
      }
    }
    return null;
  });
}

async function createCoopHostCampaign(page: Page): Promise<{
  readonly campaignId: string | null;
  readonly roomCode: string | null;
  readonly badge: string | null;
  readonly token: CoopTokenCandidate | null;
  readonly error: string | null;
}> {
  await page.goto('/gameplay/campaigns');
  if (
    !(await waitBrieflyForVisible(page.getByTestId('create-coop-campaign-btn')))
  ) {
    return {
      campaignId: null,
      roomCode: null,
      badge: null,
      token: null,
      error: 'Create co-op campaign button did not render.',
    };
  }
  await page.getByTestId('create-coop-password-input').fill(HOST_PASSWORD);
  await page.getByTestId('create-coop-campaign-btn').click();
  await Promise.race([
    page.waitForURL(/\/gameplay\/campaigns\/[^/]+$/, { timeout: 40_000 }),
    page
      .getByTestId('create-coop-unavailable')
      .waitFor({ state: 'visible', timeout: 40_000 }),
  ]).catch(() => undefined);
  const hasCampaignRoute = /\/gameplay\/campaigns\/[^/]+$/.test(page.url());
  if (hasCampaignRoute) {
    await waitBrieflyForVisible(page.getByTestId('coop-session-badge'), 20_000);
  }
  return {
    campaignId: hasCampaignRoute ? campaignIdFromUrl(page) : null,
    roomCode: await locatorText(page.getByTestId('coop-session-room-code')),
    badge: await locatorText(page.getByTestId('coop-session-badge')),
    token: await extractCoopToken(page),
    error: await locatorText(page.getByTestId('create-coop-unavailable')),
  };
}

async function joinCoopCampaign(
  page: Page,
  roomCode: string,
): Promise<{
  readonly campaignId: string | null;
  readonly badge: string | null;
  readonly error: string | null;
}> {
  await page.goto('/gameplay/campaigns');
  if (
    !(await waitBrieflyForVisible(page.getByTestId('join-coop-campaign-btn')))
  ) {
    return {
      campaignId: null,
      badge: null,
      error: 'Join co-op campaign button did not render.',
    };
  }
  await page.getByTestId('join-coop-campaign-btn').click();
  if (!(await waitBrieflyForVisible(page.getByTestId('join-coop-dialog')))) {
    return {
      campaignId: null,
      badge: null,
      error: 'Join co-op dialog did not open.',
    };
  }
  await page.getByTestId('join-coop-room-code-input').fill(roomCode);
  await page.getByTestId('join-coop-password-input').fill(GUEST_PASSWORD);
  await page.getByTestId('join-coop-submit-btn').click();
  await Promise.race([
    page.waitForURL(/\/gameplay\/campaigns\/[^/]+$/, { timeout: 40_000 }),
    page
      .getByTestId('join-coop-error')
      .waitFor({ state: 'visible', timeout: 40_000 }),
  ]).catch(() => undefined);

  const error = await locatorText(page.getByTestId('join-coop-error'));
  const hasCampaignRoute = /\/gameplay\/campaigns\/[^/]+$/.test(page.url());
  if (hasCampaignRoute) {
    await waitBrieflyForVisible(page.getByTestId('coop-session-badge'), 20_000);
  }
  return {
    campaignId: hasCampaignRoute ? campaignIdFromUrl(page) : null,
    badge: await locatorText(page.getByTestId('coop-session-badge')),
    error,
  };
}

function recordCoopFinding(
  driver: JourneyDriver,
  step: number,
  observation: CoopJoinObservation,
): void {
  const summary =
    `Harness uses MULTIPLAYER_STORE=durable for Playwright; it does not reproduce the plain-dev in-memory split-store C3 path. ` +
    `Co-op badge reads wait for hydration before capture. ` +
    `Host campaign=${observation.hostCampaignId ?? 'none'}, guest campaign=${observation.guestCampaignId ?? 'none'}, ` +
    `host badge=${observation.hostBadge ?? 'none'}, guest badge=${observation.guestBadge ?? 'none'}, ` +
    `join error=${observation.joinError ?? 'none'}.`;
  driver.finding({
    id: observation.connected ? 'C3-HARNESS-DIVERGENCE' : 'C3',
    severity: observation.connected ? 'minor' : 'major',
    summary,
    steps: [step],
  });
}

async function observeGuestLedger(
  page: Page,
  campaignId: string,
): Promise<GuestLedgerObservation> {
  await page.goto(`/gameplay/campaigns/${campaignId}/gm-ledger`);
  await expect(page.getByTestId('page-title')).toContainText(/GM Ledger/i, {
    timeout: 20_000,
  });
  const playerViewBeforeReload = await waitBrieflyForVisible(
    page.getByTestId('gm-ledger-player-only-view'),
  );
  const beforeReload = playerViewBeforeReload
    ? {
        noticeVisible: await isVisible(
          page.getByTestId('gm-ledger-player-only-notice'),
        ),
        playerOnlyViewVisible: true,
        playerLogVisible: await isVisible(
          page.getByTestId('gm-ledger-player-log'),
        ),
        hiddenTextAbsent:
          (await page
            .getByText(/Hidden campaign|black-market|GM-only|default outcome/i)
            .count()) === 0,
        controlsAbsent:
          (await page.getByTestId('gm-ledger-preview-btn').count()) === 0 &&
          (await page.getByTestId('gm-ledger-approve-btn').count()) === 0 &&
          (await page.getByTestId('gm-ledger-manual-btn').count()) === 0,
        privateLogAbsent:
          (await page.getByTestId('gm-ledger-private-log').count()) === 0,
        navLinkAbsent:
          (await page
            .getByRole('link', { name: 'GM Ledger', exact: true })
            .count()) === 0,
      }
    : {
        noticeVisible: false,
        playerOnlyViewVisible: false,
        playerLogVisible: false,
        hiddenTextAbsent: false,
        controlsAbsent: false,
        privateLogAbsent: false,
        navLinkAbsent: false,
      };
  await page.reload();
  await expect(page.getByTestId('page-title')).toContainText(/GM Ledger/i, {
    timeout: 20_000,
  });
  const playerViewBack = await waitBrieflyForVisible(
    page.getByTestId('gm-ledger-player-only-view'),
    10_000,
  );
  const gmSurfaceAfterReload =
    (await page.getByTestId('gm-ledger-control-plane').count()) > 0;

  return {
    checked: true,
    ...beforeReload,
    gmSurfaceAfterReload,
    survivedReload: playerViewBack && !gmSurfaceAfterReload,
  };
}

function recordGuestLedgerFinding(
  driver: JourneyDriver,
  step: number,
  observation: GuestLedgerObservation,
): void {
  const readOnly =
    observation.noticeVisible &&
    observation.playerOnlyViewVisible &&
    observation.playerLogVisible &&
    observation.hiddenTextAbsent &&
    observation.controlsAbsent &&
    observation.privateLogAbsent &&
    observation.survivedReload;
  driver.finding({
    id: readOnly ? 'COOP-GUEST-LEDGER-READONLY' : 'COOP-GUEST-LEDGER-LEAK',
    severity: readOnly ? 'minor' : 'major',
    summary:
      `Guest direct gm-ledger route read-only=${readOnly}; ` +
      `notice=${observation.noticeVisible}, playerView=${observation.playerOnlyViewVisible}, ` +
      `playerLog=${observation.playerLogVisible}, hiddenAbsent=${observation.hiddenTextAbsent}, ` +
      `controlsAbsent=${observation.controlsAbsent}, privateLogAbsent=${observation.privateLogAbsent}, ` +
      `navLinkAbsent=${observation.navLinkAbsent}, gmSurfaceAfterReload=${observation.gmSurfaceAfterReload}, ` +
      `survivedReload=${observation.survivedReload}.`,
    steps: [step],
  });
}

async function mintTokenAndCreateMatch(page: Page): Promise<{
  readonly matchId: string;
  readonly roomCode: string;
  readonly wireToken: string;
}> {
  await page.goto('/multiplayer');
  await expect(page).toHaveURL(/\/multiplayer$/);
  await page.getByPlaceholder('Vault password').fill(HOST_PASSWORD);
  await page.getByLabel('Display name').fill('Deep Play Host');
  await page.getByLabel('Map radius').fill('4');
  await page.getByLabel('Turn limit').fill('8');

  const tokenResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/multiplayer/auth/token') &&
      response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Mint token' }).click();
  const tokenResponse = await tokenResponsePromise;
  if (tokenResponse.status() !== 200) {
    throw new Error(
      `Token mint failed with HTTP ${tokenResponse.status()}: ${await tokenResponse.text()}`,
    );
  }
  const tokenPayload = (await tokenResponse.json()) as TokenResponse;

  const matchResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/multiplayer/matches') &&
      response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Create match' }).click();
  const matchResponse = await matchResponsePromise;
  if (matchResponse.status() !== 201) {
    throw new Error(
      `Match creation failed with HTTP ${matchResponse.status()}: ${await matchResponse.text()}`,
    );
  }
  const matchPayload = (await matchResponse.json()) as CreateMatchResponse;
  await expect(page).toHaveURL(/\/multiplayer\/lobby\/[A-Z0-9]+$/, {
    timeout: 30_000,
  });
  const roomCode = matchPayload.roomCode ?? matchPayload.meta.roomCode;
  if (!roomCode) {
    throw new Error('Created multiplayer match did not return a room code');
  }
  return {
    matchId: matchPayload.matchId,
    roomCode,
    wireToken: tokenPayload.token,
  };
}

async function connectLobby(page: Page, password: string): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Unlock vault' })).toBeVisible(
    {
      timeout: 30_000,
    },
  );
  await page.getByPlaceholder('Vault password').fill(password);
  const tokenResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/api/multiplayer/auth/token') &&
      response.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Connect to lobby' }).click();
  const response = await tokenResponse;
  if (response.status() !== 200) {
    throw new Error(
      `Lobby token mint failed with HTTP ${response.status()}: ${await response.text()}`,
    );
  }
  await expect(page.locator('[data-slot-id="alpha-1"]')).toBeVisible({
    timeout: 30_000,
  });
}

async function joinMultiplayerMatch(
  page: Page,
  roomCode: string,
): Promise<void> {
  await page.goto('/multiplayer');
  await expect(page).toHaveURL(/\/multiplayer$/);
  await page.getByPlaceholder('Vault password').fill(GUEST_PASSWORD);
  await page.getByLabel('Room code').fill(roomCode);
  await Promise.all([
    page.waitForURL(/\/multiplayer\/lobby\/[A-Z0-9]+$/, { timeout: 30_000 }),
    page.getByRole('button', { name: 'Join match' }).click(),
  ]);
  await connectLobby(page, GUEST_PASSWORD);
}

async function observeLobby(page: Page): Promise<LobbyObservation> {
  const alpha = page.locator('[data-slot-id="alpha-1"]');
  const bravo = page.locator('[data-slot-id="bravo-1"]');
  await expect(alpha).toBeVisible({ timeout: 30_000 });
  await expect(bravo).toBeVisible({ timeout: 30_000 });
  const alphaText = (await alpha.textContent())?.trim() ?? '';
  const bravoText = (await bravo.textContent())?.trim() ?? '';
  const alphaOccupied = !/Empty|\u2014|-/i.test(alphaText);
  const bravoOccupied = !/Empty|\u2014|-/i.test(bravoText);
  return { alphaOccupied, bravoOccupied, alphaText, bravoText };
}

function recordLobbyFinding(
  driver: JourneyDriver,
  step: number,
  host: LobbyObservation | null,
  guest: LobbyObservation | null,
): void {
  const occupied =
    host?.alphaOccupied === true &&
    host.bravoOccupied === true &&
    guest?.alphaOccupied === true &&
    guest.bravoOccupied === true;
  driver.finding({
    id: occupied
      ? 'MULTIPLAYER-LOBBY-OCCUPIED'
      : 'MULTIPLAYER-LOBBY-SEAT-STATE',
    severity: occupied ? 'minor' : 'major',
    summary:
      `1v1 lobby occupied=${occupied}; host alpha="${host?.alphaText ?? 'missing'}", ` +
      `host bravo="${host?.bravoText ?? 'missing'}", guest alpha="${guest?.alphaText ?? 'missing'}", ` +
      `guest bravo="${guest?.bravoText ?? 'missing'}".`,
    steps: [step],
  });
}

async function previewAndApproveLedgerCorrection(
  page: Page,
  type: string,
): Promise<{
  readonly previewStatus: string | null;
  readonly approvalStatus: string | null;
  readonly playerLog: string | null;
  readonly privateLog: string | null;
}> {
  await page.getByTestId('gm-ledger-correction-type').selectOption(type);
  await page.getByTestId('gm-ledger-preview-btn').click();
  await expect(page.getByTestId('gm-ledger-preview-status')).toBeVisible({
    timeout: 10_000,
  });
  const previewStatus = await locatorText(
    page.getByTestId('gm-ledger-preview-status'),
  );
  const approve = page.getByTestId('gm-ledger-approve-btn');
  if ((await isVisible(approve)) && (await approve.isEnabled())) {
    await approve.click();
    await expect(page.getByTestId('gm-ledger-approval-status')).toBeVisible({
      timeout: 10_000,
    });
  }
  return {
    previewStatus,
    approvalStatus: await locatorText(
      page.getByTestId('gm-ledger-approval-status'),
    ),
    playerLog: await locatorText(page.getByTestId('gm-ledger-player-log')),
    privateLog: await locatorText(page.getByTestId('gm-ledger-private-log')),
  };
}

async function prepareBattleForGmJourney(
  driver: JourneyDriver,
  page: Page,
  campaignId: string,
): Promise<string> {
  await acceptContractAndOpenLaunch(driver, page, { campaignId });
  const { observation } = await launchMissionToPreBattle(driver, page, {});
  await driver.softStep(
    'open manual battle before switching to GM query mode',
    async () => {
      await page.getByTestId('play-manually-btn').click();
      await page.waitForURL(/\/gameplay\/games\/[^/?#]+/, { timeout: 30_000 });
      await expect(page.getByTestId('game-session')).toBeVisible({
        timeout: 20_000,
      });
    },
  );
  return observation.preBattleUrl;
}

async function openBattleGmMode(page: Page): Promise<TacticalObservation> {
  const currentUrl = new URL(page.url());
  currentUrl.searchParams.set('gm', '1');
  await page.goto(currentUrl.toString());
  await expect(page.getByTestId('game-session')).toBeVisible({
    timeout: 30_000,
  });
  return observeTacticalSurface(page);
}

async function approveGmAdvancePhase(page: Page): Promise<TacticalObservation> {
  const previousPhaseText = await locatorText(page.getByTestId('phase-name'));
  let settledPhaseText: string | null = null;
  let settledTerminalOutcome: string | null = null;
  await page.getByTestId('command-btn-gm.advance-phase').click();
  await expect(page.getByTestId('gm-intervention-confirmation')).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByTestId('gm-intervention-preview-status')).toBeVisible({
    timeout: 10_000,
  });
  await page.getByTestId('gm-intervention-approve').click();
  await expect(page.getByTestId('gm-intervention-confirmation')).toHaveCount(
    0,
    {
      timeout: 10_000,
    },
  );
  if (previousPhaseText !== null) {
    try {
      await expect
        .poll(
          async () => {
            const currentPhaseText = await locatorText(
              page.getByTestId('phase-name'),
            );
            if (
              currentPhaseText !== null &&
              currentPhaseText !== previousPhaseText
            ) {
              settledPhaseText = currentPhaseText;
              return true;
            }
            const terminalOutcome = await terminalOutcomeText(page);
            if (terminalOutcome !== null) {
              settledTerminalOutcome = terminalOutcome;
              return true;
            }
            return false;
          },
          { timeout: 10_000 },
        )
        .toBe(true);
    } catch {
      // A genuine no-change is a valid finding; keep the audit journey alive.
    }
  } else {
    await waitBrieflyForVisible(page.getByTestId('phase-name'));
  }

  const railUnit = page.locator('[data-testid^="rail-unit-"]').first();
  if (await isVisible(railUnit)) {
    await railUnit.click();
    await page.waitForTimeout(300);
  }
  const hex = page
    .locator('[data-testid^="hex-overlay-"], [data-testid^="hex-"]')
    .first();
  if (await isVisible(hex)) {
    await hex.click({ force: true });
    await page.waitForTimeout(500);
  }
  const observation = await observeTacticalSurface(page);
  return {
    ...observation,
    phase: observation.phase ?? settledPhaseText,
    terminalOutcome: observation.terminalOutcome ?? settledTerminalOutcome,
  };
}

function recordGmAdvanceFinding(
  driver: JourneyDriver,
  step: number,
  before: TacticalObservation,
  after: TacticalObservation,
): void {
  const terminalReached =
    before.phase !== null && after.terminalOutcome !== null;
  const phasesReadable = before.phase !== null && after.phase !== null;
  const phaseChanged =
    (phasesReadable && before.phase !== after.phase) || terminalReached;
  const errorReproduced =
    /not in movement phase|Unhandled Runtime Error|Application error/i.test(
      after.errorText ?? '',
    );
  if (!phasesReadable && !terminalReached) {
    driver.finding({
      id: 'C2-UNKNOWN',
      severity: 'minor',
      summary:
        `GM Advance Phase phase text was unreadable before/after approve; ` +
        `before="${before.phase ?? 'unknown'}" after="${after.phase ?? 'unknown'}"; ` +
        `composer=${after.hasMovementComposer}, error=${after.errorText ?? 'none'}.`,
      steps: [step],
    });
    return;
  }

  const oldBug = !phaseChanged || errorReproduced;
  driver.finding({
    id: oldBug ? 'C2' : 'C2-STATUS',
    severity: oldBug ? 'major' : 'minor',
    summary:
      `GM Advance Phase before="${before.phase ?? 'unknown'}" after="${after.phase ?? 'unknown'}"; ` +
      `phaseChanged=${phaseChanged}, composer=${after.hasMovementComposer}, ` +
      `terminal=${after.terminalOutcome ?? 'none'}, error=${after.errorText ?? 'none'}.`,
    steps: [step],
  });
}

test.setTimeout(420_000);

test.describe('ux deep-play audit - desktop', () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test('journey: sp campaign deep loop', async ({ page }, testInfo) => {
    test.setTimeout(540_000);
    const walk = createWalkthroughRecorder(
      page,
      '08-sp-campaign-deep-loop',
      'player pushing a campaign from creation through a battle attempt and full sweep',
      testInfo,
    );
    const driver = createJourneyDriver(walk);
    try {
      const campaign = await createCampaignViaWizard(driver, page, {
        name: `Deep Loop ${Date.now()}`,
        description:
          'UX audit campaign for a full single-player deep-play loop.',
      });
      await saveCampaignToServer(driver, page);
      await acceptContractAndOpenLaunch(driver, page, {
        campaignId: campaign.campaignId,
      });
      const launch = await launchMissionToPreBattle(driver, page, {});
      recordRosterHandoffFinding(driver, launch.step, launch.observation);

      let manualObservation: TacticalObservation | null = null;
      const manualStep = await driver.softStep(
        'attempt manual tactical play from pre-battle',
        async () => {
          manualObservation = await attemptManualBattleInteraction(page);
        },
        {
          note: 'Known-fragile C1 surface; records current phase and movement affordances.',
        },
      );
      if (manualObservation) {
        recordManualBattleFinding(driver, manualStep, manualObservation);
      } else {
        driver.finding({
          id: 'C1',
          severity: 'major',
          summary:
            'Manual battle step failed before a tactical observation could be captured.',
          steps: [manualStep],
        });
      }

      await driver.softStep(
        'return to pre-battle and auto-resolve mission',
        async () => {
          await page.goto(launch.observation.preBattleUrl);
          await expect(page.getByTestId('pre-battle-page')).toBeVisible({
            timeout: 20_000,
          });
          await page.getByTestId('auto-resolve-btn').click();
          await page.waitForLoadState('networkidle');
          await assertNoMekStationLoading(page, 20_000);
        },
      );

      await sweepCampaignSurface(
        driver,
        page,
        campaign.campaignId,
        'sweep missions surface',
        '/missions',
      );
      await sweepCampaignSurface(
        driver,
        page,
        campaign.campaignId,
        'sweep campaign dashboard',
        '',
      );
      await sweepCampaignSurface(
        driver,
        page,
        campaign.campaignId,
        'sweep finances surface',
        '/finances',
      );
      await sweepCampaignSurface(
        driver,
        page,
        campaign.campaignId,
        'sweep personnel surface',
        '/personnel',
      );
      await sweepCampaignSurface(
        driver,
        page,
        campaign.campaignId,
        'sweep forces surface',
        '/forces',
      );
      await sweepCampaignSurface(
        driver,
        page,
        campaign.campaignId,
        'sweep mech bay surface',
        '/mech-bay',
      );

      let starmapText = '';
      const starmapStep = await driver.softStep(
        'sweep starmap surface',
        async () => {
          await page.goto(`/gameplay/campaigns/${campaign.campaignId}/starmap`);
          await page.waitForLoadState('domcontentloaded');
          await page.waitForTimeout(1_000);
          starmapText =
            (await page.locator('body').textContent())?.trim() ?? '';
        },
      );
      recordStarmapFinding(driver, starmapStep, starmapText);

      await driver.step('advance campaign one day', async () => {
        await page.goto(`/gameplay/campaigns/${campaign.campaignId}`);
        const advance = (await isVisible(
          page.getByTestId('day-advance-one-day'),
        ))
          ? page.getByTestId('day-advance-one-day')
          : page.getByTestId('advance-day-btn');
        await expect(advance).toBeVisible({ timeout: 20_000 });
        await advance.click();
        await page.waitForTimeout(1_000);
      });

      await driver.step('check campaign ledger', async () => {
        await page.goto(`/gameplay/campaigns/${campaign.campaignId}/log`);
        await expect(page.getByTestId('page-title')).toBeVisible({
          timeout: 20_000,
        });
        await assertNoMekStationLoading(page);
      });
    } finally {
      driver.finish();
    }
  });

  test('journey: coop multiplayer two-client', async ({
    browser,
    request,
  }, testInfo) => {
    test.setTimeout(540_000);
    const hostPage = await openContextPage(browser);
    const guestPage = await openContextPage(browser);
    const walk = createWalkthroughRecorder(
      hostPage,
      '09-coop-multiplayer-two-client',
      'host and guest proving co-op campaign and 1v1 lobby handoff surfaces',
      testInfo,
    );
    const driver = createJourneyDriver(walk);
    driver.attachSurface('guest', guestPage);

    const identityIds: string[] = [];
    const createdMatches: CleanupMatch[] = [];
    let coopObservation: CoopJoinObservation = {
      hostCampaignId: null,
      guestCampaignId: null,
      roomCode: null,
      hostBadge: null,
      guestBadge: null,
      joinError: null,
      connected: false,
    };
    let hostLobby: LobbyObservation | null = null;
    let guestLobby: LobbyObservation | null = null;
    let lobbyError: string | null = null;
    let lobbyStep = 0;

    try {
      await driver.step('seed host and guest vault identities', async () => {
        const guest = await seedIdentity(
          request,
          `Deep Guest ${Date.now()}`,
          GUEST_PASSWORD,
        );
        const host = await seedIdentity(
          request,
          `Deep Host ${Date.now()}`,
          HOST_PASSWORD,
        );
        identityIds.push(guest.id, host.id);
      });

      const coopStep = await driver.softStep(
        'host creates and guest joins co-op campaign',
        async () => {
          const host = await createCoopHostCampaign(hostPage);
          if (host.token) createdMatches.push(host.token);
          const hostRoomCode = host.roomCode;
          const guest =
            hostRoomCode === null || host.campaignId === null
              ? {
                  campaignId: null,
                  badge: null,
                  error:
                    host.error ?? 'No room code rendered for host campaign.',
                }
              : await (async () => {
                  const guestIdentity = await seedIdentity(
                    request,
                    `Deep Guest Active ${Date.now()}`,
                    GUEST_PASSWORD,
                  );
                  identityIds.push(guestIdentity.id);
                  return joinCoopCampaign(guestPage, hostRoomCode);
                })();
          coopObservation = {
            hostCampaignId: host.campaignId,
            guestCampaignId: guest.campaignId,
            roomCode: host.roomCode,
            hostBadge: host.badge,
            guestBadge: guest.badge,
            joinError: guest.error,
            connected:
              guest.campaignId !== null && /guest/i.test(guest.badge ?? ''),
          };
        },
      );
      recordCoopFinding(driver, coopStep, coopObservation);

      if (coopObservation.connected && coopObservation.guestCampaignId) {
        let ledgerObservation: GuestLedgerObservation | null = null;
        const ledgerStep = await driver.softStep(
          'guest direct route shows read-only co-op ledger',
          async () => {
            ledgerObservation = await observeGuestLedger(
              guestPage,
              coopObservation.guestCampaignId ?? '',
            );
          },
          { surface: 'guest' },
        );
        if (ledgerObservation) {
          recordGuestLedgerFinding(driver, ledgerStep, ledgerObservation);
        }
      } else {
        const skipStep = await driver.softStep(
          'skip guest ledger check because co-op join did not connect',
          async () => {
            await guestPage.goto('/gameplay/campaigns');
          },
          { surface: 'guest' },
        );
        driver.finding({
          id: 'COOP-GUEST-LEDGER-SKIPPED',
          severity: 'minor',
          summary:
            'Guest ledger projection check was skipped because the co-op join never reached a guest campaign route.',
          steps: [skipStep],
        });
      }

      lobbyStep = await driver.softStep(
        'host creates 1v1 match and guest joins lobby',
        async () => {
          try {
            const hostIdentity = await seedIdentity(
              request,
              `Deep Host Active ${Date.now()}`,
              HOST_PASSWORD,
            );
            identityIds.push(hostIdentity.id);
            const created = await mintTokenAndCreateMatch(hostPage);
            createdMatches.push({
              matchId: created.matchId,
              wireToken: created.wireToken,
            });
            await connectLobby(hostPage, HOST_PASSWORD);
            hostLobby = await observeLobby(hostPage);

            const guestIdentity = await seedIdentity(
              request,
              `Deep Guest Lobby ${Date.now()}`,
              GUEST_PASSWORD,
            );
            identityIds.push(guestIdentity.id);
            await joinMultiplayerMatch(guestPage, created.roomCode);
            guestLobby = await observeLobby(guestPage);
            hostLobby = await observeLobby(hostPage);
          } catch (error) {
            lobbyError = error instanceof Error ? error.message : String(error);
          }
        },
      );
      if (lobbyError) {
        driver.note(lobbyError);
      }
      recordLobbyFinding(driver, lobbyStep, hostLobby, guestLobby);
    } finally {
      await deleteCreatedMatches(request, createdMatches);
      await deleteIdentities(request, identityIds);
      await closeContexts([hostPage.context(), guestPage.context()]);
      driver.finish();
    }
  });

  test('journey: gm surfaces', async ({ page }, testInfo) => {
    test.setTimeout(540_000);
    const walk = createWalkthroughRecorder(
      page,
      '10-gm-surfaces',
      'campaign GM validating ledger interventions and the tactical GM dock',
      testInfo,
    );
    const driver = createJourneyDriver(walk);
    try {
      const campaign = await createCampaignViaWizard(driver, page, {
        name: `GM Surfaces ${Date.now()}`,
        description:
          'UX audit campaign for GM ledger and tactical intervention surfaces.',
      });

      await driver.step('open campaign GM ledger', async () => {
        await page.goto(`/gameplay/campaigns/${campaign.campaignId}/gm-ledger`);
        await expect(page.getByTestId('page-title')).toContainText(
          /GM Ledger/i,
          {
            timeout: 20_000,
          },
        );
        await expect(page.getByTestId('gm-ledger-correction-type')).toBeVisible(
          {
            timeout: 20_000,
          },
        );
      });

      const merchantStep = await driver.softStep(
        'generate and approve merchant ledger correction',
        async () => {
          const result = await previewAndApproveLedgerCorrection(
            page,
            'merchant',
          );
          driver.note(
            `Merchant preview=${result.previewStatus ?? 'missing'}, approval=${result.approvalStatus ?? 'missing'}, playerLog=${result.playerLog ?? 'missing'}, privateLog=${result.privateLog ?? 'missing'}.`,
          );
        },
      );
      driver.finding({
        id: 'GM-LEDGER-MERCHANT',
        severity: 'minor',
        summary:
          'Merchant correction preview and approval were captured with player/private ledger split evidence.',
        steps: [merchantStep],
      });

      const conflictStep = await driver.softStep(
        'preview merchant conflict blocked approval',
        async () => {
          await page
            .getByTestId('gm-ledger-correction-type')
            .selectOption('merchant-conflict');
          await page.getByTestId('gm-ledger-preview-btn').click();
          await expect(
            page.getByTestId('gm-ledger-preview-status'),
          ).toBeVisible({
            timeout: 10_000,
          });
          const status = await locatorText(
            page.getByTestId('gm-ledger-preview-status'),
          );
          const disabled = await page
            .getByTestId('gm-ledger-approve-btn')
            .isDisabled();
          driver.note(
            `Merchant conflict status=${status ?? 'missing'}, approveDisabled=${disabled}.`,
          );
        },
      );
      driver.finding({
        id: 'GM-LEDGER-CONFLICT',
        severity: 'minor',
        summary:
          'Merchant conflict correction was captured in the blocked approval state.',
        steps: [conflictStep],
      });

      const timeStep = await driver.softStep(
        'preview and approve time-cascade correction',
        async () => {
          await page
            .getByTestId('gm-ledger-correction-type')
            .selectOption('time');
          await page.getByTestId('gm-ledger-preview-btn').click();
          await expect(
            page.getByTestId('gm-ledger-preview-time-effect'),
          ).toBeVisible({
            timeout: 10_000,
          });
          await page
            .getByTestId('gm-ledger-preview-time-effect')
            .scrollIntoViewIfNeeded();
          const timeEffect = await locatorText(
            page.getByTestId('gm-ledger-preview-time-effect'),
          );
          const externalEffects = await locatorText(
            page.getByTestId('gm-ledger-preview-external-effects'),
          );
          const approve = page.getByTestId('gm-ledger-approve-btn');
          if (await approve.isEnabled()) {
            await approve.click();
            await expect(
              page.getByTestId('gm-ledger-approval-status'),
            ).toBeVisible({
              timeout: 10_000,
            });
          }
          driver.note(
            `Time cascade preview=${timeEffect ?? 'missing'}; external effects=${externalEffects ?? 'none rendered'}. Current UI renders summary plus effects list, not a per-day expanded breakdown.`,
          );
        },
      );
      driver.finding({
        id: 'GM-TIME-CASCADE',
        severity: 'moderate',
        summary:
          'Time cascade correction was captured with the full current preview panel; UI currently exposes a summary/effects list rather than per-day breakdown.',
        steps: [timeStep],
      });

      await driver.step(
        'return to dashboard before battle setup save',
        async () => {
          await page.goto(`/gameplay/campaigns/${campaign.campaignId}`);
          await expect(
            page.getByTestId('campaign-save-status-card'),
          ).toBeVisible({
            timeout: 20_000,
          });
        },
      );
      await saveCampaignToServer(driver, page);
      await prepareBattleForGmJourney(driver, page, campaign.campaignId);

      let before: TacticalObservation | null = null;
      const gmOpenStep = await driver.softStep(
        'enter battle GM dock via query param',
        async () => {
          before = await openBattleGmMode(page);
        },
      );
      driver.note(
        'GM tactical mode is entered by appending ?gm=1; source resolveGameSessionShellMode confirms no in-app toggle exists.',
      );

      let after: TacticalObservation | null = null;
      const gmAdvanceStep = await driver.softStep(
        'preview and approve GM Advance Phase',
        async () => {
          after = await approveGmAdvancePhase(page);
        },
      );

      if (before && after) {
        recordGmAdvanceFinding(driver, gmAdvanceStep, before, after);
      } else {
        driver.finding({
          id: 'C2',
          severity: 'major',
          summary: `GM Advance Phase could not be observed across before/after states; entry step=${gmOpenStep}.`,
          steps: [gmOpenStep, gmAdvanceStep],
        });
      }
    } finally {
      driver.finish();
    }
  });
});
