/**
 * Battle Value 2.0 Calculation Utilities
 *
 * Implements TechManual BV 2.0 formulas for BattleMech evaluation.
 *
 * @spec openspec/specs/battle-value-system/spec.md
 */

import {
  EngineType,
  getEngineDefinition,
} from '../../types/construction/EngineType';
import {
  getPilotSkillModifier,
  getArmorBVMultiplier,
  getStructureBVMultiplier,
  getGyroBVMultiplier,
  getEngineBVMultiplier,
} from '../../types/validation/BattleValue';
import {
  resolveEquipmentBV,
  normalizeEquipmentId,
} from './equipmentBVResolver';

// ============================================================================
// EXPLOSIVE EQUIPMENT PENALTY CALCULATION
// ============================================================================

/**
 * Mech location codes used for explosive penalty tracking.
 */
export type MechLocation =
  | 'HD'
  | 'CT'
  | 'LT'
  | 'RT'
  | 'LA'
  | 'RA'
  | 'LL'
  | 'RL';

/**
 * Explosive penalty category determines BV penalty per critical slot.
 *
 * - 'standard': 15 BV per slot (most ammo, generic explosive equipment)
 * - 'gauss': 1 BV per slot (Gauss weapons)
 * - 'hvac': 1 BV total regardless of slots (Hyper-Assault autocannons)
 * - 'reduced': 1 BV per slot (PPC capacitors, improved heavy lasers,
 *   B-Pods, M-Pods, jump jets, coolant pods, RISC laser pulse modules,
 *   emergency coolant systems, TSEMP, Mek Taser)
 */
export type ExplosivePenaltyCategory =
  | 'standard'
  | 'gauss'
  | 'hvac'
  | 'reduced';

/**
 * A single piece of explosive equipment for penalty calculation.
 */
export interface ExplosiveEquipmentEntry {
  /** Location where the equipment is installed */
  location: MechLocation;
  /** Number of critical slots occupied */
  slots: number;
  /** Penalty category determines BV penalty rate */
  penaltyCategory: ExplosivePenaltyCategory;
}

/**
 * Configuration for explosive penalty calculation.
 *
 * @see MekBVCalculator.processExplosiveEquipment() lines 138-278
 * @see MekBVCalculator.hasExplosiveEquipmentPenalty() lines 517-528
 */
export interface ExplosivePenaltyConfig {
  /** All explosive equipment on the mech */
  equipment: ExplosiveEquipmentEntry[];
  /** Locations with CASE (IS) protection */
  caseLocations: MechLocation[];
  /** Locations with CASE II protection (eliminates all penalties) */
  caseIILocations: MechLocation[];
  /** Engine type (affects side torso CASE effectiveness) */
  engineType?: EngineType;
  /** Whether the mech is a quad (affects arm transfer logic) */
  isQuad?: boolean;
}

/**
 * Result of explosive penalty calculation with per-location breakdown.
 */
export interface ExplosivePenaltyResult {
  /** Total explosive penalty to subtract from defensive BV */
  totalPenalty: number;
  /** Penalty breakdown per location */
  locationPenalties: Partial<Record<MechLocation, number>>;
}

/**
 * Get the BV penalty per slot for an explosive penalty category.
 *
 * @param category - The explosive penalty category
 * @returns BV penalty per critical slot
 */
function getPenaltyPerSlot(category: ExplosivePenaltyCategory): number {
  switch (category) {
    case 'standard':
      return 15;
    case 'gauss':
    case 'hvac':
    case 'reduced':
      return 1;
  }
}

/**
 * Determine the number of engine critical slots in each side torso.
 * Used for CASE effectiveness check per MegaMek.
 *
 * @param engineType - The engine type
 * @returns Number of engine crit slots per side torso
 */
function getEngineSideTorsoSlots(engineType?: EngineType): number {
  if (!engineType) return 0;
  const def = getEngineDefinition(engineType);
  return def?.sideTorsoSlots ?? 0;
}

/**
 * Determine whether explosive equipment in a location incurs a BV penalty.
 *
 * Implements MekBVCalculator.hasExplosiveEquipmentPenalty() logic:
 * - CASE II → no penalty (location fully protected)
 * - Arms (non-quad): no penalty if arm has CASE, or if transfer torso has no penalty
 * - Side torsos: no penalty if CASE present AND engine has <3 side torso crit slots
 * - CT, HD, legs: always have penalty (no CASE protection for BV)
 *
 * @see MekBVCalculator.java lines 517-528
 */
function hasExplosiveEquipmentPenalty(
  location: MechLocation,
  config: ExplosivePenaltyConfig,
): boolean {
  // CASE II eliminates all penalties
  if (config.caseIILocations.includes(location)) {
    return false;
  }

  const hasCASE = config.caseLocations.includes(location);
  const sideTorsoSlots = getEngineSideTorsoSlots(config.engineType);

  // Arms on non-quad mechs: CASE in arm protects it; otherwise check transfer torso
  if (!config.isQuad && (location === 'LA' || location === 'RA')) {
    if (hasCASE) {
      return false;
    }
    // Transfer location: LA → LT, RA → RT
    const transferLocation: MechLocation = location === 'LA' ? 'LT' : 'RT';
    return hasExplosiveEquipmentPenalty(transferLocation, config);
  }

  // Side torsos: CASE protects only if engine has fewer than 3 side torso crit slots
  // With IS XL (3 slots) or XXL (3+ slots), CASE doesn't help — explosion still kills mech
  // With Clan XL (2 slots) + built-in CASE, no penalty
  if (location === 'LT' || location === 'RT') {
    return !hasCASE || sideTorsoSlots >= 3;
  }

  // CT, HD, legs: always have penalty (no CASE protection for BV purposes)
  return true;
}

/**
 * Calculate explosive equipment BV penalties per TechManual BV 2.0 rules.
 *
 * For each location, checks all explosive equipment and applies per-slot penalties:
 * - Standard explosive (ammo, etc.): 15 BV per critical slot
 * - Gauss weapons: 1 BV per critical slot
 * - HVAC weapons: 1 BV total (regardless of slot count)
 * - Reduced penalty types: 1 BV per critical slot
 *
 * Protection:
 * - CASE II eliminates ALL penalties in the protected location
 * - CASE (IS) prevents penalties in side torsos (unless engine has 3+ side torso slots)
 * - CASE (IS) in arms always prevents penalties
 * - Clan XL engines (2 side torso slots) allow CASE to work in side torsos
 * - IS XL/XXL engines (3+ side torso slots) override CASE in side torsos
 *
 * @param config - Explosive equipment and CASE protection configuration
 * @returns Total penalty and per-location breakdown
 *
 * @see MekBVCalculator.processExplosiveEquipment() lines 138-278
 * @see MekBVCalculator.hasExplosiveEquipmentPenalty() lines 517-528
 * @see openspec/specs/battle-value-system/spec.md lines 49-61
 */
export function calculateExplosivePenalties(
  config: ExplosivePenaltyConfig,
): ExplosivePenaltyResult {
  const locationPenalties: Partial<Record<MechLocation, number>> = {};
  let totalPenalty = 0;

  for (const item of config.equipment) {
    // Skip if location is protected (no penalty)
    if (!hasExplosiveEquipmentPenalty(item.location, config)) {
      continue;
    }

    const penaltyPerSlot = getPenaltyPerSlot(item.penaltyCategory);

    // HVAC: 1 total regardless of slots
    const effectiveSlots = item.penaltyCategory === 'hvac' ? 1 : item.slots;

    const penalty = penaltyPerSlot * effectiveSlots;
    locationPenalties[item.location] =
      (locationPenalties[item.location] ?? 0) + penalty;
    totalPenalty += penalty;
  }

  return {
    totalPenalty,
    locationPenalties,
  };
}

// ============================================================================
// SPEED FACTOR TABLE (from TechManual)
// ============================================================================

/**
 * Speed factor lookup by Target Movement Modifier (TMM)
 * TMM is based on movement capability
 */
export const SPEED_FACTORS: Record<number, number> = {
  0: 1.0,
  1: 1.1,
  2: 1.2,
  3: 1.3,
  4: 1.4,
  5: 1.5,
  6: 1.6,
  7: 1.7,
  8: 1.8,
  9: 1.9,
  10: 2.0,
};

/**
 * Calculate Target Movement Modifier from movement capability
 */
export function calculateTMM(runMP: number, jumpMP: number = 0): number {
  const bestMP = Math.max(runMP, jumpMP);

  if (bestMP <= 2) return 0;
  if (bestMP <= 4) return 1;
  if (bestMP <= 6) return 2;
  if (bestMP <= 9) return 3;
  if (bestMP <= 17) return 4;
  if (bestMP <= 24) return 5;
  return 6;
}

/**
 * Calculate speed factor from movement profile
 */
export function calculateSpeedFactor(
  walkMP: number,
  runMP: number,
  jumpMP: number = 0,
): number {
  const tmm = calculateTMM(runMP, jumpMP);
  const baseFactor = SPEED_FACTORS[tmm] ?? 1.0;

  // Jump bonus: add 0.1 per jump MP above walk MP (max +0.5)
  if (jumpMP > walkMP) {
    const jumpBonus = Math.min(0.5, (jumpMP - walkMP) * 0.1);
    return Math.min(2.24, baseFactor + jumpBonus);
  }

  return baseFactor;
}

// ============================================================================
// DEFENSIVE BV CALCULATION
// ============================================================================

export interface DefensiveBVConfig {
  totalArmorPoints: number;
  totalStructurePoints: number;
  tonnage: number;
  runMP: number;
  jumpMP: number;
  armorType?: string;
  structureType?: string;
  gyroType?: string;
  engineType?: EngineType;
  bar?: number;
  engineMultiplier?: number;
  defensiveEquipmentBV?: number;
  explosivePenalties?: number;
  /** Defensive equipment IDs (AMS, ECM, BAP, shields, armored components) */
  defensiveEquipment?: string[];
  /** Stealth armor adds +2 to TMM for defensive factor */
  hasStealthArmor?: boolean;
  /** Chameleon Light Polarization Shield adds +2 to TMM for defensive factor */
  hasChameleonLPS?: boolean;
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
  const armorMultiplier = getArmorBVMultiplier(config.armorType ?? 'standard');
  const structureMultiplier = getStructureBVMultiplier(
    config.structureType ?? 'standard',
  );
  const gyroMultiplier = getGyroBVMultiplier(config.gyroType ?? 'standard');

  const bar = config.bar ?? 10;
  // Calculate engine multiplier from engineType if provided, otherwise use explicit value or default
  const engineMultiplier =
    config.engineType !== undefined
      ? getEngineBVMultiplier(config.engineType)
      : (config.engineMultiplier ?? 1.0);

  // Resolve defensive equipment BV from catalog (AMS, ECM, BAP, shields, armored components)
  let resolvedDefensiveEquipmentBV = config.defensiveEquipmentBV ?? 0;
  if (config.defensiveEquipment && config.defensiveEquipment.length > 0) {
    for (const equipmentId of config.defensiveEquipment) {
      const result = resolveEquipmentBV(equipmentId);
      resolvedDefensiveEquipmentBV += result.battleValue;
    }
  }

  const explosivePenalties = config.explosivePenalties ?? 0;

  const armorBV = config.totalArmorPoints * 2.5 * armorMultiplier * (bar / 10);
  const structureBV =
    config.totalStructurePoints * 1.5 * structureMultiplier * engineMultiplier;
  const gyroBV = config.tonnage * gyroMultiplier;

  const baseDef =
    armorBV +
    structureBV +
    gyroBV +
    resolvedDefensiveEquipmentBV -
    explosivePenalties;

  let maxTMM = calculateTMM(config.runMP, config.jumpMP);

  // Stealth armor and Chameleon LPS each add +2 to TMM for defensive factor
  // See MekBVCalculator.tmmFactor() lines 281-303
  if (config.hasStealthArmor) {
    maxTMM += 2;
  }
  if (config.hasChameleonLPS) {
    maxTMM += 2;
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

// ============================================================================
// OFFENSIVE BV CALCULATION (MegaMek-accurate with Heat Tracking)
// ============================================================================

export interface OffensiveBVConfig {
  weapons: Array<{
    id: string;
    name: string;
    heat: number;
    bv: number;
    rear?: boolean;
    /** Weapon is in an arm location with a functional AES (×1.25) */
    hasAES?: boolean;
    /** Linked Artemis fire control system type */
    artemisType?: 'iv' | 'v';
    /** Whether this is a direct-fire weapon (eligible for TC modifier) */
    isDirectFire?: boolean;
  }>;
  ammo?: Array<{ id: string; bv: number; weaponType: string }>;
  tonnage: number;
  walkMP: number;
  runMP: number;
  jumpMP: number;
  heatDissipation: number;
  /** Whether the unit has a functional Targeting Computer */
  hasTargetingComputer?: boolean;
  /** Triple Strength Myomer: weight bonus ×1.5 */
  hasTSM?: boolean;
  /** Industrial TSM: weight bonus ×1.15 */
  hasIndustrialTSM?: boolean;
  /** Number of arms with functional AES (0-2) for weight bonus multiplier */
  aesArms?: number;
  /** Industrial mech without advanced fire control: offensive BV ×0.9 */
  isIndustrialMech?: boolean;
}

export interface OffensiveBVResult {
  weaponBV: number;
  ammoBV: number;
  weightBonus: number;
  speedFactor: number;
  totalOffensiveBV: number;
}

export function calculateOffensiveSpeedFactor(
  runMP: number,
  jumpMP: number = 0,
  umuMP: number = 0,
): number {
  const mp = runMP + Math.round(Math.max(jumpMP, umuMP) / 2.0);
  const speedFactor =
    Math.round(Math.pow(1 + (mp - 5) / 10.0, 1.2) * 100.0) / 100.0;
  return speedFactor;
}

/**
 * Calculate ammo BV with excessive ammo cap per weapon type.
 *
 * Per TechManual BV 2.0 / MegaMek BVCalculator.processAmmo() (lines 1030-1081):
 * - Ammo grouped by weapon type, weapons grouped by normalized type
 * - Per group: cappedBV = min(totalAmmoBV, totalWeaponBV)
 * - Orphaned ammo (no matching weapon) = 0 BV
 * - Uses base weapon BV (before rear penalty) for cap
 */
export function calculateAmmoBVWithExcessiveCap(
  weapons: Array<{ id: string; bv: number }>,
  ammo: Array<{ id: string; bv: number; weaponType: string }>,
): number {
  if (!ammo || ammo.length === 0) return 0;

  // Weapon BV by normalized type (e.g., "ac20-1" → "ac-20")
  const weaponBVByType: Record<string, number> = {};
  for (const weapon of weapons) {
    const weaponType = normalizeEquipmentId(weapon.id);
    weaponBVByType[weaponType] = (weaponBVByType[weaponType] ?? 0) + weapon.bv;
  }

  // Ammo BV by weapon type
  const ammoBVByType: Record<string, number> = {};
  for (const a of ammo) {
    ammoBVByType[a.weaponType] = (ammoBVByType[a.weaponType] ?? 0) + a.bv;
  }

  let totalAmmoBV = 0;
  for (const ammoType of Object.keys(ammoBVByType)) {
    const matchingWeaponBV = weaponBVByType[ammoType] ?? 0;
    if (matchingWeaponBV === 0) continue; // Orphaned ammo → 0 BV
    totalAmmoBV += Math.min(ammoBVByType[ammoType], matchingWeaponBV);
  }

  return totalAmmoBV;
}

/**
 * Apply weapon BV modifiers in MegaMek's exact order.
 *
 * Order: base BV → AES (×1.25) → rear (×0.5) → Artemis IV (×1.2) / V (×1.3) → TC (×1.25)
 *
 * @see BVCalculator.processWeapon() lines 789-894
 */
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

  // 1. AES modifier (arm-mounted weapon with Actuator Enhancement System)
  if (weapon.hasAES) {
    modifiedBV *= 1.25;
  }

  // 2. Rear-mounted weapon penalty
  if (weapon.rear) {
    modifiedBV *= 0.5;
  }

  // 3. Artemis fire control system
  if (weapon.artemisType === 'iv') {
    modifiedBV *= 1.2;
  } else if (weapon.artemisType === 'v') {
    modifiedBV *= 1.3;
  }

  // 4. Targeting Computer (direct fire weapons only)
  if (hasTC && weapon.isDirectFire) {
    modifiedBV *= 1.25;
  }

  return modifiedBV;
}

/**
 * MegaMek heatSorter: heatless weapons first, then BV descending, ties broken by heat ascending.
 *
 * @see HeatTrackingBVCalculator.java lines 133-146
 */
function heatSorter(
  a: { bv: number; heat: number },
  b: { bv: number; heat: number },
): number {
  // Heatless weapons always come first
  if (a.heat === 0 && b.heat > 0) return -1;
  if (a.heat > 0 && b.heat === 0) return 1;
  if (a.heat === 0 && b.heat === 0) return 0;

  // Both have heat: sort by BV descending, ties by heat ascending
  if (a.bv === b.bv) {
    return a.heat - b.heat;
  }
  return b.bv - a.bv;
}

export function calculateOffensiveBVWithHeatTracking(
  config: OffensiveBVConfig,
): OffensiveBVResult {
  const hasTC = config.hasTargetingComputer ?? false;

  // Apply all modifiers (AES → rear → Artemis → TC) to get modified BV for sorting
  const weaponsWithModifiers = config.weapons.map((w) => ({
    ...w,
    bv: applyWeaponBVModifiers(w, hasTC),
  }));

  // MegaMek heatSorter: heatless first → BV descending → heat ascending ties
  const sortedWeapons = [...weaponsWithModifiers].sort(heatSorter);

  // MegaMek heat efficiency: 6 + heatCapacity - moveHeat
  // See MekBVCalculator.heatEfficiency() lines 321-389
  const RUNNING_HEAT = 2;
  const jumpHeat = config.jumpMP > 0 ? Math.max(3, config.jumpMP) : 0;
  const moveHeat = Math.max(RUNNING_HEAT, jumpHeat);
  const heatEfficiency = 6 + config.heatDissipation - moveHeat;

  // Weapon that crosses threshold gets FULL BV; only subsequent weapons get halved.
  // See HeatTrackingBVCalculator.processWeapons() lines 78-128
  let heatExceeded = heatEfficiency <= 0;
  let heatSum = 0;
  let weaponBV = 0;

  for (const weapon of sortedWeapons) {
    heatSum += weapon.heat;
    let adjustedBV = weapon.bv;

    if (heatExceeded) {
      adjustedBV *= 0.5;
    }

    weaponBV += adjustedBV;

    if (heatSum >= heatEfficiency) {
      heatExceeded = true;
    }
  }

  const ammoBV = config.ammo
    ? calculateAmmoBVWithExcessiveCap(config.weapons, config.ammo)
    : 0;

  // Weight bonus with TSM/AES modifiers per MekBVCalculator.processWeight()
  const aesMultiplier = 1.0 + (config.aesArms ?? 0) * 0.1;
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
  );
  const baseOffensive = weaponBV + ammoBV + weightBonus;

  // Industrial mechs without advanced fire control get ×0.9
  // See MekBVCalculator.processOffensiveTypeModifier() lines 416-424
  const typeModifier = config.isIndustrialMech ? 0.9 : 1.0;
  const totalOffensiveBV = baseOffensive * speedFactor * typeModifier;

  return {
    weaponBV,
    ammoBV,
    weightBonus,
    speedFactor,
    totalOffensiveBV,
  };
}

/**
 * @deprecated Use resolveEquipmentBV() from equipmentBVResolver.ts instead.
 * Retained as thin wrappers for backward compatibility during migration.
 */
export function getWeaponBV(weaponId: string): number {
  return resolveEquipmentBV(weaponId).battleValue;
}

/**
 * @deprecated Use resolveEquipmentBV() from equipmentBVResolver.ts instead.
 */
export function getWeaponHeat(weaponId: string): number {
  return resolveEquipmentBV(weaponId).heat;
}

/**
 * Calculate offensive Battle Value (legacy - without heat tracking)
 *
 * @deprecated Use calculateOffensiveBVWithHeatTracking for accurate BV calculation
 *
 * Formula:
 *   Offensive_BV = sum(weapon_BV × modifiers) + ammo_BV
 */
export function calculateOffensiveBV(
  weapons: Array<{ id: string; rear?: boolean }>,
  hasTargetingComputer: boolean = false,
): number {
  let total = 0;

  for (const weapon of weapons) {
    const weaponId = weapon.id.toLowerCase();
    let bv = resolveEquipmentBV(weapon.id).battleValue;

    if (weapon.rear) {
      bv = bv * 0.5;
    }

    if (
      hasTargetingComputer &&
      !weaponId.includes('lrm') &&
      !weaponId.includes('srm') &&
      !weaponId.includes('mrm')
    ) {
      bv = bv * 1.25;
    }

    total += bv;
  }

  return total;
}

// ============================================================================
// TOTAL BV CALCULATION
// ============================================================================

/**
 * Cockpit type identifiers for BV cockpit modifiers.
 * Per MekBVCalculator.processSummarize() lines 462-506
 */
export type CockpitType =
  | 'standard'
  | 'small'
  | 'torso-mounted'
  | 'small-command-console'
  | 'command-console'
  | 'interface'
  | 'drone-operating-system';

/**
 * Get cockpit BV modifier.
 * Applied to final (defensive + offensive) BV.
 *
 * - Small / Torso-mounted / Small Command Console / Drone OS: ×0.95
 * - Interface: ×1.3
 * - Standard / Command Console / others: ×1.0
 */
export function getCockpitModifier(cockpitType?: CockpitType): number {
  switch (cockpitType) {
    case 'small':
    case 'torso-mounted':
    case 'small-command-console':
    case 'drone-operating-system':
      return 0.95;
    case 'interface':
      return 1.3;
    default:
      return 1.0;
  }
}

export interface BVCalculationConfig {
  totalArmorPoints: number;
  totalStructurePoints: number;
  tonnage: number;
  heatSinkCapacity: number;
  walkMP: number;
  runMP: number;
  jumpMP: number;
  weapons: Array<{ id: string; rear?: boolean }>;
  hasTargetingComputer?: boolean;
  hasDefensiveEquipment?: boolean;
  armorType?: string;
  structureType?: string;
  gyroType?: string;
  engineType?: EngineType;
  cockpitType?: CockpitType;
  hasStealthArmor?: boolean;
  hasChameleonLPS?: boolean;
  hasTSM?: boolean;
  hasIndustrialTSM?: boolean;
  aesArms?: number;
  isIndustrialMech?: boolean;
}

/**
 * BV breakdown for display
 */
export interface BVBreakdown {
  defensiveBV: number;
  offensiveBV: number;
  speedFactor: number;
  totalBV: number;
}

/**
 * Calculate total Battle Value for a BattleMech unit.
 *
 * Implements BV 2.0 calculation per TechManual and MegaMek:
 * - Defensive BV: armor + structure + gyro, modified by defensive speed factor
 * - Offensive BV: weapons (with heat tracking) + tonnage, modified by offensive speed factor
 * - Total BV: defensive + offensive (speed factors already applied)
 *
 * @param config - Unit configuration including armor, structure, weapons, and movement
 * @returns Total Battle Value (rounded to nearest integer)
 *
 * @see openspec/specs/battle-value-system/spec.md
 * @see MegaMek: megamek.common.BVCalculator
 */
export function calculateTotalBV(config: BVCalculationConfig): number {
  const defensiveResult = calculateDefensiveBV({
    totalArmorPoints: config.totalArmorPoints,
    totalStructurePoints: config.totalStructurePoints,
    tonnage: config.tonnage,
    runMP: config.runMP,
    jumpMP: config.jumpMP,
    armorType: config.armorType,
    structureType: config.structureType,
    gyroType: config.gyroType,
    engineType: config.engineType,
    hasStealthArmor: config.hasStealthArmor,
    hasChameleonLPS: config.hasChameleonLPS,
  });

  const weaponsWithBV = config.weapons.map((w) => {
    const resolved = resolveEquipmentBV(w.id);
    const weaponId = w.id.toLowerCase();
    const isDirectFire =
      !weaponId.includes('lrm') &&
      !weaponId.includes('srm') &&
      !weaponId.includes('mrm');

    return {
      id: w.id,
      name: weaponId,
      heat: resolved.heat,
      bv: resolved.battleValue,
      rear: w.rear,
      isDirectFire,
    };
  });

  const offensiveResult = calculateOffensiveBVWithHeatTracking({
    weapons: weaponsWithBV,
    tonnage: config.tonnage,
    walkMP: config.walkMP,
    runMP: config.runMP,
    jumpMP: config.jumpMP,
    heatDissipation: config.heatSinkCapacity,
    hasTargetingComputer: config.hasTargetingComputer,
    hasTSM: config.hasTSM,
    hasIndustrialTSM: config.hasIndustrialTSM,
    aesArms: config.aesArms,
    isIndustrialMech: config.isIndustrialMech,
  });

  const baseBV =
    defensiveResult.totalDefensiveBV + offensiveResult.totalOffensiveBV;
  const cockpitMod = getCockpitModifier(config.cockpitType);

  return Math.round(baseBV * cockpitMod);
}

/**
 * Get detailed Battle Value breakdown for display and analysis.
 *
 * Returns component-level BV values:
 * - Defensive BV (with defensive speed factor applied)
 * - Offensive BV (with offensive speed factor applied)
 * - Total BV (sum of defensive + offensive)
 *
 * @param config - Unit configuration
 * @returns Breakdown of BV components
 *
 * @see openspec/specs/battle-value-system/spec.md
 */
export function getBVBreakdown(config: BVCalculationConfig): BVBreakdown {
  const defensiveResult = calculateDefensiveBV({
    totalArmorPoints: config.totalArmorPoints,
    totalStructurePoints: config.totalStructurePoints,
    tonnage: config.tonnage,
    runMP: config.runMP,
    jumpMP: config.jumpMP,
    armorType: config.armorType,
    structureType: config.structureType,
    gyroType: config.gyroType,
    engineType: config.engineType,
    hasStealthArmor: config.hasStealthArmor,
    hasChameleonLPS: config.hasChameleonLPS,
  });

  const weaponsWithBV = config.weapons.map((w) => {
    const resolved = resolveEquipmentBV(w.id);
    const weaponId = w.id.toLowerCase();
    const isDirectFire =
      !weaponId.includes('lrm') &&
      !weaponId.includes('srm') &&
      !weaponId.includes('mrm');

    return {
      id: w.id,
      name: weaponId,
      heat: resolved.heat,
      bv: resolved.battleValue,
      rear: w.rear,
      isDirectFire,
    };
  });

  const offensiveResult = calculateOffensiveBVWithHeatTracking({
    weapons: weaponsWithBV,
    tonnage: config.tonnage,
    walkMP: config.walkMP,
    runMP: config.runMP,
    jumpMP: config.jumpMP,
    heatDissipation: config.heatSinkCapacity,
    hasTargetingComputer: config.hasTargetingComputer,
    hasTSM: config.hasTSM,
    hasIndustrialTSM: config.hasIndustrialTSM,
    aesArms: config.aesArms,
    isIndustrialMech: config.isIndustrialMech,
  });

  const baseBV =
    defensiveResult.totalDefensiveBV + offensiveResult.totalOffensiveBV;
  const cockpitMod = getCockpitModifier(config.cockpitType);

  return {
    defensiveBV: defensiveResult.totalDefensiveBV,
    offensiveBV: offensiveResult.totalOffensiveBV,
    speedFactor: offensiveResult.speedFactor,
    totalBV: Math.round(baseBV * cockpitMod),
  };
}

// ============================================================================
// PILOT SKILL ADJUSTMENT
// ============================================================================

/**
 * Calculate skill-adjusted Battle Value for a unit.
 *
 * Applies pilot skill modifiers to base Battle Value. A 4/5 pilot is baseline (1.0x).
 * Better pilots (lower skills) increase BV, worse pilots (higher skills) decrease it.
 *
 * @param baseBV - Base Battle Value of the unit
 * @param gunnery - Pilot gunnery skill (0-8, lower is better)
 * @param piloting - Pilot piloting skill (0-8, lower is better)
 * @returns Adjusted Battle Value rounded to nearest integer
 *
 * @example
 * calculateAdjustedBV(1000, 4, 5) // Returns 1000 (baseline)
 * calculateAdjustedBV(1000, 3, 4) // Returns 1200 (elite)
 * calculateAdjustedBV(1000, 5, 6) // Returns 900 (green)
 */
export function calculateAdjustedBV(
  baseBV: number,
  gunnery: number,
  piloting: number,
): number {
  const modifier = getPilotSkillModifier(gunnery, piloting);
  return Math.round(baseBV * modifier);
}
