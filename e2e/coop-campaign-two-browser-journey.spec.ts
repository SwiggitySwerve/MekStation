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
  const text =
    (await page.getByTestId('guest-mirror-balance').textContent()) ?? '';
  expect(text.toLowerCase()).not.toContain('pending');
  const numeric = Number(text.replace(/[^\d-]/g, ''));
  if (!Number.isFinite(numeric)) {
    throw new Error(`Unable to parse guest mirror balance from "${text}"`);
  }
  return numeric;
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

      await guestPage.reload();
      await expectGuestDashboardSynced(guestPage);
      await expect
        .poll(() => readGuestMirrorBalance(guestPage), { timeout: 20_000 })
        .toBe(initialGuestBalance - GUEST_SPEND_AMOUNT);
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
