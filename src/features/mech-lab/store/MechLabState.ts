/**
 * MechLabState.ts
 * State definition for the Mech Lab editor.
 */

import { TechBase, RulesLevel } from '../../../types/TechBase';
import { EngineType, GyroType, CockpitType, StructureType, ArmorType, HeatSinkType } from '../../../types/SystemComponents';
import { IEquipment } from '../../../types/Equipment';

export interface IMechLabState {
  // Metadata
  name: string;
  model: string;

  // Core Specs
  techBase: TechBase;
  rulesLevel: RulesLevel;
  tonnage: number;
  walkingMP: number;

  // Systems Configuration
  structureType: StructureType;
  engineType: EngineType;
  gyroType: GyroType;
  cockpitType: CockpitType;
  armorType: ArmorType;
  heatSinkType: HeatSinkType;

  // Allocations
  armorAllocation: Record<string, number>;
  equipment: IInstalledEquipmentState[];
  criticalSlots: Record<string, ISlotState[]>; // Location -> Slots

  // Validation & Metrics (Derived)
  currentWeight: number;
  isValid: boolean;
  validationErrors: string[];
  validationWarnings: string[];
}

export interface IInstalledEquipmentState {
  id: string;
  equipmentId: string; // Reference to Equipment DB
  location: string;
  slotIndex: number;
  count: number;
  slotsAllocated: number; // Number of slots used
}

export interface ISlotState {
  index: number;
  content: string | null; // null = empty, string = equipment ID or system name (e.g. "Engine")
  isDynamic: boolean; // True if occupied by dynamic component (Engine, Gyro)
}

export const DEFAULT_MECH_STATE: IMechLabState = {
  name: 'New Mech',
  model: 'PRT-01',
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  tonnage: 20,
  walkingMP: 1,
  structureType: StructureType.STANDARD,
  engineType: EngineType.STANDARD,
  gyroType: GyroType.STANDARD,
  cockpitType: CockpitType.STANDARD,
  armorType: ArmorType.STANDARD,
  heatSinkType: HeatSinkType.SINGLE,
  armorAllocation: {},
  equipment: [],
  criticalSlots: {},
  currentWeight: 0,
  isValid: false,
  validationErrors: [],
  validationWarnings: [],
};

