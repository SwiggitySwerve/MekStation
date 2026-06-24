import { expect, test, type Page } from '@playwright/test';

interface RouteProof {
  readonly path: string;
  readonly label: string;
  readonly pageTitle?: string;
  readonly heading?: string | RegExp;
  readonly text?: string | RegExp;
}

interface RouteMonitor {
  readonly assertClean: (routeLabel: string) => void;
}

const primaryRoutes: readonly RouteProof[] = [
  {
    path: '/',
    label: 'dashboard',
    heading: /MekStation/i,
    text: /Compendium|Unit Builder|Gameplay/i,
  },
  { path: '/gameplay', label: 'gameplay hub', pageTitle: 'Gameplay' },
  { path: '/gameplay/quick', label: 'quick game', heading: 'Quick Game' },
  {
    path: '/gameplay/pilots',
    label: 'pilot roster',
    pageTitle: 'Pilot Roster',
  },
  {
    path: '/gameplay/forces',
    label: 'force roster',
    pageTitle: 'Force Roster',
  },
  { path: '/gameplay/campaigns', label: 'campaigns', pageTitle: 'Campaigns' },
  {
    path: '/gameplay/encounters',
    label: 'encounters',
    pageTitle: 'Encounters',
  },
  { path: '/gameplay/games', label: 'games', pageTitle: 'Games' },
  { path: '/compendium', label: 'compendium', heading: 'COMPENDIUM' },
  { path: '/units', label: 'custom units', pageTitle: 'Custom Units' },
  { path: '/customizer', label: 'customizer', heading: 'No Units Open' },
  { path: '/compare', label: 'unit comparison', pageTitle: 'Unit Comparison' },
  { path: '/multiplayer', label: 'multiplayer', heading: 'Multiplayer' },
  {
    path: '/audit/timeline',
    label: 'event timeline',
    pageTitle: 'Event Timeline',
  },
  {
    path: '/replay-library',
    label: 'replay library',
    pageTitle: 'Replay Library',
  },
  {
    path: '/settings#vault',
    label: 'settings vault hash',
    pageTitle: 'Settings',
  },
];

function isBenignConsoleError(text: string): boolean {
  return [
    'favicon',
    'service-worker',
    'legacyBehavior',
    'codemod',
    'ERR_ABORTED',
    '__playwright_e2e_ready__',
  ].some((fragment) => text.includes(fragment));
}

function isIgnoredRequestFailure(url: string, errorText: string): boolean {
  if (errorText.includes('ERR_ABORTED')) return true;
  if (url.includes('/_next/webpack-hmr')) return true;
  if (url.includes('/favicon')) return true;
  if (url.includes('/analytics')) return true;
  return false;
}

function installRouteMonitor(page: Page): RouteMonitor {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const badResponses: string[] = [];

  page.on('console', (message) => {
    if (message.type() !== 'error') return;

    const text = message.text();
    if (!isBenignConsoleError(text)) {
      consoleErrors.push(text);
    }
  });

  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  page.on('requestfailed', (request) => {
    const url = request.url();
    const errorText = request.failure()?.errorText ?? '';
    if (!isIgnoredRequestFailure(url, errorText)) {
      failedRequests.push(`${request.method()} ${url} ${errorText}`.trim());
    }
  });

  page.on('response', (response) => {
    const url = response.url();
    const status = response.status();
    if (
      status >= 500 &&
      url.startsWith('http://localhost:3600') &&
      !url.includes('/__playwright_e2e_ready__')
    ) {
      badResponses.push(`${status} ${url}`);
    }
  });

  return {
    assertClean(routeLabel) {
      expect(
        consoleErrors,
        `${routeLabel} emitted critical console errors`,
      ).toEqual([]);
      expect(pageErrors, `${routeLabel} emitted page errors`).toEqual([]);
      expect(
        failedRequests,
        `${routeLabel} had failed network requests`,
      ).toEqual([]);
      expect(badResponses, `${routeLabel} had 5xx responses`).toEqual([]);
    },
  };
}

async function expectCurrentPath(
  page: Page,
  expectedPath: string,
): Promise<void> {
  await expect
    .poll(() => {
      const url = new URL(page.url());
      return `${url.pathname}${url.search}${url.hash}`;
    })
    .toBe(expectedPath);
}

async function expectRouteAnchor(page: Page, route: RouteProof): Promise<void> {
  if (route.pageTitle) {
    await expect(page.getByTestId('page-title')).toContainText(route.pageTitle);
  }

  if (route.heading) {
    await expect(
      page.getByRole('heading', { name: route.heading }).first(),
    ).toBeVisible();
  }

  if (route.text) {
    const matches = page.getByText(route.text);
    await expect
      .poll(async () => {
        const count = await matches.count();
        for (let index = 0; index < count; index += 1) {
          if (await matches.nth(index).isVisible()) {
            return true;
          }
        }
        return false;
      })
      .toBe(true);
  }
}

async function expectShellAndRoute(
  page: Page,
  route: RouteProof,
): Promise<void> {
  await expect(page.locator('header').first()).toBeVisible();
  await expect(
    page.getByRole('link', { name: /MekStation/i }).first(),
  ).toBeVisible();
  await expect(page.locator('body')).not.toContainText(
    /This page could not be found|Application error/i,
  );
  await expectCurrentPath(page, route.path);
  await expectRouteAnchor(page, route);
}

test.describe('App shell route proof @app-shell', () => {
  test.describe.configure({ mode: 'serial' });

  for (const route of primaryRoutes) {
    test(`${route.label} deep-links and survives refresh`, async ({ page }) => {
      const monitor = installRouteMonitor(page);

      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await expectShellAndRoute(page, route);

      await page.reload({ waitUntil: 'domcontentloaded' });
      await expectShellAndRoute(page, route);

      await page.waitForTimeout(250);
      monitor.assertClean(route.label);
    });
  }

  test('desktop history navigation routes to replay library', async ({
    page,
  }) => {
    const monitor = installRouteMonitor(page);
    const replayLibraryRoute = primaryRoutes.find(
      (route) => route.path === '/replay-library',
    );

    expect(replayLibraryRoute).toBeDefined();

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'History' }).click();

    const replayLink = page.getByRole('menuitem', { name: 'Replay Library' });
    await expect(replayLink).toBeVisible();
    await expect(replayLink).toHaveAttribute('href', '/replay-library');

    await replayLink.click();
    await expectShellAndRoute(page, replayLibraryRoute!);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expectShellAndRoute(page, replayLibraryRoute!);

    await page.waitForTimeout(250);
    monitor.assertClean('replay library nav alignment');
  });
});
