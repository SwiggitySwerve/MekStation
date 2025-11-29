/**
 * Component Option Filtering - Compatibility layer
 * Provides component option utilities for UI compatibility
 * 
 * TODO: Replace with spec-driven implementation from Phase 2
 */

import { TechBase } from '../types/enums/TechBase';
import { RulesLevel } from '../types/enums/RulesLevel';
import { 
  EngineType, 
  GyroType, 
  StructureType, 
  ArmorType as ArmorTypeEnum, 
  HeatSinkType 
} from '../types/systemComponents';

export interface ComponentOption {
  type: string;
  name: string;
  techBase: TechBase | 'Both';
  rulesLevel: RulesLevel;
  weight?: number;
  slots?: number;
}

// Structure type options
const STRUCTURE_OPTIONS: ComponentOption[] = [
  { type: 'Standard', name: 'Standard', techBase: 'Both', rulesLevel: RulesLevel.INTRODUCTORY },
  { type: 'Endo Steel', name: 'Endo Steel (IS)', techBase: TechBase.INNER_SPHERE, rulesLevel: RulesLevel.STANDARD, slots: 14 },
  { type: 'Endo Steel (Clan)', name: 'Endo Steel (Clan)', techBase: TechBase.CLAN, rulesLevel: RulesLevel.STANDARD, slots: 7 },
  { type: 'Composite', name: 'Composite', techBase: TechBase.INNER_SPHERE, rulesLevel: RulesLevel.EXPERIMENTAL },
  { type: 'Reinforced', name: 'Reinforced', techBase: 'Both', rulesLevel: RulesLevel.EXPERIMENTAL },
];

// Armor type options
const ARMOR_OPTIONS: ComponentOption[] = [
  { type: 'Standard', name: 'Standard', techBase: 'Both', rulesLevel: RulesLevel.INTRODUCTORY },
  { type: 'Ferro-Fibrous', name: 'Ferro-Fibrous (IS)', techBase: TechBase.INNER_SPHERE, rulesLevel: RulesLevel.STANDARD, slots: 14 },
  { type: 'Ferro-Fibrous (Clan)', name: 'Ferro-Fibrous (Clan)', techBase: TechBase.CLAN, rulesLevel: RulesLevel.STANDARD, slots: 7 },
  { type: 'Light Ferro-Fibrous', name: 'Light Ferro-Fibrous', techBase: TechBase.INNER_SPHERE, rulesLevel: RulesLevel.STANDARD, slots: 7 },
  { type: 'Heavy Ferro-Fibrous', name: 'Heavy Ferro-Fibrous', techBase: TechBase.INNER_SPHERE, rulesLevel: RulesLevel.ADVANCED, slots: 21 },
  { type: 'Stealth', name: 'Stealth', techBase: TechBase.INNER_SPHERE, rulesLevel: RulesLevel.ADVANCED, slots: 12 },
];

// Engine type options
const ENGINE_OPTIONS: ComponentOption[] = [
  { type: 'Standard', name: 'Standard Fusion', techBase: 'Both', rulesLevel: RulesLevel.INTRODUCTORY },
  { type: 'XL', name: 'XL Fusion (IS)', techBase: TechBase.INNER_SPHERE, rulesLevel: RulesLevel.STANDARD },
  { type: 'XL (Clan)', name: 'XL Fusion (Clan)', techBase: TechBase.CLAN, rulesLevel: RulesLevel.STANDARD },
  { type: 'Light', name: 'Light Fusion', techBase: TechBase.INNER_SPHERE, rulesLevel: RulesLevel.STANDARD },
  { type: 'XXL', name: 'XXL Fusion', techBase: 'Both', rulesLevel: RulesLevel.EXPERIMENTAL },
  { type: 'Compact', name: 'Compact Fusion', techBase: TechBase.INNER_SPHERE, rulesLevel: RulesLevel.ADVANCED },
  { type: 'ICE', name: 'Internal Combustion', techBase: 'Both', rulesLevel: RulesLevel.INTRODUCTORY },
];

// Heat sink type options
const HEAT_SINK_OPTIONS: ComponentOption[] = [
  { type: 'Single', name: 'Single Heat Sink', techBase: 'Both', rulesLevel: RulesLevel.INTRODUCTORY },
  { type: 'Double', name: 'Double Heat Sink (IS)', techBase: TechBase.INNER_SPHERE, rulesLevel: RulesLevel.STANDARD },
  { type: 'Double (Clan)', name: 'Double Heat Sink (Clan)', techBase: TechBase.CLAN, rulesLevel: RulesLevel.STANDARD },
  { type: 'Compact', name: 'Compact Heat Sink', techBase: TechBase.INNER_SPHERE, rulesLevel: RulesLevel.EXPERIMENTAL },
];

// Gyro type options
const GYRO_OPTIONS: ComponentOption[] = [
  { type: 'Standard', name: 'Standard Gyro', techBase: 'Both', rulesLevel: RulesLevel.INTRODUCTORY, slots: 4 },
  { type: 'XL', name: 'XL Gyro', techBase: 'Both', rulesLevel: RulesLevel.STANDARD, slots: 6 },
  { type: 'Compact', name: 'Compact Gyro', techBase: TechBase.INNER_SPHERE, rulesLevel: RulesLevel.ADVANCED, slots: 2 },
  { type: 'Heavy-Duty', name: 'Heavy-Duty Gyro', techBase: TechBase.INNER_SPHERE, rulesLevel: RulesLevel.ADVANCED, slots: 4 },
];

function filterByTechBase(options: ComponentOption[], techBase: TechBase): ComponentOption[] {
  return options.filter(opt => opt.techBase === 'Both' || opt.techBase === techBase);
}

function filterByRulesLevel(options: ComponentOption[], maxLevel: RulesLevel): ComponentOption[] {
  const levelOrder = {
    [RulesLevel.INTRODUCTORY]: 0,
    [RulesLevel.STANDARD]: 1,
    [RulesLevel.ADVANCED]: 2,
    [RulesLevel.EXPERIMENTAL]: 3,
  };
  const maxOrder = levelOrder[maxLevel];
  return options.filter(opt => levelOrder[opt.rulesLevel] <= maxOrder);
}

interface ConfigLike {
  techBase?: TechBase | string;
  rulesLevel?: RulesLevel | string;
}

function extractTechBase(configOrTechBase: TechBase | ConfigLike | string): TechBase {
  if (typeof configOrTechBase === 'string') {
    // String could be a TechBase enum value
    if (configOrTechBase === 'Inner Sphere') return TechBase.INNER_SPHERE;
    if (configOrTechBase === 'Clan') return TechBase.CLAN;
    if (configOrTechBase === 'Mixed') return TechBase.MIXED;
    return TechBase.INNER_SPHERE;
  }
  if (typeof configOrTechBase === 'object' && configOrTechBase !== null) {
    if ('techBase' in configOrTechBase && configOrTechBase.techBase) {
      const tb = configOrTechBase.techBase;
      if (typeof tb === 'string') {
        if (tb === 'Inner Sphere') return TechBase.INNER_SPHERE;
        if (tb === 'Clan') return TechBase.CLAN;
        if (tb === 'Mixed') return TechBase.MIXED;
      }
      return tb as TechBase;
    }
    return TechBase.INNER_SPHERE;
  }
  return TechBase.INNER_SPHERE;
}

function extractRulesLevel(configOrRulesLevel: RulesLevel | ConfigLike | undefined, defaultLevel: RulesLevel = RulesLevel.EXPERIMENTAL): RulesLevel {
  if (!configOrRulesLevel) return defaultLevel;
  if (typeof configOrRulesLevel === 'string') {
    if (configOrRulesLevel === 'Introductory') return RulesLevel.INTRODUCTORY;
    if (configOrRulesLevel === 'Standard') return RulesLevel.STANDARD;
    if (configOrRulesLevel === 'Advanced') return RulesLevel.ADVANCED;
    if (configOrRulesLevel === 'Experimental') return RulesLevel.EXPERIMENTAL;
    return defaultLevel;
  }
  if (typeof configOrRulesLevel === 'object' && configOrRulesLevel !== null && 'rulesLevel' in configOrRulesLevel) {
    const rl = configOrRulesLevel.rulesLevel;
    if (typeof rl === 'string') {
      if (rl === 'Introductory') return RulesLevel.INTRODUCTORY;
      if (rl === 'Standard') return RulesLevel.STANDARD;
      if (rl === 'Advanced') return RulesLevel.ADVANCED;
      if (rl === 'Experimental') return RulesLevel.EXPERIMENTAL;
    }
    return (rl as RulesLevel) || defaultLevel;
  }
  return defaultLevel;
}

export function getAvailableStructureTypes(configOrTechBase: TechBase | ConfigLike, rulesLevel?: RulesLevel): ComponentOption[] {
  const techBase = extractTechBase(configOrTechBase);
  const level = extractRulesLevel(typeof configOrTechBase === 'object' ? configOrTechBase : undefined, rulesLevel);
  return filterByRulesLevel(filterByTechBase(STRUCTURE_OPTIONS, techBase), level);
}

export function getAvailableArmorTypes(configOrTechBase: TechBase | ConfigLike, rulesLevel?: RulesLevel): ComponentOption[] {
  const techBase = extractTechBase(configOrTechBase);
  const level = extractRulesLevel(typeof configOrTechBase === 'object' ? configOrTechBase : undefined, rulesLevel);
  return filterByRulesLevel(filterByTechBase(ARMOR_OPTIONS, techBase), level);
}

export function getAvailableEngineTypes(configOrTechBase: TechBase | ConfigLike, rulesLevel?: RulesLevel): ComponentOption[] {
  const techBase = extractTechBase(configOrTechBase);
  const level = extractRulesLevel(typeof configOrTechBase === 'object' ? configOrTechBase : undefined, rulesLevel);
  return filterByRulesLevel(filterByTechBase(ENGINE_OPTIONS, techBase), level);
}

export function getAvailableHeatSinkTypes(configOrTechBase: TechBase | ConfigLike, rulesLevel?: RulesLevel): ComponentOption[] {
  const techBase = extractTechBase(configOrTechBase);
  const level = extractRulesLevel(typeof configOrTechBase === 'object' ? configOrTechBase : undefined, rulesLevel);
  return filterByRulesLevel(filterByTechBase(HEAT_SINK_OPTIONS, techBase), level);
}

export function getAvailableGyroTypes(configOrTechBase: TechBase | ConfigLike, rulesLevel?: RulesLevel): ComponentOption[] {
  const techBase = extractTechBase(configOrTechBase);
  const level = extractRulesLevel(typeof configOrTechBase === 'object' ? configOrTechBase : undefined, rulesLevel);
  return filterByRulesLevel(filterByTechBase(GYRO_OPTIONS, techBase), level);
}
