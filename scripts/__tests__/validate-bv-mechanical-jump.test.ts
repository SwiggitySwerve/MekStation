import type { UnitData } from '../validate-bv-types';

import { calculateUnitBV } from '../validate-bv-calculator';
import { scanCrits } from '../validate-bv-crit-scan';
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

// MegaMek 48fcb2f64: BVCalculator.java:333-334; Mek.java:1883-1926;
// MekBVCalculator.java:338-345 uses jet MP, never booster MP, for jump heat.
describe('mechanical jump booster BV inputs', () => {
  function boosted(size: string, jump = 0): UnitData {
    const slot = `MechanicalJumpBooster:SIZE:${size}`;
    return {
      ...unit,
      movement: { walk: 3, jump },
      criticalSlots: { LEFT_LEG: [slot, slot], RIGHT_LEG: [slot, slot] },
    };
  }

  it.each([
    ['Fwltur FWL-3V', 35, 3, '2.0', 2, 1.12],
    ['Thunder Fox TFT-C3', 55, 4, '4.0', 4, 1.37],
    ["Juggernaut Leapin' Lil", 90, 3, '2.0', 2, 1.12],
  ] as const)(
    '%s uses sized movement without charging jump heat',
    (_name, tonnage, walk, size, jumpMP, speedFactor) => {
      const source = { ...boosted(size), tonnage, movement: { walk, jump: 0 } };
      const movement = deriveBvHeatAndMovement(
        source,
        scanCrits(source),
        'standard',
      );
      expect(movement).toMatchObject({ jumpMP, jumpHeatMP: 0 });
      expect(calculateUnitBV(source).breakdown).toMatchObject({
        jumpMP,
        speedFactor,
        moveHeat: 2,
      });
    },
  );

  it('takes the maximum of jet and booster movement but heats only jets', () => {
    const source = boosted('8.0', 3);
    const crit = scanCrits(source);
    crit.standardJJCrits = 3;
    expect(deriveBvHeatAndMovement(source, crit, 'standard')).toMatchObject({
      jumpMP: 8,
      jumpHeatMP: 3,
    });
    expect(calculateUnitBV(source).breakdown).toMatchObject({ moveHeat: 3 });
  });

  it('keeps the stronger jet movement and its heat', () => {
    const source = boosted('2.0', 5);
    expect(
      deriveBvHeatAndMovement(source, scanCrits(source), 'standard'),
    ).toMatchObject({
      jumpMP: 5,
      jumpHeatMP: 5,
    });
  });

  it('adds the partial wing bonus to boosters without adding heat', () => {
    const source = boosted('2.0');
    const crit = scanCrits(source);
    crit.hasPartialWing = true;
    expect(
      deriveBvHeatAndMovement({ ...source, tonnage: 50 }, crit, 'standard'),
    ).toMatchObject({
      jumpMP: 4,
      jumpHeatMP: 0,
    });
  });

  it.each(['3.5', '4e0d', '+4.0F'])(
    'reads native decimal size %s once across all slots',
    (size) => {
      const source = boosted(size);
      expect(
        deriveBvHeatAndMovement(source, scanCrits(source), 'standard').jumpMP,
      ).toBe(4);
    },
  );

  it.each(['Jump Booster', 'Mech Mechanical Jump Boosters'])(
    'recognizes the native alias %s',
    (name) => {
      const source = {
        ...unit,
        criticalSlots: { LEFT_LEG: [`${name}:SIZE:2.0`] },
      };
      expect(
        deriveBvHeatAndMovement(source, scanCrits(source), 'standard').jumpMP,
      ).toBe(2);
    },
  );

  it('ignores BA boosters in a mech critical grid', () => {
    const source = {
      ...unit,
      criticalSlots: { LEFT_LEG: ['BAMechanicalJumpBooster:SIZE:4.0'] },
    };
    expect(
      deriveBvHeatAndMovement(source, scanCrits(source), 'standard').jumpMP,
    ).toBe(0);
  });

  it('applies shield restrictions to mechanical movement', () => {
    const source = boosted('4.0');
    const crit = scanCrits(source);
    crit.hasMediumShield = true;
    expect(deriveBvHeatAndMovement(source, crit, 'standard').jumpMP).toBe(3);
    crit.shieldArms = ['LEFT_ARM', 'RIGHT_ARM'];
    expect(deriveBvHeatAndMovement(source, crit, 'standard').jumpMP).toBe(2);
    crit.hasLargeShield = true;
    expect(deriveBvHeatAndMovement(source, crit, 'standard').jumpMP).toBe(0);
  });

  it('rejects a malformed size at the critical-grid boundary', () => {
    expect(() => scanCrits(boosted('2oops'))).toThrow(
      'Invalid mechanical jump booster size',
    );
  });
});
