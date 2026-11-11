import { EngineType } from '../../types/construction/EngineType';
import {
  getArmorBVMultiplier,
  getEngineBVMultiplier,
  getGyroBVMultiplier,
  getStructureBVMultiplier,
} from '../../types/validation/BattleValue';
import { AMS_WEAPON_IDS } from '../equipment/equipmentConstants';
import { calculateTMM } from './battleValueMovement';
import { getEquipmentEntry, resolveEquipmentBV } from './equipmentBVResolver';

/** BVCalculator.java:604-610 (48fcb2f64): classify the resolved mount, not its label. */
export function getAmsBVWeaponKind(id: string): 'ams' | 'apds' | undefined {
  const entry = getEquipmentEntry(id);
  if (!entry) return undefined;
  if (entry.special?.includes('point-defense')) return 'apds';
  return AMS_WEAPON_IDS.includes(entry.id) ? 'ams' : undefined;
}

export interface DefensiveBVConfig {
  totalArmorPoints: number;
  totalStructurePoints: number;
  tonnage: number;
  runMP: number;
  jumpMP: number;
  armorType?: string;
  /** Patchwork locations including rear/modular/cockpit points; BVCalculator.java:359-420. */
  armorSections?: readonly {
    points: number;
    multiplier: number;
    bar: number;
  }[];
  structureType?: string;
  gyroType?: string;
  engineType?: EngineType;
  bar?: number;
  engineMultiplier?: number;
  defensiveEquipmentBV?: number;
  explosivePenalties?: number;
  defensiveEquipment?: string[];
  hasStealthArmor?: boolean;
  hasChameleonLPS?: boolean;
  hasNullSig?: boolean;
  hasVoidSig?: boolean;
  umuMP?: number;
  hasBlueShield?: boolean;
}

export interface DefensiveBVResult {
  armorBV: number;
  structureBV: number;
  gyroBV: number;
  defensiveFactor: number;
  totalDefensiveBV: number;
}

export function calculateDefensiveBV(
  config: DefensiveBVConfig,
): DefensiveBVResult {
  const blueShieldBonus = config.hasBlueShield ? 0.2 : 0;
  const structureMultiplier =
    getStructureBVMultiplier(config.structureType ?? 'standard') +
    blueShieldBonus;
  const gyroMultiplier = getGyroBVMultiplier(config.gyroType ?? 'standard');

  const unitIsSuperheavy = config.tonnage > 100;
  const engineMultiplier =
    config.engineMultiplier !== undefined
      ? config.engineMultiplier
      : config.engineType !== undefined
        ? getEngineBVMultiplier(config.engineType, unitIsSuperheavy)
        : 1.0;

  let resolvedDefensiveEquipmentBV = config.defensiveEquipmentBV ?? 0;
  if (config.defensiveEquipment && config.defensiveEquipment.length > 0) {
    for (const equipmentId of config.defensiveEquipment) {
      const result = resolveEquipmentBV(equipmentId);
      resolvedDefensiveEquipmentBV += result.battleValue;
    }
  }

  const explosivePenalties = config.explosivePenalties ?? 0;

  // BVCalculator.java:429-434,453 (48fcb2f64): armor stays unrounded.
  const armorSections = config.armorSections ?? [
    {
      points: config.totalArmorPoints,
      multiplier: getArmorBVMultiplier(config.armorType ?? 'standard'),
      bar: config.bar ?? 10,
    },
  ];
  const armorBV = armorSections.reduce(
    (sum, section) =>
      sum +
      (section.points *
        2.5 *
        (section.multiplier + blueShieldBonus) *
        section.bar) /
        10,
    0,
  );
  const structureBV =
    config.totalStructurePoints * 1.5 * structureMultiplier * engineMultiplier;
  const gyroBV = config.tonnage * gyroMultiplier;

  const baseDef =
    armorBV +
    structureBV +
    gyroBV +
    resolvedDefensiveEquipmentBV -
    explosivePenalties;

  let maxTMM = calculateTMM(
    config.runMP,
    Math.max(config.jumpMP, config.umuMP ?? 0),
  );

  if (config.hasStealthArmor || config.hasNullSig) {
    maxTMM += 2;
  }
  if (config.hasChameleonLPS) {
    maxTMM += 2;
  }
  if (config.hasVoidSig) {
    if (maxTMM < 3) {
      maxTMM = 3;
    } else if (maxTMM === 3) {
      maxTMM++;
    }
  }

  const defensiveFactor = 1 + maxTMM / 10.0;
  const totalDefensiveBV = baseDef * defensiveFactor;

  return {
    armorBV,
    structureBV,
    gyroBV,
    defensiveFactor,
    totalDefensiveBV,
  };
}

export const MODULAR_ARMOR_BV_ID = 'modulararmor';
/** Undamaged construction mounts. MiscType.java:2524-2543 (48fcb2f64). */
export function getModularArmorBVPoints(count: number): number {
  return count * 10;
}

/** Native MegaMek codes are not local ArmorType enum ordinals. */
export function getNativeArmorBVMultiplier(type: string | number): number {
  return getArmorBVMultiplier(getNativeArmorName(type));
}

export function getNativeArmorName(type: string | number): string {
  const names: Readonly<Record<number, string>> = {
    2: 'reactive',
    3: 'reflective',
    4: 'hardened',
    10: 'commercial',
    16: 'ferro-lamellor',
    23: 'anti-penetrative',
    24: 'heat-dissipating',
    26: 'ballistic-reinforced',
  };
  const name =
    typeof type === 'number'
      ? (names[type] ?? 'standard')
      : type
          .toLowerCase()
          .replace(/_/g, '-')
          .replace(/^anti-penetrative-ablation$/, 'anti-penetrative');
  return name;
}
