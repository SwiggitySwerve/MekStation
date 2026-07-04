import { EngineType } from '../../types/construction/EngineType';
import { calculateOffensiveSpeedFactor } from './battleValueMovement';
import {
  normalizeEquipmentId,
  resolveEquipmentBV,
} from './equipmentBVResolver';

export interface OffensiveBVConfig {
  weapons: Array<{
    id: string;
    name: string;
    heat: number;
    bv: number;
    rear?: boolean;
    hasAES?: boolean;
    artemisType?: 'iv' | 'v';
    isDirectFire?: boolean;
  }>;
  ammo?: Array<{ id: string; bv: number; weaponType: string }>;
  tonnage: number;
  walkMP: number;
  runMP: number;
  jumpMP: number;
  heatDissipation: number;
  hasTargetingComputer?: boolean;
  hasTSM?: boolean;
  hasIndustrialTSM?: boolean;
  aesArms?: number;
  aesLegs?: number;
  isIndustrialMech?: boolean;
  umuMP?: number;
  engineType?: EngineType;
  isXXLEngine?: boolean;
  hasStealthArmor?: boolean;
  hasNullSig?: boolean;
  hasVoidSig?: boolean;
  hasChameleonShield?: boolean;
  coolantPods?: number;
  heatSinkCount?: number;
  hasImprovedJJ?: boolean;
  hasPrototypeIJJ?: boolean;
  jumpHeatMP?: number;
  physicalWeaponBV?: number;
  offensiveEquipmentBV?: number;
  hasMASC?: boolean;
  hasSupercharger?: boolean;
  hasSCM?: boolean;
}

export interface OffensiveBVResult {
  weaponBV: number;
  ammoBV: number;
  weightBonus: number;
  speedFactor: number;
  totalOffensiveBV: number;
  heatEfficiency?: number;
  moveHeat?: number;
  rawWeaponBV?: number;
  halvedWeaponBV?: number;
  weaponCount?: number;
  halvedWeaponCount?: number;
  physicalWeaponBV?: number;
  offensiveEquipmentBV?: number;
}

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

function findMatchingWeaponBV(
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

function applyWeaponBVModifiers(
  weapon: {
    bv: number;
    rear?: boolean;
    hasAES?: boolean;
    artemisType?: 'iv' | 'v';
    isDirectFire?: boolean;
  },
  hasTC: boolean,
): number {
  let modifiedBV = weapon.bv;

  if (weapon.hasAES) {
    modifiedBV *= 1.25;
  }

  if (weapon.rear) {
    modifiedBV *= 0.5;
  }

  if (weapon.artemisType === 'iv') {
    modifiedBV *= 1.2;
  } else if (weapon.artemisType === 'v') {
    modifiedBV *= 1.3;
  }

  if (hasTC && weapon.isDirectFire) {
    modifiedBV *= 1.25;
  }

  return modifiedBV;
}

function heatSorter(
  a: { bv: number; heat: number },
  b: { bv: number; heat: number },
): number {
  if (a.heat === 0 && b.heat > 0) return -1;
  if (a.heat > 0 && b.heat === 0) return 1;
  if (a.heat === 0 && b.heat === 0) return 0;

  if (a.bv === b.bv) {
    return a.heat - b.heat;
  }
  return b.bv - a.bv;
}

function usesXXLHeatProfile(config: OffensiveBVConfig): boolean {
  return config.isXXLEngine || config.engineType === EngineType.XXL;
}

function calculateRunningHeat(config: OffensiveBVConfig): number {
  if (config.engineType === EngineType.ICE) return 0;
  if (config.engineType === EngineType.FUEL_CELL) return 0;
  return usesXXLHeatProfile(config) ? 6 : 2;
}

function calculateJumpHeat(config: OffensiveBVConfig): number {
  const jumpHeatMP = config.jumpHeatMP ?? config.jumpMP;
  if (jumpHeatMP <= 0) return 0;

  const hasXXLHeatProfile = usesXXLHeatProfile(config);
  if (config.hasPrototypeIJJ) {
    const doubledMP = jumpHeatMP * 2;
    if (hasXXLHeatProfile) return Math.max(6, doubledMP * 2);
    return Math.max(6, Math.max(3, doubledMP));
  }

  const effectiveJumpMP = config.hasImprovedJJ
    ? Math.ceil(jumpHeatMP / 2)
    : jumpHeatMP;
  if (hasXXLHeatProfile) return Math.max(6, effectiveJumpMP * 2);
  return Math.max(3, effectiveJumpMP);
}

function calculateCoolantPodHeatBonus(config: OffensiveBVConfig): number {
  const coolantPods = config.coolantPods ?? 0;
  const heatSinkCount = config.heatSinkCount ?? 0;
  return coolantPods > 0 && heatSinkCount > 0
    ? Math.ceil((heatSinkCount * coolantPods) / 5)
    : 0;
}

function calculateSignatureHeatPenalty(config: OffensiveBVConfig): number {
  return (
    (config.hasStealthArmor ? 10 : 0) +
    (config.hasNullSig ? 10 : 0) +
    (config.hasVoidSig ? 10 : 0) +
    (config.hasChameleonShield ? 6 : 0)
  );
}

function calculateHeatEfficiency(
  config: OffensiveBVConfig,
  moveHeat: number,
): number {
  return (
    6 +
    config.heatDissipation -
    moveHeat +
    calculateCoolantPodHeatBonus(config) -
    calculateSignatureHeatPenalty(config)
  );
}

function calculateHeatTrackedWeaponTotals(
  sortedWeapons: Array<{ bv: number; heat: number }>,
  heatEfficiency: number,
) {
  let heatExceeded = heatEfficiency <= 0;
  let heatSum = 0;
  let weaponBV = 0;
  let rawWeaponBV = 0;
  let halvedWeaponBV = 0;
  let halvedWeaponCount = 0;

  for (const weapon of sortedWeapons) {
    heatSum += weapon.heat;
    rawWeaponBV += weapon.bv;

    const adjustedBV = heatExceeded ? weapon.bv * 0.5 : weapon.bv;
    weaponBV += adjustedBV;

    if (heatExceeded) {
      halvedWeaponBV += adjustedBV;
      halvedWeaponCount++;
    }

    heatExceeded = heatExceeded || heatSum >= heatEfficiency;
  }

  return {
    weaponBV,
    rawWeaponBV,
    halvedWeaponBV,
    halvedWeaponCount,
  };
}

function calculateWeightBonus(config: OffensiveBVConfig): number {
  const aesMultiplier =
    1.0 + (config.aesArms ?? 0) * 0.1 + (config.aesLegs ?? 0) * 0.1;
  const adjustedWeight = config.tonnage * aesMultiplier;
  const tsmMultiplier = config.hasTSM
    ? 1.5
    : config.hasIndustrialTSM
      ? 1.15
      : 1.0;
  return adjustedWeight * tsmMultiplier;
}

export function calculateOffensiveBVWithHeatTracking(
  config: OffensiveBVConfig,
): OffensiveBVResult {
  const hasTC = config.hasTargetingComputer ?? false;

  const weaponsWithModifiers = config.weapons.map((weapon) => ({
    ...weapon,
    bv: applyWeaponBVModifiers(weapon, hasTC),
  }));

  const sortedWeapons = [...weaponsWithModifiers].sort(heatSorter);
  const moveHeat = config.hasSCM
    ? 0
    : Math.max(calculateRunningHeat(config), calculateJumpHeat(config));
  const heatEfficiency = calculateHeatEfficiency(config, moveHeat);
  const heatTrackedWeapons = calculateHeatTrackedWeaponTotals(
    sortedWeapons,
    heatEfficiency,
  );

  const ammoBV = calculateAmmoBVWithExcessiveCap(
    config.weapons,
    config.ammo ?? [],
  );
  const weightBonus = calculateWeightBonus(config);

  const speedFactor = calculateOffensiveSpeedFactor(
    config.runMP,
    config.jumpMP,
    config.umuMP ?? 0,
  );
  const physicalWeaponBV = config.physicalWeaponBV ?? 0;
  const offensiveEquipmentBV = config.offensiveEquipmentBV ?? 0;
  const baseOffensive =
    heatTrackedWeapons.weaponBV +
    ammoBV +
    physicalWeaponBV +
    weightBonus +
    offensiveEquipmentBV;

  const typeModifier = config.isIndustrialMech ? 0.9 : 1.0;
  const totalOffensiveBV = baseOffensive * speedFactor * typeModifier;

  return {
    weaponBV: heatTrackedWeapons.weaponBV,
    ammoBV,
    weightBonus,
    speedFactor,
    totalOffensiveBV,
    heatEfficiency,
    moveHeat,
    rawWeaponBV: heatTrackedWeapons.rawWeaponBV,
    halvedWeaponBV: heatTrackedWeapons.halvedWeaponBV,
    weaponCount: sortedWeapons.length,
    halvedWeaponCount: heatTrackedWeapons.halvedWeaponCount,
    physicalWeaponBV,
    offensiveEquipmentBV,
  };
}

export function getWeaponBV(weaponId: string): number {
  return resolveEquipmentBV(weaponId).battleValue;
}

export function getWeaponHeat(weaponId: string): number {
  return resolveEquipmentBV(weaponId).heat;
}

export function calculateOffensiveBV(
  weapons: Array<{ id: string; rear?: boolean }>,
  hasTargetingComputer: boolean = false,
): number {
  let total = 0;

  for (const weapon of weapons) {
    const weaponId = weapon.id.toLowerCase();
    let bv = resolveEquipmentBV(weapon.id).battleValue;

    if (weapon.rear) {
      bv *= 0.5;
    }

    if (
      hasTargetingComputer &&
      !weaponId.includes('lrm') &&
      !weaponId.includes('srm') &&
      !weaponId.includes('mrm')
    ) {
      bv *= 1.25;
    }

    total += bv;
  }

  return total;
}
