import type { UnitData } from '../validate-bv-types';

import { EngineType } from '../../src/types/construction/EngineType';
import { calculateOffensiveBVWithHeatTracking } from '../../src/utils/construction/battleValueHeatTracking';
import { calculateUnitBV } from '../validate-bv-calculator';

const config = {
  weapons: [100, 90, 80].map((bv) => ({
    id: String(bv),
    name: String(bv),
    bv,
    heat: 7,
  })),
  tonnage: 50,
  walkMP: 4,
  runMP: 6,
  jumpMP: 0,
  heatDissipation: 10,
  hasIndustrialStructure: true,
};

// 48fcb2f64: Mek.java:6348-6349, Engine.java:715-724. Structure determines
// industrial movement heat independently of the offensive cockpit modifier.
it.each([EngineType.STANDARD, EngineType.FISSION, EngineType.XXL])(
  'uses zero running heat with industrial structure and %s',
  (engineType) => {
    const result = calculateOffensiveBVWithHeatTracking({
      ...config,
      engineType,
    });
    expect(result.moveHeat).toBe(0);
    expect(result.heatEfficiency).toBe(16);
    expect(result.weaponBV).toBe(270);
    expect(result.offensiveTypeModifier).toBe(1);
  },
);

it('retains jump heat on an industrial structure', () => {
  expect(
    calculateOffensiveBVWithHeatTracking({ ...config, jumpMP: 3 }).moveHeat,
  ).toBe(3);
});

it('retains standard structure running heat and the existing cockpit modifier', () => {
  const result = calculateOffensiveBVWithHeatTracking({
    ...config,
    hasIndustrialStructure: false,
    isIndustrialMech: true,
  });
  expect(result.moveHeat).toBe(2);
  expect(result.offensiveTypeModifier).toBe(0.9);
});

it('projects industrial structure even when the source cockpit is standard', () => {
  const unit: UnitData = {
    id: 'industrial-heat',
    chassis: 'Industrial',
    model: 'Test',
    unitType: 'BattleMech',
    configuration: 'Biped',
    techBase: 'INNER_SPHERE',
    tonnage: 50,
    engine: { type: 'FUSION', rating: 200 },
    gyro: { type: 'STANDARD' },
    cockpit: 'STANDARD',
    structure: { type: 'INDUSTRIAL' },
    armor: { type: 'STANDARD', allocation: { HEAD: 9 } },
    heatSinks: { type: 'SINGLE', count: 8 },
    movement: { walk: 4, jump: 0 },
    equipment: Array.from({ length: 5 }, () => ({
      id: 'medium-laser',
      location: 'LEFT_ARM',
    })),
    criticalSlots: { LEFT_ARM: Array<string>(5).fill('ISMediumLaser') },
  };
  const result = calculateUnitBV(unit).breakdown;
  expect(result?.moveHeat).toBe(0);
  expect(result?.weaponBV).toBe(230);
  expect(result?.offensiveTypeModifier).toBe(1);
});
