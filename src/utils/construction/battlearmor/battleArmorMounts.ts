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

import { getNativeAmmoBVGroup } from '../battleValueAmmo';
import { AMMUNITION_CATALOG_FILES } from '../equipmentBVCatalogData';
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
// Java per-shot mass of BA ammo records (AmmoType.F_BATTLEARMOR).
const KG_PER_SHOT = new Map(
  AMMUNITION_CATALOG_FILES.flatMap((file) => file.items ?? [])
    .filter((item) => typeof item.kgPerShot === 'number')
    .map((item) => [String(item.id), Number(item.kgPerShot)]),
);
/** Java ammoType:rackSize pool of a BA ammo or weapon name, e.g. SRM:2. */
function baAmmoPool(native: string): string | undefined {
  const bare = native
    .replace(/\s*\(OS\)$|OS$/i, '')
    .replace(/^(?:IS|CL)?\s*(?:BA\s*-?\s*)?(?:CL\s*)?(?:Ammo\s*)?/i, '');
  const advanced = /^Advanced\s*SRM\s*-?\s*(\d)/i.exec(bare);
  if (advanced) return `SRM_ADVANCED:${advanced[1]}`;
  if (/^Tube\s*Artillery/i.test(bare)) return 'BA_TUBE:3';
  if (/^Compact\s*Narc/i.test(bare)) return 'NARC:4';
  return getNativeAmmoBVGroup(bare);
}
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
  defensiveEquipmentBV: number;
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
  // Per-trooper ammo BV and launcher BV by pool (BVCalculator.java:1189-1243).
  const ammoPools = new Map<string, number>();
  const weaponPools = new Map<string, number>();
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
      // BattleArmorBVCalculator.java:251-254,329-331: squad ammo counts for
      // every trooper, trooper ammo for its trooper, at kgPerShot per shot.
      const entry = getEquipmentEntry(id);
      const kg = entry && KG_PER_SHOT.get(entry.id);
      const shots = Number(
        /^Shots(\d+)#$/.exec(
          qualifiers.find((q) => /^Shots\d+#$/.test(q)) ?? '',
        )?.[1],
      );
      const pool = baAmmoPool(id);
      if (!entry || kg === undefined || !pool || !Number.isFinite(shots)) {
        unresolvedEquipment.push(
          `${mount.equipmentId}: missing kgPerShot / native ammo pool`,
        );
        continue;
      }
      const share = /^Trooper \d+$/i.test(mount.unitLocation ?? '')
        ? 1 / Math.max(1, squadSize)
        : 1;
      ammoPools.set(
        pool,
        (ammoPools.get(pool) ?? 0) +
          ((kg * shots) / 1000) * entry.battleValue * share,
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
    // Launchers cap their ammo pool; one-shots are not in it (BVCalculator.java:1225-1232).
    const pool = baAmmoPool(id);
    if (pool && !infantry && !/(?:OS|\(OS\))$/i.test(id))
      weaponPools.set(pool, (weaponPools.get(pool) ?? 0) + entry.battleValue);
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
  // BVCalculator.java:1057-1079: ammo without a launcher is dropped and
  // excess ammo is capped at the launchers' BV.
  for (const [pool, bv] of ammoPools) {
    const cap = weaponPools.get(pool);
    if (cap !== undefined)
      ammo.push({ id: pool, bvOverride: Math.min(bv, cap) });
  }
  return {
    weapons,
    ammo,
    unresolvedEquipment,
    hasMagneticClamp: equipment.some((m) => isMagneticClamp(m.equipmentId)),
    defensiveEquipmentBV,
  };
}
