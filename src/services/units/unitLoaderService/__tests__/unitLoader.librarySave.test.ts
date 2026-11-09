import type { UnitSaveEditor } from '@/stores/unitSaveStateAdapters';
import type { UnitFamily } from '@/types/unit/UnitIndex';

import { createDefaultAerospaceState } from '@/stores/aerospaceState';
import { createDefaultBattleArmorState } from '@/stores/battleArmorState';
import { createDefaultInfantryState } from '@/stores/infantryState';
import { createDefaultProtoMechState } from '@/stores/protoMechState';
import { createEditorLibrarySaveReceipt } from '@/stores/unitSaveStateAdapters';
import { createDefaultVehicleState } from '@/stores/vehicleState';
import { UnitContract } from '@/types/contracts';
import { TechBase } from '@/types/enums/TechBase';
import { Era } from '@/types/temporal/Era';
import {
  serializeCustomAerospaceState,
  serializeCustomVehicleState,
  serializeCustomSmallUnitState,
} from '@/utils/serialization/CustomUnitSerializer';

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
