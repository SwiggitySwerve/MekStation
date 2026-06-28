import { expect, test, type Page } from '@playwright/test';

import appShellRouteManifest from './app-shell-route-manifest.json';

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
  readonly allowedConsoleErrors?: readonly (string | RegExp)[];
  readonly affordances?: readonly RouteAffordance[];
  readonly stateAffordances?: readonly RouteAffordance[];
}

interface RouteMonitor {
  readonly assertClean: (routeLabel: string) => void;
}

const routeProofs: readonly RouteProof[] = [
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
    path: '/onboarding',
    label: 'onboarding',
    heading: 'Onboarding',
    affordances: [
      { label: 'dashboard backlink', role: 'link', name: /Back to dashboard/i },
      { label: 'glossary section', role: 'heading', name: /Glossary/i },
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
    path: '/gameplay/repair',
    label: 'repair bay',
    pageTitle: 'Repair Bay',
    affordances: [
      { label: 'repair search', testId: 'repair-search-input' },
      { label: 'repair stats', testId: 'repair-stats' },
      { label: 'field repair action', testId: 'repair-field-btn' },
    ],
    stateAffordances: [
      { label: 'all operational state', testId: 'repair-all-operational' },
      { label: 'repair empty state', testId: 'repair-empty-state' },
      { label: 'repair workspace', testId: 'repair-unit-list' },
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
    path: '/compendium/units',
    label: 'compendium units',
    heading: 'Unit Database',
    affordances: [
      { label: 'unit database search', role: 'textbox', name: /Search units/i },
      {
        label: 'unit tech-base filter',
        role: 'combobox',
        name: /Filter by tech base/i,
      },
      { label: 'unit filters toggle', role: 'button', name: /Filters/i },
    ],
    stateAffordances: [
      { label: 'unit table', role: 'table' },
      { label: 'unit results counter', text: /Showing \d+ of \d+ results/i },
    ],
  },
  {
    path: '/compendium/equipment',
    label: 'compendium equipment',
    heading: 'Equipment Catalog',
    affordances: [
      { label: 'equipment search', role: 'textbox', name: /Search equipment/i },
      { label: 'equipment filters', role: 'button', name: /Filters/i },
      {
        label: 'equipment view mode selector',
        role: 'group',
        name: /View mode selection/i,
      },
    ],
    stateAffordances: [
      { label: 'equipment table', role: 'table' },
      { label: 'equipment empty state', text: /No equipment found/i },
    ],
  },
  {
    path: '/compendium/rules',
    label: 'compendium rules',
    heading: 'CONSTRUCTION RULES',
    affordances: [
      {
        label: 'internal structure anchor',
        role: 'button',
        name: /Internal Structure/i,
      },
      { label: 'engine anchor', role: 'button', name: /^Engine$/i },
      { label: 'armor anchor', role: 'button', name: /^Armor$/i },
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
    path: '/gameplay/pilots/create',
    label: 'create pilot',
    pageTitle: 'Create Pilot',
    affordances: [
      { label: 'pilot creation dialog', role: 'dialog' },
      { label: 'pilot wizard heading', role: 'heading', name: /Create Pilot/i },
      { label: 'pilot wizard close', role: 'button', name: /Close/i },
    ],
  },
  {
    path: '/gameplay/forces/create',
    label: 'create force',
    pageTitle: 'Create Force',
    affordances: [
      { label: 'force name input', testId: 'force-name-input' },
      { label: 'lance force type', testId: 'force-type-lance' },
      { label: 'submit force action', testId: 'submit-force-btn' },
    ],
  },
  {
    path: '/gameplay/campaigns/create',
    label: 'create campaign',
    pageTitle: 'New Campaign',
    affordances: [
      { label: 'campaign name input', testId: 'campaign-name-input' },
      { label: 'campaign wizard next', testId: 'wizard-next-btn' },
      { label: 'campaign wizard cancel', testId: 'wizard-cancel-btn' },
    ],
  },
  {
    path: '/gameplay/encounters/create',
    label: 'create encounter',
    pageTitle: 'New Encounter',
    affordances: [
      { label: 'encounter name input', testId: 'encounter-name-input' },
      { label: 'battle scenario template', testId: 'template-battle' },
      { label: 'submit encounter action', testId: 'submit-encounter-btn' },
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
    path: '/share',
    label: 'share links',
    pageTitle: 'Share Links',
    affordances: [
      { label: 'share links empty state', text: /No share links yet/i },
    ],
  },
  {
    path: '/contacts',
    label: 'vault contacts',
    pageTitle: 'Contacts',
    affordances: [
      { label: 'add contact action', role: 'button', name: /Add Contact/i },
    ],
    stateAffordances: [
      { label: 'contacts empty state', text: /No contacts yet/i },
      {
        label: 'first contact action',
        role: 'button',
        name: /Add Your First Contact/i,
      },
    ],
  },
  {
    path: '/shared',
    label: 'shared items',
    pageTitle: 'Shared Items',
    affordances: [
      { label: 'sync action', role: 'button', name: /Sync Now/i },
      { label: 'received tab', role: 'button', name: /Shared with Me/i },
      { label: 'owned shares tab', role: 'button', name: /My Shared Items/i },
    ],
    stateAffordances: [
      { label: 'shared empty state', text: /Nothing shared with you yet/i },
      {
        label: 'owned shares empty state',
        text: /You haven't shared anything yet/i,
      },
    ],
  },
  {
    path: '/share/e2e-missing-token',
    label: 'invalid share token',
    heading: 'Share Link Not Found',
    text: /This share link does not exist or has been deleted/i,
    allowedConsoleErrors: [
      'Failed to load resource: the server responded with a status of 404 (Not Found)',
    ],
    affordances: [
      { label: 'retry share token action', role: 'button', name: /Try Again/i },
      { label: 'go home action', role: 'button', name: /Go Home/i },
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
  {
    path: '/settings',
    label: 'settings',
    pageTitle: 'Settings',
    affordances: [
      {
        label: 'appearance settings panel',
        role: 'button',
        name: /Appearance/i,
      },
      { label: 'vault settings panel', role: 'button', name: /Vault/i },
      {
        label: 'accessibility settings panel',
        role: 'button',
        name: /Accessibility/i,
      },
    ],
  },
];

const routeProofByPath = new Map(
  routeProofs.map((route) => [route.path, route]),
);
const appShellRoutePaths = new Set(
  appShellRouteManifest.primaryRoutes.map((route) => route.path),
);
const recoveryRoutePaths = new Set(
  appShellRouteManifest.recoveryRoutes.map((route) => route.path),
);

for (const proof of routeProofs) {
  if (
    !appShellRoutePaths.has(proof.path) &&
    !recoveryRoutePaths.has(proof.path)
  ) {
    throw new Error(
      `Route proof ${proof.path} is not registered in app-shell-route-manifest.json`,
    );
  }
}

const primaryRoutes: readonly RouteProof[] =
  appShellRouteManifest.primaryRoutes.map((manifestRoute) => {
    const proof = routeProofByPath.get(manifestRoute.path);
    if (!proof) {
      throw new Error(
        `Missing browser route proof details for ${manifestRoute.path}`,
      );
    }
    if (proof.label !== manifestRoute.label) {
      throw new Error(
        `Route proof label mismatch for ${manifestRoute.path}: manifest="${manifestRoute.label}" proof="${proof.label}"`,
      );
    }
    return proof;
  });
const recoveryRoutes: readonly RouteProof[] =
  appShellRouteManifest.recoveryRoutes.map((manifestRoute) => {
    const proof = routeProofByPath.get(manifestRoute.path);
    if (!proof) {
      throw new Error(
        `Missing browser route proof details for ${manifestRoute.path}`,
      );
    }
    if (proof.label !== manifestRoute.label) {
      throw new Error(
        `Route proof label mismatch for ${manifestRoute.path}: manifest="${manifestRoute.label}" proof="${proof.label}"`,
      );
    }
    return proof;
  });

const desktopDropdowns = appShellRouteManifest.desktopDropdowns;
const mobileNavItems = appShellRouteManifest.mobileNavItems;

function matchesPattern(text: string, pattern: string | RegExp): boolean {
  return typeof pattern === 'string'
    ? text.includes(pattern)
    : pattern.test(text);
}

function isBenignConsoleError(
  text: string,
  allowedErrors: readonly (string | RegExp)[] = [],
): boolean {
  if (allowedErrors.some((pattern) => matchesPattern(text, pattern))) {
    return true;
  }

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

function installRouteMonitor(
  page: Page,
  route: RouteProof | null = null,
): RouteMonitor {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const badResponses: string[] = [];

  page.on('console', (message) => {
    if (message.type() !== 'error') return;

    const text = message.text();
    if (!isBenignConsoleError(text, route?.allowedConsoleErrors)) {
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

async function expectRouteIdentity(
  page: Page,
  route: RouteProof,
): Promise<void> {
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

async function expectRouteAnchor(page: Page, route: RouteProof): Promise<void> {
  await expectRouteIdentity(page, route);

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

function routeByPath(path: string): RouteProof {
  const route = primaryRoutes.find((candidate) => candidate.path === path);
  if (!route) {
    throw new Error(`No primary route proof registered for ${path}`);
  }
  return route;
}

async function openDesktopDropdown(page: Page, label: string): Promise<void> {
  const button = page.getByRole('button', { name: label }).first();
  await expect(button).toBeVisible();
  await button.click();
}

function mobileNavLink(page: Page, label: string) {
  return page
    .getByRole('navigation', { name: /Mobile navigation/i })
    .getByRole('link', { name: label });
}

async function expectMobileShellAndRoute(
  page: Page,
  route: RouteProof,
): Promise<void> {
  await expect(page.locator('header').first()).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: /Mobile navigation/i }),
  ).toBeVisible();
  await expect(page.locator('body')).not.toContainText(
    /This page could not be found|Application error/i,
  );
  await expectCurrentPath(page, route.path);
  await expectRouteIdentity(page, route);
}

test.describe('App shell route proof @app-shell', () => {
  test.describe.configure({ mode: 'serial' });

  for (const route of primaryRoutes) {
    test(`${route.label} deep-links and survives refresh`, async ({ page }) => {
      const monitor = installRouteMonitor(page, route);

      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await expectShellAndRoute(page, route);

      await page.reload({ waitUntil: 'domcontentloaded' });
      await expectShellAndRoute(page, route);

      await page.waitForTimeout(250);
      monitor.assertClean(route.label);
    });
  }

  for (const route of recoveryRoutes) {
    test(`${route.label} deep-links, explains recovery, and survives refresh`, async ({
      page,
    }) => {
      const monitor = installRouteMonitor(page, route);

      await page.goto(route.path, { waitUntil: 'domcontentloaded' });
      await expectShellAndRoute(page, route);

      await page.reload({ waitUntil: 'domcontentloaded' });
      await expectShellAndRoute(page, route);

      await page.waitForTimeout(250);
      monitor.assertClean(route.label);
    });
  }

  test('desktop dropdown navigation exposes and reaches primary routes', async ({
    page,
  }) => {
    const monitor = installRouteMonitor(page);

    for (const dropdown of desktopDropdowns) {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await openDesktopDropdown(page, dropdown.label);

      for (const item of dropdown.items) {
        const link = page.getByRole('menuitem', { name: item.label });
        await expect(link).toBeVisible();
        await expect(link).toHaveAttribute('href', item.path);
      }

      const representative = dropdown.items[dropdown.items.length - 1];
      await page.getByRole('menuitem', { name: representative.label }).click();
      await expectShellAndRoute(page, routeByPath(representative.path));

      await page.reload({ waitUntil: 'domcontentloaded' });
      await expectShellAndRoute(page, routeByPath(representative.path));
    }

    await page.waitForTimeout(250);
    monitor.assertClean('desktop dropdown route alignment');
  });

  test('mobile bottom navigation reaches primary routes and marks active item', async ({
    page,
  }) => {
    const monitor = installRouteMonitor(page);
    await page.setViewportSize({ width: 375, height: 667 });

    for (const item of mobileNavItems) {
      const startPath = item.path === '/' ? '/gameplay' : '/';

      await page.goto(startPath, { waitUntil: 'domcontentloaded' });
      const mobileNav = page.getByRole('navigation', {
        name: /Mobile navigation/i,
      });
      await expect(mobileNav).toBeVisible();

      const link = mobileNavLink(page, item.label);
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', item.path);
      await link.focus();
      await expect(link).toBeFocused();
      await link.press('Enter');

      await expectMobileShellAndRoute(page, routeByPath(item.path));
      await expect(mobileNavLink(page, item.label)).toHaveAttribute(
        'aria-current',
        'page',
      );

      await page.reload({ waitUntil: 'domcontentloaded' });
      await expectMobileShellAndRoute(page, routeByPath(item.path));
      await expect(mobileNavLink(page, item.label)).toHaveAttribute(
        'aria-current',
        'page',
      );
    }

    await page.waitForTimeout(250);
    monitor.assertClean('mobile bottom navigation route alignment');
  });
});
