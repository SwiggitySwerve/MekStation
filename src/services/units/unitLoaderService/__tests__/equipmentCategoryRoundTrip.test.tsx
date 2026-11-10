import { act, cleanup, renderHook } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';

import { useDialogHandlers } from '@/components/customizer/tabs/useMultiUnitTabsController.dialogs';
import { loadUnitIntoTab } from '@/components/customizer/tabs/useMultiUnitTabsController.helpers';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import {
  getCanonicalUnitService,
  resetCanonicalUnitService,
} from '@/services/units/CanonicalUnitService';
import { UnitRepository } from '@/services/units/UnitRepository';
import { UnitState } from '@/stores/unitState';
import { clearAllStores, getUnitStore } from '@/stores/unitStoreRegistry';
import { useTabManagerStore } from '@/stores/useTabManagerStore';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { UnitContract } from '@/types/contracts';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';
import { createMountedEquipment } from '@/types/equipment/MountedEquipment';
import { ICreateUnitRequest } from '@/types/persistence/UnitPersistence';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { parseUnit, unitLoaderService } from '../../unitLoaderService';
import { isDefinitionForFamily } from '../definitionTypes';
import { mapEquipment } from '../equipmentMapping';
import { mountedDefinitionFields } from '../mountedDefinitionFields';

jest.mock('@/components/shared/Toast', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

const originalFetch = global.fetch;
let repository: UnitRepository;
let savedId: string | undefined;

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: async () => JSON.parse(JSON.stringify(body)),
  } as Response;
}

async function transport(
  input: RequestInfo | URL,
  options: RequestInit = {},
): Promise<Response> {
  const pathname = decodeURIComponent(
    new URL(String(input), 'http://localhost').pathname,
  );
  if (pathname === '/api/units/custom') {
    if (options.method === 'POST') {
      const request = JSON.parse(String(options.body)) as ICreateUnitRequest;
      UnitContract.parse(request.data);
      const result = repository.create(request);
      if (result.success) savedId = result.data.id;
      return response(result, result.success ? 201 : 400);
    }
    return response({ units: repository.list() });
  }
  const custom = /^\/api\/units\/custom\/([^/]+)$/.exec(pathname);
  if (custom) {
    const record = repository.getById(custom[1]);
    return record
      ? response({ ...record, parsedData: JSON.parse(record.data) })
      : response({}, 404);
  }
  const publicRoot = resolve('public');
  const file = resolve(publicRoot, pathname.slice(1));
  if (!file.startsWith(publicRoot + sep))
    throw new Error('Outside fixture root');
  return response(JSON.parse(readFileSync(file, 'utf8')));
}

async function open(
  id: string,
  source: 'canonical' | 'custom',
  canonicalId = id,
) {
  const entry = (
    await getCanonicalUnitService().getIndex({
      family: 'battlemechs',
      strict: true,
    })
  ).find((unit) => unit.id === canonicalId);
  if (!entry) throw new Error(`Missing fixture ${id}`);
  let tabId: string | undefined;
  const showToast = jest.fn();
  await loadUnitIntoTab({
    unit: {
      ...entry,
      id,
      unitType: UnitType.BATTLEMECH,
    },
    source,
    createTab: () => {
      throw new Error('Unexpected template fallback');
    },
    navigateToTab: (opened) => {
      tabId = opened;
    },
    setIsLoadDialogOpen: jest.fn(),
    setIsLoadingUnit: jest.fn(),
    showToast,
  });
  const store = tabId ? getUnitStore(tabId) : undefined;
  if (!store)
    throw new Error(`Open failed: ${JSON.stringify(showToast.mock.calls)}`);
  return store;
}

beforeAll(async () => {
  global.fetch = transport;
  await getEquipmentLookupService().initialize();
  await getEquipmentRegistry().initialize();
  expect(getEquipmentLookupService().getDataSource()).toBe('json');
  expect(getEquipmentRegistry().isReady()).toBe(true);
});
beforeEach(() => {
  getSQLiteService({ path: ':memory:' }).initialize();
  repository = new UnitRepository();
  savedId = undefined;
});
afterEach(() => {
  cleanup();
  clearAllStores(true);
  localStorage.clear();
  useTabManagerStore.setState({ tabs: [], activeTabId: null });
  resetCanonicalUnitService();
  resetSQLiteService();
});
afterAll(() => {
  global.fetch = originalFetch;
});

function mountFacts(state: UnitState) {
  return state.equipment
    .map((item) =>
      JSON.stringify([
        item.equipmentId,
        item.techBase,
        item.category,
        item.location ?? null,
        item.isRearMounted,
        item.slots ?? null,
        item.splitSlots ?? null,
        item.name,
        item.weight,
        item.criticalSlots,
        item.heat,
      ]),
    )
    .sort();
}

async function roundTrip(id: string, legacy: boolean, unallocated = false) {
  const store = await open(id, 'canonical');
  if (unallocated) {
    const lookup = getEquipmentLookupService();
    const mounts = [false, true].map((isAmmo, index) => {
      const definition = lookup.getMountedById('mrm-20', isAmmo);
      if (!definition) throw new Error('Missing shared-ID MRM fixture');
      return createMountedEquipment(definition, `mount-${index}`);
    });
    store.setState({ equipment: mounts, bvContext: undefined });
  }
  const loaded = store.getState();
  const expected = mountFacts(loaded);
  const hook = renderHook(() =>
    useDialogHandlers(jest.fn(), jest.fn(), (tabId) =>
      useTabManagerStore.getState().tabs.find((tab) => tab.id === tabId),
    ),
  );
  act(() => hook.result.current.openSaveDialog(loaded.id));
  expect(hook.result.current.saveDialog.isOpen).toBe(true);
  await act(async () => {
    await hook.result.current.handleSaveDialogSave(
      loaded.chassis,
      `category-${id}`,
    );
  });
  hook.unmount();
  if (!savedId) throw new Error('The dialog did not save a unit');
  let record = repository.getById(savedId);
  if (!record) throw new Error('Missing saved SQLite record');
  let definition = UnitContract.parse(JSON.parse(record.data));
  if (!isDefinitionForFamily('battlemechs', definition))
    throw new Error('Expected a mech');
  if (legacy) {
    const legacyDefinition = {
      ...definition,
      equipment: definition.equipment.map((item) => {
        const copy = { ...item };
        delete copy.isAmmo;
        return copy;
      }),
    };
    const created = repository.create({
      chassis: record.chassis,
      variant: `${record.variant}-legacy`,
      data: legacyDefinition,
    });
    if (!created.success) throw new Error(created.error.message);
    savedId = created.data.id;
    record = repository.getById(savedId);
    if (!record) throw new Error('Missing legacy SQLite record');
    definition = UnitContract.parse(JSON.parse(record.data));
    if (!isDefinitionForFamily('battlemechs', definition))
      throw new Error('Expected legacy mech');
    expect(
      definition.equipment.every((item) => item.isAmmo === undefined),
    ).toBe(true);
  } else {
    const savedEquipment = definition.equipment;
    loaded.equipment.forEach((item, index) => {
      if (savedEquipment[index].isAmmo !== undefined)
        expect(savedEquipment[index].isAmmo).toBe(
          item.category === EquipmentCategory.AMMUNITION,
        );
    });
    if (unallocated)
      expect(savedEquipment.map((item) => item.isAmmo)).toEqual([
        undefined,
        true,
      ]);
  }
  expect(definition.equipment.map((item) => item.id).sort()).toEqual(
    loaded.equipment.map((item) => item.equipmentId).sort(),
  );
  const savedState = unitLoaderService.mapToUnitState(
    parseUnit(definition),
    false,
  );
  expect(mountFacts(savedState)).toEqual(expected);
  expect(mountFacts(store.getState())).toEqual(expected);
  clearAllStores(true);
  useTabManagerStore.setState({ tabs: [], activeTabId: null });
  const reopened = (await open(savedId, 'custom', id)).getState();
  expect(mountFacts(reopened)).toEqual(expected);
  return reopened;
}

it('keeps native marker allocations through SQLite, dialog save, contract parse and cold library reopen', async () => {
  const reopened = await roundTrip('king-crab-kgc-000', false);
  const markers = reopened.equipment.filter(
    (item) => item.category === EquipmentCategory.STRUCTURAL,
  );
  expect(markers).toHaveLength(14);
  expect(
    markers.every(
      (item) =>
        item.weight === 0 &&
        !item.isRemovable &&
        !item.isOmniPodMounted &&
        item.name === 'IS Ferro-Fibrous' &&
        item.slots?.length === 1,
    ),
  ).toBe(true);
  expect(markers.reduce((total, item) => total + item.slots!.length, 0)).toBe(
    14,
  );
});

it.each([
  'shadow-hawk-c',
  'alpha-wolf-a',
  'o-bakemono-obk-m11',
  'daishi-b',
  'highlander-hgn-732-colleen',
])(
  'preserves %s mount identity/category/placement through SQLite',
  async (id) => {
    await roundTrip(id, false);
  },
);

it.each([
  'shadow-hawk-c',
  'o-bakemono-obk-m11',
  'daishi-b',
  'highlander-hgn-732-colleen',
])('recovers absent legacy markers from %s saved placements', async (id) => {
  await roundTrip(id, true);
});

it('distinguishes unallocated shared-ID ammo and weapon through SQLite without a source grid', async () => {
  await roundTrip('warhammer-whm-6r', false, true);
});

it('keeps an absent marker undefined, retains false and rejects a nonboolean marker', async () => {
  const unit = await getCanonicalUnitService().getById('warhammer-whm-6r');
  if (!unit) throw new Error('Missing canonical contract fixture');
  const parsed = UnitContract.parse(unit);
  if (!isDefinitionForFamily('battlemechs', parsed))
    throw new Error('Expected mech');
  expect(parsed.equipment[0].isAmmo).toBeUndefined();
  const withFalse = UnitContract.parse({
    ...unit,
    equipment: [{ ...parsed.equipment[0], isAmmo: false }],
  });
  if (!isDefinitionForFamily('battlemechs', withFalse))
    throw new Error('Expected mech');
  expect(withFalse.equipment[0].isAmmo).toBe(false);
  expect(() =>
    UnitContract.parse({
      ...unit,
      equipment: [{ ...parsed.equipment[0], isAmmo: 'true' }],
    }),
  ).toThrow();
});

it.each([false, true])(
  'binds category to occupied cells even when category totals match (reverse: %s)',
  (reverse) => {
    const source = [
      {
        id: 'mrm-20',
        location: 'LEFT_TORSO',
        slots: [0],
        isAmmo: true,
        isRearMounted: true,
        isOmniPodMounted: true,
        isRemovable: false,
        linkedAmmo: 'external-link',
      },
      { id: 'mrm-20', location: 'LEFT_TORSO', slots: [1, 2, 3], isAmmo: false },
    ];
    if (reverse) source.reverse();
    const state = mapEquipment(
      source,
      TechBase.INNER_SPHERE,
      TechBaseMode.INNER_SPHERE,
      { LEFT_TORSO: ['IS MRM 20 Ammo', 'MRM 20', 'MRM 20', 'MRM 20'] },
      55,
    );
    expect(state).toHaveLength(2);
    expect(state.map((item) => item.category).sort()).toEqual(
      [EquipmentCategory.AMMUNITION, EquipmentCategory.MISSILE_WEAPON].sort(),
    );
    expect(state.find((item) => item.slots?.includes(0))).toMatchObject({
      equipmentId: 'mrm-20',
      category: EquipmentCategory.AMMUNITION,
      weight: 1,
      criticalSlots: 1,
      heat: 0,
      isRearMounted: true,
      isOmniPodMounted: true,
      isRemovable: false,
      linkedAmmoId: 'external-link',
    });
    expect(state.find((item) => item.slots?.includes(1))).toMatchObject({
      equipmentId: 'mrm-20',
      category: EquipmentCategory.MISSILE_WEAPON,
      criticalSlots: 3,
    });
    expect(
      state.every((item) => item.location === MechLocation.LEFT_TORSO),
    ).toBe(true);
  },
);

it.each([
  { slots: [], tokens: ['IS MRM 20 Ammo'] },
  { slots: [8], tokens: ['IS MRM 20 Ammo'] },
  { slots: [0, 1], tokens: ['IS MRM 20 Ammo', 'MRM 20'] },
])(
  'does not infer category from an incomplete or conflicting placement: %j',
  ({ slots, tokens }) => {
    const items = mapEquipment(
      [{ id: 'mrm-20', location: 'LEFT_TORSO', slots }],
      TechBase.INNER_SPHERE,
      TechBaseMode.INNER_SPHERE,
      { LEFT_TORSO: tokens },
      55,
    );
    expect(items[0].category).toBe(EquipmentCategory.MISSILE_WEAPON);
  },
);

it('rejects a discriminator whose category has no catalog record', () => {
  expect(() =>
    mapEquipment(
      [{ id: 'medium-laser', location: 'LEFT_ARM', isAmmo: true }],
      TechBase.INNER_SPHERE,
      TechBaseMode.INNER_SPHERE,
      undefined,
      55,
    ),
  ).toThrow(/ammunition definition/i);
});

it('projects a shared-ID ammo record with zero heat', () => {
  const definition = getEquipmentLookupService().getMountedById('mrm-20', true);
  if (!definition) throw new Error('Missing ammo');
  expect(mountedDefinitionFields(definition)).toMatchObject({
    category: EquipmentCategory.AMMUNITION,
    heat: 0,
  });
});
