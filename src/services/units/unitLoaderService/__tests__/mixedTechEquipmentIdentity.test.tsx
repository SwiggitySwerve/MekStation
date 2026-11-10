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
import {
  clearAllStores,
  getUnitStore,
  hydrateOrCreateUnit,
} from '@/stores/unitStoreRegistry';
import { useTabManagerStore } from '@/stores/useTabManagerStore';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { UnitContract } from '@/types/contracts';
import { TechBase } from '@/types/enums/TechBase';
import { ICreateUnitRequest } from '@/types/persistence/UnitPersistence';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { isDefinitionForFamily } from '../definitionTypes';
import { resolveEquipmentId } from '../equipmentResolution';

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

function identities(state: UnitState) {
  return state.equipment
    .map((item) => `${item.equipmentId}|${item.techBase}`)
    .sort();
}

function placements(state: UnitState) {
  return state.equipment
    .map((item) =>
      JSON.stringify([
        item.equipmentId,
        item.location,
        item.slots,
        item.splitSlots,
        item.isRearMounted,
      ]),
    )
    .sort();
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

// Native equipment on a Mixed chassis retains its own technology:
// MegaMek 48fcb2f64 MtfFile.getEquipmentType passes null as the tech restriction.
it.each([
  'shadow-hawk-c',
  'alpha-wolf-a',
  'kodiak-cale',
  'prometheus-unknown',
  'warhammer-whm-6r',
  'mad-cat-prime',
])(
  'preserves %s identities through dialog save, SQLite and custom reopen',
  async (id) => {
    const store = await open(id, 'canonical');
    const loaded = store.getState();
    const expected = identities(loaded);
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
        `identity-${id}`,
      );
    });
    hook.unmount();
    if (!savedId) throw new Error('The save hook did not persist a unit');
    const record = repository.getById(savedId);
    if (!record) throw new Error('Missing SQLite row');
    const persisted = UnitContract.parse(JSON.parse(record.data));
    if (!isDefinitionForFamily('battlemechs', persisted)) {
      throw new Error('The saved fixture is not a BattleMech');
    }
    expect(persisted.equipment?.map((item) => item.id).sort()).toEqual(
      loaded.equipment.map((item) => item.equipmentId).sort(),
    );
    expect(identities(store.getState())).toEqual(expected);
    clearAllStores(true);
    useTabManagerStore.setState({ tabs: [], activeTabId: null });
    const reopened = (await open(savedId, 'custom', id)).getState();
    expect(identities(reopened)).toEqual(expected);
    expect(placements(reopened)).toEqual(placements(loaded));
  },
);

// Every explicit Clan ID lost in the 377-unit baseline census.
it.each([
  'clan-er-medium-laser',
  'clan-er-small-laser',
  'clan-er-large-laser',
  'clan-er-ppc',
  'clan-streak-srm-6',
  'clan-medium-pulse-laser',
  'clan-large-pulse-laser',
  'clan-srm-6',
  'clan-streak-srm-4',
  'clan-lrm-15',
  'clan-gauss-rifle',
  'clan-small-pulse-laser',
  'clan-lrm-10',
  'clan-machine-gun',
  'clan-lrm-20',
  'clan-lb-10-x-ac',
  'clan-laser-ams',
  'clan-lb-5-x-ac',
  'clan-lb-20-x-ac',
  'clan-uac-10',
  'clan-lrm-5',
  'clan-rac-5',
  'clan-srm-4',
  'clan-light-tag',
  'clan-uac-5',
  'clan-tag',
  'clan-streak-srm-2',
  'clan-uac-20',
  'clan-flamer',
  'clan-mech-mortar-4',
  'clan-er-flamer',
  'clan-lb-2-x-ac',
  'clan-arrow-iv-launcher',
  'clan-narc',
  'clan-rac-2',
  'clan-uac-2',
  'clan-srm-2',
])('retains %s with and without critical context', (id) => {
  for (const slots of [undefined, [], ['ER Medium Laser (Clan)']]) {
    expect(
      resolveEquipmentId(id, TechBase.INNER_SPHERE, TechBaseMode.MIXED, slots)
        .resolvedId,
    ).toBe(id);
  }
});

it.each([
  [TechBase.INNER_SPHERE, TechBaseMode.INNER_SPHERE, 'er-medium-laser'],
  [TechBase.CLAN, TechBaseMode.CLAN, 'clan-er-medium-laser'],
] as const)(
  'retains pure-mode variant routing for %s',
  (tech, mode, expected) => {
    expect(
      resolveEquipmentId('er-medium-laser', tech, mode, []).resolvedId,
    ).toBe(expected);
  },
);

it('retains the native same-location IS/Clan split and independent drafts', async () => {
  const mixed = await open('kodiak-cale', 'canonical');
  const initial = identities(mixed.getState());
  const armLasers = mixed
    .getState()
    .equipment.filter(
      (item) =>
        item.location === MechLocation.LEFT_ARM &&
        item.equipmentId.includes('er-medium-laser'),
    );
  expect(armLasers.map((item) => [item.equipmentId, item.slots])).toEqual([
    ['clan-er-medium-laser', [4]],
    ['clan-er-medium-laser', [5]],
    ['clan-er-medium-laser', [6]],
    ['er-medium-laser', [7]],
    ['er-medium-laser', [8]],
  ]);
  const pure = await open('mad-cat-prime', 'canonical');
  expect(pure).not.toBe(mixed);
  expect(identities(mixed.getState())).toEqual(initial);
  const id = mixed.getState().id;
  mixed.setState({ lastModifiedAt: mixed.getState().lastModifiedAt });
  clearAllStores();
  const hydrated = hydrateOrCreateUnit(id, {
    name: 'Fallback',
    tonnage: 100,
    techBase: TechBase.INNER_SPHERE,
  });
  expect(identities(hydrated.getState())).toEqual(initial);
});
