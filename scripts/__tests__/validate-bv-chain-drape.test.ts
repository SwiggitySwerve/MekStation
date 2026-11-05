import type { UnitData } from '../validate-bv-types';

import { scanCrits } from '../validate-bv-crit-scan';
import { deriveBvHeatAndMovement } from '../validate-bv-movement-derived';

const unit: UnitData = {
  id: 'chain-drape',
  chassis: 'Test',
  model: 'Drape',
  unitType: 'BattleMech',
  configuration: 'Biped',
  techBase: 'INNER_SPHERE',
  tonnage: 60,
  engine: { type: 'FUSION', rating: 360 },
  gyro: { type: 'STANDARD' },
  cockpit: 'STANDARD',
  structure: { type: 'STANDARD' },
  armor: { type: 'STANDARD', allocation: { HEAD: 9 } },
  heatSinks: { type: 'DOUBLE', count: 10 },
  movement: { walk: 6, jump: 6 },
  equipment: [],
};

// BipedMek.java:166-168, QuadMek.java:176-178, TripodMek.java:206-208
// (48fcb2f64): any working chain drape subtracts one walk MP, once.
it.each(['ChainDrapeCape', 'ChainDrapeApron', 'ChainDrapePoncho'])(
  '%s reduces walk/run and retains jump movement',
  (name) => {
    const input = {
      ...unit,
      criticalSlots: { LEFT_TORSO: [name, name, name] },
    };
    const result = deriveBvHeatAndMovement(input, scanCrits(input), 'standard');
    expect(result.bvWalk).toBe(5);
    expect(result.runMP).toBe(8);
    expect(result.jumpMP).toBe(6);
  },
);

it('applies the drape penalty once across multiple locations and clamps zero', () => {
  const mounted = {
    ...unit,
    criticalSlots: {
      LEFT_TORSO: ['ChainDrapeCape'],
      RIGHT_TORSO: ['ChainDrapeCape'],
    },
  };
  expect(
    deriveBvHeatAndMovement(mounted, scanCrits(mounted), 'standard').bvWalk,
  ).toBe(5);
  const input = {
    ...unit,
    movement: { walk: 0, jump: 0 },
    criticalSlots: {
      LEFT_TORSO: ['ChainDrapeCape'],
      RIGHT_TORSO: ['ChainDrapeCape'],
    },
  };
  expect(
    deriveBvHeatAndMovement(input, scanCrits(input), 'standard').bvWalk,
  ).toBe(0);
});

it('retains UrbanKnight partial-wing jump bonus with the reduced run MP', () => {
  const input = {
    ...unit,
    criticalSlots: { LEFT_TORSO: ['ChainDrapeCape', 'CLPartialWing'] },
  };
  const result = deriveBvHeatAndMovement(input, scanCrits(input), 'standard');
  expect(result.runMP).toBe(8);
  expect(result.jumpMP).toBe(7);
});
