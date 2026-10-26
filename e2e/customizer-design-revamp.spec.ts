import { test, expect, type Page } from '@playwright/test';

async function loadAtlas(page: Page) {
  await page.goto('/customizer');
  await page.getByRole('button', { name: 'Load from Library' }).click();
  await page
    .getByPlaceholder('Search by chassis or variant...')
    .fill('Atlas AS7-D');
  await page.getByText('AS7-D', { exact: true }).click();
  await page.getByRole('button', { name: 'Load Unit', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page
    .getByText('Unit "Atlas AS7-D" loaded', { exact: true })
    .waitFor({ state: 'hidden' });
}

async function expectFittedPreview(page: Page) {
  await expect(
    page.getByRole('button', { name: 'Download PDF', exact: true }),
  ).toBeInViewport({ ratio: 1 });
  await expect(
    page.getByRole('button', { name: 'Print', exact: true }),
  ).toBeInViewport({ ratio: 1 });
  const canvas = page.locator('.record-sheet-preview canvas');
  await expect
    .poll(
      () =>
        canvas.evaluate((element) => {
          const sheet = element as HTMLCanvasElement;
          const ctx = sheet.getContext('2d');
          if (!ctx) return 0;
          const { data } = ctx.getImageData(0, 0, sheet.width, sheet.height);
          let ink = 0;
          for (let i = 0; i < data.length; i += 64) {
            if (
              data[i + 3] > 0 &&
              data[i] < 100 &&
              data[i + 1] < 100 &&
              data[i + 2] < 100
            )
              ink++;
          }
          return ink;
        }),
      { timeout: 20000 },
    )
    .toBeGreaterThan(100);
  const controls = page.getByRole('group', {
    name: 'Record sheet zoom controls',
  });
  await expect(controls).toBeInViewport({ ratio: 1 });
  const paper = (await canvas.boundingBox())!;
  const footer = (await controls.boundingBox())!;
  const viewport = page.viewportSize()!;
  if (viewport.width < 640) {
    // Phones open the sheet fitted to width so it stays legible; the full
    // width is visible and the rest of the page scrolls above the controls.
    expect(paper.x).toBeGreaterThanOrEqual(0);
    expect(paper.x + paper.width).toBeLessThanOrEqual(viewport.width);
    expect(paper.y).toBeLessThan(footer.y);
    return;
  }
  await expect(canvas).toBeInViewport({ ratio: 1 });
  expect(paper.y + paper.height).toBeLessThanOrEqual(footer.y);
}

const tabs = [
  'Overview',
  'Structure',
  'Armor',
  'Equipment',
  'Critical Slots',
  'Fluff',
  'Preview',
];

test('all workbench surfaces retain a stable sidebar and explicit wide mode @customizer', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await loadAtlas(page);
  const loadout = page.getByLabel('Unit loadout', { exact: true });
  for (const label of tabs) {
    const tab = page.getByRole('tab', { name: label, exact: true });
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toBeVisible();
    await expect(loadout).toBeVisible();
    expect(Math.round((await loadout.boundingBox())!.width)).toBe(240);
    await page.waitForTimeout(200);
    if (label === 'Preview') await expectFittedPreview(page);
    await page.screenshot({
      path: testInfo.outputPath(
        `${label.toLowerCase().replaceAll(' ', '-')}-desktop.png`,
      ),
    });
  }
  const wide = page.getByRole('button', {
    name: 'Wide workspace',
    exact: true,
  });
  await wide.click();
  await expect(wide).toHaveAttribute('aria-pressed', 'true');
  await expect(loadout).not.toBeVisible();
  await page.getByRole('tab', { name: 'Structure', exact: true }).click();
  await expect(wide).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(wide).toHaveAttribute('aria-pressed', 'true');
  await wide.click();
  await expect(loadout).toBeVisible();
  await page
    .getByRole('button', { name: 'Collapse loadout', exact: true })
    .click();
  await page.getByRole('tab', { name: 'Armor', exact: true }).click();
  await expect(
    page.getByRole('button', { name: /^Expand loadout with/ }),
  ).toBeVisible();
});

test('mobile keeps identity and tab navigation available across all surfaces @customizer', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() =>
    localStorage.setItem('mekstation:customizer-wide-workspace', 'true'),
  );
  await loadAtlas(page);
  const mobileLoadout = page.getByRole('button', {
    name: 'Expand loadout',
    exact: true,
  });
  await expect(mobileLoadout).toBeInViewport({ ratio: 1 });
  await mobileLoadout.click({ timeout: 5000 });
  await page
    .getByRole('button', { name: 'Close loadout', exact: true })
    .click();
  for (const label of tabs) {
    const selector = page.getByRole('button', { name: /^Section:/ });
    await selector.click();
    const tab = page.getByRole('tab', { name: label, exact: true });
    await tab.click();
    await expect(selector).toHaveAccessibleName(
      `Section: ${label}, ${tabs.indexOf(label) + 1} of 7`,
    );
    await expect(selector).toHaveAttribute('aria-expanded', 'false');
    await expect(selector).toBeFocused();
    await expect(
      page.getByRole('region', { name: 'Unit status', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('group', { name: 'Capacity', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', {
        name: 'Save active unit to library',
        exact: true,
      }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.waitForTimeout(200);
    if (label === 'Preview') await expectFittedPreview(page);
    await page.screenshot({
      path: testInfo.outputPath(
        `${label.toLowerCase().replaceAll(' ', '-')}-mobile.png`,
      ),
    });
  }
});
