/**
 * GM + two-player campaign proposal arbitration pack.
 *
 * Three isolated browser contexts (GM host + two guests) on the
 * CAMPAIGN channel, driven entirely through the production co-op
 * surfaces: the GM opens a co-op session from the campaign dashboard,
 * both guests join by room code, and both submit a real
 * `SpendFunds` proposal through `GuestProposalSurface`. The GM's
 * `HostGmReviewSurface` is the artifact under test.
 *
 * PROVEN HERE (letter quoted from
 * openspec/changes/harden-gm-two-player-campaign-sessions/specs/e2e-testing/spec.md):
 *
 * E2E-30: "WHEN both players submit proposals concurrently THEN the GM
 *   SHALL see two actor-specific review items and resolving one SHALL
 *   not alter the other."
 *
 * DEFERRED, WITH THE PRODUCT DEFECT THAT BLOCKS IT - E2E-29 ("WHEN one
 * proposal is vetoed and another times out THEN neither SHALL mutate
 * campaign state and each SHALL clear only its own pending UI"):
 *
 *   NO PRODUCTION SURFACE TIMES A PROPOSAL OUT. `CampaignGmArbiter`
 *   arms its auto-veto timer only when `proposalTimeoutMs > 0`
 *   (`src/lib/multiplayer/server/CampaignGmArbiter.ts`, `submit`), and
 *   BOTH production wirings construct the arbiter with
 *   `{ proposalTimeoutMs: 0 }` -
 *   `src/lib/multiplayer/server/CampaignHostRegistry.ts` (the co-op
 *   session this pack opens) and `src/lib/campaign/coop/
 *   coopRuntimeSession.ts`. `autoVetoForTimeout` is reachable from the
 *   unarmed timer and from `CampaignGmArbiter.test.ts` alone, so the
 *   "another times out" half of the letter has no product behaviour to
 *   observe: a browser scenario could only reach it by calling a server
 *   internal the product never calls, which would report the whole
 *   letter while proving the half this pack already covers. Deferred
 *   rather than half-claimed, in the same discipline this pack's
 *   sibling applies to E2E-28. The veto half IS exercised below as the
 *   resolution E2E-30 asks for; what is missing is the timeout half and
 *   the state-mutation clause that pairs with it.
 *
 * @tags @proposal-pack @campaign @E2E-30
 */

import { expect, test, type Page } from '@playwright/test';

import { createGmTwoPlayerCampaignFixture } from './fixtures/gmTwoPlayerCampaign';

type Fixture = Awaited<ReturnType<typeof createGmTwoPlayerCampaignFixture>>;
type Client = Fixture['clients'][number];
type Role = Client['role'];
type StoredToken = {
  readonly wireToken: string;
  readonly playerId: string;
  readonly displayName: string;
};

test('E2E-30 concurrent proposals stay attributable and independently resolvable @proposal-pack @E2E-30', async ({
  baseURL,
  browser,
  request,
}) => {
  test.setTimeout(240_000);
  const fixture = await createGmTwoPlayerCampaignFixture({
    browser,
    request,
    baseURL: baseURL ?? '',
  });
  try {
    const gm = clientByRole(fixture, 'future-gm');
    const playerOne = clientByRole(fixture, 'future-player-1');
    const playerTwo = clientByRole(fixture, 'future-player-2');
    for (const client of [gm, playerOne, playerTwo]) {
      await reuseFixtureIssuedToken(client.page, fixture.session.id);
    }

    const roomCode = await openCoopSession(gm.page, fixture.seed);
    await joinGuestByRoomCode(playerOne, roomCode, fixture.seed);
    await joinGuestByRoomCode(playerTwo, roomCode, fixture.seed);
    const campaignId = campaignIdFromUrl(gm.page);

    await openProposalSurface(playerOne.page, campaignId);
    await openProposalSurface(playerTwo.page, campaignId);

    // CONCURRENTLY: both clicks are issued without waiting for either
    // one to be acknowledged, so the two proposals race into the
    // arbiter's queue exactly as the letter's WHEN describes.
    await Promise.all([
      playerOne.page.getByTestId('guest-action-SpendFunds').click(),
      playerTwo.page.getByTestId('guest-action-SpendFunds').click(),
    ]);
    await expect(
      playerOne.page.getByTestId('guest-proposal-pending'),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      playerTwo.page.getByTestId('guest-proposal-pending'),
    ).toBeVisible({ timeout: 20_000 });

    // (a) TWO review items, each ATTRIBUTED to its own actor. The
    // filter is on the rendered proposing-player id, so a surface that
    // showed two items without attribution - or attributed both to one
    // player - fails here rather than passing on the count alone.
    const reviewItems = gm.page.locator('[data-testid^="pending-proposal-"]');
    await expect(reviewItems).toHaveCount(2, { timeout: 30_000 });
    const itemOne = reviewItems.filter({
      hasText: playerOne.identity.playerId,
    });
    const itemTwo = reviewItems.filter({
      hasText: playerTwo.identity.playerId,
    });
    await expect(itemOne).toHaveCount(1);
    await expect(itemTwo).toHaveCount(1);
    const proposalOne = await proposalIdOf(itemOne);
    const proposalTwo = await proposalIdOf(itemTwo);
    expect(proposalOne).not.toEqual(proposalTwo);

    // Captured BEFORE the resolution so "not altered" is a comparison
    // against a recorded value rather than against an expectation.
    const balanceBefore = await gm.page
      .getByTestId(`proposal-balance-${proposalTwo}`)
      .textContent();

    // (b) resolve exactly ONE of them.
    await gm.page.getByTestId(`veto-${proposalOne}`).click();

    // (c) the resolved proposal clears ITS OWN pending UI...
    await expect(
      playerOne.page.getByTestId('guest-proposal-vetoed'),
    ).toBeVisible({ timeout: 20_000 });
    await expect(
      gm.page.getByTestId(`pending-proposal-${proposalOne}`),
    ).toHaveCount(0, { timeout: 20_000 });

    // ...and the other is untouched. WHAT THE DOM CAN AND CANNOT SAY:
    // the GM's queue is accumulated in the browser from `CampaignProposal`
    // frames and an entry leaves it only when a `CampaignDecision` for
    // THAT id arrives (`CampaignCoopRouteSurfaceConnected`), so these
    // three rows prove exactly the letter's "the GM SHALL see" clause -
    // and nothing about the authority's own queue. MEASURED: an arbiter
    // mutated to drop every pending proposal on one decision leaves all
    // of them green.
    await expect(reviewItems).toHaveCount(1);
    await expect(
      gm.page.getByTestId(`pending-proposal-${proposalTwo}`),
    ).toHaveCount(1);
    expect(
      await gm.page
        .getByTestId(`proposal-balance-${proposalTwo}`)
        .textContent(),
    ).toEqual(balanceBefore);
    await expect(
      playerTwo.page.getByTestId('guest-proposal-pending'),
    ).toBeVisible();
    await expect(
      playerTwo.page.getByTestId('guest-proposal-vetoed'),
    ).toHaveCount(0);

    // (d) THE AUTHORITY still holds the other proposal, and that is what
    // "resolving one SHALL not alter the other" actually asserts. The
    // only way to read the arbiter's queue from a browser is to use it:
    // approving the survivor has to commit, which needs the entry the
    // first decision must not have disturbed. An arbiter that dropped it
    // answers nothing, and this guest stays pending forever.
    await gm.page.getByTestId(`approve-${proposalTwo}`).click();
    await expect(
      playerTwo.page.getByTestId('guest-proposal-committed'),
    ).toBeVisible({ timeout: 30_000 });
    // The first player's outcome is still its own: vetoed, not committed
    // by its neighbour's approval.
    await expect(
      playerOne.page.getByTestId('guest-proposal-vetoed'),
    ).toBeVisible();
    await expect(
      playerOne.page.getByTestId('guest-proposal-committed'),
    ).toHaveCount(0);
  } finally {
    await fixture.cleanup();
  }
});

// ---------------------------------------------------------------------------
// Fixture driving (helpers modelled on
// e2e/authority-privacy-three-context.spec.ts, which owns the only other
// co-op UI join rig; consolidating them is its own seam)
// ---------------------------------------------------------------------------

/** The fixture's per-role vault password, derived from its run seed. */
function fixturePassword(role: Role, seed: string): string {
  return `GM2P-${role}-${seed.slice(0, 16)}!`;
}

function clientByRole(fixture: Fixture, role: Role): Client {
  const found = fixture.clients.find((client) => client.role === role);
  if (!found) throw new Error(`fixture client missing for ${role}`);
  return found;
}

/**
 * The vault mint unlocks `repository.getActive()` only, and the fixture
 * seeds three identities in one process, so only the last-seeded vault
 * is active. Each context therefore replays the wire token the fixture
 * already minted for it instead of re-minting one that would 401.
 */
async function reuseFixtureIssuedToken(
  page: Page,
  fixtureSessionId: string,
): Promise<void> {
  const issued = await readCoopToken(page, fixtureSessionId);
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

/** The wire identity the fixture stored for this page's context. */
async function readCoopToken(
  page: Page,
  sessionId: string,
): Promise<StoredToken> {
  const stored = await page.evaluate((id) => {
    const raw = sessionStorage.getItem(`mekstation.coopCampaign.token.${id}`);
    return raw === null ? null : (JSON.parse(raw) as unknown);
  }, sessionId);
  if (
    typeof stored !== 'object' ||
    stored === null ||
    typeof (stored as StoredToken).wireToken !== 'string' ||
    (stored as StoredToken).wireToken.length === 0
  ) {
    throw new Error(`co-op token missing for session ${sessionId}`);
  }
  return stored as StoredToken;
}

/** Host opens a co-op session from the dashboard; returns its room code. */
async function openCoopSession(page: Page, seed: string): Promise<string> {
  await expect(page.getByTestId('create-coop-campaign-btn')).toBeVisible({
    timeout: 30_000,
  });
  await page
    .getByTestId('create-coop-password-input')
    .fill(fixturePassword('future-gm', seed));
  const created = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/multiplayer/matches') &&
      response.request().method() === 'POST' &&
      response.status() === 201,
    { timeout: 30_000 },
  );
  await Promise.all([
    page.waitForURL(/\/gameplay\/campaigns\/[^/]+$/, { timeout: 30_000 }),
    page.getByTestId('create-coop-campaign-btn').click(),
  ]);
  const body = (await (await created).json()) as {
    readonly roomCode?: string;
    readonly meta?: { readonly roomCode?: string };
  };
  const roomCode = body.roomCode ?? body.meta?.roomCode ?? null;
  if (roomCode === null) throw new Error('co-op room code missing');
  await expect(page.getByTestId('coop-session-badge')).toContainText(
    'Co-op session: Host',
    { timeout: 30_000 },
  );
  await expect(page.getByTestId('host-gm-review-surface')).toBeVisible({
    timeout: 30_000,
  });
  return roomCode;
}

async function joinGuestByRoomCode(
  client: Client,
  roomCode: string,
  seed: string,
): Promise<void> {
  const { page } = client;
  await page.goto('/gameplay/campaigns');
  await page.waitForLoadState('domcontentloaded');
  await page.getByTestId('join-coop-campaign-btn').click();
  await expect(page.getByTestId('join-coop-dialog')).toBeVisible({
    timeout: 30_000,
  });
  await page.getByTestId('join-coop-room-code-input').fill(roomCode);
  await page
    .getByTestId('join-coop-password-input')
    .fill(fixturePassword(client.role, seed));
  await Promise.all([
    page.waitForURL(/\/gameplay\/campaigns\/[^/]+$/, { timeout: 30_000 }),
    page.getByTestId('join-coop-submit-btn').click(),
  ]);
  await expect(page.getByTestId('coop-session-badge')).toContainText(
    'Co-op session: Guest',
    { timeout: 30_000 },
  );
  await expect(page.getByTestId('guest-mirror-sync-status')).toContainText(
    'synced',
    { timeout: 30_000 },
  );
}

/** A guest's finances route is where `SpendFunds` can be proposed. */
async function openProposalSurface(
  page: Page,
  campaignId: string,
): Promise<void> {
  await page.goto(`/gameplay/campaigns/${campaignId}/finances`);
  await expect(page.getByTestId('guest-proposal-surface')).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId('guest-action-SpendFunds')).toBeEnabled({
    timeout: 30_000,
  });
}

function campaignIdFromUrl(page: Page): string {
  const match = /\/gameplay\/campaigns\/([^/?#]+)/.exec(page.url());
  if (!match?.[1]) throw new Error(`campaign id missing from ${page.url()}`);
  return decodeURIComponent(match[1]);
}

/** The proposal id carried by one rendered review item's test id. */
async function proposalIdOf(
  item: ReturnType<Page['locator']>,
): Promise<string> {
  const testId = (await item.getAttribute('data-testid')) ?? '';
  const prefix = 'pending-proposal-';
  if (!testId.startsWith(prefix)) {
    throw new Error(`review item carried no proposal id: "${testId}"`);
  }
  return testId.slice(prefix.length);
}
