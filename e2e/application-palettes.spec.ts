import { expect, test, type Page } from '@playwright/test';

const palettes = [
  { name: 'Gunmetal', id: 'gunmetal', base: '#14181a' },
  { name: 'Cobalt', id: 'cobalt', base: '#091737' },
  { name: 'Hangar', id: 'hangar', base: '#1a1713' },
  { name: 'Olive steel', id: 'olive-steel', base: '#161812' },
  { name: 'Petrol teal', id: 'petrol', base: '#0e353d' },
  { name: 'Field olive', id: 'field', base: '#2a381e' },
  { name: 'Classic slate', id: 'slate', base: '#1e293b' },
  { name: 'Royal violet', id: 'violet', base: '#2c1c47' },
  { name: 'Burgundy', id: 'burgundy', base: '#3e1d30' },
  { name: 'Copper', id: 'copper', base: '#3f2a1b' },
  { name: 'Neon', id: 'neon', base: '#0f172a' },
  { name: 'Tactical', id: 'tactical', base: '#0c1220' },
  { name: 'Obsidian', id: 'minimal', base: '#161b22' },
] as const;

const routes = [
  '/',
  '/units',
  '/compendium',
  '/compendium/units',
  '/compendium/equipment',
  '/compendium/rules',
  '/gameplay',
  '/gameplay/campaigns',
  '/gameplay/forces',
  '/gameplay/pilots',
  '/gameplay/encounters',
  '/gameplay/quick',
  '/gameplay/games',
  '/multiplayer',
  '/contacts',
  '/shared',
  '/share',
  '/compare',
  '/replay-library',
  '/audit/timeline',
];

async function appearance(page: Page) {
  return page.evaluate(
    () => JSON.parse(localStorage.getItem('mekstation-appearance')!).state,
  );
}

async function paletteSurface(page: Page) {
  return page
    .locator('body')
    .evaluate((body) =>
      getComputedStyle(body).getPropertyValue('--surface-base').trim(),
    );
}

function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const rgb = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  };
  const [lo, hi] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (hi + 0.05) / (lo + 0.05);
}

for (const palette of palettes) {
  test(`${palette.name} saves, stays readable, and reaches every application area @appearance`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/settings#appearance');
    await page.getByRole('button', { name: palette.name, exact: true }).click();
    await expect.poll(() => paletteSurface(page)).toBe(palette.base);
    expect(await appearance(page)).toMatchObject({ uiTheme: palette.id });
    await expect(
      page.getByRole('button', { name: 'Save Theme', exact: true }),
    ).toHaveCount(0);
    const tokens = await page.locator('body').evaluate((body) => {
      const css = getComputedStyle(body);
      return Object.fromEntries(
        [
          'surface-deep',
          'surface-base',
          'surface-raised',
          'text-primary',
          'text-secondary',
          'text-muted',
        ].map((name) => [name, css.getPropertyValue(`--${name}`).trim()]),
      );
    });
    const form = page.getByLabel('Font Size', { exact: true });
    const formColors = await form.evaluate((el) => ({
      background: getComputedStyle(el).backgroundColor,
      text: getComputedStyle(el).color,
    }));
    const rgb = (hex: string) =>
      `rgb(${[1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;
    expect(formColors).toEqual({
      background: rgb(tokens['surface-raised']),
      text: rgb(tokens['text-primary']),
    });
    await page.emulateMedia({ colorScheme: 'dark' });
    expect(
      await form.evaluate((el) => ({
        background: getComputedStyle(el).backgroundColor,
        text: getComputedStyle(el).color,
      })),
    ).toEqual(formColors);
    await page.emulateMedia({ colorScheme: 'light' });
    const contrasts: Record<string, number> = {};
    for (const text of ['text-primary', 'text-secondary', 'text-muted']) {
      for (const surface of [
        'surface-deep',
        'surface-base',
        'surface-raised',
      ]) {
        contrasts[`${text}/${surface}`] = contrast(
          tokens[text],
          tokens[surface],
        );
        expect(
          contrasts[`${text}/${surface}`],
          `${palette.name}: ${text} on ${surface}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
    for (const name of ['Amber', 'Cyan', 'Emerald', 'Rose', 'Violet', 'Blue']) {
      await page.getByRole('button', { name, exact: true }).click();
      expect(await appearance(page)).toMatchObject({
        accentColor: name.toLowerCase(),
        uiTheme: palette.id,
      });
      const accent = await page.locator('body').evaluate((body) => {
        const css = getComputedStyle(body);
        return {
          primary: css.getPropertyValue('--accent-primary').trim(),
          hover: css.getPropertyValue('--accent-hover').trim(),
        };
      });
      for (const surface of ['surface-deep', 'surface-base', 'surface-raised'])
        expect(
          contrast(accent.primary, tokens[surface]),
          `${name} text on ${palette.name} ${surface}`,
        ).toBeGreaterThanOrEqual(4.5);
      expect(contrast(accent.primary, '#07121c')).toBeGreaterThanOrEqual(4.5);
      expect(contrast(accent.hover, '#07121c')).toBeGreaterThanOrEqual(4.5);
    }
    await page.getByRole('button', { name: 'Amber', exact: true }).click();
    await page
      .getByRole('button', { name: palette.name, exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: testInfo.outputPath('settings-desktop.png'),
      animations: 'disabled',
    });
    await page.reload();
    await expect.poll(() => paletteSurface(page)).toBe(palette.base);
    await expect(
      page.getByRole('button', { name: palette.name, exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    const surfaces = [];
    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.ok(), `${route} HTTP response`).toBe(true);
      await expect.poll(() => paletteSurface(page)).toBe(palette.base);
      await expect(page.locator('main').first()).toBeVisible();
      await expect(
        page.getByText('Something went wrong', { exact: true }),
      ).toHaveCount(0);
      const snapshot = await page.evaluate(() => {
        const tokens = getComputedStyle(document.body);
        const visible = Array.from(
          document.querySelectorAll<HTMLElement>('[class*="bg-surface-"]'),
        ).filter(
          (el) =>
            el.getBoundingClientRect().width > 0 &&
            el.getBoundingClientRect().height > 0,
        );
        return {
          path: location.pathname,
          root: document.documentElement.className,
          background: getComputedStyle(document.body).backgroundColor,
          palette: tokens.getPropertyValue('--surface-base').trim(),
          painted: visible.slice(0, 8).map((el) => ({
            element: el.tagName,
            background: getComputedStyle(el).backgroundColor,
            text: getComputedStyle(el).color,
          })),
        };
      });
      expect(
        snapshot.painted.length,
        `${route} themed visible surfaces`,
      ).toBeGreaterThan(0);
      expect(snapshot.root).toContain(`theme-${palette.id}`);
      surfaces.push(snapshot);
      if (route === '/multiplayer')
        await page.screenshot({
          path: testInfo.outputPath('multiplayer-desktop.png'),
          animations: 'disabled',
        });
    }
    await page.goto('/customizer');
    await page
      .getByRole('button', { name: 'Load from Library', exact: true })
      .click();
    const dialog = page.getByRole('dialog', { name: 'Add Unit', exact: true });
    await dialog.getByRole('combobox').first().selectOption('canonical');
    await dialog
      .getByPlaceholder('Search by chassis or variant...')
      .fill('Atlas AS7-D');
    await dialog.getByText('AS7-D', { exact: true }).click();
    await dialog
      .getByRole('button', { name: 'Load Unit', exact: true })
      .click();
    await expect(dialog).toBeHidden();
    await page
      .getByRole('tab', { name: 'Critical Slots', exact: true })
      .click();
    await expect.poll(() => paletteSurface(page)).toBe(palette.base);
    await page.screenshot({
      path: testInfo.outputPath('customizer-desktop.png'),
      animations: 'disabled',
    });
    const designBeforeReload = await page.evaluate(() =>
      localStorage.getItem(`megamek-unit-${location.pathname.split('/')[2]}`),
    );
    expect(
      designBeforeReload,
      'loaded unit has a persisted draft',
    ).not.toBeNull();
    await page.reload();
    await expect(
      page.getByRole('tab', { name: 'Critical Slots', exact: true }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(
      await page.evaluate(() =>
        localStorage.getItem(`megamek-unit-${location.pathname.split('/')[2]}`),
      ),
    ).toBe(designBeforeReload);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/settings#appearance');
    await expect(
      page.getByRole('button', { name: palette.name, exact: true }),
    ).toHaveAttribute('aria-pressed', 'true');
    await page
      .getByRole('button', { name: palette.name, exact: true })
      .scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath('settings-phone.png'),
      animations: 'disabled',
    });
    await testInfo.attach('palette-proof.json', {
      body: JSON.stringify({ palette, tokens, contrasts, surfaces }, null, 2),
      contentType: 'application/json',
    });
  });
}

test('palette changes update another open application tab without discarding font previews @appearance', async ({
  page,
  context,
}) => {
  await page.goto('/settings#appearance');
  const other = await context.newPage();
  await other.goto('/settings#appearance');
  // A choice made before React hydrates is reset by hydration, so retry
  // until the page registers it (Save Appearance enables on a draft change).
  await expect(async () => {
    await other.getByLabel('Font Size', { exact: true }).selectOption('large');
    await expect(
      other.getByRole('button', { name: 'Save Appearance', exact: true }),
    ).toBeEnabled({ timeout: 1000 });
  }).toPass();
  await page.getByRole('button', { name: 'Petrol teal', exact: true }).click();
  await page.getByRole('button', { name: 'Violet', exact: true }).click();
  await expect.poll(() => paletteSurface(other)).toBe('#0e353d');
  await expect(
    other.getByRole('button', { name: 'Violet', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(other.getByLabel('Font Size', { exact: true })).toHaveValue(
    'large',
  );
  await expect(
    other.getByRole('button', { name: 'Save Appearance', exact: true }),
  ).toBeEnabled();
  expect(await appearance(other)).toMatchObject({
    uiTheme: 'petrol',
    accentColor: 'violet',
    fontSize: 'medium',
  });
  await other.close();
});

test('saved palette is visible before application scripts load @appearance', async ({
  page,
  context,
}) => {
  await page.goto('/settings#appearance');
  await page.getByRole('button', { name: 'Burgundy', exact: true }).click();
  await page.getByRole('button', { name: 'Cyan', exact: true }).click();
  const cold = await context.newPage();
  await cold.route('**/_next/static/**/*.js', (route) => route.abort());
  await cold.goto('/settings', { waitUntil: 'domcontentloaded' });
  await expect(cold.locator('html')).toHaveClass(/theme-burgundy/);
  await expect.poll(() => paletteSurface(cold)).toBe('#3e1d30');
  expect(
    await cold
      .locator('html')
      .evaluate((root) => getComputedStyle(root).colorScheme),
  ).toBe('dark');
  await cold.close();
});

test('storage failure is reported and a retry saves the selected colors @appearance', async ({
  page,
}, testInfo) => {
  await page.goto('/settings#appearance');
  await expect(
    page.getByRole('button', { name: 'Gunmetal', exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Object.defineProperty(window, 'restorePaletteWrites', {
      configurable: true,
      value: () => {
        Storage.prototype.setItem = original;
      },
    });
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === 'mekstation-appearance')
        throw new DOMException('Storage full', 'QuotaExceededError');
      original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: 'Field olive', exact: true }).click();
  await expect.poll(() => paletteSurface(page)).toBe('#2a381e');
  await expect(
    page.getByRole('alert').filter({ hasText: 'Couldn’t save colors' }),
  ).toBeVisible();
  expect(await appearance(page)).toMatchObject({ uiTheme: 'gunmetal' });
  await page.screenshot({
    path: testInfo.outputPath('palette-save-failure.png'),
    animations: 'disabled',
  });
  await page.evaluate(() => {
    const restoreWrites = Reflect.get(window, 'restorePaletteWrites');
    if (typeof restoreWrites !== 'function')
      throw new Error('Storage restore hook is missing');
    restoreWrites();
  });
  await page
    .getByRole('button', { name: 'Retry saving colors', exact: true })
    .click();
  expect(await appearance(page)).toMatchObject({ uiTheme: 'field' });
  await page.reload();
  await expect.poll(() => paletteSurface(page)).toBe('#2a381e');
});

for (const palette of [palettes[1], palettes[4]]) {
  test(`${palette.name} reaches simulation charts and tactical map controls @appearance`, async ({
    page,
  }, testInfo) => {
    await page.goto('/settings#appearance');
    await page.getByRole('button', { name: palette.name, exact: true }).click();
    await page.goto('/e2e/simulation-viewer');
    await expect(page.getByTestId('simulation-viewer-harness')).toBeVisible();
    await expect(page.getByTestId('campaign-dashboard')).toBeVisible();
    await expect(page.getByTestId('kpi-card').first()).toBeVisible();
    const base = `rgb(${[1, 3, 5].map((i) => parseInt(palette.base.slice(i, i + 2), 16)).join(', ')})`;
    await expect(page.getByTestId('kpi-card').first()).toHaveCSS(
      'background-color',
      base,
    );
    await page.screenshot({
      path: testInfo.outputPath('simulation-dashboard.png'),
      animations: 'disabled',
    });
    await page.getByTestId('tab-encounter-history').click();
    await expect(page.getByTestId('encounter-history')).toBeVisible();
    await page.getByTestId('battle-card-battle-1').click();
    await expect(page.getByTestId('forces-section')).toBeVisible();
    await page.getByTestId('tab-analysis-bugs').click();
    await expect(page.getByTestId('analysis-bugs-page')).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('simulation-analysis.png'),
      animations: 'disabled',
    });
    await page.goto('/e2e/tactical-map');
    await expect(page.getByTestId('tactical-map-e2e-harness')).toBeVisible();
    const projection = page.getByTestId('projection-toggle');
    await expect(projection).toBeVisible();
    await expect(projection).toHaveCSS('background-color', base);
    const oldBackground = await projection.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    await projection.click();
    await expect(page.getByTestId('projection-rotate-left')).toBeVisible();
    await expect
      .poll(() =>
        projection.evaluate((el) => getComputedStyle(el).backgroundColor),
      )
      .not.toBe(oldBackground);
    await page.getByTestId('projection-rotate-left').click();
    await page.getByTestId('zoom-in-btn').click();
    await page.screenshot({
      path: testInfo.outputPath('tactical-map.png'),
      animations: 'disabled',
    });
    expect(await appearance(page)).toMatchObject({ uiTheme: palette.id });
  });
}
