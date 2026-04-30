/**
 * Infantry Armor Kit Construction Profiles
 *
 * Profiles capture the construction-level effects requested by
 * add-infantry-construction: per-trooper modifiers, environment deployment
 * flags, and transport mass per trooper.
 *
 * @spec openspec/changes/add-infantry-construction/specs/infantry-unit-system/spec.md
 */

import { InfantryArmorKitType } from '@/types/unit/InfantryInterfaces';
import { InfantryArmorKit } from '@/types/unit/PersonnelInterfaces';

// ============================================================================
// Public types
// ============================================================================

export interface IInfantryArmorKitProfile {
  readonly kit: InfantryArmorKitType;
  readonly displayName: string;
  /** Flak-style ballistic resistance modifier. */
  readonly ballisticDamageDivisorModifier: number;
  /** Terrain to-hit modifier while in woods. Negative values benefit infantry. */
  readonly woodsToHitModifier: number;
  /** Terrain to-hit modifier while in snow. Negative values benefit infantry. */
  readonly snowToHitModifier: number;
  readonly enablesVacuumOperations: boolean;
  readonly enablesUnderwaterOperations: boolean;
  /** Transport mass added per trooper, in tons. */
  readonly massTonsPerTrooper: number;
}

// ============================================================================
// Canonical construction table
// ============================================================================

export const INFANTRY_ARMOR_KIT_PROFILES: Record<
  InfantryArmorKitType,
  IInfantryArmorKitProfile
> = {
  [InfantryArmorKitType.NONE]: {
    kit: InfantryArmorKitType.NONE,
    displayName: 'None',
    ballisticDamageDivisorModifier: 0,
    woodsToHitModifier: 0,
    snowToHitModifier: 0,
    enablesVacuumOperations: false,
    enablesUnderwaterOperations: false,
    massTonsPerTrooper: 0,
  },
  [InfantryArmorKitType.STANDARD]: {
    kit: InfantryArmorKitType.STANDARD,
    displayName: 'Standard',
    ballisticDamageDivisorModifier: 0,
    woodsToHitModifier: 0,
    snowToHitModifier: 0,
    enablesVacuumOperations: false,
    enablesUnderwaterOperations: false,
    massTonsPerTrooper: 0.01,
  },
  [InfantryArmorKitType.FLAK]: {
    kit: InfantryArmorKitType.FLAK,
    displayName: 'Flak',
    ballisticDamageDivisorModifier: 1,
    woodsToHitModifier: 0,
    snowToHitModifier: 0,
    enablesVacuumOperations: false,
    enablesUnderwaterOperations: false,
    massTonsPerTrooper: 0.012,
  },
  [InfantryArmorKitType.CAMO]: {
    kit: InfantryArmorKitType.CAMO,
    displayName: 'Camo',
    ballisticDamageDivisorModifier: 0,
    woodsToHitModifier: -1,
    snowToHitModifier: 0,
    enablesVacuumOperations: false,
    enablesUnderwaterOperations: false,
    massTonsPerTrooper: 0.011,
  },
  [InfantryArmorKitType.SNOW_CAMO]: {
    kit: InfantryArmorKitType.SNOW_CAMO,
    displayName: 'Snow Camo',
    ballisticDamageDivisorModifier: 0,
    woodsToHitModifier: 0,
    snowToHitModifier: -1,
    enablesVacuumOperations: false,
    enablesUnderwaterOperations: false,
    massTonsPerTrooper: 0.011,
  },
  [InfantryArmorKitType.ENVIRONMENTAL_SEALING]: {
    kit: InfantryArmorKitType.ENVIRONMENTAL_SEALING,
    displayName: 'Environmental Sealing',
    ballisticDamageDivisorModifier: 0,
    woodsToHitModifier: 0,
    snowToHitModifier: 0,
    enablesVacuumOperations: true,
    enablesUnderwaterOperations: true,
    massTonsPerTrooper: 0.02,
  },
  [InfantryArmorKitType.SNEAK_CAMO]: {
    kit: InfantryArmorKitType.SNEAK_CAMO,
    displayName: 'Sneak Camo',
    ballisticDamageDivisorModifier: 0,
    woodsToHitModifier: -1,
    snowToHitModifier: 0,
    enablesVacuumOperations: false,
    enablesUnderwaterOperations: false,
    massTonsPerTrooper: 0.018,
  },
  [InfantryArmorKitType.SNEAK_IR]: {
    kit: InfantryArmorKitType.SNEAK_IR,
    displayName: 'Sneak IR',
    ballisticDamageDivisorModifier: 0,
    woodsToHitModifier: 0,
    snowToHitModifier: 0,
    enablesVacuumOperations: false,
    enablesUnderwaterOperations: false,
    massTonsPerTrooper: 0.018,
  },
  [InfantryArmorKitType.SNEAK_ECM]: {
    kit: InfantryArmorKitType.SNEAK_ECM,
    displayName: 'Sneak ECM',
    ballisticDamageDivisorModifier: 0,
    woodsToHitModifier: 0,
    snowToHitModifier: 0,
    enablesVacuumOperations: false,
    enablesUnderwaterOperations: false,
    massTonsPerTrooper: 0.02,
  },
  [InfantryArmorKitType.CLAN]: {
    kit: InfantryArmorKitType.CLAN,
    displayName: 'Clan',
    ballisticDamageDivisorModifier: 0,
    woodsToHitModifier: 0,
    snowToHitModifier: 0,
    enablesVacuumOperations: false,
    enablesUnderwaterOperations: false,
    massTonsPerTrooper: 0.015,
  },
};

const PERSONNEL_TO_CONSTRUCTION_ARMOR_KIT: Record<
  InfantryArmorKit,
  InfantryArmorKitType
> = {
  [InfantryArmorKit.NONE]: InfantryArmorKitType.NONE,
  [InfantryArmorKit.STANDARD]: InfantryArmorKitType.STANDARD,
  [InfantryArmorKit.FLAK]: InfantryArmorKitType.FLAK,
  [InfantryArmorKit.ABLATIVE]: InfantryArmorKitType.STANDARD,
  [InfantryArmorKit.SNEAK_CAMO]: InfantryArmorKitType.SNEAK_CAMO,
  [InfantryArmorKit.SNEAK_IR]: InfantryArmorKitType.SNEAK_IR,
  [InfantryArmorKit.SNEAK_ECM]: InfantryArmorKitType.SNEAK_ECM,
  [InfantryArmorKit.SNEAK_CAMO_IR]: InfantryArmorKitType.SNEAK_CAMO,
  [InfantryArmorKit.SNEAK_IR_ECM]: InfantryArmorKitType.SNEAK_ECM,
  [InfantryArmorKit.SNEAK_COMPLETE]: InfantryArmorKitType.SNEAK_ECM,
  [InfantryArmorKit.CLAN]: InfantryArmorKitType.CLAN,
  [InfantryArmorKit.ENVIRONMENTAL]: InfantryArmorKitType.ENVIRONMENTAL_SEALING,
};

// ============================================================================
// Helpers
// ============================================================================

export function getInfantryArmorKitProfile(
  kit: InfantryArmorKitType,
): IInfantryArmorKitProfile {
  return INFANTRY_ARMOR_KIT_PROFILES[kit];
}

export function mapPersonnelArmorKitToConstructionKit(
  kit: InfantryArmorKit,
): InfantryArmorKitType {
  return PERSONNEL_TO_CONSTRUCTION_ARMOR_KIT[kit];
}

export function canArmorKitDeployInVacuumOrUnderwater(
  kit: InfantryArmorKitType,
): boolean {
  const profile = getInfantryArmorKitProfile(kit);
  return profile.enablesVacuumOperations && profile.enablesUnderwaterOperations;
}

export function calculateArmorKitMassTons(
  kit: InfantryArmorKitType,
  troopers: number,
): number {
  const profile = getInfantryArmorKitProfile(kit);
  return Math.max(0, troopers) * profile.massTonsPerTrooper;
}

export function calculatePersonnelArmorKitMassTons(
  kit: InfantryArmorKit,
  troopers: number,
): number {
  return calculateArmorKitMassTons(
    mapPersonnelArmorKitToConstructionKit(kit),
    troopers,
  );
}
