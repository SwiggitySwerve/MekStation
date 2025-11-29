/**
 * Electronics Type Definitions
 * 
 * Defines electronics systems including ECM, C3, probes, and targeting computers.
 * 
 * @spec openspec/changes/implement-phase3-equipment/specs/electronics-system/spec.md
 */

import { TechBase } from '../enums/TechBase';
import { RulesLevel } from '../enums/RulesLevel';

/**
 * Electronics category enumeration
 */
export enum ElectronicsCategory {
  ECM = 'ECM',
  C3 = 'C3',
  TARGETING = 'Targeting',
  PROBE = 'Probe',
  TAG = 'TAG',
  OTHER = 'Other',
}

/**
 * Electronics interface
 */
export interface IElectronics {
  readonly id: string;
  readonly name: string;
  readonly category: ElectronicsCategory;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  readonly weight: number;
  readonly criticalSlots: number;
  readonly costCBills: number;
  readonly battleValue: number;
  readonly introductionYear: number;
  readonly effectRadius?: number;
  readonly maxNetworkSize?: number;
}

/**
 * Standard electronics definitions
 */
export const ELECTRONICS_EQUIPMENT: readonly IElectronics[] = [
  // ECM Systems
  {
    id: 'guardian-ecm',
    name: 'Guardian ECM Suite',
    category: ElectronicsCategory.ECM,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    weight: 1.5,
    criticalSlots: 2,
    costCBills: 200000,
    battleValue: 61,
    introductionYear: 3045,
    effectRadius: 6,
  },
  {
    id: 'clan-ecm',
    name: 'ECM Suite (Clan)',
    category: ElectronicsCategory.ECM,
    techBase: TechBase.CLAN,
    rulesLevel: RulesLevel.STANDARD,
    weight: 1,
    criticalSlots: 1,
    costCBills: 200000,
    battleValue: 61,
    introductionYear: 2832,
    effectRadius: 6,
  },
  {
    id: 'angel-ecm',
    name: 'Angel ECM Suite',
    category: ElectronicsCategory.ECM,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.EXPERIMENTAL,
    weight: 2,
    criticalSlots: 2,
    costCBills: 750000,
    battleValue: 100,
    introductionYear: 3063,
    effectRadius: 6,
  },
  // C3 Systems
  {
    id: 'c3-master',
    name: 'C3 Computer (Master)',
    category: ElectronicsCategory.C3,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    weight: 5,
    criticalSlots: 5,
    costCBills: 1500000,
    battleValue: 0, // BV calculated separately
    introductionYear: 3050,
    maxNetworkSize: 4,
  },
  {
    id: 'c3-slave',
    name: 'C3 Computer (Slave)',
    category: ElectronicsCategory.C3,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    weight: 1,
    criticalSlots: 1,
    costCBills: 250000,
    battleValue: 0,
    introductionYear: 3050,
  },
  {
    id: 'c3i',
    name: 'Improved C3 Computer',
    category: ElectronicsCategory.C3,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    weight: 2.5,
    criticalSlots: 2,
    costCBills: 750000,
    battleValue: 0,
    introductionYear: 3062,
    maxNetworkSize: 6,
  },
  // Targeting Computers
  {
    id: 'targeting-computer',
    name: 'Targeting Computer',
    category: ElectronicsCategory.TARGETING,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    weight: 0, // Calculated based on weapon weight
    criticalSlots: 0, // Calculated
    costCBills: 0, // Per weight
    battleValue: 0,
    introductionYear: 3062,
  },
  {
    id: 'clan-targeting-computer',
    name: 'Targeting Computer (Clan)',
    category: ElectronicsCategory.TARGETING,
    techBase: TechBase.CLAN,
    rulesLevel: RulesLevel.STANDARD,
    weight: 0,
    criticalSlots: 0,
    costCBills: 0,
    battleValue: 0,
    introductionYear: 2860,
  },
  // Probes
  {
    id: 'beagle-probe',
    name: 'Beagle Active Probe',
    category: ElectronicsCategory.PROBE,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    weight: 1.5,
    criticalSlots: 2,
    costCBills: 200000,
    battleValue: 10,
    introductionYear: 2576,
    effectRadius: 4,
  },
  {
    id: 'clan-active-probe',
    name: 'Active Probe (Clan)',
    category: ElectronicsCategory.PROBE,
    techBase: TechBase.CLAN,
    rulesLevel: RulesLevel.STANDARD,
    weight: 1,
    criticalSlots: 1,
    costCBills: 200000,
    battleValue: 12,
    introductionYear: 2825,
    effectRadius: 5,
  },
  {
    id: 'bloodhound-probe',
    name: 'Bloodhound Active Probe',
    category: ElectronicsCategory.PROBE,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    weight: 2,
    criticalSlots: 3,
    costCBills: 500000,
    battleValue: 25,
    introductionYear: 3058,
    effectRadius: 8,
  },
  // TAG
  {
    id: 'tag',
    name: 'TAG',
    category: ElectronicsCategory.TAG,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    weight: 1,
    criticalSlots: 1,
    costCBills: 50000,
    battleValue: 0,
    introductionYear: 2600,
  },
  {
    id: 'clan-light-tag',
    name: 'Light TAG (Clan)',
    category: ElectronicsCategory.TAG,
    techBase: TechBase.CLAN,
    rulesLevel: RulesLevel.STANDARD,
    weight: 0.5,
    criticalSlots: 1,
    costCBills: 40000,
    battleValue: 0,
    introductionYear: 2600,
  },
] as const;

/**
 * Get electronics by ID
 */
export function getElectronicsById(id: string): IElectronics | undefined {
  return ELECTRONICS_EQUIPMENT.find(e => e.id === id);
}

/**
 * Get electronics by category
 */
export function getElectronicsByCategory(category: ElectronicsCategory): IElectronics[] {
  return ELECTRONICS_EQUIPMENT.filter(e => e.category === category);
}

/**
 * Calculate targeting computer size (IS: 1 ton per 4 tons of direct-fire weapons)
 */
export function calculateTargetingComputerWeight(
  directFireWeaponWeight: number,
  techBase: TechBase
): number {
  if (techBase === TechBase.CLAN) {
    return Math.ceil(directFireWeaponWeight / 5);
  }
  return Math.ceil(directFireWeaponWeight / 4);
}

/**
 * Calculate targeting computer slots
 */
export function calculateTargetingComputerSlots(weight: number): number {
  return Math.ceil(weight);
}

