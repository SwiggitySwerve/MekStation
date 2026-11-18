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
  } else await page.getByRole('button', { name: 'Add Unit (Ctrl+O)' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add Unit', exact: true });
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
    .getByRole('spinbutton', { name: 'Armor Tonnage', exact: true })
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
    page.getByRole('button', {
      name: 'Save active unit to library',
      exact: true,
    }),
  ).toHaveAccessibleDescription(/Draft saved in browser/);
  await expect(
    page.getByRole('button', { name: 'Undo', exact: true }),
  ).toBeDisabled();
});

async function saveLibrary(
  page: Page,
  variant?: string,
  acknowledgeMissingCriticalSlots = false,
) {
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
  if (acknowledgeMissingCriticalSlots) {
    // The Mad Cat fixture has existing BV-neutral heat-sink placement losses.
    // Acknowledge only that named confirmation, after checking every entry.
    const confirmation = page.getByRole('dialog', {
      name: 'Save with missing critical-slot entries?',
      exact: true,
    });
    await expect(confirmation).toBeVisible();
    await expect(
      confirmation.getByRole('heading', {
        name: 'Other critical-slot entries (4)',
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      confirmation
        .getByRole('list', {
          name: 'Heat sinks critical-slot entries',
          exact: true,
        })
        .getByRole('listitem'),
    ).toHaveText([
      'CLDoubleHeatSink (OMNIPOD) — Right Torso [4]',
      'CLDoubleHeatSink (OMNIPOD) — Right Torso [5]',
      'CLDoubleHeatSink (OMNIPOD) — Center Torso [10]',
      'CLDoubleHeatSink (OMNIPOD) — Center Torso [11]',
    ]);
    await confirmation
      .getByRole('button', { name: 'Save anyway', exact: true })
      .click();
  }
  const result = await response;
  expect(result.ok()).toBe(true);
  const receipt = (await result.json()).data as { id: string; version: number };
  await expect(dialog).toBeHidden();
  return receipt;
}
async function openHistory(page: Page) {
  await page.getByRole('button', { name: 'Unit Actions', exact: true }).click();
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
  await page.getByLabel('Clan Name', { exact: true }).fill('Recovery One');
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
    await expect(page.getByText(/Library v1\b/).first()).toBeVisible();
    await page.getByLabel('Clan Name', { exact: true }).fill('Recovery Two');
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
    await expect(page.getByText(/Library v2\b/).first()).toBeVisible();
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
    await expect(page.getByText(/Changed Since v2\b/).first()).toBeVisible();
    // Unsaved library changes make Save the primary action; no bare dot.
    const saveButton = page.getByRole('button', {
      name: 'Save active unit to library',
      exact: true,
    });
    await expect(saveButton).toHaveAttribute('data-save-emphasis', 'primary');
    await expect(page.locator('[data-save-dot]')).toHaveCount(0);
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
    await expect(page.getByText(/Library v3\b/).first()).toBeVisible();
    await openHistory(page);
    const latestDialog = page.getByRole('dialog');
    await latestDialog.getByRole('button', { name: /^v3(?: |$)/ }).click();
    await expect(
      latestDialog.getByText('Version 3 Details', { exact: true }),
    ).toBeVisible();
    await latestDialog.getByRole('button', { name: /Restore.*v3/i }).click();
    await expect(latestDialog).toBeHidden();
    expect((await draft(page)).isModified).toBe(false);
    await expect(page.getByText(/In Library v3\b/).first()).toBeVisible();
    await expect(
      page.getByRole('button', {
        name: 'Save active unit to library',
        exact: true,
      }),
    ).toHaveAttribute('data-save-emphasis', 'quiet');
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
    await page.getByLabel('Clan Name', { exact: true }).fill('Browser Retry');
    const failedDraft = page
      .getByRole('status')
      .filter({ hasText: 'Browser Draft Not Saved' });
    await expect(failedDraft).toBeVisible();
    await page.evaluate(() => {
      (
        window as unknown as { restoreDraftStorage: () => void }
      ).restoreDraftStorage();
    });
    await failedDraft
      .getByRole('button', { name: 'Retry Browser Draft', exact: true })
      .click();
    await expect(failedDraft).toBeHidden();
    await expect(
      page.getByRole('button', {
        name: 'Save active unit to library',
        exact: true,
      }),
    ).toHaveAccessibleDescription(/Draft saved in browser/);
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

function armoredCells(criticalSlots: Record<string, (string | null)[]>) {
  return Object.entries(criticalSlots)
    .flatMap(([location, slots]) =>
      slots.flatMap((token, slot) =>
        token?.endsWith(' (ARMORED)')
          ? [
              {
                location: location.toUpperCase().replaceAll(' ', '_'),
                slot,
                token,
              },
            ]
          : [],
      ),
    )
    .sort((a, b) => a.location.localeCompare(b.location) || a.slot - b.slot);
}

test('armored Mad Cat Mk IV survives a real save and cold library reopen with its BV @customizer', async ({
  page,
}, testInfo) => {
  await load(page, 'Mad Cat Mk IV', '(Prime)', true);
  // Pinned MegaMek 48fcb2f64, matched by the b9b922d07 census. This unit's
  // save/reopen closure belongs to A2 alone: its armored gyro must survive.
  const bv = page.getByTestId('unit-info-stat-bv');
  await expect(bv).toHaveText(/^BV\s*2,?681$/);
  const initial = await draft(page);
  const nativeArmor = armoredCells(initial.bvContext.source.criticalSlots);
  expect(nativeArmor).toHaveLength(4);
  const variant = `A2-ARMOR-${Date.now()}`;
  const receipt = await saveLibrary(page, variant, true);
  try {
    const url = `/api/units/custom/${encodeURIComponent(receipt.id)}`;
    const savedResponse = await page.request.get(url);
    expect(savedResponse.ok()).toBe(true);
    const saved = (await savedResponse.json()).parsedData;
    expect(armoredCells(saved.criticalSlots)).toEqual(nativeArmor);
    await page
      .getByRole('button', {
        name: `Close Mad Cat Mk IV ${variant}`,
        exact: true,
      })
      .click();
    const fetched = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === url &&
        response.request().method() === 'GET',
    );
    await load(page, 'Mad Cat Mk IV', variant, true);
    expect((await fetched).ok()).toBe(true);
    await expect(bv).toHaveText(/^BV\s*2,?681$/);
    expect(
      armoredCells((await draft(page)).bvContext.source.criticalSlots),
    ).toEqual(nativeArmor);
    await page.reload();
    await expect(bv).toHaveText(/^BV\s*2,?681$/);
    expect(
      armoredCells((await draft(page)).bvContext.source.criticalSlots),
    ).toEqual(nativeArmor);
    await testInfo.attach('a2-armored-library-roundtrip.json', {
      body: JSON.stringify(
        {
          receipt,
          nativeArmor,
          savedArmor: armoredCells(saved.criticalSlots),
          bv: 2681,
        },
        null,
        2,
      ),
      contentType: 'application/json',
    });
  } finally {
    expect(
      (await page.request.delete(`/api/units/custom/${receipt.id}`)).ok(),
    ).toBe(true);
  }
});

test('an unchanged draft with an older-writer receipt explains saving again @customizer', async ({
  page,
}) => {
  await load(page, 'Mad Cat Mk IV', '(Prime)', true);
  const receipt = await saveLibrary(page, `A2-OLDER-${Date.now()}`, true);
  try {
    await expect(page.getByTestId('unit-save-label')).toHaveAttribute(
      'data-state',
      'matched',
    );
    const seeded = await page.evaluate(() => {
      const id = location.pathname.split('/')[2];
      type SavedReceipt = {
        fingerprint: string;
        draftFingerprint?: string;
      };
      const exposed = window as unknown as {
        __UNIT_REGISTRY__?: {
          getUnitStore: (unitId: string) =>
            | {
                getState: () => { librarySave?: SavedReceipt };
                setState: (patch: { librarySave: SavedReceipt }) => void;
              }
            | undefined;
        };
      };
      const store = exposed.__UNIT_REGISTRY__?.getUnitStore(id);
      const saved = store?.getState().librarySave;
      if (!store || !saved?.draftFingerprint)
        throw new Error('Expected a confirmed draft fingerprint');
      const originalDraftFingerprint = saved.draftFingerprint;
      const previous = JSON.parse(saved.fingerprint) as {
        criticalSlots: Record<string, (string | null)[]>;
      };
      // Seed the previous writer's documented omission, leaving the draft and
      // its fingerprint untouched. No product modules are imported into E2E.
      let removed = 0;
      for (const [location, slots] of Object.entries(previous.criticalSlots)) {
        slots.forEach((token, slot) => {
          if (token === 'Fusion Engine' || token === 'Gyro (ARMORED)') {
            slots[slot] = null;
            removed++;
          }
        });
        if (slots.every((token) => token === null))
          delete previous.criticalSlots[location];
      }
      const previousFingerprint = JSON.stringify(previous);
      const changed = previousFingerprint !== saved.fingerprint;
      store.setState({
        librarySave: { ...saved, fingerprint: previousFingerprint },
      });
      return {
        removed,
        changed,
        draftUnchanged:
          store.getState().librarySave?.draftFingerprint ===
          originalDraftFingerprint,
      };
    });
    expect(seeded.removed).toBeGreaterThan(0);
    expect(seeded.changed).toBe(true);
    expect(seeded.draftUnchanged).toBe(true);
    await page.reload();
    const message =
      'Saved with an older version of MekStation. Save again to update the library copy.';
    await expect(page.getByTestId('unit-save-label')).toHaveAttribute(
      'data-state',
      'saved-older-writer',
    );
    await expect(
      page.getByText(message, { exact: true }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole('button', {
        name: 'Save active unit to library',
        exact: true,
      }),
    ).toHaveAccessibleDescription(
      new RegExp(
        'Saved with an older version of MekStation\\. Save again to update the library copy\\.',
      ),
    );
    await expect(page.getByTestId('unit-save-label')).not.toContainText(
      'Changed Since',
    );
    const updated = await saveLibrary(page, undefined, true);
    expect(updated.id).toBe(receipt.id);
    expect(updated.version).toBe(2);
    await expect(page.getByTestId('unit-save-label')).toHaveAttribute(
      'data-state',
      'matched',
    );
    await expect(page.getByTestId('unit-save-label')).toContainText(
      'In Library v2',
    );
  } finally {
    expect(
      (await page.request.delete(`/api/units/custom/${receipt.id}`)).ok(),
    ).toBe(true);
  }
});
