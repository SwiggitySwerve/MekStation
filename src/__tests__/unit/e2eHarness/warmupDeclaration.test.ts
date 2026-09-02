/**
 * The e2e harness must compile its cold routes before any measured test
 * runs (umbrella 19.4, finding #60).
 *
 * The failure this exists for: Next's dev server compiles a route on first
 * request, and `webServer.url` is the token-guarded
 * `/__playwright_e2e_ready__`, which `server.js` answers itself before Next
 * ever routes -- so readiness proves the socket is listening and that
 * NOTHING has compiled. The first test of a run therefore pays the whole
 * cold compile inside its own 30 s test timeout, and loses:
 * `Viewport layout sweep › dashboard [dashboard]` died on
 * `page.goto: Timeout 30000ms exceeded`, and the guest parity spec hit the
 * same class on `/gameplay/campaigns/<id>` (30.8 s cold, 12.4 s warm).
 *
 * The fix is a warm-up in `globalSetup` -- which Playwright runs AFTER the
 * `webServer` plugin (`createGlobalSetupTasks` orders
 * `createPluginSetupTasks` before `config.globalSetups`) -- with its own
 * generous budget. Every test's own 30 s timeout is deliberately untouched,
 * so a route that is slow WHEN WARM still fails. The warm-up absorbs only
 * the one-time dev-server compile, which has no production analogue.
 *
 * This guard is a JEST test because the Playwright suites need a dev server
 * the guard worktree cannot start, so a red-first proof written there could
 * not be watched failing. It reads the config as TEXT, deliberately:
 * importing `playwright.config.ts` pulls `@playwright/test` into Jest and
 * crashes before a row runs.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import warmUpColdRoutes from '../../../../e2e/globalSetup';
import { CAMPAIGN_DASHBOARD_ROUTE_TEMPLATE } from '../../../../e2e/helpers/campaignRoutes';
import { E2E_WARMUP_ROUTES } from '../../../../e2e/helpers/warmupRoutes';
import { SWEPT_NOW_ENTRIES } from '../../../../e2e/layout-sweep/screenInventory';

const REPO_ROOT = process.cwd();
const CONFIG_PATH = join(REPO_ROOT, 'playwright.config.ts');
const LOADER_PATH = join(REPO_ROOT, 'e2e', 'helpers', 'scenarioPackLoading.ts');

/** The path `playwright.config.ts` declares for `globalSetup`, if any. */
function declaredGlobalSetupPath(): string | undefined {
  const source = readFileSync(CONFIG_PATH, 'utf-8');
  const match = /globalSetup:\s*(['"])(.+?)\1/.exec(source);
  return match?.[2];
}

/** Turn a `{id}` route template into a matcher for a concrete route. */
function templateMatcher(template: string): RegExp {
  const escaped = template.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${escaped.replace('\\{id\\}', '[^/]+')}$`);
}

describe('e2e cold-route warm-up declaration', () => {
  it('declares a globalSetup that exists on disk', () => {
    // Without one there is no phase that runs after the dev server is up
    // and before the first measured test, so the first test keeps paying
    // the compile no matter what the warm-up list says.
    const declared = declaredGlobalSetupPath();

    expect(declared).toBeDefined();
    expect(existsSync(join(REPO_ROOT, declared ?? 'missing'))).toBe(true);
  });

  it('wires that globalSetup to the declared warm-up list', () => {
    // "A globalSetup exists" is not "the globalSetup warms these routes".
    // A setup file that ignored `E2E_WARMUP_ROUTES` would leave every other
    // row here green while warming nothing -- the same registered-but-not-
    // wired shape that let finding #39 through.
    const declared = declaredGlobalSetupPath() ?? 'missing';
    const source = existsSync(join(REPO_ROOT, declared))
      ? readFileSync(join(REPO_ROOT, declared), 'utf-8')
      : '';

    expect(source).toContain('E2E_WARMUP_ROUTES');
  });

  it('warms the first route the layout sweep navigates', () => {
    // Read through the production inventory, not a copy: if the inventory
    // is ever reordered, the route that pays the compile changes, and this
    // row goes red instead of the sweep.
    const firstSweptRoute = SWEPT_NOW_ENTRIES[0]?.goto;

    expect(firstSweptRoute).toBeDefined();
    expect(E2E_WARMUP_ROUTES).toContain(firstSweptRoute);
  });

  it('warms the first route the scenario-pack loader navigates', () => {
    // The guest parity spec's 30.8 s cold compile. Matched against the
    // shared template rather than a literal, so a warm-up entry only counts
    // if it really is the campaign dashboard route with some id in it.
    const matcher = templateMatcher(CAMPAIGN_DASHBOARD_ROUTE_TEMPLATE);

    expect(
      E2E_WARMUP_ROUTES.filter((route) => matcher.test(route)),
    ).not.toEqual([]);
  });

  it('has the pack loader navigate by that shared template', () => {
    // Closes the loop the row above opens: that row proves the template is
    // warmed, this one proves the template is what the loader actually
    // navigates by (`campaignDashboardRoute` is built from it). Without
    // this, the loader could keep an inlined literal and drift away from
    // the route being warmed while every other row stayed green.
    const loaderSource = readFileSync(LOADER_PATH, 'utf-8');

    expect(loaderSource).toContain('./campaignRoutes');
    expect(loaderSource).toContain('campaignDashboardRoute(');
  });
});

/**
 * The rows above prove the warm-up is DECLARED and WIRED. They say nothing
 * about whether it does anything, and "declared but inert" is the same
 * shape as every other near-miss in this arc -- so these rows run the real
 * `globalSetup` default export against a stubbed `fetch`.
 *
 * It is importable here only because it type-imports `FullConfig` (erased
 * at compile) and otherwise touches nothing from `@playwright/test`. That
 * is a property worth keeping: a value import would put a dev-server-bound
 * module between this suite and the code it checks.
 */
describe('e2e warm-up behaviour', () => {
  const BASE_URL = 'http://localhost:3600';
  const fakeConfig = {
    projects: [{ use: {} }, { use: { baseURL: BASE_URL } }],
  } as unknown as Parameters<typeof warmUpColdRoutes>[0];

  const realFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  /** Install a fetch stub answering every route with the given status. */
  function stubFetch(status: number): jest.Mock {
    const stub = jest.fn(async () => ({
      status,
      text: async () => '',
    }));
    globalThis.fetch = stub as unknown as typeof fetch;
    return stub;
  }

  it('fetches every declared route against the resolved baseURL', async () => {
    // The mutant this kills: a setup that resolves the baseURL, logs, and
    // never requests anything -- which passes every declaration row above
    // while the first test keeps paying the compile.
    const stub = stubFetch(200);

    await warmUpColdRoutes(fakeConfig);

    expect(stub).toHaveBeenCalledTimes(E2E_WARMUP_ROUTES.length);
    expect(stub.mock.calls.map((call) => call[0])).toEqual(
      E2E_WARMUP_ROUTES.map((route) => new URL(route, BASE_URL).toString()),
    );
  });

  it('accepts any status, because a 404 compiles the route too', async () => {
    // Deliberate: the campaign warm-up navigates a nonexistent id. A
    // warm-up that demanded 200 would be a smoke test wearing setup's
    // clothes, and would fail the run for a product reason it never checked
    // properly.
    const stub = stubFetch(404);

    await expect(warmUpColdRoutes(fakeConfig)).resolves.toBeUndefined();
    expect(stub).toHaveBeenCalledTimes(E2E_WARMUP_ROUTES.length);
  });

  it('fails loud, naming the route, when one never answers', async () => {
    // The budget is the warm-up's own, not a test's -- but it still has to
    // end. A silent swallow here would turn a dead dev server into a
    // confusing cascade of 30 s test timeouts instead of one clear error.
    globalThis.fetch = jest.fn(async () => {
      throw new Error('connect ECONNREFUSED');
    }) as unknown as typeof fetch;

    await expect(warmUpColdRoutes(fakeConfig)).rejects.toThrow(
      new RegExp(`e2e warm-up: ${E2E_WARMUP_ROUTES[0]} did not answer`),
    );
  });

  it('fails loud when no project declares a baseURL', async () => {
    // Otherwise the warm-up would silently resolve every route against
    // `undefined` and warm nothing at all.
    stubFetch(200);
    const baseless = { projects: [{ use: {} }] } as unknown as Parameters<
      typeof warmUpColdRoutes
    >[0];

    await expect(warmUpColdRoutes(baseless)).rejects.toThrow(
      /no project declares a baseURL/,
    );
  });
});
