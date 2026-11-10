import { renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';

import { useUnitCalculations } from '@/hooks/useUnitCalculations';
import { useMechValidationInput } from '@/hooks/validation/useMechValidationInput';
import { useWeightValidation } from '@/hooks/validation/useWeightValidation';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { createDefaultUnitState, type UnitState } from '@/stores/unitState';
import { createUnitStore, UnitStoreContext } from '@/stores/useUnitStore';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { MechConfiguration } from '@/types/construction/MechConfigurationSystem';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums';

import {
  getMechConstructionSelections,
  projectMechValidation,
} from '../mechValidationProjection';

let mockReady = false;
jest.mock('@/hooks/useEquipmentRegistry', () => ({
  useEquipmentRegistry: () => ({ isReady: mockReady }),
}));

const variants: [string, Partial<UnitState>][] = [
  ['biped', {}],
  ['Tripod', { configuration: MechConfiguration.TRIPOD }],
  [
    'Drizella FrankenMek',
    {
      frankenStructure: {
        type: 'STANDARD',
        locationTonnage: {
          LEFT_ARM: 50,
          RIGHT_ARM: 50,
          LEFT_TORSO: 50,
          RIGHT_TORSO: 50,
          CENTER_TORSO: 50,
          HEAD: 50,
          LEFT_LEG: 50,
          RIGHT_LEG: 50,
        },
        typeByLocation: {
          LEFT_ARM: 'STANDARD',
          RIGHT_ARM: 'STANDARD',
          LEFT_TORSO: 'ENDO_STEEL_CLAN',
          RIGHT_TORSO: 'ENDO_STEEL_CLAN',
          CENTER_TORSO: 'ENDO_STEEL',
          HEAD: 'ENDO_STEEL',
          LEFT_LEG: 'STANDARD',
          RIGHT_LEG: 'STANDARD',
        },
      },
    },
  ],
  ['superheavy', { tonnage: 150 }],
  [
    'LAM',
    { configuration: MechConfiguration.LAM, lamType: 'Bimodal', tonnage: 55 },
  ],
  [
    'mixed armor',
    { techBaseMode: TechBaseMode.MIXED, armorType: ArmorTypeEnum.STEALTH },
  ],
];

test.each(variants)(
  'pure projection equals complete hook input for %s',
  (_name, patch) => {
    const state = {
      ...createDefaultUnitState({
        id: 'pure',
        name: 'Pure',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      }),
      ...patch,
    };
    const store = createUnitStore(state);
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(UnitStoreContext.Provider, { value: store }, children);
    for (const ready of [false, true]) {
      mockReady = ready;
      const { result, unmount } = renderHook(
        () => ({
          input: useMechValidationInput(),
          weight: useWeightValidation(),
        }),
        { wrapper },
      );
      const pure = projectMechValidation(store.getState(), {
        totalStructuralWeight: result.current.weight.structuralWeight,
        equipmentRegistryReady: ready,
        equipmentCatalog: getEquipmentLookupService().getAllEquipment(),
      });
      expect(pure).toStrictEqual(result.current.input);
      expect(pure.armorType).toBe(state.armorType);
      expect(pure.techBaseMode).toBe(state.techBaseMode);
      unmount();
    }
  },
);

test.each(variants)(
  'construction selections retain all source facts for %s',
  (_name, patch) => {
    const state = {
      ...createDefaultUnitState({
        name: 'Facts',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      }),
      ...patch,
    };
    const facts = getMechConstructionSelections(state);
    for (const field of [
      'configuration',
      'frankenStructure',
      'lamType',
      'armorType',
      'techBaseMode',
      'engineType',
      'engineRating',
      'gyroType',
      'internalStructureType',
      'cockpitType',
      'heatSinkType',
      'heatSinkCount',
      'jumpMP',
      'jumpJetType',
      'tonnage',
      'armorTonnage',
      'techBase',
    ] as const) {
      expect(facts).toHaveProperty(field, state[field]);
    }
  },
);

test('focused validation weight retains bimodal LAM conversion mass', () => {
  const state = {
    ...createDefaultUnitState({
      name: 'LAM',
      tonnage: 55,
      techBase: TechBase.INNER_SPHERE,
    }),
    configuration: MechConfiguration.LAM,
    lamType: 'Bimodal',
  };
  const store = createUnitStore(state);
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(UnitStoreContext.Provider, { value: store }, children);
  const { result } = renderHook(
    () => ({
      weight: useWeightValidation(),
      calculations: useUnitCalculations(
        state.tonnage,
        state,
        state.armorTonnage,
        state.configuration,
      ),
    }),
    { wrapper },
  );
  expect(result.current.calculations.conversionWeight).toBe(9);
  expect(result.current.weight.structuralWeight).toBe(
    result.current.calculations.totalStructuralWeight,
  );
});

test('Drizella selections preserve the pinned 3.5 t section-weighted structure', () => {
  const patch = variants.find(([name]) => name === 'Drizella FrankenMek')?.[1];
  expect(patch?.frankenStructure).toBeDefined();
  const state = {
    ...createDefaultUnitState({
      name: 'Drizella',
      tonnage: 50,
      techBase: TechBase.INNER_SPHERE,
    }),
    ...patch,
  };
  const selections = getMechConstructionSelections(state);
  const { result } = renderHook(() =>
    useUnitCalculations(
      state.tonnage,
      selections,
      selections.armorTonnage,
      selections.configuration,
    ),
  );
  expect(result.current.structureWeight).toBe(3.5);
});
