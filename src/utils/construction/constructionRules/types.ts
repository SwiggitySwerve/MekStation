/**
 * Construction Rules Types
 *
 * Shared types and interfaces for construction validation.
 */

import {
  ArmorTypeEnum,
} from '../../../types/construction/ArmorType';
import {
  CockpitType,
} from '../../../types/construction/CockpitType';
import {
  EngineType,
} from '../../../types/construction/EngineType';
import { GyroType } from '../../../types/construction/GyroType';
import { HeatSinkType } from '../../../types/construction/HeatSinkType';
import {
  InternalStructureType,
} from '../../../types/construction/InternalStructureType';

/**
 * Mech configuration for construction validation
 */
export interface MechBuildConfig {
  tonnage: number;
  engineRating: number;
  engineType: EngineType;
  gyroType: GyroType;
  internalStructureType: InternalStructureType;
  armorType: ArmorTypeEnum;
  totalArmorPoints: number;
  cockpitType: CockpitType;
  heatSinkType: HeatSinkType;
  totalHeatSinks: number;
  jumpMP: number;
}

/**
 * Construction step result
 */
export interface ConstructionStepResult {
  step: number;
  name: string;
  weight: number;
  criticalSlots: number;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Full construction result
 */
export interface ConstructionResult {
  steps: ConstructionStepResult[];
  totalWeight: number;
  remainingTonnage: number;
  totalCriticalSlots: number;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
