/**
 * Component Interface Definitions
 *
 * Core interfaces for BattleTech construction components.
 * These types define the structure of armor, structure, engines, gyros, cockpits, and heat sinks.
 *
 * @module types/core/ComponentInterfaces
 */

import { TechBase, RulesLevel, ComponentCategory } from './index';

export interface IArmorDef {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly category: ComponentCategory;
  readonly pointsPerTon: number;
  readonly criticalSlots: number;
  readonly techBase?: TechBase | 'Both';
  readonly techLevel?: string;
  readonly rulesLevel?: RulesLevel;
  readonly costMultiplier?: number;
  readonly maxPointsPerLocationMultiplier?: number;
  readonly introductionYear?: number;
}

export interface IStructureDef {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly category: ComponentCategory;
  readonly weightMultiplier: number;
  readonly criticalSlots: number;
  readonly techBase?: TechBase | 'Both';
  readonly rulesLevel?: RulesLevel;
}

export interface IEngineDef {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly category: ComponentCategory;
  readonly weightMultiplier: number;
  readonly criticalSlots: { ct: number; sideTorso: number };
  readonly techBase?: TechBase | 'Both';
  readonly rulesLevel?: RulesLevel;
}

export interface IGyroDef {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly category: ComponentCategory;
  readonly weightMultiplier: number;
  readonly criticalSlots: number;
  readonly techBase?: TechBase | 'Both';
  readonly rulesLevel?: RulesLevel;
}

export interface ICockpitDef {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly category: ComponentCategory;
  readonly weight: number;
  readonly criticalSlots: number;
  readonly techBase?: TechBase | 'Both';
  readonly rulesLevel?: RulesLevel;
}

export interface IHeatSinkDef {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly category: ComponentCategory;
  readonly dissipation: number;
  readonly weight: number;
  readonly criticalSlots: number;
  readonly techBase?: TechBase | 'Both';
  readonly rulesLevel?: RulesLevel;
}
