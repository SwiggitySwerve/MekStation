import type { CockpitType } from '@/types/construction/CockpitType';
import type { EngineType } from '@/types/construction/EngineType';
import type { GyroType } from '@/types/construction/GyroType';
import type { HeatSinkType } from '@/types/construction/HeatSinkType';
import type { InternalStructureType } from '@/types/construction/InternalStructureType';
import type { MovementEnhancementType } from '@/types/construction/MovementEnhancement';
import type { MechConfiguration } from '@/types/unit/BattleMechInterfaces';

export interface StructureTabCalculations {
  readonly engineWeight: number;
  readonly engineSlots: number;
  readonly gyroWeight: number;
  readonly gyroSlots: number;
  readonly structureWeight: number;
  readonly structureSlots: number;
  readonly cockpitWeight: number;
  readonly cockpitSlots: number;
  readonly heatSinkWeight: number;
  readonly heatSinkSlots: number;
  readonly jumpJetWeight: number;
  readonly jumpJetSlots: number;
  readonly totalStructuralWeight: number;
  readonly integralHeatSinks: number;
  readonly externalHeatSinks: number;
  readonly totalHeatDissipation: number;
}

export interface StructureTabFilteredOptions {
  readonly engines: readonly { type: EngineType; name: string }[];
  readonly gyros: readonly { type: GyroType; name: string }[];
  readonly structures: readonly { type: InternalStructureType; name: string }[];
  readonly cockpits: readonly { type: CockpitType; name: string }[];
  readonly heatSinks: readonly { type: HeatSinkType; name: string }[];
}

export interface StructureConfigurationOption {
  readonly value: MechConfiguration;
  readonly label: string;
}

export interface StructureEnhancementOption {
  readonly value: MovementEnhancementType | null;
  readonly label: string;
}
