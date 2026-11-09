/** ProtoMech armor identities: MegaMek 48fcb2f64 ArmorType.java:1375-1420.
 * @spec openspec/changes/establish-all-unit-data-parity/specs/protomech-unit-system/spec.md
 */
import type { IProtoMechMountedEquipment } from '@/types/unit/PersonnelInterfaces';
import type { IProtoMechUnit } from '@/types/unit/ProtoMechInterfaces';

import { ProtoMechLocation } from '@/types/construction/UnitLocation';

export const PROTO_ARMOR_CODES = {
  STANDARD_PROTOMEK: 42,
  ELECTRIC_DISCHARGE: 18,
} as const;

const STANDARD = {
  code: PROTO_ARMOR_CODES.STANDARD_PROTOMEK,
  name: 'Standard',
  label: 'Standard ProtoMech',
  weightPerPoint: 0.05,
  torsoSlots: 0,
} as const;
const EDP = {
  code: PROTO_ARMOR_CODES.ELECTRIC_DISCHARGE,
  name: 'Electric Discharge ProtoMech',
  label: 'Electric Discharge ProtoMech (Experimental)',
  weightPerPoint: 0.075,
  torsoSlots: 1,
} as const;

export const PROTO_ARMOR_TYPES = [STANDARD, EDP] as const;

/** Legacy stores and BLKs used 0 or omitted the Standard armor identity. */
export function getProtoArmorDefinition(
  code: number | undefined,
): (typeof PROTO_ARMOR_TYPES)[number] | undefined {
  if (code === undefined || code === 0) return STANDARD;
  return PROTO_ARMOR_TYPES.find((armor) => armor.code === code);
}

export function getProtoArmorName(
  code: number | undefined,
): IProtoMechUnit['armorType'] {
  return getProtoArmorDefinition(code)?.name ?? 'Unknown';
}

export function protoArmorContractType(
  code: number | undefined,
): keyof typeof PROTO_ARMOR_CODES {
  const armor = getProtoArmorDefinition(code);
  if (!armor) throw new TypeError(`Unsupported ProtoMech armor type: ${code}`);
  return armor.code === PROTO_ARMOR_CODES.ELECTRIC_DISCHARGE
    ? 'ELECTRIC_DISCHARGE'
    : 'STANDARD_PROTOMEK';
}

export function isProtoEDPArmorMount(equipmentId: string): boolean {
  const id = equipmentId.toLowerCase().replace(/[^a-z0-9]/g, '');
  return [
    'clanelectricdischargeprotomech',
    'electricdischargeprotomech',
    'cledparmor',
  ].includes(id);
}

export const PROTO_EDP_MOUNT = {
  equipmentId: 'clan-electric-discharge-protomech',
  name: EDP.name,
  location: ProtoMechLocation.TORSO,
} as const;

/** MML creates the mount on a type edit. Loading preserves source declarations.
 * Local compatibility: retain occupied torso mounts and diagnose overflow;
 * unallocated ProtoMech locations are not represented yet.
 */
export function setProtoArmorEquipment(
  armorType: number,
  equipment: readonly IProtoMechMountedEquipment[],
  instanceId: string,
): IProtoMechMountedEquipment[] {
  const armor = getProtoArmorDefinition(armorType);
  if (!armor)
    throw new TypeError(`Unsupported ProtoMech armor type: ${armorType}`);
  const retained = equipment.filter(
    (mount) => !isProtoEDPArmorMount(mount.equipmentId),
  );
  if (armor.code === EDP.code) {
    const existing = equipment.find((mount) =>
      isProtoEDPArmorMount(mount.equipmentId),
    );
    retained.push(
      existing
        ? { ...existing, location: ProtoMechLocation.TORSO }
        : { id: instanceId, ...PROTO_EDP_MOUNT },
    );
  }
  return retained;
}
