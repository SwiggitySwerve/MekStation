import { renderHook } from '@testing-library/react';

import type { IEditableMech } from '@/services/construction/MechBuilderService';

import { chassisDesign } from '@/services/construction/__tests__/editableMechProjection.chassis.test-helpers';
import { buildEditableMechBVInput } from '@/services/construction/editableMechProjection';
import { normalizeUnitConfiguration } from '@/services/units/unitLoaderService/normalizeUnitConfiguration';
import { createDefaultUnitState } from '@/stores/unitState';
import { TechBase } from '@/types/enums/TechBase';
import { calculateUnitBV } from '@/utils/construction/mechBV/calculator';

import { useUnitEditorRoutingStats } from '../UnitEditorWithRoutingStats';

let mockReceivedMech: IEditableMech | undefined;

jest.mock('@/hooks/useEquipmentRegistry', () => ({
  useEquipmentRegistry: () => ({ isReady: true }),
}));
jest.mock('@/hooks/useEquipmentCalculations', () => ({
  useEquipmentCalculations: () => ({ totalWeight: 0, totalSlots: 0 }),
}));
jest.mock('@/hooks/useUnitCalculations', () => ({
  useUnitCalculations: () => ({
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
    totalStructuralWeight: 10,
    totalSystemSlots: 0,
    totalHeatDissipation: 10,
  }),
}));
jest.mock('@/services/construction/CalculationService', () => ({
  getCalculationService: () => ({
    calculateBattleValue: (mech: IEditableMech) => {
      mockReceivedMech = mech;
      const input = buildEditableMechBVInput(mech);
      return calculateUnitBV(input, input.id).bv;
    },
    calculateHeatProfile: () => ({
      heatGenerated: 0,
      heatDissipated: 10,
      netHeat: -10,
      alphaStrikeHeat: 0,
      movementHeat: 0,
      movementMode: 'running',
    }),
  }),
}));

function input(
  chassis?: 'CLAN' | 'INNER_SPHERE',
  id?: string,
): Parameters<typeof useUnitEditorRoutingStats>[0] {
  const state = {
    ...createDefaultUnitState({
      id: 'editor',
      name: 'Synthetic',
      tonnage: 50,
      techBase: TechBase.INNER_SPHERE,
    }),
    ...normalizeUnitConfiguration(chassisDesign(chassis, id), []),
  };
  return {
    ...state,
    unitName: state.name,
    validation: { status: 'valid', errorCount: 0, warningCount: 0 },
  };
}

it('refreshes status and mobile BV when only the explicit chassis selection changes', () => {
  const initial = input('CLAN');
  const { result, rerender } = renderHook(useUnitEditorRoutingStats, {
    initialProps: initial,
  });
  const clanBV = result.current.unitStats.battleValue;
  expect(mockReceivedMech?.chassisTechBase).toBe(TechBase.CLAN);
  rerender({
    ...initial,
    componentTechBases: {
      ...initial.componentTechBases,
      chassis: TechBase.INNER_SPHERE,
    },
  });
  expect(mockReceivedMech?.chassisTechBase).toBe(TechBase.INNER_SPHERE);
  expect(result.current.unitStats.battleValue).not.toBe(clanBV);
  expect(result.current.mobileLoadoutStats.battleValue).toBe(
    result.current.unitStats.battleValue,
  );
});

it('keeps a missing source chassis unknown in mounted editor statistics', () => {
  renderHook(useUnitEditorRoutingStats, {
    initialProps: input(undefined, 'alpha-wolf-a'),
  });
  expect(mockReceivedMech).not.toHaveProperty('chassisTechBase');
});
