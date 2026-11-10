import type { NextApiRequest, NextApiResponse } from 'next';
import type { RequestMethod } from 'node-mocks-http';

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMocks } from 'node-mocks-http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import React from 'react';

import { getLibrarySaveDisabledReason } from '@/components/customizer/tabs/MultiUnitTabsUnitState';
import { getSavedHistoryDisabledReason } from '@/components/customizer/tabs/savedHistoryAccess';
import {
  buildActiveUnitExportData,
  loadUnitIntoTab,
} from '@/components/customizer/tabs/useMultiUnitTabsController.helpers';
import { UnitTypeRouter } from '@/components/customizer/UnitTypeRouter';
import listHandler from '@/pages/api/units/custom';
import customHandler from '@/pages/api/units/custom/[id]';
import exportHandler from '@/pages/api/units/custom/[id]/export';
import revertHandler from '@/pages/api/units/custom/[id]/revert/[version]';
import CustomUnitDetailPage from '@/pages/units/[id]';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { getRecordSheetService } from '@/services/printing/RecordSheetService';
import { customUnitApiService } from '@/services/units/CustomUnitApiService';
import { mapCustomUnitIndexEntry } from '@/services/units/unitIndexMapper';
import {
  getCapitalShipView,
  mapCapitalDefinitionToView,
} from '@/services/units/unitLoaderService/capitalShipView';
import { getUnitRepository } from '@/services/units/UnitRepository';
import { getVersionRepository } from '@/services/units/VersionRepository';
import { getAerospaceStore } from '@/stores/aerospaceStoreRegistry';
import { getBattleArmorStore } from '@/stores/battleArmorStoreRegistry';
import { getInfantryStore } from '@/stores/infantryStoreRegistry';
import { getProtoMechStore } from '@/stores/protoMechStoreRegistry';
import { getUnitStore } from '@/stores/unitStoreRegistry';
import { useTabManagerStore } from '@/stores/useTabManagerStore';
import { getVehicleStore } from '@/stores/vehicleStoreRegistry';
import { UnitContract } from '@/types/contracts';
import { Era } from '@/types/enums/Era';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';
import { PaperSize } from '@/types/printing';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

describe('custom library index projection', () => {
  const row = {
    id: 'custom-capital',
    chassis: 'Union',
    variant: '',
    tonnage: 3600,
    techBase: TechBase.INNER_SPHERE,
    era: Era.STAR_LEAGUE,
    rulesLevel: RulesLevel.STANDARD,
    weightClass: WeightClass.ASSAULT,
    unitType: UnitType.DROPSHIP,
    currentVersion: 1,
    createdAt: '2026-11-09T00:00:00.000Z',
    updatedAt: '2026-11-09T00:00:00.000Z',
  };

  it('retains family, identity, blank model and version when opening a custom record', () => {
    expect(mapCustomUnitIndexEntry({ ...row, family: 'capital' })).toEqual({
      family: 'capital',
      id: row.id,
      chassis: 'Union',
      variant: '',
      tonnage: 3600,
      techBase: row.techBase,
      era: row.era,
      weightClass: row.weightClass,
      unitType: UnitType.DROPSHIP,
      name: 'Union ',
      filePath: '',
      source: 'custom',
      currentVersion: 1,
    });
  });

  it('preserves omission of the legacy default family', () => {
    expect(mapCustomUnitIndexEntry(row)).not.toHaveProperty('family');
  });
});

const mockPush = jest.fn();
let mockDetailId = '';
jest.mock('next/router', () => ({
  useRouter: () => ({ query: { id: mockDetailId }, push: mockPush }),
}));
jest.mock('jspdf', () => ({ jsPDF: jest.fn() }));
jest.mock('@/stores/UnitStoreProvider', () => ({
  UnitStoreProvider: () => <div data-testid="mech-editor" />,
}));

const capitalFiles = [
  'Achilles (2582).json',
  'Comitatus JumpShip (2995).json',
  'Aegis Heavy Cruiser (2372).json',
  'Crucible Station.json',
];
const originalFetch = global.fetch;
const readCapital = (file: string): Record<string, unknown> =>
  JSON.parse(
    fs.readFileSync(path.join('public/data/units/capital', file), 'utf8'),
  );

async function api(
  method: RequestMethod,
  id: string,
  body?: unknown,
  operation?: 'export' | 'revert',
) {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method,
    query: { id, version: '1' },
  });
  req.body = body;
  await (
    operation === 'export'
      ? exportHandler
      : operation === 'revert'
        ? revertHandler
        : customHandler
  )(req, res);
  return res;
}
async function localFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url = new URL(String(input), 'http://localhost');
  const method = init?.method ?? 'GET';
  if (
    method !== 'GET' &&
    method !== 'PUT' &&
    method !== 'POST' &&
    method !== 'DELETE'
  )
    throw new Error(`Unexpected test request method: ${method}`);
  const custom =
    /^\/api\/units\/custom\/([^/]+)(?:\/(export|revert\/\d+))?$/.exec(
      url.pathname,
    );
  let response;
  if (custom)
    response = await api(
      method,
      decodeURIComponent(custom[1]),
      init?.body ? JSON.parse(String(init.body)) : undefined,
      custom[2] === 'export'
        ? 'export'
        : custom[2]?.startsWith('revert')
          ? 'revert'
          : undefined,
    );
  else if (url.pathname === '/api/units/custom') {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method,
    });
    await listHandler(req, res);
    response = res;
  } else {
    const file = path.join('public', decodeURIComponent(url.pathname));
    return {
      ok: fs.existsSync(file),
      status: fs.existsSync(file) ? 200 : 404,
      json: async () => JSON.parse(fs.readFileSync(file, 'utf8')),
    } as Response;
  }
  return {
    ok: response._getStatusCode() < 300,
    status: response._getStatusCode(),
    json: async () => JSON.parse(response._getData()),
  } as Response;
}
function seed(data: Record<string, unknown>) {
  const result = getUnitRepository().create({
    chassis: String(data.chassis),
    variant: String(data.model ?? ''),
    data,
  });
  expect(result.success).toBe(true);
  if (!result.success) throw new Error(result.error.message);
  expect(result.data.version).toBe(1);
  return result.data.id;
}
function snapshot(id: string) {
  return JSON.stringify({
    record: getUnitRepository().getById(id),
    versions: getSQLiteService()
      .getDatabase()
      .prepare('SELECT * FROM unit_versions WHERE unit_id = ? ORDER BY version')
      .all(id),
  });
}
async function openSaved(id: string) {
  const entries = await customUnitApiService.list();
  const entry = entries.find((unit) => unit.id === id);
  if (!entry) throw new Error('Saved capital missing from library');
  const navigate = jest.fn();
  const toast = jest.fn();
  await loadUnitIntoTab({
    unit: mapCustomUnitIndexEntry(entry),
    source: 'custom',
    createTab: jest.fn(),
    navigateToTab: navigate,
    setIsLoadDialogOpen: jest.fn(),
    setIsLoadingUnit: jest.fn(),
    showToast: toast,
  });
  expect(toast).toHaveBeenCalledWith(
    expect.objectContaining({ variant: 'success' }),
  );
  return useTabManagerStore.getState().tabs.at(-1)!;
}

describe('capital custom-record read-only lifecycle', () => {
  let directory: string;
  let databasePath: string;
  beforeAll(async () => {
    global.fetch = jest.fn(localFetch);
    await getEquipmentRegistry().initialize();
  });
  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mek-capital-readonly-'));
    databasePath = path.join(directory, 'units.sqlite');
    getSQLiteService({ path: databasePath }).initialize();
    global.fetch = jest.fn(localFetch);
    useTabManagerStore.setState({ tabs: [], activeTabId: null });
    mockPush.mockReset();
  });
  afterEach(() => {
    cleanup();
    resetSQLiteService();
    expect(path.dirname(directory)).toBe(path.resolve(os.tmpdir()));
    expect(path.basename(directory)).toMatch(/^mek-capital-readonly-/);
    fs.rmSync(directory, { recursive: true, force: true });
    jest.restoreAllMocks();
  });
  afterAll(() => {
    global.fetch = originalFetch;
  });

  it.each(capitalFiles)(
    '%s persists at version 1, reopens frozen and keeps record-sheet reads available',
    async (file) => {
      const data: Record<string, unknown> = {
        ...readCapital(file),
        family: 'capital',
      };
      const id = seed(data);
      expect(id).toMatch(/^custom-/);
      resetSQLiteService();
      getSQLiteService({ path: databasePath }).initialize();
      const saved = await customUnitApiService.getById(id);
      expect(saved).toMatchObject({
        id,
        family: 'capital',
        currentVersion: 1,
        armor: data.armor,
        equipment: data.equipment,
      });
      const tab = await openSaved(id);
      const view = getCapitalShipView(tab.id)!;
      expect(view.sourceDefinition).toMatchObject({
        source: 'custom',
        family: 'capital',
        id,
        version: 1,
      });
      expect(Object.isFrozen(view)).toBe(true);
      expect(Object.isFrozen(view.armorByArc)).toBe(true);
      expect(Object.isFrozen(view.sourceDefinition)).toBe(true);
      const expectedView = mapCapitalDefinitionToView(
        UnitContract.parse(data),
        'canonical-session',
      );
      expect(view).toEqual({
        ...expectedView,
        id: tab.id,
        sourceId: id,
        sourceDefinition: {
          source: 'custom',
          family: 'capital',
          id,
          version: 1,
        },
      });
      expect(getUnitStore(tab.id)).toBeUndefined();
      expect(getAerospaceStore(tab.id)).toBeUndefined();
      expect(getVehicleStore(tab.id)).toBeUndefined();
      expect(getInfantryStore(tab.id)).toBeUndefined();
      expect(getBattleArmorStore(tab.id)).toBeUndefined();
      expect(getProtoMechStore(tab.id)).toBeUndefined();
      expect(getLibrarySaveDisabledReason(tab)).not.toBeNull();
      expect(getSavedHistoryDisabledReason(tab)).not.toBeNull();
      expect(buildActiveUnitExportData(tab.id)).toBeNull();
      const { container } = render(
        <UnitTypeRouter
          activeTab={tab}
          activeTabId="overview"
          onTabChange={jest.fn()}
        />,
      );
      expect(screen.getByTestId('capital-ship-customizer')).toBeInTheDocument();
      expect(screen.queryByTestId('mech-editor')).not.toBeInTheDocument();
      for (const name of ['Overview', 'Structure']) {
        await userEvent.click(screen.getByRole('tab', { name }));
        expect(
          container.querySelectorAll(
            'input,select,textarea,[contenteditable="true"]',
          ),
        ).toHaveLength(0);
      }
      const print = jest
        .spyOn(getRecordSheetService(), 'printRecordSheet')
        .mockResolvedValue(undefined);
      const pdf = jest
        .spyOn(getRecordSheetService(), 'exportPDF')
        .mockResolvedValue(undefined);
      // Asset rendering and browser downloads are separate boundaries; extraction stays real.
      const pages = jest
        .spyOn(getRecordSheetService(), 'getSVGPages')
        .mockResolvedValue(['<svg xmlns="http://www.w3.org/2000/svg"/>']);
      await userEvent.click(screen.getByRole('tab', { name: 'Preview' }));
      await waitFor(() =>
        expect(
          screen.getByAltText(`${view.name} record sheet page 1`),
        ).toBeInTheDocument(),
      );
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      const sheet = pages.mock.calls[0][0];
      expect(sheet).toMatchObject({
        unitType: 'capital',
        header: { unitName: view.name },
        bv: view.bv,
        crew: view.crew,
        transport: view.transport,
      });
      await userEvent.click(
        screen.getByRole('button', { name: /Download PDF/i }),
      );
      await waitFor(() =>
        expect(pdf).toHaveBeenCalledWith(sheet, {
          paperSize: PaperSize.LETTER,
          includePilotData: false,
        }),
      );
      await userEvent.click(screen.getByRole('button', { name: 'Print' }));
      expect(print).toHaveBeenCalledWith(sheet, PaperSize.LETTER);
      const envelope = await customUnitApiService.exportUnit(id);
      expect(envelope?.unit).toMatchObject(data);
      cleanup();
      useTabManagerStore.setState({ tabs: [], activeTabId: null });
      const reopened = await openSaved(id);
      expect(reopened.id).not.toBe(tab.id);
      expect(getCapitalShipView(reopened.id)?.sourceDefinition?.id).toBe(id);
    },
  );

  it.each(capitalFiles)(
    '%s blocks updates and revert despite forged family/type without any writes',
    async (file) => {
      const id = seed({ ...readCapital(file), family: 'capital' });
      const before = snapshot(id);
      for (const data of [
        { tonnage: 1 },
        { family: 'battlemechs', unitType: 'BattleMech' },
        { family: null, unitType: null },
      ]) {
        const response = await api('PUT', id, { data });
        expect(response._getStatusCode()).toBe(403);
        expect(JSON.parse(response._getData())).toMatchObject({
          success: false,
          error: { errorCode: 'READ_ONLY' },
        });
        expect(snapshot(id)).toBe(before);
      }
      const reverted = await api('POST', id, {}, 'revert');
      expect(reverted._getStatusCode()).toBe(403);
      expect(snapshot(id)).toBe(before);
      const saved = await customUnitApiService.getById(id);
      expect(await customUnitApiService.save(id, saved!)).toMatchObject({
        success: false,
        error: expect.stringMatching(/read.only/i),
      });
      expect(snapshot(id)).toBe(before);
      expect(await customUnitApiService.delete(id)).toMatchObject({
        success: true,
      });
      expect(getUnitRepository().getById(id)).toBeNull();
      expect(getVersionRepository().getVersionCount(id)).toBe(0);
    },
  );

  it('checks both persisted discriminators and the proposed update or revert data', async () => {
    const normal = {
      chassis: 'Editable',
      model: 'A',
      unitType: 'BattleMech',
      family: 'battlemechs',
      tonnage: 50,
    };
    const id = seed(normal);
    const before = snapshot(id);
    const response = await api('PUT', id, {
      data: { ...normal, unitType: 'DropShip', family: 'capital' },
    });
    expect(response._getStatusCode()).toBe(403);
    expect(snapshot(id)).toBe(before);
    const db = getSQLiteService().getDatabase();
    db.prepare('UPDATE unit_versions SET data = ? WHERE unit_id = ?').run(
      JSON.stringify({ ...normal, family: 'capital' }),
      id,
    );
    const beforeRevert = snapshot(id);
    expect((await api('POST', id, {}, 'revert'))._getStatusCode()).toBe(403);
    expect(snapshot(id)).toBe(beforeRevert);
    const familyOnly = seed({
      ...normal,
      chassis: 'Family Only',
      family: 'capital',
    });
    expect(
      (await api('PUT', familyOnly, { data: normal }))._getStatusCode(),
    ).toBe(403);
    const columnOnly = seed({ ...normal, chassis: 'Column Only' });
    db.prepare('UPDATE custom_units SET unit_type = ? WHERE id = ?').run(
      'DropShip',
      columnOnly,
    );
    expect(
      (await api('PUT', columnOnly, { data: normal }))._getStatusCode(),
    ).toBe(403);
  });

  it.each([
    ['BattleMech', 400, 'VALIDATION_ERROR'],
    ['DropShip', 403, 'READ_ONLY'],
  ])(
    'refuses malformed stored %s data through update and revert APIs',
    async (unitType, status, errorCode) => {
      const id = seed({
        chassis: 'Malformed',
        model: 'A',
        unitType,
        tonnage: 50,
      });
      getSQLiteService()
        .getDatabase()
        .prepare('UPDATE custom_units SET data = ? WHERE id = ?')
        .run('{broken', id);
      const before = snapshot(id);
      for (const response of [
        await api('PUT', id, { data: { unitType: 'BattleMech', tonnage: 55 } }),
        await api('POST', id, {}, 'revert'),
      ]) {
        expect(response._getStatusCode()).toBe(status);
        expect(JSON.parse(response._getData())).toMatchObject({
          success: false,
          error: { errorCode },
        });
        expect(snapshot(id)).toBe(before);
      }
    },
  );

  it('preserves noncapital update/revert and missing-record responses', async () => {
    const data = {
      chassis: 'Editable',
      model: 'A',
      unitType: 'BattleMech',
      tonnage: 50,
    };
    const id = seed(data);
    expect(
      (
        await api('PUT', id, { data: { ...data, tonnage: 55 } })
      )._getStatusCode(),
    ).toBe(200);
    expect(getUnitRepository().getById(id)?.currentVersion).toBe(2);
    expect((await api('POST', id, {}, 'revert'))._getStatusCode()).toBe(200);
    expect(getUnitRepository().getById(id)?.currentVersion).toBe(3);
    expect(JSON.parse(getUnitRepository().getById(id)!.data).tonnage).toBe(50);
    expect((await api('PUT', 'missing', { data }))._getStatusCode()).toBe(404);
  });

  it('blocks direct repository writes even when a capital record has noncapital history', () => {
    const id = seed({ ...readCapital(capitalFiles[0]), family: 'capital' });
    const forged = {
      chassis: 'Forged',
      unitType: 'BattleMech',
      family: 'battlemechs',
      tonnage: 50,
    };
    getSQLiteService()
      .getDatabase()
      .prepare('UPDATE unit_versions SET data = ? WHERE unit_id = ?')
      .run(JSON.stringify(forged), id);
    const before = snapshot(id);
    expect(getUnitRepository().update(id, { data: forged })).toMatchObject({
      success: false,
      error: { errorCode: 'READ_ONLY' },
    });
    expect(getVersionRepository().revert(id, 1)).toMatchObject({
      success: false,
      error: { errorCode: 'READ_ONLY' },
    });
    expect(snapshot(id)).toBe(before);
  });

  it('keeps the existing Edit action for noncapital saved details', async () => {
    mockDetailId = seed({
      chassis: 'Editable',
      model: 'A',
      unitType: 'BattleMech',
      tonnage: 50,
    });
    render(<CustomUnitDetailPage />);
    await screen.findByRole('button', { name: 'Edit' });
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      `/customizer?id=${mockDetailId}`,
    );
    expect(
      screen.queryByRole('button', { name: 'Open read-only' }),
    ).not.toBeInTheDocument();
  });

  it('saved capital details offer Open read-only and open the frozen custom-source viewer', async () => {
    const id = seed({ ...readCapital(capitalFiles[0]), family: 'capital' });
    mockDetailId = id;
    render(<CustomUnitDetailPage />);
    const open = await screen.findByRole('button', { name: 'Open read-only' });
    expect(
      screen.queryByRole('button', { name: 'Edit' }),
    ).not.toBeInTheDocument();
    await userEvent.click(open);
    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringMatching(/^\/customizer\/[^/]+\/overview$/),
      ),
    );
    const tab = useTabManagerStore.getState().tabs.at(-1)!;
    expect(getCapitalShipView(tab.id)?.sourceDefinition?.id).toBe(id);
    expect(getUnitStore(tab.id)).toBeUndefined();
  });
});
