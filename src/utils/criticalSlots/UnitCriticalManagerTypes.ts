/**
 * UnitCriticalManagerTypes - STUB FILE
 * TODO: Replace with spec-driven implementation
 */

export interface CriticalSlotState {
  location: string;
  slots: SlotContent[];
}

export interface SlotContent {
  index: number;
  equipmentId: string | null;
  name: string | null;
  isFixed: boolean;
}

export interface AllocationResult {
  success: boolean;
  message?: string;
  allocatedSlots?: number[];
}

export interface CriticalManagerConfig {
  enforceRules: boolean;
  allowOverlap: boolean;
}

export interface UnitConfiguration {
  id?: string;
  name?: string;
  tonnage: number;
  techBase: string;
  walkMP: number;
  runMP: number;
  jumpMP: number;
  engineRating: number;
  engineType: string;
  structureType: string;
  armorType: string;
  heatSinkType: string;
  heatSinkCount: number;
  totalHeatSinks: number;
  internalHeatSinks: number;
  externalHeatSinks: number;
  gyroType: string;
  cockpitType: string;
  jumpJetType: string;
  rulesLevel?: string;
}

export interface UnitValidationResult {
  isValid: boolean;
  issues: string[];
  errors?: string[];
  warnings?: string[];
}


