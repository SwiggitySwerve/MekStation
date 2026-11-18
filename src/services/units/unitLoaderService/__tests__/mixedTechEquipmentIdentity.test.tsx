import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';

import { EditorLoadDiagnostics } from '@/components/customizer/shared/UnrecoveredCriticalSlotsNotice';
import { TargetedSaveUnitDialog } from '@/components/customizer/tabs/MultiUnitTabs';
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
import { getUnitLibraryFingerprint } from '@/stores/unit/unitEditSnapshot';
import { UnitState } from '@/stores/unitState';
import {
  clearAllStores,
  getUnitStore,
  hydrateOrCreateUnit,
} from '@/stores/unitStoreRegistry';
import { useTabManagerStore } from '@/stores/useTabManagerStore';
import { UnitStoreContext } from '@/stores/useUnitStore';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { UnitContract } from '@/types/contracts';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';
import { ICreateUnitRequest } from '@/types/persistence/UnitPersistence';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { serializeCustomUnitState } from '@/utils/serialization/CustomUnitSerializer';
import { getEraForYear } from '@/utils/temporal/eraUtils';

import { parseUnit, unitLoaderService } from '../../unitLoaderService';
import { getCriticalSlotsForLocation } from '../criticalSlotEquipment';
import { isDefinitionForFamily } from '../definitionTypes';
import { mapEquipment } from '../equipmentMapping';
import { resolveEquipmentId } from '../equipmentResolution';
import oldMainSaves from './fixtures/old-main-ammo-identity/manifest.json';
import { unitStateBV as ammoIdentityBV } from './unitStateBV.helpers';

let mockNextOldSaveUUID: string | undefined;
jest.mock('uuid', () => {
  const actual = jest.requireActual<typeof import('uuid')>('uuid');
  return {
    ...actual,
    v4: () => {
      if (mockNextOldSaveUUID) {
        const value = mockNextOldSaveUUID;
        mockNextOldSaveUUID = undefined;
        return value;
      }
      return actual.v4();
    },
  };
});

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
    if (options.method === 'PUT') {
      const request = JSON.parse(String(options.body));
      UnitContract.parse(request.data);
      const result = repository.update(custom[1], request);
      return response(result, result.success ? 200 : 400);
    }
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

async function saveThroughDialog(loaded: UnitState, overwriteId?: string) {
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
      overwriteId ? loaded.model : `identity-${loaded.model}`,
      overwriteId,
    );
  });
  hook.unmount();
  const targetId = overwriteId ?? savedId;
  if (!targetId) throw new Error('The save hook did not persist a unit');
  const record = repository.getById(targetId);
  if (!record) throw new Error('Missing SQLite row');
  const persisted = UnitContract.parse(JSON.parse(record.data));
  if (!isDefinitionForFamily('battlemechs', persisted)) {
    throw new Error('The saved fixture is not a BattleMech');
  }
  return { id: targetId, persisted };
}

beforeAll(async () => {
  global.fetch = transport;
  await getEquipmentLookupService().initialize();
  await getEquipmentRegistry().initialize();
  expect(getEquipmentLookupService().getDataSource()).toBe('json');
  expect(getEquipmentRegistry().isReady()).toBe(true);
});
beforeEach(() => {
  mockNextOldSaveUUID = undefined;
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

function oldSaveSlotFacts(state: UnitState) {
  return state.equipment
    .map((item) =>
      JSON.stringify([
        item.equipmentId,
        item.category,
        item.techBase,
        item.location,
        item.slots,
        item.splitSlots,
        item.spreadSlots,
        item.isRearMounted,
        item.weight,
        item.criticalSlots,
      ]),
    )
    .sort();
}

describe('frozen main-writer old saves', () => {
  it.each(oldMainSaves.fixtures)(
    '$catalogId opens without slot changes and stabilizes after the first A overwrite',
    async (fixture) => {
      const bytes = readFileSync(
        resolve(__dirname, 'fixtures/old-main-ammo-identity', fixture.file),
      );
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(
        fixture.sha256,
      );
      const raw: unknown = JSON.parse(bytes.toString('utf8'));
      const definition = UnitContract.parse(raw);
      if (
        !isDefinitionForFamily('battlemechs', definition) ||
        !raw ||
        typeof raw !== 'object'
      )
        throw new Error('Invalid frozen BattleMech document');
      // Only external UUID creation is fixed, preserving the actual old library
      // identity and complete JSON bytes while using the real repository.
      mockNextOldSaveUUID = fixture.libraryId.slice('custom-'.length);
      const seeded = repository.create({
        chassis: definition.chassis,
        variant: definition.model,
        data: raw as Record<string, unknown>,
      });
      if (!seeded.success) throw new Error(JSON.stringify(seeded.error));
      expect(seeded.data.id).toBe(fixture.libraryId);
      expect(repository.getById(fixture.libraryId)?.data).toBe(
        bytes.toString('utf8'),
      );

      let store = await open(fixture.libraryId, 'custom', fixture.catalogId);
      let state = store.getState();
      expect(oldSaveSlotFacts(state)).toEqual(fixture.mainOpen.slots);
      expect(state.bvContext?.source.criticalSlots).toEqual(
        fixture.mainOpen.criticalSlots,
      );
      expect(ammoIdentityBV(state).bv).toBe(fixture.mainOpen.bv);
      expect(ammoIdentityBV(state).breakdown?.ammoBV).toBeCloseTo(
        fixture.mainOpen.ammoBV,
        7,
      );
      expect(state.sourceDefinition).toEqual(fixture.sourceDefinition);
      expect(state.unrecoveredCriticalSlots).toEqual(
        fixture.mainOpen.unrecoveredCriticalSlots,
      );
      // The original spellings are absent even though the mounted IDs and catalog
      // link survive. A preserves available evidence; it does not repair old saves.
      for (const cell of fixture.nativeAmmoCells) {
        expect(bytes.toString('utf8')).not.toContain(cell.native);
        expect(definition.equipment).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: cell.equipmentId,
              location: cell.location,
              slots: [cell.slot],
            }),
          ]),
        );
      }

      const view = render(
        <UnitStoreContext.Provider value={store}>
          <EditorLoadDiagnostics />
          <TargetedSaveUnitDialog
            isOpen
            currentUnitId={state.id}
            initialChassis={state.chassis}
            initialVariant={state.model}
            onSave={jest.fn()}
            onCancel={jest.fn()}
          />
        </UnitStoreContext.Provider>,
      );
      await waitFor(
        () =>
          expect(
            screen.queryByRole('button', { name: 'Overwrite' }),
          ).not.toBeNull(),
        { timeout: 15000 },
      );
      await waitFor(
        () =>
          expect(
            screen.queryByText('Checking construction readiness...'),
          ).toBeNull(),
        { timeout: 15000 },
      );
      const notice = screen.queryByRole('note', {
        name: 'Critical-slot entries lost on save',
      });
      expect(notice).toBeNull();
      expect(screen.queryByRole('button', { name: 'Save anyway' })).toBeNull();
      const dialog = screen.getByRole('dialog');
      expect(dialog.textContent).toBe(
        `Save UnitChassis NameVariant DesignationSuggestConflicts with existing custom unitFull Unit Name:${state.chassis} ${state.model}CancelOverwrite`,
      );
      expect(
        within(dialog)
          .getByRole('button', { name: 'Overwrite' })
          .hasAttribute('disabled'),
      ).toBe(false);
      const ui = {
        editorNotice: notice?.textContent ?? null,
        dialogText: dialog.textContent,
        buttons: within(dialog)
          .getAllByRole('button')
          .map((button) => ({
            text: button.textContent,
            disabled: button.hasAttribute('disabled'),
          })),
      };
      view.unmount();

      let firstBytes: string | undefined;
      const hashes: string[] = [];
      for (let cycle = 0; cycle < 3; cycle++) {
        await saveThroughDialog(state, fixture.libraryId);
        const saved = repository.getById(fixture.libraryId)?.data;
        if (!saved) throw new Error('Missing overwritten SQLite document');
        // The only first-overwrite difference is the existing library-ID adoption.
        // In particular the old unmarked ammo cells are not silently reconstructed.
        expect(saved).toBe(JSON.stringify({ ...raw, id: fixture.libraryId }));
        if (firstBytes === undefined) firstBytes = saved;
        expect(saved).toBe(firstBytes);
        hashes.push(createHash('sha256').update(saved).digest('hex'));
        clearAllStores(true);
        useTabManagerStore.setState({ tabs: [], activeTabId: null });
        store = await open(fixture.libraryId, 'custom', fixture.catalogId);
        state = store.getState();
        expect(oldSaveSlotFacts(state)).toEqual(fixture.mainOpen.slots);
        expect(ammoIdentityBV(state).bv).toBe(fixture.mainOpen.bv);
        expect(ammoIdentityBV(state).breakdown?.ammoBV).toBeCloseTo(
          fixture.mainOpen.ammoBV,
          7,
        );
      }
      expect(new Set(hashes).size).toBe(1);
      expect(hashes[0]).toBe(
        {
          'sentinel-stn-3l':
            '4c3d0f5c0538bf1b38a11c7f1f8185368749f5366b7c6963b4c01e700b84726b',
          'warhammer-whm-6r':
            '725ff0f4d8b510704f7281eb090999a4b4319e3aed1038d4f3096abc570ab6ba',
        }[fixture.catalogId],
      );
      console.info(
        'OLD_SAVE_PROOF',
        JSON.stringify({
          catalogId: fixture.catalogId,
          oldSha: fixture.sha256,
          hashes,
          ui,
          slotsChanged: [],
          bv: ammoIdentityBV(state).bv,
          ammo: ammoIdentityBV(state).breakdown?.ammoBV,
        }),
      );
    },
  );
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
  'jade-phoenix-e',
  'kodiak-ii-3',
])(
  'preserves %s identities through dialog save, SQLite and custom reopen',
  async (id) => {
    const store = await open(id, 'canonical');
    const loaded = store.getState();
    const expected = identities(loaded);
    const { id: customId, persisted } = await saveThroughDialog(loaded);
    expect(persisted.equipment?.map((item) => item.id).sort()).toEqual(
      loaded.equipment.map((item) => item.equipmentId).sort(),
    );
    expect(identities(store.getState())).toEqual(expected);
    clearAllStores(true);
    useTabManagerStore.setState({ tabs: [], activeTabId: null });
    const reopened = (await open(customId, 'custom', id)).getState();
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

const nativeLaserArm = [
  'Shoulder',
  'Upper Arm Actuator',
  'Lower Arm Actuator',
  'Hand Actuator',
  'CLERMediumLaser',
  'CLERMediumLaser',
  'CLERMediumLaser',
  'ISERMediumLaser',
  'ISERMediumLaser',
  'Medium Laser',
  'Clan Endo Steel',
  null,
] as const;

// MtfFile.java:1210-1212: Mixed equipment lookup has no chassis restriction.
it.each([TechBase.INNER_SPHERE, TechBase.CLAN])(
  'resolves a placed saved IS ID before native neighbours on %s',
  (tech) => {
    for (const slots of [[7], [8], [4], [], [-1], [99], [7, 7]]) {
      const result = resolveEquipmentId(
        'er-medium-laser',
        tech,
        TechBaseMode.MIXED,
        nativeLaserArm,
        undefined,
        slots,
      );
      expect(result.resolvedId).toBe('er-medium-laser');
      expect(result.equipmentDef?.techBase).toBe(TechBase.INNER_SPHERE);
    }
  },
);

it('carries an empty saved placement without borrowing neighbouring hints', () => {
  const mounted = mapEquipment(
    [{ id: 'er-medium-laser', location: 'Left Arm', slots: [] }],
    TechBase.CLAN,
    TechBaseMode.MIXED,
    { LEFT_ARM: nativeLaserArm },
    100,
  );
  expect(mounted[0]).toMatchObject({
    equipmentId: 'er-medium-laser',
    techBase: TechBase.INNER_SPHERE,
    slots: [],
  });
});

it.each([
  [['CLERMediumLaser', 'ISERMediumLaser'], [1], 'er-medium-laser'],
  [['ISERMediumLaser', 'CLERMediumLaser'], [1], 'clan-er-medium-laser'],
  [['CLERMediumLaser'], [], 'er-medium-laser'],
  [['CLERMediumLaser'], [-1], 'er-medium-laser'],
  [['CLERMediumLaser'], [99], 'er-medium-laser'],
  [['ISERMediumLaser', 'CLERMediumLaser'], [0, 99], 'er-medium-laser'],
] as const)(
  'uses only owned cells for the unresolved ERMediumLaser alias (%s, %s)',
  (cells, slots, expected) => {
    expect(
      resolveEquipmentId(
        'ERMediumLaser',
        TechBase.CLAN,
        TechBaseMode.MIXED,
        cells,
        undefined,
        slots,
      ).resolvedId,
    ).toBe(expected);
  },
);

it('retains whole-location hints for an unplaced source summary', () => {
  expect(
    resolveEquipmentId(
      'er-medium-laser',
      TechBase.INNER_SPHERE,
      TechBaseMode.MIXED,
      nativeLaserArm,
    ).resolvedId,
  ).toBe('clan-er-medium-laser');
});

it.each([TechBase.INNER_SPHERE, TechBase.CLAN])(
  "retains a display token's own Clan identity on %s",
  (tech) => {
    const result = resolveEquipmentId(
      'LB 20-X AC (Clan)',
      tech,
      TechBaseMode.MIXED,
      ['ISLBXAC20', 'LB 20-X AC (Clan)'],
    );
    expect(result.resolvedId).toBe('clan-lb-20-x-ac');
    expect(result.equipmentDef?.techBase).toBe(TechBase.CLAN);
    expect(result.equipmentDef?.criticalSlots).toBe(9);
  },
);

it.each(['kodiak-cale', 'jade-phoenix-e', 'kodiak-ii-3'])(
  'preserves %s mounted facts through SQLite with intact native grids',
  async (id) => {
    const loaded = (await open(id, 'canonical')).getState();
    const sourceGrid = loaded.bvContext?.source.criticalSlots;
    if (!sourceGrid) throw new Error('Missing native critical fixture');
    const nativeGrid = Object.fromEntries(
      Object.entries(sourceGrid).map(([location, cells]) => [
        location,
        [...cells],
      ]),
    );
    if (id === 'kodiak-cale') {
      expect(nativeGrid.LEFT_ARM).toEqual(nativeLaserArm);
    }
    const relevantFacts = (state: UnitState) =>
      state.equipment
        .filter((item) =>
          id === 'kodiak-cale'
            ? item.equipmentId.includes('er-medium-laser')
            : item.equipmentId === 'clan-lb-20-x-ac' &&
              item.category !== EquipmentCategory.AMMUNITION,
        )
        .map((item) =>
          JSON.stringify([
            item.equipmentId,
            item.techBase,
            item.category,
            item.name,
            item.location,
            item.isRearMounted,
            item.slots,
            item.splitSlots,
            item.weight,
            item.criticalSlots,
            item.heat,
            item.isRemovable,
            item.isOmniPodMounted,
            item.linkedAmmoId,
          ]),
        )
        .sort();
    const expected = relevantFacts(loaded);
    expect(expected).toHaveLength(id === 'kodiak-cale' ? 5 : 1);
    const { id: customId, persisted } = await saveThroughDialog(loaded);
    // Fixture-level g.2b grid shape, independent of that writer PR landing.
    const nativeDefinition = UnitContract.parse({
      ...persisted,
      criticalSlots: nativeGrid,
    });
    expect(
      repository.update(customId, { data: nativeDefinition }).success,
    ).toBe(true);
    const row = repository.getById(customId);
    if (!row) throw new Error('Missing native-grid SQLite row');
    expect(UnitContract.parse(JSON.parse(row.data)).criticalSlots).toEqual(
      nativeGrid,
    );
    clearAllStores(true);
    useTabManagerStore.setState({ tabs: [], activeTabId: null });
    const reopened = (await open(customId, 'custom', id)).getState();
    expect(relevantFacts(reopened)).toEqual(expected);
  },
);

function ammoMountFacts(state: UnitState) {
  return state.equipment
    .filter((item) => item.category === EquipmentCategory.AMMUNITION)
    .map((item) =>
      JSON.stringify([
        item.equipmentId,
        item.category,
        item.techBase,
        item.location,
        item.slots,
        item.isRearMounted,
        item.weight,
        item.criticalSlots,
      ]),
    )
    .sort();
}

function saveAmmoIdentity(state: UnitState) {
  const era = getEraForYear(state.year);
  if (!era) throw new Error(`Missing fixture era for ${state.year}`);
  const serialized = serializeCustomUnitState(state, {
    id: state.id,
    chassis: state.chassis,
    variant: state.model,
    era,
  });
  const definition = UnitContract.parse(serialized);
  const result = repository.create({
    chassis: state.chassis,
    variant: state.model,
    data: definition,
  });
  if (!result.success) throw new Error(JSON.stringify(result.error));
  const record = repository.getById(result.data.id);
  if (!record) throw new Error('Missing ammo-identity SQLite row');
  const readback = UnitContract.parse(JSON.parse(record.data));
  expect(readback).toEqual(definition);
  return {
    saved: readback,
    reopened: unitLoaderService.mapToUnitState(parseUnit(readback), false),
  };
}

// Java reference 4e19c56b957de2a8fc70dbfd131e76b64caa05adf8ba145b1610cc6b3ec37d87:
// exact source-path/MTF-hash joins in the 73ef85c97 metric-only classification.
// MegaMek 48fcb2f64 MtfFile.java:1052-1064,1210-1212: own native identity.
// AmmoType.java:10617-10692 (IS Streak bins: 4/7/11),8566-8579 (Clan LRM-20: 27).
describe('source ammo identity round trips', () => {
  it.each([
    ['sentinel-stn-3l', 717],
    ['archer-c', 1811],
  ] as const)(
    '%s stays on Java BV %i before save and after real SQLite reopen',
    async (id, javaBV) => {
      const loaded = (await open(id, 'canonical')).getState();
      const fingerprint = getUnitLibraryFingerprint(loaded);
      // A2 adds only native CT engine cells 0-2 and 7-9. The old hashes were
      // reproduced on main; non-cell facts, draft fingerprints and Java BV stay.
      const writerFingerprints = {
        'sentinel-stn-3l':
          'f7a347a17721587f85062f8b598c829e977a51e80fc3999099614b26ed7bdd85',
        'archer-c':
          '2b0394a3dfab8421a9559d0efd44a379bbf172a3293f2f629b031d656ca8b822',
      };
      expect(createHash('sha256').update(fingerprint).digest('hex')).toBe(
        writerFingerprints[id],
      );
      expect(ammoIdentityBV(loaded).bv).toBe(javaBV);
      const { saved, reopened } = saveAmmoIdentity(loaded);
      for (const mount of loaded.equipment.filter(
        (item) => item.category === EquipmentCategory.AMMUNITION,
      )) {
        for (const slot of mount.slots ?? []) {
          expect(
            getCriticalSlotsForLocation(saved.criticalSlots, mount.location)?.[
              slot
            ],
          ).toBe(
            getCriticalSlotsForLocation(
              loaded.bvContext?.source.criticalSlots,
              mount.location,
            )?.[slot],
          );
        }
      }
      expect(ammoIdentityBV(reopened).bv).toBe(javaBV);
      expect(identities(reopened)).toEqual(identities(loaded));
      expect(getUnitLibraryFingerprint(loaded)).toBe(fingerprint);
    },
  );

  const javaAmmoTerms: readonly {
    id: string;
    ammoBV: number;
    available: Readonly<Record<string, number>>;
    cap: Readonly<Record<string, number>>;
  }[] = [
    {
      id: 'sentinel-stn-3l',
      ammoBV: 18.0,
      available: {
        'AC_ULTRA:5': 14.0,
        'SRM_STREAK:2': 4.0,
      },
      cap: {
        'AC_ULTRA:5': 112.0,
        'SRM_STREAK:2': 30.0,
      },
    },
    {
      id: 'spartan-spt-n1',
      ammoBV: 8.0,
      available: {
        'SRM_STREAK:2': 8.0,
      },
      cap: {
        'AMS:2': 32.0,
        'SRM_STREAK:2': 60.0,
      },
    },
    {
      id: 'spartan-spt-n2',
      ammoBV: 8.0,
      available: {
        'SRM_STREAK:2': 8.0,
      },
      cap: {
        'AMS:2': 32.0,
        'SRM_STREAK:2': 60.0,
      },
    },
    {
      id: 'awesome-aws-9m',
      ammoBV: 4.0,
      available: {
        'SRM_STREAK:2': 4.0,
      },
      cap: {
        'SRM_STREAK:2': 60.0,
      },
    },
    {
      id: 'crusader-crd-4d',
      ammoBV: 38.0,
      available: {
        'LRM:15': 34.0,
        'SRM_STREAK:2': 4.0,
      },
      cap: {
        'LRM:15': 272.0,
        'SRM_STREAK:2': 60.0,
      },
    },
    {
      id: 'crusader-crd-4l',
      ammoBV: 38.0,
      available: {
        'LRM:15': 34.0,
        'SRM_STREAK:2': 4.0,
      },
      cap: {
        'LRM:15': 272.0,
        'SRM_STREAK:2': 60.0,
      },
    },
    {
      id: 'kraken-unknown',
      ammoBV: 32.5,
      available: {
        'AC_ULTRA:2': 32.0,
        'MG:2': 0.5,
      },
      cap: {
        'AC_ULTRA:2': 620.0,
        'MG:2': 20.0,
      },
    },
    {
      id: 'archer-c',
      ammoBV: 108.0,
      available: {
        'LRM:20': 108.0,
      },
      cap: {
        'LRM:20': 440.0,
      },
    },
    {
      id: 'marauder-c',
      ammoBV: 15.0,
      available: {
        'AC_ULTRA:5': 15.0,
      },
      cap: {
        'AC_ULTRA:5': 122.0,
      },
    },
    {
      id: 'naja-kto-19b-ec',
      ammoBV: 52.0,
      available: {
        'LRM:20': 27.0,
        'SRM:4': 5.0,
        'SRM_IMP:6': 20.0,
      },
      cap: {
        'LRM:20': 220.0,
        'SRM:4': 78.0,
        'SRM_IMP:6': 158.0,
      },
    },
    {
      id: 'atlas-as7-s',
      ammoBV: 123.0,
      available: {
        'AC:20': 66.0,
        'LRM:20': 46.0,
        'SRM:6': 7.0,
        'SRM_STREAK:2': 4.0,
      },
      cap: {
        'AC:20': 178.0,
        'LRM:20': 181.0,
        'SRM:6': 59.0,
        'SRM_STREAK:2': 60.0,
      },
    },
    {
      id: 'ha-otoko-unknown',
      ammoBV: 190.0,
      available: {
        'LRM:10': 28.0,
        'LRM:20': 162.0,
      },
      cap: {
        'LRM:10': 218.0,
        'LRM:20': 440.0,
      },
    },
    {
      id: 'warhammer-whm-7s',
      ammoBV: 4.0,
      available: {
        'SRM_STREAK:2': 4.0,
      },
      cap: {
        'SRM_STREAK:2': 60.0,
      },
    },
    {
      id: 'bear-cub-3',
      ammoBV: 14.0,
      available: {
        'LRM:5': 14.0,
      },
      cap: {
        'LRM:5': 110.0,
      },
    },
    {
      id: 'bear-cub-unknown',
      ammoBV: 12.0,
      available: {
        'LRM:5': 7.0,
        'SRM:4': 5.0,
      },
      cap: {
        'LRM:5': 55.0,
        'SRM:4': 39.0,
      },
    },
    {
      id: 'cestus-cts-7a',
      ammoBV: 97.0,
      available: {
        'AC_LBX:20': 90.0,
        'SRM_STREAK:4': 7.0,
      },
      cap: {
        'AC_LBX:20': 237.0,
        'SRM_STREAK:4': 118.0,
      },
    },
    {
      id: 'cyclops-cp-11-c2',
      ammoBV: 7.0,
      available: {
        'SRM_STREAK:4': 7.0,
      },
      cap: {
        'SRM_STREAK:4': 59.0,
      },
    },
    {
      id: 'sunder-sd1-oe',
      ammoBV: 49.0,
      available: {
        'AC_LBX:10': 38.0,
        'SRM_STREAK:6': 11.0,
      },
      cap: {
        'AC_LBX:10': 148.0,
        'SRM_STREAK:6': 178.0,
      },
    },
    {
      id: 'ha-otoko-hr',
      ammoBV: 136.79999999999995,
      available: {
        'LRM:20': 108.0,
        'MEK_MORTAR:8': 28.8,
      },
      cap: {
        'LRM:20': 440.0,
        'MEK_MORTAR:8': 100.0,
      },
    },
    {
      id: 'crosscut-ed-x4m-l-loggermech-mod',
      ammoBV: 10.0,
      available: {
        'AC_LBX:5': 10.0,
      },
      cap: {
        'AC_LBX:5': 83.0,
      },
    },
  ];
  it.each(javaAmmoTerms)(
    '$id retains all Java ammo terms through SQLite',
    async (expected) => {
      const loaded = (await open(expected.id, 'canonical')).getState();
      const { reopened } = saveAmmoIdentity(loaded);
      expect(ammoMountFacts(reopened)).toEqual(ammoMountFacts(loaded));
      for (const state of [loaded, reopened]) {
        const { breakdown } = ammoIdentityBV(state);
        if (!breakdown?.ammoPools) throw new Error('Missing ammo terms');
        expect(breakdown.ammoBV).toBeCloseTo(expected.ammoBV, 7);
        for (const field of ['available', 'cap'] as const) {
          // Java reports defensive AMS caps too; our diagnostic cap projection
          // retains those while the offensive pools intentionally exclude them.
          const actual =
            field === 'cap'
              ? (breakdown.ammoDiagnosticPools?.cap ?? breakdown.ammoPools.cap)
              : breakdown.ammoPools.available;
          expect(Object.keys(actual).sort()).toEqual(
            Object.keys(expected[field]).sort(),
          );
          for (const [key, value] of Object.entries(expected[field])) {
            expect(actual[key]).toBeCloseTo(value, 7);
          }
        }
      }
    },
  );

  it('rejects stale native ammo evidence after a bin identity edit', async () => {
    const loaded = (await open('sentinel-stn-3l', 'canonical')).getState();
    const bin = loaded.equipment.find(
      (item) =>
        item.category === EquipmentCategory.AMMUNITION &&
        item.name.includes('Streak'),
    );
    if (!bin?.location || !bin.slots?.length)
      throw new Error('Missing Streak bin');
    const edited: UnitState = {
      ...loaded,
      equipment: loaded.equipment.map((item) =>
        item === bin
          ? { ...item, equipmentId: 'ammo-srm-2', name: 'SRM 2 Ammo' }
          : item,
      ),
    };
    const { saved } = saveAmmoIdentity(edited);
    expect(
      getCriticalSlotsForLocation(saved.criticalSlots, bin.location)?.[
        bin.slots[0]
      ],
    ).toBe('SRM 2 Ammo');
    expect(getUnitLibraryFingerprint(edited)).not.toBe(
      getUnitLibraryFingerprint(loaded),
    );
  });

  it('keeps overlapping ammo evidence separate from W and chassis totals', async () => {
    for (const [id, javaBV] of [
      ['atlas-c', 2340],
      ['marauder-c', 1711],
    ] as const) {
      const loaded = (await open(id, 'canonical')).getState();
      const before = ammoIdentityBV(loaded);
      const { reopened } = saveAmmoIdentity(loaded);
      const after = ammoIdentityBV(reopened);
      expect(before.bv).toBe(javaBV);
      expect(after.breakdown?.ammoPools?.available).toEqual(
        before.breakdown?.ammoPools?.available,
      );
      // W weapon admission belongs to C1; Clan chassis transport is #3316/BVK3.
      // Do not freeze their incorrect totals as expected behavior in this suite.
    }
  });
});
