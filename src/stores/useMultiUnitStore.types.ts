/**
 * Multi-Unit Tab Store Types
 *
 * Type definitions for multi-unit tab management.
 *
 * @spec openspec/specs/multi-unit-tabs/spec.md
 * @spec openspec/specs/component-configuration/spec.md
 */

import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { CockpitType } from '@/types/construction/CockpitType';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import {
  TechBaseMode,
  TechBaseComponent,
  IComponentTechBases,
} from '@/types/construction/TechBaseConfiguration';
import { TechBase } from '@/types/enums/TechBase';
import { MechConfiguration, UnitType } from '@/types/unit/BattleMechInterfaces';
import { JumpJetType } from '@/utils/construction/movementCalculations';

// =============================================================================
// Component Selections Interface
// =============================================================================

/**
 * All component selections for a unit
 */
export interface IComponentSelections {
  // Engine
  engineType: EngineType;
  engineRating: number;

  // Gyro
  gyroType: GyroType;

  // Structure
  internalStructureType: InternalStructureType;

  // Cockpit
  cockpitType: CockpitType;

  // Heat Sinks
  heatSinkType: HeatSinkType;
  heatSinkCount: number;

  // Armor
  armorType: ArmorTypeEnum;

  // Jump Jets
  jumpMP?: number;
  jumpJetType?: JumpJetType;
}

// =============================================================================
// Unit Tab Interface
// =============================================================================

/**
 * Unit tab state
 *
 * Contains all configuration state for a single unit, persisted across
 * customizer tab navigation and browser sessions.
 */
export interface UnitTab {
  /** Unique tab identifier */
  readonly id: string;
  /** Display name (user-editable) */
  name: string;
  /** Unit type */
  readonly unitType: UnitType;
  /** Tonnage */
  readonly tonnage: number;
  /** Tech base (base value for the unit) */
  readonly techBase: TechBase;
  /** Mech configuration */
  readonly configuration: MechConfiguration;
  /** Has unsaved changes */
  isModified: boolean;
  /** Creation timestamp */
  readonly createdAt: number;
  /** Last modified timestamp */
  lastModifiedAt: number;

  // ==========================================================================
  // Tech Base Configuration (persisted across tab navigation)
  // ==========================================================================

  /** Tech base mode: inner_sphere, clan, or mixed */
  techBaseMode: TechBaseMode;
  /** Per-component tech base settings (used when techBaseMode is 'mixed') */
  componentTechBases: IComponentTechBases;

  // ==========================================================================
  // Component Selections (persisted across tab navigation)
  // ==========================================================================

  /** All component type selections */
  componentSelections: IComponentSelections;
}

/**
 * Unit template for creating new tabs
 */
export interface UnitTemplate {
  readonly id: string;
  readonly name: string;
  readonly tonnage: number;
  readonly techBase: TechBase;
  readonly walkMP: number;
  readonly jumpMP: number;
}

/**
 * Default unit templates
 */
export const UNIT_TEMPLATES: readonly UnitTemplate[] = [
  {
    id: 'light',
    name: 'Light Mech',
    tonnage: 25,
    techBase: TechBase.INNER_SPHERE,
    walkMP: 8,
    jumpMP: 0,
  },
  {
    id: 'medium',
    name: 'Medium Mech',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
    walkMP: 5,
    jumpMP: 0,
  },
  {
    id: 'heavy',
    name: 'Heavy Mech',
    tonnage: 70,
    techBase: TechBase.INNER_SPHERE,
    walkMP: 4,
    jumpMP: 0,
  },
  {
    id: 'assault',
    name: 'Assault Mech',
    tonnage: 100,
    techBase: TechBase.INNER_SPHERE,
    walkMP: 3,
    jumpMP: 0,
  },
];

// =============================================================================
// Store State Interface
// =============================================================================

/**
 * Multi-unit store state
 */
export interface MultiUnitState {
  // Tab state
  tabs: UnitTab[];
  activeTabId: string | null;

  // UI state
  isLoading: boolean;
  isNewTabModalOpen: boolean;

  // Tab management actions
  createTab: (template: UnitTemplate, name?: string) => string;
  duplicateTab: (tabId: string) => string | null;
  closeTab: (tabId: string) => void;
  selectTab: (tabId: string) => void;
  renameTab: (tabId: string, name: string) => void;
  markModified: (tabId: string, modified?: boolean) => void;
  openNewTabModal: () => void;
  closeNewTabModal: () => void;
  getActiveTab: () => UnitTab | null;

  // Tech base configuration actions
  updateTechBaseMode: (tabId: string, mode: TechBaseMode) => void;
  updateComponentTechBase: (
    tabId: string,
    component: TechBaseComponent,
    techBase: TechBase,
  ) => void;
  setAllComponentTechBases: (
    tabId: string,
    techBases: IComponentTechBases,
  ) => void;

  // Component selection actions
  updateEngineType: (tabId: string, engineType: EngineType) => void;
  updateEngineRating: (tabId: string, rating: number) => void;
  updateGyroType: (tabId: string, gyroType: GyroType) => void;
  updateStructureType: (
    tabId: string,
    structureType: InternalStructureType,
  ) => void;
  updateCockpitType: (tabId: string, cockpitType: CockpitType) => void;
  updateHeatSinkType: (tabId: string, heatSinkType: HeatSinkType) => void;
  updateHeatSinkCount: (tabId: string, count: number) => void;
  updateArmorType: (tabId: string, armorType: ArmorTypeEnum) => void;
  updateComponentSelections: (
    tabId: string,
    selections: Partial<IComponentSelections>,
  ) => void;

  // Persistence helpers
  setLoading: (loading: boolean) => void;
}
