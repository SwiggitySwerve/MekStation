import { EquipmentAllocation } from '../../utils/criticalSlots/CriticalSlot';

export interface EquipmentPlacement {
  equipmentId: string;
  equipment: EquipmentAllocation;
  location: string;
  slots: number[];
  isFixed: boolean;
  isValid: boolean;
  constraints: EquipmentConstraints;
  conflicts: string[];
}

export interface EquipmentConstraints {
  allowedLocations: string[];
  forbiddenLocations: string[];
  requiresCASE: boolean;
  requiresArtemis: boolean;
  minTonnageLocation: number;
  maxTonnageLocation: number;
  heatGeneration: number;
  specialRules: string[];
}

