import { expect, test, type Page } from '@playwright/test';

type RouteRole = Parameters<Page['getByRole']>[0];

interface RouteAffordance {
  readonly label: string;
  readonly role?: RouteRole;
  readonly name?: string | RegExp;
  readonly testId?: string | RegExp;
  readonly selector?: string;
  readonly text?: string | RegExp;
}

interface RouteProof {
  readonly path: string;
  readonly label: string;
  readonly pageTitle?: string;
  readonly heading?: string | RegExp;
  readonly text?: string | RegExp;
  readonly affordances?: readonly RouteAffordance[];
  readonly stateAffordances?: readonly RouteAffordance[];
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
    affordances: [
      { label: 'browse menu', role: 'button', name: /Browse/i },
      { label: 'tools menu', role: 'button', name: /Tools/i },
      { label: 'gameplay menu', role: 'button', name: /Gameplay/i },
      { label: 'compendium card', role: 'link', name: /Compendium/i },
      { label: 'custom units card', role: 'link', name: /My Units/i },
      { label: 'unit builder card', role: 'link', name: /Unit Builder/i },
    ],
  },
  {
    path: '/gameplay',
    label: 'gameplay hub',
    pageTitle: 'Gameplay',
    affordances: [
      { label: 'quick game route card', role: 'link', name: /Quick Game/i },
      { label: 'campaigns route card', role: 'link', name: /Campaigns/i },
      { label: 'encounters route card', role: 'link', name: /Encounters/i },
      { label: 'forces route card', role: 'link', name: /Forces/i },
    ],
  },
  {
    path: '/gameplay/quick',
    label: 'quick game',
    heading: 'Quick Game',
    affordances: [
      {
        label: 'quick game setup CTA',
        role: 'button',
        name: /Start Quick Game Setup/i,
      },
    ],
  },
  {
    path: '/gameplay/pilots',
    label: 'pilot roster',
    pageTitle: 'Pilot Roster',
    affordances: [
      { label: 'pilot search', role: 'textbox', name: /Search pilots/i },
      { label: 'create pilot CTA', role: 'button', name: /Create Pilot/i },
      { label: 'active-only filter', role: 'button', name: /Active Only/i },
    ],
    stateAffordances: [
      { label: 'pilot count state', text: /Showing \d+ pilots?/i },
      { label: 'pilot empty state', text: /No pilots/i },
    ],
  },
  {
    path: '/gameplay/forces',
    label: 'force roster',
    pageTitle: 'Force Roster',
    affordances: [
      { label: 'force search', testId: 'force-search' },
      { label: 'create force CTA', testId: 'create-force-btn' },
    ],
    stateAffordances: [
      { label: 'force empty state', testId: 'forces-empty-state' },
      { label: 'force cards', selector: '[data-testid^="force-card-"]' },
    ],
  },
  {
    path: '/gameplay/campaigns',
    label: 'campaigns',
    pageTitle: 'Campaigns',
    affordances: [
      { label: 'create campaign CTA', testId: 'create-campaign-btn' },
    ],
    stateAffordances: [
      { label: 'campaign empty state', testId: 'campaigns-empty-state' },
      { label: 'campaign cards', selector: '[data-testid^="campaign-card-"]' },
    ],
  },
  {
    path: '/gameplay/encounters',
    label: 'encounters',
    pageTitle: 'Encounters',
    affordances: [
      { label: 'encounter search', testId: 'encounter-search' },
      { label: 'encounter status filter', testId: 'status-filter' },
      { label: 'create encounter CTA', testId: 'create-encounter-btn' },
    ],
    stateAffordances: [
      { label: 'encounter empty state', testId: 'encounters-empty-state' },
      {
        label: 'encounter cards',
        selector: '[data-testid^="encounter-card-"]',
      },
    ],
  },
  {
    path: '/gameplay/games',
    label: 'games',
    pageTitle: 'Games',
    affordances: [
      { label: 'demo game CTA', testId: 'new-game-btn' },
      { label: 'network lobby create', role: 'button', name: /Create Lobby/i },
      {
        label: 'network room code input',
        role: 'textbox',
        name: /Networked 1v1 room code/i,
      },
    ],
    stateAffordances: [
      { label: 'games empty state', testId: 'games-empty-state' },
      { label: 'game cards', selector: '[data-testid^="game-card-"]' },
    ],
  },
  {
    path: '/compendium',
    label: 'compendium',
    heading: 'COMPENDIUM',
    affordances: [
      { label: 'compendium search', testId: 'compendium-search' },
      { label: 'units section', testId: 'compendium-units-section' },
      { label: 'equipment section', testId: 'compendium-equipment-section' },
      { label: 'rules section', testId: 'compendium-rules-section' },
    ],
  },
  {
    path: '/units',
    label: 'custom units',
    pageTitle: 'Custom Units',
    affordances: [
      { label: 'custom unit search', role: 'textbox', name: /Search units/i },
      { label: 'create unit CTA', role: 'link', name: /Create Unit/i },
      { label: 'filter toggle', role: 'button', name: /Filters/i },
    ],
    stateAffordances: [
      { label: 'custom unit empty state', text: /No custom units yet/i },
      { label: 'custom unit card or row', selector: '[data-testid^="unit-"]' },
      { label: 'custom unit table', role: 'table' },
    ],
  },
  {
    path: '/customizer',
    label: 'customizer',
    heading: 'No Units Open',
    affordances: [
      { label: 'customizer new unit CTA', role: 'button', name: /New Unit/i },
      {
        label: 'customizer library load CTA',
        role: 'button',
        name: /Load from Library/i,
      },
    ],
  },
  {
    path: '/compare',
    label: 'unit comparison',
    pageTitle: 'Unit Comparison',
    affordances: [
      {
        label: 'compare search',
        role: 'textbox',
        name: /Search units to compare/i,
      },
    ],
  },
  {
    path: '/multiplayer',
    label: 'multiplayer',
    heading: 'Multiplayer',
    affordances: [
      {
        label: 'vault identity recovery link',
        role: 'link',
        name: /Set up vault identity/i,
      },
      {
        label: 'password input',
        selector: 'input[placeholder="Vault password"]',
      },
      { label: 'create match heading', role: 'heading', name: /Create match/i },
      { label: 'join match heading', role: 'heading', name: /Join match/i },
    ],
  },
  {
    path: '/audit/timeline',
    label: 'event timeline',
    pageTitle: 'Event Timeline',
    affordances: [
      { label: 'timeline refresh', role: 'button', name: /Refresh timeline/i },
      { label: 'timeline search', role: 'textbox', name: /Search events/i },
    ],
  },
  {
    path: '/replay-library',
    label: 'replay library',
    pageTitle: 'Replay Library',
    affordances: [{ label: 'source filter', testId: 'source-filter' }],
    stateAffordances: [
      { label: 'replay empty state', testId: 'replay-library-empty' },
      { label: 'quick game recovery CTA', testId: 'empty-state-quick-game' },
      { label: 'encounter recovery CTA', testId: 'empty-state-encounters' },
      { label: 'replay rows', selector: '[data-testid^="replay-row-"]' },
    ],
  },
  {
    path: '/settings#vault',
    label: 'settings vault hash',
    pageTitle: 'Settings',
    affordances: [
      { label: 'vault settings panel', role: 'button', name: /Vault/i },
      {
        label: 'appearance settings panel',
        role: 'button',
        name: /Appearance/i,
      },
    ],
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

  for (const affordance of route.affordances ?? []) {
    await expectRouteAffordance(page, affordance);
  }

  if (route.stateAffordances) {
    await expectAnyRouteAffordance(page, route.stateAffordances);
  }
}

function routeAffordanceLocator(page: Page, affordance: RouteAffordance) {
  if (affordance.testId) {
    return page.getByTestId(affordance.testId).first();
  }
  if (affordance.selector) {
    return page.locator(affordance.selector).first();
  }
  if (affordance.role) {
    return page
      .getByRole(
        affordance.role,
        affordance.name ? { name: affordance.name } : undefined,
      )
      .first();
  }
  if (affordance.text) {
    return page.getByText(affordance.text).first();
  }
  throw new Error(`Route affordance ${affordance.label} has no locator`);
}

async function routeAffordanceVisible(
  page: Page,
  affordance: RouteAffordance,
): Promise<boolean> {
  const locator = routeAffordanceLocator(page, affordance);
  if ((await locator.count()) === 0) return false;
  return locator.isVisible().catch(() => false);
}

async function expectRouteAffordance(
  page: Page,
  affordance: RouteAffordance,
): Promise<void> {
  await expect(
    routeAffordanceLocator(page, affordance),
    `Missing route affordance: ${affordance.label}`,
  ).toBeVisible();
}

async function expectAnyRouteAffordance(
  page: Page,
  affordances: readonly RouteAffordance[],
): Promise<void> {
  await expect
    .poll(
      async () => {
        for (const affordance of affordances) {
          if (await routeAffordanceVisible(page, affordance)) {
            return affordance.label;
          }
        }
        return null;
      },
      {
        message: `Expected at least one route state affordance: ${affordances
          .map((affordance) => affordance.label)
          .join(', ')}`,
      },
    )
    .not.toBeNull();
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
