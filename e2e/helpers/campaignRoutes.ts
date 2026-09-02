/**
 * The campaign route template the scenario-pack loader navigates first.
 *
 * `loadCampaignPack` always lands on the campaign dashboard before hopping
 * to a pack's real `targetRoute` (`useCampaignRouteLoader` only fires under
 * `/gameplay/campaigns/[id]/*`), which makes this the first route every
 * pack-seeded spec compiles -- and the one the guest parity spec paid a
 * 30.8 s cold compile for (umbrella 19.4, finding #60).
 *
 * It lives here, in a Playwright-free module, so the e2e warm-up list and
 * the Jest guard can both read the SAME template the loader navigates by.
 * Inlining the literal in `scenarioPackLoading.ts` would leave the guard
 * asserting against its own copy while the loader quietly went elsewhere.
 */

/** `{id}` placeholder form of the campaign dashboard route. */
export const CAMPAIGN_DASHBOARD_ROUTE_TEMPLATE = '/gameplay/campaigns/{id}';

/** The campaign dashboard route for one campaign id. */
export function campaignDashboardRoute(campaignId: string): string {
  return CAMPAIGN_DASHBOARD_ROUTE_TEMPLATE.replace(
    '{id}',
    encodeURIComponent(campaignId),
  );
}
