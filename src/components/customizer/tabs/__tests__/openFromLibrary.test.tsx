/**
 * UL-13: open a unit from the library by family. The dialog lists every
 * family, and loadUnitIntoTab routes each family to its own store and tab.
 * Units are real catalog definitions served through a fixture index.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';

import type { IUnitIndexEntry } from '@/services/common/types';
import type { UnitFamily } from '@/types/unit/UnitIndex';

import { UnitLoadDialog } from '@/components/customizer/dialogs/UnitLoadDialog';
import {
  getCanonicalUnitService,
  resetCanonicalUnitService,
} from '@/services/units/CanonicalUnitService';
import { customUnitApiService } from '@/services/units/CustomUnitApiService';
import { getAerospaceStore } from '@/stores/aerospaceStoreRegistry';
import { createUnitFromFullState } from '@/stores/unitStoreRegistry';
import { useTabManagerStore } from '@/stores/useTabManagerStore';
import { getVehicleStore } from '@/stores/vehicleStoreRegistry';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { getLibrarySaveDisabledReason } from '../MultiUnitTabsUnitState';
import { loadUnitIntoTab } from '../useMultiUnitTabsController.helpers';

jest.mock('@/services/units/CustomUnitApiService', () => ({
  customUnitApiService: { list: async () => [], getById: jest.fn() },
}));
jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));
jest.mock('@/stores/unitStoreRegistry', () => {
  const actual = jest.requireActual('@/stores/unitStoreRegistry');
  return {
    ...actual,
    createUnitFromFullState: jest.fn(actual.createUnitFromFullState),
  };
});
jest.mock('@/components/customizer/dialogs/ModalOverlay', () => ({
  ModalOverlay: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

type Row = Record<string, unknown> & { id: string; path: string };

const CATALOG: Record<string, readonly string[]> = {
  battlemechs: ['atlas-as7-d', 'tomahawk-c'],
  vehicles: [
    'manticore-heavy-tank',
    'warrior-attack-helicopter-h-7',
    'air-car',
  ],
  aerospace: [
    'shilone-sl-17',
    'boeing-jump-bomber',
    'aquarius-escort',
    'tomahawk-c',
  ],
  capital: ['achilles-2582'],
};
// No battle armor or infantry catalog is committed; minimal valid definitions.
const SYNTHETIC: Record<string, Row> = {
  battlearmor: {
    id: 'elemental-standard',
    chassis: 'Elemental',
    model: 'Standard',
    unitType: 'Battle Armor',
    tonnage: 1,
    techBase: 'CLAN',
    path: 'elemental.json',
  },
  infantry: {
    id: 'foot-rifle-platoon',
    chassis: 'Foot Rifle Platoon',
    model: '',
    unitType: 'Infantry',
    tonnage: 3,
    techBase: 'INNER_SPHERE',
    path: 'foot.json',
  },
};

function readJson(relative: string): unknown {
  return JSON.parse(fs.readFileSync(path.join('public', relative), 'utf8'));
}

const indexes: Record<string, Row[]> = {};
const files: Record<string, unknown> = {};
for (const [family, ids] of Object.entries(CATALOG)) {
  const rows = (readJson(`data/units/${family}/index.json`) as { units: Row[] })
    .units;
  indexes[family] = ids.map((id) => rows.find((row) => row.id === id)!);
}
for (const [family, row] of Object.entries(SYNTHETIC)) {
  indexes[family] = [row];
  files[`data/units/${family}/${row.path}`] = row;
}

const showToast = jest.fn();

beforeEach(() => {
  global.fetch = jest.fn(async (input: string) => {
    const relative = decodeURIComponent(
      new URL(input, 'http://localhost').pathname,
    ).replace(/^\//, '');
    const family = /^data\/units\/([^/]+)\/index\.json$/.exec(relative)?.[1];
    const body = family
      ? indexes[family] && { version: 'fixture', units: indexes[family] }
      : (files[relative] ??
        (fs.existsSync(path.join('public', relative))
          ? readJson(relative)
          : undefined));
    return body === undefined
      ? { ok: false, status: 404 }
      : { ok: true, status: 200, json: async () => body };
  }) as unknown as typeof fetch;
  resetCanonicalUnitService();
  useTabManagerStore.setState({ tabs: [], activeTabId: null });
  showToast.mockClear();
  jest.mocked(createUnitFromFullState).mockClear();
});

async function indexEntry(
  family: UnitFamily,
  id: string,
): Promise<IUnitIndexEntry> {
  const entries = await getCanonicalUnitService().getIndex({ family });
  return entries.find((entry) => entry.id === id)!;
}

async function open(
  unit: IUnitIndexEntry,
  source: 'canonical' | 'custom' = 'canonical',
) {
  const params = {
    unit,
    source,
    createTab: jest.fn(),
    navigateToTab: jest.fn(),
    setIsLoadDialogOpen: jest.fn(),
    setIsLoadingUnit: jest.fn(),
    showToast,
  };
  await loadUnitIntoTab(params);
  return params;
}

it('opens a vehicle from the library dialog into a vehicle tab', async () => {
  const navigateToTab = jest.fn();
  render(
    <UnitLoadDialog
      isOpen
      onCancel={jest.fn()}
      onLoadUnit={(unit, source) =>
        loadUnitIntoTab({
          unit,
          source,
          createTab: jest.fn(),
          navigateToTab,
          setIsLoadDialogOpen: jest.fn(),
          setIsLoadingUnit: jest.fn(),
          showToast,
        })
      }
    />,
  );
  const row = (await screen.findByText('Manticore Heavy Tank')).closest('tr')!;
  expect(within(row).getByText('Vehicles')).toBeInTheDocument();
  const mech = screen.getByText('Atlas').closest('tr')!;
  expect(within(mech).getByText('BattleMechs')).toBeInTheDocument();

  await userEvent.dblClick(row);

  await waitFor(() => expect(navigateToTab).toHaveBeenCalled());
  const [tab] = useTabManagerStore.getState().tabs;
  expect(tab).toMatchObject({ unitType: UnitType.VEHICLE, tonnage: 60 });
  expect(navigateToTab).toHaveBeenCalledWith(tab.id);
  expect(getVehicleStore(tab.id)?.getState()).toMatchObject({
    chassis: 'Manticore Heavy Tank',
    unitType: UnitType.VEHICLE,
  });
  expect(showToast).toHaveBeenCalledWith(
    expect.objectContaining({ variant: 'success' }),
  );
});

it('keeps same-id units from different families apart in the dialog', async () => {
  const onLoadUnit = jest.fn();
  render(
    <UnitLoadDialog isOpen onCancel={jest.fn()} onLoadUnit={onLoadUnit} />,
  );
  const rows = (await screen.findAllByText('Tomahawk')).map(
    (cell) => cell.closest('tr')!,
  );
  const fighter = rows.find((row) => within(row).queryByText('Aerospace'))!;
  await userEvent.click(fighter);
  expect(rows.map((row) => row.getAttribute('aria-selected'))).toEqual(
    rows.map((row) => String(row === fighter)),
  );
  await userEvent.click(screen.getByRole('button', { name: 'Load Unit' }));
  expect(onLoadUnit).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'tomahawk-c', family: 'aerospace' }),
    'canonical',
  );
});

it.each([
  ['Tank', 'vehicles', 'manticore-heavy-tank', UnitType.VEHICLE],
  ['VTOL', 'vehicles', 'warrior-attack-helicopter-h-7', UnitType.VTOL],
  ['support vehicle', 'vehicles', 'air-car', UnitType.SUPPORT_VEHICLE],
  ['aerospace fighter', 'aerospace', 'shilone-sl-17', UnitType.AEROSPACE],
  [
    'conventional fighter',
    'aerospace',
    'boeing-jump-bomber',
    UnitType.CONVENTIONAL_FIGHTER,
  ],
  ['small craft', 'aerospace', 'aquarius-escort', UnitType.SMALL_CRAFT],
] as const)(
  'opens a %s into its own store and tab',
  async (_label, family, id, unitType) => {
    const unit = await indexEntry(family, id);
    const params = await open(unit);

    const [tab] = useTabManagerStore.getState().tabs;
    expect(showToast).toHaveBeenCalledWith({
      message: `Unit "${tab.name}" loaded`,
      variant: 'success',
    });
    expect(tab).toMatchObject({ unitType, name: unit.name.trim() });
    expect(params.navigateToTab).toHaveBeenCalledWith(tab.id);
    expect(params.setIsLoadDialogOpen).toHaveBeenCalledWith(false);
    const getStore =
      family === 'vehicles' ? getVehicleStore : getAerospaceStore;
    expect(getStore(tab.id)?.getState()).toMatchObject({
      unitType,
      tonnage: unit.tonnage,
      isModified: false,
    });
    expect(createUnitFromFullState).not.toHaveBeenCalled();
    expect(getLibrarySaveDisabledReason(tab)).toMatch(/not available/);
  },
);

it.each([
  [
    'capital',
    'achilles-2582',
    'Capital ships cannot be opened yet because the editor has no capital ship view.',
  ],
  [
    'battlearmor',
    'elemental-standard',
    'Battle armor cannot be opened yet because the editor cannot load battle armor from the library.',
  ],
  [
    'infantry',
    'foot-rifle-platoon',
    'Infantry cannot be opened yet because the editor cannot load infantry from the library.',
  ],
] as const)(
  'explains why %s units cannot open, without suggesting a retry',
  async (family, id, message) => {
    const params = await open(await indexEntry(family, id));
    expect(showToast).toHaveBeenCalledWith({ message, variant: 'error' });
    expect(useTabManagerStore.getState().tabs).toEqual([]);
    expect(params.setIsLoadDialogOpen).not.toHaveBeenCalled();
    expect(createUnitFromFullState).not.toHaveBeenCalled();
  },
);

it('explains that a saved non-mech design cannot be reopened yet', async () => {
  const { family: _family, ...entry } = await indexEntry(
    'vehicles',
    'manticore-heavy-tank',
  );
  const vehicle = await getCanonicalUnitService().getById(entry.id, {
    family: 'vehicles',
  });
  jest
    .mocked(customUnitApiService.getById)
    .mockResolvedValue({ ...vehicle!, currentVersion: 1 });
  // Custom library entries carry no family, so they are read as BattleMechs.
  const params = await open({ ...entry, id: 'saved-tank' }, 'custom');
  expect(showToast).toHaveBeenCalledWith({
    message:
      'Saved Vehicle designs cannot be reopened yet. Only BattleMech designs reopen from the library.',
    variant: 'error',
  });
  expect(params.navigateToTab).not.toHaveBeenCalled();
});

it('still opens a BattleMech through the BattleMech store and tab', async () => {
  const unit = await indexEntry('battlemechs', 'atlas-as7-d');
  const params = await open(unit);
  expect(createUnitFromFullState).toHaveBeenCalledTimes(1);
  const [state] = jest.mocked(createUnitFromFullState).mock.calls[0];
  expect(state).toMatchObject({
    name: 'Atlas AS7-D',
    tonnage: 100,
    sourceDefinition: { source: 'canonical', id: 'atlas-as7-d' },
  });
  expect(useTabManagerStore.getState().tabs).toEqual([
    {
      id: state.id,
      name: state.name,
      tonnage: state.tonnage,
      techBase: state.techBase,
      unitType: UnitType.BATTLEMECH,
    },
  ]);
  expect(params.navigateToTab).toHaveBeenCalledWith(state.id);
});
