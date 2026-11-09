/**
 * Changing the aerospace Sub-Type changes the unit type, as MegaMekLab does.
 *
 * MegaMekLab rebuilds the unit as the matching entity when the fighter type
 * changes (ASStructureTab.fighterTypeChanged → ASMainUI.createNewUnit:
 * AeroSpaceFighter for ETYPE_AERO, ConvFighter for ETYPE_CONV_FIGHTER), and
 * MegaMek's entity types are AeroSpaceFighter → ETYPE_AEROSPACE_FIGHTER,
 * ConvFighter → ETYPE_CONV_FIGHTER, SmallCraft → ETYPE_SMALL_CRAFT. The saved
 * record's unitType must therefore follow the selected Sub-Type.
 */

import { mapAerospaceDefinitionToState } from '@/services/units/unitLoaderService/aerospaceDefinitionMapper';
import { isDefinitionForFamily } from '@/services/units/unitLoaderService/definitionTypes';
import { createDefaultAerospaceState } from '@/stores/aerospaceState';
import { createAerospaceStore } from '@/stores/useAerospaceStore';
import { UnitContract } from '@/types/contracts';
import { TechBase } from '@/types/enums/TechBase';
import { Era } from '@/types/temporal/Era';
import { AerospaceSubType } from '@/types/unit/AerospaceInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { serializeCustomAerospaceState } from '@/utils/serialization/CustomUnitSerializer';

describe('aerospace Sub-Type change', () => {
  it('clears small-craft-only native armor identity when changing to a fighter', () => {
    const store = createAerospaceStore({
      ...createDefaultAerospaceState({
        id: 'native-armor-subtype',
        name: 'Native Shuttle',
        tonnage: 200,
        techBase: TechBase.INNER_SPHERE,
        isSmallCraft: true,
      }),
      smallCraftArmorType: 'PRIMITIVE_AERO',
    });
    store.getState().setAerospaceSubType(AerospaceSubType.AEROSPACE_FIGHTER);
    expect(store.getState().smallCraftArmorType).toBeUndefined();
    const saved = serializeCustomAerospaceState(store.getState(), {
      id: store.getState().id,
      chassis: 'Native Shuttle',
      variant: 'Converted',
      era: Era.DARK_AGE,
    });
    expect(saved.armor?.type).toBe('STANDARD');
  });
  it.each([
    [AerospaceSubType.CONVENTIONAL_FIGHTER, UnitType.CONVENTIONAL_FIGHTER],
    [AerospaceSubType.SMALL_CRAFT, UnitType.SMALL_CRAFT],
    [AerospaceSubType.AEROSPACE_FIGHTER, UnitType.AEROSPACE],
  ] as const)(
    'saves %s with unit type %s and reopens it the same way',
    (subType, unitType) => {
      const store = createAerospaceStore(
        createDefaultAerospaceState({
          id: 'a6f1d2c3-4b5e-4f60-8a71-92b3c4d5e6f7',
          name: 'Subtype Fixture',
          tonnage: 50,
          techBase: TechBase.INNER_SPHERE,
          isConventional: subType === AerospaceSubType.AEROSPACE_FIGHTER,
        }),
      );

      store.getState().setAerospaceSubType(subType);
      const state = store.getState();
      expect(state.unitType).toBe(unitType);

      const saved = serializeCustomAerospaceState(state, {
        id: state.id,
        chassis: 'Subtype Fixture',
        variant: 'ST-1',
        era: Era.DARK_AGE,
      });
      expect(saved.unitType).toBe(unitType);
      expect(saved.subType).toBe(subType);

      const definition = UnitContract.parse(saved);
      if (!isDefinitionForFamily('aerospace', definition))
        throw new Error('Saved record is not an aerospace definition');
      const reopened = mapAerospaceDefinitionToState(definition);
      expect(reopened.unitType).toBe(unitType);
      expect(reopened.aerospaceSubType).toBe(subType);
    },
  );
});
