import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { CapitalArc } from '@/types/unit/CapitalShipInterfaces';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';
import { contractUnitToBVUnit } from '@/utils/construction/contractBVUnitAdapter';

import { resolveLargeAerospaceMountBV } from '../aerospaceBV';
import {
  calculateLargeAerospaceFirePool,
  getLargeAerospaceArcs,
} from '../largeAerospaceFirePool';

/** @spec establish-all-unit-data-parity: Capital ship defensive BV dispatch */
describe('capital offense and complete scope (MegaMek 48fcb2f64)', () => {
  const input = (bv: number[], heatCapacity: number) => ({
    isWarship: true,
    maxThrust: 3,
    heatCapacity,
    arcs: getLargeAerospaceArcs(true).map((arc, i) => ({
      arc,
      weaponBV: bv[i],
      heat: i < 2 ? 10 : 0,
      ammoBVByType: { naval: 100 },
      weaponBVByAmmoType: { naval: i === 3 ? 10 : 0 },
    })),
  });

  it('limits primary selection and weights the opposite arc third, with strict heat', () => {
    const facts = input([100, 500, 0, 80, 0, 200, 90, 70], 20);
    const result = calculateLargeAerospaceFirePool(facts);
    expect(result.primaryArc).toBe(CapitalArc.NOSE);
    expect(result.arcContributions.map((a) => a.arc)).toEqual([
      CapitalArc.NOSE,
      CapitalArc.FRONT_LEFT,
      CapitalArc.AFT,
      CapitalArc.AFT_RIGHT,
      CapitalArc.AFT_LEFT,
      CapitalArc.RIGHT_BROADSIDE,
      CapitalArc.LEFT_BROADSIDE,
      CapitalArc.FRONT_RIGHT,
    ]);
    expect(result.arcContributions.map((a) => a.weight)).toEqual([
      1, 1, 0.5, 0.25, 0.25, 0.25, 0.25, 0.25,
    ]);
    expect(result.ammoBV).toBe(5);
    for (const [capacity, expected] of [
      [10, [1, 1, 0.25]],
      [9, [1, 0.5, 0.25]],
    ] as const)
      expect(
        calculateLargeAerospaceFirePool({ ...facts, heatCapacity: capacity })
          .arcContributions.slice(0, 3)
          .map((a) => a.weight),
      ).toEqual(expected);
  });

  it('selects broadsides, covers every arc once, and rejects incomplete topology', () => {
    const facts = input([0, 80, 90, 0, 0, 0, 200, 0], 0);
    const result = calculateLargeAerospaceFirePool(facts);
    expect(result.primaryArc).toBe(CapitalArc.LEFT_BROADSIDE);
    expect(result.arcContributions.slice(0, 3).map((a) => a.arc)).toEqual([
      CapitalArc.LEFT_BROADSIDE,
      CapitalArc.AFT_LEFT,
      CapitalArc.RIGHT_BROADSIDE,
    ]);
    expect(new Set(result.arcContributions.map((a) => a.arc)).size).toBe(8);
    expect(() =>
      calculateLargeAerospaceFirePool({
        ...facts,
        arcs: facts.arcs.slice(0, 6),
      }),
    ).toThrow();
  });

  it('keeps capital rear flags at their native location and maps side/broadside tags', () => {
    const locations = [
      'FRONT_LEFT_SIDE',
      'FRONT_RIGHT_SIDE',
      'AFT_LEFT_SIDE',
      'AFT_RIGHT_SIDE',
      'LEFT_BROADSIDE',
      'RIGHT_BROADSIDE',
    ];
    const resolved = resolveLargeAerospaceMountBV(
      locations.map((location) => ({
        equipmentId: 'r-b-medium-laser',
        location,
      })),
      UnitType.WARSHIP,
    );
    expect(resolved.unresolved).toEqual([]);
    expect(resolved.arcs.map((a) => a.weaponBV)).toEqual([
      0, 46, 46, 0, 46, 46, 46, 46,
    ]);
    expect(
      resolveLargeAerospaceMountBV(
        [{ equipmentId: 'medium-laser', location: 'LEFT_BROADSIDE' }],
        UnitType.JUMPSHIP,
      ).unresolved,
    ).toHaveLength(1);
  });

  it.each([
    [UnitType.JUMPSHIP, 0.54],
    [UnitType.WARSHIP, 0.77],
    [UnitType.SPACE_STATION, 0.44],
  ] as const)(
    'composes supported %s mounts using native speed and default crew',
    (unitType, speedFactor) => {
      const source = {
        id: 'supported',
        unitType,
        tonnage: 100000,
        structuralIntegrity: 0,
        movement: { maxThrust: unitType === UnitType.WARSHIP ? 3 : 0 },
        heatSinks: { type: 'SINGLE', count: 100 },
        armor: { type: 'STANDARD', byArc: { NOSE: 1 } },
        equipment: [
          {
            id: 'b-medium-laser',
            location: unitType === UnitType.WARSHIP ? 'LEFT_BROADSIDE' : 'NOSE',
          },
        ],
      };
      const unit = contractUnitToBVUnit(source);
      const result = calculateBattleValueForUnit(unit);
      expect(result?.kind).toBe('capital-ship');
      expect(result?.breakdown).toMatchObject({
        calculationScope: 'complete',
        speedFactor,
        pilotMultiplier: 1,
      });
      if (
        result?.kind !== 'capital-ship' ||
        result.breakdown.calculationScope !== 'complete'
      )
        throw new Error('Expected complete capital BV');
      expect(result.breakdown.final).toBe(
        Math.round(result.breakdown.defensive + 46 * speedFactor),
      );
      expect(
        calculateBattleValueForUnit(unit, { gunnery: 0, piloting: 0 })
          ?.breakdown.final,
      ).toBe(Math.round(result.breakdown.final * 2.42));
    },
  );

  it('records unresolved capital bays, links, quantities and defensive qualifiers', () => {
    const result = calculateBattleValueForUnit({
      unitType: UnitType.WARSHIP,
      structuralIntegrity: 0,
      totalArmorPoints: 0,
      maxThrust: 0,
      heatSinks: { type: HeatSinkType.SINGLE, count: 0 },
      equipment: [
        'b-naval-laser-45',
        'b-sub-capital-laser-1',
        'ammo-nac-20:100',
        'b-isantimissilesystem',
        'ppc-capacitor',
      ].map((equipmentId) => ({ equipmentId, location: 'LEFT_BROADSIDE' })),
    });
    if (result?.kind !== 'capital-ship')
      throw new Error('Missing capital dispatch');
    expect(result.breakdown).toMatchObject({
      calculationScope: 'defensive-only',
      offensive: undefined,
      final: undefined,
    });
    expect(result.breakdown.unresolvedMounts.map((m) => m.mountIndex)).toEqual([
      0, 1, 2, 3, 4,
    ]);
    expect(result.breakdown.incompleteReasons).toHaveLength(5);
  });

  it.each([
    { maxThrust: undefined },
    { heatSinks: undefined },
    { cockpit: 'INTERFACE' },
  ])('withholds totals for missing stage facts: %j', (facts) => {
    const result = calculateBattleValueForUnit({
      unitType: UnitType.WARSHIP,
      structuralIntegrity: 0,
      totalArmorPoints: 0,
      maxThrust: 0,
      heatSinks: { type: HeatSinkType.SINGLE, count: 0 },
      ...facts,
    });
    if (result?.kind !== 'capital-ship')
      throw new Error('Missing capital dispatch');
    expect(result.breakdown.calculationScope).toBe('defensive-only');
    expect(result.breakdown.incompleteReasons.length).toBeGreaterThan(0);
  });
});
