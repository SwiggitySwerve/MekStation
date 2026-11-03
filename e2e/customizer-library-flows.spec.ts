import { expect, test, type Locator, type Page } from '@playwright/test';

import {
  installPrintHarness,
  printCaptures,
  expectPrintWindowClosesAfterPrint,
} from './helpers/recordSheetPrintHarness';

// Real catalog, SQLite save API and sheet renderer throughout. The print
// harness only records the real popup document instead of opening an OS dialog.
test.use({ serviceWorkers: 'block' });
test.setTimeout(120_000);
test.describe.configure({ retries: 0 });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    Reflect.deleteProperty(Navigator.prototype, 'serviceWorker'),
  );
  await installPrintHarness(page);
});

const cases = [
  {
    family: 'mech',
    chassis: 'Atlas',
    model: 'AS7-D',
    section: 'Armor',
    total: 304,
    sheet: 'textArmor_HD',
  },
  {
    family: 'combat vehicle',
    chassis: 'Manticore Heavy Tank',
    model: '',
    section: 'Armor',
    total: 176,
    sheet: 'textArmor_RR',
  },
  {
    family: 'support vehicle',
    chassis: 'Air Car',
    model: '',
    section: 'Armor',
    total: 32,
    sheet: 'textArmor_RR',
  },
  {
    family: 'fighter',
    chassis: 'Shilone',
    model: 'SL-17',
    section: 'Armor',
    total: 184,
    sheet: 'textArmor_NOS',
  },
  {
    family: 'small craft',
    chassis: 'Aquarius Escort',
    model: '',
    section: 'Armor',
    total: 608,
    sheet: 'textArmor_NOS',
  },
  {
    family: 'battle armor',
    chassis: 'Achileus Light Battle Armor',
    model: '(WoB)(Sqd4)',
    section: 'Squad',
    total: 6,
    sheet: 'circle.ba-armor',
  },
  {
    family: 'infantry',
    chassis: 'AA Jump Infantry',
    model: '292nd League Regulars',
    section: 'Platoon',
    total: 21,
    sheet: 'circle.platoon-trooper',
  },
  {
    family: 'ProtoMech',
    chassis: 'Centaur',
    model: '',
    section: 'Structure',
    total: 20,
    sheet: 'armorPipsHD',
  },
] as const;
type FlowCase = (typeof cases)[number];

/** Reach controls by browser Tab order; never programmatically focus them. */
async function tabTo(page: Page, target: Locator) {
  for (let i = 0; i < 160; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
}

async function activate(page: Page, target: Locator, keyboard: boolean) {
  if (!keyboard) return target.click();
  await tabTo(page, target);
  await page.keyboard.press('Enter');
}

async function fill(
  page: Page,
  target: Locator,
  value: string,
  keyboard: boolean,
) {
  if (!keyboard) return target.fill(value);
  await tabTo(page, target);
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText(value);
  await page.keyboard.press('Tab');
}

async function section(page: Page, name: string, keyboard = false) {
  const selector = page.getByRole('button', { name: /^Section:/ });
  const narrow = await selector.isVisible();
  if (narrow) await activate(page, selector, keyboard);
  const tabs = page.getByRole('tablist', { name: 'Unit configuration tabs' });
  const target = tabs.getByRole('tab', { name, exact: true });
  if (!keyboard) return target.click();
  // The section tablist uses roving tabindex.
  await tabTo(page, tabs.getByRole('tab', { selected: true }));
  for (
    let i = 0;
    i < 12 && !(await target.evaluate((el) => el === document.activeElement));
    i++
  )
    await page.keyboard.press(narrow ? 'ArrowDown' : 'ArrowRight');
  await expect(target).toBeFocused();
  await page.keyboard.press('Enter');
}

async function library(
  page: Page,
  chassis: string,
  model: string,
  saved = false,
  keyboard = false,
) {
  await activate(
    page,
    page.getByRole('button', {
      name: /^(Load from Library|Add Unit \(Ctrl\+O\))$/,
    }),
    keyboard,
  );
  const dialog = page.getByRole('dialog', { name: 'Add Unit', exact: true });
  await expect(dialog.getByText('Loading units...')).toBeHidden({
    timeout: 60_000,
  });
  const source = dialog.getByRole('combobox').first();
  if (keyboard) {
    await tabTo(page, source);
    await page.keyboard.press('Home');
    await page.keyboard.press(saved ? 'ArrowDown' : 'End');
    await page.keyboard.press('Tab');
  } else await source.selectOption(saved ? 'custom' : 'canonical');
  await expect(source).toHaveValue(saved ? 'custom' : 'canonical');
  await fill(
    page,
    dialog.getByPlaceholder('Search by chassis or variant...'),
    `${chassis} ${model}`.trim(),
    keyboard,
  );
  const row = dialog
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: chassis, exact: true }) })
    .filter({ has: page.getByRole('cell', { name: model, exact: true }) });
  await expect(row).toHaveCount(1);
  await activate(page, row, keyboard);
  await activate(
    page,
    dialog.getByRole('button', { name: 'Load Unit', exact: true }),
    keyboard,
  );
  await expect(dialog).toBeHidden();
}

function editInput(page: Page, unit: FlowCase) {
  if (unit.family.includes('vehicle'))
    return page
      .getByTestId('vehicle-armor-allocation-section')
      .locator('div:has(> span:text-is("Rear"))')
      .getByRole('spinbutton');
  if (unit.family === 'fighter' || unit.family === 'small craft')
    return page.getByTestId('aerospace-arc-input-Nose');
  if (unit.family === 'battle armor' || unit.family === 'infantry')
    return page
      .locator(
        `div:has(> label:text-is("${unit.family === 'infantry' ? 'Troopers / Squad' : 'Armor/Trooper'}"))`,
      )
      .getByRole('spinbutton');
  if (unit.family === 'ProtoMech')
    return page.getByRole('spinbutton', {
      name: 'Head armor value',
      exact: true,
    });
  return page.getByRole('spinbutton', {
    name: 'Head front armor',
    exact: true,
  });
}

function figure(page: Page, unit: FlowCase) {
  if (unit.family === 'mech') return page.getByTestId('unit-info-stat-armor');
  const label =
    unit.family === 'infantry'
      ? 'Troopers'
      : unit.family === 'battle armor'
        ? 'Armor/Trooper'
        : 'Armor';
  return page.locator(`div:has(> span:text-is("${label}"))`).first();
}

async function keyFigures(page: Page, unit: FlowCase) {
  const labels =
    unit.family === 'mech'
      ? ['weight', 'armor', 'movement', 'bv']
      : [
          unit.family === 'battle armor' || unit.family === 'infantry'
            ? 'Troopers'
            : 'Tonnage',
          unit.family === 'fighter' || unit.family === 'small craft'
            ? 'Thrust'
            : 'Movement',
          'BV',
        ];
  return Promise.all(
    labels.map(async (label) => {
      const stat =
        unit.family === 'mech'
          ? page.getByTestId(`unit-info-stat-${label}`)
          : page.locator(`div:has(> span:text-is("${label}"))`).first();
      await expect(stat).toContainText(/\d/);
      return stat.innerText();
    }),
  );
}

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
]) {
  test.describe(`library flows ${viewport.width}`, () => {
    test.use({ viewport });
    for (const unit of cases) {
      test(`${unit.family}: edit, save, reload, reopen and print @customizer`, async ({
        page,
        request,
      }, info) => {
        const keyboard = unit.family === 'battle armor';
        let savedId: string | undefined;
        try {
          await page.goto('/customizer');
          await library(page, unit.chassis, unit.model, false, keyboard);
          await expect(figure(page, unit)).toContainText(String(unit.total));
          await section(page, unit.section, keyboard);
          if (unit.family === 'mech')
            await page.getByRole('button', { name: /^Head armor:/ }).click();
          const input = editInput(page, unit);
          const original = Number(await input.inputValue());
          expect(original).toBeGreaterThan(0);
          const edited = original - 1;
          await fill(page, input, String(edited), keyboard);
          await expect(input).toHaveValue(String(edited));
          const total = unit.family === 'infantry' ? 18 : unit.total - 1;
          await expect(figure(page, unit)).toContainText(String(total));
          const figures = await figure(page, unit).innerText();
          const metrics = await keyFigures(page, unit);
          await activate(
            page,
            page.getByRole('button', { name: 'Save active unit to library' }),
            keyboard,
          );
          const save = page.getByRole('dialog', {
            name: 'Save Unit',
            exact: true,
          });
          const chassis = `Flow ${unit.chassis} ${Date.now()}-${info.workerIndex}`;
          const model = `Saved ${viewport.width}`;
          await fill(page, save.getByLabel('Chassis Name'), chassis, keyboard);
          await fill(
            page,
            save.getByLabel('Variant Designation'),
            model,
            keyboard,
          );
          const button = save.getByRole('button', {
            name: 'Save',
            exact: true,
          });
          await expect(button).toBeEnabled();
          const posted = page.waitForResponse(
            (r) =>
              r.url().endsWith('/api/units/custom') &&
              r.request().method() === 'POST',
          );
          await activate(page, button, keyboard);
          const response = await posted;
          expect(response.ok()).toBe(true);
          savedId = (await response.json()).data.id;
          expect(savedId).toBeTruthy();
          await expect(save).toBeHidden();
          await page.reload();
          await expect(figure(page, unit)).toHaveText(figures);
          await expect.poll(() => keyFigures(page, unit)).toEqual(metrics);
          // Close the draft so the library must fetch the saved server copy.
          await activate(
            page,
            page.getByRole('button', {
              name: `Close ${chassis} ${model}`,
              exact: true,
            }),
            keyboard,
          );
          const fetched = page.waitForResponse(
            (r) =>
              r.url().endsWith(`/api/units/custom/${savedId}`) &&
              r.request().method() === 'GET',
          );
          await library(page, chassis, model, true, keyboard);
          expect((await fetched).ok()).toBe(true);
          await section(page, unit.section, keyboard);
          if (unit.family === 'mech')
            await page.getByRole('button', { name: /^Head armor:/ }).click();
          await expect(editInput(page, unit)).toHaveValue(String(edited));
          await expect(figure(page, unit)).toHaveText(figures);
          await expect.poll(() => keyFigures(page, unit)).toEqual(metrics);
          await noOverflow(page);
          await page.screenshot({
            path: info.outputPath(`saved-${unit.family}-${viewport.width}.png`),
            animations: 'disabled',
          });
          await section(page, 'Preview', keyboard);
          const canvas = page.locator(
            'canvas[data-testid$="record-sheet-canvas"]',
          );
          await expect(canvas).toBeVisible();
          // A painted sheet must contain non-white ink, not merely a canvas node.
          await expect
            .poll(() =>
              canvas.evaluate((node) => {
                const c = node as HTMLCanvasElement;
                const pixels = c
                  .getContext('2d')
                  ?.getImageData(0, 0, c.width, c.height).data;
                return pixels
                  ? pixels.some(
                      (v, i) =>
                        i % 4 !== 3 && v < 128 && pixels[i - (i % 4) + 3] > 0,
                    )
                  : false;
              }),
            )
            .toBe(true);
          const popup = page.waitForEvent('popup');
          await activate(
            page,
            page.getByRole('button', { name: 'Print', exact: true }),
            keyboard,
          );
          await expect
            .poll(async () => (await printCaptures(page)).length)
            .toBe(1);
          const svg = await (
            await popup
          )
            .locator('body > svg')
            .evaluate((el) => el.outerHTML);
          const sheetFigure = await page.evaluate(
            ({ svg, selector, family }) => {
              const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
              if (family === 'battle armor' || family === 'infantry')
                return doc.querySelectorAll(selector).length;
              if (family === 'ProtoMech')
                return doc.getElementById(selector)?.querySelectorAll('circle')
                  .length;
              const text = doc.getElementById(selector)?.textContent?.trim();
              return family === 'mech' ? text : Number(text);
            },
            { svg, selector: unit.sheet, family: unit.family },
          );
          expect(sheetFigure).toBe(
            unit.family === 'battle armor'
              ? 24
              : unit.family === 'infantry'
                ? 18
                : unit.family === 'mech'
                  ? `( ${edited} )`
                  : edited,
          );
          expect(svg).toContain(chassis);
          await expectPrintWindowClosesAfterPrint(page);
          await noOverflow(page);
          await page.screenshot({
            path: info.outputPath(`print-${unit.family}-${viewport.width}.png`),
            animations: 'disabled',
          });
          // The removed reference is the real saved resource just deleted above.
          if (unit.family === 'infantry') {
            expect(
              (await request.delete(`/api/units/custom/${savedId}`)).ok(),
            ).toBe(true);
            await page.goto(`/units/${savedId}`);
            await expect(
              page.getByText('Unit not found', { exact: true }),
            ).toBeVisible();
            await page.screenshot({
              path: info.outputPath(`removed-${viewport.width}.png`),
              animations: 'disabled',
            });
          }
        } finally {
          if (savedId) await request.delete(`/api/units/custom/${savedId}`);
        }
      });
    }

    test('capital is read-only without save or printable sheet @customizer', async ({
      page,
    }, info) => {
      await page.goto('/customizer');
      await library(page, 'Crucible Station', '');
      const shell = page.getByTestId('capital-ship-customizer');
      await expect(shell.getByText('Read-Only', { exact: true })).toBeVisible();
      await expect(shell.locator('input, select, textarea')).toHaveCount(0);
      await expect(
        page.getByRole('button', { name: 'Save active unit to library' }),
      ).toHaveCount(0);
      // Current capital viewer exposes Overview/Structure only; no print route.
      await expect(shell.getByRole('tab', { includeHidden: true })).toHaveCount(
        2,
      );
      await expect(
        page.getByRole('tab', { name: 'Preview', exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole('button', { name: 'Print', exact: true }),
      ).toHaveCount(0);
      await noOverflow(page);
      await page.screenshot({
        path: info.outputPath(`capital-${viewport.width}.png`),
        animations: 'disabled',
      });
    });
  });
}

test('library shows its loading state while the real request is pending @customizer', async ({
  page,
}, info) => {
  // Delay transport only: neither replace the response nor fabricate unit data.
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/units/custom', async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.goto('/customizer');
    await page
      .getByRole('button', { name: 'Load from Library', exact: true })
      .click();
    await expect(
      page.getByText('Loading units...', { exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: info.outputPath('loading.png'),
      animations: 'disabled',
    });
  } finally {
    release();
  }
  await expect(page.getByText('Loading units...', { exact: true })).toBeHidden({
    timeout: 60_000,
  });
});
