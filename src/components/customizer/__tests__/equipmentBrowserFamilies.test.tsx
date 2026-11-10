import { act, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';

import { getEquipmentLoader } from '@/services/equipment/EquipmentLoaderService';
import {
  getEquipmentLookupService,
  resetEquipmentLookupService,
} from '@/services/equipment/EquipmentLookupService';
import { mapProtoMechDefinitionToState } from '@/services/units/unitLoaderService/smallUnitDefinitionMapper';
import {
  createNewAerospaceStore,
  AerospaceStoreContext,
} from '@/stores/useAerospaceStore';
import {
  createNewBattleArmorStore,
  BattleArmorStoreContext,
} from '@/stores/useBattleArmorStore';
import { useEquipmentStore } from '@/stores/useEquipmentStore';
import {
  createNewProtoMechStore,
  createProtoMechStore,
  ProtoMechStoreContext,
} from '@/stores/useProtoMechStore';
import { createNewUnitStore, UnitStoreContext } from '@/stores/useUnitStore';
import {
  createNewVehicleStore,
  VehicleStoreContext,
} from '@/stores/useVehicleStore';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { getAmmunitionEntry } from '@/utils/construction/equipmentBV';

import { AerospaceEquipmentTab } from '../aerospace/AerospaceEquipmentTab';
import { BattleArmorSquadTab } from '../battlearmor/BattleArmorSquadTab';
import { ProtoMechEquipmentTab } from '../protomech/ProtoMechEquipmentTab';
import { EquipmentTab } from '../tabs/EquipmentTab';
import { VehicleEquipmentTab } from '../vehicle/VehicleEquipmentTab';

jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));

beforeAll(async () => {
  getEquipmentLoader().clear();
  resetEquipmentLookupService();
  await getEquipmentLookupService().initialize();
});
beforeEach(() => {
  localStorage.clear();
  const store = useEquipmentStore.getState();
  store.clearFilters();
  store.toggleHideUnavailable();
  store.setUnitContext(null, null, []);
  store.setEquipment(getEquipmentLookupService().getAllEquipment());
});

const options = {
  name: 'Eligibility',
  tonnage: 50,
  techBase: TechBase.INNER_SPHERE,
};
const families = [
  {
    unitType: UnitType.BATTLEMECH,
    setup: () => {
      const store = createNewUnitStore(options);
      return {
        ui: (
          <UnitStoreContext.Provider value={store}>
            <EquipmentTab />
          </UnitStoreContext.Provider>
        ),
        count: () => store.getState().equipment.length,
      };
    },
  },
  ...([UnitType.VEHICLE, UnitType.VTOL, UnitType.SUPPORT_VEHICLE] as const).map(
    (unitType) => ({
      unitType,
      setup: () => {
        const store = createNewVehicleStore({ ...options, unitType });
        return {
          ui: (
            <VehicleStoreContext.Provider value={store}>
              <VehicleEquipmentTab />
            </VehicleStoreContext.Provider>
          ),
          count: () => store.getState().equipment.length,
        };
      },
    }),
  ),
  ...(
    [
      UnitType.AEROSPACE,
      UnitType.CONVENTIONAL_FIGHTER,
      UnitType.SMALL_CRAFT,
    ] as const
  ).map((unitType) => ({
    unitType,
    setup: () => {
      const store = createNewAerospaceStore(options);
      store.setState({ unitType });
      return {
        ui: (
          <AerospaceStoreContext.Provider value={store}>
            <AerospaceEquipmentTab />
          </AerospaceStoreContext.Provider>
        ),
        count: () => store.getState().equipment.length,
      };
    },
  })),
  {
    unitType: UnitType.BATTLE_ARMOR,
    setup: () => {
      const store = createNewBattleArmorStore(options);
      return {
        ui: (
          <BattleArmorStoreContext.Provider value={store}>
            <BattleArmorSquadTab />
          </BattleArmorStoreContext.Provider>
        ),
        count: () => store.getState().equipment.length,
      };
    },
  },
  {
    unitType: UnitType.PROTOMECH,
    setup: () => {
      const store = createNewProtoMechStore({});
      return {
        ui: (
          <ProtoMechStoreContext.Provider value={store}>
            <ProtoMechEquipmentTab />
          </ProtoMechStoreContext.Provider>
        ),
        count: () => store.getState().equipment.length,
      };
    },
  },
];

it.each(families)(
  'uses the real $unitType store and catalog to offer and add eligible equipment',
  ({ unitType, setup }) => {
    const service = getEquipmentLookupService();
    const candidate = service
      .getBrowserEquipment(unitType)
      .find(
        (item) =>
          item.allowedUnitTypes?.includes(unitType) &&
          item.category === EquipmentCategory.ENERGY_WEAPON,
      );
    if (!candidate) throw new Error(`No pinned energy weapon for ${unitType}`);
    const { ui, count } = setup();
    useEquipmentStore.getState().setSearch(candidate.name);
    const before = count();
    render(ui);
    fireEvent.click(
      screen.getAllByRole('button', { name: `Add ${candidate.name}` })[0],
    );
    expect(count()).toBe(before + 1);
    // lrm11 is pinned ProtoMech-only; every shared family caller must transmit its type.
    act(() => useEquipmentStore.getState().setSearch('LRM 11'));
    expect(
      screen.queryAllByRole('button', { name: 'Add LRM 11' }).length > 0,
    ).toBe(unitType === UnitType.PROTOMECH);
  },
);

it('keeps all 22 affected canonical ProtoMech ammo mounts reachable and addable in the real picker', () => {
  const restored = new Set([
    'clan-ammo-protomech-lrm-2',
    'clan-ammo-protomech-lrm-3',
    'clan-ammo-protomech-lrm-4',
    'clan-ammo-srm-1',
    'clan-ammo-srm-3',
    'clan-ammo-srm-5',
  ]);
  const dir = join(process.cwd(), 'public/data/units/protomechs');
  let checked = 0;
  for (const file of readdirSync(dir).filter(
    (name) => name.endsWith('.json') && name !== 'index.json',
  )) {
    const definition = JSON.parse(
      readFileSync(join(dir, file), 'utf8').replace(/^\uFEFF/, ''),
    );
    for (const mount of definition.equipment as {
      id: string;
      name?: string;
    }[]) {
      if (!/ammo/i.test(mount.name ?? mount.id)) continue;
      const ammo = getAmmunitionEntry(mount.name ?? mount.id);
      if (!ammo || !restored.has(ammo.id)) continue;
      const store = createProtoMechStore(
        mapProtoMechDefinitionToState(definition),
      );
      act(() => useEquipmentStore.getState().setSearch(ammo.name));
      const view = render(
        <ProtoMechStoreContext.Provider value={store}>
          <ProtoMechEquipmentTab />
        </ProtoMechStoreContext.Provider>,
      );
      const before = store.getState().equipment.length;
      const buttons = screen.getAllByRole('button', {
        name: `Add ${ammo.name}`,
      });
      for (const button of buttons) fireEvent.click(button);
      expect(store.getState().equipment).toHaveLength(before + buttons.length);
      expect(
        store
          .getState()
          .equipment.slice(before)
          .map((item) => item.equipmentId),
      ).toContain(ammo.id);
      view.unmount();
      checked++;
    }
  }
  expect(checked).toBe(22);
});
