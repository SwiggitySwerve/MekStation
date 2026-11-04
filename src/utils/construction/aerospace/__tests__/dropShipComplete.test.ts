import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';

import { calculateDropShipFinalBV } from '../dropShipComplete';

/** @spec establish-all-unit-data-parity: DropShip defensive BV dispatch */
describe('DropShip final stage and complete scope (MegaMek 48fcb2f64)', () => {
  const unit = {
    unitType: UnitType.DROPSHIP,
    structuralIntegrity: 0,
    totalArmorPoints: 1,
    maxThrust: 0,
    heatSinks: { type: HeatSinkType.SINGLE, count: 0 },
    equipment: [],
  };

  it('rounds the base before pilot skill, including fractional and zero pools', () => {
    expect(
      calculateDropShipFinalBV(0.49, 0, { gunnery: 0, piloting: 0 }),
    ).toMatchObject({ baseBV: 0, final: 0 });
    expect(
      calculateDropShipFinalBV(0.5, 0, { gunnery: 0, piloting: 0 }),
    ).toMatchObject({ baseBV: 1, final: 2 });
    expect(calculateDropShipFinalBV(1632, 2339.75)).toEqual({
      baseBV: 3972,
      summaryModifier: 1,
      pilotMultiplier: 1,
      final: 3972,
    });
    expect(
      calculateBattleValueForUnit(unit, { gunnery: 0, piloting: 0 })?.breakdown,
    ).toMatchObject({
      calculationScope: 'complete',
      defensive: 2.5,
      baseBV: 3,
      final: 7,
    });
  });

  it.each(['SMALL', 'COMMAND_CONSOLE'])(
    'applies the inherited %s cockpit factor',
    (cockpit) => {
      expect(calculateDropShipFinalBV(1000, 0, { cockpit }).final).toBe(950);
      expect(
        calculateBattleValueForUnit({ ...unit, totalArmorPoints: 400, cockpit })
          ?.breakdown.final,
      ).toBe(950);
    },
  );

  it('applies both inherited drone reductions, without a third cockpit reduction', () => {
    expect(
      calculateDropShipFinalBV(1000, 0, { hasDroneOperatingSystem: true })
        .final,
    ).toBe(903);
    expect(
      calculateDropShipFinalBV(1000, 0, {
        hasDroneOperatingSystem: true,
        cockpit: 'SMALL',
      }).final,
    ).toBe(903);
  });

  it('records every unresolved mount and withholds partial offense and final BV', () => {
    const result = calculateBattleValueForUnit({
      ...unit,
      equipment: [
        { equipmentId: 'unknown-capital-weapon', location: 'NOSE' },
        { equipmentId: 'ppc-capacitor', location: 'NOSE' },
        { equipmentId: 'droneoperatingsystem', location: 'HULL' },
      ],
    });
    expect(result?.kind).toBe('dropship');
    if (result?.kind !== 'dropship')
      throw new Error('Missing DropShip dispatch');
    expect(result.breakdown).toMatchObject({
      calculationScope: 'defensive-only',
      offensive: undefined,
      final: undefined,
    });
    expect(result.breakdown.unresolvedMounts.map((m) => m.mountIndex)).toEqual([
      0, 1, 2,
    ]);
    expect(result.breakdown.incompleteReasons).toHaveLength(3);
  });

  it.each([
    { maxThrust: undefined },
    { maxThrust: NaN },
    { maxThrust: -1 },
    { heatSinks: undefined },
    { heatSinks: { type: HeatSinkType.SINGLE, count: -1 } },
    { heatSinks: { type: HeatSinkType.DOUBLE_IS, count: 0.5 } },
    { cockpit: 'INTERFACE' },
  ])(
    'retains defense with an explicit reason for unsupported facts: %j',
    (facts) => {
      const result = calculateBattleValueForUnit({ ...unit, ...facts });
      if (result?.kind !== 'dropship')
        throw new Error('Missing DropShip dispatch');
      expect(result.breakdown.calculationScope).toBe('defensive-only');
      expect(result.breakdown.final).toBeUndefined();
      expect(result.breakdown.incompleteReasons.length).toBeGreaterThan(0);
    },
  );
});
