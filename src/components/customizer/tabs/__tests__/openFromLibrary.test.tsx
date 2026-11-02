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
import { ARMOR_TYPE_OPTIONS } from '@/components/customizer/vehicle/VehicleArmorTab.constants';
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
import { customUnitApiService } from '@/services/units/CustomUnitApiService';
import { getCapitalShipView } from '@/services/units/unitLoaderService/capitalShipView';
import { UnitLoaderService } from '@/services/units/unitLoaderService/unitLoader';
import { mapToVehicleState } from '@/services/units/unitLoaderService/vehicleMapping';
import { UnitRepository } from '@/services/units/UnitRepository';
import { getAerospaceStore } from '@/stores/aerospaceStoreRegistry';
import { createUnitFromFullState } from '@/stores/unitStoreRegistry';
import { useTabManagerStore } from '@/stores/useTabManagerStore';
import { getVehicleStore } from '@/stores/vehicleStoreRegistry';
import { UnitContract } from '@/types/contracts';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { Era } from '@/types/temporal/Era';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { serializeCustomVehicleState } from '@/utils/serialization/CustomUnitSerializer';

import { isLibrarySaveSupported } from '../MultiUnitTabsUnitState';
import { getLibrarySaveDisabledReason } from '../MultiUnitTabsUnitState';
import { loadUnitIntoTab } from '../useMultiUnitTabsController.helpers';

jest.mock('@/services/units/CustomUnitApiService', () => ({
  customUnitApiService: { list: jest.fn(async () => []), getById: jest.fn() },
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
    'dreadnought-mk-ii-land-trailer-configuration-#1',
    'eurus-mbt-prime',
    'demolisher-heavy-tank-reinforced',
  ],
  aerospace: [
    'shilone-sl-17',
    'boeing-jump-bomber',
    'aquarius-escort',
    'tomahawk-c',
    'nl-45-gunboat',
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
const VEHICLE_ARMOR_TYPES = ARMOR_TYPE_OPTIONS.map((option) => option.value);

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
  jest.mocked(customUnitApiService.list).mockResolvedValue([]);
});

it('lists a saved vehicle with its family and reopens it in the vehicle store', async () => {
  const entry = await indexEntry('vehicles', 'manticore-heavy-tank');
  const definition = await getCanonicalUnitService().getById(entry.id, {
    family: 'vehicles',
  });
  const state = mapToVehicleState(definition);
  const saved = serializeCustomVehicleState(state, {
    id: 'custom-manticore',
    chassis: 'Saved Manticore',
    variant: 'Custom',
    era: Era.DARK_AGE,
  });
  const customEntry = {
    ...entry,
    id: saved.id,
    family: 'vehicles' as const,
    chassis: 'Saved Manticore',
    era: Era.DARK_AGE,
    rulesLevel: RulesLevel.STANDARD,
    variant: 'Custom',
    currentVersion: 1,
    createdAt: '',
    updatedAt: '',
  };
  jest.mocked(customUnitApiService.list).mockResolvedValue([customEntry]);
  jest.mocked(customUnitApiService.getById).mockResolvedValue(saved as never);
  const onLoadUnit = jest.fn();
  render(
    <UnitLoadDialog isOpen onCancel={jest.fn()} onLoadUnit={onLoadUnit} />,
  );
  await userEvent.click(await screen.findByText('Saved Manticore'));
  await userEvent.click(screen.getByRole('button', { name: 'Load Unit' }));
  expect(onLoadUnit).toHaveBeenCalledWith(
    expect.objectContaining({ family: 'vehicles', id: saved.id }),
    'custom',
  );
  const [selected] = onLoadUnit.mock.calls[0];
  await open(selected, 'custom');
  const [tab] = useTabManagerStore.getState().tabs;
  expect(getVehicleStore(tab.id)?.getState()).toMatchObject({
    chassis: 'Saved Manticore',
    unitType: UnitType.VEHICLE,
    equipment: expect.any(Array),
  });
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
  // Follow-up 67: units that failed to open in #2492's real-catalog run.
  [
    'trailer with # in its file name',
    'vehicles',
    'dreadnought-mk-ii-land-trailer-configuration-#1',
    UnitType.SUPPORT_VEHICLE,
  ],
  ['Ferro-Lamellor tank', 'vehicles', 'eurus-mbt-prime', UnitType.VEHICLE],
  [
    'Ballistic-Reinforced tank',
    'vehicles',
    'demolisher-heavy-tank-reinforced',
    UnitType.VEHICLE,
  ],
  [
    'small craft with hull equipment',
    'aerospace',
    'nl-45-gunboat',
    UnitType.SMALL_CRAFT,
  ],
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
    if (family === 'vehicles') {
      // The vehicle armor tab can show the loaded armor type.
      expect(VEHICLE_ARMOR_TYPES).toContain(
        getVehicleStore(tab.id)?.getState().armorType,
      );
    }
    expect(createUnitFromFullState).not.toHaveBeenCalled();
    if (family === 'vehicles')
      expect(getLibrarySaveDisabledReason(tab)).toBeNull();
    else expect(getLibrarySaveDisabledReason(tab)).toMatch(/not available/);
  },
);

it('opens a capital ship into a read-only tab without creating a store', async () => {
  const unit = await indexEntry('capital', 'achilles-2582');
  const params = await open(unit);
  const [tab] = useTabManagerStore.getState().tabs;
  expect(tab).toMatchObject({ unitType: UnitType.DROPSHIP, tonnage: 4500 });
  expect(params.navigateToTab).toHaveBeenCalledWith(tab.id);
  expect(getCapitalShipView(tab.id)).toMatchObject({
    sourceId: 'achilles-2582',
    structuralIntegrity: 16,
  });
  expect(getAerospaceStore(tab.id)).toBeUndefined();
  expect(createUnitFromFullState).not.toHaveBeenCalled();
  expect(getLibrarySaveDisabledReason(tab)).toMatch(/not available/);
});

it('fetches a catalog file whose name contains # with each path segment encoded', async () => {
  await getCanonicalUnitService().getById(
    'dreadnought-mk-ii-land-trailer-configuration-#1',
    { family: 'vehicles', strict: true },
  );
  expect(global.fetch).toHaveBeenCalledWith(
    '/data/units/vehicles/Dreadnought%20Mk%20II%20Land%20Trailer%20Configuration%20%231.json',
  );
});

it.each([
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

it('rejects a vehicle saved without its family rather than treating it as a BattleMech', async () => {
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
      'This library entry contains invalid unit data. Choose another entry or correct the saved definition.',
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

describe('vehicle save and reopen', () => {
  const directory = 'public/data/units/vehicles';
  beforeAll(async () => {
    await getEquipmentLookupService().initialize();
    await getEquipmentRegistry().initialize();
  });
  const index = JSON.parse(
    fs.readFileSync(`${directory}/index.json`, 'utf8'),
  ) as {
    units: { id: string; path: string }[];
  };
  const groups = new Map<string, typeof index.units>();
  for (const row of index.units) {
    const definition = JSON.parse(
      fs.readFileSync(path.join(directory, row.path), 'utf8'),
    );
    const sixSides = definition.armor.byLocation.FRONT_RIGHT !== undefined;
    const subtype =
      definition.unitType === 'Support Vehicle'
        ? definition.motionType === 'VTOL'
          ? 'SupportVTOL'
          : sixSides
            ? 'LargeSupportTank'
            : 'SupportTank'
        : definition.unitType === 'VTOL'
          ? 'VTOL'
          : sixSides
            ? 'SuperHeavyTank'
            : 'Tank';
    groups.set(subtype, [...(groups.get(subtype) ?? []), row]);
  }

  // Session identity and timestamps are deliberately fresh. Every construction
  // field and mount property is compared; linked mount IDs retain their relation.
  function semantic(state: ReturnType<typeof mapToVehicleState>) {
    const {
      id: _id,
      createdAt: _created,
      lastModifiedAt: _modified,
      isModified: _dirty,
      ...configuration
    } = state;
    return {
      ...configuration,
      equipment: state.equipment.map((mount, index) => ({
        ...mount,
        id: `mount-${index}`,
        linkedAmmoId: state.equipment.some(
          (item) => item.id === mount.linkedAmmoId,
        )
          ? `mount-${state.equipment.findIndex((item) => item.id === mount.linkedAmmoId)}`
          : mount.linkedAmmoId,
      })),
    };
  }

  it.each([UnitType.VEHICLE, UnitType.VTOL, UnitType.SUPPORT_VEHICLE])(
    'allows %s library saves',
    (type) => expect(isLibrarySaveSupported(type)).toBe(true),
  );

  it.each([...groups])(
    'round trips real %s designs through JSON and the vehicle mapper',
    (subtype, rows) => {
      const selected = process.env.UL25_ALL
        ? rows
        : rows
            .filter(
              (_, i) => i % Math.max(1, Math.floor(rows.length / 8)) === 0,
            )
            .slice(0, 8);
      const mixedAmmo = rows.find(
        (row) => row.id === 'chalchiuhtotolin-support-tank-chemical-laser',
      );
      if (mixedAmmo && !selected.includes(mixedAmmo)) selected.push(mixedAmmo);
      const results = selected.map((row) => {
        try {
          const state = mapToVehicleState(
            JSON.parse(fs.readFileSync(path.join(directory, row.path), 'utf8')),
          );
          const saved = JSON.parse(
            JSON.stringify(
              serializeCustomVehicleState(state, {
                id: row.id,
                chassis: state.chassis,
                variant: state.model,
                era: Era.DARK_AGE,
              }),
            ),
          );
          expect(saved.family).toBe('vehicles');
          expect(UnitContract.safeParse(saved).success).toBe(true);
          const reopened = mapToVehicleState(saved);
          expect(semantic(reopened)).toEqual(semantic(state));
          return { id: row.id, result: 'pass' };
        } catch (error) {
          return { id: row.id, result: 'fail', error: String(error) };
        }
      });
      if (process.env.UL25_REPORT)
        fs.writeFileSync(
          `${process.env.UL25_REPORT}/${subtype}.json`,
          JSON.stringify(results, null, 2),
        );
      expect(results.filter((row) => row.result === 'fail')).toEqual([]);
    },
  );

  it('retains edited construction fields, mount flags and unresolved identities through actual persistence and routing', async () => {
    getSQLiteService({ path: ':memory:' }).initialize();
    try {
      const state = mapToVehicleState(
        JSON.parse(
          fs.readFileSync(path.join(directory, index.units[0].path), 'utf8'),
        ),
      );
      const edited = {
        ...state,
        crewSize: 12,
        passengerSlots: 7,
        armorTonnage: 9.75,
        hasEnvironmentalSealing: true,
        hasFlotationHull: true,
        isAmphibious: true,
        hasTrailerHitch: true,
        hasNoControlSystems: true,
        powerAmpWeight: 1.25,
        equipment: state.equipment.map((mount, index) => ({
          ...mount,
          id: `custom-mount-${index}`,
          linkedAmmoId: index === 0 ? 'custom-mount-1' : undefined,
          isRearMounted: true,
          isPintleTurretMounted: true,
          isChinTurretMounted: true,
          isSponsonMounted: true,
          isOmniPodMounted: true,
        })),
      };
      const saved = serializeCustomVehicleState(edited, {
        id: state.id,
        chassis: state.chassis,
        variant: state.model,
        era: Era.DARK_AGE,
      });
      const repository = new UnitRepository();
      const created = repository.create({
        chassis: state.chassis,
        variant: state.model,
        data: { ...saved },
      });
      if (!created.success) throw new Error(created.error.message);
      const record = repository.getById(created.data.id)!;
      expect(repository.list()[0].family).toBe('vehicles');
      jest
        .mocked(customUnitApiService.getById)
        .mockResolvedValue(JSON.parse(record.data));
      const loaded = await new UnitLoaderService().loadCustomUnit(
        record.id,
        'vehicles',
      );
      expect(loaded.success).toBe(true);
      if (loaded.familyState?.store !== 'vehicle')
        throw new Error(JSON.stringify(loaded));
      expect(semantic(loaded.familyState.state)).toEqual(semantic(edited));
      expect(loaded.familyState.state.equipment[0].linkedAmmoId).toBe(
        loaded.familyState.state.equipment[1].id,
      );
      const missingFamily = { ...saved, family: undefined };
      jest
        .mocked(customUnitApiService.getById)
        .mockResolvedValue(missingFamily as never);
      const legacy = await new UnitLoaderService().loadCustomUnit(
        record.id,
        'vehicles',
      );
      expect(legacy.success).toBe(false);
      const invalid = {
        ...saved,
        vehicleEditor: { ...saved.vehicleEditor, crewSize: 'bad' },
      };
      expect(() => mapToVehicleState(invalid)).toThrow();
    } finally {
      resetSQLiteService();
    }
  });

  it('reads a saved design without family as a BattleMech', async () => {
    const mechs = JSON.parse(
      fs.readFileSync('public/data/units/battlemechs/index.json', 'utf8'),
    ) as typeof index;
    const atlas = mechs.units.find((row) => row.id === 'atlas-as7-d')!;
    const definition = JSON.parse(
      fs.readFileSync(
        path.join('public/data/units/battlemechs', atlas.path),
        'utf8',
      ),
    );
    jest.mocked(customUnitApiService.getById).mockResolvedValue(definition);
    const loaded = await new UnitLoaderService().loadCustomUnit(definition.id);
    expect(loaded.success).toBe(true);
    expect(loaded.state?.unitType).toBe(UnitType.BATTLEMECH);
    expect(loaded.familyState).toBeUndefined();
  });
});
