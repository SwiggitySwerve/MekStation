import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';

import fixtures from './fixtures/unit-library-import.pinned.json';

test('retains unsupported-family, malformed-source and server diagnostics with recovery @customizer', async ({
  page,
  request,
}) => {
  test.setTimeout(180_000);
  await page.goto('/units');
  await page.getByRole('button', { name: 'Import Unit', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Import Unit', exact: true });
  // Handheld weapons are owner-excluded and remain unsupported as BLK families expand.
  await dialog.getByLabel('Unit file', { exact: true }).setInputFiles({
    name: 'unsupported.blk',
    mimeType: 'text/plain',
    buffer: Buffer.from('<UnitType>\nHandheldWeapon\n</UnitType>\n'),
  });
  await dialog.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('HandheldWeapon');
  await dialog.getByRole('button', { name: 'Choose another file' }).click();
  await dialog.getByLabel('Unit file', { exact: true }).setInputFiles({
    name: 'malformed.mtf',
    mimeType: 'text/plain',
    buffer: Buffer.from('not a unit'),
  });
  await dialog.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText(
    /pars|missing|invalid/i,
  );
  await dialog.getByRole('button', { name: 'Choose another file' }).click();
  await dialog.getByLabel('Unit file', { exact: true }).setInputFiles({
    name: 'recovery.mtf',
    mimeType: 'text/plain',
    buffer: Buffer.from(fixtures.rows[0].base64, 'base64'),
  });
  await page.route(
    '**/api/units/import',
    (route) =>
      route.fulfill({
        status: 500,
        json: { error: 'Server unavailable for recovery test' },
      }),
    { times: 1 },
  );
  await dialog.getByRole('button', { name: 'Import', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText(
    'Server unavailable for recovery test',
  );
  const response = page.waitForResponse(
    (res) => res.url().endsWith('/api/units/import') && res.status() === 201,
  );
  await dialog.getByRole('button', { name: 'Retry', exact: true }).click();
  const body = await (await response).json();
  try {
    await expect(dialog.getByRole('status')).toContainText('Imported');
  } finally {
    await request.delete(`/api/units/custom/${body.data.unitId}`);
  }
});

test('imports pinned MTF and vehicle BLK into the library and reopens after reload @customizer', async ({
  page,
  request,
}, testInfo) => {
  test.setTimeout(180_000);
  const ids: string[] = [];
  let importPosts = 0;
  page.on('request', (request) => {
    if (
      request.method() === 'POST' &&
      request.url().endsWith('/api/units/import')
    )
      importPosts += 1;
  });
  try {
    await page.goto('/units');
    for (const source of fixtures.rows) {
      const buffer = Buffer.from(source.base64, 'base64');
      expect(createHash('sha256').update(buffer).digest('hex')).toBe(
        source.sha256,
      );
      const trigger = page.getByRole('button', {
        name: 'Import Unit',
        exact: true,
      });
      await trigger.click();
      const dialog = page.getByRole('dialog', {
        name: 'Import Unit',
        exact: true,
      });
      const close = dialog.getByRole('button', { name: 'Close dialog' });
      await close.focus();
      await page.keyboard.press('Shift+Tab');
      await expect(
        dialog.getByRole('button', { name: 'Cancel', exact: true }),
      ).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(close).toBeFocused();
      await dialog.getByLabel('Unit file', { exact: true }).setInputFiles({
        name: source.path.split('/').pop()!,
        mimeType: 'text/plain',
        buffer,
      });
      const response = page.waitForResponse(
        (res) =>
          res.url().endsWith('/api/units/import') &&
          res.request().method() === 'POST',
      );
      await dialog
        .getByRole('button', { name: 'Import', exact: true })
        .dblclick();
      const imported = await response;
      expect(imported.status()).toBe(201);
      const body = await imported.json();
      ids.push(body.data.unitId);
      await expect(dialog.getByRole('status')).toContainText('Imported');
      await page.keyboard.press('Enter');
      expect(importPosts).toBe(ids.length);
      await dialog.screenshot({
        path: testInfo.outputPath(`imported-${ids.length}.png`),
      });
      await dialog.getByRole('button', { name: 'Done', exact: true }).click();
      await expect(trigger).toBeFocused();
      const detail = await request.get(`/api/units/custom/${body.data.unitId}`);
      const record = await detail.json();
      await expect(
        page.getByRole('row', { name: new RegExp(record.chassis) }),
      ).toContainText(record.variant);
    }
    await page.reload();
    await expect(
      page.getByRole('row', { name: /Locust.*LCT-1V/ }),
    ).toBeVisible();
    await expect(
      page.getByRole('row', { name: /Scorpion Light Tank/ }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Create Unit' }).first().click();
    await expect(page).toHaveURL(/\/customizer(?:\/|\?|$)/, {
      timeout: 60_000,
    });
    await page
      .getByRole('button', { name: 'Load from Library', exact: true })
      .click();
    const library = page.getByRole('dialog', { name: 'Add Unit', exact: true });
    await library.getByLabel('Unit source').selectOption('custom');
    await library
      .getByPlaceholder('Search by chassis or variant...')
      .fill('Locust');
    await library.getByRole('row', { name: /Locust.*LCT-1V/ }).click();
    await library
      .getByRole('button', { name: 'Load Unit', exact: true })
      .click();
    await expect(library).toBeHidden();
    await expect(
      page.getByRole('tab', { name: 'Locust LCT-1V', exact: true }),
    ).toHaveAttribute('aria-selected', 'true');
    const readImportedEditor = () =>
      page.evaluate(() => {
        const id = location.pathname.split('/')[2];
        const data = localStorage.getItem(`megamek-unit-${id}`);
        return data ? JSON.parse(data).state : null;
      });
    await expect.poll(readImportedEditor).toMatchObject({
      chassis: 'Locust',
      model: 'LCT-1V',
      tonnage: 20,
      librarySave: { id: ids[0] },
    });
    await page.reload();
    await expect(
      page.getByRole('tab', { name: 'Locust LCT-1V', exact: true }),
    ).toHaveAttribute('aria-selected', 'true');
    await expect.poll(readImportedEditor).toMatchObject({
      chassis: 'Locust',
      model: 'LCT-1V',
      tonnage: 20,
      librarySave: { id: ids[0] },
    });
    await page.screenshot({
      path: testInfo.outputPath('imported-customizer-reloaded.png'),
    });
  } finally {
    for (const id of ids) await request.delete(`/api/units/custom/${id}`);
  }
});
