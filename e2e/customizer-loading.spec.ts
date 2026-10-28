import { test, expect, type Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    Reflect.deleteProperty(Navigator.prototype, 'serviceWorker'),
  );
});

const isAtlas = (url: URL) =>
  decodeURIComponent(url.pathname).endsWith('/Atlas AS7-D.json');

async function drafts(page: Page) {
  return page.evaluate(() =>
    Object.keys(localStorage)
      .filter((key) => key.startsWith('megamek-unit-'))
      .map(
        (key) =>
          JSON.parse(localStorage.getItem(key)!).state as {
            id: string;
            name: string;
            sourceDefinition?: { source: string; id: string };
          },
      ),
  );
}

async function selectAtlas(page: Page) {
  await page
    .getByPlaceholder('Search by chassis or variant...')
    .fill('Atlas AS7-D');
  await page.getByText('AS7-D', { exact: true }).click();
}

test('invalid definitions recover after the source is corrected @customizer', async ({
  page,
}) => {
  await page.goto('/customizer');
  await page.route(isAtlas, async (route) => {
    const response = await route.fetch();
    const payload = await response.json();
    delete payload.engine;
    await route.fulfill({ response, json: payload });
  });
  await page
    .getByRole('button', { name: 'Load from Library', exact: true })
    .click();
  await selectAtlas(page);
  await page.getByRole('button', { name: 'Load Unit', exact: true }).click();
  await expect(
    page.getByText(/This library entry contains invalid unit data/),
  ).toBeVisible();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await drafts(page)).toEqual([]);
  await page.unroute(isAtlas);
  await page.getByRole('button', { name: 'Load Unit', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  expect(await drafts(page)).toEqual([
    expect.objectContaining({
      name: 'Atlas AS7-D',
      sourceDefinition: { source: 'canonical', id: 'atlas-as7-d' },
    }),
  ]);
});

for (const width of [1440, 390]) {
  test(`canceling a delayed load cannot create an extra editor after retry at ${width}px @customizer`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    let release!: () => void;
    let arrived!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const requested = new Promise<void>((resolve) => {
      arrived = resolve;
    });
    let reads = 0;
    await page.route(isAtlas, async (route) => {
      reads++;
      if (reads === 1) {
        const response = await route.fetch();
        arrived();
        await held;
        await route.fulfill({ response });
      } else await route.continue();
    });
    try {
      await page.goto('/customizer');
      await page
        .getByRole('button', { name: 'Load from Library', exact: true })
        .click();
      await selectAtlas(page);
      await page
        .getByRole('button', { name: 'Load Unit', exact: true })
        .click();
      await requested;
      await expect(
        page.getByRole('button', { name: 'Loading Unit…', exact: true }),
      ).toBeDisabled();
      // Phones hide the footer Cancel (sm:block); the header ✕ cancels there.
      await page
        .getByRole('button', {
          name: width < 640 ? 'Close dialog' : 'Cancel',
          exact: true,
        })
        .click();
      await expect(page.getByRole('dialog')).toBeHidden();
      await page
        .getByRole('button', { name: 'Load from Library', exact: true })
        .click();
      await selectAtlas(page);
      await page
        .getByRole('button', { name: 'Load Unit', exact: true })
        .click();
      await expect(page.getByRole('dialog')).toBeHidden();
      const accepted = await drafts(page);
      expect(accepted).toHaveLength(1);
      const returned = page.waitForResponse((response) =>
        isAtlas(new URL(response.url())),
      );
      release();
      await (await returned).finished();
      // Let the fulfilled response reach the pending editor callback.
      await page.waitForTimeout(250);
      expect(await drafts(page)).toEqual(accepted);
      expect(reads).toBe(2);
      await page.screenshot({
        path: testInfo.outputPath('canceled-load-retry.png'),
      });
    } finally {
      release();
      await page.unrouteAll({ behavior: 'wait' });
    }
  });
}

test('a changed selection stays authoritative when an older definition returns @customizer', async ({
  page,
}) => {
  let release!: () => void;
  let arrived!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const requested = new Promise<void>((resolve) => {
    arrived = resolve;
  });
  await page.route(isAtlas, async (route) => {
    const response = await route.fetch();
    arrived();
    await held;
    await route.fulfill({ response });
  });
  try {
    await page.goto('/customizer');
    await page
      .getByRole('button', { name: 'Load from Library', exact: true })
      .click();
    await selectAtlas(page);
    await page.getByRole('button', { name: 'Load Unit', exact: true }).click();
    await requested;
    await page
      .getByPlaceholder('Search by chassis or variant...')
      .fill('Atlas AS7-K');
    await page.getByText('AS7-K', { exact: true }).click();
    await page.getByRole('button', { name: 'Load Unit', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    const accepted = await drafts(page);
    expect(accepted).toEqual([
      expect.objectContaining({ name: 'Atlas AS7-K' }),
    ]);
    const returned = page.waitForResponse((response) =>
      isAtlas(new URL(response.url())),
    );
    release();
    await (await returned).finished();
    await page.waitForTimeout(250);
    expect(await drafts(page)).toEqual(accepted);
  } finally {
    release();
    await page.unrouteAll({ behavior: 'wait' });
  }
});

test('catalog request failure offers a working retry @customizer', async ({
  page,
}) => {
  const isIndex = (url: URL) =>
    url.pathname.endsWith('/data/units/battlemechs/index.json');
  await page.route(isIndex, (route) =>
    route.fulfill({ status: 503, body: 'Unavailable' }),
  );
  await page.goto('/customizer');
  await page
    .getByRole('button', { name: 'Load from Library', exact: true })
    .click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Could not load the library' }),
  ).toBeVisible();
  expect(await drafts(page)).toEqual([]);
  await page.unroute(isIndex);
  await page
    .getByRole('button', { name: 'Retry Loading Library', exact: true })
    .click();
  await selectAtlas(page);
  await page.getByRole('button', { name: 'Load Unit', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  expect(await drafts(page)).toHaveLength(1);
});
