import type { UnitData } from '../validate-bv-types';

import { createEmptyCritScan } from '../validate-bv-crit-scan-types';
import { deriveBvHeatAndMovement } from '../validate-bv-movement-derived';

const unit: UnitData = {
  id: 'mechanical-jump-test',
  chassis: 'Test',
  model: 'Mechanical jump',
  unitType: 'BattleMech',
  configuration: 'Biped',
  techBase: 'INNER_SPHERE',
  tonnage: 90,
  engine: { type: 'LIGHT', rating: 270 },
  gyro: { type: 'STANDARD' },
  cockpit: 'STANDARD',
  structure: { type: 'STANDARD' },
  armor: { type: 'STANDARD', allocation: { HEAD: 9 } },
  heatSinks: { type: 'DOUBLE', count: 16 },
  movement: { walk: 3, jump: 0 },
  equipment: [],
  criticalSlots: {},
};

describe('partial-wing movement compatibility', () => {
  it.each([
    [50, 2, 5],
    [90, 1, 4],
  ])('retains the %it partial-wing bonus', (tonnage, bonus, jumpMP) => {
    const crit = createEmptyCritScan();
    crit.hasPartialWing = true;
    crit.standardJJCrits = 3;
    const result = deriveBvHeatAndMovement(
      { ...unit, tonnage, movement: { walk: 3, jump: 3 } },
      crit,
      'standard',
    );
    expect(result.jumpMP).toBe(jumpMP);
    expect(result.partialWingJumpBonus).toBe(bonus);
  });
});
