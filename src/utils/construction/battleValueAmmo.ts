import { normalizeEquipmentId } from './equipmentBVResolver';

const AMMO_WEAPON_TYPE_ALIASES: Record<string, string[]> = {
  // Native type/rack pools: BVCalculator.java:1198-1238 (48fcb2f64).
  arrowivammo: ['arrow-iv-launcher'],
  gauss: ['gauss-rifle'],
  'light-gauss': ['light-gauss-rifle'],
  'silver-bullet-gauss': ['sbgr'],
  rotaryac2: ['rac-2'],
  rotaryac5: ['rac-5'],
  'protomech-ac-2': ['protomechac2'],
  'protomech-ac-4': ['protomechac4'],
  'protomech-ac-8': ['protomechac8'],
  snipercannonammo: ['sniper-cannon'],
  thumpercannonammo: ['thumper-cannon'],
  'lb-2-x-cluster': ['lb-2-x-ac'],
  'lb-5-x-cluster': ['lb-5-x-ac'],
  'lb-10-x-cluster': ['lb-10-x-ac'],
  'lb-20-x-cluster': ['lb-20-x-ac'],
  'arrow-iv-launcher': [
    'isarrowivsystem',
    'isarrowiv',
    'clarrowiv',
    'arrow-iv',
  ],
  'arrow-iv': [
    'isarrowivsystem',
    'isarrowiv',
    'clarrowiv',
    'arrow-iv-launcher',
  ],
  'long-tom': ['long-tom-cannon'],
  'long-tom-cannon': ['long-tom'],
  'mech-mortar-1': ['mortar-1', 'mortar'],
  'mech-mortar-2': ['mortar-2', 'mortar'],
  'mech-mortar-4': ['mortar-4', 'mortar'],
  'mech-mortar-8': ['mortar-8', 'mortar'],
  'mortar-1': ['mech-mortar-1', 'mortar'],
  'mortar-2': ['mech-mortar-2', 'mortar'],
  'mortar-4': ['mech-mortar-4', 'mortar'],
  'mortar-8': ['mech-mortar-8', 'mortar'],
  mortar: [
    'mech-mortar-1',
    'mech-mortar-2',
    'mech-mortar-4',
    'mech-mortar-8',
    'mortar-1',
    'mortar-2',
    'mortar-4',
    'mortar-8',
  ],
  sniper: ['sniper-cannon', 'issniperartcannon'],
  'sniper-cannon': ['sniper'],
  thumper: ['thumper-cannon'],
  'thumper-cannon': ['thumper'],
  'medium-chemical-laser': [
    'medium-chem-laser',
    'clmediumchemlaser',
    'clan-medium-chemical-laser',
  ],
  'medium-chem-laser': [
    'medium-chemical-laser',
    'clmediumchemlaser',
    'clan-medium-chemical-laser',
  ],
  'clan-medium-chemical-laser': [
    'medium-chemical-laser',
    'medium-chem-laser',
    'clmediumchemlaser',
  ],
  'lb-5-x': ['lb-5-x-ac'],
  'lb-2-x': ['lb-2-x-ac'],
  lrtorpedo: ['lrm-15', 'lrm-10', 'lrm-5', 'lrm-20'],
  srtorpedo: ['srm-6', 'srm-4', 'srm-2'],
  'ac-10-primitive': ['ac-10'],
  'ac-5-primitive': ['ac-5'],
  'ac-20-primitive': ['ac-20'],
  impammosrm6: ['improved-srm-6'],
  clanimprovedlrm15: ['improved-lrm-15'],
  clanimprovedlrm20: ['improved-lrm-20'],
  clanimprovedlrm10: ['improved-lrm-10'],
  clanimprovedlrm5: ['improved-lrm-5'],
  isarrowivsystem: ['arrow-iv-launcher', 'arrow-iv'],
  'improved-gauss-rifle': ['climpgauss'],
  climpgauss: ['improved-gauss-rifle'],
  magshot: ['magshotgr'],
  magshotgr: ['magshot'],
  'mech-taser': ['battlemech-taser', 'taser'],
  'battlemech-taser': ['mech-taser', 'taser'],
  'heavy-rifle': ['rifle-cannon', 'isheavyrifle'],
  'rifle-cannon': ['heavy-rifle', 'isheavyrifle'],
  'medium-rifle': ['rifle-cannon', 'ismediumrifle'],
  'light-rifle': ['islightrifle'],
  taser: ['mech-taser', 'battlemech-taser'],
  'improved-narc': ['improvednarc', 'inarc', 'isimprovednarc'],
  improvednarc: ['improved-narc', 'inarc'],
  'narc-beacon': ['narcbeacon', 'narc', 'isnarcbeacon'],
  narcbeacon: ['narc-beacon', 'narc'],
  narc: ['narc-beacon', 'narcbeacon'],
  clmediumchemlaser: ['medium-chemical-laser', 'medium-chem-laser'],
};

export function findMatchingWeaponBV(
  ammoType: string,
  weaponBVByType: Record<string, number>,
): number {
  if (weaponBVByType[ammoType] !== undefined) return weaponBVByType[ammoType];
  const aliases =
    AMMO_WEAPON_TYPE_ALIASES[ammoType] ??
    AMMO_WEAPON_TYPE_ALIASES[ammoType.replace(/^clan-/, '')];
  if (aliases) {
    for (const alias of aliases) {
      if (weaponBVByType[alias] !== undefined) return weaponBVByType[alias];
    }
  }
  // MegaMek ties ammo to weapons by ammoType:rackSize, TECH-BASE AGNOSTIC
  // (IS and Clan LRMs share the same AmmoType constant). Ammo keys arrive
  // tech-stripped from the crit scan ('lrm-15') while weapon ids normalize
  // tech-preserving ('clan-lrm-15'), so without this fallback every Clan
  // bin spelled that way capped to zero (Blood Kite / Bowman -5%+ BV).
  const stripTechBase = (key: string): string => key.replace(/^clan-/, '');
  // Keep the original-family fallback first, then apply the same matching
  // to existing aliases (e.g. lb-2-x -> clan-lb-2-x-ac). Return one candidate's
  // sum so overlapping aliases cannot count a weapon more than once.
  for (const candidate of [ammoType, ...(aliases ?? [])]) {
    const techStrippedTarget = stripTechBase(candidate);
    let techStrippedSum = 0;
    for (const [weaponKey, weaponBV] of Object.entries(weaponBVByType)) {
      if (stripTechBase(weaponKey) === techStrippedTarget) {
        techStrippedSum += weaponBV;
      }
    }
    if (techStrippedSum > 0) return techStrippedSum;
  }

  const stripped = ammoType.replace(/-\d+$/, '');
  if (stripped !== ammoType) {
    const size = ammoType.slice(stripped.length + 1);
    const torpedoAliases: Record<string, string> = {
      lrtorpedo: 'lrm-',
      srtorpedo: 'srm-',
    };
    const base = torpedoAliases[stripped];
    if (base && weaponBVByType[base + size] !== undefined) {
      return weaponBVByType[base + size];
    }
  }
  return 0;
}

/** Accumulate a caller-normalized weapon or ammunition key in encounter order. */
export function addBVToAmmoCapGroup(
  groups: Record<string, number>,
  key: string,
  bv: number,
): void {
  groups[key] = (groups[key] ?? 0) + bv;
}

/** An undefined cap omits a group; an explicit zero remains a real cap. */
export function sumCappedAmmoBV(
  ammoBVByType: Readonly<Record<string, number>>,
  capForType: (type: string) => number | undefined,
): number {
  let total = 0;
  for (const type of Object.keys(ammoBVByType)) {
    const cap = capForType(type);
    if (cap === undefined) continue;
    total += Math.min(ammoBVByType[type], cap);
  }
  return total;
}

export function calculateAmmoBVWithExcessiveCap(
  weapons: Array<{ id: string; bv: number }>,
  ammo: Array<{ id: string; bv: number; weaponType: string }>,
): number {
  if (!ammo || ammo.length === 0) return 0;

  const weaponBVByType: Record<string, number> = {};
  for (const weapon of weapons) {
    const weaponType = normalizeEquipmentId(weapon.id);
    addBVToAmmoCapGroup(weaponBVByType, weaponType, weapon.bv);
  }

  const ammoBVByType: Record<string, number> = {};
  for (const ammoEntry of ammo) {
    const normalizedType = normalizeEquipmentId(ammoEntry.weaponType);
    addBVToAmmoCapGroup(ammoBVByType, normalizedType, ammoEntry.bv);
  }

  return sumCappedAmmoBV(ammoBVByType, (ammoType) => {
    const matchingWeaponBV = findMatchingWeaponBV(ammoType, weaponBVByType);
    return matchingWeaponBV === 0 ? undefined : matchingWeaponBV;
  });
}
