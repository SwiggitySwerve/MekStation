import { getWeaponData } from '@/engine/adapters/CompendiumAdapter.weaponData';
import { normalizeEquipmentId as normalizeMTFEquipment } from '@/services/conversion/MTFParser.mapping';
import { nativeProtoLRMs } from '@/services/equipment/__tests__/ProtoLRMCatalog.test.helpers';
import {
  buildWeaponLookupFromCatalogFiles,
  toAIWeapon,
} from '@/simulation/runner/UnitHydration';
import { ProtoLocation } from '@/types/unit/ProtoMechInterfaces';
import { WEAPON_CATALOG_FILES } from '@/utils/construction/equipmentBVCatalogData';
import {
  buildProto,
  mount,
} from '@/utils/construction/protomech/__tests__/protoMechBV.test.helpers';
import { calculateProtoMechBV } from '@/utils/construction/protomech/protoMechBV';

/** @spec openspec/changes/establish-all-unit-data-parity/specs/equipment-services/spec.md */
import {
  getEquipmentEntry,
  normalizeEquipmentId,
  resetCatalogCache,
  resolveEquipmentBV,
} from '../equipmentBVResolver';

afterEach(resetCatalogCache);
const lookup = buildWeaponLookupFromCatalogFiles(WEAPON_CATALOG_FILES);

describe.each(nativeProtoLRMs)(
  '$native',
  ({ native, rack, names, expected }) => {
    it.each(
      names.flatMap((name) => [name, name.toLowerCase(), name.toUpperCase()]),
    )('resolves native %s', (name) => {
      expect(normalizeEquipmentId(name)).toBe(expected.id);
      expect(normalizeMTFEquipment(name)).toBe(expected.id);
      expect(getEquipmentEntry(name)).toMatchObject({
        id: expected.id,
        techBase: 'CLAN',
        battleValue: expected.battleValue,
      });
      expect(resolveEquipmentBV(name)).toEqual({
        resolved: true,
        battleValue: expected.battleValue,
        heat: 0,
      });
    });

    it('uses type BV without mutating source equipment', () => {
      const unit = buildProto({
        tonnage: 5,
        equipment: [
          mount(native, ProtoLocation.TORSO),
          mount(expected.id, ProtoLocation.TORSO),
        ],
      });
      const before = JSON.stringify(unit);
      expect(calculateProtoMechBV(unit).weaponBV).toBe(
        expected.battleValue * 2,
      );
      expect(JSON.stringify(unit)).toBe(before);
    });

    it.each([native, native.toLowerCase(), native.toUpperCase(), expected.id])(
      'supplies combat and AI data for %s',
      (name) => {
        const expectedData = {
          damage: rack,
          heat: 0,
          minRange: 0,
          shortRange: 7,
          mediumRange: 14,
          longRange: 21,
        };
        expect(getWeaponData(name)).toMatchObject({
          id: expected.id,
          ...expectedData,
        });
        const stats = lookup(name);
        expect(stats).not.toBeNull();
        if (!stats) throw new Error('Missing catalog weapon');
        expect(toAIWeapon(stats, 0)).toMatchObject(expectedData);
      },
    );
  },
);

it.each([
  ['balrm1', 17],
  ['balrm2', 24],
  ['balrm3', 34],
  ['balrm4', 46],
] as const)(
  'preserves legacy %s without claiming native BA parity',
  (id, bv) => {
    expect(normalizeEquipmentId(id)).toBe(id);
    expect(resolveEquipmentBV(id)).toEqual({
      resolved: true,
      battleValue: bv,
      heat: 0,
    });
  },
);

it.each([1, 2, 3, 4])('preserves one-shot mapping CLLRM%i(OS)', (rack) => {
  expect(normalizeEquipmentId(`CLLRM${rack}(OS)`)).toBe(`balrm${rack}os`);
});
