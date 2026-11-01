/**
 * Converter-emitted DropShip JSON must pass `UnitContract` and use the
 * `UnitType` spelling the app dispatches on. Fixtures are the output of
 * `blk_capital_converter.py` for five sources in mm-data
 * 50f7efef0c9f775b0258f8283525ed4f906e1985, under `data/mekfiles/dropships/`:
 *   - `Other/Union (3070).blk`: aerospace armor, spheroid
 *   - `TRO3085/Supplemental/Dragau II Assault Interceptor.blk`: heavy
 *     ferro-aluminum armor, aerodyne
 *   - `Historicals/Liberation of Terra I and II/Lee (2756 Cargo).blk`:
 *     ferro-aluminum armor
 *   - `TRO3075/Age of War/Vulture (2312).blk`: primitive aerospace armor
 *   - `TRO3057R/Clan/Behemoth C (Arcship).blk`: 100,000 t, past the
 *     250 t BattleMech cap
 */

import fs from 'node:fs';
import path from 'node:path';

import { UnitContract } from '@/types/contracts';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

function readFixture(name: string): Record<string, unknown> {
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf-8'),
  );
}

const FIXTURES = [
  { file: 'dropship-union-3070.json', armor: 'AEROSPACE', tonnage: 3600 },
  {
    file: 'dropship-dragau-ii-assault-interceptor.json',
    armor: 'HEAVY_FERRO_ALUMINUM',
    tonnage: 2500,
  },
  {
    file: 'dropship-lee-cargo-carrier.json',
    armor: 'FERRO_ALUMINUM',
    tonnage: 17000,
  },
  {
    file: 'dropship-vulture-2312.json',
    armor: 'PRIMITIVE_AERO',
    tonnage: 3500,
  },
  {
    file: 'dropship-behemoth-c-arcship.json',
    armor: 'AEROSPACE',
    tonnage: 100000,
  },
] as const;

describe('converter DropShip output against UnitContract', () => {
  for (const fixture of FIXTURES) {
    describe(fixture.file, () => {
      it('parses through UnitContract', () => {
        const result = UnitContract.safeParse(readFixture(fixture.file));
        if (!result.success) {
          throw new Error(JSON.stringify(result.error.issues.slice(0, 5)));
        }
        expect(result.success).toBe(true);
      });

      it('uses the DropShip UnitType and keeps its armor type and tonnage', () => {
        const unit = readFixture(fixture.file) as {
          unitType: string;
          tonnage: number;
          armor: { type: string };
        };
        expect(unit.unitType).toBe(UnitType.DROPSHIP);
        expect(unit.armor.type).toBe(fixture.armor);
        expect(unit.tonnage).toBe(fixture.tonnage);
      });
    });
  }
});

it.each(['FERRO_CARBIDE', 'LAMELLOR_FERRO_CARBIDE', 'IMPROVED_FERRO_ALUMINUM'])(
  'scopes %s to capital units',
  (type) => {
    for (const unitType of [
      'DropShip',
      'JumpShip',
      'WarShip',
      'Space Station',
    ]) {
      expect(
        UnitContract.safeParse({
          id: 'scope',
          unitType,
          tonnage: 100,
          armor: { type, byArc: { NOSE: 1 } },
        }).success,
      ).toBe(true);
    }
    for (const unitType of [
      'Vehicle',
      'Support Vehicle',
      'Aerospace',
      'Small Craft',
    ]) {
      expect(
        UnitContract.safeParse({
          id: 'scope',
          unitType,
          tonnage: 100,
          armor: { type, byArc: { NOSE: 1 } },
        }).success,
      ).toBe(false);
    }
  },
);

it('validates capital drive and deck facts even below 250 tons', () => {
  const unit = {
    id: 'drive',
    unitType: 'WarShip',
    tonnage: 100,
    gravDecks: [45],
    driveCoreType: 4,
    hasSail: false,
  };
  expect(UnitContract.safeParse(unit).success).toBe(true);
  for (const invalid of [
    { gravDecks: [-1] },
    { gravDecks: ['45'] },
    { driveCoreType: 5 },
    { hasSail: 1 },
  ]) {
    expect(UnitContract.safeParse({ ...unit, ...invalid }).success).toBe(false);
  }
});
