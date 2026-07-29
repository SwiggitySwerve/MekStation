import { expect, test } from '@playwright/test';

import { createGmTwoPlayerCampaignFixture } from './fixtures/gmTwoPlayerCampaign';
test('creates three isolated future-role contexts @fixture-smoke', async ({
  baseURL,
  browser,
  request,
}) => {
  const fixture = await createGmTwoPlayerCampaignFixture({
    browser,
    request,
    baseURL: baseURL ?? '',
  });
  try {
    expect(fixture).toMatchObject({
      clients: { length: 3 },
      session: {
        ownerRunId: fixture.runId,
        id: expect.stringMatching(/^gm2p-/),
      },
      server: {
        owner: 'playwright-web-server',
        ownerRunId: fixture.runId,
        baseURL,
      },
    });
    expect(new Set(fixture.clients.map(({ context }) => context)).size).toBe(3);
    for (const field of ['id', 'playerId', 'authFingerprint'] as const) {
      expect(
        new Set(fixture.clients.map((client) => client.identity[field])).size,
      ).toBe(3);
    }
    for (const client of fixture.clients) {
      await expect(client.page).toHaveURL(/\/gameplay\/campaigns$/);
      await expect(
        client.page.getByTestId('create-coop-campaign-btn'),
      ).toBeVisible();
      const authKey = `${AUTH_PREFIX}${fixture.session.id}`;
      const storage = await client.page.evaluate(
        ({ authKey, prefix }) => {
          const matching = (store: Storage) =>
            Object.keys(store).filter((key) => key.startsWith(prefix));
          const parsed = JSON.parse(
            sessionStorage.getItem(authKey) ?? '{}',
          ) as Record<string, unknown>;
          return {
            local: matching(localStorage),
            session: Object.keys(sessionStorage),
            auth: {
              matchId: parsed.matchId,
              playerId: parsed.playerId,
              wireTokenLength:
                typeof parsed.wireToken === 'string'
                  ? parsed.wireToken.length
                  : 0,
            },
          };
        },
        { authKey, prefix: STORAGE_PREFIX },
      );
      expect(storage.local).toEqual([client.storageKey]);
      expect(storage.session.sort()).toEqual(
        [authKey, client.storageKey].sort(),
      );
      expect(storage.auth).toMatchObject({
        matchId: fixture.session.id,
        playerId: client.identity.playerId,
      });
      expect(storage.auth.wireTokenLength).toBeGreaterThan(0);
    }
  } finally {
    await fixture.cleanup();
  }
});
const STORAGE_PREFIX = 'mekstation.gm-two-player.fixture.';
const AUTH_PREFIX = 'mekstation.coopCampaign.token.';
