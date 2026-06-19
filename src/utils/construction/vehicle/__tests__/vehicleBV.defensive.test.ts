import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

import { calculateVehicleDefensiveBV } from '../vehicleBV';
import { baseInput } from './vehicleBV.test.helpers';

describe('Vehicle defensive BV', () => {
  it('armor BV = totalArmor x 2.5 x armorMult (standard)', () => {
    const def = calculateVehicleDefensiveBV(
      baseInput({
        totalArmorPoints: 100,
        totalStructurePoints: 0,
        armorType: 'standard',
      }),
    );
    expect(def.armorBV).toBe(250);
  });

  it('armor BV uses hardened multiplier 2.0', () => {
    const def = calculateVehicleDefensiveBV(
      baseInput({
        totalArmorPoints: 100,
        totalStructurePoints: 0,
        armorType: 'hardened',
      }),
    );
    expect(def.armorBV).toBe(500);
  });

  it('structure BV = totalStructure x 1.5 x structureMult (standard)', () => {
    const def = calculateVehicleDefensiveBV(
      baseInput({
        totalArmorPoints: 0,
        totalStructurePoints: 30,
        structureType: 'standard',
      }),
    );
    expect(def.structureBV).toBe(45);
  });

  it('structure BV uses composite multiplier 0.5', () => {
    const def = calculateVehicleDefensiveBV(
      baseInput({
        totalArmorPoints: 0,
        totalStructurePoints: 30,
        structureType: 'composite',
      }),
    );
    expect(def.structureBV).toBe(22.5);
  });

  it('defensive factor = 1 + TMM x 0.5 / 10 (flank 6 -> TMM 2 -> 1.1)', () => {
    const def = calculateVehicleDefensiveBV(
      baseInput({
        motionType: GroundMotionType.TRACKED,
        flankMP: 6,
        totalArmorPoints: 100,
        totalStructurePoints: 30,
      }),
    );
    expect(def.defensiveFactor).toBeCloseTo(1.1, 4);
  });

  it('composes defensive total: (armor + structure + defEq - explosive) x factor', () => {
    const def = calculateVehicleDefensiveBV(
      baseInput({
        motionType: GroundMotionType.TRACKED,
        flankMP: 6,
        totalArmorPoints: 100,
        totalStructurePoints: 30,
        defensiveEquipment: [
          { id: 'custom-shield', location: 'body', bvOverride: 10 },
        ],
        explosivePenalty: 5,
      }),
    );
    const expectedBase = 250 + 45 + 10 - 5;
    const expectedTotal = expectedBase * 1.1;
    expect(def.total).toBeCloseTo(expectedTotal, 4);
  });
});

describe('Vehicle BAR scaling', () => {
  it('BAR 10 -> no scaling', () => {
    const def = calculateVehicleDefensiveBV(
      baseInput({
        totalArmorPoints: 40,
        totalStructurePoints: 0,
        barRating: 10,
      }),
    );
    expect(def.armorBV).toBe(100);
  });

  it('BAR 5 -> armor BV x 0.5 (support-truck: 20 armor -> armor BV = 25)', () => {
    const def = calculateVehicleDefensiveBV(
      baseInput({
        totalArmorPoints: 20,
        totalStructurePoints: 0,
        barRating: 5,
      }),
    );
    expect(def.armorBV).toBe(25);
  });

  it('BAR 6 -> armor BV x 0.6 (spec scenario: 40 armor -> armor BV = 60)', () => {
    const def = calculateVehicleDefensiveBV(
      baseInput({
        totalArmorPoints: 40,
        totalStructurePoints: 0,
        barRating: 6,
      }),
    );
    expect(def.armorBV).toBe(60);
  });

  it('BAR null (combat vehicle) -> no scaling', () => {
    const def = calculateVehicleDefensiveBV(
      baseInput({
        totalArmorPoints: 100,
        totalStructurePoints: 0,
        barRating: null,
      }),
    );
    expect(def.armorBV).toBe(250);
  });
});
