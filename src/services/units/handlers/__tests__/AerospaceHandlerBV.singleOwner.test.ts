/**
 * The aerospace BV rules live in `aerospaceBVCalculator.ts` alone. A handler's
 * public `calculateBV` must return the calculator's value for the same unit; it
 * may not value SI (or anything else) with its own multipliers (follow-up 50).
 */

import type { IBlkDocument } from '@/types/formats/BlkFormat';

import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { calculateAerospaceBVFromUnit } from '@/utils/construction/aerospace/aerospaceBVUnitAdapter';

import { createAerospaceHandler } from '../AerospaceUnitHandler';
import { createConventionalFighterHandler } from '../ConventionalFighterUnitHandler';
import { createSmallCraftHandler } from '../SmallCraftUnitHandler';

function makeDoc(overrides: Partial<IBlkDocument>): IBlkDocument {
  return {
    blockVersion: 1,
    version: 'MAM0',
    year: 3025,
    type: 'IS Level 2',
    tonnage: 50,
    safeThrust: 6,
    fuel: 160,
    structuralIntegrity: 6,
    heatsinks: 10,
    sinkType: 0,
    engineType: 0,
    armorType: 0,
    cockpitType: 0,
    armor: [16, 12, 12, 8],
    equipmentByLocation: {},
    rawTags: {},
    ...overrides,
  } as IBlkDocument;
}

const CASES = [
  {
    label: 'ASF',
    handler: createAerospaceHandler(),
    doc: makeDoc({
      unitType: 'Aero',
      mappedUnitType: UnitType.AEROSPACE,
      name: 'Stuka',
      model: 'STU-K5',
      tonnage: 100,
    }),
  },
  {
    label: 'Conventional fighter',
    handler: createConventionalFighterHandler(),
    doc: makeDoc({
      unitType: 'ConvFighter',
      mappedUnitType: UnitType.CONVENTIONAL_FIGHTER,
      name: 'F-92 Stingray',
      model: 'Standard',
    }),
  },
  {
    label: 'Small craft',
    handler: createSmallCraftHandler(),
    doc: makeDoc({
      unitType: 'Small Craft',
      mappedUnitType: UnitType.SMALL_CRAFT,
      name: 'K-1',
      model: 'Shuttle',
      tonnage: 100,
      motionType: 'Aerodyne',
      crew: 2,
      passengers: 8,
      escapePod: 2,
      lifeBoat: 0,
      armor: [40, 30, 30, 20],
    }),
  },
] as const;

describe.each(CASES)('$label handler calculateBV', ({ handler, doc }) => {
  it('equals the aerospace BV calculator for the same unit', () => {
    const result = handler.parse(doc as IBlkDocument);
    expect(result.success).toBe(true);
    const unit = result.data!.unit;

    // Not a vacuous equality: the calculator's value is a real, positive BV.
    const expected = calculateAerospaceBVFromUnit(unit as never).final;
    expect(expected).toBeGreaterThan(0);
    expect(
      (handler as { calculateBV(u: unknown): number }).calculateBV(unit),
    ).toBe(expected);
  });
});
