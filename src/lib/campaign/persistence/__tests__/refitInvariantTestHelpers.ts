import type { IRefitOrder } from '@/types/campaign/Refit';

import { RefitClass } from '@/types/campaign/Refit';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { CockpitType } from '@/types/construction/CockpitType';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';

export function refitOrders(
  count: number,
  unitId = 'unit-0',
): readonly IRefitOrder[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${unitId}-refit-${index}`,
    unitId,
    status: index === 0 ? 'in-progress' : 'proposed',
    refitClass: RefitClass.EquipmentSwap,
    estimatedCost: 100,
    estimatedHours: 8,
    hoursCompleted: 0,
    createdAt: '3025-07-04T00:00:00.000Z',
    targetConfiguration: {
      tonnage: 50,
      engineRating: 250,
      engineType: EngineType.STANDARD,
      gyroType: GyroType.STANDARD,
      internalStructureType: InternalStructureType.STANDARD,
      armorType: ArmorTypeEnum.STANDARD,
      totalArmorPoints: 200,
      cockpitType: CockpitType.STANDARD,
      heatSinkType: HeatSinkType.SINGLE,
      totalHeatSinks: 10,
      jumpMP: 0,
    },
  }));
}
