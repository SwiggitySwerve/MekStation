/**
 * Three-context privacy evidence journey (authority-audit PR 10,
 * tasks 10.1-10.2, design D5).
 *
 * One isolated GM / Player 1 / Player 2 browser journey on
 * createGmTwoPlayerCampaignFixture. Covers live action, typed
 * rejection, reconnect, and campaign-sync rehydration (the replay
 * surface this fixture actually reaches), plus DOM/storage/raw-frame
 * positive controls and negative private-data searches.
 *
 * Honest scope: ViewerHistoryService (readHistory / readTimeline /
 * exportForViewer) has no HTTP routes yet. The browser cannot exercise
 * those application services. Their three-principal evidence lives in
 * src/lib/multiplayer/server/history/__tests__/ThreeContextPrivacyEvidence.test.ts
 * over real SQLite + InMemoryEventJournal. There is also no production
 * write surface for private records, so this spec seeds no GM-private
 * payload; it scans structural leak indicators instead.
 *
 * Replay: this fixture flow is a co-op campaign on campaign-sync. It
 * does not launch a combat match, so SessionJoin event replay is not
 * reachable here. Guest-mirror reload is the replay surface under test.
 *
 * Vault token mint: POST /api/multiplayer/auth/token unlocks
 * repository.getActive() only. The fixture seeds three identities in
 * one process, so the last seed is the only active vault. Re-minting
 * from the co-op password field would 401 for GM and Player 1. Each
 * context therefore reuses the fixture-issued wire token (already
 * minted while that identity was active) via a per-page fulfill of
 * the token route. Match create, campaign-sync, and rejection still
 * use those real tokens.
 *
 * @tags @game @smoke @playtest @coop @multiplayer @privacy
 */

import { expect, test, type Page } from '@playwright/test';

import { createGmTwoPlayerCampaignFixture } from './fixtures/gmTwoPlayerCampaign';

const GUEST_SPEND_AMOUNT = 50_000;
const STORAGE_PREFIX = 'mekstation.gm-two-player.fixture.';
const RAW_FIELD_NAMES = [
  'eventDigest',
  'commitPosition',
  'previousStreamEventDigest',
  'streamRevision',
] as const;

interface ICreateCoopMatchResponse {
  readonly matchId: string;
  readonly roomCode?: string;
  readonly meta: {
    readonly roomCode?: string;
  };
}

interface ITokenResponse {
  readonly token: string;
  readonly playerId: string;
}

interface ICoopStoredToken {
  readonly matchId: string;
  readonly playerId: string;
  readonly wireToken: string;
  readonly displayName: string;
}

interface IImpersonationResult {
  readonly frames: string[];
  readonly closed: boolean;
  readonly openError: string | null;
}

interface IClientSurface {
  readonly html: string;
  readonly storage: string;
}

interface ICapturedSocket {
  readonly url: string;
  readonly received: string[];
}

interface IFixtureClient {
  readonly role: 'future-gm' | 'future-player-1' | 'future-player-2';
  readonly page: Page;
  readonly storageKey: string;
  readonly identity: {
    readonly id: string;
    readonly playerId: string;
    readonly authFingerprint: string;
  };
}

function fixturePassword(role: IFixtureClient['role'], seed: string): string {
  return `GM2P-${role}-${seed.slice(0, 16)}!`;
}

function clientByRole(
  clients: readonly {
    readonly role: IFixtureClient['role'];
    readonly page: Page;
    readonly storageKey: string;
    readonly identity: IFixtureClient['identity'];
  }[],
  role: IFixtureClient['role'],
): IFixtureClient {
  const found = clients.find((client) => client.role === role);
  if (!found) {
    throw new Error(`fixture client missing for ${role}`);
  }
  return found;
}

function campaignIdFromUrl(page: Page): string {
  const match = /\/gameplay\/campaigns\/([^/?#]+)/.exec(page.url());
  if (!match?.[1]) {
    throw new Error(`Campaign id missing from URL ${page.url()}`);
  }
  return decodeURIComponent(match[1]);
}

async function readRenderedNumber(page: Page, testId: string): Promise<number> {
  const text = (await page.getByTestId(testId).textContent()) ?? '';
  expect(text.toLowerCase()).not.toContain('pending');
  const match = text.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  const numeric = match ? Number(match[0]) : Number.NaN;
  if (!Number.isFinite(numeric)) {
    throw new Error(`Unable to parse ${testId} from "${text}"`);
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

function captureSockets(page: Page): ICapturedSocket[] {
  const captured: ICapturedSocket[] = [];
  page.on('websocket', (ws) => {
    const entry: ICapturedSocket = { url: ws.url(), received: [] };
    captured.push(entry);
    ws.on('framereceived', (event) => {
      if (typeof event.payload === 'string') {
        entry.received.push(event.payload);
      }
    });
  });
  return captured;
}

function joinedFrameText(sockets: readonly ICapturedSocket[]): string {
  return sockets.flatMap((socket) => socket.received).join('\n');
}

async function readFixtureIssuedToken(
  page: Page,
  fixtureSessionId: string,
): Promise<ICoopStoredToken> {
  return readCoopToken(page, fixtureSessionId);
}

async function reuseFixtureIssuedToken(
  page: Page,
  issued: ICoopStoredToken,
): Promise<void> {
  await page.route('**/api/multiplayer/auth/token', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: issued.wireToken,
        playerId: issued.playerId,
        displayName: issued.displayName,
      }),
    });
  });
}

async function joinGuestByRoomCode(input: {
  readonly client: IFixtureClient;
  readonly roomCode: string;
  readonly seed: string;
}): Promise<void> {
  await input.client.page.goto('/gameplay/campaigns');
  await input.client.page.waitForLoadState('domcontentloaded');
  await input.client.page.getByTestId('join-coop-campaign-btn').click();
  await expect(input.client.page.getByTestId('join-coop-dialog')).toBeVisible();
  await input.client.page
    .getByTestId('join-coop-room-code-input')
    .fill(input.roomCode);
  await input.client.page
    .getByTestId('join-coop-password-input')
    .fill(fixturePassword(input.client.role, input.seed));
  await Promise.all([
    input.client.page.waitForURL(/\/gameplay\/campaigns\/[^/]+$/, {
      timeout: 30_000,
    }),
    input.client.page.getByTestId('join-coop-submit-btn').click(),
  ]);
  await expectGuestDashboardSynced(input.client.page);
}

async function readCoopToken(
  page: Page,
  matchId: string,
): Promise<ICoopStoredToken> {
  const stored = await page.evaluate((id) => {
    const raw = sessionStorage.getItem(`mekstation.coopCampaign.token.${id}`);
    if (!raw) return null;
    return JSON.parse(raw) as ICoopStoredToken;
  }, matchId);
  if (!stored || stored.wireToken.length === 0) {
    throw new Error(`coop token missing for match ${matchId}`);
  }
  return stored;
}

async function dumpClientSurface(page: Page): Promise<IClientSurface> {
  return page.evaluate(() => {
    const dumpStore = (store: Storage): Record<string, string> => {
      const out: Record<string, string> = {};
      for (let index = 0; index < store.length; index += 1) {
        const key = store.key(index);
        if (!key) continue;
        out[key] = store.getItem(key) ?? '';
      }
      return out;
    };
    return {
      html: JSON.stringify(document.body.innerHTML),
      storage: JSON.stringify({
        local: dumpStore(localStorage),
        session: dumpStore(sessionStorage),
      }),
    };
  });
}

async function sendPlayerMismatchProposal(
  page: Page,
  input: {
    readonly matchId: string;
    readonly token: string;
    readonly ownPlayerId: string;
    readonly spoofedPlayerId: string;
    readonly campaignId: string;
  },
): Promise<IImpersonationResult> {
  return page.evaluate(async (args) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const params = new URLSearchParams({
      matchId: args.matchId,
      token: args.token,
      playerId: args.ownPlayerId,
      channel: 'campaign',
    });
    const url = `${protocol}//${window.location.host}/api/multiplayer/socket?${params.toString()}`;
    return await new Promise<IImpersonationResult>((resolve) => {
      const frames: string[] = [];
      let settled = false;
      const finish = (openError: string | null, closed: boolean): void => {
        if (settled) return;
        settled = true;
        resolve({ frames, closed, openError });
      };
      const timer = window.setTimeout(() => {
        ws.close();
        finish('timeout waiting for AUTH_REJECTED close', true);
      }, 15_000);
      const ws = new WebSocket(url);
      ws.addEventListener('message', (event) => {
        frames.push(
          typeof event.data === 'string' ? event.data : String(event.data),
        );
      });
      ws.addEventListener('open', () => {
        ws.send(
          JSON.stringify({
            kind: 'CampaignProposal',
            matchId: args.matchId,
            ts: new Date().toISOString(),
            playerId: args.spoofedPlayerId,
            proposal: {
              proposalId: 'privacy-evidence-spoof',
              campaignId: args.campaignId,
              proposingPlayerId: args.spoofedPlayerId,
              ts: new Date().toISOString(),
              intent: {
                kind: 'SpendFunds',
                campaignId: args.campaignId,
                intentId: 'privacy-evidence-spoof-intent',
                payload: { amount: 1, reason: 'privacy-evidence-spoof' },
              },
            },
          }),
        );
      });
      ws.addEventListener('close', () => {
        window.clearTimeout(timer);
        finish(null, true);
      });
      ws.addEventListener('error', () => {
        // Close is the typed terminal; keep collecting until it fires.
      });
    });
  }, input);
}

function assertTypedAuthRejected(result: IImpersonationResult): void {
  expect(result.openError).toBeNull();
  expect(result.closed).toBe(true);
  const parsed = result.frames
    .map((frame) => {
      try {
        return JSON.parse(frame) as {
          kind?: string;
          code?: string;
          reason?: string;
        };
      } catch {
        return { kind: 'unparsed' };
      }
    })
    .filter((frame) => frame.kind === 'Error' || frame.kind === 'Close');
  expect(parsed.length).toBeGreaterThan(0);
  expect(
    parsed.some(
      (frame) =>
        frame.code === 'AUTH_REJECTED' && frame.reason === 'player-mismatch',
    ),
  ).toBe(true);
}

function assertNoSecretMaterial(
  blob: string,
  others: readonly IFixtureClient[],
  liveTokens: ReadonlyMap<string, string>,
): void {
  for (const field of RAW_FIELD_NAMES) {
    expect(blob).not.toContain(field);
  }
  for (const other of others) {
    expect(blob).not.toContain(other.identity.id);
    expect(blob).not.toContain(other.identity.authFingerprint);
    const live = liveTokens.get(other.role);
    if (live) {
      expect(blob).not.toContain(live);
    }
  }
}

test.describe('authority privacy three-context evidence', () => {
  test.describe.configure({ mode: 'serial' });

  test('gm and two players prove live action, typed rejection, reconnect, and leak-free surfaces', async ({
    baseURL,
    browser,
    request,
  }) => {
    test.setTimeout(180_000);

    const fixture = await createGmTwoPlayerCampaignFixture({
      browser,
      request,
      baseURL: baseURL ?? '',
    });
    const gm = clientByRole(fixture.clients, 'future-gm');
    const player1 = clientByRole(fixture.clients, 'future-player-1');
    const player2 = clientByRole(fixture.clients, 'future-player-2');
    const gmFrames = captureSockets(gm.page);
    const player1Frames = captureSockets(player1.page);
    const player2Frames = captureSockets(player2.page);

    let matchId: string | null = null;
    let hostWireToken: string | null = null;

    try {
      const gmIssued = await readFixtureIssuedToken(
        gm.page,
        fixture.session.id,
      );
      const player1Issued = await readFixtureIssuedToken(
        player1.page,
        fixture.session.id,
      );
      const player2Issued = await readFixtureIssuedToken(
        player2.page,
        fixture.session.id,
      );
      await reuseFixtureIssuedToken(gm.page, gmIssued);
      await reuseFixtureIssuedToken(player1.page, player1Issued);
      await reuseFixtureIssuedToken(player2.page, player2Issued);

      await expect(gm.page.getByTestId('create-coop-campaign-btn')).toBeVisible(
        {
          timeout: 20_000,
        },
      );
      await gm.page
        .getByTestId('create-coop-password-input')
        .fill(fixturePassword(gm.role, fixture.seed));

      const hostTokenResponse = gm.page.waitForResponse(
        (response) =>
          response.url().includes('/api/multiplayer/auth/token') &&
          response.request().method() === 'POST' &&
          response.status() === 200,
        { timeout: 30_000 },
      );
      const createMatchResponse = gm.page.waitForResponse(
        (response) =>
          response.url().endsWith('/api/multiplayer/matches') &&
          response.request().method() === 'POST' &&
          response.status() === 201,
        { timeout: 30_000 },
      );
      await Promise.all([
        gm.page.waitForURL(/\/gameplay\/campaigns\/[^/]+$/, {
          timeout: 30_000,
        }),
        gm.page.getByTestId('create-coop-campaign-btn').click(),
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
      if (roomCode === null) {
        throw new Error('co-op room code missing from create response');
      }

      await expect(gm.page.getByTestId('coop-session-badge')).toContainText(
        'Co-op session: Host',
        { timeout: 20_000 },
      );
      await expect(gm.page.getByTestId('host-gm-review-surface')).toBeVisible({
        timeout: 20_000,
      });

      await joinGuestByRoomCode({
        client: player1,
        roomCode,
        seed: fixture.seed,
      });
      await joinGuestByRoomCode({
        client: player2,
        roomCode,
        seed: fixture.seed,
      });

      const campaignId = campaignIdFromUrl(player1.page);
      expect(campaignIdFromUrl(player2.page)).toBe(campaignId);
      expect(campaignIdFromUrl(gm.page)).toBe(campaignId);

      const player1Token = await readCoopToken(player1.page, matchId);
      const player2Token = await readCoopToken(player2.page, matchId);
      const gmToken = await readCoopToken(gm.page, matchId);
      expect(player1Token.playerId).toBe(player1.identity.playerId);
      expect(player2Token.playerId).toBe(player2.identity.playerId);

      const liveTokens = new Map<string, string>([
        [gm.role, gmToken.wireToken],
        [player1.role, player1Token.wireToken],
        [player2.role, player2Token.wireToken],
      ]);

      const initialPlayer2Balance = await readRenderedNumber(
        player2.page,
        'guest-mirror-balance',
      );

      await player1.page.goto(`/gameplay/campaigns/${campaignId}/finances`);
      await expect(
        player1.page.getByTestId('guest-proposal-surface'),
      ).toBeVisible({ timeout: 20_000 });
      await expect(
        player1.page.getByTestId('host-command-authority-private'),
      ).toHaveCount(0);
      await player1.page.getByTestId('guest-action-SpendFunds').click();
      await expect(
        player1.page.getByTestId('guest-proposal-pending'),
      ).toBeVisible({ timeout: 20_000 });

      const pendingProposal = gm.page
        .locator('[data-testid^="pending-proposal-"]')
        .first();
      await expect(pendingProposal).toBeVisible({ timeout: 20_000 });
      await gm.page.locator('[data-testid^="approve-"]').first().click();

      await expect(
        player1.page.getByTestId('guest-proposal-committed'),
      ).toBeVisible({ timeout: 20_000 });

      const spentBalance = initialPlayer2Balance - GUEST_SPEND_AMOUNT;
      await expect
        .poll(() => readRenderedNumber(player2.page, 'guest-mirror-balance'), {
          timeout: 20_000,
        })
        .toBe(spentBalance);
      await expect(gm.page.getByTestId('host-gm-review-surface')).toBeVisible();
      await expect(gm.page.getByTestId('host-gm-review-empty')).toBeVisible({
        timeout: 20_000,
      });

      const refusal = await sendPlayerMismatchProposal(player1.page, {
        matchId,
        token: player1Token.wireToken,
        ownPlayerId: player1.identity.playerId,
        spoofedPlayerId: player2.identity.playerId,
        campaignId,
      });
      assertTypedAuthRejected(refusal);

      await expect
        .poll(() => readRenderedNumber(player2.page, 'guest-mirror-balance'), {
          timeout: 10_000,
        })
        .toBe(spentBalance);
      await expect(gm.page.getByTestId('host-gm-review-empty')).toBeVisible();
      await expect(
        gm.page.locator('[data-testid^="pending-proposal-"]'),
      ).toHaveCount(0);

      await player1.page.goto(`/gameplay/campaigns/${campaignId}`);
      await expectGuestDashboardSynced(player1.page);
      await expect
        .poll(() => readRenderedNumber(player1.page, 'guest-mirror-balance'), {
          timeout: 20_000,
        })
        .toBe(spentBalance);

      const campaignPath = `/api/campaigns/${encodeURIComponent(campaignId)}`;
      const [reloadCampaignGet] = await Promise.all([
        player1.page.waitForRequest(
          (reloadRequest) =>
            new URL(reloadRequest.url()).pathname === campaignPath &&
            reloadRequest.method() === 'GET',
          { timeout: 30_000 },
        ),
        player1.page.reload(),
      ]);
      await expectGuestDashboardSynced(player1.page);
      expect(new URL(reloadCampaignGet.url()).pathname).toBe(campaignPath);
      await expect
        .poll(() => readRenderedNumber(player1.page, 'guest-mirror-balance'), {
          timeout: 20_000,
        })
        .toBe(spentBalance);

      const player1AfterReload = await dumpClientSurface(player1.page);
      const player1ReloadBlob = `${player1AfterReload.html}${player1AfterReload.storage}`;
      expect(player1ReloadBlob).toContain(player1.identity.playerId);
      assertNoSecretMaterial(player1ReloadBlob, [gm, player2], liveTokens);
      expect(player1ReloadBlob).not.toContain(player2.identity.playerId);

      const gmSurface = await dumpClientSurface(gm.page);
      const player1Surface = await dumpClientSurface(player1.page);
      const player2Surface = await dumpClientSurface(player2.page);
      const gmDom = `${gmSurface.html}${gmSurface.storage}`;
      const player1Dom = `${player1Surface.html}${player1Surface.storage}`;
      const player2Dom = `${player2Surface.html}${player2Surface.storage}`;
      const gmBlob = `${gmDom}${joinedFrameText(gmFrames)}`;
      const player1Blob = `${player1Dom}${joinedFrameText(player1Frames)}`;
      const player2Blob = `${player2Dom}${joinedFrameText(player2Frames)}`;

      await expect(gm.page.getByTestId('host-gm-review-surface')).toBeVisible();
      expect(gmDom).toContain(gm.identity.playerId);
      assertNoSecretMaterial(gmBlob, [player1, player2], liveTokens);
      assertNoSecretMaterial(player1Blob, [gm, player2], liveTokens);
      assertNoSecretMaterial(player2Blob, [gm, player1], liveTokens);
      expect(player1Dom).not.toContain(player2.identity.playerId);
      expect(player2Dom).not.toContain(player1.identity.playerId);
      expect(player1Dom).not.toContain(`${STORAGE_PREFIX}${player2.role}`);
      expect(player2Dom).not.toContain(`${STORAGE_PREFIX}${player1.role}`);
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
      await fixture.cleanup();
    }
  });
});
