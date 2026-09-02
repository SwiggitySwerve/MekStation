/**
 * Compile the harness's cold routes before the first measured test
 * (umbrella 19.4, finding #60).
 *
 * Playwright runs `globalSetup` AFTER the `webServer` plugin -- verified in
 * the installed runner, where `createGlobalSetupTasks` orders
 * `createPluginSetupTasks(config)` ahead of `config.globalSetups`
 * (playwright/lib/runner/tasks.js) and `webServer` is registered as a
 * config plugin (playwright/lib/runner/testRunner.js) -- so the dev server
 * is listening by the time this runs. That ordering is the whole reason
 * this is a globalSetup and not a fixture.
 *
 * What it deliberately does NOT do:
 *
 *  - It does not touch any test's timeout. Every measured test keeps the
 *    config's 30 s, so a route that is slow WHEN WARM still fails. The
 *    warm-up absorbs only Next's one-time dev on-demand compile, which has
 *    no production analogue.
 *  - It does not assert what a route answered, only that it answered. A
 *    warm-up that checked status codes would be a smoke test smuggled into
 *    the harness, and the campaign warm-up navigates a deliberately
 *    nonexistent id -- a 404 compiles the route exactly as a 200 does.
 *
 * The elapsed ms per route is printed so the compile cost stays visible
 * rather than vanishing: the time does not go away, it moves out of a
 * measured test and into named setup.
 */

import type { FullConfig } from '@playwright/test';

import {
  E2E_WARMUP_ROUTES,
  E2E_WARMUP_TIMEOUT_MS,
} from './helpers/warmupRoutes';

/** The baseURL the projects share, or a loud failure naming the gap. */
function resolveBaseURL(config: FullConfig): string {
  const baseURL = config.projects
    .map((project) => project.use?.baseURL)
    .find((candidate): candidate is string => Boolean(candidate));
  if (!baseURL) {
    throw new Error(
      'e2e warm-up: no project declares a baseURL, so there is nothing to warm. ' +
        'Check `use.baseURL` in playwright.config.ts.',
    );
  }
  return baseURL;
}

/** Fetch one route to force its dev-server compile, timing the request. */
async function warmRoute(route: string, baseURL: string): Promise<void> {
  const url = new URL(route, baseURL).toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), E2E_WARMUP_TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const response = await fetch(url, { signal: controller.signal });
    // Drain the body: the compile is not finished until the response is,
    // and an unread stream would let the next route start too early.
    await response.text();
    process.stdout.write(
      `[e2e warm-up] ${route} answered ${response.status} in ${Date.now() - startedAt} ms\n`,
    );
  } catch (cause) {
    throw new Error(
      `e2e warm-up: ${route} did not answer within ${E2E_WARMUP_TIMEOUT_MS} ms ` +
        `(${Date.now() - startedAt} ms elapsed): ${String(cause)}`,
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Warm every declared route, in order, before any test runs. */
export default async function warmUpColdRoutes(
  config: FullConfig,
): Promise<void> {
  const baseURL = resolveBaseURL(config);
  for (const route of E2E_WARMUP_ROUTES) {
    await warmRoute(route, baseURL);
  }
}
