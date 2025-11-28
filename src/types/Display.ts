/**
 * Display.ts
 * Presentation-centric types shared by the compendium, comparison, and
 * visualization layers.
 */

import { FullUnit, WeaponOrEquipmentItem } from './Unit';

export interface IUnitDisplayOptions {
  readonly showBasicInfo?: boolean;
  readonly showMovement?: boolean;
  readonly showArmor?: boolean;
  readonly showStructure?: boolean;
  readonly showHeatManagement?: boolean;
  readonly showEquipmentSummary?: boolean;
  readonly showCriticalSlotSummary?: boolean;
  readonly showBuildRecommendations?: boolean;
  readonly showTechnicalSpecs?: boolean;
  readonly showFluffText?: boolean;
  readonly compact?: boolean;
  readonly interactive?: boolean;
}

export type UnitDisplayOptions = IUnitDisplayOptions;

export interface IHeatManagementInfo {
  readonly totalHeatGeneration: number;
  readonly totalHeatDissipation: number;
  readonly heatBalance: number;
  readonly totalHeatSinks: number;
  readonly engineIntegratedHeatSinks: number;
  readonly externalHeatSinks: number;
  readonly engineHeatSinkCapacity: number;
  readonly heatSinkType: string;
  readonly overheatingRisk: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

export type HeatManagementInfo = IHeatManagementInfo;

export interface IArmorInfo {
  readonly type: string;
  readonly totalArmorPoints: number;
  readonly maxArmorPoints: number;
  readonly armorEfficiency: number;
  readonly locationBreakdown: Array<{
    readonly location: string;
    readonly armorPoints: number;
    readonly maxArmorPoints: number;
    readonly rearArmorPoints?: number;
    readonly maxRearArmorPoints?: number;
  }>;
  readonly armorTonnage: number;
}

export type ArmorInfo = IArmorInfo;

export interface IStructureInfo {
  readonly type: string;
  readonly totalInternalStructure: number;
  readonly structureTonnage: number;
  readonly structureEfficiency: number;
}

export type StructureInfo = IStructureInfo;

export interface IEquipmentSummaryEntry {
  readonly category: string;
  readonly count: number;
  readonly tonnage: number;
  readonly items: string[];
}

export interface IEquipmentSummary {
  readonly totalEquipmentCount: number;
  readonly totalEquipmentTonnage: number;
  readonly equipmentByCategory: IEquipmentSummaryEntry[];
  readonly weaponSummary: {
    readonly totalWeapons: number;
    readonly energyWeapons: number;
    readonly ballisticWeapons: number;
    readonly missileWeapons: number;
    readonly physicalWeapons: number;
  };
}

export type EquipmentSummary = IEquipmentSummary;

export interface ICriticalSlotSummaryEntry {
  readonly location: string;
  readonly totalSlots: number;
  readonly usedSlots: number;
  readonly availableSlots: number;
  readonly utilizationPercentage: number;
}

export interface ICriticalSlotSummary {
  readonly totalSlots: number;
  readonly usedSlots: number;
  readonly availableSlots: number;
  readonly locationBreakdown: ICriticalSlotSummaryEntry[];
}

export type CriticalSlotSummary = ICriticalSlotSummary;

export interface IBuildRecommendation {
  readonly id: string;
  readonly type: 'heat_management' | 'protection' | 'optimization' | 'constraint_violation';
  readonly priority: 'high' | 'medium' | 'low';
  readonly title: string;
  readonly description: string;
  readonly suggestedActions: string[];
  readonly autoApplyable: boolean;
}

export type BuildRecommendation = IBuildRecommendation;

export interface ITechnicalSpecs {
  readonly battleValue: number;
  readonly costCBills: number;
  readonly techLevel: string;
  readonly rulesLevel: string;
  readonly walkSpeed: number;
  readonly runSpeed: number;
  readonly jumpSpeed: number;
  readonly tonnageBreakdown: {
    readonly chassis: number;
    readonly engine: number;
    readonly heatSinks: number;
    readonly armor: number;
    readonly structure: number;
    readonly equipment: number;
    readonly weapons: number;
    readonly ammunition: number;
  };
}

export type TechnicalSpecs = ITechnicalSpecs;

export interface IUnitDisplayData {
  readonly unit: FullUnit;
  readonly loadout: UnitEquipmentItem[];
  readonly availableEquipment: EquipmentItem[];
  readonly heatManagement?: IHeatManagementInfo;
  readonly armorInfo?: IArmorInfo;
  readonly structureInfo?: IStructureInfo;
  readonly equipmentSummary?: IEquipmentSummary;
  readonly criticalSlotSummary?: ICriticalSlotSummary;
  readonly buildRecommendations?: IBuildRecommendation[];
  readonly technicalSpecs?: ITechnicalSpecs;
}

export type UnitDisplayData = IUnitDisplayData;

export interface IUnitAnalysisContext {
  readonly includeHeatAnalysis: boolean;
  readonly includeArmorAnalysis: boolean;
  readonly includeEquipmentAnalysis: boolean;
  readonly includeBuildRecommendations: boolean;
  readonly unitType: string;
}

export type UnitAnalysisContext = IUnitAnalysisContext;

// =============================================================================
// Customizer / Variant Comparison
// =============================================================================

export interface ICriticalLocation {
  readonly location: string;
  readonly slots: string[];
}

export type CriticalLocation = ICriticalLocation;

export interface IUnitEquipmentItem extends WeaponOrEquipmentItem {
  readonly turret_mounted?: boolean;
  readonly linked_id?: string | number;
}

export type UnitEquipmentItem = IUnitEquipmentItem;

export interface ICustomizableUnitData {
  readonly chassis: string;
  readonly model: string;
  readonly mass: number;
  readonly tech_base: string;
  readonly era: string;
  readonly type?: string;
  readonly config?: string;
  readonly movement?: {
    readonly walk_mp?: number;
    readonly run_mp?: number;
    readonly jump_mp?: number;
  };
  readonly armor?: {
    readonly type: string;
    readonly locations: Array<{
      readonly location: string;
      readonly armor_points: number;
      readonly rear_armor_points?: number;
    }>;
  };
  readonly engine?: {
    readonly type: string;
    readonly rating: number;
  };
  readonly structure?: {
    readonly type: string;
  };
  readonly heat_sinks?: {
    readonly type: string;
    readonly count: number;
  };
  readonly weapons_and_equipment: UnitEquipmentItem[];
  readonly criticals: CriticalLocation[];
  readonly [key: string]: unknown;
}

export interface ICustomizableUnit {
  readonly id: string | number;
  readonly chassis: string;
  readonly model: string;
  readonly mass: number;
  readonly type: string;
  readonly data: ICustomizableUnitData;
}

export type CustomizableUnitData = ICustomizableUnitData;
export type CustomizableUnit = ICustomizableUnit;

export interface IEquipmentItem {
  readonly id: string | number;
  readonly internal_id: string;
  readonly name: string;
  readonly type: string;
  readonly category: string;
  readonly tech_base: string;
  readonly critical_slots: number;
  readonly tonnage: number;
  readonly cost_cbills?: number;
  readonly battle_value?: number;
  readonly weapon_details?: unknown;
  readonly ammo_details?: unknown;
  readonly data: unknown;
}

export type EquipmentItem = IEquipmentItem;

export interface IEquipmentToRemoveDetails {
  readonly name: string;
  readonly location: string;
  readonly startIndex: number;
  readonly count: number;
}

export interface ILoadoutComparison {
  readonly onlyInA: UnitEquipmentItem[];
  readonly onlyInB: UnitEquipmentItem[];
}

export type LoadoutComparison = ILoadoutComparison;

export interface ICriticalsComparisonDifference {
  readonly location: string;
  readonly slotsA: string[];
  readonly slotsB: string[];
}

export type CriticalsComparisonDifference = ICriticalsComparisonDifference;

export interface ICustomVariantCustomData {
  readonly loadout: UnitEquipmentItem[];
  readonly criticals: CriticalLocation[];
}

export interface ICustomVariantDetail {
  readonly id: number;
  readonly base_unit_id: number;
  readonly variant_name: string;
  readonly notes?: string | null;
  readonly custom_data: ICustomVariantCustomData;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface IComparisonResult {
  readonly loadoutChanges: ILoadoutComparison;
  readonly criticalsDifferences: ICriticalsComparisonDifference[];
  readonly variantADetails: ICustomVariantDetail;
  readonly variantBDetails: ICustomVariantDetail;
  readonly totalEquipmentTonnageA: number;
  readonly totalEquipmentTonnageB: number;
}

export type ComparisonResult = IComparisonResult;


