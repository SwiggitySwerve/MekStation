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

export function calculateOffensiveBVWithHeatTracking(
  config: OffensiveBVConfig,
): OffensiveBVResult {
  const hasTC = config.hasTargetingComputer ?? false;

  const weaponsWithModifiers = config.weapons.map((weapon) => ({
    ...weapon,
    bv: applyWeaponBVModifiers(weapon, hasTC),
  }));

  const sortedWeapons = [...weaponsWithModifiers].sort(heatSorter);

  const engineType = config.engineType;
  const runningHeat =
    engineType === EngineType.ICE || engineType === EngineType.FUEL_CELL
      ? 0
      : config.isXXLEngine || engineType === EngineType.XXL
        ? 6
        : 2;
  let jumpHeat = 0;
  const jumpHeatMP = config.jumpHeatMP ?? config.jumpMP;
  if (jumpHeatMP > 0) {
    if (config.hasPrototypeIJJ) {
      const doubledMP = jumpHeatMP * 2;
      jumpHeat =
        config.isXXLEngine || engineType === EngineType.XXL
          ? Math.max(6, doubledMP * 2)
          : Math.max(6, Math.max(3, doubledMP));
    } else if (config.hasImprovedJJ) {
      const effectiveJumpMP = Math.ceil(jumpHeatMP / 2);
      jumpHeat =
        config.isXXLEngine || engineType === EngineType.XXL
          ? Math.max(6, effectiveJumpMP * 2)
          : Math.max(3, effectiveJumpMP);
    } else {
      jumpHeat =
        config.isXXLEngine || engineType === EngineType.XXL
          ? Math.max(6, jumpHeatMP * 2)
          : Math.max(3, jumpHeatMP);
    }
  }

  const moveHeat = config.hasSCM ? 0 : Math.max(runningHeat, jumpHeat);
  let heatEfficiency = 6 + config.heatDissipation - moveHeat;

  const coolantPods = config.coolantPods ?? 0;
  const heatSinkCount = config.heatSinkCount ?? 0;
  if (coolantPods > 0 && heatSinkCount > 0) {
    heatEfficiency += Math.ceil((heatSinkCount * coolantPods) / 5);
  }

  if (config.hasStealthArmor) heatEfficiency -= 10;
  if (config.hasNullSig) heatEfficiency -= 10;
  if (config.hasVoidSig) heatEfficiency -= 10;
  if (config.hasChameleonShield) heatEfficiency -= 6;

  let heatExceeded = heatEfficiency <= 0;
  let heatSum = 0;
  let weaponBV = 0;
  let rawWeaponBVTotal = 0;
  let halvedWeaponBVTotal = 0;
  let halvedWeaponCount = 0;

  for (const weapon of sortedWeapons) {
    heatSum += weapon.heat;
    let adjustedBV = weapon.bv;
    rawWeaponBVTotal += weapon.bv;

    if (heatExceeded) {
      adjustedBV *= 0.5;
      halvedWeaponBVTotal += weapon.bv * 0.5;
      halvedWeaponCount++;
    }

    weaponBV += adjustedBV;

    if (heatSum >= heatEfficiency) {
      heatExceeded = true;
    }
  }

  const ammoBV = config.ammo
    ? calculateAmmoBVWithExcessiveCap(config.weapons, config.ammo)
    : 0;

  const aesMultiplier =
    1.0 + (config.aesArms ?? 0) * 0.1 + (config.aesLegs ?? 0) * 0.1;
  const adjustedWeight = config.tonnage * aesMultiplier;
  let weightBonus: number;
  if (config.hasTSM) {
    weightBonus = adjustedWeight * 1.5;
  } else if (config.hasIndustrialTSM) {
    weightBonus = adjustedWeight * 1.15;
  } else {
    weightBonus = adjustedWeight;
  }

  const speedFactor = calculateOffensiveSpeedFactor(
    config.runMP,
    config.jumpMP,
    config.umuMP ?? 0,
  );
  const physicalWeaponBV = config.physicalWeaponBV ?? 0;
  const offensiveEquipmentBV = config.offensiveEquipmentBV ?? 0;
  const baseOffensive =
    weaponBV + ammoBV + physicalWeaponBV + weightBonus + offensiveEquipmentBV;

  const typeModifier = config.isIndustrialMech ? 0.9 : 1.0;
  const totalOffensiveBV = baseOffensive * speedFactor * typeModifier;

  return {
    weaponBV,
    ammoBV,
    weightBonus,
    speedFactor,
    totalOffensiveBV,
    heatEfficiency,
    moveHeat,
    rawWeaponBV: rawWeaponBVTotal,
    halvedWeaponBV: halvedWeaponBVTotal,
    weaponCount: sortedWeapons.length,
    halvedWeaponCount,
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
