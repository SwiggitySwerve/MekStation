/**
 * Routes the e2e harness compiles BEFORE any measured test runs
 * (umbrella 19.4, finding #60).
 *
 * Next's dev server compiles a route on first request, and the harness's
 * readiness URL (`/__playwright_e2e_ready__`) is answered by `server.js`
 * itself before Next ever routes -- so "server ready" means the socket is
 * listening and nothing has compiled. The first test of a run pays the
 * whole cold compile inside its own 30 s test timeout, and loses.
 *
 * These routes are DECLARED here rather than derived from the inventory on
 * purpose: a derived list would agree with the specs by construction and
 * prove nothing. The Jest guard
 * (`src/__tests__/unit/e2eHarness/warmupDeclaration.test.ts`) is what holds
 * this list against the routes the suites actually navigate first, so a
 * reorder that changes which route pays the compile turns the guard red
 * instead of a spec.
 *
 * Deliberately short. This is not a smoke list and must never grow into
 * one: every route here is one a spec family provably pays a cold compile
 * for, and warming anything else just moves wall time around.
 */

import { CAMPAIGN_DASHBOARD_ROUTE_TEMPLATE } from './campaignRoutes';

/**
 * A throwaway id for the campaign warm-up. The route compiles the same
 * whether the campaign exists or not, and the warm-up asserts only that
 * the route answered -- never what it answered (see `globalSetup.ts`).
 */
const WARMUP_CAMPAIGN_ID = 'e2e-warmup-nonexistent-campaign';

/** Routes fetched once by `e2e/globalSetup.ts`, before the first test. */
export const E2E_WARMUP_ROUTES: readonly string[] = [
  // The layout sweep's first test (`dashboard [dashboard]`) -- the route
  // whose 30 s `page.goto` timeout is finding #60.
  '/',
  // Every pack-seeded spec's first navigation: `loadCampaignPack` always
  // lands on the campaign dashboard before hopping to a pack's target
  // route. The guest parity spec paid 30.8 s cold here, 12.4 s warm.
  CAMPAIGN_DASHBOARD_ROUTE_TEMPLATE.replace('{id}', WARMUP_CAMPAIGN_ID),
];

/**
 * Budget for ONE warm-up request. Never a test's timeout: the point of the
 * warm-up is that every measured test keeps the config's 30 s, so a route
 * that is slow WHEN WARM still fails.
 */
export const E2E_WARMUP_TIMEOUT_MS = Number(
  process.env.MEKSTATION_E2E_WARMUP_TIMEOUT_MS ?? 180 * 1000,
);
