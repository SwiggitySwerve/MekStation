/**
 * Electronics Equipment Type Definitions
 * 
 * Defines electronic warfare, targeting, and C3 systems.
 * 
 * @spec openspec/changes/implement-phase3-equipment/specs/electronics-system/spec.md
 */

import { TechBase } from '../enums/TechBase';
import { RulesLevel } from '../enums/RulesLevel';

/**
 * Electronics category
 */
export enum ElectronicsCategory {
  TARGETING = 'Targeting',
  ECM = 'ECM',
  ACTIVE_PROBE = 'Active Probe',
  C3 = 'C3 System',
  TAG = 'TAG',
  COMMUNICATIONS = 'Communications',
}

/**
 * Electronics equipment interface
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
  readonly special?: readonly string[];
  /** ID for variable equipment formula lookup in FormulaRegistry */
  readonly variableEquipmentId?: string;
}

// ============================================================================
// TARGETING COMPUTERS
// ============================================================================

export const TARGETING_COMPUTERS: readonly IElectronics[] = [
  {
    id: 'targeting-computer',
    name: 'Targeting Computer',
    category: ElectronicsCategory.TARGETING,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    weight: 0, // Variable: ceil(weaponTonnage / 4)
    criticalSlots: 0, // Variable: 1 slot per ton
    costCBills: 0, // Variable: weight × 10000
    battleValue: 0, // Variable
    introductionYear: 3062,
    special: ['-1 to-hit for direct fire weapons'],
    variableEquipmentId: 'targeting-computer-is',
  },
  {
    id: 'clan-targeting-computer',
    name: 'Targeting Computer (Clan)',
    category: ElectronicsCategory.TARGETING,
    techBase: TechBase.CLAN,
    rulesLevel: RulesLevel.STANDARD,
    weight: 0, // Variable: ceil(weaponTonnage / 5)
    criticalSlots: 0, // Variable: 1 slot per ton
    costCBills: 0, // Variable: weight × 10000
    battleValue: 0, // Variable
    introductionYear: 2860,
    special: ['-1 to-hit for direct fire weapons'],
    variableEquipmentId: 'targeting-computer-clan',
  },
] as const;

// ============================================================================
// ECM SYSTEMS
// ============================================================================

export const ECM_SYSTEMS: readonly IElectronics[] = [
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
    special: ['6 hex ECM bubble', 'Blocks enemy electronics'],
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
    special: ['6 hex ECM bubble', 'Blocks enemy electronics'],
  },
  {
    id: 'angel-ecm',
    name: 'Angel ECM Suite',
    category: ElectronicsCategory.ECM,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    weight: 2,
    criticalSlots: 2,
    costCBills: 750000,
    battleValue: 100,
    introductionYear: 3063,
    special: ['6 hex ECM bubble', 'Enhanced protection vs active probes'],
  },
  {
    id: 'watchdog-cews',
    name: 'Watchdog CEWS',
    category: ElectronicsCategory.ECM,
    techBase: TechBase.CLAN,
    rulesLevel: RulesLevel.ADVANCED,
    weight: 1.5,
    criticalSlots: 2,
    costCBills: 600000,
    battleValue: 68,
    introductionYear: 3059,
    special: ['Combined ECM and Active Probe', '4 hex probe range'],
  },
] as const;

// ============================================================================
// ACTIVE PROBES
// ============================================================================

export const ACTIVE_PROBES: readonly IElectronics[] = [
  {
    id: 'beagle-active-probe',
    name: 'Beagle Active Probe',
    category: ElectronicsCategory.ACTIVE_PROBE,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    weight: 1.5,
    criticalSlots: 2,
    costCBills: 200000,
    battleValue: 10,
    introductionYear: 2576,
    special: ['4 hex detection range', 'Detects hidden units'],
  },
  {
    id: 'bloodhound-active-probe',
    name: 'Bloodhound Active Probe',
    category: ElectronicsCategory.ACTIVE_PROBE,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    weight: 2,
    criticalSlots: 3,
    costCBills: 500000,
    battleValue: 25,
    introductionYear: 3058,
    special: ['8 hex detection range', 'Detects hidden units', 'Counters stealth'],
  },
  {
    id: 'clan-active-probe',
    name: 'Active Probe (Clan)',
    category: ElectronicsCategory.ACTIVE_PROBE,
    techBase: TechBase.CLAN,
    rulesLevel: RulesLevel.STANDARD,
    weight: 1,
    criticalSlots: 1,
    costCBills: 200000,
    battleValue: 12,
    introductionYear: 2832,
    special: ['5 hex detection range', 'Detects hidden units'],
  },
  {
    id: 'light-active-probe',
    name: 'Light Active Probe',
    category: ElectronicsCategory.ACTIVE_PROBE,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    weight: 0.5,
    criticalSlots: 1,
    costCBills: 50000,
    battleValue: 7,
    introductionYear: 3052,
    special: ['3 hex detection range'],
  },
  {
    id: 'clan-light-active-probe',
    name: 'Light Active Probe (Clan)',
    category: ElectronicsCategory.ACTIVE_PROBE,
    techBase: TechBase.CLAN,
    rulesLevel: RulesLevel.STANDARD,
    weight: 0.5,
    criticalSlots: 1,
    costCBills: 50000,
    battleValue: 7,
    introductionYear: 3058,
    special: ['3 hex detection range'],
  },
] as const;

// ============================================================================
// C3 SYSTEMS
// ============================================================================

export const C3_SYSTEMS: readonly IElectronics[] = [
  {
    id: 'c3-master',
    name: 'C3 Master Computer',
    category: ElectronicsCategory.C3,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    weight: 5,
    criticalSlots: 5,
    costCBills: 1500000,
    battleValue: 0, // Calculated based on lance
    introductionYear: 3050,
    special: ['Coordinates up to 3 C3 slaves', 'Shares targeting data'],
  },
  {
    id: 'c3-slave',
    name: 'C3 Slave Unit',
    category: ElectronicsCategory.C3,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    weight: 1,
    criticalSlots: 1,
    costCBills: 250000,
    battleValue: 0, // Calculated based on lance
    introductionYear: 3050,
    special: ['Links to C3 Master', 'Shares targeting data'],
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
    battleValue: 0, // Calculated based on lance
    introductionYear: 3062,
    special: ['No master required', 'Links up to 6 units'],
  },
  {
    id: 'c3-boosted-master',
    name: 'C3 Boosted Master',
    category: ElectronicsCategory.C3,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    weight: 6,
    criticalSlots: 6,
    costCBills: 3000000,
    battleValue: 0,
    introductionYear: 3073,
    special: ['Coordinates up to 3 C3 slaves', 'Extended range'],
  },
  {
    id: 'c3-boosted-slave',
    name: 'C3 Boosted Slave',
    category: ElectronicsCategory.C3,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    weight: 2,
    criticalSlots: 2,
    costCBills: 500000,
    battleValue: 0,
    introductionYear: 3073,
    special: ['Links to C3 Master', 'Extended range'],
  },
] as const;

// ============================================================================
// TAG SYSTEMS
// ============================================================================

export const TAG_SYSTEMS: readonly IElectronics[] = [
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
    special: ['Designates targets for homing missiles', 'Uses small laser ranges'],
  },
  {
    id: 'clan-tag',
    name: 'TAG (Clan)',
    category: ElectronicsCategory.TAG,
    techBase: TechBase.CLAN,
    rulesLevel: RulesLevel.STANDARD,
    weight: 1,
    criticalSlots: 1,
    costCBills: 50000,
    battleValue: 0,
    introductionYear: 2820,
    special: ['Designates targets for homing missiles', 'Uses small laser ranges'],
  },
  {
    id: 'light-tag',
    name: 'Light TAG',
    category: ElectronicsCategory.TAG,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    weight: 0.5,
    criticalSlots: 1,
    costCBills: 40000,
    battleValue: 0,
    introductionYear: 3054,
    special: ['Designates targets', 'Shorter range than standard TAG'],
  },
  {
    id: 'clan-light-tag',
    name: 'Light TAG (Clan)',
    category: ElectronicsCategory.TAG,
    techBase: TechBase.CLAN,
    rulesLevel: RulesLevel.ADVANCED,
    weight: 0.5,
    criticalSlots: 1,
    costCBills: 40000,
    battleValue: 0,
    introductionYear: 3054,
    special: ['Designates targets', 'Shorter range than standard TAG'],
  },
] as const;

// ============================================================================
// COMBINED EXPORTS
// ============================================================================

/**
 * All electronics combined
 */
export const ALL_ELECTRONICS: readonly IElectronics[] = [
  ...TARGETING_COMPUTERS,
  ...ECM_SYSTEMS,
  ...ACTIVE_PROBES,
  ...C3_SYSTEMS,
  ...TAG_SYSTEMS,
] as const;

/**
 * Get electronics by ID
 */
export function getElectronicsById(id: string): IElectronics | undefined {
  return ALL_ELECTRONICS.find(e => e.id === id);
}

/**
 * Get electronics by category
 */
export function getElectronicsByCategory(category: ElectronicsCategory): IElectronics[] {
  return ALL_ELECTRONICS.filter(e => e.category === category);
}

/**
 * Get electronics by tech base
 */
export function getElectronicsByTechBase(techBase: TechBase): IElectronics[] {
  return ALL_ELECTRONICS.filter(e => e.techBase === techBase);
}

