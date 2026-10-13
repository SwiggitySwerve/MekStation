import { TechBase } from '@/types/enums/TechBase';

import type { IEditableMech } from '../MechBuilderService';

describe('CalculationService cold start', () => {
  it('returns the same complete battle value on the first and subsequent calls', () => {
    const mech: IEditableMech = {
      id: 'cold-bv',
      chassis: 'Test',
      variant: 'T',
      tonnage: 75,
      techBase: TechBase.CLAN,
      engineType: 'Standard Fusion',
      engineRating: 300,
      walkMP: 4,
      structureType: 'Standard',
      gyroType: 'Standard',
      cockpitType: 'Standard',
      armorType: 'Standard',
      armorAllocation: {
        head: 9,
        centerTorso: 35,
        centerTorsoRear: 10,
        leftTorso: 24,
        leftTorsoRear: 8,
        rightTorso: 24,
        rightTorsoRear: 8,
        leftArm: 24,
        rightArm: 24,
        leftLeg: 24,
        rightLeg: 24,
      },
      heatSinkType: 'Single',
      heatSinkCount: 12,
      equipment: [],
      isDirty: false,
    };

    jest.isolateModules(() => {
      const { CalculationService } = jest.requireActual<
        typeof import('../CalculationService')
      >('../CalculationService');
      const service = new CalculationService();

      expect(service.calculateBattleValue(mech)).toBe(976);
      expect(service.calculateBattleValue(mech)).toBe(976);
    });
  });
});
