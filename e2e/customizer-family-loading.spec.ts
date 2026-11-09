import { expect, test } from '@playwright/test';

import { createDefaultAerospaceState } from '../src/stores/aerospaceState';
import { createDefaultBattleArmorState } from '../src/stores/battleArmorState';
import { createDefaultInfantryState } from '../src/stores/infantryState';
import { createDefaultProtoMechState } from '../src/stores/protoMechState';
import { createDefaultUnitState } from '../src/stores/unitState';
import { createDefaultVehicleState } from '../src/stores/vehicleState';
import { TechBase } from '../src/types/enums/TechBase';
import {
  AerospaceMotionType,
  GroundMotionType,
} from '../src/types/unit/BaseUnitInterfaces';
import {
  MechConfiguration,
  UnitType,
} from '../src/types/unit/BattleMechInterfaces';

test.use({ serviceWorkers: 'block' });
test.setTimeout(120_000);
const id = '194fa6de-4dd7-44d8-8ff0-46a429ee3f1f';
const options = {
  id,
  name: 'Loading proof',
  tonnage: 50,
  techBase: TechBase.INNER_SPHERE,
};
const cases = [
  ...Object.values(MechConfiguration).map((configuration) => ({
    name: configuration,
    type: UnitType.BATTLEMECH,
    key: 'unit',
    state: { ...createDefaultUnitState(options), configuration },
    diagram: 'armor-diagram',
    shell: 'customizer-workbench',
  })),
  ...(
    [
      ['tank', UnitType.VEHICLE, GroundMotionType.TRACKED, false],
      ['VTOL', UnitType.VTOL, GroundMotionType.VTOL, false],
      ['naval', UnitType.VEHICLE, GroundMotionType.NAVAL, false],
      ['superheavy', UnitType.VEHICLE, GroundMotionType.TRACKED, true],
      ['support', UnitType.SUPPORT_VEHICLE, GroundMotionType.TRACKED, false],
    ] satisfies [string, UnitType, GroundMotionType, boolean][]
  ).map(([name, type, motionType, isSuperheavy]) => ({
    name,
    type,
    key: 'vehicle',
    state: {
      ...createDefaultVehicleState(options),
      unitType: type,
      motionType,
      isSuperheavy,
    },
    diagram: 'vehicle-armor-diagram',
    shell: 'vehicle-customizer',
  })),
  ...[false, AerospaceMotionType.AERODYNE, AerospaceMotionType.SPHEROID].map(
    (motion) => ({
      name: motion ? `small craft ${motion}` : 'fighter',
      type: motion ? UnitType.SMALL_CRAFT : UnitType.AEROSPACE,
      key: 'aerospace',
      state: {
        ...createDefaultAerospaceState({
          ...options,
          isSmallCraft: Boolean(motion),
        }),
        motionType: motion || AerospaceMotionType.AERODYNE,
      },
      diagram: 'aerospace-armor-diagram',
      shell: 'aerospace-customizer',
    }),
  ),
  {
    name: 'battle armor',
    type: UnitType.BATTLE_ARMOR,
    key: 'battlearmor',
    state: createDefaultBattleArmorState(options),
    diagram: 'battlearmor-pip-grid',
    shell: 'battlearmor-customizer',
  },
  {
    name: 'infantry',
    type: UnitType.INFANTRY,
    key: 'infantry',
    state: createDefaultInfantryState(options),
    diagram: 'infantry-platoon-counter',
    shell: 'infantry-customizer',
  },
  {
    name: 'ProtoMech',
    type: UnitType.PROTOMECH,
    key: 'protomech',
    state: createDefaultProtoMechState({ ...options, tonnage: 5 }),
    diagram: 'protomech-armor-diagram',
    shell: 'protomech-customizer',
  },
];

for (const width of [390, 1440]) {
  test.describe(`pending family catalogs at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });
    for (const unit of [...cases, null]) {
      test(`${unit?.name ?? 'capital read-only'} @customizer`, async ({
        page,
      }, info) => {
        await page.addInitScript(() =>
          Reflect.deleteProperty(Navigator.prototype, 'serviceWorker'),
        );
        if (unit)
          await page.addInitScript(
            ({ tab, key, state }) => {
              localStorage.setItem(
                'megamek-tab-manager',
                JSON.stringify({
                  state: { tabs: [tab], activeTabId: tab.id },
                  version: 0,
                }),
              );
              localStorage.setItem(
                key,
                JSON.stringify({ state: JSON.parse(state), version: 0 }),
              );
            },
            {
              tab: { ...options, unitType: unit.type },
              key: `megamek-${unit.key}-${id}`,
              state: JSON.stringify(unit.state),
            },
          );
        let release!: () => void;
        let blocked = false;
        const gate = new Promise<void>((resolve) => {
          release = resolve;
        });
        const pattern =
          '**/data/equipment/official/weapons/ballistic-other.json';
        await page.route(pattern, async (route) => {
          blocked = true;
          await gate;
          await route.continue();
        });
        try {
          await page.goto(unit ? `/customizer/${id}/structure` : '/customizer');
          if (!unit) {
            await page
              .getByRole('button', { name: 'Load from Library', exact: true })
              .click();
            const dialog = page.getByRole('dialog', {
              name: 'Add Unit',
              exact: true,
            });
            await dialog
              .getByPlaceholder('Search by chassis or variant...')
              .fill('Crucible Station');
            await dialog
              .getByRole('row')
              .filter({
                has: page.getByRole('cell', {
                  name: 'Crucible Station',
                  exact: true,
                }),
              })
              .dblclick();
            await expect(dialog).toBeHidden();
          }
          await expect.poll(() => blocked).toBe(true);
          const skeleton = page.getByTestId('customizer-loading-skeleton');
          await expect(skeleton).toHaveAttribute(
            'data-family',
            unit?.type ?? UnitType.SPACE_STATION,
          );
          await expect(
            skeleton.getByTestId(unit?.diagram ?? 'capital-loading-locations'),
          ).toBeVisible();
          const diagram = skeleton.getByTestId('loading-location-diagram');
          await expect(diagram).toHaveAttribute('inert', '');
          const control = diagram.locator('button, input, select').first();
          if (await control.count()) {
            await expect(control).toBeDisabled();
            await control.evaluate((element) =>
              (element as HTMLElement).focus(),
            );
            await expect(control).not.toBeFocused();
          }
          if (unit?.type === UnitType.SMALL_CRAFT) {
            await expect(diagram).toContainText('Left Side');
            await expect(diagram).not.toContainText('Left Wing');
          }
          if (!unit)
            await expect(
              skeleton.locator('input, select, textarea'),
            ).toHaveCount(0);
          expect(
            await skeleton.evaluate(
              (node) => node.scrollWidth <= node.clientWidth,
            ),
          ).toBe(true);
          await diagram.scrollIntoViewIfNeeded();
          await expect(diagram).toBeInViewport();
          await diagram.screenshot({
            path: info.outputPath('pending.png'),
            animations: 'disabled',
          });
          release();
          await expect(skeleton).toBeHidden();
          await expect(
            page.getByTestId(unit?.shell ?? 'capital-ship-customizer'),
          ).toBeVisible();
        } finally {
          release();
          await page.unroute(pattern);
        }
      });
    }
  });
}
