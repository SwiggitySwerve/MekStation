import { sumCappedAmmoBV } from './battleValueAmmo';
import {
  getEquipmentEntry,
  resolveAmmoBV,
  resolveEquipmentBV,
} from './equipmentBVResolver';

// Canonical catalog identities corresponding to MiscType flags in pinned
// BVCalculator.countsAsDefensiveEquipment (518-546). No substring matching:
// a coolant pod or Blue Shield is not defensive equipment in that stage.
const DEFENSIVE_SENSOR_CATEGORIES = new Set(['ECM', 'Active Probe']);
const DEFENSIVE_MISC_IDS: ReadonlySet<string> = new Set([
  'antipersonnelpod',
  'mass',
  'bridge-layer-heavy',
  'bridge-layer-medium',
  'bridge-layer-light',
  'bulldozer',
  'chaffpod',
  'spikes',
  'minesweeper',
  'harjel-repair-systems-harjel-ii',
  'harjel-repair-systems-harjel-iii',
  'smallshield',
  'mediumshield',
  'largeshield',
  'risc-viral-jammer-decoy',
  'risc-viral-jammer-homing',
  'm-pod',
  'b-pod',
  'isbpod-registry',
]);

type DefensiveKind = 'equipment' | 'ams' | 'amsAmmo';

/** Represented Java defensive identities; unresolved equipment stays unresolved. */
export function getDefensiveEquipmentKind(
  id: string,
): DefensiveKind | undefined {
  const entry = getEquipmentEntry(id);
  if (!entry) return undefined;
  // MegaMek 48fcb2f64: AmmoType.java:12242-12254; BVCalculator.java:570-572.
  if (['ams-ammo', 'clan-ams-ammo', 'isapds-ammo-registry'].includes(entry.id))
    return 'amsAmmo';
  if (entry.id === 'ams' || entry.id === 'clan-ams' || entry.id === 'risc-apds')
    return 'ams';
  if (
    DEFENSIVE_SENSOR_CATEGORIES.has(entry.category) ||
    entry.subType === 'Anti-Missile System' ||
    DEFENSIVE_MISC_IDS.has(entry.id)
  ) {
    return 'equipment';
  }
  return undefined;
}

/** Already-partitioned mounts: BVCalculator.java:549-646; cap AMS/APDS bins. */
export function calculateMountedDefensiveEquipmentBV(
  equipment: readonly { id: string; location?: string; bvOverride?: number }[],
  rotorMast = false,
): number {
  let equipmentBV = 0;
  let amsBV = 0;
  let amsAmmoBV = 0;
  for (const item of equipment) {
    const kind = getDefensiveEquipmentKind(item.id);
    if (kind === 'amsAmmo') {
      amsAmmoBV += item.bvOverride ?? resolveAmmoBV(item.id).battleValue;
    } else {
      const bonus =
        rotorMast &&
        item.location === 'Rotor' &&
        DEFENSIVE_SENSOR_CATEGORIES.has(
          getEquipmentEntry(item.id)?.category ?? '',
        )
          ? 10
          : 0;
      const bv =
        item.bvOverride ?? resolveEquipmentBV(item.id).battleValue + bonus;
      equipmentBV += bv;
      if (kind === 'ams') amsBV += bv;
    }
  }
  return equipmentBV + sumCappedAmmoBV({ ams: amsAmmoBV }, () => amsBV);
}
/** Legacy raw-critical-name guard; Mech mount collection has a separate contract. */
export function isMechDefensiveEquipment(id: string): boolean {
  if (getDefensiveEquipmentKind(id) !== undefined) return true;
  const lo = id.toLowerCase();
  return (
    /anti-missile|antimissile|ams|ecm|guardian|angel|bap|beagle|probe|bloodhound|null-signature|apds|advanced-point-defense|point-defense-system|chaff-pod|chaffpod/.test(
      lo,
    ) ||
    (lo.includes('shield') && !lo.includes('blue-shield'))
  );
}

/** Raw weapon candidates retain the legacy unintegrated capacitor contract. */
export function getOffensiveBVRole(
  id: string,
): 'weapon' | 'miscWeapon' | 'equipment' {
  const entry = getEquipmentEntry(id);
  if (
    !entry ||
    // Sniper.java:52-76; BVCalculator.java:936-952 (48fcb2f64): WeaponType.
    ['Energy', 'Ballistic', 'Missile', 'TAG', 'Artillery'].includes(
      entry.category,
    )
  )
    return 'weapon';
  return /vibroblade|vibroclaw|magnetclaw/.test(entry.id) ||
    entry.id === 'ppc-capacitor'
    ? 'miscWeapon'
    : 'equipment';
}
export function hasBVDroneOS(ids: readonly string[] = []): boolean {
  return ids.some((id) => getEquipmentEntry(id)?.id === 'droneoperatingsystem');
}
