import {
  sumCappedAmmoBV,
  resolveNativeAmmoBin,
  largeAerospaceAmmoBVMultiplier,
} from './battleValueAmmo';
import { getCapitalEquipmentBVFacts } from './equipmentBV/catalogLoader';
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

type DefensiveKind = 'equipment' | 'ams' | 'amsAmmo' | 'screen' | 'screenAmmo';

/** Represented Java defensive identities; unresolved equipment stays unresolved. */
export function getDefensiveEquipmentKind(
  id: string,
): DefensiveKind | undefined {
  const entry = getEquipmentEntry(id);
  if (!entry) return undefined;
  const capital = getCapitalEquipmentBVFacts(entry.id);
  if (capital?.ammoType === 'SCREEN_LAUNCHER')
    return capital.isScreen ? 'screen' : 'screenAmmo';
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
  largeAerospace = false,
): number {
  let equipmentBV = 0;
  let amsBV = 0;
  let amsAmmoBV = 0;
  let screenBV = 0;
  let screenAmmoBV = 0;
  for (const item of equipment) {
    const kind = getDefensiveEquipmentKind(item.id);
    if (kind === 'amsAmmo' || kind === 'screenAmmo') {
      const bin = largeAerospace ? resolveNativeAmmoBin(item.id) : undefined;
      const multiplier = bin
        ? largeAerospaceAmmoBVMultiplier(
            bin.shots,
            getEquipmentEntry(bin.ammoId)?.shotsPerTon ?? 0,
          )
        : 1;
      const ammoBV =
        (item.bvOverride ?? resolveAmmoBV(item.id).battleValue) * multiplier;
      if (kind === 'screenAmmo') screenAmmoBV += ammoBV;
      else amsAmmoBV += ammoBV;
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
      if (kind === 'screen') screenBV += bv;
    }
  }
  return (
    equipmentBV +
    sumCappedAmmoBV({ ams: amsAmmoBV, screen: screenAmmoBV }, (key) =>
      key === 'ams' ? amsBV : screenBV,
    )
  );
}
/** Legacy raw-critical-name guard; Mech mount collection has a separate contract. */
export function isMechDefensiveEquipment(id: string): boolean {
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

/** Audited LargeAero misc exclusions; BVCalculator.java:955-963 (48fcb2f64). */
export function isNonOffensiveLargeAerospaceMisc(
  id: string,
  size?: number,
): boolean {
  if (size !== undefined)
    return (
      Number.isFinite(size) &&
      size >= 0 &&
      [
        'mash-equipment',
        'communications-equipment',
        'autotacticalanalysiscomputer',
        'directtacticalanalysissystem',
        'isdronecarriercontrolsystem',
      ].includes(id)
    );
  return [
    'nc3',
    'mobilehpg',
    'groundmobilehpg',
    'smallnavalcommscannersuite',
    'largenavalcommscannersuite',
    'navaltugadaptor',
    'islookdownradar',
    'ishighresimager',
    'isinfraredimager',
    'cargo-container-10-tons',
    'caspardronecontrolsystem',
    'improvedcaspardronecontrolsystem',
    'caspariidronecontrolsystem',
    'improvedcaspariidronecontrolsystem',
    'sdsselfdestructsystem',
  ].includes(id);
}
