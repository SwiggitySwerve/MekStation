/**
 * The front-door 1v1 match flow the GM/two-player packs drive.
 *
 * Promoted verbatim from `gm-two-player-fault.pack.spec.ts`, which had
 * carried these helpers inline since it shipped. The restart, resilience
 * and fault packs each grew their own copy of this flow, and each of
 * their headers says the consolidation is "deferred to the next e2e
 * seam" - the failure pack (umbrella 22.2) is that seam, and a fourth
 * copy would have been the wrong way to open it.
 *
 * Everything here goes through production surfaces: vault unlock, match
 * creation, room-code join, ready-up, launch, phase advance. No store
 * injection, no hand-seeded rows. The only test-only routes touched are
 * the run-token-guarded `/api/e2e/*` seams, which answer 404 unless the
 * dev server was launched by Playwright with a matching per-run token.
 */

import {
  expect,
  type APIRequestContext,
  type Browser,
  type Page,
  type Response,
} from '@playwright/test';

export const RUN_ID_HEADER = 'x-playwright-e2e-run-id';

export interface IMatchIdentity {
  readonly id: string;
  readonly displayName: string;
}
export interface IMatchToken {
  readonly token: string;
  readonly playerId: string;
}
export interface IMatchHandle {
  readonly matchId: string;
  readonly roomCode: string;
}

/** The per-run Playwright token, or a loud failure naming the gap. */
export function e2eRunId(): string {
  const value = process.env.PLAYWRIGHT_E2E_RUN_ID;
  if (!value) throw new Error('PLAYWRIGHT_E2E_RUN_ID missing');
  return value;
}

/** Seed one vault identity through the guarded e2e route. */
export async function seedIdentity(
  request: APIRequestContext,
  displayName: string,
  password: string,
): Promise<IMatchIdentity> {
  const response = await request.post('/api/e2e/vault-identity', {
    headers: { [RUN_ID_HEADER]: e2eRunId() },
    data: { displayName, password },
  });
  expect(response.status(), await response.text()).toBe(201);
  return (await response.json()) as IMatchIdentity;
}

/** Remove seeded identities. A no-op on an empty list, never a 400. */
export async function deleteIdentities(
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

/** A page in its own browser context, so storage never bleeds between roles. */
export async function openContextPage(browser: Browser): Promise<Page> {
  return (await browser.newContext()).newPage();
}

/** Unlock the vault on the lobby page and wait for the token exchange. */
export async function connectLobby(
  page: Page,
  password: string,
): Promise<void> {
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
}

/** Ready one slot and wait for the row to reflect it. */
export async function markReady(page: Page, slotId: string): Promise<void> {
  const row = page.locator(`[data-slot-id="${slotId}"]`);
  await expect(row).toBeVisible({ timeout: 20_000 });
  await row.getByRole('button', { name: 'Ready' }).click();
  await expect(row).toContainText('Ready', { timeout: 15_000 });
}

/**
 * Advance the phase from whichever side currently owns the control.
 *
 * Turn ownership (design D4) withholds the advance control from the
 * non-active side, so a spec that always clicked the host would hang
 * half the time. This polls for the enabled control instead of assuming
 * who holds it.
 */
export async function advancePhase(...pages: readonly Page[]): Promise<void> {
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

/** Advance once and confirm BOTH surfaces reached Movement. */
export async function advanceToMovement(
  host: Page,
  guest: Page,
): Promise<void> {
  await advancePhase(host);
  await expect(host.getByTestId('phase-name')).toContainText(/Movement/i);
  await expect(guest.getByTestId('phase-name')).toContainText(/Movement/i);
}

export async function readToken(
  response: Promise<Response>,
): Promise<IMatchToken> {
  return (await (await response).json()) as IMatchToken;
}

export async function readMatch(
  response: Promise<Response>,
): Promise<IMatchHandle> {
  const body = (await (await response).json()) as {
    readonly matchId: string;
    readonly roomCode?: string;
    readonly meta: { readonly roomCode?: string };
  };
  const roomCode = body.roomCode ?? body.meta.roomCode;
  if (!roomCode) throw new Error('Match response lacked a room code');
  return { matchId: body.matchId, roomCode };
}

/**
 * Drive a real 1v1 to the Movement phase and return the handles.
 *
 * The whole arc through production UI: host creates, guest joins by room
 * code, both ready, host launches, one phase advance lands both sides on
 * Movement. Packs that need a live match with a live socket start here.
 */
export async function launchOneVersusOne(input: {
  readonly browser: Browser;
  readonly request: APIRequestContext;
  readonly hostPage: Page;
  readonly guestPage: Page;
  readonly hostName: string;
  readonly guestName: string;
  readonly hostPassword: string;
  readonly guestPassword: string;
}): Promise<{
  readonly match: IMatchHandle;
  readonly hostToken: IMatchToken;
  readonly identityIds: readonly string[];
}> {
  const { request, hostPage, guestPage } = input;
  const identityIds: string[] = [];

  const host = await seedIdentity(request, input.hostName, input.hostPassword);
  identityIds.push(host.id);
  await hostPage.goto('/multiplayer');
  await hostPage.getByPlaceholder('Vault password').fill(input.hostPassword);
  await hostPage.getByLabel('Display name').fill(input.hostName);
  await hostPage.getByLabel('Map radius').fill('4');
  await hostPage.getByLabel('Turn limit').fill('5');
  const created = hostPage.waitForResponse(
    (response) =>
      response.url().endsWith('/api/multiplayer/matches') &&
      response.request().method() === 'POST' &&
      response.status() === 201,
    { timeout: 30_000 },
  );
  const tokenResponse = hostPage.waitForResponse(
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
  const hostToken = await readToken(tokenResponse);
  const match = await readMatch(created);
  await connectLobby(hostPage, input.hostPassword);

  const guest = await seedIdentity(
    request,
    input.guestName,
    input.guestPassword,
  );
  identityIds.push(guest.id);
  await guestPage.goto('/multiplayer');
  await guestPage.getByPlaceholder('Vault password').fill(input.guestPassword);
  await guestPage.getByLabel('Room code').fill(match.roomCode);
  await Promise.all([
    guestPage.waitForURL(/\/multiplayer\/lobby\/[A-Z0-9]+$/, {
      timeout: 30_000,
    }),
    guestPage.getByRole('button', { name: 'Join match' }).click(),
  ]);
  await connectLobby(guestPage, input.guestPassword);
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

  return { match, hostToken, identityIds };
}

/**
 * Observer-only wire tap recording typed Error frames from the server.
 *
 * Every frame is forwarded untouched in both directions - the tap must
 * not become a participant, or a "the server never sent it" assertion
 * would be proving something about the tap.
 */
export function tapErrorFrames(page: Page): {
  readonly frames: readonly { code?: string; reason?: string }[];
  readonly sent: readonly string[];
  /** Every server->client frame, verbatim, for exactly-once counting. */
  readonly received: readonly string[];
  readonly install: () => Promise<void>;
  /**
   * Send one raw client->server frame on the page's own socket.
   *
   * The injection happens HERE, in the route handler's Node context,
   * holding the same server handle the page's frames go through - not
   * from a script inside the page. A spec that opened its own socket
   * would be attacking a connection the product never made, and would
   * prove nothing about the client's.
   */
  readonly inject: (frame: unknown) => void;
} {
  const frames: { code?: string; reason?: string }[] = [];
  const sent: string[] = [];
  const received: string[] = [];
  let serverHandle: { send: (message: string) => void } | null = null;
  return {
    frames,
    sent,
    received,
    inject: (frame: unknown) => {
      if (!serverHandle) {
        throw new Error('inject called before the socket route was taken');
      }
      serverHandle.send(JSON.stringify(frame));
    },
    install: () =>
      page.routeWebSocket(
        (url) => url.pathname === '/api/multiplayer/socket',
        (route) => {
          const server = route.connectToServer();
          serverHandle = server;
          route.onMessage((message) => {
            // Client->server frames are recorded verbatim so a replay
            // row can resend exactly what the product sent, rather than
            // a spec's reconstruction of it.
            sent.push(String(message));
            server.send(message);
          });
          server.onMessage((message) => {
            received.push(String(message));
            try {
              const frame = JSON.parse(String(message)) as {
                kind?: string;
                code?: string;
                reason?: string;
              };
              if (frame.kind === 'Error') {
                frames.push({ code: frame.code, reason: frame.reason });
              }
            } catch {
              // Non-JSON frames pass through unrecorded.
            }
            route.send(message);
          });
        },
      ),
  };
}

/** Arm one scoped, one-shot fault through the guarded route. */
export async function armScopedFault(
  request: APIRequestContext,
  kind: string,
  matchId: string,
): Promise<void> {
  const armed = await request.post('/api/e2e/fault', {
    headers: { [RUN_ID_HEADER]: e2eRunId() },
    // `matchId` is REQUIRED since the lever gained session scope
    // (finding #72): an arm that names no session is refused 400.
    data: { kind, mode: 'once', matchId },
  });
  expect(armed.status(), await armed.text()).toBe(200);
}
