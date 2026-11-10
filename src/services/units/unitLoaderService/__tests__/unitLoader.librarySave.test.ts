import type { UnitSaveEditor } from '@/stores/unitSaveStateAdapters';
import type { UnitFamily } from '@/types/unit/UnitIndex';

import { createDefaultAerospaceState } from '@/stores/aerospaceState';
import { createDefaultBattleArmorState } from '@/stores/battleArmorState';
import { createDefaultInfantryState } from '@/stores/infantryState';
import { createDefaultProtoMechState } from '@/stores/protoMechState';
import { createEditorLibrarySaveReceipt } from '@/stores/unitSaveStateAdapters';
import { createDefaultVehicleState } from '@/stores/vehicleState';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { UnitContract } from '@/types/contracts';
import { TechBase } from '@/types/enums/TechBase';
import { Era } from '@/types/temporal/Era';
import {
  serializeCustomAerospaceState,
  serializeCustomVehicleState,
  serializeCustomSmallUnitState,
} from '@/utils/serialization/CustomUnitSerializer';

import type { FamilyEditorState } from '../types';

import capital from '../../../../../public/data/units/capital/Vanir Assault DropShip.json';
import { loadUnitDefinition } from '../loadUnitDefinition';
import { UnitLoaderService } from '../unitLoader';

jest.mock('../loadUnitDefinition', () => ({ loadUnitDefinition: jest.fn() }));
jest.mock('@/services/equipment/EquipmentLookupService', () => ({
  getEquipmentLookupService: () => ({ initialize: async () => undefined }),
}));
jest.mock('@/services/equipment/EquipmentRegistry', () => ({
  getEquipmentRegistry: () => ({ initialize: async () => undefined }),
}));

const options = {
  name: 'Receipt test',
  tonnage: 50,
  techBase: TechBase.INNER_SPHERE,
};
const identity = {
  id: 'custom-unit',
  chassis: 'Receipt',
  variant: 'test',
  era: Era.CLAN_INVASION,
};
const cases = [
  {
    family: 'vehicles',
    definition: () =>
      serializeCustomVehicleState(createDefaultVehicleState(options), identity),
  },
  {
    family: 'aerospace',
    definition: () =>
      serializeCustomAerospaceState(
        createDefaultAerospaceState(options),
        identity,
      ),
  },
  {
    family: 'infantry',
    definition: () =>
      serializeCustomSmallUnitState(
        createDefaultInfantryState(options),
        identity,
      ),
  },
  {
    family: 'aerospace',
    definition: () =>
      serializeCustomAerospaceState(
        createDefaultAerospaceState({ ...options, isConventional: true }),
        identity,
      ),
  },
  {
    family: 'aerospace',
    definition: () =>
      serializeCustomAerospaceState(
        createDefaultAerospaceState({ ...options, isSmallCraft: true }),
        identity,
      ),
  },
  {
    family: 'battlearmor',
    definition: () =>
      serializeCustomSmallUnitState(
        createDefaultBattleArmorState(options),
        identity,
      ),
  },
  {
    family: 'protomechs',
    definition: () =>
      serializeCustomSmallUnitState(
        createDefaultProtoMechState({ ...options, tonnage: 5 }),
        identity,
      ),
  },
] satisfies {
  family: UnitFamily;
  definition: () =>
    | ReturnType<typeof serializeCustomVehicleState>
    | ReturnType<typeof serializeCustomAerospaceState>
    | ReturnType<typeof serializeCustomSmallUnitState>;
}[];

beforeEach(() => jest.clearAllMocks());

describe.each(cases)('$family loader receipt', ({ family, definition }) => {
  it.each([
    { source: 'custom' as const, version: 7, confirmed: true },
    { source: 'canonical' as const, version: 7, confirmed: false },
    { source: 'custom' as const, version: undefined, confirmed: false },
    { source: 'custom' as const, version: 0, confirmed: false },
    { source: 'custom' as const, version: 1.5, confirmed: false },
    {
      source: 'custom' as const,
      version: Number.MAX_SAFE_INTEGER + 1,
      confirmed: false,
    },
  ])(
    '$source version $version confirmed=$confirmed',
    async ({ source, version, confirmed }) => {
      const data = definition();
      const reference = { source, id: 'custom-unit', family, version };
      jest.mocked(loadUnitDefinition).mockResolvedValueOnce({
        success: true,
        family,
        definition: data,
        reference,
      });
      const result = await new UnitLoaderService().loadUnit(
        reference.id,
        source,
        family,
      );
      expect(result.success).toBe(true);
      const editor = result.familyState;
      if (!editor || editor.store === 'capital')
        throw new Error('Expected editable family');
      if (confirmed) {
        expect(editor.state.librarySave).toEqual(
          createEditorLibrarySaveReceipt(editor as UnitSaveEditor, {
            id: reference.id,
            version: 7,
          }),
        );
        expect(editor.state.isModified).toBe(false);
      } else {
        expect(editor.state).not.toHaveProperty('librarySave');
      }
      expect(result.sourceDefinition).toEqual(reference);
    },
  );
});

it('keeps a versioned custom capital load read-only and without a receipt', async () => {
  const definition = UnitContract.parse(capital);
  const reference = {
    source: 'custom' as const,
    id: 'custom-capital',
    family: 'capital' as const,
    version: 7,
  };
  jest.mocked(loadUnitDefinition).mockResolvedValueOnce({
    success: true,
    family: 'capital',
    definition,
    reference,
  });
  const result = await new UnitLoaderService().loadCustomUnit(
    reference.id,
    'capital',
  );
  expect(result.success).toBe(true);
  expect(result.familyState?.store).toBe('capital');
  expect(result.familyState?.state).not.toHaveProperty('librarySave');
});

type EditableFamily = Exclude<FamilyEditorState, { store: 'capital' }>;
function saveFamily(editor: EditableFamily) {
  if (editor.store === 'vehicle')
    return serializeCustomVehicleState(editor.state, identity);
  if (editor.store === 'aerospace')
    return serializeCustomAerospaceState(editor.state, identity);
  return serializeCustomSmallUnitState(editor.state, identity);
}
async function openDefinition(
  family: UnitFamily,
  data: ReturnType<typeof UnitContract.parse>,
): Promise<EditableFamily> {
  jest.mocked(loadUnitDefinition).mockResolvedValueOnce({
    success: true,
    family,
    definition: data,
    reference: { source: 'canonical', family, id: data.id },
  });
  const result = await new UnitLoaderService().loadUnit(
    data.id,
    'canonical',
    family,
  );
  if (!result.familyState || result.familyState.store === 'capital')
    throw new Error('Expected editable family');
  return result.familyState;
}

describe.each(cases)(
  '$family Mixed load/save identity',
  ({ family, definition }) => {
    // BLKFile.java:704-735 at 48fcb2f64 keeps Mixed designation and chassis side.
    // The old binary editor snapshot deliberately remains independent here.
    it.each(['INNER_SPHERE', 'CLAN'] as const)(
      'retains %s chassis through a stale binary editor snapshot',
      async (chassis) => {
        const data = UnitContract.parse({
          ...definition(),
          techBase: 'MIXED',
          ...(family === 'battlearmor'
            ? { clanChassis: chassis === 'CLAN' }
            : { componentTechBases: { chassis } }),
        });
        const editor = await openDefinition(family, data);
        const expected = {
          techBaseMode: TechBaseMode.MIXED,
          chassisTechBase:
            chassis === 'CLAN' ? TechBase.CLAN : TechBase.INNER_SPHERE,
        };
        expect(editor.state).toMatchObject({
          ...expected,
          techBase: expected.chassisTechBase,
        });
        const saved = JSON.parse(JSON.stringify(saveFamily(editor)));
        expect(saved.techBase).toBe('MIXED');
        if (family === 'battlearmor') {
          expect(saved.clanChassis).toBe(chassis === 'CLAN');
          expect(saved).not.toHaveProperty('componentTechBases');
        } else expect(saved.componentTechBases.chassis).toBe(chassis);
        expect((await openDefinition(family, saved)).state).toMatchObject(
          expected,
        );
      },
    );

    it('keeps missing chassis unknown instead of promoting the binary fallback', async () => {
      const data = UnitContract.parse({ ...definition(), techBase: 'MIXED' });
      const editor = await openDefinition(family, data);
      expect(editor.state.techBaseMode).toBe(TechBaseMode.MIXED);
      expect(editor.state.chassisTechBase).toBeUndefined();
      const saved = JSON.parse(JSON.stringify(saveFamily(editor)));
      expect(saved.techBase).toBe('MIXED');
      expect(saved).not.toHaveProperty('clanChassis');
      expect(saved.componentTechBases?.chassis).toBeUndefined();
      expect(
        (await openDefinition(family, saved)).state.chassisTechBase,
      ).toBeUndefined();
    });
  },
);

it.each(['INNER_SPHERE', 'CLAN'] as const)(
  'typed infantry %s identity wins over stale librarySource on every save',
  async (chassis) => {
    const source = cases
      .find((sample) => sample.family === 'infantry')!
      .definition();
    const data = UnitContract.parse({
      ...source,
      techBase: 'MIXED',
      componentTechBases: { chassis },
    });
    const editor = await openDefinition('infantry', data);
    if (editor.store !== 'infantry') throw new Error('Expected infantry');
    const stale = UnitContract.parse({
      ...source,
      techBase: 'MIXED',
      componentTechBases: {
        chassis: chassis === 'CLAN' ? 'INNER_SPHERE' : 'CLAN',
      },
    });
    const typed = {
      ...editor,
      state: {
        ...editor.state,
        techBaseMode: TechBaseMode.MIXED,
        chassisTechBase:
          chassis === 'CLAN' ? TechBase.CLAN : TechBase.INNER_SPHERE,
        librarySource: stale,
      },
    };
    const saved = saveFamily(typed);
    expect(saved.techBase).toBe('MIXED');
    expect(saved.componentTechBases?.chassis).toBe(chassis);
    const reopened = await openDefinition('infantry', saved);
    expect(reopened.state.chassisTechBase).toBe(typed.state.chassisTechBase);
    expect(saveFamily(reopened).componentTechBases?.chassis).toBe(chassis);
  },
);

it('unknown typed infantry chassis cannot be resurrected from a stale snapshot', async () => {
  const source = cases
    .find((sample) => sample.family === 'infantry')!
    .definition();
  const stale = UnitContract.parse({
    ...source,
    techBase: 'MIXED',
    componentTechBases: { chassis: 'CLAN' },
  });
  const editor = await openDefinition('infantry', stale);
  if (editor.store !== 'infantry') throw new Error('Expected infantry');
  const typed = {
    ...editor,
    state: {
      ...editor.state,
      techBaseMode: TechBaseMode.MIXED,
      chassisTechBase: undefined,
      librarySource: stale,
    },
  };
  const saved = JSON.parse(JSON.stringify(saveFamily(typed)));
  expect(saved.componentTechBases?.chassis).toBeUndefined();
  expect(
    (await openDefinition('infantry', saved)).state.chassisTechBase,
  ).toBeUndefined();
});
