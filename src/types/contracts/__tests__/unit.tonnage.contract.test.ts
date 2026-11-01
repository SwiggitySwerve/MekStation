import fs from 'node:fs';
import path from 'node:path';

import { UnitContract } from '@/types/contracts';

describe('unit tonnage limits', () => {
  // Capital families share one coarse bound: the largest TestAero.getMaxTonnage
  // value at MegaMek 48fcb2f6 (TestAero.java:1234-1258), 2,500,000 t for Space
  // Stations and WarShips. Construction rules narrow it per family.
  it.each([
    ['Aerospace', 250],
    ['ProtoMech', 250],
    ['Vehicle', 250],
    ['VTOL', 250],
    ['Conventional Fighter', 250],
    ['Small Craft', 250],
    ['Infantry', 250],
    ['Battle Armor', 250],
    ['Support Vehicle', 600],
    ['SupportVehicle', 600],
    ['DropShip', 2500000],
    ['JumpShip', 2500000],
    ['WarShip', 2500000],
    ['Space Station', 2500000],
  ])(
    '%s accepts its limit and rejects one ton above it',
    (unitType, maximum) => {
      const unit = { id: 'boundary', unitType, tonnage: maximum };
      expect(UnitContract.safeParse(unit).success).toBe(true);
      expect(
        UnitContract.safeParse({ ...unit, tonnage: Number(maximum) + 1 })
          .success,
      ).toBe(false);
    },
  );

  it('rejects negative tonnage', () => {
    expect(
      UnitContract.safeParse({
        id: 'boundary',
        unitType: 'Support Vehicle',
        tonnage: -1,
      }).success,
    ).toBe(false);
  });

  it('accepts a 100,000 ton DropShip', () => {
    expect(
      UnitContract.safeParse({
        id: 'behemoth',
        unitType: 'DropShip',
        tonnage: 100000,
      }).success,
    ).toBe(true);
  });

  it('preserves the mech object API and 250 ton limit', () => {
    const mech = UnitContract.options[0];
    expect(mech.shape.tonnage.safeParse(250).success).toBe(true);
    expect(mech.shape.tonnage.safeParse(251).success).toBe(false);
    expect(mech.omit({ id: true }).shape).not.toHaveProperty('id');
  });

  it('accepts every existing catalog design', () => {
    const catalog = path.resolve(process.cwd(), 'public/data/units');
    const files = fs
      .readdirSync(catalog, { recursive: true, withFileTypes: true })
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.endsWith('.json') &&
          !['index.json', 'units-manifest.json'].includes(entry.name),
      );
    expect(files.length).toBeGreaterThan(0);
    for (const entry of files) {
      const file = path.join(entry.parentPath, entry.name);
      const result = UnitContract.safeParse(
        JSON.parse(fs.readFileSync(file, 'utf8')),
      );
      if (!result.success) throw new Error(`${file}: ${result.error.message}`);
    }
  });
});
