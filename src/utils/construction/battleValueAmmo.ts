import { normalizeEquipmentId } from './equipmentBVResolver';

const AMMO_WEAPON_TYPE_ALIASES: Record<string, string[]> = {
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
  const aliases = AMMO_WEAPON_TYPE_ALIASES[ammoType];
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
  const techStrippedTarget = stripTechBase(ammoType);
  let techStrippedSum = 0;
  for (const [weaponKey, weaponBV] of Object.entries(weaponBVByType)) {
    if (stripTechBase(weaponKey) === techStrippedTarget) {
      techStrippedSum += weaponBV;
    }
  }
  if (techStrippedSum > 0) return techStrippedSum;

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

export function calculateAmmoBVWithExcessiveCap(
  weapons: Array<{ id: string; bv: number }>,
  ammo: Array<{ id: string; bv: number; weaponType: string }>,
): number {
  if (!ammo || ammo.length === 0) return 0;

  const weaponBVByType: Record<string, number> = {};
  for (const weapon of weapons) {
    const weaponType = normalizeEquipmentId(weapon.id);
    weaponBVByType[weaponType] = (weaponBVByType[weaponType] ?? 0) + weapon.bv;
  }

  const ammoBVByType: Record<string, number> = {};
  for (const ammoEntry of ammo) {
    const normalizedType = normalizeEquipmentId(ammoEntry.weaponType);
    ammoBVByType[normalizedType] =
      (ammoBVByType[normalizedType] ?? 0) + ammoEntry.bv;
  }

  let totalAmmoBV = 0;
  for (const ammoType of Object.keys(ammoBVByType)) {
    const matchingWeaponBV = findMatchingWeaponBV(ammoType, weaponBVByType);
    if (matchingWeaponBV === 0) continue;
    totalAmmoBV += Math.min(ammoBVByType[ammoType], matchingWeaponBV);
  }

  return totalAmmoBV;
}
