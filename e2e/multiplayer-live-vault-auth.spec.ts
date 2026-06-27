/**
 * Multiplayer live vault-auth proof.
 *
 * Scope:
 *   - seeds two real vault identities through the locked E2E-only seam
 *   - drives the public host/join/lobby UI in two browser contexts
 *   - proves both players connect through signed vault tokens
 *   - launches a fog-enabled match and verifies both clients render the
 *     networked surface
 *   - advances the initial server-owned phase through the real WebSocket path
 *
 * Release proof: REST-created matches now bootstrap the active host with a
 * real unit roster, so the launched browser surface renders unit-backed
 * tactical state through the same signed WebSocket path the players use.
 *
 * @tags @game @smoke @playtest @multiplayer
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

interface ISeededIdentity {
  readonly id: string;
  readonly displayName: string;
}

interface ITokenResponse {
  readonly token: string;
  readonly playerId: string;
  readonly displayName: string;
}

interface ICreateMatchResponse {
  readonly matchId: string;
  readonly roomCode?: string;
  readonly meta: {
    readonly roomCode?: string;
    readonly config: { readonly fogOfWar?: boolean };
    readonly unitBootstrap?: readonly {
      readonly unitId: string;
      readonly unitRef: string;
      readonly side: 'player' | 'opponent';
    }[];
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

async function connectLobby(page: Page, password: string): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Unlock vault' })).toBeVisible(
    { timeout: 20_000 },
  );
  await page.getByPlaceholder('Vault password').fill(password);
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes('/api/multiplayer/auth/token') &&
        response.request().method() === 'POST' &&
        response.status() === 200,
      { timeout: 30_000 },
    ),
    page.getByRole('button', { name: 'Connect to lobby' }).click(),
  ]);
  await expect(page.locator('[data-slot-id="alpha-1"]')).toBeVisible({
    timeout: 30_000,
  });
}

function seat(page: Page, slotId: string) {
  return page.locator(`[data-slot-id="${slotId}"]`);
}

async function expectSeatOccupied(page: Page, slotId: string): Promise<void> {
  const row = seat(page, slotId);
  await expect(row).toBeVisible({ timeout: 20_000 });
  await expect(row).not.toContainText('Empty', { timeout: 20_000 });
  await expect(row).not.toContainText('—');
}

async function markReady(page: Page, slotId: string): Promise<void> {
  const row = seat(page, slotId);
  await row.getByRole('button', { name: 'Ready' }).click();
  await expect(row).toContainText('Ready', { timeout: 15_000 });
}

test.describe('multiplayer live vault-auth flow', () => {
  test('two browser contexts can host, join, launch, and advance a fog-enabled match', async ({
    browser,
    request,
  }) => {
    test.setTimeout(180_000);

    const createdIdentityIds: string[] = [];
    let matchId: string | null = null;
    let roomCode: string | null = null;
    let hostWireToken: string | null = null;

    const hostPage = await openContextPage(browser);
    const guestPage = await openContextPage(browser);

    try {
      const hostIdentity = await seedIdentity(
        request,
        'Vault Host E2E',
        HOST_PASSWORD,
      );
      createdIdentityIds.push(hostIdentity.id);

      await hostPage.goto('/multiplayer');
      await expect(hostPage).toHaveURL(/\/multiplayer$/);
      await hostPage.getByPlaceholder('Vault password').fill(HOST_PASSWORD);
      await hostPage.getByLabel('Display name').fill('Host Commander');
      await hostPage.getByLabel('Map radius').fill('4');
      await hostPage.getByLabel('Turn limit').fill('5');
      await hostPage.getByLabel('Double-blind (fog of war)').check();

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
        hostPage.waitForURL(/\/multiplayer\/lobby\/[A-Z0-9]+$/, {
          timeout: 30_000,
        }),
        hostPage.getByRole('button', { name: 'Create match' }).click(),
      ]);

      const hostToken = (await (
        await hostTokenResponse
      ).json()) as ITokenResponse;
      hostWireToken = hostToken.token;
      const created = (await (
        await createMatchResponse
      ).json()) as ICreateMatchResponse;
      matchId = created.matchId;
      roomCode = created.roomCode ?? created.meta.roomCode ?? null;
      expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);
      expect(created.meta.config.fogOfWar).toBe(true);
      expect(created.meta.unitBootstrap).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            unitId: 'player-1-atlas-as7-d',
            unitRef: 'atlas-as7-d',
            side: 'player',
          }),
          expect.objectContaining({
            unitId: 'opponent-1-marauder-mad-3r',
            unitRef: 'marauder-mad-3r',
            side: 'opponent',
          }),
        ]),
      );

      await connectLobby(hostPage, HOST_PASSWORD);
      await expectSeatOccupied(hostPage, 'alpha-1');

      const guestIdentity = await seedIdentity(
        request,
        'Vault Guest E2E',
        GUEST_PASSWORD,
      );
      createdIdentityIds.push(guestIdentity.id);

      await guestPage.goto('/multiplayer');
      await expect(guestPage).toHaveURL(/\/multiplayer$/);
      await guestPage.getByPlaceholder('Vault password').fill(GUEST_PASSWORD);
      await guestPage.getByLabel('Room code').fill(roomCode ?? '');
      await Promise.all([
        guestPage.waitForURL(/\/multiplayer\/lobby\/[A-Z0-9]+$/, {
          timeout: 30_000,
        }),
        guestPage.getByRole('button', { name: 'Join match' }).click(),
      ]);
      await connectLobby(guestPage, GUEST_PASSWORD);

      await expectSeatOccupied(hostPage, 'bravo-1');
      await expectSeatOccupied(guestPage, 'alpha-1');
      await expectSeatOccupied(guestPage, 'bravo-1');

      const metaResponse = await request.get(
        `/api/multiplayer/matches/${encodeURIComponent(matchId ?? '')}`,
        { headers: { Authorization: `Bearer ${hostWireToken}` } },
      );
      expect(metaResponse.status(), await metaResponse.text()).toBe(200);
      const metaPayload = (await metaResponse.json()) as {
        readonly meta: {
          readonly config: { readonly fogOfWar?: boolean };
          readonly playerIds: readonly string[];
          readonly sideAssignments: readonly {
            readonly playerId: string;
            readonly side: 'player' | 'opponent';
          }[];
        };
      };
      expect(metaPayload.meta.config.fogOfWar).toBe(true);
      expect(metaPayload.meta.playerIds).toContain(hostToken.playerId);
      expect(metaPayload.meta.sideAssignments).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            playerId: hostToken.playerId,
            side: 'player',
          }),
        ]),
      );

      await markReady(hostPage, 'alpha-1');
      await markReady(guestPage, 'bravo-1');

      const launchButton = hostPage.getByRole('button', {
        name: 'Launch match',
      });
      await expect(launchButton).toBeEnabled({ timeout: 20_000 });
      await launchButton.click();

      await expect(hostPage.getByTestId('networked-game-surface')).toBeVisible({
        timeout: 30_000,
      });
      await expect(guestPage.getByTestId('networked-game-surface')).toBeVisible(
        { timeout: 30_000 },
      );
      await expect(
        hostPage.getByTestId('unit-token-player-1-atlas-as7-d'),
      ).toBeVisible({ timeout: 20_000 });
      await expect(
        guestPage.getByTestId('unit-token-opponent-1-marauder-mad-3r'),
      ).toBeVisible({ timeout: 20_000 });

      await expect(hostPage.getByTestId('phase-name')).toContainText(
        /Initiative/i,
      );
      const advance = hostPage.getByTestId('advance-phase-button');
      await expect(advance).toBeEnabled({ timeout: 10_000 });
      await advance.click();

      await expect(hostPage.getByTestId('phase-name')).toContainText(
        /Movement/i,
        { timeout: 20_000 },
      );
      await expect(guestPage.getByTestId('phase-name')).toContainText(
        /Movement/i,
        { timeout: 20_000 },
      );
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
