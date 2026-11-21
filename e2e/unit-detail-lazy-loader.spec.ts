import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

test.use({ serviceWorkers: 'block' });
test.setTimeout(120_000);
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    Reflect.deleteProperty(Navigator.prototype, 'serviceWorker'),
  );
});

const sources = {
  mech: 'battlemechs/2-star-league/standard/Atlas AS7-D.json',
  capital: 'capital/Achilles (2582).json',
};

for (const family of ['mech', 'capital'] as const) {
  test(`cold saved ${family} details and library opening work @customizer`, async ({
    page,
    request,
  }, testInfo) => {
    const data = JSON.parse(
      readFileSync(path.join('public/data/units', sources[family]), 'utf8'),
    );
    const variant = `Lazy ${testInfo.testId}-${Date.now()}`;
    const created = await request.post('/api/units/custom', {
      data: {
        chassis: data.chassis,
        variant,
        data: {
          ...data,
          model: variant,
          ...(family === 'capital' ? { family: 'capital' } : {}),
        },
      },
    });
    expect(created.status()).toBe(201);
    const {
      data: { id },
    } = await created.json();
    try {
      await page.goto(`/units/${id}`);
      await expect(
        page.getByRole('heading', {
          name: `${data.chassis} ${variant}`,
          exact: true,
        }),
      ).toBeVisible({ timeout: 60_000 });
      if (family === 'mech') {
        const edit = page.getByRole('link', { name: 'Edit', exact: true });
        await expect(edit).toHaveAttribute('href', `/customizer?id=${id}`);
        await edit.click();
        await expect(page).toHaveURL(new RegExp(`/customizer\\?id=${id}$`));
        await page
          .getByRole('button', { name: 'Load from Library', exact: true })
          .click();
        const dialog = page.getByRole('dialog', {
          name: 'Add Unit',
          exact: true,
        });
        await expect(dialog.getByText('Loading units...')).toBeHidden({
          timeout: 60_000,
        });
        await dialog.getByRole('combobox').first().selectOption('custom');
        await dialog
          .getByPlaceholder('Search by chassis or variant...')
          .fill(variant);
        await dialog.getByRole('row').filter({ hasText: variant }).click();
        await dialog
          .getByRole('button', { name: 'Load Unit', exact: true })
          .click();
      } else {
        await page
          .getByRole('button', { name: 'Open read-only', exact: true })
          .click();
      }
      await expect(
        page.getByTestId(
          family === 'capital'
            ? 'capital-ship-customizer'
            : 'customizer-workbench',
        ),
      ).toBeVisible({ timeout: 60_000 });
      if (family === 'capital') {
        await expect(
          page.getByRole('tab', { name: 'Overview', exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole('button', { name: 'Edit', exact: true }),
        ).toHaveCount(0);
      }
    } finally {
      expect((await request.delete(`/api/units/custom/${id}`)).ok()).toBe(true);
    }
  });
}

for (const failure of [false, true]) {
  test(`capital loader chunk ${failure ? 'failure leaves a visible error and usable details' : 'wait shows Opening until the viewer arrives'} @customizer`, async ({
    page,
    request,
  }, testInfo) => {
    const data = JSON.parse(
      readFileSync(path.join('public/data/units', sources.capital), 'utf8'),
    );
    const variant = `Chunk ${testInfo.testId}-${Date.now()}`;
    const created = await request.post('/api/units/custom', {
      data: {
        chassis: data.chassis,
        variant,
        data: { ...data, model: variant, family: 'capital' },
      },
    });
    expect(created.status()).toBe(201);
    const {
      data: { id },
    } = await created.json();
    let armed = false;
    let intercepted = false;
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/_next/static/chunks/**', async (route) => {
      if (!armed || !route.request().url().endsWith('.js'))
        return route.continue();
      const response = await route.fetch();
      if (!(await response.text()).includes('async function loadUnitIntoTab('))
        return route.fulfill({ response });
      intercepted = true;
      await held;
      if (failure) await route.abort('failed');
      else await route.fulfill({ response });
    });
    try {
      await page.goto(`/units/${id}`);
      const heading = page.getByRole('heading', {
        name: `${data.chassis} ${variant}`,
        exact: true,
      });
      await expect(heading).toBeVisible({ timeout: 60_000 });
      await page.waitForLoadState('networkidle');
      armed = true;
      await page
        .getByRole('button', { name: 'Open read-only', exact: true })
        .click();
      await expect.poll(() => intercepted, { timeout: 20_000 }).toBe(true);
      const opening = page.getByRole('button', {
        name: 'Opening…',
        exact: true,
      });
      await expect(opening).toBeDisabled();
      await expect(opening).toHaveAttribute('aria-busy', 'true');
      await expect(heading).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath('opening.png') });
      release();
      if (failure) {
        await expect(
          page
            .getByRole('alert')
            .filter({ hasText: 'Could not open this unit from the library' }),
        ).toBeVisible();
        await expect(heading).toBeVisible();
        await expect(
          page.getByRole('button', { name: 'Open read-only', exact: true }),
        ).toBeEnabled();
        await expect(
          page.getByRole('link', { name: 'Back to Custom Units', exact: true }),
        ).toBeVisible();
        await expect(page).toHaveURL(new RegExp(`/units/${id}$`));
        await page.screenshot({ path: testInfo.outputPath('chunk-error.png') });
      } else {
        await expect(page.getByTestId('capital-ship-customizer')).toBeVisible({
          timeout: 60_000,
        });
      }
    } finally {
      release();
      await page.unrouteAll({ behavior: 'wait' });
      expect((await request.delete(`/api/units/custom/${id}`)).ok()).toBe(true);
    }
  });
}
