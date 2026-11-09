import { expect, test, type Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });
test.setTimeout(180_000);
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    Reflect.deleteProperty(Navigator.prototype, 'serviceWorker'),
  );
});

// Exact pinned Java probe: TestSmallCraft.maxArmorWeight/maxArmorPoints.
const craft = [
  {
    chassis: 'Ares Attack Craft',
    model: 'Mark IX',
    armor: 'AEROSPACE',
    maximum: 836,
    tons: 49.5,
  },
  {
    chassis: 'Dragonstar Assault Transport',
    model: '(3060)',
    armor: 'AEROSPACE',
    maximum: 368,
    tons: 21.5,
  },
  {
    chassis: 'Intrepid Assault Craft',
    model: '(2331)',
    armor: 'PRIMITIVE_AERO',
    maximum: 501,
    tons: 45,
  },
  {
    chassis: 'Foxhound Gunboat',
    model: 'TIG-40',
    armor: 'HEAVY_FERRO_ALUMINUM',
    maximum: 670,
    tons: 32,
  },
];

async function openLibrary(
  page: Page,
  chassis: string,
  model: string,
  saved = false,
) {
  await page
    .getByRole('button', { name: /^(Load from Library|Add Unit \(Ctrl\+O\))$/ })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Add Unit', exact: true });
  await dialog
    .getByRole('combobox')
    .first()
    .selectOption(saved ? 'custom' : 'canonical');
  await dialog
    .getByPlaceholder('Search by chassis or variant...')
    .fill(`${chassis} ${model}`.trim());
  const row = dialog
    .getByRole('row')
    .filter({ has: page.getByText(chassis, { exact: true }) })
    .filter({ hasText: model });
  await expect(row).toHaveCount(1);
  await row.click();
  await dialog.getByRole('button', { name: 'Load Unit', exact: true }).click();
  await expect(dialog).toBeHidden();
}

async function armorTab(page: Page) {
  await expect(page.getByTestId('aerospace-customizer')).toBeVisible({
    timeout: 60_000,
  });
  const section = page.getByRole('button', { name: /^Section:/ });
  if (await section.isVisible()) await section.click();
  await page.getByRole('tab', { name: 'Armor', exact: true }).click();
  await expect(page.getByTestId('aerospace-armor-tab')).toBeVisible();
}

for (const width of [390, 1440]) {
  test.describe(`small craft armor ${width}`, () => {
    test.use({ viewport: { width, height: 900 } });
    for (const unit of craft) {
      test(`${unit.chassis} ${unit.model} edits Side armor to the total limit and reopens @customizer`, async ({
        page,
        request,
      }, info) => {
        let savedId: string | undefined;
        try {
          await page.goto('/customizer');
          await openLibrary(page, unit.chassis, unit.model);
          await armorTab(page);
          const tab = page.getByTestId('aerospace-armor-tab');
          const left = tab.getByTestId('aerospace-arc-input-Left Wing');
          const right = tab.getByTestId(
            'aerospace-arc-diagram-input-Right Wing',
          );
          await expect(left).toBeEnabled();
          expect(await left.getAttribute('max')).toBeNull();
          expect(await right.getAttribute('max')).toBeNull();
          await tab.getByTestId('aerospace-armor-maximize').click();
          await expect(
            tab.getByTestId('aerospace-armor-tonnage-input'),
          ).toHaveValue(String(unit.tons));
          await expect(tab.getByTestId('aerospace-armor-available')).toHaveText(
            String(unit.maximum),
          );
          const allocated = Number(
            await tab.getByTestId('aerospace-armor-allocated').innerText(),
          );
          const originalLeft = Number(await left.inputValue());
          const edited = unit.maximum - allocated + originalLeft;
          expect(edited).toBeGreaterThan(40);
          await left.fill(String(edited));
          await expect(left).toHaveValue(String(edited));
          await expect(
            tab.getByTestId('aerospace-armor-unallocated'),
          ).toHaveText('0');
          const statusArmor = page
            .locator('div:has(> span:text-is("Armor"))')
            .first();
          await expect(statusArmor).toContainText(String(unit.maximum));
          await expect(statusArmor).not.toContainText(/-\d/);
          await page
            .getByRole('button', { name: 'Save active unit to library' })
            .click();
          const dialog = page.getByRole('dialog', {
            name: 'Save Unit',
            exact: true,
          });
          const chassis = `F2 ${unit.chassis} ${Date.now()}-${info.workerIndex}`;
          const model = `Side ${width}`;
          await dialog.getByLabel('Chassis Name').fill(chassis);
          await dialog.getByLabel('Variant Designation').fill(model);
          const posted = page.waitForResponse(
            (r) =>
              r.url().endsWith('/api/units/custom') &&
              r.request().method() === 'POST',
          );
          await dialog
            .getByRole('button', { name: 'Save', exact: true })
            .click();
          const response = await posted;
          expect(response.ok()).toBe(true);
          savedId = (await response.json()).data.id;
          expect(savedId).toBeTruthy();
          await expect(dialog).toBeHidden();
          await page.reload();
          await armorTab(page);
          await expect(left).toHaveValue(String(edited));
          await page
            .getByRole('button', {
              name: `Close ${chassis} ${model}`,
              exact: true,
            })
            .click();
          await openLibrary(page, chassis, model, true);
          await armorTab(page);
          await expect(left).toHaveValue(String(edited));
          await expect(tab.getByTestId('aerospace-armor-allocated')).toHaveText(
            String(unit.maximum),
          );
          const stored = await request.get(`/api/units/custom/${savedId}`);
          expect(stored.ok()).toBe(true);
          const saved = await stored.json();
          const details = saved.parsedData ? saved : saved.data;
          expect(details.parsedData.armor.type).toBe(unit.armor);
          expect(details.parsedData.armor.byArc.LEFT_SIDE).toBe(edited);
          await info.attach('saved-small-craft', {
            body: JSON.stringify(saved, null, 2),
            contentType: 'application/json',
          });
          await expect(
            page.getByText(`Unit "${chassis} ${model}" loaded`, {
              exact: true,
            }),
          ).toBeHidden({ timeout: 10_000 });
          await page.screenshot({
            path: info.outputPath(`side-armor-${width}.png`),
            animations: 'disabled',
          });
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          ).toBe(true);
        } finally {
          if (savedId) await request.delete(`/api/units/custom/${savedId}`);
        }
      });
    }
  });
}
