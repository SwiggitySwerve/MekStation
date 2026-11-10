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

import type {
  BAWeaponBVMount,
  BAAmmoBVMount,
  BANativeWeaponMount,
} from './battleArmorBV';

import {
  addBVToAmmoCapGroup,
  getNativeAmmoBVGroup,
  sumCappedAmmoBV,
} from '../battleValueAmmo';
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
// Pools the Java trace reports as ammo.cap (reporting only; the cap arithmetic
// still sees every pool). assembleAmmo (BVCalculator.java:1189-1243) caps only
// ammo-using weapons that are not one-shot or ammoType NA: BA MGs, flamers and
// the plasma rifle are NA (BAMGWeapon.java:61, BAFlamerWeapon.java:70,
// ISBAPlasmaRifle.java:64) and the Taser is one-shot (ISBATaser.java:84). The
// missile families remain (AmmoType.java F_BATTLEARMOR ammo records); the rare
// BA_MICRO_BOMB/MINE/LRM_TORPEDO_COMBO pools have no corpus weapon to verify.
const BA_CAP_AMMO_TYPES = new Set([
  'BA_TUBE',
  'LRM',
  'MRM',
  'NARC',
  'SRM',
  'SRM_ADVANCED',
]);
const nativeParts = (mount: IBattleArmorMountedEquipment) =>
  mount.equipmentId.split(':');
/** Native `Trooper N` mounts belong to that trooper alone. */
const trooperOfMount = (mount: IBattleArmorMountedEquipment) => {
  const index = /^Trooper (\d+)$/i.exec(mount.unitLocation ?? '')?.[1];
  return index === undefined ? undefined : Number(index);
};
const isPersonalMount = (mount: IBattleArmorMountedEquipment) =>
  trooperOfMount(mount) !== undefined;

/**
 * The one owner of BA weapon-mount classification. The averaged trooper model
 * and the native per-trooper facts both read these flags; `antiMek` is the
 * per-mount half of the pinned anti-Mek filter (BattleArmorBVCalculator.java:
 * 133-160): a claw, or a non-missile, non-infantry weapon that is not
 * body-mounted. The trooper's anti-Mek eligibility is applied by the caller.
 */
function classifyBAWeaponMount(
  mount: IBattleArmorMountedEquipment,
  id: string,
  qualifiers: readonly string[],
  category: string,
) {
  const claw = /battleclaw.*(?:vibro|magnet)/i.test(id);
  const infantry =
    qualifiers.includes('APM') || mount.isAPMount || /^Infantry/i.test(id);
  const trooper = trooperOfMount(mount);
  return {
    claw,
    trooper,
    personal: trooper !== undefined,
    support: qualifiers.includes('SSWM'),
    infantry,
    antiMek:
      claw ||
      (category !== 'Missile' &&
        !infantry &&
        !qualifiers.includes('Body') &&
        mount.location !== BattleArmorLocation.BODY),
  };
}

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
  nativeWeapons: BANativeWeaponMount[];
  ammo: BAAmmoBVMount[];
  unresolvedEquipment: string[];
  hasMagneticClamp: boolean;
  defensiveEquipmentBV: number;
  offensiveEquipmentBV: number;
  ammoAvailableBVByPool: Record<string, number>;
  ammoCapBVByPool: Record<string, number>;
} {
  const weapons: BAWeaponBVMount[] = [];
  const nativeWeapons: BANativeWeaponMount[] = [];
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
  // Per-trooper ammo BV and launcher BV by pool (BVCalculator.java:1189-1243).
  const ammoPools: Record<string, number> = {};
  const weaponPools: Record<string, number> = {};
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
      defensiveEquipmentBV += isPersonalMount(mount)
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
      const share = isPersonalMount(mount) ? 1 / Math.max(1, squadSize) : 1;
      addBVToAmmoCapGroup(
        ammoPools,
        pool,
        ((kg * shots) / 1000) * entry.battleValue * share,
      );
      continue;
    }
    const entry = getEquipmentEntry(id);
    if (!entry) {
      unresolvedEquipment.push(`${id}: catalog identity unresolved`);
      continue;
    }
    const { claw, trooper, personal, support, infantry, antiMek } =
      classifyBAWeaponMount(mount, id, qualifiers, entry.category);
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
    if ((personal || support) && infantry) continue;
    // Launchers cap their ammo pool; one-shots are not in it (BVCalculator.java:1225-1232).
    const pool = baAmmoPool(id);
    if (
      pool &&
      !infantry &&
      !/(?:OS|\(OS\))$/i.test(id) &&
      !ROCKET_LAUNCHERS.has(id.toLowerCase())
    )
      addBVToAmmoCapGroup(weaponPools, pool, entry.battleValue);
    const quantity = personal || support ? 1 / Math.max(1, squadSize) : 1;
    weapons.push({
      id: entry.id,
      quantity,
      antiMekQuantity:
        personal && support ? quantity / Math.max(1, squadSize) : quantity,
      antiMekOnly: claw,
      antiMek,
    });
    // Native facts need a real location; the Java trace skips zero-BV weapons.
    if (mount.unitLocation !== undefined && entry.battleValue > 0)
      nativeWeapons.push({
        id: entry.id,
        location: mount.unitLocation,
        trooper,
        battleValue: entry.battleValue,
        support,
        claw,
        infantry,
        antiMek,
      });
  }
  // BVCalculator.java:1057-1079: ammo without a launcher is dropped and
  // excess ammo is capped at the launchers' BV.
  // One entry per pool, each capped by the shared owner's rule.
  for (const pool of Object.keys(ammoPools)) {
    if (!Object.hasOwn(weaponPools, pool)) continue;
    ammo.push({
      id: pool,
      bvOverride: sumCappedAmmoBV(
        { [pool]: ammoPools[pool] },
        (p) => weaponPools[p],
      ),
    });
  }
  return {
    weapons,
    nativeWeapons,
    ammo,
    unresolvedEquipment,
    hasMagneticClamp: equipment.some((m) => isMagneticClamp(m.equipmentId)),
    defensiveEquipmentBV,
    offensiveEquipmentBV,
    // Pre-cap pools: the Java trace reports ammoMap and weaponsForExcessiveAmmo.
    ammoAvailableBVByPool: { ...ammoPools },
    ammoCapBVByPool: Object.fromEntries(
      Object.entries(weaponPools).filter(([pool]) =>
        BA_CAP_AMMO_TYPES.has(pool.split(':')[0]),
      ),
    ),
  };
}
