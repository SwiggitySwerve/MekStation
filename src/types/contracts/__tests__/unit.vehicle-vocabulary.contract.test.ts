/**
 * Converter-emitted vehicle JSON must pass `UnitContract` and use the
 * `UnitType` spellings the BV dispatcher reads. Fixtures are the output of
 * `blk_vehicle_converter.py` for three sources in mm-data
 * 50f7efef0c9f775b0258f8283525ed4f906e1985, under `data/mekfiles/vehicles/`:
 *   - `3039u/J-27 Ordnance Transport (Trailer).blk`: engine_type 8 (`NONE`)
 *   - `AToW Companion/Hover/Boreas Cavalry Hovercraft Prime.blk`: support
 *     tank, BAR 8 armor
 *   - `3085u/Cutting Edge/Tonbo Superheavy Transport.blk`: support VTOL,
 *     BAR 7 armor
 */

import fs from 'node:fs';
import path from 'node:path';

import { UnitContract } from '@/types/contracts';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';

function readFixture(name: string): Record<string, unknown> {
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf-8'),
  );
}

const FIXTURES = [
  {
    label: 'trailer (engine NONE)',
    file: 'vehicle-trailer-j27-ordnance-transport.json',
    unitType: UnitType.VEHICLE,
    engine: 'NONE',
  },
  {
    label: 'Boreas Prime (BAR armor)',
    file: 'vehicle-support-boreas-prime.json',
    unitType: UnitType.SUPPORT_VEHICLE,
    armor: { type: 'BAR', barRating: 8 },
  },
  {
    label: 'Tonbo (support VTOL)',
    file: 'vehicle-support-vtol-tonbo.json',
    unitType: UnitType.SUPPORT_VEHICLE,
    armor: { type: 'BAR', barRating: 7 },
    motionType: 'VTOL',
  },
] as const;

describe('converter vehicle vocabulary against UnitContract', () => {
  for (const fixture of FIXTURES) {
    describe(fixture.label, () => {
      it('parses through UnitContract', () => {
        const result = UnitContract.safeParse(readFixture(fixture.file));
        if (!result.success) {
          throw new Error(JSON.stringify(result.error.issues.slice(0, 5)));
        }
        expect(result.success).toBe(true);
      });

      it('emits a UnitType the BV dispatcher recognises', () => {
        const unit = readFixture(fixture.file);
        expect(unit.unitType).toBe(fixture.unitType);
        expect(Object.values(UnitType)).toContain(unit.unitType);
      });

      it('keeps the split vocabulary', () => {
        const unit = readFixture(fixture.file) as {
          engine: { type: string };
          armor: { type: string; barRating?: number };
          motionType: string;
        };
        if ('engine' in fixture) expect(unit.engine.type).toBe(fixture.engine);
        if ('armor' in fixture) expect(unit.armor).toMatchObject(fixture.armor);
        if ('motionType' in fixture)
          expect(unit.motionType).toBe(fixture.motionType);
      });
    });
  }

  // The raw converter JSON is not yet a domain unit (UL-17), so the calculators
  // may throw on it. The discriminator itself only returns `undefined` for an
  // unrecognised spelling; a throw means a calculator was reached.
  function dispatches(unit: { unitType: string }): boolean {
    try {
      return calculateBattleValueForUnit(unit) !== undefined;
    } catch {
      return true;
    }
  }

  it.each([
    'vehicle-support-boreas-prime.json',
    'vehicle-support-vtol-tonbo.json',
  ])('dispatches %s to a BV calculator', (file) => {
    expect(dispatches(readFixture(file) as { unitType: string })).toBe(true);
  });

  it.each(['Conventional Fighter', 'Small Craft'])(
    'dispatches the aerospace spelling %s',
    (unitType) => {
      expect(dispatches({ unitType })).toBe(true);
    },
  );

  it.each(['SupportVehicle', 'ConventionalFighter', 'SmallCraft'])(
    'does not dispatch the retired converter spelling %s',
    (unitType) => {
      expect(dispatches({ unitType })).toBe(false);
    },
  );
});

describe('BattleMech branch and the shared engine enum', () => {
  // The schema generator can only add `required`/nested `properties` per unit
  // type, so the vehicle engine codes (BLKFile.java:88,90: NONE = 8,
  // STEAM = 10) are in the enum every branch shares. The BattleMech branch
  // therefore admits them; the custom-combat snapshot narrows them away
  // (customCombatDefinition.test.ts). Narrowing the mech branch is a
  // deliberate change that should update this test.
  const atlas = JSON.parse(
    fs.readFileSync(
      path.join(
        process.cwd(),
        'public/data/units/battlemechs/2-star-league/standard/Atlas AS7-D.json',
      ),
      'utf-8',
    ),
  ) as { engine: Record<string, unknown>; armor: Record<string, unknown> };

  it('admits BAR armor with a rating on a BattleMech through UnitContract', () => {
    // Same shared-enum limit, for armor; the loader maps an unknown armor
    // type to STANDARD, so this admission is pinned rather than silent.
    const unit = {
      ...atlas,
      armor: {
        ...atlas.armor,
        type: 'BAR',
        barRating: 5,
      },
    };
    expect(UnitContract.safeParse(unit).success).toBe(true);
  });

  it.each(['NONE', 'STEAM'])(
    'admits engine %s on a BattleMech through UnitContract',
    (type) => {
      const unit = { ...atlas, engine: { ...atlas.engine, type } };
      expect(UnitContract.safeParse(unit).success).toBe(true);
    },
  );
});
