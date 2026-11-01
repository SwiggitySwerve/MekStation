import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

import fixture from '../../../../../scripts/__tests__/fixtures/vehicle_aero_contract_bv.json';
import { calculateBattleValueForUnit } from '../../battleValueCalculations';
import {
  contractUnitToBVUnit,
  type IContractBVSource,
  type IContractBVVehicle,
} from '../../contractBVUnitAdapter';
import { calculateVehicleBV } from '../vehicleBV';
import { toVehicleBVInput } from '../vehicleBVAdapter';
import {
  calculateVehicleBVDefensiveTMM,
  hasVehicleStealth,
} from '../vehicleBVMovement';
import { baseInput } from './vehicleBV.test.helpers';

/** @spec establish-all-unit-data-parity/battle-value-system */
describe('Pinned MegaMek vehicle defensive TMM', () => {
  it.each([
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 1],
    [4, 1],
    [5, 2],
    [6, 2],
    [7, 3],
    [9, 3],
    [10, 4],
    [17, 4],
    [18, 5],
    [24, 5],
    [25, 6],
    [40, 6],
  ])('uses assembled flank %s (not cruise) for TMM %s', (flankMP, tmm) => {
    const result = calculateVehicleBV(baseInput({ cruiseMP: 0, flankMP }));
    expect(result.tmm).toBe(tmm);
    expect(result.defensiveFactor).toBe(1 + tmm / 10);
  });

  it.each([GroundMotionType.VTOL, GroundMotionType.WIGE])(
    '%s gets one airborne point only while moving',
    (motionType) => {
      expect(
        calculateVehicleBVDefensiveTMM(baseInput({ motionType, flankMP: 0 })),
      ).toBe(0);
      expect(
        calculateVehicleBVDefensiveTMM(baseInput({ motionType, flankMP: 1 })),
      ).toBe(1);
      expect(
        calculateVehicleBVDefensiveTMM(baseInput({ motionType, flankMP: 15 })),
      ).toBe(5);
    },
  );

  it.each([
    [0, 0, 0],
    [0, 1, 1],
    [0, 2, 1],
    [0, 3, 2],
    [6, 7, 4],
    [18, 7, 5],
    [0, 25, 7],
  ])(
    'compares run %s against jump %s including its bonus',
    (flankMP, jumpMP, tmm) => {
      expect(
        calculateVehicleBVDefensiveTMM(baseInput({ flankMP, jumpMP })),
      ).toBe(tmm);
    },
  );

  it('does not substitute submarine depth MP for defensive run MP', () => {
    const result = calculateVehicleBV(
      baseInput({
        motionType: GroundMotionType.SUBMARINE,
        flankMP: 18,
        submarineMP: 0,
      }),
    );
    expect(result.tmm).toBe(5);
    expect(result.speedFactor).toBe(0.44); // Existing offensive selection.
  });

  it.each([
    [0, 0, 0],
    [1, 0, 2],
    [0, 1, 3],
    [6, 7, 6],
  ])(
    'adds stealth only to nonzero run %s / jump %s',
    (flankMP, jumpMP, tmm) => {
      expect(
        calculateVehicleBVDefensiveTMM(
          baseInput({ flankMP, jumpMP, hasStealth: true }),
        ),
      ).toBe(tmm);
    },
  );

  it('transports represented uniform stealth without changing armor valuation', () => {
    const source = fixture.units[0].unit as IContractBVSource;
    const calculate = (type: string) =>
      calculateBattleValueForUnit(
        contractUnitToBVUnit({ ...source, armor: { ...source.armor, type } }),
      );
    const normal = calculate('STANDARD');
    const stealth = calculate('STEALTH');
    if (normal?.kind !== 'vehicle' || stealth?.kind !== 'vehicle')
      throw new Error('Expected vehicle');
    expect(stealth.breakdown.tmm).toBe(7);
    expect(stealth.breakdown.armorBV).toBe(normal.breakdown.armorBV);
    expect(stealth.breakdown.offensive).toBe(normal.breakdown.offensive);
  });

  it.each<[string | number | undefined, boolean]>([
    [8, true],
    [22, true],
    [7, false],
    [0, false],
    ['Stealth', true],
    ['PATCHWORK', false],
    [undefined, false],
  ])('classifies uniform armor %s as stealth %s', (armorType, expected) => {
    expect(hasVehicleStealth(armorType)).toBe(expected);
  });

  it('carries numeric unit and named store stealth through the adapters', () => {
    const unit = contractUnitToBVUnit(
      fixture.units[0].unit as IContractBVSource,
    );
    const { hasStealth, ...rawUnit } = unit as IContractBVVehicle;
    expect(hasStealth).toBe(false);
    // Runtime handler units carry numeric armor; the contract fixture supplies
    // the otherwise identical vehicle shape through the public dispatcher.
    const numeric = { ...rawUnit, armorType: 22 };
    const result = calculateBattleValueForUnit(numeric);
    if (result?.kind !== 'vehicle') throw new Error('Expected vehicle');
    expect(result.breakdown.tmm).toBe(7);
    const input = toVehicleBVInput({
      motionType: GroundMotionType.TRACKED,
      tonnage: 20,
      cruiseMP: 4,
      armorType: 'Stealth',
      armorAllocation: {},
      structureType: 'standard',
      turret: null,
      secondaryTurret: null,
      barRating: null,
      equipment: [],
    });
    expect(calculateVehicleBVDefensiveTMM(input)).toBe(4);
  });

  it('keeps fractional defense until final BV rounding', () => {
    const result = calculateVehicleBV(
      baseInput({
        flankMP: 6,
        totalArmorPoints: 1,
        totalStructurePoints: 0,
        tonnage: 0,
      }),
    );
    expect(result.defensive).toBeCloseTo(2.7, 12);
    expect(result.final).toBe(3);
  });
});
