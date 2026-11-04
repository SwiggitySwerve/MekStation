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

import { getEquipmentEntry, resolveEquipmentBV } from '../equipmentBVResolver';

const isMagneticClamp = (name: string) => /magnetic.?clamp/i.test(name);

// Java internal and lookup names of the BA systems that
// BattleArmorBVCalculator.java:280-326 values (pin 48fcb2f64).
const nameSet = (...names: string[]) =>
  new Set(names.map((name) => name.toLowerCase()));
// Sensor.java:94-95; MiscType.java:11270-11303.
const IMPROVED_SENSORS = nameSet(
  'ISImprovedSensors',
  'IS BA Improved Sensors',
  'ISBAImprovedSensors',
  'CLImprovedSensors',
  'Clan BA Improved Sensors',
  'CLBAImprovedSensors',
);
// Other F_BAP: Sensor.java:96-97; MiscType.java:10941-10980.
const ACTIVE_PROBES = nameSet(
  'ISBALightActiveProbe',
  'ISBAActiveProbe',
  'IS BA Light Active Probe',
  'CLBALightActiveProbe',
  'CLBAActiveProbe',
  'Clan BA Light Active Probe',
);
// F_ANGEL_ECM: MiscType.java:11002-11044.
const ANGEL_ECM = nameSet(
  'BAISAngelECMSuite',
  'BA IS Angel ECM Suite',
  'BAISAngelECM',
  'ISBAAngelECM',
  'BACLAngelECMSuite',
  'BA CL Angel ECM Suite',
  'BACLAngelECM',
  'CLBAAngelECM',
);
// F_ECM: MiscType.java:11117-11163; BattleArmor.java:264.
const ECM = nameSet(
  'IS BA ECM',
  'ECM Suite (Light)',
  'ISBAECM',
  'ISSingle-Hex ECM',
  'CL BA ECM',
  'CLBAECM',
  'CLSingle-Hex ECM',
  ...ANGEL_ECM,
);
// F_AMS: ISBAAPDS.java:57-64.
const AMS = nameSet('ISBAAPDS');
// BA rocket launchers are one-shot missiles with linked ammo
// (ISBARL1-5.java; RLWeapon.java:55-69; MissileWeapon.java:69).
const ROCKET_LAUNCHERS = nameSet(
  ...[1, 2, 3, 4, 5].flatMap((n) => [
    `ISBARL${n}`,
    `BARL${n}`,
    `BA RL ${n}`,
    `ISBARocketLauncher${n}`,
    `IS BA RLauncher-${n}`,
  ]),
);
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
        (hasAmmo ||
          /(?:OS|\(OS\))$/i.test(nativeParts(m)[0]) ||
          ROCKET_LAUNCHERS.has(nativeParts(m)[0].toLowerCase())),
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
  defensiveEquipmentBV: number;
  offensiveEquipmentBV: number;
} {
  const weapons: BAWeaponBVMount[] = [];
  const ammo: BAAmmoBVMount[] = [];
  const unresolvedEquipment: string[] = [];
  // BattleArmorBVCalculator.java:285-304: one point each for improved
  // sensors and an active probe; only the first ECM counts (Angel 2).
  const names = equipment.map((m) => nativeParts(m)[0].toLowerCase());
  const firstECM = names.find((name) => ECM.has(name));
  let defensiveEquipmentBV =
    (names.some((name) => IMPROVED_SENSORS.has(name)) ? 1 : 0) +
    (names.some((name) => ACTIVE_PROBES.has(name)) ? 1 : 0) +
    (firstECM === undefined ? 0 : ANGEL_ECM.has(firstECM) ? 2 : 1);
  let offensiveEquipmentBV = 0;
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
    const native = id.toLowerCase();
    if (AMS.has(native)) {
      // BattleArmorBVCalculator.java:310-320; AMS is never offense
      // (BVCalculator.java:943). Squad mounts count whole, others per trooper.
      const bv = resolveEquipmentBV(id).battleValue;
      defensiveEquipmentBV += /^Trooper \d+$/i.test(mount.unitLocation ?? '')
        ? bv / Math.max(1, squadSize)
        : bv;
      continue;
    }
    if (
      IMPROVED_SENSORS.has(native) ||
      ACTIVE_PROBES.has(native) ||
      ECM.has(native)
    )
      continue;
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
    const personal = /^Trooper \d+$/i.test(mount.unitLocation ?? '');
    if (
      !claw &&
      !['Ballistic', 'Energy', 'Missile', 'Physical'].includes(entry.category)
    ) {
      // Valued equipment counts only for the trooper carrying it
      // (BattleArmorBVCalculator.java:223-226; BVCalculator.java:978-1043).
      if (personal && entry.battleValue > 0)
        offensiveEquipmentBV += entry.battleValue / Math.max(1, squadSize);
      continue;
    }
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
    defensiveEquipmentBV,
    offensiveEquipmentBV,
  };
}
