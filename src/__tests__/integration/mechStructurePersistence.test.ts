import { renderHook } from '@testing-library/react';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { useUnitCalculations } from '@/hooks/useUnitCalculations';
import { MTFParserService } from '@/services/conversion/MTFParserService';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { UnitLoaderService } from '@/services/units/unitLoaderService';
import { mapStructureType } from '@/services/units/unitLoaderService/componentMappers';
import { parseUnit } from '@/services/units/unitLoaderService/unitContractAdapter';
import {
  getUnitRepository,
  resetUnitRepository,
} from '@/services/units/UnitRepository';
import {
  getUnitEditHistory,
  runUnitEditTransaction,
} from '@/stores/unit/unitEditHistory';
import {
  getUnitDraftFingerprint,
  getUnitLibraryFingerprint,
  recordUnitLibrarySave,
} from '@/stores/unit/unitEditSnapshot';
import { createUnitStore } from '@/stores/unit/useUnitStore';
import { type UnitState } from '@/stores/unitState';
import {
  clearAllStores,
  createUnitFromFullState,
  duplicateUnit,
  hydrateOrCreateUnit,
} from '@/stores/unitStoreRegistry';
import {
  InternalStructureType,
  mapSerializedStructureType,
} from '@/types/construction/InternalStructureType';
import { TechBase } from '@/types/enums/TechBase';
import { Era } from '@/types/temporal/Era';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';
import { type ISerializedStructure } from '@/types/unit/UnitSerialization';
import { getEquipmentPayloadWeight } from '@/utils/equipment/equipmentWeightAccounting';
import { serializeCustomUnitState } from '@/utils/serialization/CustomUnitSerializer';

import ares from '../../../public/data/units/battlemechs/6-dark-age/experimental/Ares ARS-V1 Zeus.json';

jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));

// Keep the named data dependency readable by the Jest cache key scanner.
const drizella = parseUnit(
  JSON.parse(
    readFileSync(
      join(
        process.cwd(),
        "public/data/units/battlemechs/6-dark-age/standard/Hunchback HBK-LGN-Pin 'Drizella'.json",
      ),
      'utf8',
    ),
  ),
);

const donorStructure = (): ISerializedStructure => {
  // Native declarations from mm-data 50f7efe Drizella; no catalog regeneration.
  const parsed = new MTFParserService().parse(
    [
      'chassis:Hunchback',
      'model:HBK-LGN-Pin Drizella',
      'Config:Biped FrankenMek',
      'mass:50',
      'structure:Hybrid',
      'LA structure:Standard:50',
      'RA structure:Standard:50',
      'LT structure:Clan Endo Steel:50',
      'RT structure:Clan Endo Steel:50',
      'CT structure:IS Endo Steel:50',
      'HD structure:IS Endo Steel:50',
      'LL structure:Standard:50',
      'RL structure:Standard:50',
    ].join('\n'),
  );
  if (!parsed.success || !parsed.unit)
    throw new Error(parsed.errors.join('; '));
  return parsed.unit.structure;
};

const loadMixed = () =>
  new UnitLoaderService().mapToUnitState(
    parseUnit({ ...drizella, structure: donorStructure() }),
    true,
  );
const serialize = (state: UnitState) =>
  serializeCustomUnitState(state, {
    id: state.id,
    chassis: state.chassis,
    variant: state.model,
    era: Era.DARK_AGE,
  });
const mass = (state: UnitState, total = false) => {
  const { result, unmount } = renderHook(() =>
    useUnitCalculations(
      state.tonnage,
      state,
      state.armorTonnage,
      state.configuration,
    ),
  );
  const value = total
    ? result.current.totalStructuralWeight +
      getEquipmentPayloadWeight(state.equipment)
    : result.current.structureWeight;
  unmount();
  return value;
};

describe('serialized global structure identity compatibility', () => {
  const cases: readonly [
    string,
    InternalStructureType,
    InternalStructureType,
  ][] = [
    [
      'STANDARD',
      InternalStructureType.STANDARD,
      InternalStructureType.STANDARD,
    ],
    [
      'endo steel',
      InternalStructureType.ENDO_STEEL_IS,
      InternalStructureType.ENDO_STEEL_CLAN,
    ],
    [
      'ENDO',
      InternalStructureType.ENDO_STEEL_IS,
      InternalStructureType.ENDO_STEEL_CLAN,
    ],
    [
      'ENDO_STEEL_IS',
      InternalStructureType.ENDO_STEEL_IS,
      InternalStructureType.ENDO_STEEL_IS,
    ],
    [
      'Endo-Steel-Clan',
      InternalStructureType.ENDO_STEEL_CLAN,
      InternalStructureType.ENDO_STEEL_CLAN,
    ],
    [
      'ENDO_COMPOSITE',
      InternalStructureType.ENDO_COMPOSITE,
      InternalStructureType.ENDO_COMPOSITE,
    ],
    [
      'REINFORCED',
      InternalStructureType.REINFORCED,
      InternalStructureType.REINFORCED,
    ],
    [
      'COMPOSITE',
      InternalStructureType.COMPOSITE,
      InternalStructureType.COMPOSITE,
    ],
    [
      'INDUSTRIAL',
      InternalStructureType.INDUSTRIAL,
      InternalStructureType.INDUSTRIAL,
    ],
    [
      'ENDO_COMPOSITE_CLAN',
      InternalStructureType.STANDARD,
      InternalStructureType.STANDARD,
    ],
    ['unknown', InternalStructureType.STANDARD, InternalStructureType.STANDARD],
  ];

  it.each(cases)(
    'retains the existing global meaning of %s',
    (source, innerSphere, clan) => {
      for (const [techBase, expected] of [
        [TechBase.INNER_SPHERE, innerSphere],
        [TechBase.CLAN, clan],
      ] as const) {
        expect(mapStructureType(source, techBase)).toBe(expected);
        expect(mapSerializedStructureType(source, techBase)).toBe(expected);
      }
    },
  );
});

describe('native donor structure mass through persistence', () => {
  let directory: string;
  let databasePath: string;
  beforeAll(async () => {
    await getEquipmentRegistry().initialize();
    await getEquipmentLookupService().initialize();
  });
  beforeEach(() => {
    localStorage.clear();
    clearAllStores();
    resetUnitRepository();
    resetSQLiteService();
    directory = mkdtempSync(join(tmpdir(), 'mech-structure-persistence-'));
    databasePath = join(directory, 'library.db');
    getSQLiteService({ path: databasePath }).initialize();
  });
  afterEach(() => {
    clearAllStores();
    localStorage.clear();
    resetUnitRepository();
    resetSQLiteService();
    rmSync(directory, { recursive: true, force: true });
  });

  it('retains imported donor facts across a real library save, closed database reopen and cold draft hydration', () => {
    const store = createUnitFromFullState(loadMixed());
    const initial = store.getState();
    expect(initial.frankenStructure).toEqual(donorStructure());
    expect(mass(initial)).toBe(3.5);
    expect(mass(initial, true)).toBe(50);
    const saved = serialize(initial);
    expect(saved.structure).toEqual(donorStructure());
    const result = getUnitRepository().create({
      chassis: initial.chassis,
      variant: initial.model,
      data: { ...saved },
    });
    if (!result.success || !result.data)
      throw new Error('Library write failed');
    const libraryId = result.data.id;
    recordUnitLibrarySave(store, { id: libraryId, version: 1 }, initial);
    expect(store.getState().isModified).toBe(false);
    resetUnitRepository();
    resetSQLiteService();
    getSQLiteService({ path: databasePath }).initialize();
    const record = getUnitRepository().getById(libraryId);
    if (!record) throw new Error('Persisted library record missing');
    const reopened = new UnitLoaderService().mapToUnitState(
      parseUnit(JSON.parse(record.data)),
      false,
    );
    expect(reopened.frankenStructure).toEqual(initial.frankenStructure);
    expect(mass(reopened)).toBe(mass(initial));
    expect(mass(reopened, true)).toBe(50);
    const id = initial.id;
    clearAllStores();
    const cold = hydrateOrCreateUnit(id, {
      id,
      name: 'Fallback',
      tonnage: 20,
      techBase: TechBase.CLAN,
    });
    expect(cold.getState().frankenStructure).toEqual(initial.frankenStructure);
    expect(cold.getState().librarySave?.id).toBe(libraryId);
    expect(mass(cold.getState())).toBe(mass(initial));
    expect(mass(cold.getState(), true)).toBe(50);
  });

  it('owns both maps at import, full-state registration, duplication and serialization boundaries', () => {
    const types = { LEFT_ARM: 'ENDO_STEEL_CLAN' };
    const tonnages = { LEFT_ARM: 65 };
    const structure = {
      type: 'STANDARD',
      typeByLocation: types,
      locationTonnage: tonnages,
    };
    const state = new UnitLoaderService().mapToUnitState(
      parseUnit({ ...drizella, structure }),
      true,
    );
    types.LEFT_ARM = 'STANDARD';
    tonnages.LEFT_ARM = 100;
    expect(state.frankenStructure).toEqual({
      type: 'STANDARD',
      typeByLocation: { LEFT_ARM: 'ENDO_STEEL_CLAN' },
      locationTonnage: { LEFT_ARM: 65 },
    });
    const loaded = new UnitLoaderService().mapToUnitState(
      { ...drizella, structure },
      true,
    );
    types.LEFT_ARM = 'ENDO_STEEL';
    tonnages.LEFT_ARM = 35;
    expect(loaded.frankenStructure).toEqual({
      type: 'STANDARD',
      typeByLocation: { LEFT_ARM: 'STANDARD' },
      locationTonnage: { LEFT_ARM: 100 },
    });
    const source = createUnitFromFullState(loaded);
    expect(source.getState().frankenStructure).not.toBe(
      loaded.frankenStructure,
    );
    const copy = duplicateUnit(source.getState().id);
    if (!copy) throw new Error('Duplicate failed');
    const original = source.getState().frankenStructure;
    expect(copy.getState().frankenStructure).toEqual(original);
    expect(copy.getState().frankenStructure?.typeByLocation).not.toBe(
      original?.typeByLocation,
    );
    expect(copy.getState().frankenStructure?.locationTonnage).not.toBe(
      original?.locationTonnage,
    );
    const saved = serialize(source.getState());
    expect(saved.structure).toEqual(original);
    expect(saved.structure.typeByLocation).not.toBe(original?.typeByLocation);
    expect(saved.structure.locationTonnage).not.toBe(original?.locationTonnage);
  });

  it('undoes adding metadata back to absence, redoes it, tracks dirty state and restores overrides after material replacement', () => {
    const base = new UnitLoaderService().mapToUnitState(drizella, true);
    const store = createUnitStore(base);
    const history = getUnitEditHistory(store);
    const clean = getUnitDraftFingerprint(store.getState());
    expect(mass(store.getState())).toBe(5);
    runUnitEditTransaction(store, 'Import donor structure', () =>
      store.setState({ frankenStructure: donorStructure() }),
    );
    expect(mass(store.getState())).toBe(3.5);
    expect(history.getState().canUndo).toBe(true);
    expect(store.getState().isModified).toBe(true);
    expect(getUnitDraftFingerprint(store.getState())).not.toBe(clean);
    history.getState().undo();
    expect(store.getState().frankenStructure).toBeUndefined();
    expect(mass(store.getState())).toBe(5);
    expect(getUnitDraftFingerprint(store.getState())).toBe(clean);
    expect(store.getState().isModified).toBe(false);
    history.getState().redo();
    expect(store.getState().frankenStructure).toEqual(donorStructure());
    expect(mass(store.getState())).toBe(3.5);
    const libraryBefore = getUnitLibraryFingerprint(store.getState());
    store
      .getState()
      .setInternalStructureType(InternalStructureType.ENDO_STEEL_IS);
    expect(store.getState().frankenStructure).toBeUndefined();
    expect(mass(store.getState())).toBe(2.5);
    expect(serialize(store.getState()).structure).toEqual({
      type: 'ENDO_STEEL',
    });
    expect(getUnitLibraryFingerprint(store.getState())).not.toBe(libraryBefore);
    history.getState().undo();
    expect(store.getState().frankenStructure).toEqual(donorStructure());
    expect(mass(store.getState())).toBe(3.5);
    history.getState().redo();
    expect(store.getState().frankenStructure).toBeUndefined();
  });

  it('includes map-only edits in draft/library fingerprints and clean-save undo state', () => {
    const store = createUnitStore(loadMixed());
    recordUnitLibrarySave(
      store,
      { id: 'custom-donor', version: 1 },
      store.getState(),
    );
    const original = getUnitLibraryFingerprint(store.getState());
    const structure = donorStructure();
    runUnitEditTransaction(store, 'Change donor mass', () =>
      store.setState({
        frankenStructure: {
          ...structure,
          locationTonnage: { ...structure.locationTonnage, RIGHT_LEG: 90 },
        },
      }),
    );
    expect(mass(store.getState())).toBe(4);
    expect(getUnitLibraryFingerprint(store.getState())).not.toBe(original);
    expect(store.getState().isModified).toBe(true);
    getUnitEditHistory(store).getState().undo();
    expect(mass(store.getState())).toBe(3.5);
    expect(getUnitLibraryFingerprint(store.getState())).toBe(original);
    expect(store.getState().isModified).toBe(false);
  });

  it.each([
    { type: 'STANDARD' },
    { type: 'STANDARD', locationTonnage: { LEFT_ARM: 70 } },
    { type: 'STANDARD', locationTonnage: { LEFT_ARM: 35 }, typeByLocation: {} },
  ])('preserves map presence and legacy arithmetic for %j', (structure) => {
    const loaded = new UnitLoaderService().mapToUnitState(
      parseUnit({ ...drizella, structure }),
      true,
    );
    const saved = serialize(loaded);
    expect(saved.structure).toEqual(structure);
    expect(Object.hasOwn(saved.structure, 'typeByLocation')).toBe(
      Object.hasOwn(structure, 'typeByLocation'),
    );
    expect(mass(loaded)).toBe(5);
    const reopened = new UnitLoaderService().mapToUnitState(
      parseUnit(saved),
      false,
    );
    expect(serialize(reopened).structure).toEqual(structure);
  });

  it('keeps effective Tripod configuration and the existing center-leg armor through save/reload and duplication', () => {
    const state = new UnitLoaderService().mapToUnitState(parseUnit(ares), true);
    expect(state.configuration).toBe(MechConfiguration.TRIPOD);
    expect(state.armorTonnage).toBe(28.5);
    expect(mass(state)).toBe(22.5);
    const store = createUnitFromFullState(state);
    const copied = duplicateUnit(state.id);
    if (!copied) throw new Error('Tripod duplicate failed');
    expect(copied.getState().configuration).toBe(MechConfiguration.TRIPOD);
    const reopened = new UnitLoaderService().mapToUnitState(
      parseUnit(serialize(store.getState())),
      false,
    );
    expect(reopened.configuration).toBe(MechConfiguration.TRIPOD);
    expect(reopened.armorTonnage).toBe(28.5);
    expect(mass(reopened)).toBe(mass(state));
  });
});
