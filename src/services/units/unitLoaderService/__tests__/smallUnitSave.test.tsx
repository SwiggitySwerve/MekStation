import { act, renderHook } from '@testing-library/react';
import fs from 'fs';
import path from 'path';

import {
  getLibrarySaveStore,
  isLibrarySaveSupported,
} from '@/components/customizer/tabs/MultiUnitTabsUnitState';
import { getSavedHistoryDisabledReason } from '@/components/customizer/tabs/savedHistoryAccess';
import { useDialogHandlers } from '@/components/customizer/tabs/useMultiUnitTabsController.dialogs';
import {
  exportBattleArmor,
  exportProtoMech,
} from '@/services/conversion/BlkExportServiceCore.exporters';
import { BlkParserService } from '@/services/conversion/BlkParserService';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { customUnitApiService } from '@/services/units/CustomUnitApiService';
import { createBattleArmorHandler } from '@/services/units/handlers/BattleArmorUnitHandler';
import { createProtoMechHandler } from '@/services/units/handlers/ProtoMechUnitHandler';
import { UnitRepository } from '@/services/units/UnitRepository';
import { createDefaultBattleArmorState } from '@/stores/battleArmorState';
import { getBattleArmorStore } from '@/stores/battleArmorStoreRegistry';
import { createDefaultProtoMechState } from '@/stores/protoMechState';
import { getProtoMechStore } from '@/stores/protoMechStoreRegistry';
import { createBattleArmorStore } from '@/stores/useBattleArmorStore';
import { createProtoMechStore } from '@/stores/useProtoMechStore';
import { UnitContract } from '@/types/contracts';
import { Era } from '@/types/temporal/Era';
import { BAArmorType } from '@/types/unit/BattleArmorInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';
import { isProtoEDPArmorMount } from '@/utils/construction/protomech/armorType';
import {
  computeProtoArmorWeight,
  computeProtoWeight,
} from '@/utils/construction/protomech/weight';
import { serializeCustomSmallUnitState } from '@/utils/serialization/CustomUnitSerializer';

import { isDefinitionForFamily } from '../definitionTypes';
import { loadUnitDefinition } from '../loadUnitDefinition';
import {
  mapBattleArmorDefinitionToState,
  mapProtoMechDefinitionToState,
} from '../smallUnitDefinitionMapper';
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
jest.mock('@/stores/protoMechStoreRegistry', () => ({
  getProtoMechStore: jest.fn(),
}));
jest.mock('@/stores/battleArmorStoreRegistry', () => ({
  getBattleArmorStore: jest.fn(),
}));

const families = [
  {
    family: 'protomechs',
    type: UnitType.PROTOMECH,
    map: mapProtoMechDefinitionToState,
  },
  {
    family: 'battlearmor',
    type: UnitType.BATTLE_ARMOR,
    map: mapBattleArmorDefinitionToState,
  },
] as const;
type SmallState = ReturnType<(typeof families)[number]['map']>;
function renamedMounts<T extends { name: string; equipmentId: string }>(
  mounts: readonly T[],
): T[] {
  return mounts.map((mount, index) => ({
    ...mount,
    name: `edited ${index}`,
    equipmentId: `edited-${index}`,
  }));
}
function semantic(state: SmallState) {
  const {
    id: _id,
    createdAt: _created,
    lastModifiedAt: _modified,
    isModified: _dirty,
    bvBreakdown: _bv,
    ...facts
  } = state;
  return {
    ...facts,
    equipment: state.equipment.map((mount, index) => {
      const linked = 'linkedAmmoId' in mount ? mount.linkedAmmoId : undefined;
      const target = state.equipment.findIndex((m) => m.id === linked);
      return {
        ...mount,
        id: `mount-${index}`,
        ...('linkedAmmoId' in mount
          ? { linkedAmmoId: target < 0 ? linked : `mount-${target}` }
          : {}),
      };
    }),
  };
}
const identity = (state: SmallState) => ({
  id: 'custom-small',
  chassis: state.chassis,
  variant: state.model,
  era: Era.DARK_AGE,
});

it.each([
  ['Basilisk ProtoMech (Quad).json', 2.4, 255],
  ['Basilisk ProtoMech (Quad) B.json', 2.1, 234],
] as const)(
  'retains EDP armor, mass and single equipment BV through real-store save/reopen: %s',
  async (file, armorMass, expectedBV) => {
    getSQLiteService({ path: ':memory:' }).initialize();
    try {
      const definition = UnitContract.parse(
        JSON.parse(
          fs.readFileSync(
            path.join('public/data/units/protomechs', file),
            'utf8',
          ),
        ),
      );
      const store = createProtoMechStore(
        mapProtoMechDefinitionToState(definition),
      );
      store.getState().setArmorType(42);
      expect(
        serializeCustomSmallUnitState(
          store.getState(),
          identity(store.getState()),
        ).armor?.type,
      ).toBe('STANDARD_PROTOMEK');
      expect(
        store
          .getState()
          .equipment.filter((m) => isProtoEDPArmorMount(m.equipmentId)),
      ).toHaveLength(0);
      store.getState().setArmorType(18);
      expect(store.getState().bvBreakdown?.final).toBe(expectedBV);
      const state = store.getState();
      const serialized = serializeCustomSmallUnitState(state, identity(state));
      expect(serialized.armor?.type).toBe('ELECTRIC_DISCHARGE');
      const repository = new UnitRepository();
      const saved = repository.create({
        chassis: state.chassis,
        variant: state.model,
        data: serialized,
      });
      if (!saved.success) throw new Error(saved.error.message);
      jest
        .mocked(customUnitApiService.getById)
        .mockResolvedValue(JSON.parse(repository.getById(saved.data.id)!.data));
      const loaded = await new UnitLoaderService().loadCustomUnit(
        saved.data.id,
        'protomechs',
      );
      if (loaded.familyState?.store !== 'protomech')
        throw new Error('Wrong reopened family');
      const reopened = createProtoMechStore(
        loaded.familyState.state,
      ).getState();
      expect(reopened.armorType).toBe(18);
      expect(
        reopened.equipment.filter((m) => isProtoEDPArmorMount(m.equipmentId)),
      ).toHaveLength(1);
      expect(reopened.bvBreakdown?.final).toBe(expectedBV);
      expect(
        computeProtoArmorWeight(
          Object.values(reopened.armorByLocation).reduce((a, b) => a + b, 0),
          reopened.armorType,
        ),
      ).toBe(armorMass);
      expect(
        computeProtoWeight({ ...reopened, weightPerUnit: reopened.tonnage })
          .total,
      ).toBe(file.includes(' B.') ? 6.475 : 7);
    } finally {
      resetSQLiteService();
    }
  },
);
function rows(family: string) {
  const directory = `public/data/units/${family}`;
  const index = JSON.parse(
    fs.readFileSync(`${directory}/index.json`, 'utf8'),
  ) as { units: { id: string; path: string }[] };
  return index.units.map((row) => ({
    ...row,
    definition: () =>
      UnitContract.parse(
        JSON.parse(fs.readFileSync(path.join(directory, row.path), 'utf8')),
      ),
  }));
}
function inspected(state: SmallState) {
  const exported =
    state.unitType === UnitType.PROTOMECH
      ? exportProtoMech(state)
      : exportBattleArmor(state);
  if (!exported.success || !exported.content)
    throw new Error(JSON.stringify(exported));
  const document = new BlkParserService().parse(exported.content);
  if (!document.success) throw new Error(JSON.stringify(document.error));
  if (state.unitType === UnitType.PROTOMECH) {
    const handler = createProtoMechHandler();
    const result = handler.parse(document.data.document);
    if (!result.success) throw new Error(JSON.stringify(result.error));
    const unit = {
      ...result.data.unit,
      engineRating: state.engineRating,
      armorType: state.armorType,
    };
    return {
      bv: calculateBattleValueForUnit(unit),
      validity: handler.validate(unit),
    };
  }
  const handler = createBattleArmorHandler();
  const result = handler.parse(document.data.document);
  if (!result.success) throw new Error(JSON.stringify(result.error));
  // The legacy BLK exporter omits mount locations and native armor tech. Feed
  // those retained facts into the current handler rules rather than losing them.
  const source = state.librarySource;
  const unit = {
    ...result.data.unit,
    equipment: state.equipment,
    armorType: state.armorType,
    sourceArmorTech:
      source && isDefinitionForFamily('battlearmor', source)
        ? source.armor?.sourceTechLevel
        : undefined,
    umuMP: state.umuMP,
    hasMechanicalJumpBoosters: state.hasMechanicalJumpBoosters,
  };
  return {
    bv: calculateBattleValueForUnit(unit),
    validity: handler.validate(unit),
  };
}

it.each(families)('allows $family library saving', ({ type }) =>
  expect(isLibrarySaveSupported(type)).toBe(true),
);
it('supports the completed infantry save slice', () =>
  expect(isLibrarySaveSupported(UnitType.INFANTRY)).toBe(true));

it('loads an actual family-less saved definition as a BattleMech', async () => {
  const definition = rows('battlemechs')[0].definition();
  expect(definition.family).toBeUndefined();
  jest
    .mocked(customUnitApiService.getById)
    .mockResolvedValue(JSON.parse(JSON.stringify(definition)));
  expect(
    await loadUnitDefinition('battlemechs', 'legacy-mech', 'custom'),
  ).toMatchObject({
    success: true,
    family: 'battlemechs',
    definition: { unitType: definition.unitType },
  });
});

it.each([createDefaultProtoMechState, createDefaultBattleArmorState])(
  'saves a newly created draft without inventing a catalog source',
  (create) => {
    const state = create();
    const saved = UnitContract.parse(
      JSON.parse(
        JSON.stringify(serializeCustomSmallUnitState(state, identity(state))),
      ),
    );
    const reopened =
      state.unitType === UnitType.PROTOMECH
        ? mapProtoMechDefinitionToState(saved)
        : mapBattleArmorDefinitionToState(saved);
    expect(semantic(reopened)).toEqual(semantic(state));
    expect(reopened.librarySource).toBeUndefined();
  },
);

it.each(families)(
  'round trips committed $family facts and provenance',
  ({ family, map }) => {
    const all = rows(family);
    const selected = process.env.UL25C_ALL
      ? all
      : all
          .filter((_, i) => i % Math.max(1, Math.floor(all.length / 8)) === 0)
          .slice(0, 8);
    const results = selected.map((row) => {
      try {
        const definition = row.definition();
        const original = map(definition);
        const saved = UnitContract.parse(
          JSON.parse(
            JSON.stringify(
              serializeCustomSmallUnitState(original, identity(original)),
            ),
          ),
        );
        expect(saved.family).toBe(family);
        const reopened = map(saved);
        expect(semantic(reopened)).toEqual(semantic(original));
        expect(reopened.librarySource).toEqual(definition);
        const before = inspected(original);
        const after = inspected(reopened);
        expect(after).toEqual(before);
        expect(after.bv?.breakdown.final).toBeGreaterThanOrEqual(0);
        return { id: row.id, result: 'pass', before, after };
      } catch (error) {
        return { id: row.id, result: 'fail', error: String(error) };
      }
    });
    if (process.env.UL25C_REPORT)
      fs.writeFileSync(
        `${process.env.UL25C_REPORT}/${family}.json`,
        JSON.stringify(results, null, 2),
      );
    expect(results.filter((row) => row.result === 'fail')).toEqual([]);
  },
);

it.each(families)(
  'persists $family drafts and reopens through the production loader',
  async ({ family, map }) => {
    getSQLiteService({ path: ':memory:' }).initialize();
    try {
      const original = map(rows(family)[0].definition());
      const edited = { ...original, year: 3149, name: 'Temporary name' };
      if (edited.unitType === UnitType.PROTOMECH) {
        edited.pointSize = 3;
        edited.engineRating = 55;
        edited.glidingWings = true;
        edited.hasExtendedTorsoTwist = true;
        edited.equipment = renamedMounts(edited.equipment).map((mount, i) => ({
          ...mount,
          linkedAmmoId: i === 0 ? edited.equipment[1]?.id : 'external-ammo',
        }));
      } else {
        edited.weightPerTrooper = 875;
        edited.hasModularMount = true;
        edited.armorType = 35;
        edited.baArmorType = BAArmorType.FIRE_RESISTANT;
        edited.hasFireResistantArmor = true;
        edited.equipment = renamedMounts(edited.equipment);
      }
      const saved = serializeCustomSmallUnitState(edited, identity(edited));
      expect(saved.year).toBe(3149);
      expect(saved.id).toBe('custom-small');
      expect(saved.unitType).toBe(edited.unitType);
      if (edited.unitType === UnitType.PROTOMECH)
        expect(saved.engine?.rating).toBe(55);
      else expect(saved.armor?.type).toBe('FIRE_RESISTANT');
      const repository = new UnitRepository();
      const created = repository.create({
        chassis: edited.chassis,
        variant: edited.model,
        data: saved,
      });
      if (!created.success) throw new Error(created.error.message);
      expect(repository.list()[0].family).toBe(family);
      jest
        .mocked(customUnitApiService.getById)
        .mockResolvedValue(
          JSON.parse(repository.getById(created.data.id)!.data),
        );
      const loaded = await new UnitLoaderService().loadCustomUnit(
        created.data.id,
        family,
      );
      if (
        loaded.familyState?.store !== 'protomech' &&
        loaded.familyState?.store !== 'battlearmor'
      )
        throw new Error(JSON.stringify(loaded));
      expect(loaded.familyState.store).toBe(
        family === 'protomechs' ? 'protomech' : 'battlearmor',
      );
      const reopened = loaded.familyState.state;
      expect(semantic(reopened)).toEqual(
        semantic({
          ...edited,
          name: `${edited.chassis} ${edited.model}`.trim(),
        }),
      );
      expect(reopened.librarySource).toEqual(original.librarySource);
      const savedAgain = serializeCustomSmallUnitState(
        reopened,
        identity(reopened),
      );
      expect(savedAgain.smallUnitEditor.librarySource).toEqual(
        original.librarySource,
      );
      const invalid = UnitContract.parse({
        ...saved,
        smallUnitEditor: { ...saved.smallUnitEditor, year: 'invalid' },
      });
      expect(() => map(invalid)).toThrow();
    } finally {
      resetSQLiteService();
    }
  },
);

it.each(families)(
  'routes $family saves to its own store and retains concurrent edits',
  async ({ family, map, type }) => {
    const state = map(rows(family)[0].definition());
    const store =
      state.unitType === UnitType.PROTOMECH
        ? createProtoMechStore(state)
        : createBattleArmorStore(state);
    if (state.unitType === UnitType.PROTOMECH)
      jest
        .mocked(getProtoMechStore)
        .mockReturnValue(store as ReturnType<typeof createProtoMechStore>);
    else
      jest
        .mocked(getBattleArmorStore)
        .mockReturnValue(store as ReturnType<typeof createBattleArmorStore>);
    const saveStore = getLibrarySaveStore(state.id, type);
    if (!saveStore) throw new Error('Missing small-unit save store');
    expect(saveStore).toBe(store);
    const tab = {
      id: state.id,
      name: state.name,
      tonnage: 1,
      techBase: state.techBase,
      unitType: type,
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
      expect.objectContaining({ family, unitType: type }),
      state.chassis,
      state.model,
    );
    act(() => store.getState().setYear(3148));
    await act(async () => {
      resolveSave({ success: true, id: 'custom-small', version: 1 });
      await pending;
    });
    expect(store.getState().year).toBe(3148);
    expect(store.getState().isModified).toBe(true);
    jest
      .mocked(customUnitApiService.create)
      .mockResolvedValue({ success: true, id: 'custom-small', version: 2 });
    act(() => result.current.openSaveDialog(state.id));
    await act(async () => {
      await result.current.handleSaveDialogSave(state.chassis, state.model);
    });
    expect(store.getState().isModified).toBe(false);
    expect(getSavedHistoryDisabledReason(tab)).toMatch(/not available/);
    const persisted = JSON.parse(
      localStorage.getItem(
        `megamek-${family === 'protomechs' ? 'protomech' : 'battlearmor'}-${state.id}`,
      )!,
    );
    expect(persisted.state.librarySource).toEqual(state.librarySource);
  },
);
