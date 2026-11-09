import type { UnitData } from '../validate-bv-types';

import { createEmptyCritScan } from '../validate-bv-crit-scan-types';
import { deriveBvHeatAndMovement } from '../validate-bv-movement-derived';

const unit: UnitData = {
  id: 'run-movement-contract',
  chassis: 'Test',
  model: 'Run movement',
  unitType: 'BattleMech',
  configuration: 'Biped',
  techBase: 'INNER_SPHERE',
  tonnage: 50,
  engine: { type: 'FUSION', rating: 250 },
  gyro: { type: 'STANDARD' },
  cockpit: 'STANDARD',
  structure: { type: 'STANDARD' },
  armor: { type: 'STANDARD', allocation: { HEAD: 9 } },
  heatSinks: { type: 'SINGLE', count: 10 },
  movement: { walk: 5, jump: 0 },
  equipment: [],
  criticalSlots: {},
};

describe('guarded Mech running inputs', () => {
  it.each([
    [false, false, 'standard', 8],
    [true, false, 'standard', 10],
    [false, true, 'standard', 10],
    [true, true, 'standard', 13],
    [false, false, 'hardened', 7],
    [true, false, 'hardened', 9],
    [false, true, 'hardened', 9],
    [true, true, 'hardened', 12],
  ] as const)(
    'preserves MASC=%s, supercharger=%s, armor=%s',
    (hasMASC, hasSupercharger, armor, runMP) => {
      const scan = { ...createEmptyCritScan(), hasMASC, hasSupercharger };
      expect(deriveBvHeatAndMovement(unit, scan, armor)).toMatchObject({
        bvWalk: 5,
        runMP,
      });
    },
  );

  it('retains forced BV TSM walk before deriving boosted run', () => {
    const scan = {
      ...createEmptyCritScan(),
      hasTSM: true,
      hasMASC: true,
      hasSupercharger: true,
    };
    expect(deriveBvHeatAndMovement(unit, scan, 'hardened')).toMatchObject({
      bvWalk: 6,
      runMP: 14,
    });
  });

  it('retains the existing shield and drape reductions before running', () => {
    const scan = {
      ...createEmptyCritScan(),
      hasMediumShield: true,
      hasChainDrape: true,
    };
    expect(deriveBvHeatAndMovement(unit, scan, 'hardened')).toMatchObject({
      bvWalk: 3,
      runMP: 4,
    });
  });
});
