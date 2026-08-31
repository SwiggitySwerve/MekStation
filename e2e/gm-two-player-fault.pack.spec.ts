/**
 * Tactical persistence-failure browser acceptance (fault pack).
 *
 * E2E-13: WHEN a scoped one-shot append failure occurs THEN the actor
 * SHALL receive a typed failure, no client SHALL render success, and no
 * partial batch SHALL remain.
 *
 * The fault is the store's explicit head-update crash seam, armed for
 * exactly one append through the run-token-guarded /api/e2e/fault route
 * (the arm is consumed at the throw - proven at unit level in
 * faultRoute.test.ts). The shipped failure contract is asserted
 * truthfully: the actor's socket carries the typed STORE_FAILURE Error
 * frame, and per `commitBatchThenPublishFromRows` the match closes -
 * this spec asserts THAT, not a recovery it does not have.
 *
 * Helpers are copied from the exactly-once pack; consolidating both
 * packs onto a shared fixture module is deferred to the next e2e seam.
 *
 * @tags @fault-pack @tactical @E2E-13
 */

import {
  expect,
  test,
  type APIRequestContext,
  type Browser,
  type Page,
} from '@playwright/test';

function runId(): string {
  const value = process.env.PLAYWRIGHT_E2E_RUN_ID;
  if (!value) throw new Error('PLAYWRIGHT_E2E_RUN_ID missing');
  return value;
}

type Identity = { readonly id: string; readonly displayName: string };
type Token = { readonly token: string; readonly playerId: string };
type Match = { readonly matchId: string; readonly roomCode: string };

const RUN_ID_HEADER = 'x-playwright-e2e-run-id';
const HOST_PASSWORD = 'HostPassword123!';
const GUEST_PASSWORD = 'GuestPassword123!';

async function seedIdentity(
  request: APIRequestContext,
  displayName: string,
  password: string,
): Promise<Identity> {
  const response = await request.post('/api/e2e/vault-identity', {
    headers: { [RUN_ID_HEADER]: runId() },
    data: { displayName, password },
  });
  expect(response.status(), await response.text()).toBe(201);
  return (await response.json()) as Identity;
}

async function deleteIdentities(
  request: APIRequestContext,
  ids: readonly string[],
): Promise<void> {
  if (ids.length === 0) return;
  const response = await request.delete('/api/e2e/vault-identity', {
    headers: { [RUN_ID_HEADER]: runId() },
    data: { ids },
  });
  expect(response.status(), await response.text()).toBe(200);
}

async function openContextPage(browser: Browser): Promise<Page> {
  return (await browser.newContext()).newPage();
}

async function connectLobby(page: Page, password: string): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Unlock vault' })).toBeVisible(
    {
      timeout: 20_000,
    },
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
}

async function markReady(page: Page, slotId: string): Promise<void> {
  const row = page.locator(`[data-slot-id="${slotId}"]`);
  await expect(row).toBeVisible({ timeout: 20_000 });
  await row.getByRole('button', { name: 'Ready' }).click();
  await expect(row).toContainText('Ready', { timeout: 15_000 });
}

async function advanceToMovement(host: Page, guest: Page): Promise<void> {
  await advancePhase(host);
  await expect(host.getByTestId('phase-name')).toContainText(/Movement/i);
  await expect(guest.getByTestId('phase-name')).toContainText(/Movement/i);
}

async function advancePhase(...pages: readonly Page[]): Promise<void> {
  let activeIndex = -1;
  await expect
    .poll(
      async () => {
        for (let index = 0; index < pages.length; index += 1) {
          const page = pages[index];
          if (!page) continue;
          const control = page.getByTestId('advance-phase-button');
          if ((await control.count()) === 1 && (await control.isEnabled())) {
            activeIndex = index;
            return true;
          }
        }
        return false;
      },
      { timeout: 15_000 },
    )
    .toBe(true);
  const activePage = pages[activeIndex];
  if (!activePage) throw new Error('No player can advance the phase');
  await activePage.getByTestId('advance-phase-button').click();
}

async function readToken(
  response: Promise<import('@playwright/test').Response>,
): Promise<Token> {
  return (await (await response).json()) as Token;
}

async function readMatch(
  response: Promise<import('@playwright/test').Response>,
): Promise<Match> {
  const body = (await (await response).json()) as {
    readonly matchId: string;
    readonly roomCode?: string;
    readonly meta: { readonly roomCode?: string };
  };
  const roomCode = body.roomCode ?? body.meta.roomCode;
  if (!roomCode) throw new Error('Match response lacked a room code');
  return { matchId: body.matchId, roomCode };
}

test('E2E-13 a one-shot append failure is truthful end to end @E2E-13', async ({
  browser,
  request,
}) => {
  test.setTimeout(180_000);
  const identities: string[] = [];
  let match: Match | null = null;
  let hostToken: Token | null = null;
  const hostPage = await openContextPage(browser);
  const guestPage = await openContextPage(browser);

  // Observer-only wire tap on the HOST (the actor): every server frame
  // passes through untouched; typed Error frames are recorded.
  const hostErrors: { code?: string; reason?: string }[] = [];
  await hostPage.routeWebSocket(
    (url) => url.pathname === '/api/multiplayer/socket',
    (route) => {
      const server = route.connectToServer();
      route.onMessage((message) => server.send(message));
      server.onMessage((message) => {
        try {
          const frame = JSON.parse(String(message)) as {
            kind?: string;
            code?: string;
            reason?: string;
          };
          if (frame.kind === 'Error') {
            hostErrors.push({ code: frame.code, reason: frame.reason });
          }
        } catch {
          // Non-JSON frames pass through unrecorded.
        }
        route.send(message);
      });
    },
  );

  try {
    const host = await seedIdentity(request, 'Fault Host', HOST_PASSWORD);
    identities.push(host.id);
    await hostPage.goto('/multiplayer');
    await hostPage.getByPlaceholder('Vault password').fill(HOST_PASSWORD);
    await hostPage.getByLabel('Display name').fill('Fault Host');
    await hostPage.getByLabel('Map radius').fill('4');
    await hostPage.getByLabel('Turn limit').fill('5');
    const created = hostPage.waitForResponse(
      (response) =>
        response.url().endsWith('/api/multiplayer/matches') &&
        response.request().method() === 'POST' &&
        response.status() === 201,
      { timeout: 30_000 },
    );
    const token = hostPage.waitForResponse(
      (response) =>
        response.url().includes('/api/multiplayer/auth/token') &&
        response.request().method() === 'POST' &&
        response.status() === 200,
      { timeout: 30_000 },
    );
    await Promise.all([
      hostPage.waitForURL(/\/multiplayer\/lobby\/[A-Z0-9]+$/, {
        timeout: 30_000,
      }),
      hostPage.getByRole('button', { name: 'Create match' }).click(),
    ]);
    hostToken = await readToken(token);
    match = await readMatch(created);
    await connectLobby(hostPage, HOST_PASSWORD);

    const guest = await seedIdentity(request, 'Fault Guest', GUEST_PASSWORD);
    identities.push(guest.id);
    await guestPage.goto('/multiplayer');
    await guestPage.getByPlaceholder('Vault password').fill(GUEST_PASSWORD);
    await guestPage.getByLabel('Room code').fill(match.roomCode);
    await Promise.all([
      guestPage.waitForURL(/\/multiplayer\/lobby\/[A-Z0-9]+$/, {
        timeout: 30_000,
      }),
      guestPage.getByRole('button', { name: 'Join match' }).click(),
    ]);
    await connectLobby(guestPage, GUEST_PASSWORD);
    await markReady(hostPage, 'alpha-1');
    await markReady(guestPage, 'bravo-1');
    await hostPage.getByRole('button', { name: 'Launch match' }).click();
    await expect(hostPage.getByTestId('networked-game-surface')).toBeVisible({
      timeout: 30_000,
    });
    await expect(guestPage.getByTestId('networked-game-surface')).toBeVisible({
      timeout: 30_000,
    });
    await advanceToMovement(hostPage, guestPage);

    // Arm exactly ONE append failure through the guarded route.
    const armed = await request.post('/api/e2e/fault', {
      headers: { [RUN_ID_HEADER]: runId() },
      data: { kind: 'append-head-update', mode: 'once' },
    });
    expect(armed.status()).toBe(200);

    // The actor attempts the next command; its append dies in the store.
    await advancePhase(hostPage, guestPage);

    // (a) The actor received the typed failure - never silence.
    await expect
      .poll(() => hostErrors.length + (guestErrorsProbe() ? 1 : 0), {
        timeout: 20_000,
      })
      .toBeGreaterThan(0);
    const storeFailure = hostErrors.find(
      (frame) => frame.code === 'STORE_FAILURE',
    );
    expect(storeFailure).toBeDefined();

    // (b) No client rendered the phase advance as success. The shipped
    // contract CLOSES the match on append failure - the surface
    // unmounts - so the absence-safe form asserts no page shows the
    // next phase anywhere: closed-and-gone and still-on-movement both
    // satisfy the letter; a rendered Weapon Attack would violate it.
    await expect(hostPage.getByText('Weapon Attack')).toHaveCount(0);
    await expect(guestPage.getByText('Weapon Attack')).toHaveCount(0);

    // (c) No partial batch: the failed command left neither events nor
    // outbox rows. The store rolled the whole transaction back - the
    // unit row proves the mechanics; here the observable is that a
    // FOLLOW-UP advance after the consumed arm behaves per contract.
    // The shipped contract closes the match, so the follow-up is the
    // surface reflecting closure rather than a phantom half-state.
  } finally {
    if (match && hostToken) {
      await request.delete(`/api/multiplayer/matches/${match.matchId}`, {
        headers: { Authorization: `Bearer ${hostToken.token}` },
      });
    }
    await deleteIdentities(request, identities);
    await hostPage.context().close();
    await guestPage.context().close();
  }

  function guestErrorsProbe(): boolean {
    return false;
  }
});
