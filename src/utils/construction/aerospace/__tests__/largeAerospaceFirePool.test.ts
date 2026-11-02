import { CapitalArc } from '@/types/unit/CapitalShipInterfaces';

import type { ILargeAerospaceArcBV } from '../largeAerospaceFirePool';

import { calculateLargeAerospaceFirePool } from '../largeAerospaceFirePool';

const { NOSE, FRONT_LEFT, AFT_LEFT, AFT, AFT_RIGHT, FRONT_RIGHT } = CapitalArc;
const locations = [NOSE, FRONT_LEFT, AFT_LEFT, AFT, AFT_RIGHT, FRONT_RIGHT];
const arcs = (bv: number[], heat = bv.map(() => 0)) =>
  locations.map((arc, index) => ({
    arc,
    weaponBV: bv[index],
    heat: heat[index],
  }));

/** @spec establish-all-unit-data-parity: Large aerospace offensive fire pool */
describe('pinned LargeAeroBVCalculator offensive stage', () => {
  it('reproduces Union (2708) offense 2339.75 from valued native arc facts', () => {
    // Native type BVs and ammo ratios; no contract conversion or final-BV claim.
    const input = arcs(
      [770, 893, 215, 215, 215, 893],
      [30, 38, 14, 14, 14, 38],
    );
    const ammo: Readonly<Record<string, number>>[] = [
      { ac: 9, lrm: 92 },
      { ac: 18, lrm: 92 },
      {},
      {},
      {},
      { ac: 18, lrm: 92 },
    ];
    const result = calculateLargeAerospaceFirePool({
      heatCapacity: 90,
      maxThrust: 5,
      arcs: input.map((arc, i) => ({
        ...arc,
        ammoBVByType: ammo[i],
        weaponBVByAmmoType: { ac: 140, lrm: 362 },
      })),
    });
    expect(result.primaryArc).toBe(FRONT_LEFT);
    expect(result.arcContributions.map((arc) => [arc.arc, arc.weight])).toEqual(
      [
        [FRONT_LEFT, 1],
        [NOSE, 1],
        [AFT_LEFT, 0.5],
        [AFT_RIGHT, 0.25],
        [AFT, 0.25],
        [FRONT_RIGHT, 0.25],
      ],
    );
    expect(result).toMatchObject({
      weaponFirePoolBV: 2101.25,
      ammoBV: 238.5,
      offensive: 2339.75,
    });
  });

  it('uses strict cumulative heat thresholds before each adjacent arc', () => {
    const input = arcs([100, 80, 1, 1, 1, 60], [10, 10, 0, 0, 0, 0]);
    const run = (heatCapacity: number) =>
      calculateLargeAerospaceFirePool({
        arcs: input,
        heatCapacity,
        maxThrust: 5,
      })
        .arcContributions.slice(0, 3)
        .map((arc) => arc.weight);
    expect(run(20)).toEqual([1, 1, 0.5]);
    expect(run(10)).toEqual([1, 1, 0.25]);
    expect(run(9)).toEqual([1, 0.5, 0.25]);
  });

  it('breaks primary ties in native index order and adjacent ties clockwise', () => {
    const result = calculateLargeAerospaceFirePool({
      arcs: arcs([100, 80, 0, 0, 0, 80]).reverse(),
      heatCapacity: 0,
      maxThrust: 5,
    });
    expect(result.arcContributions.slice(0, 3).map((arc) => arc.arc)).toEqual([
      NOSE,
      FRONT_RIGHT,
      FRONT_LEFT,
    ]);
    expect(
      calculateLargeAerospaceFirePool({
        arcs: arcs([0, 0, 0, 0, 0, 0]),
        heatCapacity: 0,
        maxThrust: 0,
      }).offensive,
    ).toBe(0);
  });

  it('caps ammunition by arc and native type/rack without changing primary selection', () => {
    const input = arcs([100, 10, 0, 0, 0, 0]);
    const result = calculateLargeAerospaceFirePool({
      heatCapacity: 0,
      maxThrust: 5,
      arcs: input.map(
        (arc): ILargeAerospaceArcBV => ({
          ...arc,
          ammoBVByType: { 'AC:5': 1000, 'LRM:20': 1000 },
          weaponBVByAmmoType: arc.arc === FRONT_LEFT ? { 'AC:5': 10 } : {},
        }),
      ),
    });
    expect(result.primaryArc).toBe(NOSE);
    expect(result.ammoBV).toBe(10);
  });

  it('uses maximum thrust and adds offensive equipment outside arc weights', () => {
    const result = calculateLargeAerospaceFirePool({
      arcs: arcs([100, 0, 0, 0, 0, 0]),
      heatCapacity: 0,
      maxThrust: 8,
      offensiveEquipmentBV: 10,
    });
    expect(result.speedFactor).toBe(1.37);
    expect(result.offensive).toBeCloseTo(150.7);
  });

  it('separates nominal selection from grouped capacitor additions after arc weighting', () => {
    const input = arcs([100, 80, 0, 20, 0, 60]);
    const result = calculateLargeAerospaceFirePool({
      heatCapacity: 0,
      maxThrust: 5,
      arcs: input.map((arc) =>
        arc.arc === AFT
          ? {
              ...arc,
              weaponSelectionBV: 200,
              arcIndependentWeaponBV: 10,
            }
          : arc,
      ),
    });
    expect(result.primaryArc).toBe(AFT);
    expect(result.arcContributions[0].weaponBV).toBe(30);
    expect(
      result.arcContributions.find((arc) => arc.arc === NOSE)?.weaponBV,
    ).toBe(25);
    const secondary = calculateLargeAerospaceFirePool({
      heatCapacity: 0,
      maxThrust: 5,
      arcs: input.map((arc) => ({
        ...arc,
        arcIndependentWeaponBV: arc.arc === AFT ? 10 : 0,
      })),
    });
    expect(
      secondary.arcContributions.find((arc) => arc.arc === AFT)?.weaponBV,
    ).toBe(15);
  });

  it('rejects missing, duplicate, unsupported or nonfinite stage facts', () => {
    const valid = {
      arcs: arcs([0, 0, 0, 0, 0, 0]),
      heatCapacity: 0,
      maxThrust: 0,
    };
    for (const input of [
      { ...valid, heatCapacity: NaN },
      { ...valid, maxThrust: -1 },
      { ...valid, arcs: valid.arcs.slice(1) },
      { ...valid, arcs: valid.arcs.map(() => valid.arcs[0]) },
      {
        ...valid,
        arcs: [
          { arc: CapitalArc.LEFT_BROADSIDE, weaponBV: 0, heat: 0 },
          ...valid.arcs.slice(1),
        ],
      },
      {
        ...valid,
        arcs: [{ ...valid.arcs[0], heat: -1 }, ...valid.arcs.slice(1)],
      },
      {
        ...valid,
        arcs: [
          { ...valid.arcs[0], ammoBVByType: { ac: Infinity } },
          ...valid.arcs.slice(1),
        ],
      },
    ])
      expect(() => calculateLargeAerospaceFirePool(input)).toThrow();
  });
});
