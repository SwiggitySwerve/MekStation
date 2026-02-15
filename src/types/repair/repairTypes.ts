import type { PartQuality } from '@/types/campaign/quality';

export enum RepairType {
  Armor = 'armor',
  Structure = 'structure',
  ComponentRepair = 'component_repair',
  ComponentReplace = 'component_replace',
}

export enum RepairJobStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Completed = 'completed',
  Cancelled = 'cancelled',
  Blocked = 'blocked',
}

export enum UnitLocation {
  Head = 'head',
  CenterTorso = 'center_torso',
  CenterTorsoRear = 'center_torso_rear',
  LeftTorso = 'left_torso',
  LeftTorsoRear = 'left_torso_rear',
  RightTorso = 'right_torso',
  RightTorsoRear = 'right_torso_rear',
  LeftArm = 'left_arm',
  RightArm = 'right_arm',
  LeftLeg = 'left_leg',
  RightLeg = 'right_leg',
}

export const REPAIR_COSTS = {
  ARMOR_PER_POINT: 100,
  STRUCTURE_PER_POINT: 500,
  CRITICAL_DAMAGE_MULTIPLIER: 1.5,
  ARMOR_TIME_PER_10: 1,
  STRUCTURE_TIME_PER_POINT: 2,
  COMPONENT_REPAIR_RATIO: 0.5,
  FIELD_REPAIR_ARMOR_PERCENT: 0.25,
  FIELD_REPAIR_SUPPLIES_PER_POINT: 0.5,
} as const;

export const ARMOR_COST_MODIFIERS: Record<string, number> = {
  standard: 1.0,
  'ferro-fibrous': 1.5,
  'light-ferro-fibrous': 1.25,
  'heavy-ferro-fibrous': 2.0,
  stealth: 3.0,
  hardened: 2.5,
  reactive: 2.0,
  reflective: 2.0,
};

export const STRUCTURE_COST_MODIFIERS: Record<string, number> = {
  standard: 1.0,
  'endo-steel': 1.5,
  composite: 1.75,
  reinforced: 2.0,
};

export interface ILocationDamage {
  readonly location: UnitLocation;
  readonly armorDamage: number;
  readonly armorMax: number;
  readonly structureDamage: number;
  readonly structureMax: number;
  readonly destroyedComponents: readonly string[];
  readonly damagedComponents: readonly string[];
}

export interface IDamageAssessment {
  readonly unitId: string;
  readonly unitName: string;
  readonly locationDamage: readonly ILocationDamage[];
  readonly totalArmorDamage: number;
  readonly totalArmorMax: number;
  readonly totalStructureDamage: number;
  readonly totalStructureMax: number;
  readonly allDestroyedComponents: readonly string[];
  readonly allDamagedComponents: readonly string[];
  readonly operationalPercent: number;
  readonly isDestroyed: boolean;
}

export interface IRepairItem {
  readonly id: string;
  readonly type: RepairType;
  readonly location: UnitLocation;
  readonly pointsToRestore?: number;
  readonly componentName?: string;
  readonly cost: number;
  readonly timeHours: number;
  readonly selected: boolean;
}

export interface IRepairJob {
  readonly id: string;
  readonly unitId: string;
  readonly unitName: string;
  readonly campaignId: string;
  readonly status: RepairJobStatus;
  readonly items: readonly IRepairItem[];
  readonly totalCost: number;
  readonly totalTimeHours: number;
  readonly timeRemainingHours: number;
  readonly priority: number;
  readonly createdAt: string;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly assignedTechId?: string;
  readonly unitQuality?: PartQuality;
}

export interface IRepairBay {
  readonly capacity: number;
  readonly efficiency: number;
  readonly activeJobs: readonly string[];
  readonly queuedJobs: readonly string[];
}

export const DEFAULT_REPAIR_BAY: IRepairBay = {
  capacity: 2,
  efficiency: 1.0,
  activeJobs: [],
  queuedJobs: [],
};

export interface IFieldRepairResult {
  readonly unitId: string;
  readonly armorRestored: Record<string, number>;
  readonly totalArmorRestored: number;
  readonly suppliesUsed: number;
  readonly wasLimited: boolean;
}

export interface ISalvagedPart {
  readonly id: string;
  readonly componentName: string;
  readonly sourceUnitName: string;
  readonly missionId: string;
  readonly condition: number;
  readonly estimatedValue: number;
  readonly quality?: PartQuality;
}

export interface ISalvageInventory {
  readonly parts: readonly ISalvagedPart[];
  readonly totalValue: number;
}

export interface IRepairJobValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly canAfford: boolean;
  readonly shortfall: number;
}
