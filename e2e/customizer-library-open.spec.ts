import { expect, test, type Page, type Locator } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { activate, fill, tabTo } from './helpers/keyboardNavigation';
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
  panel?: 'six-side' | 'dual-turret' | 'fixed-wing-support' | 'omni';
  tabs: string[];
  tonnage: string;
  armor: string;
  movement: string;
}

const OPEN_CASES: OpenCase[] = [
  {
    label: 'large support tank',
    chassis: 'Brunel Dump Truck',
    model: '',
    family: 'Vehicles',
    shell: 'vehicle-customizer',
    tabs: [...COMMON_TABS.slice(0, 3), 'Turret', 'Equipment', ...TAIL_TABS],
    tonnage: '150.0 t',
    armor: '83',
    movement: '3/5',
    panel: 'six-side',
  },
  {
    label: 'Omni vehicle',
    chassis: 'Gulltoppr OmniMonitor',
    model: '(Prime)',
    family: 'Vehicles',
    shell: 'vehicle-customizer',
    tabs: [...COMMON_TABS.slice(0, 3), 'Turret', 'Equipment', ...TAIL_TABS],
    tonnage: '190.0 t',
    armor: '704',
    movement: '2/3',
    panel: 'omni',
  },
  {
    label: 'fixed-wing support',
    chassis: 'Boomerang Spotter Plane',
    model: '',
    family: 'Aerospace',
    shell: 'aerospace-customizer',
    tabs: [...COMMON_TABS, 'Velocity', ...TAIL_TABS],
    tonnage: '5.0 t',
    armor: '0',
    movement: '4/6',
    panel: 'fixed-wing-support',
  },
  {
    label: 'SuperHeavy vehicle',
    chassis: 'Burke II Superheavy Tank',
    model: '',
    family: 'Vehicles',
    shell: 'vehicle-customizer',
    tabs: [...COMMON_TABS.slice(0, 3), 'Turret', 'Equipment', ...TAIL_TABS],
    tonnage: '140.0 t',
    armor: '107',
    movement: '2/3',
    panel: 'six-side',
  },
  {
    label: 'dual-turret vehicle',
    chassis: 'Arrow IV Assault Vehicle',
    model: '',
    family: 'Vehicles',
    shell: 'vehicle-customizer',
    tabs: [...COMMON_TABS.slice(0, 3), 'Turret', 'Equipment', ...TAIL_TABS],
    tonnage: '80.0 t',
    armor: '267',
    movement: '3/5',
    panel: 'dual-turret',
  },

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
    // UL-16b oracle (MegaMek 48fcb2f64): (16 + 2 sensors/ECM) * 1.6 * 5.2.
    bv: '150',
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
    chassis: 'Gaajian System Patrol Boat',
    model: '(2485)',
    scope: 'complete',
    bv: '3,426',
  },
  {
    chassis: 'Gaajian System Patrol Boat',
    model: '(2485)',
    scope: 'defensive-only',
    bv: '1,864',
    unsupportedHull: true,
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
      /^(Section: (Overview|Structure|Preview), [123] of 3|Scroll tabs (left|right))$/,
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

    test('edits Ajax armor above the former location limit @customizer', async ({
      page,
    }, testInfo) => {
      const { dialog, row } = await findRow(page, {
        chassis: 'Ajax Assault Tank',
        model: 'Prime',
      });
      await row.dblclick();
      await expect(dialog).toBeHidden();
      const shell = page.getByTestId('vehicle-customizer');
      await expect(shell).toBeVisible();
      await section(page, 'Armor');
      const front = shell.getByRole('spinbutton', {
        name: 'Front armor allocation',
        exact: true,
      });
      const diagramFront = shell
        .getByTestId('vehicle-armor-allocation-section')
        .getByTestId('vehicle-armor-input-Front');
      await expect(shell.getByTestId('vehicle-armor-summary')).toContainText(
        '355',
      );
      await expect(front).toHaveValue('76');
      await expect(diagramFront).toHaveValue('76');
      await expect(front).not.toHaveAttribute('max');
      await expect(diagramFront).not.toHaveAttribute('max');
      await fill(page, front, '80', viewport.name === 'narrow', '76');
      await expect(front).toHaveValue('80');
      await expect(diagramFront).toHaveValue('80');
      await fill(page, diagramFront, '82', viewport.name === 'narrow', '80');
      await expect(front).toHaveValue('82');
      await expect(diagramFront).toHaveValue('82');
      await expect(statusItem(shell, 'Armor')).toContainText('310');
      await expect(statusItem(shell, 'Armor')).toContainText('-6 unalloc');
      await page.reload();
      await expect(shell).toBeVisible();
      await section(page, 'Armor');
      await expect(front).toHaveValue('82');
      await expect(diagramFront).toHaveValue('82');
      await page.screenshot({
        path: testInfo.outputPath(`ajax-armor-${viewport.name}.png`),
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('waits for cold equipment before opening an Omni vehicle @customizer', async ({
      page,
    }, info) => {
      let release!: () => void;
      let blocked = false;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const pattern = '**/data/equipment/official/weapons/ballistic-other.json';
      await page.route(pattern, async (route) => {
        blocked = true;
        await gate;
        await route.continue();
      });
      try {
        const unit = OPEN_CASES.find((candidate) => candidate.panel === 'omni');
        if (!unit) throw Error('Missing Omni catalog fixture');
        const { dialog, row } = await findRow(page, unit);
        await page.addStyleTag({ content: 'nextjs-portal { display: none; }' });
        await expect.poll(() => blocked).toBe(true);
        const definition = page.waitForResponse((response) =>
          /gulltoppr/i.test(response.url()),
        );
        await row.dblclick();
        await (await definition).finished();
        await page.evaluate(
          () =>
            new Promise<void>((resolve) =>
              requestAnimationFrame(() => resolve()),
            ),
        );
        await expect(
          dialog.getByRole('button', { name: /Loading Unit/ }),
        ).toBeVisible();
        release();
        await expect(dialog).toBeHidden();
        await section(page, 'Turret');
        const panel = page.getByRole('region', {
          name: 'Primary Turret Figures',
        });
        await expect(
          panel
            .getByText('Required Mechanism Mass', { exact: true })
            .locator('..')
            .getByRole('definition'),
        ).toHaveText('2.5 t');
        await panel.screenshot({
          path: info.outputPath(`cold-equipment-${viewport.name}.png`),
          animations: 'disabled',
        });
      } finally {
        release();
        await page.unroute(pattern);
      }
    });

    for (const unit of OPEN_CASES) {
      test(`opens a ${unit.label} with its own shell and figures @customizer`, async ({
        page,
      }, testInfo) => {
        const { dialog, row } = await findRow(page, unit);
        await page.addStyleTag({ content: 'nextjs-portal { display: none; }' });
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

        if (unit.panel === 'omni') {
          await section(page, 'Turret');
          for (const [name, allowance, required, remaining] of [
            ['Primary Turret', '2.5 t', '2.5 t', '0.0 t'],
            ['Secondary Turret', '3 t', '3.0 t', '0.0 t'],
          ]) {
            const panel = page.getByRole('region', { name: name + ' Figures' });
            for (const [label, expected] of [
              ['Omni Allowance', allowance],
              ['Required Mechanism Mass', required],
              ['Remaining Allowance', remaining],
            ])
              await expect(
                panel
                  .getByText(label, { exact: true })
                  .locator('..')
                  .getByRole('definition'),
              ).toHaveText(expected);
            await panel.screenshot({
              path: testInfo.outputPath(
                `${name.replaceAll(' ', '-')}-${viewport.name}.png`,
              ),
              animations: 'disabled',
            });
          }
        } else if (unit.panel === 'fixed-wing-support') {
          await section(page, 'Structure');
          const fields = page.getByTestId('fixed-wing-support-fields');
          await expect(
            fields.getByRole('combobox', { name: 'BAR', exact: true }),
          ).toHaveValue('2');
          await expect(
            fields.getByRole('combobox', { name: 'Structural Tech Rating' }),
          ).toHaveValue('');
          await expect(
            fields.getByRole('combobox', { name: 'Engine Tech Rating' }),
          ).toHaveValue('');
          await expect(
            fields.getByRole('spinbutton', {
              name: 'Fixed-Wing Support Tonnage',
            }),
          ).toHaveValue('4.999');
          await expect(fields.getByLabel('Available Item Slots')).toHaveText(
            '5',
          );
          await expect(fields.getByLabel('Fire-Control Type')).toHaveText(
            'None',
          );
          for (const height of await fields
            .locator('input,select')
            .evaluateAll((nodes) =>
              nodes.map((node) => node.getBoundingClientRect().height),
            ))
            expect(height).toBeGreaterThanOrEqual(44);
          for (const [index, name] of [
            'tonnage',
            'bar',
            'structure-tech',
            'engine-tech',
          ].entries())
            await fields
              .locator('label')
              .nth(index)
              .screenshot({
                path: testInfo.outputPath(`fws-${name}-${viewport.name}.png`),
                animations: 'disabled',
              });
          await fields.locator('dl').screenshot({
            path: testInfo.outputPath(`fws-facts-${viewport.name}.png`),
            animations: 'disabled',
          });
        } else if (unit.panel) {
          await section(page, 'Armor');
          const diagram = page
            .getByTestId('vehicle-armor-allocation-section')
            .getByTestId('vehicle-armor-diagram');
          const captions = diagram.locator(
            ':scope > .grid [aria-label*=" armor:"] > div > span:first-child',
          );
          await expect(captions).not.toHaveCount(0);
          for (const caption of await captions.all())
            await expect(caption).toHaveCSS('text-transform', 'none');
          if (unit.panel === 'six-side') {
            await expect(
              diagram.getByTestId('vehicle-six-side-armor-diagram'),
            ).toBeVisible();
            for (const label of [
              'Front',
              'Front Right',
              'Front Left',
              'Rear Right',
              'Rear Left',
              'Rear',
            ])
              await expect(
                diagram.getByRole('spinbutton', {
                  name: label + ' armor value',
                  exact: true,
                }),
              ).toBeEnabled();
            const offsets = await diagram
              .getByTestId('six-side-label')
              .evaluateAll((nodes) =>
                nodes.map((node) => {
                  const rect = node.getBoundingClientRect(),
                    region = node
                      .closest('g')
                      ?.querySelector('polygon')
                      ?.getBoundingClientRect();
                  if (!region) throw Error('Missing rendered label region');
                  return {
                    x: Math.abs(
                      rect.left +
                        rect.width / 2 -
                        region.left -
                        region.width / 2,
                    ),
                    y: Math.abs(
                      rect.top +
                        rect.height / 2 -
                        region.top -
                        region.height / 2,
                    ),
                  };
                }),
              );
            expect(offsets).toHaveLength(6);
            for (const offset of offsets) {
              expect(offset.x).toBeLessThanOrEqual(1.5);
              expect(offset.y).toBeLessThanOrEqual(1.5);
            }
          } else {
            await expect(
              diagram.getByRole('spinbutton', {
                name: 'Rear Turret armor value',
                exact: true,
              }),
            ).toHaveValue('52');
            await expect(
              diagram.getByRole('spinbutton', {
                name: 'Front Turret armor value',
                exact: true,
              }),
            ).toHaveValue('32');
          }
          for (const height of await diagram
            .getByRole('spinbutton')
            .evaluateAll((nodes) =>
              nodes.map((node) => node.getBoundingClientRect().height),
            ))
            expect(height).toBeGreaterThanOrEqual(44);
          const graphic =
            unit.panel === 'six-side'
              ? diagram.getByTestId('vehicle-six-side-armor-diagram')
              : diagram.locator('svg[aria-hidden="true"]');
          await graphic.screenshot({
            path: testInfo.outputPath(`armor-diagram-${viewport.name}.png`),
            animations: 'disabled',
          });
          await diagram.locator(':scope > .grid').screenshot({
            path: testInfo.outputPath(`armor-controls-${viewport.name}.png`),
            animations: 'disabled',
          });
        }

        if (unit.shell === 'aerospace-customizer') {
          await section(page, 'Velocity');
          const velocity = shell.getByTestId('aerospace-velocity-tab');
          const thrust = velocity.getByTestId('aerospace-safe-thrust-input');
          const editedThrust = String(Number(await thrust.inputValue()) + 1);
          await activate(
            page,
            velocity.getByTestId('aerospace-thrust-increase'),
            true,
          );
          await expect(thrust).toHaveValue(editedThrust);
          const maximum = await velocity
            .getByTestId('aerospace-max-thrust')
            .innerText();
          const fuel = velocity.getByTestId('aerospace-fuel-tons-input');
          await fill(page, fuel, '2.5', true, await fuel.inputValue());
          const fuelPoints = await velocity
            .getByText(/fuel points \(/)
            .innerText();
          await section(page, 'Structure');
          await expect(
            shell.getByTestId('aerospace-safe-thrust-input'),
          ).toHaveValue(editedThrust);
          await expect(shell.getByTestId('aerospace-max-thrust')).toHaveText(
            maximum,
          );
          await expect(
            shell.getByTestId('aerospace-fuel-tons-input'),
          ).toHaveValue('2.5');
          await expect(
            shell.getByText(fuelPoints, { exact: true }),
          ).toBeVisible();
          await section(page, 'Velocity');
          await expect(thrust).toHaveValue(editedThrust);
          expect(
            await velocity.evaluate(
              (element) => element.scrollWidth <= element.clientWidth,
            ),
          ).toBe(true);
          await velocity.screenshot({
            path: testInfo.outputPath(
              `velocity-${unit.label.replace(/ /g, '-')}-${viewport.name}.png`,
            ),
            animations: 'disabled',
          });
        }

        await page.screenshot({
          path: testInfo.outputPath(
            `${unit.label.replace(/ /g, '-')}-${viewport.name}.png`,
          ),
          animations: 'disabled',
        });
      });
    }

    for (const unit of CAPITAL_CASES) {
      test(`opens ${unit.chassis} ${unit.scope} read-only @customizer`, async ({
        page,
      }, testInfo) => {
        if ('unsupportedHull' in unit) {
          await page.route('**/data/units/capital/Gaajian*', async (route) => {
            const response = await route.fetch();
            const definition = await response.json();
            definition.equipment.push({
              id: 'unsupported-hull-fixture',
              location: 'HULL',
            });
            await route.fulfill({ response, json: definition });
          });
        }
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
        await expect(tabs).toHaveCount(3);
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
              panel.getByRole('heading', {
                name: 'Hull',
                level: 3,
                exact: true,
              }),
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
  ) {
    const before = await page.evaluate(() => document.activeElement?.id);
    await page.keyboard.press(narrow ? 'ArrowDown' : 'ArrowRight');
    // Mech tab changes go through the router; wait for focus to move before the next key.
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.id))
      .not.toBe(before);
  }
  await expect(target).toBeFocused();
  await page.keyboard.press('Enter');
}

test.describe('keyboard input helper', () => {
  test.setTimeout(20_000);

  test('replaces text and numeric values through keyboard navigation', async ({
    page,
  }) => {
    await page.setContent(`
      <label>Chassis Name<input value="Shilone"></label>
      <label>Armor<input type="number" value="18"></label>
      <button>Save</button>
    `);
    const chassis = page.getByRole('textbox', { name: 'Chassis Name' });
    const armor = page.getByRole('spinbutton', { name: 'Armor' });
    await fill(page, chassis, 'Flow Shilone', true, 'Shilone');
    await expect(chassis).toHaveValue('Flow Shilone');
    await expect(armor).toBeFocused();
    await fill(page, armor, '17', true, '18');
    await expect(armor).toHaveValue('17');
    await expect(page.getByRole('button', { name: 'Save' })).toBeFocused();
  });
  test('rejects a retained old prefix before leaving the field', async ({
    page,
  }) => {
    await page.setContent(`
      <label>Chassis Name<input value="Shilone"></label>
      <button>Save</button>
      <script>
        const input = document.querySelector('input');
        input.addEventListener('keydown', (event) => {
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
            // Inject a lost selection; the retained hosted context shows this
            // prefix outcome, without proving the event that caused it there.
            event.preventDefault();
            input.setSelectionRange(input.value.length, input.value.length);
          }
        });
      </script>
    `);
    const chassis = page.getByRole('textbox', { name: 'Chassis Name' });
    const failure = await fill(
      page,
      chassis,
      'Flow Shilone',
      true,
      'Shilone',
    ).then(
      () => undefined,
      (error: unknown) => error,
    );
    expect(failure instanceof Error).toBe(true);
    if (failure instanceof Error)
      expect(failure.message).toContain('toHaveValue');
    await expect(chassis).toHaveValue('ShiloneFlow Shilone');
    await expect(chassis).toBeFocused();
  });

  test('waits for the initial value before selecting and replacing text', async ({
    page,
  }, info) => {
    await page.setContent(`
      <label>Chassis Name<input value=""></label>
      <button>Save</button>
      <script>
        const input = document.querySelector('input');
        window.fillEvents = [];
        let initialized = false;
        const record = (event) => window.fillEvents.push({
          event, value: input.value,
          start: input.selectionStart, end: input.selectionEnd,
        });
        const initialize = () => {
          if (initialized) return;
          initialized = true;
          input.value = 'AA Jump Infantry';
          record('initial value committed');
        };
        input.addEventListener('focus', () => {
          record('focused before initial value');
          // Model the dialog's pending controlled-value initialization. It can
          // commit after selection; no product behavior is changed by this fixture.
          setTimeout(initialize, 1000);
        }, { once: true });
        input.addEventListener('keyup', (event) => {
          if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
            record('select all');
            initialize();
          }
        });
        input.addEventListener('input', () => record('input'));
      </script>
    `);
    const chassis = page.getByRole('textbox', { name: 'Chassis Name' });
    try {
      await fill(
        page,
        chassis,
        'Flow AA Jump Infantry',
        true,
        'AA Jump Infantry',
      );
      await expect(chassis).toHaveValue('Flow AA Jump Infantry');
      await expect(page.getByRole('button', { name: 'Save' })).toBeFocused();
      const events = await page.evaluate(() =>
        (
          window as typeof window & { fillEvents: { event: string }[] }
        ).fillEvents.map((entry) => entry.event),
      );
      expect(events.indexOf('initial value committed')).toBeLessThan(
        events.indexOf('select all'),
      );
    } finally {
      const events = await page.evaluate(
        () => (window as typeof window & { fillEvents: unknown[] }).fillEvents,
      );
      await info.attach('initial-value-event-order', {
        body: JSON.stringify(events, null, 2),
        contentType: 'application/json',
      });
    }
  });

  test('waits for the initial value before pointer fill selects the field', async ({
    page,
  }, info) => {
    await page.setContent(`
      <label>Chassis Name<input value=""></label>
      <button>Save</button>
      <script>
        const input = document.querySelector('input');
        window.fillEvents = [];
        let initialized = false;
        const record = (event) => window.fillEvents.push({
          event, value: input.value,
          start: input.selectionStart, end: input.selectionEnd,
        });
        const initialize = () => {
          if (initialized) return;
          initialized = true;
          input.value = 'Shilone';
          record('initial value committed');
        };
        // A pending controlled-value commit is independent of input focus.
        setTimeout(initialize, 1000);
        input.addEventListener('beforeinput', () => {
          record('pointer before input');
          // Native selection has completed; commit before replacement inserts.
          initialize();
        });
        input.addEventListener('input', () => record('input'));
      </script>
    `);
    const chassis = page.getByRole('textbox', { name: 'Chassis Name' });
    try {
      await fill(page, chassis, 'Flow Shilone', false, 'Shilone');
      await expect(chassis).toHaveValue('Flow Shilone');
      const events = await page.evaluate(() =>
        (
          window as typeof window & { fillEvents: { event: string }[] }
        ).fillEvents.map((entry) => entry.event),
      );
      expect(events.indexOf('initial value committed')).toBeLessThan(
        events.indexOf('pointer before input'),
      );
    } finally {
      const events = await page.evaluate(
        () => (window as typeof window & { fillEvents: unknown[] }).fillEvents,
      );
      await info.attach('initial-value-event-order', {
        body: JSON.stringify(events, null, 2),
        contentType: 'application/json',
      });
    }
  });

  test('replaces an explicitly empty field in both input modes', async ({
    page,
  }) => {
    for (const keyboard of [true, false]) {
      await page.setContent(`
        <label>Variant Designation<input value=""></label>
        <button>Save</button>
      `);
      const variant = page.getByRole('textbox', {
        name: 'Variant Designation',
      });
      await fill(page, variant, 'Saved 390', keyboard, '');
      await expect(variant).toHaveValue('Saved 390');
    }
  });
});

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
      edit: 13,
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
      section: 'Armor',
      total: 20,
      sheet: 'armorPipsHD',
    },
  ] as const;
  type FlowCase = (typeof cases)[number];

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
      '',
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
            unit.family === 'fighter' || unit.family === 'small craft'
              ? 'Battle Value'
              : 'BV',
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

  /** The unit tab keeps a long name inside its box (or ellipsized) and its close button on screen. */
  async function longLabelFits(page: Page, name: string) {
    const label = page
      .getByRole('tab', { name, exact: true })
      .locator('[data-unit-tab-name]');
    await expect(label).toHaveText(name);
    expect(
      await label.evaluate((el) => {
        const style = getComputedStyle(el);
        return (
          el.scrollWidth <= el.clientWidth ||
          (style.textOverflow === 'ellipsis' && style.overflowX === 'hidden')
        );
      }),
    ).toBe(true);
    const close = page.getByRole('button', {
      name: `Close ${name}`,
      exact: true,
    });
    await expect(close).toBeInViewport();
    // The name must not run under the close button.
    const [text, button] = await Promise.all([
      label.boundingBox(),
      close.boundingBox(),
    ]);
    expect(text!.x + text!.width).toBeLessThanOrEqual(button!.x + 0.5);
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
          // Keyboard-only at the wide width for every family; battle armor at both.
          const keyboard =
            viewport.width === 1440 || unit.family === 'battle armor';
          let savedId: string | undefined;
          try {
            await page.goto('/customizer');
            await library(page, unit.chassis, unit.model, false, keyboard);
            await expect(figure(page, unit)).toContainText(String(unit.total));
            await section(page, unit.section, keyboard);
            if (unit.family === 'mech')
              await activate(
                page,
                page.getByRole('button', { name: /^Head armor:/ }),
                keyboard,
              );
            const input = editInput(page, unit);
            const initialValue = await input.inputValue();
            const original = Number(initialValue);
            expect(original).toBeGreaterThan(0);
            // Aerospace source armor exceeds the current editor cap. Exercise a
            // concrete legal edit; the cap discrepancy is recorded in HANDBACK.
            const edited = 'edit' in unit ? unit.edit : original - 1;
            await fill(page, input, String(edited), keyboard, initialValue);
            await expect(input).toHaveValue(String(edited));
            const total =
              unit.family === 'infantry' ? 18 : unit.total - original + edited;
            await expect(figure(page, unit)).toContainText(String(total));
            // The Armor tab's own running total follows the edit.
            if (unit.family === 'ProtoMech')
              await expect(
                page.getByTestId('protomech-armor-total-used'),
              ).toHaveText(String(total));
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
            // A deliberately long saved name exercises long-label layout.
            const chassis = `Flow ${unit.chassis} Long Label Layout Check ${Date.now()}-${info.workerIndex}`;
            const model = `Saved ${viewport.width}`;
            await fill(
              page,
              save.getByLabel('Chassis Name'),
              chassis,
              keyboard,
              unit.chassis,
            );
            await fill(
              page,
              save.getByLabel('Variant Designation'),
              model,
              keyboard,
              unit.model,
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
            // The keyboard path reaches Load Unit by Tab order, which outlasts the default wait.
            const fetched = page.waitForResponse(
              (r) =>
                r.url().endsWith(`/api/units/custom/${savedId}`) &&
                r.request().method() === 'GET',
              { timeout: 60_000 },
            );
            await library(page, chassis, model, true, keyboard);
            expect((await fetched).ok()).toBe(true);
            await section(page, unit.section, keyboard);
            if (unit.family === 'mech')
              await activate(
                page,
                page.getByRole('button', { name: /^Head armor:/ }),
                keyboard,
              );
            await expect(editInput(page, unit)).toHaveValue(String(edited));
            if (unit.family === 'ProtoMech')
              await expect(
                page.getByTestId('protomech-armor-total-used'),
              ).toHaveText(String(total));
            await expect(figure(page, unit)).toHaveText(figures);
            await expect.poll(() => keyFigures(page, unit)).toEqual(metrics);
            await noOverflow(page);
            await longLabelFits(page, `${chassis} ${model}`);
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
                page.getByRole('heading', {
                  name: 'Unit Not Found',
                  exact: true,
                }),
              ).toBeVisible();
              await expect(
                page.getByText(`Unit "${savedId}" not found`, { exact: true }),
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

      test('an edited canonical unit cannot overwrite its official record @customizer', async ({
        page,
        request,
      }, info) => {
        // Row 4.2 canonical clone protection: the save dialog refuses the official
        // name (UnitNameValidator.checkCanonicalConflict), and saving the edit under
        // a new name leaves the canonical Atlas unchanged when reopened.
        const unit = cases[0];
        let savedId: string | undefined;
        try {
          await page.goto('/customizer');
          await library(page, unit.chassis, unit.model);
          await section(page, unit.section);
          await page.getByRole('button', { name: /^Head armor:/ }).click();
          const input = editInput(page, unit);
          const original = Number(await input.inputValue());
          await input.fill(String(original - 1));
          await expect(figure(page, unit)).toContainText(
            String(unit.total - 1),
          );
          await page
            .getByRole('button', { name: 'Save active unit to library' })
            .click();
          const save = page.getByRole('dialog', {
            name: 'Save Unit',
            exact: true,
          });
          await expect(save.getByLabel('Chassis Name')).toHaveValue(
            unit.chassis,
          );
          await expect(save.getByLabel('Variant Designation')).toHaveValue(
            unit.model,
          );
          await expect(
            save.getByText(
              `"${unit.chassis} ${unit.model}" is an official BattleTech unit and cannot be overwritten. Please choose a different name.`,
              { exact: true },
            ),
          ).toBeVisible();
          const button = save.getByRole('button', {
            name: 'Save',
            exact: true,
          });
          await expect(button).toBeDisabled();
          const model = `Clone ${Date.now()}-${info.workerIndex}`;
          await save.getByLabel('Variant Designation').fill(model);
          await expect(button).toBeEnabled();
          const posted = page.waitForResponse(
            (r) =>
              r.url().endsWith('/api/units/custom') &&
              r.request().method() === 'POST',
          );
          await button.click();
          const response = await posted;
          expect(response.ok()).toBe(true);
          savedId = (await response.json()).data.id;
          await expect(save).toBeHidden();
          await page
            .getByRole('button', {
              name: `Close ${unit.chassis} ${model}`,
              exact: true,
            })
            .click();
          // The official record reopens with its original armor.
          await library(page, unit.chassis, unit.model);
          await expect(figure(page, unit)).toContainText(String(unit.total));
        } finally {
          if (savedId) await request.delete(`/api/units/custom/${savedId}`);
        }
      });

      test('capital remains read-only and prints its record sheet @customizer', async ({
        page,
      }, info) => {
        await installPrintHarness(page);
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
        if (process.env.RECORD_SHEET_PINNED_ASSETS)
          await page.route('**/record-sheets/**', async (route) => {
            const relative = new URL(route.request().url()).pathname.replace(
              '/record-sheets/',
              '',
            );
            await route.fulfill({
              contentType: 'image/svg+xml',
              body: readFileSync(
                path.join(process.env.RECORD_SHEET_PINNED_ASSETS!, relative),
              ),
            });
          });
        await expect(
          shell.getByRole('tab', { includeHidden: true }),
        ).toHaveCount(3);
        await section(page, 'Preview');
        const images = shell.getByRole('img', {
          name: /Crucible Station record sheet page/,
        });
        await expect(images.first()).toBeVisible();
        const count = await images.count();
        expect(count).toBeGreaterThan(1);
        const source = await images
          .first()
          .evaluate((el) =>
            decodeURIComponent((el as HTMLImageElement).src.split(',')[1]),
          );
        expect(source).toContain(
          'data-capital-template="spacestation_default"',
        );
        expect(source).toContain('(complete)');
        await page.getByRole('button', { name: 'Print', exact: true }).click();
        await expect
          .poll(async () => (await printCaptures(page)).length)
          .toBe(1);
        const capture = (await printCaptures(page))[0];
        expect(capture.sheetCount).toBe(count);
        expect(capture.typeName).toBe('Crucible Station');
        await expectPrintWindowClosesAfterPrint(page);
        const downloadPromise = page.waitForEvent('download');
        await page
          .getByRole('button', { name: 'Download PDF', exact: true })
          .click();
        const download = await downloadPromise;
        const filename = info.outputPath('capital-record-sheets.pdf');
        await download.saveAs(filename);
        const pdf = readFileSync(filename).toString('latin1');
        expect(pdf.startsWith('%PDF')).toBe(true);
        expect(pdf.match(/\/Type\s*\/Page(?!s)/g)).toHaveLength(count);
        await noOverflow(page);
        await page.screenshot({
          path: info.outputPath(`capital-${viewport.width}.png`),
          animations: 'disabled',
        });
      });
    });
  }

  test('ProtoMech Armor: Clear then Auto places the legal total @customizer', async ({
    page,
  }) => {
    // Row 4.1 item a-3: Auto is MegaMekLab's allocation at the legal total. Centaur
    // is 5 t with a main gun, so the pinned cap is 24 + 3 = 27 (TestProtoMek.maxArmorFactor).
    await page.goto('/customizer');
    await library(page, 'Centaur', '');
    await section(page, 'Armor');
    const used = page.getByTestId('protomech-armor-total-used');
    await expect(page.getByTestId('protomech-armor-total-max')).toHaveText(
      '27',
    );
    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    await expect(used).toHaveText('0');
    await page.getByRole('button', { name: 'Auto', exact: true }).click();
    await expect(used).toHaveText('27');
    // 5 t: head 2 + 5/2, torso 2 x 5, arms 2, legs 2 x 3, main gun 3 x 1.
    await expect(page.getByLabel('Head armor points')).toHaveValue('4');
    await expect(page.getByLabel('Torso armor points')).toHaveValue('10');
    await expect(page.getByLabel('Right Arm armor points')).toHaveValue('2');
    await expect(page.getByLabel('Left Arm armor points')).toHaveValue('2');
    await expect(page.getByLabel('Legs armor points')).toHaveValue('6');
    await expect(page.getByLabel('Main Gun armor points')).toHaveValue('3');
    await noOverflow(page);
  });

  for (const variant of [
    { model: '', points: 32, mass: '2.400' },
    { model: 'B', points: 28, mass: '2.100' },
  ]) {
    test(`ProtoMech EDP armor: ${variant.model || 'base'} edit, save, reload and reopen @customizer`, async ({
      page,
      request,
    }) => {
      let savedId: string | undefined;
      try {
        await page.goto('/customizer');
        await library(page, 'Basilisk ProtoMech (Quad)', variant.model);
        await section(page, 'Armor');
        const type = page.getByLabel('Armor type', { exact: true });
        const weight = page.getByTestId('protomech-armor-weight');
        await expect(type).toHaveValue('18');
        await expect(page.getByTestId('protomech-armor-total-used')).toHaveText(
          String(variant.points),
        );
        await expect(weight).toHaveText(`${variant.mass} t`);
        await type.selectOption('42');
        await expect(weight).toHaveText(
          `${(variant.points * 0.05).toFixed(3)} t`,
        );
        await type.selectOption('18');
        await expect(weight).toHaveText(`${variant.mass} t`);
        await page
          .getByRole('button', { name: 'Save active unit to library' })
          .click();
        const save = page.getByRole('dialog', {
          name: 'Save Unit',
          exact: true,
        });
        const chassis = `Flow EDP ${variant.model || 'base'} ${Date.now()}`;
        await save.getByLabel('Chassis Name').fill(chassis);
        await save.getByLabel('Variant Designation').fill('Saved Armor');
        const posted = page.waitForResponse(
          (r) =>
            r.url().endsWith('/api/units/custom') &&
            r.request().method() === 'POST',
        );
        await save.getByRole('button', { name: 'Save', exact: true }).click();
        const response = await posted;
        expect(response.ok()).toBe(true);
        savedId = (await response.json()).data.id;
        expect(savedId).toBeTruthy();
        await page.reload();
        await section(page, 'Armor');
        await expect(type).toHaveValue('18');
        await expect(weight).toHaveText(`${variant.mass} t`);
        await page
          .getByRole('button', {
            name: `Close ${chassis} Saved Armor`,
            exact: true,
          })
          .click();
        const fetched = page.waitForResponse(
          (r) =>
            r.url().endsWith(`/api/units/custom/${savedId}`) &&
            r.request().method() === 'GET',
          { timeout: 60_000 },
        );
        await library(page, chassis, 'Saved Armor', true);
        expect((await fetched).ok()).toBe(true);
        await section(page, 'Armor');
        await expect(type).toHaveValue('18');
        await expect(weight).toHaveText(`${variant.mass} t`);
        await expect(page.getByTestId('protomech-armor-total-used')).toHaveText(
          String(variant.points),
        );
        await noOverflow(page);
      } finally {
        if (savedId) await request.delete(`/api/units/custom/${savedId}`);
      }
    });
  }

  test('ProtoMech Main Gun: remove the weapon, save, reload and reopen @customizer', async ({
    page,
    request,
  }) => {
    // Row 4.1 item a-2: the Main Gun tab reads the real mount, edits it, and the
    // edit survives the browser draft and the saved library copy.
    let savedId: string | undefined;
    try {
      await page.goto('/customizer');
      await library(page, 'Centaur', '');
      await section(page, 'Main Gun');
      const slots = page.getByTestId('protomech-main-gun-slots');
      await expect(page.getByLabel('Main Gun mount')).toBeChecked();
      await expect(slots).toHaveText('1 / 1');
      await expect(
        page.getByTestId('protomech-main-gun-contents'),
      ).toContainText('CLERMicroLaser');
      await page
        .getByRole('button', { name: 'Remove CLERMicroLaser from Main Gun' })
        .click();
      await expect(slots).toHaveText('0 / 1');
      await expect(page.getByTestId('protomech-main-gun-empty')).toBeVisible();

      await page
        .getByRole('button', { name: 'Save active unit to library' })
        .click();
      const save = page.getByRole('dialog', { name: 'Save Unit', exact: true });
      const chassis = `Flow Centaur Main Gun ${Date.now()}`;
      await save.getByLabel('Chassis Name').fill(chassis);
      await save.getByLabel('Variant Designation').fill('Saved Gun');
      const posted = page.waitForResponse(
        (r) =>
          r.url().endsWith('/api/units/custom') &&
          r.request().method() === 'POST',
      );
      await save.getByRole('button', { name: 'Save', exact: true }).click();
      const response = await posted;
      expect(response.ok()).toBe(true);
      savedId = (await response.json()).data.id;
      expect(savedId).toBeTruthy();

      await page.reload();
      await section(page, 'Main Gun');
      await expect(slots).toHaveText('0 / 1');

      // Close the draft so the library must fetch the saved server copy.
      await page
        .getByRole('button', {
          name: `Close ${chassis} Saved Gun`,
          exact: true,
        })
        .click();
      const fetched = page.waitForResponse(
        (r) =>
          r.url().endsWith(`/api/units/custom/${savedId}`) &&
          r.request().method() === 'GET',
        { timeout: 60_000 },
      );
      await library(page, chassis, 'Saved Gun', true);
      expect((await fetched).ok()).toBe(true);
      await section(page, 'Main Gun');
      await expect(page.getByLabel('Main Gun mount')).toBeChecked();
      await expect(slots).toHaveText('0 / 1');
      await expect(page.getByTestId('protomech-main-gun-empty')).toBeVisible();
      await noOverflow(page);
    } finally {
      if (savedId) await request.delete(`/api/units/custom/${savedId}`);
    }
  });

  test('ProtoMech Equipment: add a weapon, place it, save, reload and reopen @customizer', async ({
    page,
    request,
  }) => {
    // Row 4.1 item b: the Equipment tab offers only what MegaMekLab's
    // ProtoMekUtil.isProtoMekEquipment accepts, places a mount in an arm, and the
    // placement survives the browser draft and the saved library copy. There is no
    // Glider tab (PMMainUI has none; glider is the Structure tab's chassis choice).
    let savedId: string | undefined;
    try {
      await page.goto('/customizer');
      await library(page, 'Centaur', '');
      await section(page, 'Equipment');
      const mounted = page.getByTestId('protomech-equipment-mounted');
      await page.getByLabel('Search equipment').fill('Heavy Flamer');
      // The catalog has two ProtoMech Heavy Flamers (energy-other and the Java
      // registry record); either is a legal pick.
      const addFlamer = page
        .getByRole('button', { name: 'Add Heavy Flamer', exact: true })
        .first();
      await expect(addFlamer).toBeVisible();
      await addFlamer.click();
      const location = mounted.getByLabel('Location of Heavy Flamer');
      await expect(location).toHaveValue('Torso');
      await location.selectOption('Right Arm');
      await expect(location).toHaveValue('Right Arm');
      // A weapon the pin excludes from ProtoMechs is not offered. The pin removes F_PROTO_WEAPON from the Bombast Laser (ISBombastLaser.java:94).
      await page.getByLabel('Search equipment').fill('Bombast Laser');
      await expect(
        page.getByRole('button', { name: 'Add Bombast Laser', exact: true }),
      ).toHaveCount(0);

      await page
        .getByRole('button', { name: 'Save active unit to library' })
        .click();
      const save = page.getByRole('dialog', { name: 'Save Unit', exact: true });
      const chassis = `Flow Centaur Equipment ${Date.now()}`;
      await save.getByLabel('Chassis Name').fill(chassis);
      await save.getByLabel('Variant Designation').fill('Saved Arm');
      const posted = page.waitForResponse(
        (r) =>
          r.url().endsWith('/api/units/custom') &&
          r.request().method() === 'POST',
      );
      await save.getByRole('button', { name: 'Save', exact: true }).click();
      const response = await posted;
      expect(response.ok()).toBe(true);
      savedId = (await response.json()).data.id;
      expect(savedId).toBeTruthy();

      await page.reload();
      await section(page, 'Equipment');
      await expect(
        page
          .getByTestId('protomech-equipment-mounted')
          .getByLabel('Location of Heavy Flamer'),
      ).toHaveValue('Right Arm');

      // Close the draft so the library must fetch the saved server copy.
      await page
        .getByRole('button', {
          name: `Close ${chassis} Saved Arm`,
          exact: true,
        })
        .click();
      const fetched = page.waitForResponse(
        (r) =>
          r.url().endsWith(`/api/units/custom/${savedId}`) &&
          r.request().method() === 'GET',
        { timeout: 60_000 },
      );
      await library(page, chassis, 'Saved Arm', true);
      expect((await fetched).ok()).toBe(true);
      await section(page, 'Equipment');
      await expect(
        page
          .getByTestId('protomech-equipment-mounted')
          .getByLabel('Location of Heavy Flamer'),
      ).toHaveValue('Right Arm');
      await noOverflow(page);
    } finally {
      if (savedId) await request.delete(`/api/units/custom/${savedId}`);
    }
  });

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
