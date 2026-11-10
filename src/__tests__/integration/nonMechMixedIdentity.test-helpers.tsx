import type { NextApiRequest, NextApiResponse } from 'next';

import { act, cleanup, renderHook } from '@testing-library/react';
import { createMocks } from 'node-mocks-http';
import fs from 'node:fs';
import path from 'node:path';

import type { IUnitTechBaseIdentity } from '@/types/construction/TechBaseConfiguration';
import type { TechBase } from '@/types/enums/TechBase';
import type { UnitFamily } from '@/types/unit/UnitIndex';

import {
  getLibrarySaveStore,
  getLibrarySaveEditor,
} from '@/components/customizer/tabs/MultiUnitTabsUnitState';
import { useDialogHandlers } from '@/components/customizer/tabs/useMultiUnitTabsController.dialogs';
import { loadUnitIntoTab } from '@/components/customizer/tabs/useMultiUnitTabsController.helpers';
import { ToastProvider } from '@/components/shared/Toast';
import listHandler from '@/pages/api/units/custom';
import customHandler from '@/pages/api/units/custom/[id]';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import {
  getCanonicalUnitService,
  resetCanonicalUnitService,
} from '@/services/units/CanonicalUnitService';
import {
  getUnitRepository,
  resetUnitRepository,
} from '@/services/units/UnitRepository';
import { clearAllAerospaceStores } from '@/stores/aerospaceStoreRegistry';
import { clearAllBattleArmorStores } from '@/stores/battleArmorStoreRegistry';
import { clearAllInfantryStores } from '@/stores/infantryStoreRegistry';
import { clearAllProtoMechStores } from '@/stores/protoMechStoreRegistry';
import {
  getEditorDraftFingerprint,
  getEditorLibraryFingerprint,
  getEditorSaveState,
} from '@/stores/unitSaveStateAdapters';
import { useTabManagerStore } from '@/stores/useTabManagerStore';
import { clearAllVehicleStores } from '@/stores/vehicleStoreRegistry';
import { UnitContract, type IUnitContract } from '@/types/contracts';

/** Fixture HTTP only; definition admission, stores, save hook, routes and SQLite are real. */
export async function roundTripNonMechLibrary(
  family: UnitFamily,
  definition: IUnitContract,
): Promise<{
  loaded: IUnitTechBaseIdentity & { techBase: TechBase };
  draft: string;
  library: string;
  saved: IUnitContract;
  reopened: IUnitTechBaseIdentity & { techBase: TechBase };
  secondSave: IUnitContract;
}> {
  const originalFetch = global.fetch;
  resetCanonicalUnitService();
  resetUnitRepository();
  resetSQLiteService();
  getSQLiteService({ path: ':memory:' }).initialize();
  useTabManagerStore.setState({ tabs: [], activeTabId: null });
  global.fetch = async (input, init) => {
    const url = new URL(String(input), 'http://localhost');
    const id = /^\/api\/units\/custom\/([^/]+)$/.exec(url.pathname)?.[1];
    if (id || url.pathname === '/api/units/custom') {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method:
          init?.method === 'POST'
            ? 'POST'
            : init?.method === 'PUT'
              ? 'PUT'
              : 'GET',
        query: id ? { id: decodeURIComponent(id) } : {},
      });
      req.body = init?.body ? JSON.parse(String(init.body)) : undefined;
      await (id ? customHandler : listHandler)(req, res);
      return {
        ok: res._getStatusCode() < 300,
        status: res._getStatusCode(),
        json: async () => JSON.parse(res._getData()),
      } as Response;
    }
    const body =
      url.pathname === `/data/units/${family}/index.json`
        ? {
            units: [
              {
                ...definition,
                model: definition.model ?? '',
                path: 'identity-fixture.json',
              },
            ],
          }
        : url.pathname === `/data/units/${family}/identity-fixture.json`
          ? definition
          : JSON.parse(
              fs.readFileSync(
                path.join('public', decodeURIComponent(url.pathname)),
                'utf8',
              ),
            );
    return { ok: true, status: 200, json: async () => body } as Response;
  };
  const tabs = () => useTabManagerStore.getState();
  const hook = renderHook(
    () =>
      useDialogHandlers(
        jest.fn(),
        (id, name) => tabs().renameTab(id, name),
        (id) => tabs().tabs.find((tab) => tab.id === id),
      ),
    { wrapper: ToastProvider },
  );
  try {
    const entry = (await getCanonicalUnitService().getIndex({ family }))[0];
    if (!entry) throw new Error('Missing canonical fixture index');
    async function open(id: string, source: 'canonical' | 'custom') {
      const toast = jest.fn();
      await act(async () =>
        loadUnitIntoTab({
          unit: { ...entry, id },
          source,
          createTab: jest.fn(),
          navigateToTab: jest.fn(),
          setIsLoadDialogOpen: jest.fn(),
          setIsLoadingUnit: jest.fn(),
          showToast: toast,
        }),
      );
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'success' }),
      );
      const tab = tabs().tabs.at(-1);
      const store = tab && getLibrarySaveStore(tab.id, tab.unitType);
      if (!tab || !store) throw new Error('Missing loaded family store');
      return { tab, store };
    }
    const opened = await open(definition.id, 'canonical');
    const initial = getLibrarySaveEditor(opened.store.getState());
    if (initial.store === 'battlemech') throw new Error('Expected non-mech');
    const loaded = {
      techBaseMode: initial.state.techBaseMode,
      chassisTechBase: initial.state.chassisTechBase,
      techBase: initial.state.techBase,
    };
    const draft = getEditorDraftFingerprint(initial);
    const library = getEditorLibraryFingerprint(initial);
    await act(async () => hook.result.current.openSaveDialog(opened.tab.id));
    await act(async () =>
      hook.result.current.handleSaveDialogSave(
        definition.chassis ?? 'Identity fixture',
        'Mixed identity copy',
      ),
    );
    const receipt = opened.store.getState().librarySave;
    if (!receipt)
      throw new Error('Save hook did not confirm a library receipt');
    const record = getUnitRepository().getById(receipt.id);
    if (!record) throw new Error('Missing SQLite save');
    const saved = UnitContract.parse(JSON.parse(record.data));
    const reopened = await open(receipt.id, 'custom');
    const reopenedEditor = getLibrarySaveEditor(reopened.store.getState());
    if (reopenedEditor.store === 'battlemech')
      throw new Error('Expected non-mech');
    const state = reopenedEditor.state;
    const reopenedIdentity = {
      techBaseMode: state.techBaseMode,
      chassisTechBase: state.chassisTechBase,
      techBase: state.techBase,
    };
    expect(getEditorSaveState(reopenedEditor).library.state).toBe('matched');
    await act(async () => hook.result.current.openSaveDialog(reopened.tab.id));
    await act(async () =>
      hook.result.current.handleSaveDialogSave(
        saved.chassis ?? 'Identity fixture',
        saved.model ?? 'Mixed identity copy',
        receipt.id,
      ),
    );
    const second = getUnitRepository().getById(receipt.id);
    expect(second?.currentVersion).toBe(2);
    return {
      loaded,
      draft,
      library,
      saved,
      reopened: reopenedIdentity,
      secondSave: UnitContract.parse(JSON.parse(second?.data ?? 'null')),
    };
  } finally {
    hook.unmount();
    cleanup();
    global.fetch = originalFetch;
    resetCanonicalUnitService();
    resetUnitRepository();
    resetSQLiteService();
    clearAllVehicleStores(true);
    clearAllAerospaceStores(true);
    clearAllBattleArmorStores(true);
    clearAllInfantryStores(true);
    clearAllProtoMechStores(true);
    useTabManagerStore.setState({ tabs: [], activeTabId: null });
    localStorage.clear();
  }
}
