/**
 * E2E-16: expiry must remint only the existing participant's authority.
 *
 * "WHEN a scoped session token expires during a long campaign THEN durable
 * membership plus account or vault reauthentication SHALL remint authority
 * without widening access or placing a bearer token in a URL."
 *
 * E2E-17: a seated participant cold-reloads after LaunchMatch expired
 * the invite. The route recovers on durable matchId + vault session;
 * a newcomer holding the pre-launch room code is refused.
 *
 * The short token is armed through the run-token-guarded E2E seam. The
 * socket credential remains in `Sec-WebSocket-Protocol` via
 * `socketCredentialProtocol`; URL observation is deliberately across the
 * complete scenario, not only the retry.
 *
 * @tags @token-pack @E2E-16 @E2E-17
 */

import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test';

import {
  EXPIRED_INVITE_WIRE,
  refuseExpiredRoomCodeOnCampaignWire,
} from './helpers/expiredInviteRefusal';
import {
  launchOneVersusOne,
  openContextPage,
} from './helpers/gmTwoPlayerMatchFlow';
import { readMatchAuthorityEvidence } from './helpers/matchAuthorityEvidence';
import {
  assertNoBearerInUrls,
  observeSocketAndRequestUrls,
} from './helpers/tokenPackUrlSweep';

const RUN_ID_HEADER = 'x-playwright-e2e-run-id';
const HOST_PASSWORD = 'HostPassword123!';
const GUEST_PASSWORD = 'GuestPassword123!';
const NEWCOMER_PASSWORD = 'NewcomerPassword123!';
const SHORT_TOKEN_TTL_MS = 90_000;

type Identity = { readonly id: string };
type Token = {
  readonly token: string;
  readonly playerId: string;
  readonly expiresAt: string;
};
type Match = { readonly matchId: string; readonly roomCode: string };
type Seat = {
  readonly slotId: string;
  readonly occupant?: { readonly playerId: string };
};
type MatchAuthority = {
  readonly playerIds: readonly string[];
  readonly sideAssignments: readonly {
    readonly playerId: string;
    readonly side: 'player' | 'opponent';
  }[];
  readonly seats?: readonly Seat[];
};

function runId(): string {
  const value = process.env.PLAYWRIGHT_E2E_RUN_ID;
  if (!value) throw new Error('PLAYWRIGHT_E2E_RUN_ID missing');
  return value;
}

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

async function connectLobby(page: Page, password: string): Promise<Token> {
  await expect(page.getByRole('heading', { name: 'Unlock vault' })).toBeVisible(
    { timeout: 20_000 },
  );
  await page.getByPlaceholder('Vault password').fill(password);
  const tokenResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/api/multiplayer/auth/token') &&
      response.request().method() === 'POST' &&
      response.status() === 200,
    { timeout: 30_000 },
  );
  await page.getByRole('button', { name: 'Connect to lobby' }).click();
  return readToken(tokenResponse);
}

async function markReady(page: Page, slotId: string): Promise<void> {
  const row = page.locator(`[data-slot-id="${slotId}"]`);
  await expect(row).toBeVisible({ timeout: 20_000 });
  await row.getByRole('button', { name: 'Ready' }).click();
  await expect(row).toContainText('Ready', { timeout: 15_000 });
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

async function readAuthority(
  request: APIRequestContext,
  matchId: string,
  token: string,
): Promise<MatchAuthority> {
  const response = await request.get(
    `/api/multiplayer/matches/${encodeURIComponent(matchId)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  expect(response.status(), await response.text()).toBe(200);
  return ((await response.json()) as { readonly meta: MatchAuthority }).meta;
}

test('E2E-16 expired participant reauthenticates without a URL bearer @E2E-16', async ({
  browser,
  request,
}) => {
  test.setTimeout(240_000);

  const identities: string[] = [];
  let match: Match | null = null;
  let hostToken: Token | null = null;
  const hostPage = await openContextPage(browser);
  const guestPage = await openContextPage(browser);
  const socketUrls: string[] = [];
  const requestUrls: string[] = [];
  await Promise.all([
    observeSocketAndRequestUrls(hostPage, socketUrls, requestUrls),
    observeSocketAndRequestUrls(guestPage, socketUrls, requestUrls),
  ]);

  try {
    const hostIdentity = await seedIdentity(
      request,
      'Token Host',
      HOST_PASSWORD,
    );
    identities.push(hostIdentity.id);
    await hostPage.goto('/multiplayer');
    await hostPage.getByPlaceholder('Vault password').fill(HOST_PASSWORD);
    await hostPage.getByLabel('Display name').fill('Token Host');
    await hostPage.getByLabel('Map radius').fill('4');
    await hostPage.getByLabel('Turn limit').fill('5');
    const createdResponse = hostPage.waitForResponse(
      (response) =>
        response.url().endsWith('/api/multiplayer/matches') &&
        response.request().method() === 'POST' &&
        response.status() === 201,
      { timeout: 30_000 },
    );
    const createTokenResponse = hostPage.waitForResponse(
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
    hostToken = await readToken(createTokenResponse);
    match = await readMatch(createdResponse);
    await connectLobby(hostPage, HOST_PASSWORD);

    const guestIdentity = await seedIdentity(
      request,
      'Token Guest',
      GUEST_PASSWORD,
    );
    identities.push(guestIdentity.id);
    await guestPage.goto('/multiplayer');
    await guestPage.getByPlaceholder('Vault password').fill(GUEST_PASSWORD);
    await guestPage.getByLabel('Room code').fill(match.roomCode);
    await Promise.all([
      guestPage.waitForURL(/\/multiplayer\/lobby\/[A-Z0-9]+$/, {
        timeout: 30_000,
      }),
      guestPage.getByRole('button', { name: 'Join match' }).click(),
    ]);

    const armed = await request.post('/api/e2e/token-ttl', {
      headers: { [RUN_ID_HEADER]: runId() },
      data: { ttlMs: SHORT_TOKEN_TTL_MS },
    });
    expect(armed.status(), await armed.text()).toBe(200);
    const shortToken = await connectLobby(guestPage, GUEST_PASSWORD);
    // Mutant: ignore the guarded override and emit the normal one-hour
    // credential. The expiry would not occur in this live test window.
    expect(Date.parse(shortToken.expiresAt) - Date.now()).toBeLessThanOrEqual(
      SHORT_TOKEN_TTL_MS,
    );

    await markReady(hostPage, 'alpha-1');
    await markReady(guestPage, 'bravo-1');
    await hostPage.getByRole('button', { name: 'Launch match' }).click();
    await expect(hostPage.getByTestId('networked-game-surface')).toBeVisible({
      timeout: 30_000,
    });
    await expect(guestPage.getByTestId('networked-game-surface')).toBeVisible({
      timeout: 30_000,
    });

    const authorityBeforeExpiry = await readAuthority(
      request,
      match.matchId,
      hostToken.token,
    );
    const guestSeatBeforeExpiry = authorityBeforeExpiry.seats?.find(
      (seat) => seat.slotId === 'bravo-1',
    );
    // Mutant: membership disappears or a reconnect creates another seat.
    expect(guestSeatBeforeExpiry?.occupant?.playerId).toBe(shortToken.playerId);
    const guestSideBeforeExpiry = authorityBeforeExpiry.sideAssignments.find(
      (assignment) => assignment.playerId === shortToken.playerId,
    )?.side;
    // Mutant: the participant's role broadens before reauthentication.
    expect(guestSideBeforeExpiry).toBe('opponent');
    assertNoBearerInUrls([...socketUrls, ...requestUrls], [shortToken.token]);

    const delayUntilExpiry = Math.max(
      1_000,
      Date.parse(shortToken.expiresAt) - Date.now() + 1_000,
    );
    await guestPage.waitForTimeout(delayUntilExpiry);

    const socketCountBeforeStaleReload = socketUrls.length;
    await guestPage.reload({ waitUntil: 'domcontentloaded' });
    // The live socket is not proactively closed on expiry - the reload
    // forces the first boundary that verifies the stale credential. The
    // terminal-stale-credential recovery then CLEARS the dead token and
    // surfaces the vault prompt directly (the unavailable panel is the
    // pre-fix stranding this scenario exists to forbid). Reconnect
    // exhaustion plus backoff can take a while - budget generously.
    await expect(
      guestPage.getByRole('heading', { name: 'Unlock vault' }),
    ).toBeVisible({ timeout: 90_000 });
    // Mutant: the expired token is accepted during an upgrade. A stale
    // reload would stay on the game surface and never re-dial sockets.
    expect(socketUrls.length).toBeGreaterThan(socketCountBeforeStaleReload);
    await guestPage.getByPlaceholder('Vault password').fill(GUEST_PASSWORD);
    const remintResponse = guestPage.waitForResponse(
      (response) =>
        response.url().includes('/api/multiplayer/auth/token') &&
        response.request().method() === 'POST' &&
        response.status() === 200,
      { timeout: 30_000 },
    );
    await guestPage.getByRole('button', { name: 'Connect to lobby' }).click();
    const remintedToken = await readToken(remintResponse);
    // Mutant: reminting derives a new principal instead of the durable vault
    // identity. The old seat would no longer be the caller's authority.
    expect(remintedToken.playerId).toBe(shortToken.playerId);
    await expect(guestPage.getByTestId('networked-game-surface')).toBeVisible({
      timeout: 30_000,
    });

    const authorityAfterReauth = await readAuthority(
      request,
      match.matchId,
      hostToken.token,
    );
    const guestSeatAfterReauth = authorityAfterReauth.seats?.find(
      (seat) => seat.slotId === 'bravo-1',
    );
    // Mutant: reauth allocates another seat or rewrites the existing owner.
    expect(guestSeatAfterReauth?.occupant?.playerId).toBe(shortToken.playerId);
    const guestSideAfterReauth = authorityAfterReauth.sideAssignments.find(
      (assignment) => assignment.playerId === shortToken.playerId,
    )?.side;
    // Mutant: the recovered participant is upgraded from opponent to host.
    expect(guestSideAfterReauth).toBe(guestSideBeforeExpiry);
    expect(
      authorityAfterReauth.playerIds.filter(
        (playerId) => playerId === shortToken.playerId,
      ),
    ).toHaveLength(1);
    assertNoBearerInUrls(
      [...socketUrls, ...requestUrls],
      [shortToken.token, remintedToken.token],
    );
  } finally {
    if (match && hostToken) {
      await request.delete(
        `/api/multiplayer/matches/${encodeURIComponent(match.matchId)}`,
        { headers: { Authorization: `Bearer ${hostToken.token}` } },
      );
    }
    await deleteIdentities(request, identities);
    await hostPage.context().close();
    await guestPage.context().close();
  }
});

test('E2E-17 active route uses durable identity after invite expiry @token-pack @E2E-17', async ({
  browser,
  request,
}) => {
  test.setTimeout(240_000);

  const identities: string[] = [];
  let matchId: string | null = null;
  let hostToken: string | null = null;
  const hostPage = await openContextPage(browser);
  const guestPage = await openContextPage(browser);
  const newcomerPage = await openContextPage(browser);
  const socketUrls: string[] = [];
  const requestUrls: string[] = [];
  await Promise.all([
    observeSocketAndRequestUrls(hostPage, socketUrls, requestUrls),
    observeSocketAndRequestUrls(guestPage, socketUrls, requestUrls),
    observeSocketAndRequestUrls(newcomerPage, socketUrls, requestUrls),
  ]);

  try {
    const launched = await launchOneVersusOne({
      browser,
      request,
      hostPage,
      guestPage,
      hostName: 'Invite Host',
      guestName: 'Invite Guest',
      hostPassword: HOST_PASSWORD,
      guestPassword: GUEST_PASSWORD,
    });
    matchId = launched.match.matchId;
    hostToken = launched.hostToken.token;
    identities.push(...launched.identityIds);
    // Keep the pre-launch invite. LaunchMatch sets clearRoomCode; the
    // store column is what a stranger can still type after expiry.
    const staleRoomCode = launched.match.roomCode;

    const afterLaunch = readMatchAuthorityEvidence(launched.match.matchId);
    // Mutant: clearRoomCode dropped at launch. The invite stays live
    // and this is the first read that goes red.
    expect(afterLaunch.roomCode).toBeNull();
    // The column is only an index while in lobby; the meta copy is what
    // LaunchMatch actually clears, so it is the one that proves clearRoomCode.
    expect(afterLaunch.metaRoomCode).toBeNull();
    expect(afterLaunch.status).toBe('active');
    expect(afterLaunch.playerIds).toHaveLength(2);

    const authorityBefore = await readAuthority(
      request,
      launched.match.matchId,
      launched.hostToken.token,
    );
    const guestSeatBefore = authorityBefore.seats?.find(
      (seat) => seat.slotId === 'bravo-1',
    );
    const guestPlayerId = guestSeatBefore?.occupant?.playerId;
    if (!guestPlayerId) {
      throw new Error('Guest bravo-1 had no occupant before the reload');
    }

    // The lobby URL still carries the dead room code. A seated party
    // recovers from the stored matchId, so this reload must not ask
    // for the vault again or mint a new seat.
    await guestPage.reload({ waitUntil: 'domcontentloaded' });
    await expect(guestPage.getByTestId('networked-game-surface')).toBeVisible({
      timeout: 60_000,
    });

    const authorityAfterReload = await readAuthority(
      request,
      launched.match.matchId,
      launched.hostToken.token,
    );
    const guestSeatAfter = authorityAfterReload.seats?.find(
      (seat) => seat.slotId === 'bravo-1',
    );
    // Mutant: membership path skipped, reloader seated as a newcomer.
    // Same slot would then hold a different playerId.
    expect(guestSeatAfter?.occupant?.playerId).toBe(guestPlayerId);
    expect(authorityAfterReload.playerIds).toEqual(authorityBefore.playerIds);

    const newcomer = await seedIdentity(
      request,
      'Invite Newcomer',
      NEWCOMER_PASSWORD,
    );
    identities.push(newcomer.id);
    await newcomerPage.goto('/multiplayer');
    await newcomerPage
      .getByPlaceholder('Vault password')
      .fill(NEWCOMER_PASSWORD);
    await newcomerPage.getByLabel('Room code').fill(staleRoomCode);
    const inviteResponse = newcomerPage.waitForResponse(
      (response) =>
        response.url().includes('/api/multiplayer/invites/') &&
        response.request().method() === 'GET',
      { timeout: 30_000 },
    );
    const tokenResponse = newcomerPage.waitForResponse(
      (response) =>
        response.url().includes('/api/multiplayer/auth/token') &&
        response.request().method() === 'POST' &&
        response.status() === 200,
      { timeout: 30_000 },
    );
    await newcomerPage.getByRole('button', { name: 'Join match' }).click();
    const invite = await inviteResponse;
    // The invite resolver looks up mp_matches.room_code. After launch
    // that column is NULL, so the product answers this exact 404 body.
    expect(invite.status()).toBe(404);
    expect(await invite.json()).toEqual({
      error: 'Invite code not found or expired',
    });
    const newcomerToken = await readToken(tokenResponse);
    // The join page can show more than one alert (the credential banner
    // is one); pin the one that names the stale code.
    await expect(
      newcomerPage
        .getByRole('alert')
        .filter({ hasText: 'No active match with room code' }),
    ).toContainText('No active match with room code ' + staleRoomCode);
    await expect(
      newcomerPage.getByTestId('networked-game-surface'),
    ).toHaveCount(0);

    // Same dead code on the lobby route: no stored matchId, so the
    // page cannot take the reloader's fallback.
    await newcomerPage.goto('/multiplayer/lobby/' + staleRoomCode);
    await expect(
      newcomerPage.getByText('Invite code not found or expired'),
    ).toBeVisible({ timeout: 20_000 });

    // handleRoomCodeGuestJoin.ts:119-120: when getRoomCode() is null
    // the server sends this Error. Assert that frame, not a guessed
    // reason. The invite 404 above is the hub door; this is the wire.
    const wireRefusal = await refuseExpiredRoomCodeOnCampaignWire(
      newcomerPage,
      {
        matchId: launched.match.matchId,
        playerId: newcomerToken.playerId,
        wireToken: newcomerToken.token,
        roomCode: staleRoomCode,
      },
    );
    expect(wireRefusal.code).toBe(EXPIRED_INVITE_WIRE.code);
    expect(wireRefusal.reason).toBe(EXPIRED_INVITE_WIRE.reason);

    const after = readMatchAuthorityEvidence(launched.match.matchId);
    expect(after.status).toBe(afterLaunch.status);
    expect(after.playerIds).toEqual(afterLaunch.playerIds);
    expect(after.roomCode).toBeNull();
    assertNoBearerInUrls(
      [...socketUrls, ...requestUrls],
      [launched.hostToken.token, newcomerToken.token],
    );
  } finally {
    if (matchId && hostToken) {
      await request.delete(
        `/api/multiplayer/matches/${encodeURIComponent(matchId)}`,
        { headers: { Authorization: `Bearer ${hostToken}` } },
      );
    }
    await deleteIdentities(request, identities);
    await hostPage.context().close();
    await guestPage.context().close();
    await newcomerPage.context().close();
  }
});
