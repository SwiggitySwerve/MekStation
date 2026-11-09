import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import React from 'react';

import { AerospaceArmorTab } from '@/components/customizer/aerospace/AerospaceArmorTab';
import { AerospaceStatusBar } from '@/components/customizer/aerospace/AerospaceStatusBar';
import { CustomizerConfirmationProvider } from '@/components/customizer/dialogs/CustomizerConfirmationProvider';
import { isLibrarySaveSupported } from '@/components/customizer/tabs/MultiUnitTabsUnitState';
import { getSavedHistoryDisabledReason } from '@/components/customizer/tabs/savedHistoryAccess';
import { useDialogHandlers } from '@/components/customizer/tabs/useMultiUnitTabsController.dialogs';
import { exportAerospace } from '@/services/conversion/BlkExportServiceCore.exporters';
import { BlkParserService } from '@/services/conversion/BlkParserService';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { customUnitApiService } from '@/services/units/CustomUnitApiService';
import { UnitRepository } from '@/services/units/UnitRepository';
import { createDefaultAerospaceState } from '@/stores/aerospaceState';
import { getAerospaceStore } from '@/stores/aerospaceStoreRegistry';
import {
  AerospaceStoreContext,
  createAerospaceStore,
} from '@/stores/useAerospaceStore';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { EngineType } from '@/types/construction/EngineType';
import { AerospaceLocation } from '@/types/construction/UnitLocation';
import { UnitContract } from '@/types/contracts';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';
import { Era } from '@/types/temporal/Era';
import {
  AerospaceCockpitType,
  AerospaceEngineType,
} from '@/types/unit/AerospaceInterfaces';
import { AerospaceMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { BayType } from '@/types/unit/CapitalShipInterfaces';
import { serializeCustomAerospaceState } from '@/utils/serialization/CustomUnitSerializer';

import { mapAerospaceDefinitionToState } from '../aerospaceDefinitionMapper';
import { isDefinitionForFamily } from '../definitionTypes';
import { UnitLoaderService } from '../unitLoader';

jest.mock('@/components/shared/Toast', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));
jest.mock('@/services/units/CustomUnitApiService', () => ({
  customUnitApiService: {
    getById: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  },
}));
jest.mock('@/stores/aerospaceStoreRegistry', () => ({
  getAerospaceStore: jest.fn(),
}));

const directory = 'public/data/units/aerospace';
const index = JSON.parse(
  fs.readFileSync(`${directory}/index.json`, 'utf8'),
) as {
  units: { id: string; path: string }[];
};
function definition(row: (typeof index.units)[number]) {
  const value = UnitContract.parse(
    JSON.parse(fs.readFileSync(path.join(directory, row.path), 'utf8')),
  );
  if (!isDefinitionForFamily('aerospace', value))
    throw new Error('Wrong catalog family');
  return value;
}
const groups = new Map<string, typeof index.units>();
for (const row of index.units) {
  const subtype = String(definition(row).subType);
  groups.set(subtype, [...(groups.get(subtype) ?? []), row]);
}
function semantic(state: ReturnType<typeof mapAerospaceDefinitionToState>) {
  const {
    id: _id,
    createdAt: _created,
    lastModifiedAt: _modified,
    isModified: _dirty,
    ...configuration
  } = state;
  return {
    ...configuration,
    equipment: state.equipment.map((mount, i) => {
      const target = state.equipment.findIndex(
        (item) => item.id === mount.linkedAmmoId,
      );
      return {
        ...mount,
        id: `mount-${i}`,
        linkedAmmoId:
          target >= 0
            ? `mount-${target}`
            : mount.linkedAmmoId === undefined
              ? undefined
              : { external: mount.linkedAmmoId },
      };
    }),
  };
}
const identity = (state: ReturnType<typeof mapAerospaceDefinitionToState>) => ({
  id: state.id,
  chassis: state.chassis,
  variant: state.model,
  era: Era.DARK_AGE,
});

it.each([
  UnitType.AEROSPACE,
  UnitType.CONVENTIONAL_FIGHTER,
  UnitType.SMALL_CRAFT,
])('allows %s library saves', (type) =>
  expect(isLibrarySaveSupported(type)).toBe(true),
);
it.each([
  UnitType.DROPSHIP,
  UnitType.JUMPSHIP,
  UnitType.WARSHIP,
  UnitType.SPACE_STATION,
])('keeps %s read-only', (type) =>
  expect(isLibrarySaveSupported(type)).toBe(false),
);
it.each([...groups])(
  'round trips real %s designs through the unit contract',
  (subtype, rows) => {
    const selected = process.env.UL25B_ALL
      ? rows
      : rows
          .filter((_, i) => i % Math.max(1, Math.floor(rows.length / 8)) === 0)
          .slice(0, 8);
    const results = selected.map((row) => {
      try {
        const original = mapAerospaceDefinitionToState(definition(row));
        const saved = JSON.parse(
          JSON.stringify(
            serializeCustomAerospaceState(original, identity(original)),
          ),
        );
        expect(saved.family).toBe('aerospace');
        const parsed = UnitContract.parse(saved);
        if (!isDefinitionForFamily('aerospace', parsed))
          throw new Error('Saved wrong family');
        expect(semantic(mapAerospaceDefinitionToState(parsed))).toEqual(
          semantic(original),
        );
        return { id: row.id, result: 'pass' };
      } catch (error) {
        return { id: row.id, result: 'fail', error: String(error) };
      }
    });
    if (process.env.UL25B_REPORT)
      fs.writeFileSync(
        `${process.env.UL25B_REPORT}/${subtype}.json`,
        JSON.stringify(results, null, 2),
      );
    expect(results.filter((row) => row.result === 'fail')).toEqual([]);
  },
);

it.each([...groups])(
  'persists edited %s fields and reopens through the production loader',
  async (_subtype, rows) => {
    getSQLiteService({ path: ':memory:' }).initialize();
    try {
      const original = mapAerospaceDefinitionToState(definition(rows[0]));
      const edited = {
        ...original,
        armorTonnage: 17.25,
        engineRating: 1300,
        fuelTons: 9.125,
        weightClass: WeightClass.LIGHT,
        engineType: EngineType.XL_CLAN,
        aerospaceEngineType: AerospaceEngineType.XL,
        motionType: AerospaceMotionType.SPHEROID,
        safeThrust: 13,
        maxThrust: 21,
        fuelPoints: 777,
        heatSinks: 17,
        heatSinkPool: 35,
        doubleHeatSinks: true,
        cockpitType: AerospaceCockpitType.COMMAND_CONSOLE,
        isOmni: true,
        hasBombBay: true,
        bombCapacity: 23,
        structuralIntegrity: 31,
        hasReinforcedCockpit: true,
        hasEjectionSeat: false,
        crew: { crew: 12, passengers: 7, marines: 3, quartersTons: 101.25 },
        bays: [
          { type: BayType.CARGO, capacity: 12.75, doors: 2, bayNumber: 4 },
        ],
        equipment: original.equipment.map((mount, i) => ({
          ...mount,
          id: `edited-${i}`,
          name: `(R) retained ${mount.name}`,
          isRearMounted: i % 2 === 0,
          linkedAmmoId: i === 0 ? 'edited-1' : i === 1 ? 'mount-0' : undefined,
        })),
      };
      const saved = serializeCustomAerospaceState(edited, identity(edited));
      expect(saved.id).toBe(edited.id);
      expect(saved.unitType).toBe(edited.unitType);
      expect(saved.era).toBe(Era.DARK_AGE);
      expect(saved.subType).toBe(_subtype);
      expect(saved).toMatchObject({
        engine: { type: 'CLAN_XL' },
        cockpit: 'COMMAND_CONSOLE',
        structuralIntegrity: 31,
        equipment: edited.equipment.map((mount) => ({
          name: mount.name,
          isRearMounted: mount.isRearMounted,
        })),
      });
      expect(saved.engine).not.toHaveProperty('rating');
      expect(saved.armor?.byArc).toHaveProperty(
        _subtype === 'SmallCraft' ? 'LEFT_SIDE' : 'LEFT_WING',
      );
      const repository = new UnitRepository();
      const created = repository.create({
        chassis: edited.chassis,
        variant: edited.model,
        data: { ...saved },
      });
      if (!created.success) throw new Error(created.error.message);
      expect(repository.list()[0].family).toBe('aerospace');
      jest
        .mocked(customUnitApiService.getById)
        .mockResolvedValue(
          JSON.parse(repository.getById(created.data.id)!.data),
        );
      const loaded = await new UnitLoaderService().loadCustomUnit(
        created.data.id,
        'aerospace',
      );
      if (loaded.familyState?.store !== 'aerospace')
        throw new Error(JSON.stringify(loaded));
      expect(semantic(loaded.familyState.state)).toEqual(semantic(edited));
      if (edited.equipment.length > 1)
        expect(loaded.familyState.state.equipment[0].linkedAmmoId).toBe(
          loaded.familyState.state.equipment[1].id,
        );
      const invalid = {
        ...saved,
        aerospaceEditor: { ...saved.aerospaceEditor, fuelTons: 'invalid' },
      };
      const parsed = UnitContract.parse(invalid);
      if (!isDefinitionForFamily('aerospace', parsed))
        throw new Error('Wrong family');
      expect(() => mapAerospaceDefinitionToState(parsed)).toThrow();
    } finally {
      resetSQLiteService();
    }
  },
);

it.each([...groups])(
  'saves %s through its aerospace store and retains concurrent edits',
  async (_subtype, rows) => {
    const state = mapAerospaceDefinitionToState(definition(rows[0]));
    const store = createAerospaceStore(state);
    jest.mocked(getAerospaceStore).mockReturnValue(store);
    const tab = {
      id: state.id,
      name: state.name,
      tonnage: state.tonnage,
      techBase: state.techBase,
      unitType: state.unitType,
    };
    let resolveSave: (value: {
      success: boolean;
      id: string;
      version: number;
    }) => void = () => undefined;
    jest.mocked(customUnitApiService.create).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSave = resolve;
        }),
    );
    const { result } = renderHook(() =>
      useDialogHandlers(jest.fn(), jest.fn(), () => tab),
    );
    act(() => result.current.openSaveDialog(state.id));
    expect(result.current.saveDialog.isOpen).toBe(true);
    let pending: Promise<void>;
    act(() => {
      pending = result.current.handleSaveDialogSave(state.chassis, state.model);
    });
    expect(customUnitApiService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        family: 'aerospace',
        unitType: state.unitType,
      }),
      state.chassis,
      state.model,
    );
    act(() => store.getState().setFuelTons(11));
    await act(async () => {
      resolveSave({ success: true, id: 'custom-aero', version: 1 });
      await pending;
    });
    expect(store.getState().fuelTons).toBe(11);
    expect(store.getState().isModified).toBe(true);
    jest
      .mocked(customUnitApiService.create)
      .mockResolvedValue({ success: true, id: 'custom-aero', version: 2 });
    act(() => result.current.openSaveDialog(state.id));
    await act(async () => {
      await result.current.handleSaveDialogSave(state.chassis, state.model);
    });
    expect(store.getState().isModified).toBe(false);
    expect(getSavedHistoryDisabledReason(tab)).toMatch(/not available/);
  },
);

it('retains optional fields on a new draft and rejects invalid mount metadata and arcs', () => {
  const state = createDefaultAerospaceState({
    name: 'New Fighter',
    tonnage: 30,
    techBase: TechBase.INNER_SPHERE,
  });
  state.equipment = [
    {
      id: 'a',
      equipmentId: 'r-test',
      name: '(R) literal',
      location: AerospaceLocation.FUSELAGE,
      isRearMounted: false,
      linkedAmmoId: 'mount-0',
    },
  ];
  state.bays = [{ type: BayType.CARGO, capacity: 1, doors: NaN, bayNumber: 1 }];
  const saved = JSON.parse(
    JSON.stringify(serializeCustomAerospaceState(state, identity(state))),
  );
  const parse = (value: unknown) => {
    const result = UnitContract.parse(value);
    if (!isDefinitionForFamily('aerospace', result))
      throw new Error('Wrong family');
    return mapAerospaceDefinitionToState(result);
  };
  expect(semantic(parse(saved))).toEqual(semantic(state));
  const blank = createDefaultAerospaceState({
    name: 'Blank Fighter',
    tonnage: 30,
    techBase: TechBase.INNER_SPHERE,
  });
  expect(
    semantic(
      parse(
        JSON.parse(
          JSON.stringify(serializeCustomAerospaceState(blank, identity(blank))),
        ),
      ),
    ),
  ).toEqual(semantic(blank));
  expect(() =>
    parse({
      ...saved,
      aerospaceEditor: { ...saved.aerospaceEditor, mounts: [] },
    }),
  ).toThrow();
  expect(() =>
    parse({
      ...saved,
      aerospaceEditor: {
        ...saved.aerospaceEditor,
        mounts: [{ name: 'a', linkedAmmoIndex: 1 }],
      },
    }),
  ).toThrow();
  expect(() =>
    serializeCustomAerospaceState(
      { ...state, armorAllocation: { invalid: 1 } } as never,
      identity(state),
    ),
  ).toThrow(/Unknown aerospace location/);
});

it('exports small craft as SmallCraft and reopens the BLK discriminator (follow-up 64)', () => {
  const state = mapAerospaceDefinitionToState(
    definition(groups.get('SmallCraft')![0]),
  );
  const exported = exportAerospace(state);
  expect(exported.success).toBe(true);
  if (!exported.success || !exported.content)
    throw new Error(JSON.stringify(exported));
  const parsed = new BlkParserService().parse(exported.content);
  expect(parsed.success).toBe(true);
  if (!parsed.success) throw new Error(JSON.stringify(parsed));
  expect(parsed.data.document.unitType).toBe('SmallCraft');
  expect(parsed.data.document.mappedUnitType).toBe(UnitType.SMALL_CRAFT);
});

// MML 62bf193 UnitUtil.getMaxArmor:900-917 returns null for SmallCraft.
// MegaMek 48fcb2f64 TestSmallCraft:99-139 limits total armor, not each side.
it.each(['AERODYNE', 'SPHEROID'])(
  'edits small-craft Side armor through the real %s tab and saves/reopens it',
  async (motionType) => {
    const row = groups.get('SmallCraft')!.find((candidate) => {
      const value = definition(candidate);
      return (
        value.motionType === motionType && value.armor?.type === 'AEROSPACE'
      );
    })!;
    const original = mapAerospaceDefinitionToState(definition(row));
    const store = createAerospaceStore(original);
    getSQLiteService({ path: ':memory:' }).initialize();
    try {
      render(
        <CustomizerConfirmationProvider
          scope={{ unitId: original.id, unitType: original.unitType }}
        >
          <AerospaceStoreContext.Provider value={store}>
            <AerospaceArmorTab />
          </AerospaceStoreContext.Provider>
        </CustomizerConfirmationProvider>,
      );
      const left = screen.getByTestId(
        `aerospace-arc-input-${AerospaceLocation.LEFT_WING}`,
      );
      const right = screen.getByTestId(
        `aerospace-arc-diagram-input-${AerospaceLocation.RIGHT_WING}`,
      );
      expect((left as HTMLInputElement).disabled).toBe(false);
      expect(left.hasAttribute('max')).toBe(false);
      expect(right.hasAttribute('max')).toBe(false);
      fireEvent.change(left, { target: { value: '80' } });
      fireEvent.change(right, { target: { value: '81' } });
      expect(
        store.getState().armorAllocation[AerospaceLocation.LEFT_WING],
      ).toBe(80);
      expect(
        store.getState().armorAllocation[AerospaceLocation.RIGHT_WING],
      ).toBe(81);

      const edited = store.getState();
      const saved = serializeCustomAerospaceState(edited, identity(edited));
      expect(saved.armor?.byArc).toMatchObject({
        LEFT_SIDE: 80,
        RIGHT_SIDE: 81,
      });
      const repository = new UnitRepository();
      const created = repository.create({
        chassis: edited.chassis,
        variant: edited.model,
        data: { ...saved },
      });
      if (!created.success) throw new Error(created.error.message);
      jest
        .mocked(customUnitApiService.getById)
        .mockResolvedValue(
          JSON.parse(repository.getById(created.data.id)!.data),
        );
      const loaded = await new UnitLoaderService().loadCustomUnit(
        created.data.id,
        'aerospace',
      );
      if (loaded.familyState?.store !== 'aerospace')
        throw new Error(JSON.stringify(loaded));
      expect(loaded.familyState.state.armorAllocation).toEqual(
        edited.armorAllocation,
      );
    } finally {
      cleanup();
      resetSQLiteService();
    }
  },
);

const nativeSmallCraft = groups
  .get('SmallCraft')!
  .filter((row) =>
    ['PRIMITIVE_AERO', 'HEAVY_FERRO_ALUMINUM'].includes(
      definition(row).armor!.type,
    ),
  );
it.each(nativeSmallCraft)(
  'retains native small-craft armor identity across a saved reload: $id',
  (row) => {
    const source = definition(row);
    const original = mapAerospaceDefinitionToState(source);
    const saved = serializeCustomAerospaceState(original, identity(original));
    expect(saved.armor?.type).toBe(source.armor!.type);
    if (!isDefinitionForFamily('aerospace', saved))
      throw new Error('Saved wrong family');
    const reopened = mapAerospaceDefinitionToState(saved);
    expect(reopened.armorAllocation).toEqual(original.armorAllocation);
    expect(
      serializeCustomAerospaceState(reopened, identity(reopened)).armor,
    ).toEqual(saved.armor);
  },
);

it('censuses all 39 catalog small craft through editable location inputs and saved reloads', () => {
  const rows = groups.get('SmallCraft')!;
  expect(rows).toHaveLength(39);
  expect(nativeSmallCraft).toHaveLength(6);
  const shapes = { AERODYNE: 0, SPHEROID: 0 };
  for (const row of rows) {
    const source = definition(row);
    const state = mapAerospaceDefinitionToState(source);
    const store = createAerospaceStore(state);
    shapes[source.motionType === 'SPHEROID' ? 'SPHEROID' : 'AERODYNE']++;
    try {
      render(
        <CustomizerConfirmationProvider
          scope={{ unitId: state.id, unitType: state.unitType }}
        >
          <AerospaceStoreContext.Provider value={store}>
            <AerospaceArmorTab />
          </AerospaceStoreContext.Provider>
        </CustomizerConfirmationProvider>,
      );
      for (const location of [
        AerospaceLocation.NOSE,
        AerospaceLocation.LEFT_WING,
        AerospaceLocation.RIGHT_WING,
        AerospaceLocation.AFT,
      ]) {
        const input = screen.getByTestId(
          `aerospace-arc-input-${location}`,
        ) as HTMLInputElement;
        const original = state.armorAllocation[location] ?? 0;
        expect({
          id: row.id,
          location,
          disabled: input.disabled,
          max: input.getAttribute('max'),
        }).toEqual({ id: row.id, location, disabled: false, max: null });
        fireEvent.change(input, { target: { value: String(original + 1) } });
        expect(store.getState().armorAllocation[location]).toBe(original + 1);
        fireEvent.change(input, { target: { value: String(original) } });
        expect(store.getState().armorAllocation[location]).toBe(original);
      }
      const saved = serializeCustomAerospaceState(
        store.getState(),
        identity(state),
      );
      if (!isDefinitionForFamily('aerospace', saved))
        throw new Error('Saved wrong family');
      expect(saved.armor?.type).toBe(source.armor?.type);
      const reopened = mapAerospaceDefinitionToState(saved);
      expect(reopened.armorAllocation).toEqual(state.armorAllocation);
      expect(reopened.armorTonnage).toBe(state.armorTonnage);
    } finally {
      cleanup();
      localStorage.removeItem(`megamek-aerospace-${state.id}`);
    }
  }
  expect(shapes).toEqual({ AERODYNE: 31, SPHEROID: 8 });
});

it('reports the small-craft status without a false negative at 836 legal armor points', () => {
  const row = groups
    .get('SmallCraft')!
    .find((entry) => entry.id === 'ares-attack-craft-mark-ix')!;
  const state = mapAerospaceDefinitionToState(definition(row));
  const store = createAerospaceStore(state);
  try {
    render(
      <CustomizerConfirmationProvider
        scope={{ unitId: state.id, unitType: state.unitType }}
      >
        <AerospaceStoreContext.Provider value={store}>
          <AerospaceArmorTab />
          <AerospaceStatusBar />
        </AerospaceStoreContext.Provider>
      </CustomizerConfirmationProvider>,
    );
    fireEvent.click(screen.getByTestId('aerospace-armor-maximize'));
    const input = screen.getByTestId(
      `aerospace-arc-input-${AerospaceLocation.LEFT_WING}`,
    );
    fireEvent.change(input, { target: { value: '478' } });
    expect(screen.getByTestId('aerospace-armor-allocated').textContent).toBe(
      '836',
    );
    const counter = screen.getByText('Armor', { exact: true }).parentElement;
    expect(counter?.textContent).toContain('836');
    expect(counter?.textContent).not.toMatch(/-\d/);
  } finally {
    cleanup();
    localStorage.removeItem(`megamek-aerospace-${state.id}`);
  }
});

it.each([
  ArmorTypeEnum.FERRO_FIBROUS_IS,
  ArmorTypeEnum.FERRO_FIBROUS_CLAN,
  ArmorTypeEnum.LIGHT_FERRO,
  ArmorTypeEnum.HEAVY_FERRO,
])(
  'reopens an older shared armor tag after a small-craft armor-type edit: %s',
  (armorType) => {
    const row = groups
      .get('SmallCraft')!
      .find((entry) => entry.id === 'ares-attack-craft-mark-ix')!;
    const store = createAerospaceStore(
      mapAerospaceDefinitionToState(definition(row)),
    );
    store.getState().setArmorType(armorType);
    expect(store.getState().smallCraftArmorType).toBeUndefined();
    const saved = serializeCustomAerospaceState(
      store.getState(),
      identity(store.getState()),
    );
    if (!isDefinitionForFamily('aerospace', saved))
      throw new Error('Saved wrong family');
    const reopened = mapAerospaceDefinitionToState(saved);
    expect(reopened.armorType).toBe(armorType);
    expect(reopened.armorAllocation).toEqual(store.getState().armorAllocation);
  },
);
