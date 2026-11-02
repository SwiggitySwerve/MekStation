import { expect, test, type Page } from '@playwright/test';

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
