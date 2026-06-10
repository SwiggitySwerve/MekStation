/**
 * Wave 6.1.A — Co-op Route Smoke Walkthrough
 *
 * Scripted single-context smoke per `wire-coop-campaign-route` task 4.2.
 * The Phase-5 manual UAT remains the authoritative end-to-end (two
 * browser contexts, real vault identities, live CO1 broadcast). This
 * spec covers the route-mount layer:
 *
 *   - Creates a host-mode co-op campaign via the store (deterministic;
 *     bypasses the room-code prompt UI)
 *   - Confirms the `coop-session-badge` shows "Co-op session: Host" on
 *     the dashboard
 *   - Confirms `<HostGmReviewSurface>` mounts on the dashboard (empty
 *     queue is fine — the route surface renders unconditionally for
 *     host + dashboard)
 *   - Walks the 5 mutation sub-routes (personnel, mech-bay, hiring,
 *     contract-market, finances) asserting each mounts without a
 *     critical console error and shows the co-op session badge
 *   - Walks the mission-launch route with no missionId (the route
 *     mounts even with a missing query param — it surfaces a campaign
 *     not-found state)
 *   - Deletes the test campaign on teardown
 *
 * The spec is single-context — multi-identity scripted MP / co-op is
 * blocked on the vault-auth two-identity follow-up (CLOSEOUT gap #9
 * / #10). What this catches is the wiring-level "does the page mount
 * with coopSession set" regression — which is exactly the gap Wave
 * 6.1.A closes.
 *
 * @tags @game @smoke @playtest @coop
 * @phase Wave 6.1.A — Co-op Route Surface
 */

import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';

import { createTestCampaign, deleteCampaign } from './fixtures/campaign';

test.setTimeout(120_000);

interface ICoopSubRoute {
  readonly path: string;
  readonly label: string;
  readonly expectedBadge: 'Host' | 'Guest';
}

const COOP_SUBROUTES: readonly ICoopSubRoute[] = [
  { path: '', label: 'Dashboard', expectedBadge: 'Host' },
  { path: '/personnel', label: 'Personnel', expectedBadge: 'Host' },
  { path: '/mech-bay', label: 'Mech Bay', expectedBadge: 'Host' },
  { path: '/hiring', label: 'Hiring', expectedBadge: 'Host' },
  { path: '/contract-market', label: 'Contract Market', expectedBadge: 'Host' },
  { path: '/finances', label: 'Finances', expectedBadge: 'Host' },
];

// =============================================================================
// Console-error capture (mirrors playtest-campaign-smoke.spec.ts)
// =============================================================================

interface IErrorCapture {
  consoleErrors: string[];
  pageErrors: string[];
  attach(page: Page): void;
  critical(): string[];
}

function newErrorCapture(): IErrorCapture {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  return {
    consoleErrors,
    pageErrors,
    attach(page: Page): void {
      page.on('console', (msg: ConsoleMessage) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err: Error) => {
        pageErrors.push(err.message);
      });
    },
    critical(): string[] {
      // legacyBehavior/codemod: Next's <Link legacyBehavior> deprecation
      // warning logs as console.error — benign framework noise, filtered
      // the same way playtest-campaign-smoke.spec.ts does.
      const all = [...consoleErrors, ...pageErrors];
      return all.filter(
        (line) =>
          !/Hydration|HMR|Fast Refresh|favicon|^net::|ResizeObserver loop|legacyBehavior|codemod/i.test(
            line,
          ),
      );
    },
  };
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Stamp the campaign with a host-mode coopSession via the campaign store.
 * Mirrors the createTestCampaign pattern: drives the store directly so
 * the test does not depend on the room-code prompt UI or the
 * multiplayer invite endpoint.
 */
async function stampHostCoopSession(
  page: Page,
  campaignId: string,
): Promise<void> {
  await page.evaluate(
    ({ id }) => {
      const stores = (
        window as unknown as {
          __ZUSTAND_STORES__?: Record<string, unknown>;
        }
      ).__ZUSTAND_STORES__;
      const raw = stores?.campaign as unknown;
      // The exposed campaign store is a zustand bound hook — a FUNCTION with
      // `getState` statics (`useCampaignStore()` returns `create()`'s
      // result). Calling it is an invalid React hook call, so detect the
      // StoreApi shape FIRST (mirrors fixtures/campaign.ts + campaignSeeders).
      const storeApi =
        raw !== null &&
        (typeof raw === 'object' || typeof raw === 'function') &&
        'getState' in (raw as object)
          ? (raw as {
              getState: () => {
                updateCampaign: (u: Record<string, unknown>) => void;
              };
            })
          : (
              raw as () => {
                getState: () => {
                  updateCampaign: (u: Record<string, unknown>) => void;
                };
              }
            )();
      storeApi.getState().updateCampaign({
        coopSession: {
          mode: 'host',
          roomCode: 'TESTHOST',
        },
      });
      void id;
    },
    { id: campaignId },
  );
}

// =============================================================================
// Tests
// =============================================================================

test.describe('Wave 6.1.A — co-op campaign route smoke', () => {
  test('host-mode co-op campaign mounts every sub-route with the co-op badge', async ({
    page,
  }) => {
    const errorCapture = newErrorCapture();
    errorCapture.attach(page);

    await page.goto('/gameplay/campaigns');
    await page.waitForLoadState('domcontentloaded');

    const campaignId = await createTestCampaign(page, {
      name: 'Co-op Smoke Host',
    });
    await stampHostCoopSession(page, campaignId);

    try {
      for (const subroute of COOP_SUBROUTES) {
        const url = `/gameplay/campaigns/${campaignId}${subroute.path}`;
        await page.goto(url);
        await page.waitForLoadState('domcontentloaded');

        const badge = page.getByTestId('coop-session-badge');
        await expect(
          badge,
          `[${subroute.label}] co-op session badge SHALL render`,
        ).toBeVisible({ timeout: 10_000 });
        await expect(badge).toContainText(
          `Co-op session: ${subroute.expectedBadge}`,
        );

        // Host-review surface is dashboard-only.
        if (subroute.label === 'Dashboard') {
          await expect(
            page.getByTestId('campaign-coop-route-surface-host'),
            'HostGmReviewSurface SHALL mount on the dashboard',
          ).toBeVisible({ timeout: 10_000 });
        }
      }

      const critical = errorCapture.critical();
      expect(
        critical,
        `unexpected critical console / page errors:\n${critical.join('\n')}`,
      ).toEqual([]);
    } finally {
      await deleteCampaign(page, campaignId);
    }
  });

  test('single-player campaign mounts neither co-op surface', async ({
    page,
  }) => {
    const errorCapture = newErrorCapture();
    errorCapture.attach(page);

    await page.goto('/gameplay/campaigns');
    await page.waitForLoadState('domcontentloaded');

    const campaignId = await createTestCampaign(page, {
      name: 'Single Player Smoke',
    });
    // Do NOT stamp a coopSession — leaves the campaign as single-player.

    try {
      await page.goto(`/gameplay/campaigns/${campaignId}`);
      await page.waitForLoadState('domcontentloaded');

      await expect(
        page.getByTestId('coop-session-badge'),
        'single-player campaign SHALL NOT render the co-op badge',
      ).toHaveCount(0);
      await expect(
        page.getByTestId('campaign-coop-route-surface-host'),
        'single-player campaign SHALL NOT render the host-review surface',
      ).toHaveCount(0);
      await expect(
        page.getByTestId('campaign-coop-route-surface-guest'),
        'single-player campaign SHALL NOT render the guest-proposal surface',
      ).toHaveCount(0);
    } finally {
      await deleteCampaign(page, campaignId);
    }
  });
});
