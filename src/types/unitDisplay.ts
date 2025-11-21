// Enhanced types for comprehensive unit display
export interface UnitDisplayOptions {
  showBasicInfo?: boolean;
  showMovement?: boolean;
  showArmor?: boolean;
  showStructure?: boolean;
  showHeatManagement?: boolean;
  showEquipmentSummary?: boolean;
  showCriticalSlotSummary?: boolean;
  showBuildRecommendations?: boolean;
  showTechnicalSpecs?: boolean;
  showFluffText?: boolean;
  compact?: boolean;
  interactive?: boolean;
}

export interface HeatManagementInfo {
  totalHeatGeneration: number;
  totalHeatDissipation: number;
  heatBalance: number;
  totalHeatSinks: number;
  engineIntegratedHeatSinks: number;
  externalHeatSinks: number;
  engineHeatSinkCapacity: number;
  heatSinkType: string;
  overheatingRisk: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

export interface ArmorInfo {
  type: string;
  totalArmorPoints: number;
  maxArmorPoints: number;
  armorEfficiency: number; // percentage of max armor used
  locationBreakdown: Array<{
    location: string;
    armorPoints: number;
    maxArmorPoints: number;
    rearArmorPoints?: number;
    maxRearArmorPoints?: number;
  }>;
  armorTonnage: number;
}

export interface StructureInfo {
  type: string;
  totalInternalStructure: number;
  structureTonnage: number;
  structureEfficiency: number;
}

export interface EquipmentSummary {
  totalEquipmentCount: number;
  totalEquipmentTonnage: number;
  equipmentByCategory: Array<{
    category: string;
    count: number;
    tonnage: number;
    items: string[];
  }>;
  weaponSummary: {
    totalWeapons: number;
    energyWeapons: number;
    ballisticWeapons: number;
    missileWeapons: number;
    physicalWeapons: number;
  };
}

export interface CriticalSlotSummary {
  totalSlots: number;
  usedSlots: number;
  availableSlots: number;
  locationBreakdown: Array<{
    location: string;
    totalSlots: number;
    usedSlots: number;
    availableSlots: number;
    utilizationPercentage: number;
  }>;
}

export interface BuildRecommendation {
  id: string;
  type: 'heat_management' | 'protection' | 'optimization' | 'constraint_violation';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  suggestedActions: string[];
  autoApplyable: boolean;
}

export interface TechnicalSpecs {
  battleValue: number;
  costCBills: number;
  techLevel: string;
  rulesLevel: string;
  walkSpeed: number;
  runSpeed: number;
  jumpSpeed: number;
  tonnageBreakdown: {
    chassis: number;
    engine: number;
    heatSinks: number;
    armor: number;
    structure: number;
    equipment: number;
    weapons: number;
    ammunition: number;
  };
}

export interface UnitDisplayData {
  unit: import('./customizer').CustomizableUnit;
  loadout: import('./customizer').UnitEquipmentItem[];
  availableEquipment: import('./customizer').EquipmentItem[];
  heatManagement?: HeatManagementInfo;
  armorInfo?: ArmorInfo;
  structureInfo?: StructureInfo;
  equipmentSummary?: EquipmentSummary;
  criticalSlotSummary?: CriticalSlotSummary;
  buildRecommendations?: BuildRecommendation[];
  technicalSpecs?: TechnicalSpecs;
}

export interface UnitAnalysisContext {
  includeHeatAnalysis: boolean;
  includeArmorAnalysis: boolean;
  includeEquipmentAnalysis: boolean;
  includeBuildRecommendations: boolean;
  unitType: 'BattleMech' | 'Vehicle' | 'BattleArmor' | 'ProtoMech' | 'Infantry';
}
