/**
 * E2E-14 launch/socket drive: isolate one viewer by swallowing DeliveryAck.
 *
 * Launch is `launchOneVersusOne` (vault, room-code join, per-seat
 * `markReady`, Launch match, Movement) plus the E2E-07 spectate door
 * for Player 2. A bare Ready click is in the DOM but never actionably
 * stable while lobby seats churn. Evidence/asserts live in
 * `viewerUnackedBoundEvidence.ts`.
 */

import { expect, type APIRequestContext, type Page } from '@playwright/test';

import {
  launchOneVersusOne,
  readToken,
  seedIdentity,
  type IMatchHandle,
  type IMatchToken,
} from './gmTwoPlayerMatchFlow';
import { type IIntentTap } from './viewerUnackedBoundEvidence';

export type { IIntentTap } from './viewerUnackedBoundEvidence';
export type {
  IViewerBoundEvidence,
  IViewerDeliveryRow,
  IViewerIssuedAck,
} from './viewerUnackedBoundEvidence';
export {
  assertContiguousFromZero,
  deliveryRowsFor,
  driveTwoMoreAdvances,
  driveUntilPlayer2Capped,
  firstAuthorityAfter,
  lifecycleState,
  playerUnacked,
  readViewerBoundEvidence,
  unitTokenIds,
  viewerUnacked,
  VIEWER_UNACKED_CAP,
} from './viewerUnackedBoundEvidence';

export interface IThreeViewerMatch {
  readonly match: IMatchHandle;
  readonly gmToken: IMatchToken;
  readonly p1Token: IMatchToken;
  readonly p2Token: IMatchToken;
  readonly identityIds: readonly string[];
}

export interface IAckSwallow {
  readonly arm: () => void;
  readonly disarm: () => void;
  readonly install: () => Promise<void>;
}

export function isDeliveryAckFrame(message: unknown): boolean {
  try {
    const frame = JSON.parse(String(message)) as { kind?: unknown };
    return frame.kind === 'DeliveryAck';
  } catch {
    return false;
  }
}

/** Swallow outgoing DeliveryAck only, and only after arm(). */
export function installAckSwallow(
  page: Page,
  socketUrls: string[],
): IAckSwallow {
  let armed = false;
  return {
    arm: () => {
      armed = true;
    },
    disarm: () => {
      armed = false;
    },
    install: () =>
      page.routeWebSocket(
        (url) => {
          if (url.pathname !== '/api/multiplayer/socket') return false;
          socketUrls.push(url.toString());
          return true;
        },
        (route) => {
          const server = route.connectToServer();
          route.onMessage((message) => {
            // Armed drop is DeliveryAck only — SessionJoin, Intent, and
            // heartbeat must still reach the host or this becomes E2E-66.
            if (armed && isDeliveryAckFrame(message)) return;
            server.send(message);
          });
          server.onMessage((message) => route.send(message));
        },
      ),
  };
}

/** Pass-through tap that can inject on the page's own socket. */
export function installIntentTap(
  page: Page,
  socketUrls: string[],
): IIntentTap {
  const sent: string[] = [];
  let serverHandle: { send: (message: string) => void } | null = null;
  return {
    sent,
    inject: (frame: unknown) => {
      if (!serverHandle) {
        throw new Error('inject called before the socket route was taken');
      }
      serverHandle.send(JSON.stringify(frame));
    },
    install: () =>
      page.routeWebSocket(
        (url) => {
          if (url.pathname !== '/api/multiplayer/socket') return false;
          socketUrls.push(url.toString());
          return true;
        },
        (route) => {
          const server = route.connectToServer();
          serverHandle = server;
          route.onMessage((message) => {
            sent.push(String(message));
            server.send(message);
          });
          server.onMessage((message) => route.send(message));
        },
      ),
  };
}

function waitAuthToken(
  page: Page,
): Promise<import('@playwright/test').Response> {
  return page.waitForResponse(
    (response) =>
      response.url().includes('/api/multiplayer/auth/token') &&
      response.request().method() === 'POST' &&
      response.status() === 200,
    { timeout: 30_000 },
  );
}

/**
 * Vault used for the post-launch spectate seat. Recovery remounts that
 * page and must mint the same durable identity.
 */
export const P2_VAULT_PASSWORD = 'ResilienceP2-123!';

/**
 * Cold-reload the isolated spectator back onto the game surface.
 *
 * WHY not in-place (A): DeliveryAck is sent only after a frame applies
 * (`client.ts` completeDeliveryApplication → sendDeliveryAck). There is
 * no timer re-ack. Live admit() refuses an isolated viewer
 * (ServerMatchHostEvents), so nothing arrives to trigger an ack. The
 * client reconnects only on socket close, not on the behind lifecycle
 * flag, and Heartbeats keep the socket alive. Disarming the swallow
 * therefore cannot un-isolate this socket.
 *
 * WHY not E2E-17's lobby URL: that door is sessionStorage keyed by
 * room code (`lobby/[roomCode].tsx` + multiplayerAuthTokenStore).
 * Player 2 joined via `/multiplayer/spectate/:matchId` after launch
 * and never stored a room-code identity. LaunchMatch clears the
 * invite; a stranger on the lobby URL gets 404 and no matchId fallback.
 *
 * Spectate keeps the token in React state only. Reload shows
 * "Unlock vault to spectate". Re-minting this vault opens a new
 * socket; SessionJoin without a deliveryCursor starts at 0
 * (ServerMatchHost.handleSessionJoin). Replay stamps reuse issued
 * rows and assign the isolationResume tail (admit() is live-only),
 * then apply-then-ack clears isolation.
 */
export async function recoverSpectatorAfterIsolation(
  page: Page,
  vaultPassword: string,
): Promise<void> {
  const tokenResponse = waitAuthToken(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(
    page.getByRole('heading', { name: 'Unlock vault to spectate' }),
  ).toBeVisible({ timeout: 30_000 });
  await page.getByPlaceholder('Vault password').fill(vaultPassword);
  await page.getByRole('button', { name: 'Watch match' }).click();
  await readToken(tokenResponse);
  await expect(page.getByTestId('networked-game-surface')).toBeVisible({
    timeout: 60_000,
  });
}

/**
 * Host + guest through `launchOneVersusOne` (E2E-15's Movement door),
 * then Player 2 on the post-launch spectate path (E2E-07). Spectate
 * only accepts an active match, so it cannot join the lobby.
 */
export async function launchThreeViewersToMovement(input: {
  readonly request: APIRequestContext;
  readonly gmPage: Page;
  readonly p1Page: Page;
  readonly p2Page: Page;
}): Promise<IThreeViewerMatch> {
  const gmPassword = 'ResilienceGm123!';
  const p1Password = 'ResilienceP1-123!';
  const p2Password = P2_VAULT_PASSWORD;
  const { request, gmPage, p1Page, p2Page } = input;
  const browser = gmPage.context().browser();
  if (!browser) {
    throw new Error('launchThreeViewersToMovement needs a browser-backed page');
  }

  // Guest token is minted inside connectLobby; arm the waiter first.
  const p1TokenResponse = waitAuthToken(p1Page);
  const launched = await launchOneVersusOne({
    browser,
    request,
    hostPage: gmPage,
    guestPage: p1Page,
    hostName: 'Resilience GM',
    guestName: 'Resilience P1',
    hostPassword: gmPassword,
    guestPassword: p1Password,
    turnLimit: '50',
  });
  const p1Token = await readToken(p1TokenResponse);

  // Seed last so mintToken on the spectate page unlocks this vault.
  const spectator = await seedIdentity(request, 'Resilience P2', p2Password);
  const p2TokenResponse = waitAuthToken(p2Page);
  await p2Page.goto(`/multiplayer/spectate/${launched.match.matchId}`);
  await p2Page.getByPlaceholder('Vault password').fill(p2Password);
  await p2Page.getByRole('button', { name: 'Watch match' }).click();
  const p2Token = await readToken(p2TokenResponse);
  await expect(p2Page.getByTestId('networked-game-surface')).toBeVisible({
    timeout: 30_000,
  });
  await expect(p2Page.getByTestId('phase-name')).toContainText(/Movement/i, {
    timeout: 30_000,
  });

  return {
    match: launched.match,
    gmToken: launched.hostToken,
    p1Token,
    p2Token,
    identityIds: [...launched.identityIds, spectator.id],
  };
}
