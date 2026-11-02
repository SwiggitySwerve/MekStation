/** Native BA mount projection; identities belong to equipmentBVResolver. */
import { BattleArmorLocation } from '@/types/construction/UnitLocation';
import { TechBase } from '@/types/enums';
import { SquadMotionType } from '@/types/unit/BaseUnitInterfaces';
import {
  BattleArmorChassisType,
  BattleArmorWeightClass,
  ManipulatorType,
  type IBattleArmor,
  type IBattleArmorMountedEquipment,
} from '@/types/unit/PersonnelInterfaces';

import type { BAWeaponBVMount, BAAmmoBVMount } from './battleArmorBV';

import { getEquipmentEntry } from '../equipmentBVResolver';

const isMagneticClamp = (name: string) => /magnetic.?clamp/i.test(name);
const nativeParts = (mount: IBattleArmorMountedEquipment) =>
  mount.equipmentId.split(':');

/** BattleArmor.java:953-985,1360-1387, pin 48fcb2f64. Fresh loaded ammo only. */
export function canMakeBAAntiMekAttacks(
  unit: Pick<
    IBattleArmor,
    | 'baWeightClass'
    | 'chassisType'
    | 'motionType'
    | 'equipment'
    | 'techBase'
    | 'leftManipulator'
    | 'rightManipulator'
  >,
): boolean {
  const wc = unit.baWeightClass;
  if (
    wc === BattleArmorWeightClass.HEAVY ||
    wc === BattleArmorWeightClass.ASSAULT ||
    unit.chassisType === BattleArmorChassisType.QUAD ||
    unit.motionType === SquadMotionType.UMU
  )
    return false;
  const names = unit.equipment.map((m) => m.equipmentId.toLowerCase());
  const selected = [unit.leftManipulator, unit.rightManipulator];
  const grip =
    names.some(
      (n) => /basicmanipulator|battleclaw/.test(n) || isMagneticClamp(n),
    ) ||
    selected.some((m) =>
      [
        ManipulatorType.BASIC,
        ManipulatorType.BATTLE,
        ManipulatorType.BATTLE_VIBRO,
        ManipulatorType.HEAVY_BATTLE,
        ManipulatorType.HEAVY_BATTLE_VIBRO,
      ].includes(m),
    );
  const gloves = Math.max(
    names.filter((n) => /armoredglove/.test(n)).length,
    selected.filter((m) => m === ManipulatorType.ARMORED_GLOVE).length,
  );
  if (!grip && !(wc !== BattleArmorWeightClass.MEDIUM && gloves >= 2))
    return false;
  // Fresh one-shots carry linked ammo; explicit bins still lack native pool links.
  const hasAmmo = names.some((n) => /ammo/.test(n));
  return (
    unit.techBase === TechBase.CLAN ||
    !unit.equipment.some(
      (m) =>
        (m.equipmentId.includes(':Body') ||
          m.location === BattleArmorLocation.BODY) &&
        getEquipmentEntry(nativeParts(m)[0])?.category === 'Missile' &&
        (hasAmmo || /(?:OS|\(OS\))$/i.test(nativeParts(m)[0])),
    )
  );
}

/** BLKBattleArmorFile.java:212-294; BV calculator filters:133-160,329-337. */
export function projectBAMounts(
  equipment: readonly IBattleArmorMountedEquipment[],
  squadSize: number,
): {
  weapons: BAWeaponBVMount[];
  ammo: BAAmmoBVMount[];
  unresolvedEquipment: string[];
  hasMagneticClamp: boolean;
} {
  const weapons: BAWeaponBVMount[] = [];
  const ammo: BAAmmoBVMount[] = [];
  const unresolvedEquipment: string[] = [];
  for (const mount of equipment) {
    const [id, ...qualifiers] = nativeParts(mount);
    if (id === 'InfantryAssaultRifle') continue; // BattleArmorBVCalculator.java:115-120.
    const unknown = qualifiers.some(
      (q, i) =>
        ![
          'Body',
          'LA',
          'RA',
          'TU',
          'DWP',
          'SSWM',
          'APM',
          'OMNI',
          'SIZE',
        ].includes(q) &&
        qualifiers[i - 1] !== 'SIZE' &&
        !/^Shots\d+#$/.test(q),
    );
    if (unknown) {
      unresolvedEquipment.push(`${mount.equipmentId}: unsupported qualifier`);
      continue;
    }
    if (/ammo/i.test(id)) {
      unresolvedEquipment.push(
        `${mount.equipmentId}: missing kgPerShot / native ammo pool`,
      );
      continue;
    }
    const entry = getEquipmentEntry(id);
    if (!entry) {
      unresolvedEquipment.push(`${id}: catalog identity unresolved`);
      continue;
    }
    const claw = /battleclaw.*(?:vibro|magnet)/i.test(id);
    if (
      !claw &&
      !['Ballistic', 'Energy', 'Missile', 'Physical'].includes(entry.category)
    )
      continue;
    const personal = /^Trooper \d+$/i.test(mount.unitLocation ?? '');
    const support = qualifiers.includes('SSWM');
    const infantry =
      qualifiers.includes('APM') || mount.isAPMount || /^Infantry/i.test(id);
    if ((personal || support) && infantry) continue;
    const quantity = personal || support ? 1 / Math.max(1, squadSize) : 1;
    weapons.push({
      id: entry.id,
      quantity,
      antiMekQuantity:
        personal && support ? quantity / Math.max(1, squadSize) : quantity,
      antiMekOnly: claw,
      antiMek:
        claw ||
        (entry.category !== 'Missile' &&
          !infantry &&
          !qualifiers.includes('Body') &&
          mount.location !== BattleArmorLocation.BODY),
    });
  }
  return {
    weapons,
    ammo,
    unresolvedEquipment,
    hasMagneticClamp: equipment.some((m) => isMagneticClamp(m.equipmentId)),
  };
}
