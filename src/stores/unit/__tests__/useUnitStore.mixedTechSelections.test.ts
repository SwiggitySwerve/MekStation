import type { StoreApi } from 'zustand';

/**
 * Real component/store/SQLite regression through jsdom and fixture HTTP.
 * This is not browser or server-route acceptance. Equipment-ID drift on reopen
 * has separate ownership; selection fields and component contexts are asserted.
 * @spec openspec/changes/establish-all-unit-data-parity/specs/tech-base-integration/spec.md
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
} from '@testing-library/react';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { createElement } from 'react';

import type { UnitStore } from '@/stores/unitState';
import type { ICreateUnitRequest } from '@/types/persistence/UnitPersistence';
import type { IUnitIndexEntry } from '@/types/unit/UnitIndex';
import type { ISerializedUnit } from '@/types/unit/UnitSerialization';

import { ComponentTechnologyCard } from '@/components/customizer/tabs/overview/ComponentTechnologyCard';
import { useDialogHandlers } from '@/components/customizer/tabs/useMultiUnitTabsController.dialogs';
import { loadUnitIntoTab } from '@/components/customizer/tabs/useMultiUnitTabsController.helpers';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import {
  getCanonicalUnitService,
  resetCanonicalUnitService,
} from '@/services/units/CanonicalUnitService';
import { UnitRepository } from '@/services/units/UnitRepository';
import { getUnitEditHistory } from '@/stores/unit/unitEditHistory';
import { getUnitDraftFingerprint } from '@/stores/unit/unitEditSnapshot';
import { clearAllStores, getUnitStore } from '@/stores/unitStoreRegistry';
import { useTabManagerStore } from '@/stores/useTabManagerStore';
import { createNewUnitStore, UnitStoreContext } from '@/stores/useUnitStore';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { EngineType } from '@/types/construction/EngineType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import {
  TechBaseMode,
  TechBaseComponent,
  createDefaultComponentTechBases,
} from '@/types/construction/TechBaseConfiguration';
import { UnitContract } from '@/types/contracts';
import { TechBase } from '@/types/enums/TechBase';

jest.mock('@/components/shared/Toast', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

const publicRoot = path.resolve(__dirname, '../../../../public');
// C2 affected-files.csv at ca66910a1: all 16 newly flagged structures + six
// first-pass controls. Context is explicit fixture evidence, never an ID rule.
const sources = [
  [
    'data/units/battlemechs/3-succession-wars/advanced/Shadow Hawk C.json',
    'INNER_SPHERE',
  ],
  [
    'data/units/battlemechs/3-succession-wars/experimental/Archer C.json',
    'INNER_SPHERE',
  ],
  [
    'data/units/battlemechs/3-succession-wars/experimental/Atlas C.json',
    'CLAN',
  ],
  [
    'data/units/battlemechs/3-succession-wars/experimental/Bull Shark BSK-M3.json',
    'INNER_SPHERE',
  ],
  [
    'data/units/battlemechs/3-succession-wars/experimental/Pulverizer PUL-2V.json',
    'CLAN',
  ],
  [
    'data/units/battlemechs/3-succession-wars/standard/Cestus CTS-6Y-EC.json',
    'CLAN',
  ],
  [
    'data/units/battlemechs/3-succession-wars/standard/Enfield END-6J-EC.json',
    'CLAN',
  ],
  [
    'data/units/battlemechs/3-succession-wars/standard/Excalibur EXC-B2b-EC.json',
    'CLAN',
  ],
  [
    'data/units/battlemechs/3-succession-wars/standard/Exterminator EXT-4Db-EC.json',
    'CLAN',
  ],
  ['data/units/battlemechs/3-succession-wars/standard/Marauder C.json', 'CLAN'],
  ['data/units/battlemechs/5-civil-war/standard/Osteon B.json', 'CLAN'],
  ['data/units/battlemechs/6-dark-age/advanced/Alpha Wolf A.json', 'CLAN'],
  ['data/units/battlemechs/6-dark-age/advanced/Alpha Wolf B.json', 'CLAN'],
  ['data/units/battlemechs/6-dark-age/advanced/Alpha Wolf C.json', 'CLAN'],
  ['data/units/battlemechs/6-dark-age/advanced/Alpha Wolf Prime.json', 'CLAN'],
  ['data/units/battlemechs/6-dark-age/advanced/Griffin C.json', 'CLAN'],
  ['data/units/battlemechs/6-dark-age/advanced/Grizzly 3.json', 'CLAN'],
  ['data/units/battlemechs/6-dark-age/advanced/Pack Hunter 5.json', 'CLAN'],
  ['data/units/battlemechs/6-dark-age/advanced/Rime Otter C.json', 'CLAN'],
  [
    'data/units/battlemechs/6-dark-age/experimental/Bakeneko BKN-1K.json',
    'CLAN',
  ],
  [
    'data/units/battlemechs/6-dark-age/experimental/Jade Phoenix E.json',
    'CLAN',
  ],
  ['data/units/battlemechs/6-dark-age/standard/Rhino Unknown.json', 'CLAN'],
] as const;
const selectionKeys = [
  'engineType',
  'engineRating',
  'internalStructureType',
  'armorType',
  'heatSinkType',
  'heatSinkCount',
  'gyroType',
  'cockpitType',
  'enhancement',
  'jumpJetType',
  'jumpMP',
] as const;
function selections(state: UnitStore) {
  return Object.fromEntries(
    selectionKeys.map((key) => [key, state[key] ?? null]),
  );
}
let activeSource: string;
let chassisContext: 'INNER_SPHERE' | 'CLAN' | undefined;
let lastCreatedId: string | undefined;
let repository: UnitRepository;
const originalFetch = global.fetch;
function response(body: unknown, status = 200): Response {
  // Only the HTTP response boundary is replaced; owned services remain real.
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    json: async () => body,
  } as Response;
}
async function transport(
  input: RequestInfo | URL,
  options: RequestInit = {},
): Promise<Response> {
  const url = new URL(
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url,
    'http://localhost',
  );
  const pathname = decodeURIComponent(url.pathname);
  if (pathname === '/api/units/custom' && options.method === 'POST') {
    const request = JSON.parse(String(options.body)) as ICreateUnitRequest;
    UnitContract.parse(request.data);
    const result = repository.create(request);
    if (result.success) lastCreatedId = result.data.id;
    return response(result, result.success ? 201 : 400);
  }
  if (pathname === '/api/units/custom')
    return response({ units: repository.list() });
  const match = /^\/api\/units\/custom\/([^/]+)$/.exec(pathname);
  if (match) {
    const record = repository.getById(match[1]);
    return record
      ? response({ ...record, parsedData: JSON.parse(record.data) })
      : response({}, 404);
  }
  const relative = pathname.replace(/^\//, '');
  const file = path.resolve(publicRoot, relative);
  if (!file.startsWith(publicRoot + path.sep))
    throw new Error('Outside fixture root');
  if (!existsSync(file)) return response({}, 404);
  const value = JSON.parse(readFileSync(file, 'utf8'));
  if (relative === activeSource) {
    // Exercise both variants even after the catalog gains the separate packet.
    delete value.componentTechBases?.chassis;
    if (chassisContext)
      value.componentTechBases = {
        ...value.componentTechBases,
        chassis: chassisContext,
      };
  }
  return response(value);
}
async function open(unit: IUnitIndexEntry, source: 'canonical' | 'custom') {
  let openedId: string | undefined;
  const showToast = jest.fn();
  await loadUnitIntoTab({
    unit,
    source,
    createTab: () => {
      throw new Error('Unexpected template fallback');
    },
    navigateToTab: (id) => {
      openedId = id;
    },
    setIsLoadDialogOpen: jest.fn(),
    setIsLoadingUnit: jest.fn(),
    showToast,
  });
  const store = openedId ? getUnitStore(openedId) : undefined;
  expect(
    showToast.mock.calls.filter(([event]) => event.variant === 'error'),
  ).toEqual([]);
  if (!store || !openedId) throw new Error('Library open failed');
  return { id: openedId, store, entry: unit };
}
async function openSource(
  source: (typeof sources)[number][0],
  context?: typeof chassisContext,
) {
  activeSource = source;
  chassisContext = context;
  const raw = JSON.parse(
    readFileSync(path.join(publicRoot, source), 'utf8'),
  ) as ISerializedUnit;
  const entry = (await getCanonicalUnitService().getIndex()).find(
    (unit) => unit.id === raw.id,
  );
  if (!entry) throw new Error(`Missing canonical index entry ${raw.id}`);
  return open(entry, 'canonical');
}
function reselectThroughButton(store: StoreApi<UnitStore>) {
  const view = render(
    createElement(
      UnitStoreContext.Provider,
      { value: store },
      createElement(ComponentTechnologyCard, { readOnly: false }),
    ),
  );
  fireEvent.click(
    view.getByTitle("Configure each component's tech base individually"),
  );
  view.unmount();
}
async function saveAndReopen(
  opened: Awaited<ReturnType<typeof open>>,
  variant: string,
) {
  const getTab = (id: string) =>
    useTabManagerStore.getState().tabs.find((tab) => tab.id === id);
  const hook = renderHook(() =>
    useDialogHandlers(jest.fn(), jest.fn(), getTab),
  );
  act(() => hook.result.current.openSaveDialog(opened.id));
  expect(hook.result.current.saveDialog.isOpen).toBe(true);
  lastCreatedId = undefined;
  await act(async () => {
    await hook.result.current.handleSaveDialogSave(
      opened.store.getState().chassis,
      variant,
    );
  });
  hook.unmount();
  if (!lastCreatedId) throw new Error('Library save failed');
  const record = repository.getById(lastCreatedId);
  if (!record) throw new Error('SQLite record missing');
  UnitContract.parse(JSON.parse(record.data));
  clearAllStores(true);
  useTabManagerStore.setState({ tabs: [], activeTabId: null });
  return open(
    {
      ...opened.entry,
      id: record.id,
      chassis: record.chassis,
      variant: record.variant,
    },
    'custom',
  );
}
function expectNoWrite(store: StoreApi<UnitStore>, action: () => void) {
  const before = store.getState();
  const fingerprint = getUnitDraftFingerprint(before);
  const draft = localStorage.getItem(`megamek-unit-${before.id}`);
  const history = getUnitEditHistory(store);
  const historyBefore = history.getState();
  const notification = jest.fn();
  const unsubscribe = store.subscribe(notification);
  const storageWrite = jest.spyOn(Storage.prototype, 'setItem');
  action();
  unsubscribe();
  const persistenceWrites = storageWrite.mock.calls.length;
  storageWrite.mockRestore();
  expect({
    stateIdentityPreserved: store.getState() === before,
    notifications: notification.mock.calls.length,
    persistenceWrites,
    isModified: store.getState().isModified,
    lastModifiedAt: store.getState().lastModifiedAt,
  }).toEqual({
    stateIdentityPreserved: true,
    notifications: 0,
    persistenceWrites: 0,
    isModified: before.isModified,
    lastModifiedAt: before.lastModifiedAt,
  });
  expect(getUnitDraftFingerprint(store.getState())).toBe(fingerprint);
  expect(localStorage.getItem(`megamek-unit-${before.id}`)).toBe(draft);
  expect(history.getState()).toBe(historyBefore);
}
beforeAll(() => {
  global.fetch = transport;
  getSQLiteService({ path: ':memory:' }).initialize();
  repository = new UnitRepository();
});
beforeEach(() => {
  localStorage.clear();
  useTabManagerStore.setState({ tabs: [], activeTabId: null });
  resetCanonicalUnitService();
});
afterEach(() => {
  cleanup();
  clearAllStores(true);
  localStorage.clear();
});
afterAll(() => {
  resetSQLiteService();
  global.fetch = originalFetch;
});

describe.each([false, true])(
  'same Mixed mode, explicit chassis=%s',
  (withChassis) => {
    test.each(sources)(
      '%s preserves selections through action, save and reopen',
      async (source, chassis) => {
        const opened = await openSource(
          source,
          withChassis ? chassis : undefined,
        );
        const before = selections(opened.store.getState());
        const componentTechBases = opened.store.getState().componentTechBases;
        expect(opened.store.getState().techBaseMode).toBe(TechBaseMode.MIXED);
        expectNoWrite(opened.store, () => reselectThroughButton(opened.store));
        expect(selections(opened.store.getState())).toEqual(before);
        expect(opened.store.getState().componentTechBases).toEqual(
          componentTechBases,
        );
        const reopened = await saveAndReopen(
          opened,
          `mixed-preservation-${withChassis}-${path.basename(source)}`,
        );
        expect(selections(reopened.store.getState())).toEqual(before);
        expect(reopened.store.getState().componentTechBases).toEqual(
          componentTechBases,
        );
      },
    );
  },
);

test.each([TechBase.INNER_SPHERE, TechBase.CLAN])(
  'same pure %s is a no-op with undo and redo history',
  (techBase) => {
    const store = createNewUnitStore({
      name: 'No-op control',
      tonnage: 75,
      techBase,
    });
    store.getState().markModified(false);
    store.getState().setEngineRating(store.getState().engineRating + 5);
    const history = getUnitEditHistory(store);
    history.getState().undo();
    expect(history.getState().canRedo).toBe(true);
    expectNoWrite(store, () =>
      store.getState().setTechBaseMode(store.getState().techBaseMode),
    );
    history.getState().redo();
    expectNoWrite(store, () =>
      store.getState().setTechBaseMode(store.getState().techBaseMode),
    );
  },
);

test('genuine global switches still normalize and restore fixed-mode memory; component toggles still normalize', () => {
  const store = createNewUnitStore({
    name: 'Switch control',
    tonnage: 75,
    techBase: TechBase.INNER_SPHERE,
  });
  store.getState().setEngineType(EngineType.XL_IS);
  store
    .getState()
    .setInternalStructureType(InternalStructureType.ENDO_STEEL_IS);
  store.getState().setTechBaseMode(TechBaseMode.MIXED);
  store.getState().setTechBaseMode(TechBaseMode.CLAN);
  expect(store.getState().componentTechBases).toEqual(
    createDefaultComponentTechBases(TechBase.CLAN),
  );
  expect(store.getState().engineType).toBe(EngineType.STANDARD);
  expect(store.getState().internalStructureType).toBe(
    InternalStructureType.STANDARD,
  );
  store.getState().setEngineType(EngineType.XL_CLAN);
  store.getState().setTechBaseMode(TechBaseMode.INNER_SPHERE);
  expect(store.getState().componentTechBases).toEqual(
    createDefaultComponentTechBases(TechBase.INNER_SPHERE),
  );
  expect(store.getState().engineType).toBe(EngineType.XL_IS);
  expect(store.getState().internalStructureType).toBe(
    InternalStructureType.ENDO_STEEL_IS,
  );
  store.getState().setTechBaseMode(TechBaseMode.CLAN);
  expect(store.getState().engineType).toBe(EngineType.XL_CLAN);
  store.getState().setTechBaseMode(TechBaseMode.MIXED);
  store
    .getState()
    .setComponentTechBase(TechBaseComponent.ENGINE, TechBase.INNER_SPHERE);
  expect(store.getState().engineType).toBe(EngineType.XL_IS);
  store
    .getState()
    .setComponentTechBase(TechBaseComponent.ENGINE, TechBase.CLAN);
  expect(store.getState().engineType).toBe(EngineType.XL_CLAN);
});

test('structure and armor actions change only their requested selection', async () => {
  const { store } = await openSource(sources[4][0], sources[4][1]);
  const before = selections(store.getState());
  expect(store.getState().internalStructureType).not.toBe(
    InternalStructureType.STANDARD,
  );
  expect(store.getState().armorType).not.toBe(ArmorTypeEnum.STANDARD);
  act(() =>
    store.getState().setInternalStructureType(InternalStructureType.STANDARD),
  );
  expect(selections(store.getState())).toEqual({
    ...before,
    internalStructureType: InternalStructureType.STANDARD,
  });
  act(() => store.getState().setArmorType(ArmorTypeEnum.STANDARD));
  expect(selections(store.getState())).toEqual({
    ...before,
    internalStructureType: InternalStructureType.STANDARD,
    armorType: ArmorTypeEnum.STANDARD,
  });
});

test('entering Mixed supplies mode context and retains an independently legal structure', () => {
  const store = createNewUnitStore({
    name: 'Mixed transition',
    tonnage: 75,
    techBase: TechBase.CLAN,
  });
  // The public component setter can install an IS structure before switching mode.
  store.getState().setInternalStructureType(InternalStructureType.REINFORCED);
  const before = selections(store.getState());
  store.getState().setTechBaseMode(TechBaseMode.MIXED);
  expect(selections(store.getState())).toEqual(before);
  expect(store.getState().componentTechBases.chassis).toBe(TechBase.CLAN);
});
