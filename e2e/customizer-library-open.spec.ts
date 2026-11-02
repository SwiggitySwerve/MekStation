import { expect, test, type Page } from '@playwright/test';

/**
 * L-E2E: open one real catalog unit per family through the library dialog,
 * at a phone and a desktop width. Figures come from the committed catalog
 * files; battle armor and infantry have no committed index, so their index
 * and definition are served from a route.
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
  shell: 'customizer-workbench' | 'vehicle-customizer' | 'aerospace-customizer';
  tabs: string[];
  tonnage: string;
  armor: string;
  movement: string;
}

const OPEN_CASES: OpenCase[] = [
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

const SYNTHETIC_ROWS = {
  battlearmor: {
    id: 'elemental-standard',
    chassis: 'Elemental',
    model: 'Standard',
    unitType: 'Battle Armor',
    tonnage: 1,
    techBase: 'CLAN',
    path: 'elemental.json',
  },
  infantry: {
    id: 'foot-rifle-platoon',
    chassis: 'Foot Rifle Platoon',
    model: '',
    unitType: 'Infantry',
    tonnage: 3,
    techBase: 'INNER_SPHERE',
    path: 'foot.json',
  },
} as const;

const NO_VIEW_COPY = {
  capital:
    'Capital ships cannot be opened yet because the editor has no capital ship view.',
  battlearmor:
    'Battle armor cannot be opened yet because the editor cannot load battle armor from the library.',
  infantry:
    'Infantry cannot be opened yet because the editor cannot load infantry from the library.',
};

const UNSUPPORTED_CASES = [
  {
    label: 'capital ships',
    chassis: 'Achilles',
    model: '(2582)',
    family: 'Capital Ships',
    copy: NO_VIEW_COPY.capital,
  },
  {
    label: 'battle armor',
    chassis: 'Elemental',
    model: 'Standard',
    family: 'Battle Armor',
    copy: NO_VIEW_COPY.battlearmor,
    synthetic: 'battlearmor',
  },
  {
    label: 'infantry',
    chassis: 'Foot Rifle Platoon',
    model: '',
    family: 'Infantry',
    copy: NO_VIEW_COPY.infantry,
    synthetic: 'infantry',
  },
] as const;

async function serveSyntheticFamily(
  page: Page,
  family: keyof typeof SYNTHETIC_ROWS,
) {
  const row = SYNTHETIC_ROWS[family];
  await page.route(`**/data/units/${family}/index.json`, (route) =>
    route.fulfill({
      json: { version: 'e2e-fixture', units: [row] },
    }),
  );
  await page.route(`**/data/units/${family}/${row.path}`, (route) =>
    route.fulfill({ json: row }),
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
  // Chassis and Model are the first two cells of a row at every width.
  const cell = (n: number, text: string) =>
    page.locator(`td:nth-child(${n})`, {
      hasText: new RegExp(
        `^\\s*${text.replace(/[()]/g, (c) => `\\${c}`)}\\s*$`,
      ),
    });
  const row = dialog
    .getByRole('row')
    .filter({ has: cell(1, unit.chassis) })
    .filter({ has: cell(2, unit.model) });
  await expect(row).toHaveCount(1);
  return { dialog, row };
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
            unit.shell === 'vehicle-customizer' ? 'Movement' : 'Thrust';
          await expect(statusItem(shell, 'Tonnage')).toHaveText(
            new RegExp(`^Tonnage\\s*${unit.tonnage}`),
          );
          await expect(statusItem(shell, 'Armor')).toHaveText(
            new RegExp(`^Armor\\s*${unit.armor}(?!\\d)`),
          );
          await expect(statusItem(shell, movementLabel)).toHaveText(
            new RegExp(`^${movementLabel}\\s*${unit.movement}`),
          );
        }

        await page.screenshot({
          path: testInfo.outputPath(
            `${unit.label.replace(/ /g, '-')}-${viewport.name}.png`,
          ),
          animations: 'disabled',
        });
      });
    }

    for (const unit of UNSUPPORTED_CASES) {
      test(`explains why ${unit.label} cannot open @customizer`, async ({
        page,
      }, testInfo) => {
        if ('synthetic' in unit)
          await serveSyntheticFamily(page, unit.synthetic);
        const { dialog, row } = await findRow(page, unit);
        await expect(row).toContainText(unit.family);
        await row.dblclick();
        await expect(page.getByTestId('toast-container')).toContainText(
          unit.copy,
        );
        await expect(dialog).toBeVisible();
        await expect(page).toHaveURL(/\/customizer\/?$/);
        await page.screenshot({
          path: testInfo.outputPath(
            `${unit.label.replace(/ /g, '-')}-${viewport.name}.png`,
          ),
          animations: 'disabled',
        });
      });
    }
  });
}
