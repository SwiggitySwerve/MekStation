import { HeatSinkType } from '../../src/types/construction/HeatSinkType';
import { UnitType } from '../../src/types/unit/BattleMechInterfaces';
import { calculateLargeAerospaceBV } from '../../src/utils/construction/aerospace/dropShipComplete';
import { calculateBattleValueForUnit } from '../../src/utils/construction/battleValueCalculations';
import { contractUnitToBVUnit } from '../../src/utils/construction/contractBVUnitAdapter';
import pinned from './fixtures/capital-terms.pinned.json';

const unit = {
  unitType: UnitType.DROPSHIP as const,
  structuralIntegrity: 11,
  totalArmorPoints: 644,
  equipment: [],
};
const complete = {
  ...unit,
  maxThrust: 5,
  heatSinks: { type: HeatSinkType.SINGLE, count: 10 },
};

/** Numeric terms of a complete DropShip breakdown for the given mounts. */
function completeTerms(
  equipment: { equipmentId: string; location: string }[],
): Record<string, number> {
  const b = calculateLargeAerospaceBV({ ...complete, equipment });
  if (b.calculationScope !== 'complete') throw new Error('Incomplete probe');
  return Object.fromEntries(
    Object.entries(b).filter(
      (entry): entry is [string, number] => typeof entry[1] === 'number',
    ),
  );
}

const weaponKeys = (terms: Record<string, unknown>): string[] =>
  Object.keys(terms).filter((key) => key.startsWith('weapon.'));
const near = (a: number, b: number): void =>
  expect(Math.abs(a - b)).toBeLessThanOrEqual(
    1e-9 * Math.max(1, Math.abs(a), Math.abs(b)),
  );

/** Mirrors the comparator's fold: per native location, a descending list. */
function weaponsByLocation(
  terms: Record<string, unknown>,
): Record<string, number[]> {
  const groups: Record<string, number[]> = {};
  for (const key of weaponKeys(terms)) {
    const match = key.match(/^weapon\.-?\d+\.([^.]+)\./);
    const value = terms[key];
    if (!match || typeof value !== 'number')
      throw new Error(`Unexpected weapon term ${key}`);
    (groups[match[1]] ??= []).push(value);
  }
  for (const values of Object.values(groups)) values.sort((a, b) => b - a);
  return groups;
}

test('large aerospace exposes summary before rounding and preserves incomplete scope', () => {
  expect(calculateLargeAerospaceBV(unit)).toMatchObject({
    calculationScope: 'defensive-only',
    final: undefined,
    typeModifier: 1,
  });
  expect(
    calculateLargeAerospaceBV({
      ...unit,
      maxThrust: 5,
      cockpit: 'SMALL',
      heatSinks: { type: HeatSinkType.SINGLE, count: 10 },
    }),
  ).toMatchObject({
    calculationScope: 'complete',
    summaryModifier: 0.95,
  });
});

test('capital trace uses the complete arc pool without requiring an aircraft fuselage', () => {
  const b = calculateLargeAerospaceBV({
    ...complete,
    structuralIntegrity: 1,
    totalArmorPoints: 1,
    equipment: [{ equipmentId: 'medium-laser', location: 'NOSE' }],
  });
  expect(b.calculationScope).toBe('complete');
  if (b.calculationScope !== 'complete') throw new Error('Incomplete probe');
  expect(b).toMatchObject({
    weaponBV: b.weaponFirePoolBV,
    offensiveEquipmentBV: 0,
    weightBV: 0,
    offensiveTypeModifier: 1,
    adjustment: 0,
  });
  expect(b.weaponFirePoolBV).toBeGreaterThan(0);
});

describe('capital per-mount weapon terms (MegaMek 48fcb2f64 LargeAeroBVCalculator)', () => {
  test('a defensive-only design projects no weapon terms', () => {
    expect(
      weaponKeys(
        calculateLargeAerospaceBV({
          ...unit,
          equipment: [{ equipmentId: 'medium-laser', location: 'NOSE' }],
        }),
      ),
    ).toEqual([]);
  });

  test('a rear-mounted side weapon keeps its physical location abbreviation', () => {
    const terms = completeTerms([
      { equipmentId: 'r-b-medium-laser', location: 'LEFT_SIDE' },
    ]);
    // Java getLocationAbbr is physical (LS), though the BV arc is Left Side (R).
    expect(Object.keys(weaponsByLocation(terms))).toEqual(['LS']);
  });

  test('equal mounts sum into one term; a rear flag splits the group', () => {
    const single = completeTerms([
      { equipmentId: 'b-medium-laser', location: 'NOSE' },
    ]);
    const pair = completeTerms([
      { equipmentId: 'b-medium-laser', location: 'NOSE' },
      { equipmentId: 'b-medium-laser', location: 'NOSE' },
    ]);
    expect(weaponKeys(pair)).toHaveLength(1);
    near(weaponsByLocation(pair).NOS[0], 2 * weaponsByLocation(single).NOS[0]);
    const split = completeTerms([
      { equipmentId: 'b-medium-laser', location: 'LEFT_SIDE' },
      { equipmentId: 'r-b-medium-laser', location: 'LEFT_SIDE' },
    ]);
    expect(weaponsByLocation(split).LS).toHaveLength(2);
  });

  test('a PPC capacitor adds once per group, after arc weighting', () => {
    const terms = completeTerms([
      { equipmentId: 'b-ppc', location: 'NOSE' },
      { equipmentId: 'b-ppc', location: 'NOSE' },
      { equipmentId: 'r-b-ppc', location: 'LEFT_SIDE' },
      { equipmentId: 'ppc-capacitor', location: 'LEFT_SIDE' },
    ]);
    expect(Object.keys(weaponsByLocation(terms)).sort()).toEqual(['LS', 'NOS']);
    const total = Object.values(weaponsByLocation(terms))
      .flat()
      .reduce((sum, value) => sum + value, 0);
    near(total, terms.weaponFirePoolBV);
  });

  test.each(pinned)(
    '$path matches the pinned Java per-location weapon terms',
    ({ unit: source, terms: java }) => {
      const byArc = Object.fromEntries(
        Object.entries(source.armor.byArc).map(([arc, points]) => {
          if (typeof points !== 'number')
            throw new Error('Invalid trace armor');
          return [arc, points];
        }),
      );
      const result = calculateBattleValueForUnit(
        contractUnitToBVUnit({
          ...source,
          armor: { ...source.armor, byArc },
        } as Parameters<typeof contractUnitToBVUnit>[0]),
      );
      if (result?.kind !== 'dropship' && result?.kind !== 'capital-ship')
        throw new Error('Expected large aerospace');
      const b = result.breakdown;
      if (b.calculationScope !== 'complete')
        throw new Error('Expected complete scope');
      const ours = weaponsByLocation(b);
      const theirs = weaponsByLocation(java);
      expect(Object.keys(ours).sort()).toEqual(Object.keys(theirs).sort());
      for (const [location, values] of Object.entries(theirs)) {
        expect(ours[location]).toHaveLength(values.length);
        values.forEach((value, index) => near(ours[location][index], value));
      }
      near(
        Object.values(ours)
          .flat()
          .reduce((sum, value) => sum + value, 0),
        b.weaponFirePoolBV,
      );
    },
  );
});
