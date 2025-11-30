/**
 * Miscellaneous Equipment Type Definitions
 * 
 * Defines heat sinks, jump jets, movement enhancements, and other misc equipment.
 * 
 * @spec openspec/changes/implement-phase3-equipment/specs/electronics-system/spec.md
 */

import { TechBase } from '../enums/TechBase';
import { RulesLevel } from '../enums/RulesLevel';
import { IVariableEquipmentConfig, VariableProperty } from './VariableEquipment';

/**
 * Misc equipment category
 */
export enum MiscEquipmentCategory {
  HEAT_SINK = 'Heat Sink',
  JUMP_JET = 'Jump Jet',
  MOVEMENT = 'Movement Enhancement',
  DEFENSIVE = 'Defensive',
  MYOMER = 'Myomer',
  INDUSTRIAL = 'Industrial',
}

/**
 * Misc equipment interface
 */
export interface IMiscEquipment {
  readonly id: string;
  readonly name: string;
  readonly category: MiscEquipmentCategory;
  readonly techBase: TechBase;
  readonly rulesLevel: RulesLevel;
  readonly weight: number;
  readonly criticalSlots: number;
  readonly costCBills: number;
  readonly battleValue: number;
  readonly introductionYear: number;
  readonly special?: readonly string[];
  /** True if this equipment has variable properties */
  readonly isVariable?: boolean;
  /** Configuration for variable property calculations */
  readonly variableConfig?: IVariableEquipmentConfig;
}

// ============================================================================
// HEAT SINKS
// ============================================================================

export const HEAT_SINKS: readonly IMiscEquipment[] = [
  {
    id: 'single-heat-sink',
    name: 'Heat Sink',
    category: MiscEquipmentCategory.HEAT_SINK,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    weight: 1,
    criticalSlots: 1,
    costCBills: 2000,
    battleValue: 0,
    introductionYear: 2022,
    special: ['Dissipates 1 heat'],
  },
  {
    id: 'double-heat-sink',
    name: 'Double Heat Sink',
    category: MiscEquipmentCategory.HEAT_SINK,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    weight: 1,
    criticalSlots: 3,
    costCBills: 6000,
    battleValue: 0,
    introductionYear: 2567,
    special: ['Dissipates 2 heat'],
  },
  {
    id: 'clan-double-heat-sink',
    name: 'Double Heat Sink (Clan)',
    category: MiscEquipmentCategory.HEAT_SINK,
    techBase: TechBase.CLAN,
    rulesLevel: RulesLevel.STANDARD,
    weight: 1,
    criticalSlots: 2,
    costCBills: 6000,
    battleValue: 0,
    introductionYear: 2825,
    special: ['Dissipates 2 heat'],
  },
  {
    id: 'compact-heat-sink',
    name: 'Compact Heat Sink',
    category: MiscEquipmentCategory.HEAT_SINK,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    weight: 1,
    criticalSlots: 1,
    costCBills: 3000,
    battleValue: 0,
    introductionYear: 3058,
    special: ['Dissipates 1 heat', 'Fits in 1 slot'],
  },
  {
    id: 'laser-heat-sink',
    name: 'Laser Heat Sink',
    category: MiscEquipmentCategory.HEAT_SINK,
    techBase: TechBase.CLAN,
    rulesLevel: RulesLevel.EXPERIMENTAL,
    weight: 1,
    criticalSlots: 2,
    costCBills: 6000,
    battleValue: 0,
    introductionYear: 3075,
    special: ['Dissipates 2 heat', 'Bonus for energy weapons'],
  },
] as const;

// ============================================================================
// JUMP JETS
// ============================================================================

export const JUMP_JETS: readonly IMiscEquipment[] = [
  // Standard Jump Jets - weight varies by mech tonnage
  {
    id: 'jump-jet-light',
    name: 'Jump Jet (Light)',
    category: MiscEquipmentCategory.JUMP_JET,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    weight: 0.5, // For mechs 10-55 tons
    criticalSlots: 1,
    costCBills: 0, // Variable: tonnage × 200
    battleValue: 0, // Variable
    introductionYear: 2471,
    special: ['For mechs 10-55 tons'],
  },
  {
    id: 'jump-jet-medium',
    name: 'Jump Jet (Medium)',
    category: MiscEquipmentCategory.JUMP_JET,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    weight: 1, // For mechs 60-85 tons
    criticalSlots: 1,
    costCBills: 0,
    battleValue: 0,
    introductionYear: 2471,
    special: ['For mechs 60-85 tons'],
  },
  {
    id: 'jump-jet-heavy',
    name: 'Jump Jet (Heavy)',
    category: MiscEquipmentCategory.JUMP_JET,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    weight: 2, // For mechs 90-100 tons
    criticalSlots: 1,
    costCBills: 0,
    battleValue: 0,
    introductionYear: 2471,
    special: ['For mechs 90-100 tons'],
  },
  // Improved Jump Jets
  {
    id: 'improved-jump-jet-light',
    name: 'Improved Jump Jet (Light)',
    category: MiscEquipmentCategory.JUMP_JET,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    weight: 1, // For mechs 10-55 tons
    criticalSlots: 2,
    costCBills: 0,
    battleValue: 0,
    introductionYear: 3069,
    special: ['For mechs 10-55 tons', 'Double jump distance'],
  },
  {
    id: 'improved-jump-jet-medium',
    name: 'Improved Jump Jet (Medium)',
    category: MiscEquipmentCategory.JUMP_JET,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    weight: 2, // For mechs 60-85 tons
    criticalSlots: 2,
    costCBills: 0,
    battleValue: 0,
    introductionYear: 3069,
    special: ['For mechs 60-85 tons', 'Double jump distance'],
  },
  {
    id: 'improved-jump-jet-heavy',
    name: 'Improved Jump Jet (Heavy)',
    category: MiscEquipmentCategory.JUMP_JET,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    weight: 4, // For mechs 90-100 tons
    criticalSlots: 2,
    costCBills: 0,
    battleValue: 0,
    introductionYear: 3069,
    special: ['For mechs 90-100 tons', 'Double jump distance'],
  },
  // Partial Wing
  {
    id: 'partial-wing',
    name: 'Partial Wing',
    category: MiscEquipmentCategory.JUMP_JET,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    weight: 0, // Variable: mechTonnage × 0.05 to 0.5t
    criticalSlots: 6, // 3 per side torso
    costCBills: 0, // Variable: weight × 50000
    battleValue: 0,
    introductionYear: 3067,
    special: ['+1 Jump MP', '+2 heat dissipation at altitude'],
    isVariable: true,
    variableConfig: {
      variableProperties: [VariableProperty.WEIGHT, VariableProperty.COST],
      calculationId: 'partial-wing',
      inputRequirements: ['mechTonnage'],
    },
  },
] as const;

// ============================================================================
// MOVEMENT ENHANCEMENTS
// ============================================================================

export const MOVEMENT_EQUIPMENT: readonly IMiscEquipment[] = [
  {
    id: 'masc',
    name: 'MASC',
    category: MiscEquipmentCategory.MOVEMENT,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    weight: 0, // Variable: ceil(engineRating / 20)
    criticalSlots: 0, // Variable: ceil(engineRating / 20)
    costCBills: 0, // Variable: mechTonnage × 1000
    battleValue: 0,
    introductionYear: 2740,
    special: ['Double running speed for one turn', 'Risk of leg damage'],
    isVariable: true,
    variableConfig: {
      variableProperties: [VariableProperty.WEIGHT, VariableProperty.SLOTS, VariableProperty.COST],
      calculationId: 'masc',
      inputRequirements: ['engineRating', 'mechTonnage', 'techBase'],
    },
  },
  {
    id: 'clan-masc',
    name: 'MASC (Clan)',
    category: MiscEquipmentCategory.MOVEMENT,
    techBase: TechBase.CLAN,
    rulesLevel: RulesLevel.STANDARD,
    weight: 0, // Variable: ceil(engineRating / 25)
    criticalSlots: 0, // Variable: ceil(engineRating / 25)
    costCBills: 0, // Variable: mechTonnage × 1000
    battleValue: 0,
    introductionYear: 2827,
    special: ['Double running speed for one turn', 'Risk of leg damage'],
    isVariable: true,
    variableConfig: {
      variableProperties: [VariableProperty.WEIGHT, VariableProperty.SLOTS, VariableProperty.COST],
      calculationId: 'masc',
      inputRequirements: ['engineRating', 'mechTonnage', 'techBase'],
    },
  },
  {
    id: 'supercharger',
    name: 'Supercharger',
    category: MiscEquipmentCategory.MOVEMENT,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    weight: 0, // Variable: ceil(engineWeight / 10) to 0.5t
    criticalSlots: 1,
    costCBills: 0, // Variable: engineWeight × 10000
    battleValue: 0,
    introductionYear: 3068,
    special: ['+1 running MP', 'Risk of engine damage'],
    isVariable: true,
    variableConfig: {
      variableProperties: [VariableProperty.WEIGHT, VariableProperty.COST],
      calculationId: 'supercharger',
      inputRequirements: ['engineWeight'],
    },
  },
] as const;

// ============================================================================
// MYOMER SYSTEMS
// ============================================================================

export const MYOMER_SYSTEMS: readonly IMiscEquipment[] = [
  {
    id: 'tsm',
    name: 'Triple Strength Myomer',
    category: MiscEquipmentCategory.MYOMER,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    weight: 0, // Replaces standard myomer
    criticalSlots: 6, // Distributed across torso/legs
    costCBills: 0, // Variable: mechTonnage × 16000
    battleValue: 0,
    introductionYear: 3050,
    special: ['+2 walking MP at 9+ heat', 'Double physical attack damage'],
    isVariable: true,
    variableConfig: {
      variableProperties: [VariableProperty.COST],
      calculationId: 'tsm',
      inputRequirements: ['mechTonnage'],
    },
  },
  {
    id: 'industrial-tsm',
    name: 'Industrial TSM',
    category: MiscEquipmentCategory.MYOMER,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    weight: 0,
    criticalSlots: 6,
    costCBills: 0,
    battleValue: 0,
    introductionYear: 2680,
    special: ['Improved lifting capacity'],
  },
] as const;

// ============================================================================
// DEFENSIVE EQUIPMENT
// ============================================================================

export const DEFENSIVE_EQUIPMENT: readonly IMiscEquipment[] = [
  {
    id: 'ams',
    name: 'Anti-Missile System',
    category: MiscEquipmentCategory.DEFENSIVE,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    weight: 0.5,
    criticalSlots: 1,
    costCBills: 100000,
    battleValue: 32,
    introductionYear: 2617,
    special: ['Intercepts incoming missiles', 'Requires ammo'],
  },
  {
    id: 'clan-ams',
    name: 'Anti-Missile System (Clan)',
    category: MiscEquipmentCategory.DEFENSIVE,
    techBase: TechBase.CLAN,
    rulesLevel: RulesLevel.STANDARD,
    weight: 0.5,
    criticalSlots: 1,
    costCBills: 100000,
    battleValue: 32,
    introductionYear: 2831,
    special: ['Intercepts incoming missiles', 'Requires ammo'],
  },
  {
    id: 'laser-ams',
    name: 'Laser Anti-Missile System',
    category: MiscEquipmentCategory.DEFENSIVE,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    weight: 1.5,
    criticalSlots: 2,
    costCBills: 225000,
    battleValue: 45,
    introductionYear: 3059,
    special: ['Intercepts incoming missiles', 'No ammo required', 'Generates heat'],
  },
  {
    id: 'clan-laser-ams',
    name: 'Laser Anti-Missile System (Clan)',
    category: MiscEquipmentCategory.DEFENSIVE,
    techBase: TechBase.CLAN,
    rulesLevel: RulesLevel.ADVANCED,
    weight: 1,
    criticalSlots: 1,
    costCBills: 225000,
    battleValue: 45,
    introductionYear: 3048,
    special: ['Intercepts incoming missiles', 'No ammo required', 'Generates heat'],
  },
  {
    id: 'reactive-armor',
    name: 'Reactive Armor',
    category: MiscEquipmentCategory.DEFENSIVE,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    weight: 0, // Replaces standard armor
    criticalSlots: 14,
    costCBills: 0, // Varies by location
    battleValue: 0,
    introductionYear: 3063,
    special: ['Reduced damage from missiles and ballistics', 'Increased damage from energy'],
  },
  {
    id: 'stealth-armor',
    name: 'Stealth Armor',
    category: MiscEquipmentCategory.DEFENSIVE,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.ADVANCED,
    weight: 0, // Replaces standard armor
    criticalSlots: 12,
    costCBills: 0,
    battleValue: 0,
    introductionYear: 3063,
    special: ['Requires Guardian ECM', '+2 to hit at medium/long range'],
  },
] as const;

// ============================================================================
// COMBINED EXPORTS
// ============================================================================

/**
 * All misc equipment combined
 */
export const ALL_MISC_EQUIPMENT: readonly IMiscEquipment[] = [
  ...HEAT_SINKS,
  ...JUMP_JETS,
  ...MOVEMENT_EQUIPMENT,
  ...MYOMER_SYSTEMS,
  ...DEFENSIVE_EQUIPMENT,
] as const;

/**
 * Get misc equipment by ID
 */
export function getMiscEquipmentById(id: string): IMiscEquipment | undefined {
  return ALL_MISC_EQUIPMENT.find(e => e.id === id);
}

/**
 * Get misc equipment by category
 */
export function getMiscEquipmentByCategory(category: MiscEquipmentCategory): IMiscEquipment[] {
  return ALL_MISC_EQUIPMENT.filter(e => e.category === category);
}

/**
 * Get misc equipment by tech base
 */
export function getMiscEquipmentByTechBase(techBase: TechBase): IMiscEquipment[] {
  return ALL_MISC_EQUIPMENT.filter(e => e.techBase === techBase);
}

