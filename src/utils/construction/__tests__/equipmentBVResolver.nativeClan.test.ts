import { getWeaponData } from '@/engine/adapters/CompendiumAdapter.weaponData';
import { normalizeEquipmentId as normalizeMTFEquipment } from '@/services/conversion/MTFParser.mapping';
import { nativeClanWeapons } from '@/services/equipment/__tests__/NativeClanWeapons.test.helpers';
import { ProtoLocation } from '@/types/unit/ProtoMechInterfaces';
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

describe.each(nativeClanWeapons)(
  '$native',
  ({ native, names, expected, heat, damage }) => {
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
        heat,
      });
    });

    it('contributes native type BV without altering mounts', () => {
      const unit = buildProto({
        tonnage: 5,
        equipment: [mount(native, ProtoLocation.TORSO)],
      });
      const before = JSON.stringify(unit);
      expect(calculateProtoMechBV(unit).weaponBV).toBe(expected.battleValue);
      expect(JSON.stringify(unit)).toBe(before);
    });

    if (native !== 'CLLightTAG') {
      it.each([
        native,
        native.toLowerCase(),
        native.toUpperCase(),
        expected.id,
      ])('supplies native combat weapon data for %s', (name) => {
        expect(getWeaponData(name)).toMatchObject({
          id: expected.id,
          damage,
          heat,
        });
      });
    }
  },
);

it.each(['Light Machine Gun', 'IS Light Machine Gun'])(
  'keeps %s on the Inner Sphere record',
  (name) => {
    expect(normalizeEquipmentId(name)).toBe('light-machine-gun');
    expect(getEquipmentEntry(name)?.techBase).toBe('INNER_SPHERE');
  },
);

it.each(['baermicrolaser', 'balightmg', 'light-tag'])(
  'preserves explicit legacy ID %s without claiming its fields match Java',
  (id) => {
    expect(normalizeEquipmentId(id)).toBe(id);
  },
);

// Direct native-name coverage for the preceding SRM correction's combat effect.
it.each([
  [1, 2],
  [3, 6],
  [5, 10],
])('supplies SRM %i combat damage %i', (rack, damage) => {
  expect(getWeaponData(`CLSRM${rack}`)).toMatchObject({
    id: `clan-srm-${rack}`,
    damage,
  });
});
