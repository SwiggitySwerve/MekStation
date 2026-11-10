import { expect, test, type Page } from '@playwright/test';

test.use({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
test.setTimeout(180_000);

async function openUnit(
  page: Page,
  chassis: string,
  model: string,
): Promise<void> {
  await page
    .getByRole('button', { name: /^(Load from Library|Add Unit \(Ctrl\+O\))$/ })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Add Unit', exact: true });
  await expect(dialog.getByText('Loading units...')).toBeHidden({
    timeout: 60_000,
  });
  await dialog.getByRole('combobox').first().selectOption('canonical');
  await dialog
    .getByPlaceholder('Search by chassis or variant...')
    .fill(`${chassis} ${model}`.trim());
  const row = dialog
    .getByRole('row')
    .filter({
      has: page.locator('td:nth-child(1)', {
        hasText: new RegExp(`^\\s*${chassis}\\s*$`),
      }),
    })
    .filter({
      has: page.locator('td:nth-child(2)', {
        hasText: new RegExp(`^\\s*${model}\\s*$`),
      }),
    });
  await expect(row).toHaveCount(1);
  await row.click();
  await dialog.getByRole('button', { name: 'Load Unit', exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('tab', { name: 'Equipment', exact: true }).click();
}

test('family eligibility and ProtoMech ammo survive real catalog switches @customizer', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() =>
    Reflect.deleteProperty(Navigator.prototype, 'serviceWorker'),
  );
  await page.goto('/customizer');
  await openUnit(page, 'Basilisk', '');
  const search = page.getByLabel('Search equipment');
  await search.fill('LRM 3 Ammo');
  const mountedAmmo = page
    .getByTestId('protomech-equipment-mounted')
    .getByRole('button', { name: 'Remove LRM 3 Ammo', exact: true });
  const before = await mountedAmmo.count();
  await page
    .getByRole('button', { name: 'Add LRM 3 Ammo', exact: true })
    .first()
    .click();
  await expect(mountedAmmo).toHaveCount(before + 1);
  await page.screenshot({
    path: testInfo.outputPath('protomech-ammo-reachable.png'),
    fullPage: true,
    animations: 'disabled',
  });
  await search.fill('Bombast Laser');
  await expect(
    page.getByRole('button', { name: 'Add Bombast Laser', exact: true }),
  ).toHaveCount(0);

  await openUnit(page, 'Atlas', 'AS7-D');
  await page.getByRole('button', { name: /^Visibility filters/ }).click();
  const unavailable = page.getByRole('button', {
    name: 'Unavailable',
    exact: true,
  });
  if ((await unavailable.getAttribute('aria-pressed')) === 'true')
    await unavailable.click();
  await page.keyboard.press('Escape');
  await search.fill('LRM 11');
  await expect(
    page.getByRole('button', { name: 'Add LRM 11', exact: true }),
  ).toHaveCount(0);
  await search.fill('Bombast Laser');
  await expect(
    page
      .getByRole('button', { name: 'Add Bombast Laser', exact: true })
      .first(),
  ).toBeVisible();

  await openUnit(page, 'Centaur', '');
  await search.fill('LRM 11');
  await expect(
    page.getByRole('button', { name: 'Add LRM 11', exact: true }),
  ).toBeVisible();
  await search.fill('Bombast Laser');
  await expect(
    page.getByRole('button', { name: 'Add Bombast Laser', exact: true }),
  ).toHaveCount(0);
});
