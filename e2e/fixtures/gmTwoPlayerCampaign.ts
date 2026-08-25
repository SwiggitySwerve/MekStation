import {
  expect,
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  type Page,
} from '@playwright/test';
import { createHash } from 'node:crypto';
import path from 'node:path';
const RUN_ID_HEADER = 'x-playwright-e2e-run-id';
const AUTH_PREFIX = 'mekstation.coopCampaign.token.';
const STORAGE_PREFIX = 'mekstation.gm-two-player.fixture.';
const ROLES = ['future-gm', 'future-player-1', 'future-player-2'] as const;
const guards = require('../../scripts/qc/gm-two-player-campaign-core.cjs');
type Identity = { id: string; playerId: string; authFingerprint: string };
type Client = {
  ownerRunId: string;
  role: (typeof ROLES)[number];
  context: BrowserContext;
  page: Page;
  storageKey: string;
  identity: Identity;
};
export async function createGmTwoPlayerCampaignFixture({
  browser,
  request,
  baseURL,
}: {
  browser: Browser;
  request: APIRequestContext;
  baseURL: string;
}) {
  const runId = process.env.PLAYWRIGHT_E2E_RUN_ID;
  if (!runId) throw new Error('PLAYWRIGHT_E2E_RUN_ID is required');
  const seed = digest(`gm-two-player-fixture:${runId}`);
  const fixtureSessionId = `gm2p-${seed.slice(0, 20)}`;
  const runtimeRoot = path.resolve('.sisyphus/e2e-runtime');
  const clients: Client[] = [];
  const identityIds: string[] = [];
  let cleanedUp = false;
  // Seeding an identity calls setActive, which deactivates EVERY other
  // identity on the machine. Capture what was active BEFORE the first
  // seed so teardown can put it back - otherwise a developer who runs
  // this suite is left with no active vault identity and their own
  // session silently stops working (task 20.5, "preserve user
  // artifacts").
  const priorActive = await request.get('/api/e2e/vault-identity', {
    headers: { [RUN_ID_HEADER]: runId },
  });
  expect(priorActive.status(), await priorActive.text()).toBe(200);
  const priorActiveId = (
    (await priorActive.json()) as { activeId: string | null }
  ).activeId;

  const cleanup = async () => {
    if (cleanedUp) return;
    cleanedUp = true;
    for (const client of clients) await client.context.close();
    const response = await request.delete('/api/e2e/vault-identity', {
      headers: { [RUN_ID_HEADER]: runId },
      data: {
        ids: identityIds,
        runId,
        // Null when the machine had no active identity to begin with:
        // restoring "nothing" is the correct end state there, and the
        // route only reactivates when an id is actually named.
        ...(priorActiveId === null ? {} : { restoreActiveId: priorActiveId }),
      },
    });
    expect(response.status(), await response.text()).toBe(200);
  };
  try {
    for (const role of ROLES) {
      const password = `GM2P-${role}-${seed.slice(0, 16)}!`;
      const seeded = await postJson<{
        id: string;
        displayName: string;
      }>(
        request.post('/api/e2e/vault-identity', {
          headers: { [RUN_ID_HEADER]: runId },
          data: {
            displayName: `GM2P ${role} ${seed.slice(0, 8)}`,
            password,
            runId,
          },
        }),
        201,
      );
      identityIds.push(seeded.id);
      const token = await postJson<{ token: string; playerId: string }>(
        request.post('/api/multiplayer/auth/token', {
          data: { password, displayName: seeded.displayName },
        }),
        200,
      );
      const identity = {
        id: seeded.id,
        playerId: token.playerId,
        authFingerprint: digest(token.token),
      };
      const storageKey = `${STORAGE_PREFIX}${role}`;
      const context = await browser.newContext({ baseURL });
      await context.addInitScript(
        ({ authKey, authState, key, state }) => {
          localStorage.setItem(key, state);
          sessionStorage.setItem(key, state);
          sessionStorage.setItem(authKey, authState);
        },
        {
          authKey: `${AUTH_PREFIX}${fixtureSessionId}`,
          authState: JSON.stringify({
            matchId: fixtureSessionId,
            playerId: identity.playerId,
            wireToken: token.token,
            displayName: seeded.displayName,
          }),
          key: storageKey,
          state: JSON.stringify({
            runId,
            fixtureSessionId,
            role,
            identityId: identity.id,
            playerId: identity.playerId,
            authFingerprint: identity.authFingerprint,
          }),
        },
      );
      const page = await context.newPage();
      clients.push({
        ownerRunId: runId,
        role,
        context,
        page,
        storageKey,
        identity,
      });
      await page.goto('/gameplay/campaigns');
    }
    const database = (name: string) => ({
      ownerRunId: runId,
      path: guards.assertRunOwnedPath(
        path.join(runtimeRoot, runId, name),
        runId,
        runtimeRoot,
      ),
    });
    return {
      runId,
      seed,
      session: {
        ownerRunId: runId,
        id: fixtureSessionId,
      },
      server: {
        owner: 'playwright-web-server' as const,
        ownerRunId: runId,
        baseURL,
      },
      databases: {
        app: database('mekstation.db'),
        multiplayer: database('multiplayer-matches.db'),
      },
      clients,
      cleanup,
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
async function postJson<T>(
  responsePromise: ReturnType<APIRequestContext['post']>,
  status: number,
): Promise<T> {
  const response = await responsePromise;
  expect(response.status(), await response.text()).toBe(status);
  return (await response.json()) as T;
}
function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
