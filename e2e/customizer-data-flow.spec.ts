import { test, expect, type Page } from '@playwright/test';

// Failure injection must reach the request boundary, bypassing service-worker caches.
test.use({ serviceWorkers: 'block' });
test.beforeEach(async ({ page }) => {
  // Match a browser without offline-worker support rather than a stub registration.
  await page.addInitScript(() =>
    Reflect.deleteProperty(Navigator.prototype, 'serviceWorker'),
  );
});

async function readDraft(page: Page) {
  return page.evaluate(() => {
    const id = location.pathname.split('/')[2];
    return JSON.parse(localStorage.getItem(`megamek-unit-${id}`)!).state as {
      id: string;
      name: string;
      chassis: string;
      model: string;
      mulId: string;
      sourceDefinition?: { source: string; id: string; version?: number };
      jumpJetType: string;
      enhancement: string | null;
      isOmni: boolean;
      configuration: string;
      tonnage: number;
      cockpitType: string;
      gyroType: string;
      armorAllocation: Record<string, number>;
      equipment: {
        instanceId: string;
        equipmentId: string;
        location?: string;
        slots?: number[];
        isRearMounted: boolean;
        isRemovable: boolean;
      }[];
      fluff?: Record<string, string>;
      role?: string;
    };
  });
}

async function loadAtlas(page: Page) {
  await page.goto('/customizer');
  await page.getByRole('button', { name: 'Load from Library' }).click();
  await page
    .getByPlaceholder('Search by chassis or variant...')
    .fill('Atlas AS7-D');
  await page.getByText('AS7-D', { exact: true }).click();
  await page.getByRole('button', { name: 'Load Unit', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
}

test('fixed Omni mounts cannot be unassigned through the inline inspector @customizer', async ({
  page,
}, testInfo) => {
  await loadAtlas(page);
  await page.getByRole('tab', { name: 'Overview', exact: true }).click();
  await page.getByRole('checkbox', { name: 'OmniMech', exact: true }).check();
  await expect.poll(async () => (await readDraft(page)).isOmni).toBe(true);
  const before = await readDraft(page);
  await page.getByRole('tab', { name: 'Critical Slots', exact: true }).click();
  await page
    .getByRole('gridcell', { name: /Medium Laser/ })
    .first()
    .click();
  const inspector = page.getByRole('region', {
    name: 'Equipment placement',
    exact: true,
  });
  await expect(
    inspector.getByRole('combobox', { name: 'Place selected equipment' }),
  ).toBeDisabled();
  await expect(
    inspector.getByRole('button', {
      name: 'Unassign selected equipment',
      exact: true,
    }),
  ).toBeDisabled();
  expect((await readDraft(page)).equipment).toEqual(before.equipment);
  await page.reload();
  expect((await readDraft(page)).equipment).toEqual(before.equipment);
  await page.screenshot({
    path: testInfo.outputPath('fixed-omni-inspector.png'),
  });
});

test('all tabs read the current unit and configuration @customizer', async ({
  page,
}, testInfo) => {
  await loadAtlas(page);
  await expect(page.getByTestId('unit-info-stat-bv')).not.toHaveText(
    /^BV\s*0$/,
  );
  await expect(page.getByTestId('unit-info-stat-heat')).not.toHaveText(
    // Generated heat follows the label and the optional 'gen / diss' caption.
    /(?:HEAT|diss)\s*0\s*\/\s*20(?!\d)/,
  );
  await page.getByRole('tab', { name: 'Overview', exact: true }).click();
  const initial = await readDraft(page);
  await expect(
    page.getByLabel('Equipment summary').locator('strong').first(),
  ).toHaveText(String(initial.equipment.length));
  await page.screenshot({
    path: testInfo.outputPath('overview-desktop.png'),
    fullPage: true,
  });
  await page.getByRole('tab', { name: 'Structure', exact: true }).click();
  await page
    .getByRole('spinbutton', { name: 'Tonnage', exact: true })
    .fill('105');
  await expect
    .poll(async () => (await readDraft(page)).cockpitType)
    .toBe('Superheavy');
  await page
    .getByRole('spinbutton', { name: 'Tonnage', exact: true })
    .fill('100');
  await expect
    .poll(async () => (await readDraft(page)).cockpitType)
    .toBe('Standard');
  await expect
    .poll(async () => (await readDraft(page)).gyroType)
    .toBe('Standard Gyro');
  const beforeConfiguration = await readDraft(page);
  await page
    .getByRole('combobox', { name: 'Motive type', exact: true })
    .selectOption('Quad');
  await expect
    .poll(async () => (await readDraft(page)).configuration)
    .toBe('Quad');
  const quad = await readDraft(page);
  expect(quad.armorAllocation['Center Torso']).toBe(
    beforeConfiguration.armorAllocation['Center Torso'],
  );
  expect(
    quad.equipment.every(
      (item) =>
        !['Left Arm', 'Right Arm', 'Left Leg', 'Right Leg'].includes(
          item.location ?? '',
        ),
    ),
  ).toBe(true);
  await expect(page.getByTestId('unit-info-stat-slots')).toContainText(
    /[/] *66/,
  );
  await page.getByRole('tab', { name: 'Critical Slots', exact: true }).click();
  await expect(
    page.getByRole('group', {
      name: 'Front Left Leg critical slots',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('group', { name: 'Left Arm critical slots', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('tab', { name: 'Armor', exact: true }).click();
  await expect(page.getByTestId('armor-diagram')).toBeVisible();
  await page.getByRole('tab', { name: 'Fluff', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Combat Role', exact: true })
    .selectOption('Brawler');
  await expect.poll(async () => (await readDraft(page)).role).toBe('Brawler');
  await page.getByRole('tab', { name: 'Preview', exact: true }).click();
  await expect(page.getByRole('tabpanel')).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const download = await downloadPromise;
  await download.saveAs(testInfo.outputPath('customizer-quad.pdf'));
  expect(await download.failure()).toBeNull();
  expect(download.suggestedFilename()).toMatch(/[.]pdf$/i);

  await page.setViewportSize({ width: 390, height: 844 });
  // Phones switch sections through the section selector, not the tab strip.
  const sections = [
    'Overview',
    'Structure',
    'Armor',
    'Equipment',
    'Critical Slots',
    'Fluff',
    'Preview',
  ];
  for (const tab of sections) {
    const selector = page.getByRole('button', { name: /^Section:/ });
    await selector.click();
    await page.getByRole('tab', { name: tab, exact: true }).click();
    // The selector closes after a choice and names the active section.
    await expect(selector).toHaveAccessibleName(
      `Section: ${tab}, ${sections.indexOf(tab) + 1} of 7`,
    );
    await expect(page.getByRole('tabpanel')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByRole('button', { name: /^Section:/ }).click();
  await page.getByRole('tab', { name: 'Structure', exact: true }).click();
  await page.screenshot({
    path: testInfo.outputPath('structure-mobile.png'),
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByRole('combobox', { name: 'Motive type', exact: true }),
  ).toHaveValue('Quad');
});

test('browser draft feedback reports actual write failure and recovery @customizer', async ({
  page,
}) => {
  await loadAtlas(page);
  await page.getByRole('tab', { name: 'Overview', exact: true }).click();
  const original = await readDraft(page);
  await page.evaluate(() => {
    const originalSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('megamek-unit-'))
        throw new DOMException(
          'Simulated full browser storage',
          'QuotaExceededError',
        );
      originalSet.call(this, key, value);
    };
  });
  await page.getByLabel('Chassis', { exact: true }).fill('Unsaved draft');
  await expect(
    page.getByText('Draft could not be saved in this browser', { exact: true }),
  ).toBeVisible();
  expect((await readDraft(page)).chassis).toBe(original.chassis);
  await page.reload();
  await expect(page.getByLabel('Chassis', { exact: true })).toHaveValue(
    original.chassis,
  );
  await page.getByLabel('Chassis', { exact: true }).fill('Saved draft');
  await expect(
    page.getByText('Draft saved in this browser', { exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => (await readDraft(page)).chassis)
    .toBe('Saved draft');
  await page.reload();
  await expect(page.getByLabel('Chassis', { exact: true })).toHaveValue(
    'Saved draft',
  );
});

test('library save failures preserve the draft and successful saves reload the same design @customizer', async ({
  page,
}, testInfo) => {
  await loadAtlas(page);
  await page.getByRole('tab', { name: 'Overview', exact: true }).click();
  await page
    .getByLabel('Clan name', { exact: true })
    .fill('Integration Clan Name');
  await page.getByLabel('MUL ID', { exact: true }).fill('12-34');
  await page.getByRole('tab', { name: 'Structure', exact: true }).click();
  await page
    .getByRole('spinbutton', { name: 'Walk MP', exact: true })
    .fill('2');
  await page
    .getByRole('combobox', { name: 'Jump type', exact: true })
    .selectOption('Improved');
  await page
    .getByRole('combobox', { name: 'Movement enhancement', exact: true })
    .selectOption('MASC');
  await page.getByRole('tab', { name: 'Fluff', exact: true }).click();
  const panel = page.getByRole('tabpanel');
  await panel
    .getByRole('combobox', { name: 'Combat Role', exact: true })
    .selectOption('Brawler');
  await panel
    .getByRole('textbox', { name: 'History', exact: true })
    .fill('Customizer integration history');
  const original = await readDraft(page);
  const variant = `CUSTOMIZER-${Date.now()}`;
  await page
    .getByRole('button', { name: 'Save active unit to library', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Save Unit', exact: true });
  await dialog.getByLabel('Variant Designation', { exact: true }).fill(variant);
  await page.route('**/api/units/custom', async (route) => {
    if (route.request().method() === 'POST')
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { message: 'Simulated library failure' },
        }),
      });
    else await route.continue();
  });
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(
    page.getByText('Failed to save unit: Simulated library failure', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(dialog).toBeVisible();
  expect((await readDraft(page)).model).toBe(original.model);
  const failedList = await page.request.get('/api/units/custom');
  expect(
    (await failedList.json()).units.some(
      (unit: { variant: string }) => unit.variant === variant,
    ),
  ).toBe(false);
  await page.unroute('**/api/units/custom');
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/units/custom') &&
      response.request().method() === 'POST',
  );
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  const response = await responsePromise;
  expect(response.ok()).toBe(true);
  const receipt = await response.json();
  const savedId = receipt.data.id as string;
  try {
    await expect(dialog).toBeHidden();
    const stored = await page.request.get(
      `/api/units/custom/${encodeURIComponent(savedId)}`,
    );
    expect(stored.ok()).toBe(true);
    const envelope = await stored.json();
    const saved = envelope.parsedData;
    expect(saved.clanName).toBe('Integration Clan Name');
    expect(saved.mulId).toBe('12-34');
    expect(saved.sourceDefinition).toEqual({
      source: 'canonical',
      id: 'atlas-as7-d',
    });
    expect(saved.movement.jumpJetType).toBe('IMPROVED');
    expect(saved.movement.enhancements).toEqual(['MASC']);
    expect(saved.role).toBe('Brawler');
    expect(saved.fluff.history).toBe('Customizer integration history');
    expect(saved.equipment).toHaveLength(original.equipment.length);
    await testInfo.attach('library-readback.json', {
      body: JSON.stringify(envelope, null, 2),
      contentType: 'application/json',
    });
    await expect.poll(async () => (await readDraft(page)).model).toBe(variant);
    await page.reload();
    await expect(
      page.getByRole('tab', { name: 'Fluff', exact: true }),
    ).toBeVisible();
    await expect(
      panel.getByRole('textbox', { name: 'History', exact: true }),
    ).toHaveValue('Customizer integration history');
    await page
      .getByRole('button', { name: 'Add unit (Ctrl+O)', exact: true })
      .click();
    await page
      .getByPlaceholder('Search by chassis or variant...')
      .fill(variant);
    await page.getByText(variant, { exact: true }).click();
    await page.getByRole('button', { name: 'Load Unit', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await expect
      .poll(async () => (await readDraft(page)).id)
      .not.toBe(original.id);
    const restored = await readDraft(page);
    expect(restored.equipment).toHaveLength(original.equipment.length);
    const placements = (equipment: typeof original.equipment) =>
      equipment.map(
        ({ equipmentId, location, slots, isRearMounted, isRemovable }) => ({
          equipmentId,
          location,
          slots,
          isRearMounted,
          isRemovable,
        }),
      );
    expect(placements(restored.equipment)).toEqual(
      placements(original.equipment),
    );
    expect(restored.fluff?.history).toBe('Customizer integration history');
    expect(restored.mulId).toBe('12-34');
    expect(restored.sourceDefinition).toEqual(original.sourceDefinition);
    expect(restored.sourceDefinition).toEqual({
      source: 'canonical',
      id: 'atlas-as7-d',
    });
    expect(restored.jumpJetType).toBe('Improved');
    expect(restored.enhancement).toBe('MASC');
    await page.getByRole('tab', { name: 'Fluff', exact: true }).click();
    await page.screenshot({
      path: testInfo.outputPath('fluff-desktop.png'),
      fullPage: true,
    });
  } finally {
    await page.request.delete(
      `/api/units/custom/${encodeURIComponent(savedId)}`,
    );
  }
});

test('failed catalog load stays recoverable and never substitutes a chassis @customizer', async ({
  page,
}) => {
  await page.goto('/customizer');
  await page.route(
    (url) => decodeURIComponent(url.pathname).endsWith('/Atlas AS7-D.json'),
    (route) => route.fulfill({ status: 503, body: 'Unavailable' }),
  );
  await page.getByRole('button', { name: 'Load from Library' }).click();
  await page
    .getByPlaceholder('Search by chassis or variant...')
    .fill('Atlas AS7-D');
  await page.getByText('AS7-D', { exact: true }).click();
  await page.getByRole('button', { name: 'Load Unit', exact: true }).click();
  await expect(
    page.getByText('Failed to load Atlas AS7-D. Please try again.', {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        Object.keys(localStorage).filter((key) =>
          key.startsWith('megamek-unit-'),
        ).length,
    ),
  ).toBe(0);
  await page.unrouteAll({ behavior: 'wait' });
  await page.getByRole('button', { name: 'Load Unit', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  expect((await readDraft(page)).name).toBe('Atlas AS7-D');
});
