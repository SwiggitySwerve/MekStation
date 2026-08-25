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
    // Task 20.3: the run's own databases are readable through a
    // dedicated read-only connection, never the production store. A
    // schema surface with tables in it is the proof the reader is
    // pointed at the real file rather than one it created.
    const evidence = fixture.openEvidence('app');
    try {
      const before = evidence.fileHash();
      expect(evidence.tables().length).toBeGreaterThan(0);
      // Reading changed nothing, which is what makes the artifact
      // describe the run rather than the probe.
      expect(evidence.fileHash()).toBe(before);
    } finally {
      evidence.close();
    }
  } finally {
    await fixture.cleanup();
  }
});
const STORAGE_PREFIX = 'mekstation.gm-two-player.fixture.';
const AUTH_PREFIX = 'mekstation.coopCampaign.token.';
