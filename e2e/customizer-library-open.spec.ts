import { expect, test, type Page, type Locator } from '@playwright/test';

import {
  installPrintHarness,
  printCaptures,
  expectPrintWindowClosesAfterPrint,
} from './helpers/recordSheetPrintHarness';

/**
 * L-E2E: open one real catalog unit per family through the library dialog,
 * at a phone and a desktop width. Figures come from the committed catalog
 * files and the existing family BV owners.
 */
test.use({ serviceWorkers: 'block' });
test.setTimeout(120_000);
// A blocked registration resolves to undefined and trips the dev error overlay
// over the page; match a browser without offline-worker support instead.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    Reflect.deleteProperty(Navigator.prototype, 'serviceWorker'),
  );
});

const VIEWPORTS = [
  { name: 'narrow', width: 390, height: 844 },
  { name: 'wide', width: 1440, height: 900 },
] as const;

const COMMON_TABS = ['Overview', 'Structure', 'Armor', 'Equipment'];
const TAIL_TABS = ['Preview', 'Fluff'];

interface OpenCase {
  label: string;
  chassis: string;
  model: string;
  family: string;
  shell:
    | 'customizer-workbench'
    | 'vehicle-customizer'
    | 'aerospace-customizer'
    | 'protomech-customizer'
    | 'battlearmor-customizer'
    | 'infantry-customizer';
  bv?: string;
  tabs: string[];
  tonnage: string;
  armor: string;
  movement: string;
}

const OPEN_CASES: OpenCase[] = [
  {
    label: 'infantry',
    chassis: 'AA Jump Infantry',
    model: '292nd League Regulars',
    family: 'Infantry',
    shell: 'infantry-customizer',
    tabs: [
      'Overview',
      'Platoon',
      'Primary Weapon',
      'Secondary Weapons',
      'Specialization',
      'Preview',
      'Fluff',
    ],
    tonnage: '21',
    armor: '1',
    movement: '1/2J/0U',
    bv: '98',
  },
  {
    label: 'ProtoMech',
    chassis: 'Centaur',
    model: '',
    family: 'ProtoMechs',
    shell: 'protomech-customizer',
    tabs: [
      'Overview',
      'Structure',
      'Armor',
      'Main Gun',
      'Equipment',
      'Glider',
      'Preview',
      'Fluff',
    ],
    tonnage: '5.0 t',
    armor: '20',
    movement: '6/9',
    bv: '190',
  },
  {
    label: 'battle armor',
    chassis: 'Achileus Light Battle Armor',
    model: '(WoB)(Sqd4)',
    family: 'Battle Armor',
    shell: 'battlearmor-customizer',
    tabs: [
      'Overview',
      'Chassis',
      'Squad',
      'Manipulators',
      'Modular Weapons',
      'AP Weapons',
      'Jump/UMU',
      'Preview',
      'Fluff',
    ],
    tonnage: '4',
    armor: '6',
    movement: '1/3J/0U',
    bv: '133',
  },
  {
    label: 'BattleMech',
    chassis: 'Atlas',
    model: 'AS7-D',
    family: 'BattleMechs',
    shell: 'customizer-workbench',
    // The mech shell uses DEFAULT_CUSTOMIZER_TABS, which puts Fluff before Preview.
    tabs: [...COMMON_TABS, 'Critical Slots', 'Fluff', 'Preview'],
    tonnage: '100',
    armor: '304',
    movement: 'Movement: walk 3, run 5, jump 0 MP',
  },
  {
    label: 'combat vehicle',
    chassis: 'Manticore Heavy Tank',
    model: '',
    family: 'Vehicles',
    shell: 'vehicle-customizer',
    tabs: [...COMMON_TABS.slice(0, 3), 'Turret', 'Equipment', ...TAIL_TABS],
    tonnage: '60.0 t',
    armor: '176',
    movement: '4/6',
  },
  {
    label: 'support vehicle',
    chassis: 'Air Car',
    model: '',
    family: 'Vehicles',
    shell: 'vehicle-customizer',
    tabs: [...COMMON_TABS.slice(0, 3), 'Turret', 'Equipment', ...TAIL_TABS],
    tonnage: '40.0 t',
    armor: '32',
    movement: '11/17',
  },
  {
    label: 'fighter',
    chassis: 'Shilone',
    model: 'SL-17',
    family: 'Aerospace',
    shell: 'aerospace-customizer',
    tabs: [...COMMON_TABS, 'Velocity', 'Bombs', ...TAIL_TABS],
    tonnage: '65.0 t',
    armor: '184',
    movement: '6/9',
  },
  {
    label: 'small craft',
    chassis: 'Aquarius Escort',
    model: '',
    family: 'Aerospace',
    shell: 'aerospace-customizer',
    tabs: [...COMMON_TABS, 'Velocity', 'Bombs', ...TAIL_TABS],
    tonnage: '200.0 t',
    armor: '608',
    movement: '4/6',
  },
];

// Committed capital catalog, calculated by calculateBattleValueForUnit with
// contractUnitToBVUnit; also pinned in CapitalShipCustomizer.test.tsx.
const CAPITAL_CASES = [
  { chassis: 'Crucible Station', model: '', scope: 'complete', bv: '2,004' },
  {
    chassis: 'Aegis Heavy Cruiser',
    model: '(2372)',
    scope: 'defensive-only',
    bv: '12,920',
  },
] as const;

async function expectNoCapitalEdits(shell: ReturnType<Page['getByTestId']>) {
  for (const role of [
    'textbox',
    'searchbox',
    'combobox',
    'spinbutton',
    'checkbox',
    'radio',
    'slider',
    'switch',
  ] as const)
    await expect(shell.getByRole(role, { disabled: false })).toHaveCount(0);
  for (const button of await shell
    .getByRole('button', { disabled: false })
    .all())
    await expect(button).toHaveAccessibleName(
      /^(Section: (Overview|Structure), [12] of 2|Scroll tabs (left|right))$/,
    );
}

/** Opens the library, finds the one row for the unit and returns it. */
async function findRow(page: Page, unit: { chassis: string; model: string }) {
  await page.goto('/customizer');
  await page
    .getByRole('button', { name: 'Load from Library', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Add Unit', exact: true });
  await expect(dialog.getByText('Loading units...')).toBeHidden({
    timeout: 60_000,
  });
  await dialog
    .getByPlaceholder('Search by chassis or variant...')
    .fill(`${unit.chassis} ${unit.model}`.trim());
  const row = libraryRow(page, dialog, unit);
  await expect(row).toHaveCount(1);
  return { dialog, row };
}

/** Chassis/model are the first two cells at both responsive layouts. */
function libraryRow(
  page: Page,
  dialog: Locator,
  unit: { chassis: string; model: string },
) {
  const cell = (n: number, text: string) =>
    page.locator(`td:nth-child(${n})`, {
      hasText: new RegExp(
        `^\\s*${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`,
      ),
    });
  return dialog
    .getByRole('row')
    .filter({ has: cell(1, unit.chassis) })
    .filter({ has: cell(2, unit.model) });
}

function statusItem(shell: ReturnType<Page['getByTestId']>, label: string) {
  return shell.locator(`div:has(> span:text-is("${label}"))`).first();
}

for (const viewport of VIEWPORTS) {
  test.describe(`library open, ${viewport.name} layout`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const unit of OPEN_CASES) {
      test(`opens a ${unit.label} with its own shell and figures @customizer`, async ({
        page,
      }, testInfo) => {
        const { dialog, row } = await findRow(page, unit);
        await expect(row).toContainText(unit.family);
        await row.dblclick();
        await expect(dialog).toBeHidden();
        await expect(page).toHaveURL(/customizer\/[a-f0-9-]+\//);

        const shell = page.getByTestId(unit.shell);
        await expect(shell).toBeVisible();
        for (const other of [
          'customizer-workbench',
          'vehicle-customizer',
          'aerospace-customizer',
          'protomech-customizer',
          'battlearmor-customizer',
          'infantry-customizer',
        ].filter((id) => id !== unit.shell))
          await expect(page.getByTestId(other)).toHaveCount(0);

        const tabs = page.getByRole('tablist', {
          name: 'Unit configuration tabs',
          includeHidden: true,
        });
        await expect
          .poll(() =>
            tabs
              .locator('[role="tab"]')
              .evaluateAll((els) => els.map((el) => el.ariaLabel)),
          )
          .toEqual(unit.tabs);

        if (unit.shell === 'customizer-workbench') {
          await expect(page.getByTestId('unit-info-stat-weight')).toContainText(
            unit.tonnage,
          );
          await expect(page.getByTestId('unit-info-stat-armor')).toContainText(
            unit.armor,
          );
          await expect(
            page.getByTestId('unit-info-stat-movement'),
          ).toHaveAttribute('aria-label', unit.movement);
        } else {
          const movementLabel =
            unit.shell === 'aerospace-customizer' ? 'Thrust' : 'Movement';
          await expect(
            statusItem(
              shell,
              ['battlearmor-customizer', 'infantry-customizer'].includes(
                unit.shell,
              )
                ? 'Troopers'
                : 'Tonnage',
            ),
          ).toContainText(unit.tonnage);
          await expect(
            statusItem(
              shell,
              unit.shell === 'infantry-customizer'
                ? 'Protection'
                : unit.shell === 'battlearmor-customizer'
                  ? 'Armor/Trooper'
                  : 'Armor',
            ),
          ).toHaveText(
            new RegExp(
              `^(?:Armor(?:/Trooper)?|Protection)\\s*${unit.armor}(?!\\d)`,
            ),
          );
          await expect(statusItem(shell, movementLabel)).toHaveText(
            new RegExp(`^${movementLabel}\\s*${unit.movement}`),
          );
        }

        if (unit.bv)
          await expect(
            statusItem(shell, 'BV').locator('span').nth(1),
          ).toHaveText(unit.bv);

        await page.screenshot({
          path: testInfo.outputPath(
            `${unit.label.replace(/ /g, '-')}-${viewport.name}.png`,
          ),
          animations: 'disabled',
        });
      });
    }

    for (const unit of CAPITAL_CASES) {
      test(`opens a ${unit.scope} capital ship read-only @customizer`, async ({
        page,
      }, testInfo) => {
        const { dialog, row } = await findRow(page, unit);
        await expect(row).toContainText('Capital Ships');
        await row.dblclick();
        await expect(dialog).toBeHidden();
        await expect(page).toHaveURL(/customizer\/[a-f0-9-]+\//);
        const shell = page.getByTestId('capital-ship-customizer');
        await expect(shell).toBeVisible();
        for (const other of [
          'customizer-workbench',
          'vehicle-customizer',
          'aerospace-customizer',
        ])
          await expect(page.getByTestId(other)).toHaveCount(0);
        await expect(shell.getByText(/^Read-Only$/)).toBeVisible();
        const tabs = shell.getByRole('tab', { includeHidden: true });
        await expect(tabs).toHaveCount(2);
        const panel = shell.getByRole('tabpanel');
        const label =
          unit.scope === 'complete' ? 'Battle Value' : 'Defensive BV';
        const term = panel
          .getByRole('term')
          .filter({ hasText: new RegExp(`^${label}$`) });
        await expect(term).toHaveCount(1);
        await expect
          .poll(() => term.evaluate((el) => el.nextElementSibling?.textContent))
          .toBe(unit.bv);
        const note = panel.getByText(
          'Full battle value is not available yet. Only the defensive value is calculated for this ship.',
          { exact: true },
        );
        if (unit.scope === 'complete') {
          await expect(note).toHaveCount(0);
          await expect(
            panel.getByRole('term').filter({ hasText: /^Defensive BV$/ }),
          ).toHaveCount(0);
        } else {
          await expect(note).toBeVisible();
          await expect(
            panel
              .getByRole('term')
              .filter({ hasText: /^(Battle Value|Total|Offensive)$/ }),
          ).toHaveCount(0);
          // The section heading remains Battle Value; no total label in the status bar.
          await expect(
            shell.getByText('Battle Value', { exact: true }),
          ).toHaveCount(1);
        }
        for (const section of ['Overview', 'Structure'] as const) {
          if (section === 'Structure') {
            if (viewport.name === 'narrow')
              await shell
                .getByRole('button', { name: /^Section: Overview,/ })
                .click();
            await expect(tabs.nth(0)).toHaveAccessibleName('Overview');
            await expect(tabs.nth(1)).toHaveAccessibleName('Structure');
            await shell
              .getByRole('tab', { name: section, exact: true })
              .click();
            await expect(
              panel.getByRole('heading', { name: 'Hull', exact: true }),
            ).toBeVisible();
          }
          await expectNoCapitalEdits(shell);
          await page.screenshot({
            path: testInfo.outputPath(
              `capital-${unit.scope}-${section}-${viewport.name}.png`,
            ),
            animations: 'disabled',
          });
        }
      });
    }
  });
}

test.describe('library persistence and printing', () => {
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
      edit: 17,
      sheet: 'textArmor_NOS',
    },
    {
      family: 'small craft',
      chassis: 'Aquarius Escort',
      model: '',
      section: 'Armor',
      total: 608,
      edit: 55,
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
    await fill(
      page,
      dialog.getByPlaceholder('Search by chassis or variant...'),
      `${chassis} ${model}`.trim(),
      keyboard,
    );
    if (keyboard) {
      await tabTo(page, source);
      await page.keyboard.press('Home');
      await page.keyboard.press(saved ? 'ArrowDown' : 'End');
      await page.keyboard.press('Tab');
    } else await source.selectOption(saved ? 'custom' : 'canonical');
    await expect(source).toHaveValue(saved ? 'custom' : 'canonical');
    const row = libraryRow(page, dialog, { chassis, model });
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
        return (await stat.textContent())?.replace(/\s+/g, ' ').trim();
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

  const viewports = [
    { width: 390, height: 844 },
    { width: 1440, height: 900 },
  ];
  for (const viewport of viewports) {
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
            // Aerospace source armor exceeds the current editor cap. Exercise a
            // concrete legal edit; the cap discrepancy is recorded in HANDBACK.
            const edited = 'edit' in unit ? unit.edit : original - 1;
            await fill(page, input, String(edited), keyboard);
            await expect(input).toHaveValue(String(edited));
            const total =
              unit.family === 'infantry' ? 18 : unit.total - original + edited;
            await expect(figure(page, unit)).toContainText(String(total));
            const figures =
              (await figure(page, unit).textContent())
                ?.replace(/\s+/g, ' ')
                .trim() ?? '';
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
            await fill(
              page,
              save.getByLabel('Chassis Name'),
              chassis,
              keyboard,
            );
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
              path: info.outputPath(
                `saved-${unit.family}-${viewport.width}.png`,
              ),
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
                const doc = new DOMParser().parseFromString(
                  svg,
                  'image/svg+xml',
                );
                if (family === 'battle armor' || family === 'infantry')
                  return doc.querySelectorAll(selector).length;
                if (family === 'ProtoMech')
                  return doc
                    .getElementById(selector)
                    ?.querySelectorAll('circle').length;
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
              path: info.outputPath(
                `print-${unit.family}-${viewport.width}.png`,
              ),
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
        await expect(
          shell.getByText('Read-Only', { exact: true }),
        ).toBeVisible();
        await expect(shell.locator('input, select, textarea')).toHaveCount(0);
        await expect(
          page.getByRole('button', { name: 'Save active unit to library' }),
        ).toHaveCount(0);
        // Current capital viewer exposes Overview/Structure only; no print route.
        await expect(
          shell.getByRole('tab', { includeHidden: true }),
        ).toHaveCount(2);
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

  for (const viewport of viewports) {
    test.describe(`library loading ${viewport.width}`, () => {
      test.use({ viewport });
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
            path: info.outputPath(`loading-${viewport.width}.png`),
            animations: 'disabled',
          });
        } finally {
          release();
        }
        await expect(
          page.getByText('Loading units...', { exact: true }),
        ).toBeHidden({
          timeout: 60_000,
        });
      });
    });
  }
});
