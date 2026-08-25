/**
 * Ownership-scoped cleanup (harden-gm-two-player-campaign-sessions 20.5).
 *
 * The sandbox creates three browser contexts and three vault identities
 * per run, then tears them down. Task 20.5 requires that teardown to
 * "preserve ambient browser tabs, Chrome processes, unrelated servers,
 * databases, and user artifacts" — and the failure it guards against is
 * one a developer meets personally: a cleanup that closes every context
 * on the browser, or deletes every seeded identity, takes their own tabs
 * and data with it.
 *
 * The implementation is already scoped — it closes only the contexts it
 * opened and deletes only the identity ids it recorded. What was missing
 * is PROOF. Scoping that nothing asserts is scoping one refactor away
 * from being lost, and the loss is silent: an over-reaching cleanup
 * still makes the suite pass, it just destroys things around it.
 *
 * The identity half found a REAL defect rather than confirming one.
 * Seeding calls `setActive`, whose SQL is `UPDATE vault_identities SET
 * is_active = 0` across the whole table - so the sandbox deactivated
 * whatever identity the machine had, and deleting its own three then
 * left NO active identity at all. `getActive()` returned null and
 * multiplayer auth answered 404 "No vault identity configured": a
 * developer's own session silently stopped working after running this
 * suite. The fixture now records the prior active id before its first
 * seed and restores it on teardown; this row is what holds that.
 *
 * @tags @gm-two-player @sandbox
 */

import { expect, test, type APIRequestContext } from '@playwright/test';

import { createGmTwoPlayerCampaignFixture } from './fixtures/gmTwoPlayerCampaign';

const RUN_ID_HEADER = 'x-playwright-e2e-run-id';

/** An identity this spec owns, which the fixture must never touch. */
async function seedAmbientIdentity(
  request: APIRequestContext,
  runId: string,
): Promise<{ id: string; displayName: string; password: string }> {
  const displayName = `Ambient Bystander ${runId.slice(0, 8)}`;
  const password = `Ambient-${runId.slice(0, 12)}!`;
  const response = await request.post('/api/e2e/vault-identity', {
    headers: { [RUN_ID_HEADER]: runId },
    data: { displayName, password, runId },
  });
  expect(response.status(), await response.text()).toBe(201);
  const seeded = (await response.json()) as { id: string };
  return { id: seeded.id, displayName, password };
}

/**
 * Which identity the machine currently treats as active.
 *
 * This is the state the sandbox displaces, so it is the state teardown
 * has to hand back. Read through the same e2e route the harness uses
 * rather than the database, so the row proves the contract callers see.
 */
async function activeIdentityId(
  request: APIRequestContext,
  runId: string,
): Promise<string | null> {
  const response = await request.get('/api/e2e/vault-identity', {
    headers: { [RUN_ID_HEADER]: runId },
  });
  expect(response.status(), await response.text()).toBe(200);
  return ((await response.json()) as { activeId: string | null }).activeId;
}

test.describe('gm-two-player sandbox cleanup is ownership-scoped', () => {
  test('preserves an ambient context and an unrelated identity', async ({
    browser,
    request,
    baseURL,
  }) => {
    test.setTimeout(180_000);
    const runId = process.env.PLAYWRIGHT_E2E_RUN_ID;
    test.skip(!runId, 'sandbox fixture requires PLAYWRIGHT_E2E_RUN_ID');
    if (!runId || !baseURL) return;

    // A bystander: a context and an identity that belong to no fixture.
    // This is the developer's own tab and their own saved data.
    const ambientContext = await browser.newContext();
    const ambientPage = await ambientContext.newPage();
    await ambientPage.goto(`${baseURL}/`);
    const ambientIdentity = await seedAmbientIdentity(request, runId);
    // Seeding made it active - that is the state a developer would have
    // arrived with, and the state the sandbox is about to displace.
    expect(await activeIdentityId(request, runId)).toBe(ambientIdentity.id);

    const contextsBefore = browser.contexts().length;

    try {
      const fixture = await createGmTwoPlayerCampaignFixture({
        browser,
        request,
        baseURL,
      });
      // The fixture really did add its own contexts, or the assertions
      // below would pass against a fixture that created nothing.
      expect(browser.contexts().length).toBeGreaterThan(contextsBefore);
      expect(fixture.clients).toHaveLength(3);

      await fixture.cleanup();

      // Its three contexts are gone and the bystander's is not.
      expect(browser.contexts()).toContain(ambientContext);
      expect(browser.contexts().length).toBe(contextsBefore);
      for (const client of fixture.clients) {
        expect(browser.contexts()).not.toContain(client.context);
      }

      // The ambient page is still usable, not merely still listed - a
      // context object can survive while its pages are destroyed.
      await ambientPage.goto(`${baseURL}/`);
      expect(ambientPage.isClosed()).toBe(false);

      // And the machine is back on the identity it started with. Before
      // the fixture restored it, this read null and multiplayer auth
      // answered 404 - the developer was logged out by a test.
      expect(await activeIdentityId(request, runId)).toBe(ambientIdentity.id);
    } finally {
      await request.delete('/api/e2e/vault-identity', {
        headers: { [RUN_ID_HEADER]: runId },
        data: { ids: [ambientIdentity.id], runId },
      });
      await ambientContext.close();
    }
  });

  test('is idempotent, so a second teardown destroys nothing further', async ({
    browser,
    request,
    baseURL,
  }) => {
    test.setTimeout(180_000);
    const runId = process.env.PLAYWRIGHT_E2E_RUN_ID;
    test.skip(!runId, 'sandbox fixture requires PLAYWRIGHT_E2E_RUN_ID');
    if (!runId || !baseURL) return;

    // A spec that cleans up in a `finally` AND on an error path calls
    // this twice. A second pass that re-issued the delete would start
    // reaching for ids it no longer owns.
    const ambientContext = await browser.newContext();
    const ambientIdentity = await seedAmbientIdentity(request, runId);
    const contextsBefore = browser.contexts().length;

    try {
      const fixture = await createGmTwoPlayerCampaignFixture({
        browser,
        request,
        baseURL,
      });
      await fixture.cleanup();
      await fixture.cleanup();

      expect(browser.contexts().length).toBe(contextsBefore);
      expect(browser.contexts()).toContain(ambientContext);
      expect(await activeIdentityId(request, runId)).toBe(ambientIdentity.id);
    } finally {
      await request.delete('/api/e2e/vault-identity', {
        headers: { [RUN_ID_HEADER]: runId },
        data: { ids: [ambientIdentity.id], runId },
      });
      await ambientContext.close();
    }
  });
});
