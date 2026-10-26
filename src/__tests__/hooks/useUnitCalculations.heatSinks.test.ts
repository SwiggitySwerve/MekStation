import { renderHook } from '@testing-library/react';

import { useUnitCalculations } from '@/hooks/useUnitCalculations';
import { HeatSinkType } from '@/types/construction/HeatSinkType';

import { createISComponentSelections } from '../helpers/storeTestHelpers';

it.each([
  [HeatSinkType.SINGLE, 22, 10, 12, 12, 10, 22],
  [HeatSinkType.DOUBLE_IS, 22, 10, 12, 12, 30, 44],
  [HeatSinkType.SINGLE, 10, 10, 0, 0, 0, 10],
] as const)(
  'exposes the free and weighted sink counts without changing %s totals for %i sinks',
  (heatSinkType, heatSinkCount, free, weighted, weight, slots, dissipation) => {
    const { result } = renderHook(() =>
      useUnitCalculations(100, {
        ...createISComponentSelections(100),
        engineRating: 300,
        heatSinkType,
        heatSinkCount,
      }),
    );
    expect(result.current).toMatchObject({
      integralHeatSinks: 12,
      externalHeatSinks: heatSinkCount === 10 ? 0 : 10,
      freeHeatSinks: free,
      heatSinksRequiringWeight: weighted,
      heatSinkWeight: weight,
      heatSinkSlots: slots,
      totalHeatDissipation: dissipation,
    });
  },
);
