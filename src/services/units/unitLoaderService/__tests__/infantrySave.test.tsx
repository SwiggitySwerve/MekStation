import { act, renderHook } from '@testing-library/react';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';

import {
  getLibrarySaveStore,
  isLibrarySaveSupported,
} from '@/components/customizer/tabs/MultiUnitTabsUnitState';
import { getSavedHistoryDisabledReason } from '@/components/customizer/tabs/savedHistoryAccess';
import { useDialogHandlers } from '@/components/customizer/tabs/useMultiUnitTabsController.dialogs';
import { exportInfantry } from '@/services/conversion/BlkExportServiceCore.exporters';
import { BlkParserService } from '@/services/conversion/BlkParserService';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { customUnitApiService } from '@/services/units/CustomUnitApiService';
import { createInfantryHandler } from '@/services/units/handlers/InfantryUnitHandler';
import { UnitRepository } from '@/services/units/UnitRepository';
import {
  createDefaultInfantryState,
  computeInfantryStateBV,
  type InfantryState,
} from '@/stores/infantryState';
import { getInfantryStore } from '@/stores/infantryStoreRegistry';
import { createInfantryStore } from '@/stores/useInfantryStore';
import { UnitContract } from '@/types/contracts';
import { Era } from '@/types/temporal/Era';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  InfantryArmorKit,
  InfantrySpecialization,
} from '@/types/unit/PersonnelInterfaces';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';
import { resolveInfantryProtection } from '@/utils/construction/infantry/infantryBVAdapter';
import {
  mapInfantryDefinition,
  infantryLibraryBVInput,
} from '@/utils/construction/infantry/libraryMapping';
import { totalTroopers } from '@/utils/construction/infantry/platoonComposition';
import { serializeCustomSmallUnitState } from '@/utils/serialization/CustomUnitSerializer';

import { loadUnitDefinition } from '../loadUnitDefinition';
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
jest.mock('@/stores/infantryStoreRegistry', () => ({
  getInfantryStore: jest.fn(),
}));

const directory = 'public/data/units/infantry';
const rows = (
  JSON.parse(fs.readFileSync(directory + '/index.json', 'utf8')) as {
    units: { id: string; path: string }[];
  }
).units;
const definition = (row: (typeof rows)[number]) =>
  UnitContract.parse(
    JSON.parse(fs.readFileSync(path.join(directory, row.path), 'utf8')),
  );
function mapped(source: ReturnType<typeof definition>): InfantryState {
  const config = mapInfantryDefinition(source);
  return { ...createDefaultInfantryState(config), ...config };
}
function semantic(state: InfantryState) {
  const {
    id: _id,
    createdAt: _created,
    lastModifiedAt: _modified,
    isModified: _dirty,
    bvBreakdown: _bv,
    ...facts
  } = state;
  return facts;
}
const identity = (state: InfantryState) => ({
  id: 'custom-infantry',
  chassis: state.chassis,
  variant: state.model,
  era: Era.DARK_AGE,
});
function inspected(state: InfantryState) {
  const exported = exportInfantry(state);
  if (!exported.success || !exported.content)
    throw new Error(JSON.stringify(exported));
  const document = new BlkParserService().parse(exported.content);
  if (!document.success) throw new Error(JSON.stringify(document.error));
  const handler = createInfantryHandler();
  const parsed = handler.parse(document.data.document);
  if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
  const source = state.librarySource;
  const troopers = (source?.equipment ?? [])
    .filter((m) => m.location === 'TROOPERS')
    .map((m) => m.name ?? m.id);
  const kit =
    typeof source?.armorKit === 'string' ? source.armorKit : undefined;
  const protection = resolveInfantryProtection({
    'Troopers Equipment': troopers,
    ...(kit && !troopers.includes(kit) ? { armorKit: kit } : {}),
  });
  const input = infantryLibraryBVInput(state);
  const offense = input?.bvOffense;
  const nativeFieldGuns =
    !!offense &&
    'fieldGunEquipment' in offense &&
    Array.isArray(offense.fieldGunEquipment);
  const unit = {
    ...parsed.data.unit,
    ...input,
    ...state,
    platoonStrength: totalTroopers(state.platoonComposition),
    armorKitCount: protection.armorKitCount,
    constructionSource: {
      motion_type: source?.beastMount ?? source?.motiveType ?? state.motionType,
      'Field Guns Equipment': (source?.equipment ?? [])
        .filter((m) => m.location === 'FIELD_GUNS')
        .map((m) => m.name ?? m.id),
    },
  };
  const bv = calculateBattleValueForUnit(unit);
  if (bv?.kind !== 'infantry') throw new Error('Missing infantry dispatcher');
  expect(Number.isFinite(bv.breakdown.final)).toBe(true);
  expect(bv.breakdown.final).toBeGreaterThan(0);
  // #2531 replaces the legacy handler's synthetic ammo with native inventory.
  // Before/after dispatcher equality is always required; both API shapes must
  // also agree whenever the native field-gun source contract is available.
  if (nativeFieldGuns)
    expect(bv.breakdown).toEqual(computeInfantryStateBV(state));
  return { bv, nativeFieldGuns, validity: handler.validate(unit) };
}

it('enables infantry saving', () =>
  expect(isLibrarySaveSupported(UnitType.INFANTRY)).toBe(true));
it('saves a new infantry draft with no invented source', () => {
  const state = createDefaultInfantryState();
  const saved = serializeCustomSmallUnitState(state, identity(state));
  expect(saved.family).toBe('infantry');
  expect(
    semantic(mapped(UnitContract.parse(JSON.parse(JSON.stringify(saved))))),
  ).toEqual(semantic(state));
});

it('round trips every selected infantry design through the contract and native owners', () => {
  const selected = process.env.UL25I_ALL
    ? rows
    : rows
        .filter((_, i) => i % Math.max(1, Math.floor(rows.length / 8)) === 0)
        .slice(0, 8);
  const results = selected.map((row) => {
    try {
      const originalDefinition = definition(row);
      const original = mapped(originalDefinition);
      const saved = UnitContract.parse(
        JSON.parse(
          JSON.stringify(
            serializeCustomSmallUnitState(original, identity(original)),
          ),
        ),
      );
      expect(saved.family).toBe('infantry');
      const reopened = mapped(saved);
      expect(semantic(reopened)).toEqual(semantic(original));
      expect(reopened.librarySource).toEqual(originalDefinition);
      const before = inspected(original),
        after = inspected(reopened);
      expect(after).toEqual(before);
      return { id: row.id, result: 'pass', before, after };
    } catch (error) {
      return { id: row.id, result: 'fail', error: String(error) };
    }
  });
  if (process.env.UL25I_REPORT)
    fs.writeFileSync(
      process.env.UL25I_REPORT + '/infantry.json',
      JSON.stringify(results, null, 2),
    );
  expect(results.filter((r) => r.result === 'fail')).toEqual([]);
});

it('preserves native kit, custom armor, masks, prosthetics, movement and ordered field mounts', () => {
  for (const id of [
    'manei-domini-attack-squad-tau-zombie',
    'clan-field-gun-point-motorized-ac5-basic',
    'beast-infantry-aerial',
    'frogmen-blue-water-marine-response-teams-frogmen',
    'commando-battlefield-infiltration-units',
  ]) {
    const row = rows.find((r) => r.id === id);
    if (!row) throw new Error('Missing fixture: ' + id);
    const source = definition(row),
      state = mapped(source);
    const saved = serializeCustomSmallUnitState(state, identity(state));
    expect(
      mapped(UnitContract.parse(JSON.parse(JSON.stringify(saved))))
        .librarySource,
    ).toEqual(source);
  }
});

it('persists edited infantry and reopens through the production loader', async () => {
  getSQLiteService({ path: ':memory:' }).initialize();
  try {
    const row = rows.find(
      (r) => r.id === 'clan-field-gun-point-motorized-ac5-basic',
    );
    if (!row) throw new Error('Missing field-gun fixture');
    const original = mapped(definition(row));
    expect(original.fieldGuns).toHaveLength(3);
    const current = inspected(original);
    if (current.nativeFieldGuns)
      expect(current.bv.breakdown.fieldGunAmmoBV).toBeGreaterThan(0);
    const edited = {
      ...original,
      year: 3149,
      squadSize: 6,
      numberOfSquads: 3,
      platoonComposition: { squads: 3, troopersPerSquad: 6 },
      groundMP: 4,
      jumpMP: 2,
      umuMP: 3,
      armorKit: InfantryArmorKit.ABLATIVE,
      damageDivisor: 3.5,
      specialization: InfantrySpecialization.ENGINEER,
      secondaryWeaponCount: 1,
      fieldGuns: original.fieldGuns.map((g) => ({ ...g, ammoRounds: 17 })),
      hasAntiMechTraining: true,
      isAugmented: true,
      augmentationType: 'retained editor selection',
    };
    const saved = serializeCustomSmallUnitState(edited, identity(edited));
    expect(saved.family).toBe('infantry');
    expect(saved.platoon).toEqual({
      squadSize: 6,
      squadCount: 3,
      totalTroopers: 18,
    });
    const repository = new UnitRepository();
    const created = repository.create({
      chassis: edited.chassis,
      variant: edited.model,
      data: saved,
    });
    if (!created.success) throw new Error(created.error.message);
    expect(repository.list()[0].family).toBe('infantry');
    jest
      .mocked(customUnitApiService.getById)
      .mockResolvedValue(JSON.parse(repository.getById(created.data.id)!.data));
    const loaded = await new UnitLoaderService().loadCustomUnit(
      created.data.id,
      'infantry',
    );
    if (loaded.familyState?.store !== 'infantry')
      throw new Error(JSON.stringify(loaded));
    expect(semantic(loaded.familyState.state)).toEqual(semantic(edited));
    expect(loaded.familyState.state.librarySource).toEqual(
      original.librarySource,
    );
    const again = serializeCustomSmallUnitState(
      loaded.familyState.state,
      identity(edited),
    );
    expect(again.smallUnitEditor.librarySource).toEqual(original.librarySource);
    const editor = saved.smallUnitEditor;
    if (editor.unitType !== UnitType.INFANTRY)
      throw new Error('Wrong editor family');
    const invalid = UnitContract.parse({
      ...saved,
      smallUnitEditor: {
        ...editor,
        fieldGuns: editor.fieldGuns.map((gun) => ({
          ...gun,
          ammoRounds: 'invalid',
        })),
      },
    });
    expect(() => mapped(invalid)).toThrow();
  } finally {
    resetSQLiteService();
  }
});

it('routes actual infantry-store saves and keeps concurrent edits dirty', async () => {
  const state = mapped(definition(rows[0]));
  const store = createInfantryStore(state);
  jest.mocked(getInfantryStore).mockReturnValue(store);
  expect(getLibrarySaveStore(state.id, UnitType.INFANTRY)).toBe(store);
  const tab = {
    id: state.id,
    name: state.name,
    tonnage: 0,
    techBase: state.techBase,
    unitType: UnitType.INFANTRY,
  };
  let resolveSave: (result: {
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
      family: 'infantry',
      unitType: UnitType.INFANTRY,
    }),
    state.chassis,
    state.model,
  );
  act(() => store.getState().setYear(3148));
  await act(async () => {
    resolveSave({ success: true, id: 'saved-infantry', version: 1 });
    await pending;
  });
  expect(store.getState().year).toBe(3148);
  expect(store.getState().isModified).toBe(true);
  jest
    .mocked(customUnitApiService.create)
    .mockResolvedValue({ success: true, id: 'saved-infantry', version: 2 });
  act(() => result.current.openSaveDialog(state.id));
  await act(async () => {
    await result.current.handleSaveDialogSave(state.chassis, state.model);
  });
  expect(store.getState().isModified).toBe(false);
  expect(getSavedHistoryDisabledReason(tab)).toMatch(/not available/);
  expect(
    JSON.parse(localStorage.getItem('megamek-infantry-' + state.id)!).state
      .librarySource,
  ).toEqual(state.librarySource);
});

it('keeps a real family-less saved design on the BattleMech route', async () => {
  const root = 'public/data/units/battlemechs';
  const index = JSON.parse(fs.readFileSync(root + '/index.json', 'utf8')) as {
    units: { path: string }[];
  };
  const source = JSON.parse(
    fs.readFileSync(path.join(root, index.units[0].path), 'utf8'),
  );
  jest.mocked(customUnitApiService.getById).mockResolvedValue(source);
  expect(
    await loadUnitDefinition('battlemechs', 'legacy-mech', 'custom'),
  ).toMatchObject({ success: true, family: 'battlemechs' });
});

const oracleFile = process.env.UL25I_ORACLE;
(oracleFile ? it : it.skip)(
  'joins all committed infantry to the UL-16b oracle and retains its validity',
  () => {
    const oracle = (
      fs
        .readFileSync(oracleFile!, 'utf8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line)) as {
        path: string;
        sha256: string;
        concreteFamily: string;
        construction: { valid: boolean; diagnostics: string };
        battleValue: { total: number };
      }[]
    ).filter((r) => r.concreteFamily === 'ConvInfantry');
    expect(oracle).toHaveLength(1820);
    const byPath = new Map(oracle.map((row) => [row.path, row]));
    const joins = fs
      .readFileSync(process.env.UL25I_JOIN!, 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line)) as { id: string; sourcePath: string }[];
    const byId = new Map(joins.map((row) => [row.id, row.sourcePath]));
    const results = rows.map((row) => {
      try {
        const sourcePath = byId.get(row.id),
          reference = sourcePath ? byPath.get(sourcePath) : undefined;
        if (!reference) throw new Error('Missing UL-16b source');
        const content = fs
          .readFileSync(path.join(process.env.UL25I_PIN!, sourcePath!), 'utf8')
          .replace(/\r\n/g, '\n');
        expect(createHash('sha256').update(content).digest('hex')).toBe(
          reference.sha256,
        );
        const original = mapped(definition(row)),
          saved = UnitContract.parse(
            JSON.parse(
              JSON.stringify(
                serializeCustomSmallUnitState(original, identity(original)),
              ),
            ),
          ),
          reopened = mapped(saved);
        const before = inspected(original),
          after = inspected(reopened);
        expect(after).toEqual(before);
        expect(after.validity.isValid).toBe(reference.construction.valid);
        return {
          id: row.id,
          path: sourcePath,
          result: 'pass',
          javaValid: reference.construction.valid,
          appValid: after.validity.isValid,
          javaBV: reference.battleValue.total,
          javaDiagnostics: reference.construction.diagnostics,
          before,
          after,
        };
      } catch (error) {
        return { id: row.id, result: 'fail', error: String(error) };
      }
    });
    fs.writeFileSync(
      process.env.UL25I_REPORT! + '/oracle-join.json',
      JSON.stringify(
        {
          oracle: oracleFile,
          sha256: createHash('sha256')
            .update(fs.readFileSync(oracleFile!))
            .digest('hex'),
          results,
        },
        null,
        2,
      ),
    );
    expect(results.filter((r) => r.result === 'fail')).toEqual([]);
  },
);
