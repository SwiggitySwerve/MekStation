/**
 * ProtoMech equipment picker legality, a port of MegaMekLab 62bf193
 * ProtoMekUtil.isProtoMekEquipment(eq, proto) (ProtoMekUtil.java:46-67), the
 * two-argument form UnitUtil.isEntityEquipment uses for the Equipment tab
 * (AbstractEquipmentDatabaseView.java:615, UnitUtil.java:1295).
 *
 * @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md
 */

import { EquipmentCategory } from '@/types/equipment';

import {
  isProtoMechCatalogEquipment,
  isProtoMechLoadoutMount,
} from '../equipmentLegality';

const item = (category: EquipmentCategory, allowed?: readonly string[]) => ({
  category,
  ...(allowed && { allowedUnitTypes: allowed }),
});

describe('isProtoMechCatalogEquipment', () => {
  const WEAPONS = [
    EquipmentCategory.ENERGY_WEAPON,
    EquipmentCategory.BALLISTIC_WEAPON,
    EquipmentCategory.MISSILE_WEAPON,
    EquipmentCategory.ARTILLERY,
  ];

  it.each(WEAPONS)('%s: a weapon needs the ProtoMech unit type', (category) => {
    expect(isProtoMechCatalogEquipment(item(category, ['ProtoMech']))).toBe(
      true,
    );
    expect(
      isProtoMechCatalogEquipment(item(category, ['BattleMech', 'ProtoMech'])),
    ).toBe(true);
    expect(isProtoMechCatalogEquipment(item(category, ['BattleMech']))).toBe(
      false,
    );
  });

  it('an unlisted weapon is not offered (F_PROTO_WEAPON is an allow-list)', () => {
    expect(
      isProtoMechCatalogEquipment(item(EquipmentCategory.ENERGY_WEAPON)),
    ).toBe(false);
  });

  it('ammunition is always offered', () => {
    expect(
      isProtoMechCatalogEquipment(item(EquipmentCategory.AMMUNITION)),
    ).toBe(true);
    expect(
      isProtoMechCatalogEquipment(
        item(EquipmentCategory.AMMUNITION, ['BattleMech']),
      ),
    ).toBe(true);
  });

  // ProtoMekUtil.java:50-67: a misc item needs F_PROTOMEK_EQUIPMENT, which the
  // catalog represents as allowedUnitTypes including ProtoMech, exactly as
  // F_PROTO_WEAPON is for a weapon. There is no separate misc flag.
  it.each([
    EquipmentCategory.MISC_EQUIPMENT,
    EquipmentCategory.ELECTRONICS,
    EquipmentCategory.PHYSICAL_WEAPON,
  ])('%s: misc needs allowedUnitTypes to include ProtoMech', (category) => {
    expect(isProtoMechCatalogEquipment(item(category, ['ProtoMech']))).toBe(
      true,
    );
    // A full list derived from the item's F_*_EQUIPMENT flags, as an EI interface.
    expect(
      isProtoMechCatalogEquipment(
        item(category, ['BattleMech', 'ProtoMech', 'BattleArmor']),
      ),
    ).toBe(true);
    expect(isProtoMechCatalogEquipment(item(category))).toBe(false);
    expect(isProtoMechCatalogEquipment(item(category, []))).toBe(false);
    expect(isProtoMechCatalogEquipment(item(category, ['BattleMech']))).toBe(
      false,
    );
  });

  it('answers a weapon and a misc item with the same listing the same way', () => {
    for (const types of [undefined, [], ['BattleMech'], ['ProtoMech']]) {
      expect(
        isProtoMechCatalogEquipment(
          item(EquipmentCategory.MISC_EQUIPMENT, types),
        ),
      ).toBe(
        isProtoMechCatalogEquipment(
          item(EquipmentCategory.ENERGY_WEAPON, types),
        ),
      );
    }
  });
});

describe('isProtoMechLoadoutMount', () => {
  // PMEquipmentTab.showInLoadOut hides jump jets, MASC, partial wing, magnetic
  // clamp and UMU; everything else (including the EI interface) is listed.
  it.each([
    'protomechjumpjet',
    'extendedjumpjetsystem',
    'ProtoMech Jump Jet',
    'protomechmasc',
    'protomechpartialwing',
    'protomagneticclamp',
    'protomechumu',
  ])('hides %s', (id) => {
    expect(isProtoMechLoadoutMount(id)).toBe(false);
  });

  // The Electric Discharge armor mount belongs to the armor type: the armor owner
  // (setProtoArmorEquipment) creates and removes it, so it is not loadout.
  it.each([
    'clan-electric-discharge-protomech',
    'Clan Electric Discharge ProtoMech',
    'CLEDPArmor',
  ])('hides the armor-owned mount %s', (id) => {
    expect(isProtoMechLoadoutMount(id)).toBe(false);
  });

  it.each(['CLERMicroLaser', 'eiinterface', 'Clan Ammo SRM-2 (10)'])(
    'lists %s',
    (id) => {
      expect(isProtoMechLoadoutMount(id)).toBe(true);
    },
  );
});
