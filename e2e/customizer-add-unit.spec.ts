import { expect, test, type Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    Reflect.deleteProperty(Navigator.prototype, 'serviceWorker'),
  );
});

async function readDraft(page: Page) {
  return page.evaluate(() => {
    const id = location.pathname.split('/')[2];
    const stored = localStorage.getItem(`megamek-unit-${id}`);
    return stored ? { id, ...JSON.parse(stored).state } : null;
  });
}

for (const catalogState of ['loading', 'failed'] as const) {
  test(`blank unit opens immediately with catalog ${catalogState} @customizer`, async ({
    page,
  }, testInfo) => {
    let release = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/units/custom', async (route) => {
      if (catalogState === 'loading') await pending;
      await route.abort();
    });
    try {
      await page.goto('/customizer');
      await page.getByRole('button', { name: 'Add unit', exact: true }).click();
      const dialog = page.getByRole('dialog', {
        name: 'Add unit',
        exact: true,
      });
      await expect(dialog).toBeVisible();
      if (catalogState === 'failed')
        await expect(dialog.getByRole('alert')).toBeVisible();
      else
        await expect(
          dialog.getByText('Loading units...', { exact: true }),
        ).toBeVisible();
      await dialog.screenshot({
        path: testInfo.outputPath(`add-unit-${catalogState}.png`),
        animations: 'disabled',
      });
      await dialog
        .getByRole('button', { name: 'New blank unit', exact: true })
        .click();
      await expect(dialog).toBeHidden();
      await expect(page).toHaveURL(/customizer\/[a-f0-9-]+\//);
      await expect.poll(async () => (await readDraft(page))?.tonnage).toBe(50);
      const draft = await readDraft(page);
      expect(draft.equipment).toEqual([]);
      expect(draft.techBase).toBe('Inner Sphere');
      await expect(
        page.getByRole('tab', { name: 'Mek', exact: true }),
      ).toHaveAttribute('aria-selected', 'true');
      release();
      await page.reload();
      await expect.poll(async () => (await readDraft(page))?.id).toBe(draft.id);
      expect((await readDraft(page)).tonnage).toBe(50);
      await page
        .getByRole('button', { name: 'Add unit (Ctrl+O)', exact: true })
        .click();
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByRole('button', { name: 'New blank unit' }),
      ).toBeEnabled();
      await page.keyboard.press('Escape');
      await page
        .getByRole('button', { name: 'Unit actions', exact: true })
        .click();
      await expect(
        page.getByRole('button', { name: 'New unit', exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole('button', { name: 'Import from bundle' }),
      ).toBeVisible();
    } finally {
      release();
    }
  });
}

test('Add unit keeps catalog loading and optional starting settings in one flow @customizer', async ({
  page,
}, testInfo) => {
  await page.goto('/customizer');
  await page
    .getByRole('button', { name: 'Load from Library', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Add unit', exact: true });
  await expect(
    dialog.getByRole('button', { name: 'New blank unit' }),
  ).toBeVisible();
  await dialog.getByRole('combobox').first().selectOption('canonical');
  await dialog
    .getByPlaceholder('Search by chassis or variant...')
    .fill('Atlas AS7-D');
  await dialog.getByText('AS7-D', { exact: true }).click();
  await dialog.screenshot({
    path: testInfo.outputPath('add-unit-catalog.png'),
    animations: 'disabled',
  });
  await dialog.getByRole('button', { name: 'Load Unit', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole('tab', { name: 'Atlas AS7-D', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  const atlas = await readDraft(page);
  await page
    .getByRole('button', { name: 'Add unit (Ctrl+O)', exact: true })
    .click();
  // Wide layout: the primary and secondary buttons sit side by side, left
  // aligned, the same height, 12px apart. Each carries its own caption right
  // under it, starting at that button's left edge.
  const primary = dialog.getByRole('button', { name: 'New blank unit' });
  const secondary = dialog.getByRole('button', {
    name: 'Choose tonnage and tech first…',
  });
  const helper = dialog.getByText(
    'Starts a 50-ton Inner Sphere BattleMech you can change.',
  );
  const secondaryHelper = dialog.getByText(
    'Pick unit type, tonnage and tech base.',
  );
  const [pBox, sBox, hBox, shBox] = await Promise.all([
    primary.boundingBox(),
    secondary.boundingBox(),
    helper.boundingBox(),
    secondaryHelper.boundingBox(),
  ]);
  expect(Math.abs(pBox!.height - sBox!.height)).toBeLessThanOrEqual(1);
  expect(Math.abs(pBox!.y - sBox!.y)).toBeLessThanOrEqual(1);
  expect(sBox!.x - (pBox!.x + pBox!.width)).toBeCloseTo(12, 0);
  expect(Math.abs(hBox!.x - pBox!.x)).toBeLessThanOrEqual(1);
  expect(hBox!.y).toBeGreaterThanOrEqual(pBox!.y + pBox!.height);
  // The blank-unit caption stays inside its own button's column ...
  expect(hBox!.x + hBox!.width).toBeLessThanOrEqual(pBox!.x + pBox!.width + 1);
  // ... and the settings caption sits under the settings button.
  expect(Math.abs(shBox!.x - sBox!.x)).toBeLessThanOrEqual(1);
  expect(shBox!.y).toBeGreaterThanOrEqual(sBox!.y + sBox!.height);
  await dialog
    .getByRole('button', { name: 'Choose tonnage and tech first…' })
    .click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole('heading', { name: 'Create New Unit' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole('button', { name: 'Add unit (Ctrl+O)', exact: true })
    .click();
  const blank = dialog.getByRole('button', {
    name: 'New blank unit',
    exact: true,
  });
  await expect(blank).toBeInViewport();
  await page.screenshot({
    path: testInfo.outputPath('add-unit-phone.png'),
    animations: 'disabled',
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBe(0);
  await blank.click();
  await expect(dialog).toBeHidden();
  await expect.poll(async () => (await readDraft(page))?.id).not.toBe(atlas.id);
  await expect(
    page.getByRole('tablist', { name: 'Open units' }).getByRole('tab'),
  ).toHaveCount(2);
  await page.getByRole('tab', { name: 'Atlas AS7-D', exact: true }).click();
  await expect.poll(async () => (await readDraft(page))?.id).toBe(atlas.id);
  expect((await readDraft(page)).equipment).toEqual(atlas.equipment);
});
