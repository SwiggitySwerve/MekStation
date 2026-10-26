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
  // One control names both the mode and percentage.
  await expect(
    controls.getByRole('button', { name: 'Zoom options', exact: true }),
  ).toHaveText(/Fit width \u00b7 \d+%/);
  await expect(page.getByLabel('Current zoom', { exact: true })).toHaveText(
    /^\d+%$/,
  );
  // The caption names the paper and page count; the zoom lives in the toolbar.
  await expect(page.getByTestId('preview-sheet-caption')).toHaveText(
    'Letter \u00b7 1 page',
  );
  const paper = (await canvas.boundingBox())!;
  const toolbar = (await controls.boundingBox())!;
  const viewport = page.viewportSize()!;
  // Every screen opens fit-width: the sheet is as wide as the viewer allows
  // (capped at 920px), fully inside the viewport horizontally, and starts
  // below the toolbar that now holds the zoom controls.
  expect(paper.x).toBeGreaterThanOrEqual(0);
  expect(paper.x + paper.width).toBeLessThanOrEqual(viewport.width);
  expect(paper.width).toBeLessThanOrEqual(921);
  expect(paper.y).toBeGreaterThanOrEqual(toolbar.y + toolbar.height);
  if (viewport.width < 640) {
    const statusRegion = page.getByRole('region', { name: 'Unit status' });
    const capacity = (await statusRegion
      .getByRole('group', { name: 'Capacity', exact: true })
      .boundingBox())!;
    const buildStatus = statusRegion.locator('[data-build-status]');
    const statusBox = (await buildStatus.boundingBox())!;
    // The status is a 44px chip in the stat strip, beside the key readouts,
    // so the header stays one 48px row.
    expect(statusBox.x).toBeGreaterThanOrEqual(capacity.x + capacity.width - 1);
    expect(statusBox.height).toBe(44);
    expect(statusBox.width).toBeLessThanOrEqual(140);
    expect((await statusRegion.boundingBox())!.height).toBe(48);
    await expect(buildStatus).toHaveCSS('font-size', '13px');
    // Phones: exactly two toolbar rows, every control 44px tall with a
    // visible text label, the sheet starting high, and a readability hint.
    const rows = await page
      .locator('.preview-toolbar')
      .locator('button, [data-testid="paper-size-phone-label"]')
      .evaluateAll((nodes) =>
        nodes
          .filter((node) => (node as HTMLElement).offsetParent !== null)
          .map((node) => {
            const box = node.getBoundingClientRect();
            return {
              top: Math.round(box.top),
              height: Math.round(box.height),
              // The - and + steppers are icon buttons named by aria-label.
              text:
                (node.textContent ?? '').trim() ||
                (node.getAttribute('aria-label') ?? ''),
            };
          }),
      );
    expect(new Set(rows.map((row) => row.top)).size).toBe(2);
    for (const row of rows) {
      expect(row.height).toBeGreaterThanOrEqual(44);
      expect(row.text.length).toBeGreaterThan(0);
    }
    expect(paper.y).toBeLessThanOrEqual(340);
    await expect(page.getByTestId('preview-sheet-hint')).toHaveText(
      'Zoom in or pinch to read details',
    );
  }
  if (viewport.width >= 640) {
    // Readable on desktop, not a 600px sheet between wide gutters.
    expect(paper.width).toBeGreaterThan(800);
    const toolbarRow = page.locator('.preview-toolbar');
    await expect(toolbarRow.getByLabel('Paper Size:')).toBeVisible();
    await expect(controls).toBeInViewport({ ratio: 1 });
    expect(
      await toolbarRow
        .getByRole('group', { name: 'Record sheet zoom controls' })
        .count(),
    ).toBe(1);
  }
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
    name: 'Hide loadout panel',
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
