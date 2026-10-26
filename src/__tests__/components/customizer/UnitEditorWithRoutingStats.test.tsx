import { renderHook } from '@testing-library/react';

import { useUnitEditorRoutingStats } from '@/components/customizer/UnitEditorWithRoutingStats';
import { useEquipmentRegistry } from '@/hooks/useEquipmentRegistry';
import { createNewUnitStore } from '@/stores/useUnitStore';
import { MechConfiguration } from '@/types/construction/MechConfigurationSystem';
import { TechBase } from '@/types/enums';
import { EquipmentCategory } from '@/types/equipment';

jest.mock('@/hooks/useEquipmentRegistry', () => ({
  useEquipmentRegistry: jest.fn(() => ({ isReady: true })),
}));
jest.mock('@/services/construction/CalculationService', () => ({
  getCalculationService: () => ({
    calculateBattleValue: () => 2000,
    calculateHeatProfile: () => ({
      heatGenerated: 29,
      heatDissipated: 10,
      netHeat: 19,
      alphaStrikeHeat: 27,
      movementHeat: 2,
      movementMode: 'running',
    }),
  }),
}));

function input(configuration = MechConfiguration.BIPED) {
  const state = createNewUnitStore({
    name: 'Stats unit',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  }).getState();
  return {
    ...state,
    configuration,
    unitName: state.name,
    validation: { status: 'valid' as const, errorCount: 0, warningCount: 0 },
  };
}

test.each([
  [MechConfiguration.BIPED, 78, 31],
  [MechConfiguration.QUAD, 66, 31],
  [MechConfiguration.TRIPOD, 84, 35],
] as const)(
  'header and mobile totals follow %s configuration',
  (configuration, total, fixed) => {
    const values = input(configuration);
    const { result } = renderHook(() => useUnitEditorRoutingStats(values));
    expect(result.current.unitStats.criticalSlotsTotal).toBe(total);
    expect(result.current.mobileLoadoutStats.slotsMax).toBe(total);
    expect(result.current.unitStats.criticalSlotsUsed).toBe(fixed);
  },
);

test('slot counts separate placed slots from the slots unplaced items still need', () => {
  const values = input();
  const unplaced = {
    instanceId: 'ppc-1',
    equipmentId: 'ppc',
    name: 'PPC',
    category: EquipmentCategory.ENERGY_WEAPON,
    weight: 7,
    criticalSlots: 3,
    heat: 10,
    techBase: TechBase.INNER_SPHERE,
    isRearMounted: false,
    isRemovable: true,
    isOmniPodMounted: false,
  };
  const { result } = renderHook(() =>
    useUnitEditorRoutingStats({ ...values, equipment: [unplaced] }),
  );
  const stats = result.current.unitStats;
  expect(stats.criticalSlotsUsed).toBe(31 + 3);
  expect(stats.criticalSlotsPending).toBe(3);
  expect(stats.unplacedItemCount).toBe(1);
  expect(stats.criticalSlotsPlaced).toBe(31);
});

test('cold-loaded definitions refresh BV and heat without a unit edit', () => {
  const values = input();
  jest
    .mocked(useEquipmentRegistry)
    .mockReturnValue({ isReady: false, recheckReady: jest.fn() });
  const { result, rerender } = renderHook(() =>
    useUnitEditorRoutingStats(values),
  );
  expect(result.current.unitStats.battleValue).toBe(0);
  jest
    .mocked(useEquipmentRegistry)
    .mockReturnValue({ isReady: true, recheckReady: jest.fn() });
  rerender();
  expect(result.current.unitStats.battleValue).toBe(2000);
  expect(result.current.unitStats.heatGenerated).toBe(29);
  expect(result.current.unitStats.heatGeneration).toMatchObject({
    alphaStrikeHeat: 27,
    movementHeat: 2,
    movementMode: 'running',
  });
});
