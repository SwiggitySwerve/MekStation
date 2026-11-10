/**
 * BLK armor codes against MegaMek 48fcb2f6 EquipmentType.T_ARMOR_*
 * (EquipmentType.java:85-112) and the reader's decode. BLK stealth on vehicles
 * and aerospace is T_ARMOR_STEALTH_VEHICLE (22); Ferro-Fibrous is one code
 * whose IS/Clan side comes from the unit's tech base (BLKTankFile.java:284-300,
 * ArmorType.of(armorTypeId, t.isClan())).
 */
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { TechBase } from '@/types/enums/TechBase';

import { decodeBlkArmorType } from '../BlkArmorCodes';
import { getBlkExportService } from '../BlkExportService';
import { BlkParserService } from '../BlkParserService';
import { createMockVehicleState } from './BlkExportService.test-helpers';

const JAVA_CODES: readonly [ArmorTypeEnum, TechBase, number][] = [
  [ArmorTypeEnum.STANDARD, TechBase.INNER_SPHERE, 0],
  [ArmorTypeEnum.FERRO_FIBROUS_IS, TechBase.INNER_SPHERE, 1],
  [ArmorTypeEnum.FERRO_FIBROUS_CLAN, TechBase.CLAN, 1],
  [ArmorTypeEnum.REACTIVE, TechBase.INNER_SPHERE, 2],
  [ArmorTypeEnum.REFLECTIVE, TechBase.INNER_SPHERE, 3],
  [ArmorTypeEnum.HARDENED, TechBase.INNER_SPHERE, 4],
  [ArmorTypeEnum.LIGHT_FERRO, TechBase.INNER_SPHERE, 5],
  [ArmorTypeEnum.HEAVY_FERRO, TechBase.INNER_SPHERE, 6],
  [ArmorTypeEnum.FERRO_FIBROUS_PROTO, TechBase.INNER_SPHERE, 9], // EquipmentType.java:94.
  [ArmorTypeEnum.COMMERCIAL, TechBase.INNER_SPHERE, 10], // EquipmentType.java:95.
  [ArmorTypeEnum.FERRO_LAMELLOR, TechBase.CLAN, 16],
  [ArmorTypeEnum.STEALTH, TechBase.INNER_SPHERE, 22],
  [ArmorTypeEnum.BALLISTIC_REINFORCED, TechBase.INNER_SPHERE, 26],
];

it('covers every armor type the editor can export', () => {
  expect(new Set(JAVA_CODES.map(([type]) => type))).toEqual(
    new Set(Object.values(ArmorTypeEnum)),
  );
});

it.each(JAVA_CODES)(
  '%s exports Java code and reads back through the BLK reader (%s, %i)',
  (armorType, techBase, javaCode) => {
    const exported = getBlkExportService().export(
      createMockVehicleState({ armorType, techBase }),
    );
    expect(exported.success).toBe(true);
    const parsed = new BlkParserService().parse(exported.content ?? '');
    if (!parsed.success) throw new Error(JSON.stringify(parsed.error));
    expect(parsed.data.document.armorType).toBe(javaCode);
    expect(decodeBlkArmorType(javaCode, techBase === TechBase.CLAN)).toBe(
      armorType,
    );
  },
);

it('decodes the Mek stealth code and leaves non-editor codes unmapped', () => {
  expect(decodeBlkArmorType(8, false)).toBe(ArmorTypeEnum.STEALTH);
  // Support-vehicle BAR armor (T_ARMOR_SV_BAR_2, :128) has no editor type.
  expect(decodeBlkArmorType(43, false)).toBeUndefined();
});
