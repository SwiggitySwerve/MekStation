import type { UnitData } from '../validate-bv-types';

import { calculateUnitBV } from '../validate-bv-calculator';

const unit: UnitData = {
  id: 'ram-spikes',
  chassis: 'Test',
  model: 'Ram plate',
  unitType: 'BattleMech',
  configuration: 'Quad',
  techBase: 'INNER_SPHERE',
  tonnage: 50,
  engine: { type: 'FUSION', rating: 400 },
  gyro: { type: 'STANDARD' },
  cockpit: 'STANDARD',
  structure: { type: 'STANDARD' },
  armor: { type: 'STANDARD', allocation: { HEAD: 9 } },
  heatSinks: { type: 'SINGLE', count: 10 },
  movement: { walk: 8, jump: 0 },
  equipment: [],
};

// MiscType.java:1405-1418 (48fcb2f64) adds one damage per torso with spikes
// after halving maximum charge damage and before multiplying by 1.1.
it('retains ordinary ram-plate BV without spikes', () => {
  expect(
    calculateUnitBV({ ...unit, criticalSlots: { CENTER_TORSO: ['Ram Plate'] } })
      .breakdown?.offEquipBV,
  ).toBe(33);
});

it('adds all three torso spike locations to the ram plate', () => {
  const result = calculateUnitBV({
    ...unit,
    criticalSlots: {
      CENTER_TORSO: ['Ram Plate', 'Spikes'],
      LEFT_TORSO: ['Spikes'],
      RIGHT_TORSO: ['Spikes'],
    },
  }).breakdown!;
  expect(result.offEquipBV).toBe(36.3);
  expect(result.defEquipBV).toBe(12);
});

it('adds one bonus per torso location and excludes limb spikes', () => {
  const result = calculateUnitBV({
    ...unit,
    criticalSlots: {
      CENTER_TORSO: ['Ram Plate', 'Spikes', null, 'Spikes'],
      LEFT_LEG: ['Spikes'],
      RIGHT_LEG: ['Spikes'],
    },
  }).breakdown!;
  expect(result.offEquipBV).toBe(34.1);
  expect(result.defEquipBV).toBe(16);
});
