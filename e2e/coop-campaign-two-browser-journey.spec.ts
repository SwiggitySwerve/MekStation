/**
 * Live co-op campaign journey proof.
 *
 * Scope:
 *   - host creates a co-op campaign from the public UI
 *   - guest joins from a second browser context by room code
 *   - guest dashboard hydrates from the server-resident campaign snapshot
 *   - guest sends a campaign proposal over the campaign-sync socket
 *   - host approves it through the GM review surface
 *   - guest mirror updates from rendered UI and survives reload
 *
 * Mission launch/post-battle browser proof is intentionally bounded here:
 * the current campaign snapshot synchronizes the campaign ledger projection,
 * not mission definitions. The verify script pairs this browser proof with
 * participation and post-battle reconciliation contract tests.
 *
 * @tags @game @smoke @playtest @coop @multiplayer
 */

import {
  expect,
  test,
  type APIRequestContext,
  type Browser,
  type Page,
} from '@playwright/test';

const RUN_ID_HEADER = 'x-playwright-e2e-run-id';
const HOST_PASSWORD = 'HostPassword123!';
const GUEST_PASSWORD = 'GuestPassword123!';
const GUEST_SPEND_AMOUNT = 50_000;

interface ISeededIdentity {
  readonly id: string;
  readonly displayName: string;
}

interface ITokenResponse {
  readonly token: string;
  readonly playerId: string;
  readonly displayName: string;
}

interface ICreateCoopMatchResponse {
  readonly matchId: string;
  readonly roomCode?: string;
  readonly meta: {
    readonly roomCode?: string;
  };
}

interface ICampaignRecordResponse {
  readonly body: {
    readonly currentDate: string;
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
): Promise<ISeededIdentity> {
  const response = await request.post('/api/e2e/vault-identity', {
    headers: { [RUN_ID_HEADER]: e2eRunId() },
    data: { displayName, password },
  });
  expect(response.status(), await response.text()).toBe(201);
  return (await response.json()) as ISeededIdentity;
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

async function openContextPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext();
  return context.newPage();
}

function campaignIdFromUrl(page: Page): string {
  const match = /\/gameplay\/campaigns\/([^/?#]+)/.exec(page.url());
  if (!match?.[1]) {
    throw new Error(`Campaign id missing from URL ${page.url()}`);
  }
  return decodeURIComponent(match[1]);
}

async function readGuestMirrorBalance(page: Page): Promise<number> {
  return readRenderedNumber(page, 'guest-mirror-balance');
}

async function readGuestMirrorSalvage(page: Page): Promise<number> {
  return readRenderedNumber(page, 'guest-mirror-salvage');
}

async function readGuestMirrorUnitCount(page: Page): Promise<number> {
  return readRenderedNumber(page, 'guest-mirror-unit-count');
}

async function readRenderedNumber(page: Page, testId: string): Promise<number> {
  const text = (await page.getByTestId(testId).textContent()) ?? '';
  expect(text.toLowerCase()).not.toContain('pending');
  const numeric = Number(text.replace(/[^\d-]/g, ''));
  if (!Number.isFinite(numeric)) {
    throw new Error(`Unable to parse ${testId} from "${text}"`);
  }
  return numeric;
}

async function waitForCampaignStoreReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const win = window as unknown as {
        __ZUSTAND_STORES__?: { campaign?: unknown };
      };
      return win.__ZUSTAND_STORES__?.campaign !== undefined;
    },
    { timeout: 15_000 },
  );
}

async function enqueueCoopBattleOutcome(
  page: Page,
  input: {
    readonly matchId: string;
    readonly playerDestroyed: boolean;
    readonly playerFinalStatus: 'damaged' | 'destroyed';
    readonly opponentUnitId: string;
  },
): Promise<void> {
  await page.evaluate(
    ({ matchId, playerDestroyed, playerFinalStatus, opponentUnitId }) => {
      const win = window as unknown as {
        __ZUSTAND_STORES__?: {
          campaign?: {
            getState: () => {
              enqueueOutcome: (outcome: Record<string, unknown>) => void;
            };
          };
        };
      };
      const state = win.__ZUSTAND_STORES__?.campaign?.getState();
      if (!state) {
        throw new Error('Campaign store not exposed on window');
      }

      const unitDelta = (
        unitId: string,
        side: 'player' | 'opponent',
        destroyed: boolean,
        finalStatus: 'damaged' | 'destroyed',
      ) => ({
        unitId,
        side,
        destroyed,
        finalStatus,
        armorRemaining: { CT: 5, LT: 12, RT: 12 },
        internalsRemaining: { CT: 6, LT: 8, RT: 8 },
        destroyedLocations: [],
        destroyedComponents: [],
        heatEnd: 4,
        ammoRemaining: {},
        pilotState: {
          conscious: true,
          wounds: 1,
          killed: false,
          finalStatus: 'wounded',
        },
      });

      state.enqueueOutcome({
        version: 1,
        matchId,
        contractId: `e2e-coop-contract-${matchId}`,
        scenarioId: `e2e-coop-scenario-${matchId}`,
        endReason: 'destruction',
        report: {
          version: 1,
          matchId,
          winner: 'player',
          reason: 'destruction',
          turnCount: 5,
          units: [],
          mvpUnitId: null,
          log: [],
        },
        unitDeltas: [
          unitDelta(
            'e2e-coop-unit-1',
            'player',
            playerDestroyed,
            playerFinalStatus,
          ),
          unitDelta(opponentUnitId, 'opponent', true, 'destroyed'),
        ],
        capturedAt: new Date().toISOString(),
      });
    },
    input,
  );
}

async function readDashboardDate(page: Page): Promise<string> {
  const text =
    (await page.getByTestId('day-advance-current-date').textContent()) ?? '';
  const value = text.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Unable to parse campaign date from "${text}"`);
  }
  return value;
}

async function readServerCampaignDate(
  request: APIRequestContext,
  campaignId: string,
): Promise<string> {
  const response = await request.get(
    `/api/campaigns/${encodeURIComponent(campaignId)}`,
  );
  expect(response.status(), await response.text()).toBe(200);
  const record = (await response.json()) as ICampaignRecordResponse;
  return record.body.currentDate.slice(0, 10);
}

async function expectGuestDashboardSynced(page: Page): Promise<void> {
  await expect(page.getByTestId('coop-session-badge')).toContainText(
    'Co-op session: Guest',
    { timeout: 20_000 },
  );
  await expect(page.getByTestId('guest-mirror-sync-summary')).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId('guest-mirror-sync-status')).toContainText(
    'synced',
    { timeout: 20_000 },
  );
  await expect(page.getByTestId('host-gm-review-surface')).toHaveCount(0);
  await expect(page.getByTestId('host-command-authority-private')).toHaveCount(
    0,
  );
}

test.describe('live co-op campaign two-browser journey', () => {
  test('host and guest create, join, arbitrate, and reload through campaign-sync', async ({
    browser,
    request,
  }) => {
    test.setTimeout(180_000);

    const createdIdentityIds: string[] = [];
    let matchId: string | null = null;
    let hostWireToken: string | null = null;

    const hostPage = await openContextPage(browser);
    const guestPage = await openContextPage(browser);

    try {
      const hostIdentity = await seedIdentity(
        request,
        'Co-op Host E2E',
        HOST_PASSWORD,
      );
      createdIdentityIds.push(hostIdentity.id);

      await hostPage.goto('/gameplay/campaigns');
      await hostPage.waitForLoadState('domcontentloaded');
      await hostPage
        .getByTestId('create-coop-password-input')
        .fill(HOST_PASSWORD);

      const hostTokenResponse = hostPage.waitForResponse(
        (response) =>
          response.url().includes('/api/multiplayer/auth/token') &&
          response.request().method() === 'POST' &&
          response.status() === 200,
        { timeout: 30_000 },
      );
      const createMatchResponse = hostPage.waitForResponse(
        (response) =>
          response.url().endsWith('/api/multiplayer/matches') &&
          response.request().method() === 'POST' &&
          response.status() === 201,
        { timeout: 30_000 },
      );
      await Promise.all([
        hostPage.waitForURL(/\/gameplay\/campaigns\/[^/]+$/, {
          timeout: 30_000,
        }),
        hostPage.getByTestId('create-coop-campaign-btn').click(),
      ]);

      const hostToken = (await (
        await hostTokenResponse
      ).json()) as ITokenResponse;
      hostWireToken = hostToken.token;
      const created = (await (
        await createMatchResponse
      ).json()) as ICreateCoopMatchResponse;
      matchId = created.matchId;
      const roomCode = created.roomCode ?? created.meta.roomCode ?? null;
      expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);

      await expect(hostPage.getByTestId('coop-session-badge')).toContainText(
        'Co-op session: Host',
        { timeout: 20_000 },
      );
      await expect(hostPage.getByTestId('host-gm-review-surface')).toBeVisible({
        timeout: 20_000,
      });

      const guestIdentity = await seedIdentity(
        request,
        'Co-op Guest E2E',
        GUEST_PASSWORD,
      );
      createdIdentityIds.push(guestIdentity.id);

      await guestPage.goto('/gameplay/campaigns');
      await guestPage.waitForLoadState('domcontentloaded');
      await guestPage.getByTestId('join-coop-campaign-btn').click();
      await expect(guestPage.getByTestId('join-coop-dialog')).toBeVisible();
      await guestPage
        .getByTestId('join-coop-room-code-input')
        .fill(roomCode ?? '');
      await guestPage
        .getByTestId('join-coop-password-input')
        .fill(GUEST_PASSWORD);

      const guestTokenResponse = guestPage.waitForResponse(
        (response) =>
          response.url().includes('/api/multiplayer/auth/token') &&
          response.request().method() === 'POST' &&
          response.status() === 200,
        { timeout: 30_000 },
      );
      await Promise.all([
        guestPage.waitForURL(/\/gameplay\/campaigns\/[^/]+$/, {
          timeout: 30_000,
        }),
        guestPage.getByTestId('join-coop-submit-btn').click(),
      ]);
      await guestTokenResponse;

      await expectGuestDashboardSynced(guestPage);
      const guestCampaignId = campaignIdFromUrl(guestPage);
      const initialGuestBalance = await readGuestMirrorBalance(guestPage);
      const initialGuestDate = await readDashboardDate(guestPage);

      await hostPage.getByTestId('advance-day-btn').click();
      await expect
        .poll(() => readServerCampaignDate(request, guestCampaignId), {
          timeout: 20_000,
        })
        .not.toBe(initialGuestDate);
      const advancedDate = await readServerCampaignDate(
        request,
        guestCampaignId,
      );
      await expect
        .poll(() => readDashboardDate(guestPage), { timeout: 20_000 })
        .toBe(advancedDate);

      await guestPage.goto(`/gameplay/campaigns/${guestCampaignId}/finances`);
      await expect(guestPage.getByTestId('guest-proposal-surface')).toBeVisible(
        { timeout: 20_000 },
      );
      await expect(
        guestPage.getByTestId('host-command-authority-private'),
      ).toHaveCount(0);
      await guestPage.getByTestId('guest-action-SpendFunds').click();
      await expect(guestPage.getByTestId('guest-proposal-pending')).toBeVisible(
        { timeout: 20_000 },
      );

      const pendingProposal = hostPage
        .locator('[data-testid^="pending-proposal-"]')
        .first();
      await expect(pendingProposal).toBeVisible({ timeout: 20_000 });
      await hostPage.locator('[data-testid^="approve-"]').first().click();

      await expect(
        guestPage.getByTestId('guest-proposal-committed'),
      ).toBeVisible({ timeout: 20_000 });

      await guestPage.goto(`/gameplay/campaigns/${guestCampaignId}`);
      await expectGuestDashboardSynced(guestPage);
      await expect
        .poll(() => readGuestMirrorBalance(guestPage), { timeout: 20_000 })
        .toBe(initialGuestBalance - GUEST_SPEND_AMOUNT);

      const campaignPath = `/api/campaigns/${encodeURIComponent(guestCampaignId)}`;
      const [reloadCampaignGet] = await Promise.all([
        guestPage.waitForRequest(
          (request) =>
            new URL(request.url()).pathname === campaignPath &&
            request.method() === 'GET',
          { timeout: 30_000 },
        ),
        guestPage.reload(),
      ]);
      await expectGuestDashboardSynced(guestPage);
      expect(new URL(reloadCampaignGet.url()).pathname).toBe(campaignPath);
      expect(await readServerCampaignDate(request, guestCampaignId)).toBe(
        advancedDate,
      );
      await expect
        .poll(() => readDashboardDate(guestPage), { timeout: 20_000 })
        .toBe(advancedDate);
      await expect
        .poll(() => readGuestMirrorBalance(guestPage), { timeout: 20_000 })
        .toBe(initialGuestBalance - GUEST_SPEND_AMOUNT);

      // Reconciliation is host-authored. Use the sanctioned store bridge as
      // the trigger and assert only against guest-rendered mirror state.
      await waitForCampaignStoreReady(hostPage);
      const sharedBalance = initialGuestBalance - GUEST_SPEND_AMOUNT;
      expect(await readGuestMirrorBalance(guestPage)).toBe(sharedBalance);
      expect(await readGuestMirrorUnitCount(guestPage)).toBe(0);
      expect(await readGuestMirrorSalvage(guestPage)).toBe(0);

      await enqueueCoopBattleOutcome(hostPage, {
        matchId: 'e2e-coop-reconcile-1',
        playerDestroyed: false,
        playerFinalStatus: 'damaged',
        opponentUnitId: 'e2e-coop-opfor-1',
      });

      await expect
        .poll(() => readGuestMirrorUnitCount(guestPage), { timeout: 20_000 })
        .toBe(1);
      await expect
        .poll(() => readGuestMirrorSalvage(guestPage), { timeout: 20_000 })
        .toBe(50_000);
      await expect
        .poll(() => readGuestMirrorBalance(guestPage), { timeout: 20_000 })
        .toBe(sharedBalance);

      await enqueueCoopBattleOutcome(hostPage, {
        matchId: 'e2e-coop-reconcile-2',
        playerDestroyed: true,
        playerFinalStatus: 'destroyed',
        opponentUnitId: 'e2e-coop-opfor-2',
      });

      await expect
        .poll(() => readGuestMirrorUnitCount(guestPage), { timeout: 20_000 })
        .toBe(0);
      await expect
        .poll(() => readGuestMirrorSalvage(guestPage), { timeout: 20_000 })
        .toBe(100_000);
      await expect
        .poll(() => readGuestMirrorBalance(guestPage), { timeout: 20_000 })
        .toBe(sharedBalance);
    } finally {
      if (matchId && hostWireToken) {
        const deleteMatchResponse = await request.delete(
          `/api/multiplayer/matches/${encodeURIComponent(matchId)}`,
          { headers: { Authorization: `Bearer ${hostWireToken}` } },
        );
        expect(
          [200, 404].includes(deleteMatchResponse.status()),
          await deleteMatchResponse.text(),
        ).toBe(true);
      }
      await deleteIdentities(request, createdIdentityIds);
      await hostPage.context().close();
      await guestPage.context().close();
    }
  });
});
