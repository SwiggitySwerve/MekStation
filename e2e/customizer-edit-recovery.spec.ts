import { expect, test, type Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    Reflect.deleteProperty(Navigator.prototype, 'serviceWorker'),
  );
});
async function draft(page: Page) {
  return page.evaluate(() => {
    const id = location.pathname.split('/')[2];
    return JSON.parse(localStorage.getItem(`megamek-unit-${id}`)!).state;
  });
}
async function load(
  page: Page,
  chassis: string,
  variant: string,
  initial = false,
) {
  if (initial) {
    await page.goto('/customizer');
    await page.getByRole('button', { name: 'Load from Library' }).click();
  } else await page.getByRole('button', { name: 'Add unit (Ctrl+O)' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add unit', exact: true });
  await dialog
    .getByPlaceholder('Search by chassis or variant...')
    .fill(`${chassis} ${variant}`);
  await dialog.getByText(variant, { exact: true }).click();
  await dialog.getByRole('button', { name: 'Load Unit', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole('tab', { name: `${chassis} ${variant}`, exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('unit-info-stat-bv')).not.toHaveText(
    /^BV\s*0$/,
  );
}
async function metrics(page: Page) {
  return page.locator('[data-testid^="unit-info-stat-"]').allTextContents();
}
const undo = (page: Page) =>
  page.getByRole('button', { name: /^Undo(?::|$)/ }).click();
const redo = (page: Page) =>
  page.getByRole('button', { name: /^Redo(?::|$)/ }).click();

test('undo restores structure, armor and placement with metrics and independent tabs @customizer', async ({
  page,
}, testInfo) => {
  await load(page, 'Atlas', 'AS7-D', true);
  await page.getByRole('tab', { name: 'Structure', exact: true }).click();
  const before = await draft(page),
    initialMetrics = await metrics(page);
  await page
    .getByRole('combobox', { name: 'Engine', exact: true })
    .selectOption('XL Engine (IS)');
  await expect
    .poll(async () => (await draft(page)).engineType)
    .toBe('XL Engine (IS)');
  const engine = await draft(page);
  await page.getByRole('combobox', { name: 'Engine', exact: true }).focus();
  await page.keyboard.press('Control+z');
  expect((await draft(page)).equipment).toEqual(before.equipment);
  expect((await draft(page)).engineType).toBe(before.engineType);
  await expect.poll(() => metrics(page)).toEqual(initialMetrics);
  await redo(page);
  expect((await draft(page)).equipment).toEqual(engine.equipment);
  await undo(page);
  await page.getByRole('tab', { name: 'Armor', exact: true }).click();
  await page
    .getByRole('spinbutton', { name: 'Armor tonnage', exact: true })
    .fill('18');
  const preAllocation = await draft(page);
  await page.getByRole('button', { name: /^Auto Allocate/ }).click();
  const allocated = await draft(page);
  expect(allocated.armorAllocation).not.toEqual(preAllocation.armorAllocation);
  await undo(page);
  expect((await draft(page)).armorAllocation).toEqual(
    preAllocation.armorAllocation,
  );
  await redo(page);
  expect((await draft(page)).armorAllocation).toEqual(
    allocated.armorAllocation,
  );
  await page.getByRole('tab', { name: 'Equipment', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Search equipment', exact: true })
    .fill('Small Laser');
  await page
    .getByRole('button', { name: 'Add Small Laser', exact: true })
    .click();
  await page.getByRole('tab', { name: 'Critical Slots', exact: true }).click();
  await page
    .getByRole('button', {
      name: 'Select Small Laser in unallocated loadout',
      exact: true,
    })
    .click();
  const placement = page.getByRole('region', { name: 'Equipment placement' });
  const unplaced = await draft(page);
  await placement
    .getByRole('combobox', { name: 'Place selected equipment' })
    .selectOption('Left Arm');
  const placed = await draft(page);
  expect(placed.equipment).not.toEqual(unplaced.equipment);
  await undo(page);
  expect((await draft(page)).equipment).toEqual(unplaced.equipment);
  await redo(page);
  expect((await draft(page)).equipment).toEqual(placed.equipment);
  await load(page, 'Locust', 'LCT-1V');
  const locust = await draft(page);
  await expect(
    page.getByRole('button', { name: 'Undo', exact: true }),
  ).toBeDisabled();
  await page.getByRole('tab', { name: 'Atlas AS7-D', exact: true }).click();
  await undo(page);
  expect((await draft(page)).equipment).toEqual(unplaced.equipment);
  await page.getByRole('tab', { name: 'Locust LCT-1V', exact: true }).click();
  expect((await draft(page)).equipment).toEqual(locust.equipment);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole('group', { name: 'Edit history' }),
  ).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('edit-recovery-mobile.png'),
  });
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Undo', exact: true }),
  ).toBeDisabled();
});

async function saveLibrary(page: Page, variant?: string) {
  await page
    .getByRole('button', { name: 'Save active unit to library', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Save Unit', exact: true });
  if (variant)
    await dialog
      .getByLabel('Variant Designation', { exact: true })
      .fill(variant);
  const response = page.waitForResponse(
    (r) =>
      /\/api\/units\/custom(?:\/[^/]+)?$/.test(new URL(r.url()).pathname) &&
      ['POST', 'PUT'].includes(r.request().method()),
  );
  await dialog
    .getByRole('button', { name: variant ? 'Save' : 'Overwrite', exact: true })
    .click();
  const result = await response;
  expect(result.ok()).toBe(true);
  const receipt = (await result.json()).data as { id: string; version: number };
  await expect(dialog).toBeHidden();
  return receipt;
}
async function openHistory(page: Page) {
  await page.getByRole('button', { name: 'Unit actions', exact: true }).click();
  await page
    .getByRole('button', { name: /saved history|version history/i })
    .click();
  await expect(
    page.getByRole('heading', { name: /version history/i }),
  ).toBeVisible();
}

test('save, reload and restore history retain exact library versions and undo only the selected draft @customizer', async ({
  page,
}, testInfo) => {
  await load(page, 'Atlas', 'AS7-D', true);
  await page.getByRole('tab', { name: 'Overview', exact: true }).click();
  await page.getByLabel('Clan name', { exact: true }).fill('Recovery One');
  const originalId = (await draft(page)).id;
  const variant = `RECOVERY-${Date.now()}`;
  const receipt = await saveLibrary(page, variant);
  try {
    expect(receipt.version).toBe(1);
    await undo(page);
    expect((await draft(page)).clanName).not.toBe('Recovery One');
    expect((await draft(page)).model).toBe(variant);
    await redo(page);
    expect((await draft(page)).clanName).toBe('Recovery One');
    expect((await draft(page)).model).toBe(variant);
    await expect
      .poll(async () => (await draft(page)).librarySave?.id)
      .toBe(receipt.id);
    await expect(page.getByText(/Last library save v1/)).toBeVisible();
    await page.getByLabel('Clan name', { exact: true }).fill('Recovery Two');
    const second = await saveLibrary(page);
    expect(second.id).toBe(receipt.id);
    expect(second.version).toBe(2);
    const url = `/api/units/custom/${encodeURIComponent(receipt.id)}`;
    const v1 = await (await page.request.get(`${url}/versions/1`)).json();
    const v2 = await (await page.request.get(`${url}/versions/2`)).json();
    expect(v1.parsedData.clanName).toBe('Recovery One');
    expect(v2.parsedData.clanName).toBe('Recovery Two');
    await load(page, 'Locust', 'LCT-1V');
    const locust = await draft(page);
    await page
      .getByRole('tab', { name: `Atlas ${variant}`, exact: true })
      .click();
    await page.reload();
    await expect(page.getByText(/Last library save v2/)).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Undo', exact: true }),
    ).toBeDisabled();
    await openHistory(page);
    const cancelledDialog = page.getByRole('dialog');
    await cancelledDialog.getByRole('button', { name: /^v1(?: |$)/ }).click();
    await expect(
      cancelledDialog.getByText('Version 1 Details', { exact: true }),
    ).toBeVisible();
    let releaseRestore!: () => void;
    let sawRestore!: () => void;
    const restoreHeld = new Promise<void>((resolve) => {
      releaseRestore = resolve;
    });
    const restoreRequested = new Promise<void>((resolve) => {
      sawRestore = resolve;
    });
    const versionUrl = `**${url}/versions/1`;
    await page.route(versionUrl, async (route) => {
      sawRestore();
      await restoreHeld;
      await route.continue();
    });
    await cancelledDialog.getByRole('button', { name: /Restore.*v1/i }).click();
    await restoreRequested;
    await cancelledDialog
      .getByRole('button', { name: 'Close', exact: true })
      .click();
    await expect(cancelledDialog).toBeHidden();
    const cancelledResponse = page.waitForResponse((r) =>
      r.url().endsWith(`${url}/versions/1`),
    );
    releaseRestore();
    await cancelledResponse;
    await page.unroute(versionUrl);
    expect((await draft(page)).clanName).toBe('Recovery Two');
    await openHistory(page);
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: /^v1\b/ }).click();
    await expect(
      dialog.getByText('Version 1 Details', { exact: true }),
    ).toBeVisible();
    await dialog.getByRole('button', { name: /Restore.*v1/i }).click();
    await expect(dialog).toBeHidden();
    expect((await draft(page)).id).toBe(originalId);
    expect((await draft(page)).clanName).toBe('Recovery One');
    expect((await draft(page)).librarySave.version).toBe(2);
    await expect(page.getByText(/Changes since library save/)).toBeVisible();
    await undo(page);
    expect((await draft(page)).clanName).toBe('Recovery Two');
    await redo(page);
    expect((await draft(page)).clanName).toBe('Recovery One');
    expect(await (await page.request.get(`${url}/versions/1`)).json()).toEqual(
      v1,
    );
    expect(await (await page.request.get(`${url}/versions/2`)).json()).toEqual(
      v2,
    );
    expect((await (await page.request.get(url)).json()).currentVersion).toBe(2);
    await page.getByRole('tab', { name: 'Locust LCT-1V', exact: true }).click();
    expect((await draft(page)).equipment).toEqual(locust.equipment);
    await page
      .getByRole('tab', { name: `Atlas ${variant}`, exact: true })
      .click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: testInfo.outputPath('library-recovery-mobile.png'),
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const third = await saveLibrary(page);
    expect(third.version).toBe(3);
    expect(
      (await (await page.request.get(`${url}/versions/3`)).json()).parsedData
        .clanName,
    ).toBe('Recovery One');
    expect(await (await page.request.get(`${url}/versions/1`)).json()).toEqual(
      v1,
    );
    await page.reload();
    await expect(page.getByText(/Last library save v3/)).toBeVisible();
    await openHistory(page);
    const latestDialog = page.getByRole('dialog');
    await latestDialog.getByRole('button', { name: /^v3(?: |$)/ }).click();
    await expect(
      latestDialog.getByText('Version 3 Details', { exact: true }),
    ).toBeVisible();
    await latestDialog.getByRole('button', { name: /Restore.*v3/i }).click();
    await expect(latestDialog).toBeHidden();
    expect((await draft(page)).isModified).toBe(false);
    await expect(page.getByText(/Matches library save/)).toBeVisible();
    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      const currentKey = `megamek-unit-${location.pathname.split('/')[2]}`;
      Object.assign(window, {
        restoreDraftStorage: () => {
          Storage.prototype.setItem = original;
        },
      });
      Storage.prototype.setItem = function (key, value) {
        if (key === currentKey)
          throw new DOMException('Test quota exhausted', 'QuotaExceededError');
        original.call(this, key, value);
      };
    });
    await page.getByLabel('Clan name', { exact: true }).fill('Browser Retry');
    await expect(
      page.getByText('Draft save failed', { exact: true }),
    ).toBeVisible();
    await page.evaluate(() => {
      (
        window as unknown as { restoreDraftStorage: () => void }
      ).restoreDraftStorage();
    });
    await page
      .getByRole('button', { name: 'Retry browser draft', exact: true })
      .click();
    await expect(page.getByText('Draft saved', { exact: true })).toBeVisible();
    expect((await draft(page)).clanName).toBe('Browser Retry');
    expect((await (await page.request.get(url)).json()).currentVersion).toBe(3);
    await undo(page);
    expect((await draft(page)).clanName).toBe('Recovery One');
    await testInfo.attach('immutable-library-versions.json', {
      body: JSON.stringify({ v1, v2, receipt: third }, null, 2),
      contentType: 'application/json',
    });
  } finally {
    expect(
      (
        await page.request.delete(
          `/api/units/custom/${encodeURIComponent(receipt.id)}`,
        )
      ).ok(),
    ).toBe(true);
  }
});

test('explicit Structure URL overrides a saved Preview tab while omitted tabs restore it @customizer', async ({
  page,
}) => {
  await load(page, 'Atlas', 'AS7-D', true);
  const before = await draft(page);
  const unitId = new URL(page.url()).pathname.split('/')[2];
  await page.getByRole('tab', { name: 'Preview', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate((id) => {
        const stored = JSON.parse(
          localStorage.getItem('megamek-tab-manager')!,
        ).state;
        return stored.tabs.find(
          (tab: { id: string; lastSubTab?: string }) => tab.id === id,
        )?.lastSubTab;
      }, unitId),
    )
    .toBe('preview');
  await page.goto(`/customizer/${unitId}/structure`);
  const structure = page.getByRole('tab', { name: 'Structure', exact: true });
  await expect(structure).toHaveAttribute('aria-selected', 'true');
  await expect(
    page.getByRole('combobox', { name: 'Engine', exact: true }),
  ).toHaveValue(before.engineType);
  await page.reload();
  await expect(structure).toHaveAttribute('aria-selected', 'true');
  expect((await draft(page)).equipment).toEqual(before.equipment);
  await page.getByRole('tab', { name: 'Preview', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate((id) => {
        const stored = JSON.parse(
          localStorage.getItem('megamek-tab-manager')!,
        ).state;
        return stored.tabs.find(
          (tab: { id: string; lastSubTab?: string }) => tab.id === id,
        )?.lastSubTab;
      }, unitId),
    )
    .toBe('preview');
  await page.goto(`/customizer/${unitId}`);
  await expect(
    page.getByRole('tab', { name: 'Preview', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  expect(new URL(page.url()).pathname.split('/')[2]).toBe(unitId);
  expect((await draft(page)).engineType).toBe(before.engineType);
});
