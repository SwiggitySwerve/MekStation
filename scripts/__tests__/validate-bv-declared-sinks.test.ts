import type { UnitData } from '../validate-bv-types';

import { EngineType } from '../../src/types/construction/EngineType';
import { calculateOffensiveBVWithHeatTracking } from '../../src/utils/construction/battleValueHeatTracking';
import { calculateUnitBV } from '../validate-bv-calculator';
import { scanCrits } from '../validate-bv-crit-scan';
import { deriveBvHeatAndMovement } from '../validate-bv-movement-derived';

const unit: UnitData = {
  id: 'declared-sinks',
  chassis: 'Test',
  model: 'ICE sinks',
  unitType: 'BattleMech',
  configuration: 'Biped',
  techBase: 'INNER_SPHERE',
  tonnage: 50,
  engine: { type: 'ICE', rating: 200 },
  gyro: { type: 'STANDARD' },
  cockpit: 'STANDARD',
  structure: { type: 'STANDARD' },
  armor: { type: 'STANDARD', allocation: { HEAD: 9 } },
  heatSinks: { type: 'DOUBLE', count: 4 },
  movement: { walk: 4, jump: 0 },
  equipment: [],
};

// MtfFile.java:570-598 and Mek.java:2198-2210 (48fcb2f64): allocate
// only declared, unplaced sinks within the engine's capacity.
it.each(['ICE', 'FUEL_CELL', 'FUSION'])(
  '%s capacity does not create additional declared sinks',
  (type) => {
    const input = { ...unit, engine: { type, rating: 200 } };
    const result = deriveBvHeatAndMovement(input, scanCrits(input), 'standard');
    expect(result.effectiveHSCount).toBe(4);
    expect(result.heatDiss).toBe(8);
  },
);

it('keeps zero declared ICE sinks at zero', () => {
  const input = { ...unit, heatSinks: { type: 'SINGLE', count: 0 } };
  expect(
    deriveBvHeatAndMovement(input, scanCrits(input), 'standard').heatDiss,
  ).toBe(0);
});

it('applies the native Raider-style heat cutoff without changing weapon values', () => {
  const result = calculateUnitBV({
    ...unit,
    equipment: [
      { id: 'light-ppc', location: 'RIGHT_ARM' },
      { id: 'medium-laser', location: 'LEFT_TORSO' },
      { id: 'medium-laser', location: 'LEFT_TORSO' },
      { id: 'er-small-laser', location: 'RIGHT_TORSO' },
      { id: 'small-laser', location: 'RIGHT_TORSO' },
    ],
  });
  expect(result.breakdown?.heatEfficiency).toBe(12);
  expect(result.breakdown?.weaponBV).toBe(201.5);
});

// Engine.java:715-724 retains ICE/fuel-cell movement heat on combat Meks.
it.each([EngineType.ICE, EngineType.FUEL_CELL])(
  'retains combat running heat and industrial exemption for %s',
  (engineType) => {
    for (const industrial of [false, true]) {
      const result = calculateOffensiveBVWithHeatTracking({
        weapons: [],
        tonnage: 50,
        walkMP: 4,
        runMP: 6,
        jumpMP: 0,
        heatDissipation: 8,
        engineType,
        hasIndustrialStructure: industrial,
      });
      expect(result.moveHeat).toBe(industrial ? 0 : 2);
      expect(result.heatEfficiency).toBe(industrial ? 14 : 12);
    }
  },
);
