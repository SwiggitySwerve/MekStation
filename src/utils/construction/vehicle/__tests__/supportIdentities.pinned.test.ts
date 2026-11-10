/** @spec openspec/changes/establish-all-unit-data-parity/specs/vehicle-unit-system/spec.md */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { resolveEquipmentId } from '@/services/units/unitLoaderService/equipmentResolution';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import { getEquipmentEntry } from '@/utils/construction/equipmentBV';

import { fixture, weigh } from './supportMiscMasses.test.helpers';

jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));
beforeAll(async () => {
  await getEquipmentRegistry().initialize();
  await getEquipmentLookupService().initialize();
});

const NOVA = 'nova-combined-electronic-warfare-system-cews';
const MANIPULATOR = 'manipulator-non-mech-non-battlearmor';

// MegaMek 48fcb2f64: `Manipulator (Non-Mech/Non-Battle Armor)` is the internal
// name the BLK files use (EquipmentTypeLookup.java:342; the entry weighs 0.01 t,
// MiscType.java:7694-7703) and `Nova CEWS` is a registered lookup name of
// NovaCEWS (MiscType.java:6192-6193). Both resolve to the existing catalog
// entries through the native identity table.
describe('native identity spellings', () => {
  it.each([
    ['Nova CEWS', NOVA],
    ['NovaCEWS', NOVA],
    ['Manipulator (Non-Mech/Non-Battle Armor)', MANIPULATOR],
    ['Manipulator (Non-Mech/Non-BattleArmor)', MANIPULATOR],
  ])(
    '%s is the same entry in the BV catalog and the unit loader',
    (token, id) => {
      expect(getEquipmentEntry(token)?.id).toBe(id);
      expect(
        resolveEquipmentId(
          token,
          TechBase.INNER_SPHERE,
          TechBaseMode.INNER_SPHERE,
          undefined,
          token,
        ).equipmentDef?.id,
      ).toBe(id);
    },
  );
});

// Nova CEWS adds 1.5 t and 2 t of heat sinks (27.5 t against the 24 t base); the
// manipulator is 0.01 t each on a tank, a small tank and a VTOL.
describe('identity rows against the pinned verifier', () => {
  it.each(fixture.rows.filter((row) => row.group === 'identity'))(
    '$name equals the pinned Java terms',
    (row) => {
      const weight = weigh(row);
      expect(weight.unresolved).toEqual([]);
      expect(weight.miscEquipment).toBeCloseTo(row.java.miscEquipment, 9);
      expect(weight.total).toBeCloseTo(row.java.total, 9);
    },
  );
});
