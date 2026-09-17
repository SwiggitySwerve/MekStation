/**
 * Conflict-message pack - E2E-77 (umbrella 22.3), roadmap unit U1d.
 *
 * E2E-77: WHEN a command rejects for stale revision, stale branch,
 * authorization, integrity, or rebuild THEN the UI SHALL identify the
 * actor-safe conflict class, base revision or branch, and recovery
 * action without leaking private data.
 *
 * ONE ROW, the reachable integrity class. Per variant the player-visible
 * IntentErrorToast (NetworkedGameSurface.overlays.tsx:230-253) is
 * asserted for the class code, the verbatim named recovery the product
 * actually renders (the toast reason — refuse() attaches recoveryAction
 * only on the STALE_BRANCH arm, so tactical-branch-recovery-action stays
 * absent), and leak safety against the live peer playerId, wire token
 * and session token. The harness COLLIDES and RESENDS real frames; it
 * never invents a refusal code.
 *
 * sequence-collision: collideNextDelivery forwards a real Event and a
 * twin at the same delivery sequence with a different event.id, the
 * condition client.ts:379-383 emits PROTOCOL_VIOLATION / sequence-collision.
 * duplicate-intent: one accepted GoProne is resent with the same
 * intentId; ServerMatchHostIntent.ts:261-272 answers DUPLICATE_INTENT /
 * Intent id already accepted for this match.
 *
 * NON-CLAIMS, measured, not faked. stale-branch: STALE_BRANCH is
 * unreachable for match streams (PK-rewind-branch-reader); this header,
 * the 22.3 PROGRESS note and the receipt say so. authorization / GM_ONLY:
 * AdvancePhaseIntentSchema (Protocol.ts:225-227) strips targetRevision
 * at the socket door (z.object default, documented at :383-384), so
 * namesRewindCut never sees a rewind-cut on the wire; RewindRequest is
 * the player-safe request and answers INVALID_INTENT /
 * accepted-for-gm-review, not GM_ONLY. rebuild / campaign stale head:
 * commands.ts:139-148 never forwards expectedRevision, so the HTTP
 * STALE_REVISION 409 cannot be produced; wire CAMPAIGN_STALE_HEAD is a
 * lost-race behind CampaignMatchHost.runExclusive with no in-paths
 * store interloper. PROJECTION_REBUILDING: no in-paths lever acquires a
 * correction lease.
 *
 * FINDING carried from U1c, reported not fixed: a launched match leaves
 * both surfaces at pending (SetReady answered by LobbyUpdated). This
 * row reloads once after launch.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/e2e-testing/spec.md (E2E-77)
 * @tags @conflict-pack @E2E-77
 */

import { expect, test, type Page } from '@playwright/test';
import crypto from 'node:crypto';

import {
  advancePhase,
  deleteIdentities,
  launchOneVersusOne,
  openContextPage,
} from './helpers/gmTwoPlayerMatchFlow';
import { unitIdOnSide } from './helpers/gmTwoPlayerRewind';

const HOST_PASSWORD = 'ConflictPackHost123!';
const GUEST_PASSWORD = 'ConflictPackGuest123!';

const COLLISION_CODE = 'PROTOCOL_VIOLATION';
const COLLISION_RECOVERY = 'sequence-collision';
const DUPLICATE_CODE = 'DUPLICATE_INTENT';
const DUPLICATE_RECOVERY = 'Intent id already accepted for this match';

type WireFrame = Record<string, unknown>;

interface IConflictIdentity {
  readonly matchId: string;
  readonly playerId: string;
  readonly token: string;
}

interface IConflictHarness {
  readonly identity: IConflictIdentity | null;
  send(frame: WireFrame): void;
  collideNextDelivery(): void;
}

test('E2E-77 reachable conflict messages are actionable and leak-safe @conflict-pack @E2E-77', async ({
  browser,
  request,
}) => {
  test.setTimeout(180_000);
  const captured: string[] = [];
  let identityIds: readonly string[] = [];
  const hostPage = await openContextPage(browser);
  const guestPage = await openContextPage(browser);
  const harness = await installConflictHarness(guestPage);
  try {
    const live = await launchOneVersusOne({
      browser,
      request,
      hostPage,
      guestPage,
      hostName: 'Conflict Host',
      guestName: 'Conflict Guest',
      hostPassword: HOST_PASSWORD,
      guestPassword: GUEST_PASSWORD,
    });
    identityIds = live.identityIds;

    // FN-u1c-pending-intent-never-settles. Reloading clears the lobby
    // SetReady that never settles, so the duplicate arm is this row's
    // Intent rather than that defect. BOTH surfaces must be back before
    // the first GoProne: sending while the host is still reconnecting
    // answers MATCH_PAUSED (measured: toast received that instead of
    // DUPLICATE_INTENT).
    await Promise.all([guestPage.reload(), hostPage.reload()]);
    await expect(hostPage.getByTestId('networked-game-surface')).toBeVisible({
      timeout: 30_000,
    });
    await expect(guestPage.getByTestId('networked-game-surface')).toBeVisible({
      timeout: 30_000,
    });
    await expect(hostPage.getByTestId('phase-name')).toContainText(
      /Movement/i,
      {
        timeout: 30_000,
      },
    );
    await expect(guestPage.getByTestId('phase-name')).toContainText(
      /Movement/i,
      { timeout: 30_000 },
    );
    await expect
      .poll(() => harness.identity, { timeout: 30_000 })
      .not.toBeNull();

    const identity = requiredIdentity(harness);
    const secrets = [
      live.hostToken.playerId,
      live.hostToken.token,
      identity.playerId,
      identity.token,
    ].filter((value) => value.length > 0);

    const intentId = `conflict-dup-${crypto.randomUUID()}`;
    const unitId = await unitIdOnSide(guestPage, 'opponent');
    sendGoProne(harness, unitId, intentId);
    await expect
      .poll(
        () =>
          guestPage
            .getByTestId('tactical-lifecycle-state')
            .getAttribute('data-state'),
        { timeout: 15_000 },
      )
      .toBe('sealed');
    sendGoProne(harness, unitId, intentId);
    await captureConflict(
      guestPage,
      secrets,
      captured,
      'integrity-duplicate',
      DUPLICATE_CODE,
      DUPLICATE_RECOVERY,
    );

    harness.collideNextDelivery();
    await advancePhase(hostPage, guestPage);
    await captureConflict(
      guestPage,
      secrets,
      captured,
      'integrity-collision',
      COLLISION_CODE,
      COLLISION_RECOVERY,
    );

    expect(captured).toEqual(['integrity-duplicate', 'integrity-collision']);
    console.log(`[conflict-pack] captured=${captured.join(',')}`);
  } finally {
    await deleteIdentities(request, identityIds);
    await hostPage.context().close();
    await guestPage.context().close();
  }
});

async function captureConflict(
  page: Page,
  secrets: readonly string[],
  captured: string[],
  className: string,
  code: string,
  recovery: string,
): Promise<void> {
  const toast = page.getByTestId('intent-error-toast');
  const expected = `Action rejected (${code}): ${recovery}`;
  await expect(toast).toContainText(expected, { timeout: 15_000 });
  const text = (await toast.innerText()).trim();
  expect(text).toContain(`(${code})`);
  expect(text).toContain(recovery);
  // Safety property, not a regex proxy (U1b M4).
  for (const secret of secrets) {
    expect(text.includes(secret)).toBe(false);
  }
  await expect(page.getByTestId('tactical-branch-recovery-action')).toHaveCount(
    0,
  );
  captured.push(className);
}

function requiredIdentity(harness: IConflictHarness): IConflictIdentity {
  if (harness.identity === null) {
    throw new Error('No envelope identity was observed on this page socket');
  }
  return harness.identity;
}

function sendGoProne(
  harness: IConflictHarness,
  unitId: string,
  intentId: string,
): void {
  const identity = requiredIdentity(harness);
  harness.send({
    kind: 'Intent',
    matchId: identity.matchId,
    ts: new Date().toISOString(),
    playerId: identity.playerId,
    intentId,
    intent: { kind: 'GoProne', unitId },
  });
}

/**
 * Per-page transport harness. It RESENDS and COLLIDES real frames and
 * never invents a refusal code.
 */
async function installConflictHarness(page: Page): Promise<IConflictHarness> {
  let identity: IConflictIdentity | null = null;
  let sendToServer: ((text: string) => void) | null = null;
  let collide = false;

  await page.routeWebSocket(
    (url) => url.pathname === '/api/multiplayer/socket',
    (route) => {
      const server = route.connectToServer();
      sendToServer = (text) => server.send(text);
      route.onMessage((message) => {
        const frame = parseFrame(message);
        if (frame !== null && identity === null) {
          const matchId = stringField(frame, 'matchId');
          const playerId = stringField(frame, 'playerId');
          if (matchId !== null && playerId !== null) {
            identity = {
              matchId,
              playerId,
              token: stringField(frame, 'token') ?? '',
            };
          }
        }
        server.send(message);
      });
      server.onMessage((message) => {
        const frame = parseFrame(message);
        if (
          collide &&
          frame !== null &&
          stringField(frame, 'kind') === 'Event'
        ) {
          collide = false;
          const twin = collidingFrame(frame);
          if (twin === null) {
            throw new Error('Delivered frame could not be collided');
          }
          route.send(message);
          route.send(twin);
          return;
        }
        route.send(message);
      });
    },
  );

  return {
    get identity() {
      return identity;
    },
    send: (frame) => {
      if (sendToServer === null) throw new Error('No server handle yet');
      sendToServer(JSON.stringify(frame));
    },
    collideNextDelivery: () => {
      collide = true;
    },
  };
}

function parseFrame(message: unknown): WireFrame | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(message));
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
  return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
    ? (parsed as WireFrame)
    : null;
}

function collidingFrame(frame: WireFrame): string | null {
  const event = objectField(frame, 'event');
  const eventId = event === null ? null : stringField(event, 'id');
  return eventId === null
    ? null
    : JSON.stringify({
        ...frame,
        event: { ...event, id: `collision-${eventId}` },
      });
}

function stringField(frame: WireFrame, key: string): string | null {
  const value = frame[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function objectField(frame: WireFrame, key: string): WireFrame | null {
  const value = frame[key];
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as WireFrame)
    : null;
}

/**
 * Row 2, U7: E2E-77 authorization through the existing rewind-commit route.
 * The seated non-host uses its own credentials from the production login.
 * GM_ONLY's UI clause is NOT claimed: NetworkedGameSurface.tsx mounts the
 * rewind controls only for viewerRole === 'host-gm' and !spectator, and
 * NetworkedGameSurface.gmRewind.tsx mounts the dialog only while open.
 * The phrasing table's "Only the game master for this match can preview a
 * rewind." therefore has no non-host surface here. Assert the actual route
 * body, absent guest controls/dialog, and rendered guest text for leaks.
 * The row-1 header's wire GM_ONLY non-claim remains specific to that row;
 * this row sends no synthetic socket refusal and claims no other class.
 * No correction lease is acquired: exact body and forbidden-field checks
 * cover lease disclosure, but comparison against a live lease is not claimed.
 */
test('E2E-77 seated non-host rewind commit is refused and leak-safe @conflict-pack @E2E-77', async ({
  browser,
  request,
}) => {
  test.setTimeout(180_000);
  let identityIds: readonly string[] = [];
  const hostPage = await openContextPage(browser);
  const guestPage = await openContextPage(browser);
  const hostHarness = await installConflictHarness(hostPage);
  // Observer only: collision and send levers remain disarmed in this row.
  const harness = await installConflictHarness(guestPage);
  const guestTokenResponse = guestPage.waitForResponse(
    (response) =>
      response.url().includes('/api/multiplayer/auth/token') &&
      response.request().method() === 'POST' &&
      response.status() === 200,
    { timeout: 30_000 },
  );
  try {
    const live = await launchOneVersusOne({
      browser,
      request,
      hostPage,
      guestPage,
      hostName: 'Authorization Host',
      guestName: 'Authorization Guest',
      hostPassword: HOST_PASSWORD,
      guestPassword: GUEST_PASSWORD,
    });
    identityIds = live.identityIds;
    const guestToken = (await (await guestTokenResponse).json()) as {
      readonly playerId: string;
      readonly token: string;
    };
    await expect.poll(() => harness.identity).not.toBeNull();
    const identity = requiredIdentity(harness);
    expect(identity.matchId).toBe(live.match.matchId);
    expect(guestToken.playerId).toBe(identity.playerId);
    expect(guestToken.playerId).not.toBe(live.hostToken.playerId);
    expect(guestToken.token.length).toBeGreaterThan(0);
    await expect(
      hostPage.getByTestId('networked-gm-rewind-controls'),
    ).toBeVisible();
    await expect(
      guestPage.getByTestId('networked-gm-rewind-controls'),
    ).toHaveCount(0);

    const response = await guestPage
      .context()
      .request.post(`/api/matches/${live.match.matchId}/rewind-commit`, {
        headers: { Authorization: `Bearer ${guestToken.token}` },
        // Same baseline binding shape as useGmRewindProducers; authority
        // must refuse before validating the historical head or taking a lease.
        data: {
          targetRevision: 0,
          expectedBranchId: 'root',
          expectedRevision: 0,
          expectedDigest: '',
          expectedGeneration: 1,
        },
      });
    expect(response.status()).toBe(403);
    const body = await response.text();
    const answer = JSON.parse(body) as Record<string, unknown>;
    expect(answer.kind).toBe('refused');
    expect(answer.reason).toBe('gm-role-required');
    await expect(guestPage.getByTestId('gm-rewind-preview-dialog')).toHaveCount(
      0,
    );
    await expect(guestPage.getByTestId('gm-rewind-refusal')).toHaveCount(0);
    const rendered = await guestPage.locator('body').innerText();
    const cookies = [
      ...(await hostPage.context().cookies()),
      ...(await guestPage.context().cookies()),
    ];
    const secrets = [
      live.hostToken.playerId,
      live.hostToken.token,
      requiredIdentity(hostHarness).token,
      guestToken.playerId,
      guestToken.token,
      identity.token,
      ...cookies.map((cookie) => cookie.value),
    ].filter((value) => value.length > 0);
    for (const text of [body, rendered]) {
      for (const secret of secrets) {
        // Boolean assertion keeps any offending credential out of the report.
        expect(text.includes(secret)).toBe(false);
      }
      expect(
        /playerId|wireToken|sessionToken|leaseId|lease_id/i.test(text),
      ).toBe(false);
    }
    expect(answer).toEqual({
      kind: 'refused',
      reason: 'gm-role-required',
      detail: 'Only the owning GM can request GM intervention previews.',
    });
    console.log('[conflict-pack] captured=authorization-gm-role-required');
  } finally {
    await deleteIdentities(request, identityIds);
    await hostPage.context().close();
    await guestPage.context().close();
  }
});
