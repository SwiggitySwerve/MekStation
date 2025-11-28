/**
 * Lightweight component database types used by the editor UI and helpers.
 * Keeps the rich metadata objects well-typed without depending on legacy core types.
 */

import { ComponentCategory } from './ComponentType';
import { RulesLevel, TechBase, TechLevel } from './TechBase';

export type ComponentTechBase = TechBase | 'Inner Sphere' | 'Clan';

export interface ComponentSpec {
  readonly name: string;
  readonly id: string;
  readonly criticalSlots: number;
  readonly techLevel: TechLevel | string;
  readonly rulesLevel: RulesLevel | string;
  readonly introductionYear: number;
  readonly description?: string;
  readonly gameEffect?: string;
  readonly specialRules?: readonly string[];
  readonly features?: readonly string[];
  readonly isDefault?: boolean;
  readonly weight?: number;
  readonly weightMultiplier?: number;
  readonly weightMod?: number;
  readonly totalSlots?: number;
  readonly armorPointsPerTon?: number;
  readonly maxArmorPoints?: number;
  readonly heatGeneration?: number;
  readonly heatDissipation?: number;
  readonly jumpMP?: number;
  readonly allowedLocations?: readonly string[];
  readonly [key: string]: string | number | boolean | readonly string[] | undefined;
}

export type ComponentDatabase = Partial<
  Record<ComponentCategory, Partial<Record<ComponentTechBase | string, ComponentSpec[]>>>
>;

export interface ComponentDatabaseStats {
  readonly totalComponents: number;
  readonly categoriesCount: number;
  readonly techBasesCount: number;
  readonly averageComponentsPerCategory: number;
}

