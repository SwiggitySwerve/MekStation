import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import {
  CombatLocation,
  CriticalEffectType,
  ICriticalEffect,
} from '@/types/gameplay';
import {
  IComponentDamageState,
  ICriticalHitResolvedPayload,
  IPilotHitPayload,
  IPSRTriggeredPayload,
  IUnitDestroyedPayload,
} from '@/types/gameplay/GameSessionInterfaces';

export type CriticalSlotComponentType =
  | 'engine'
  | 'gyro'
  | 'cockpit'
  | 'sensor'
  | 'life_support'
  | 'actuator'
  | 'weapon'
  | 'ammo'
  | 'heat_sink'
  | 'jump_jet'
  | 'equipment';

export interface ICriticalSlotEntry {
  readonly slotIndex: number;
  readonly componentType: CriticalSlotComponentType;
  readonly componentName: string;
  readonly destroyed: boolean;
  readonly actuatorType?: ActuatorType;
  readonly weaponId?: string;
}

export type CriticalSlotManifest = Readonly<
  Record<string, readonly ICriticalSlotEntry[]>
>;

export interface ICriticalHitDeterminationResult {
  readonly roll: { readonly dice: readonly number[]; readonly total: number };
  readonly criticalHits: number;
  readonly limbBlownOff: boolean;
  readonly headDestroyed: boolean;
}

export interface ICriticalHitApplicationResult {
  readonly slot: ICriticalSlotEntry;
  readonly effect: ICriticalEffect;
  readonly events: readonly CriticalHitEvent[];
  readonly updatedComponentDamage: IComponentDamageState;
}

export interface ICriticalResolutionResult {
  readonly hits: readonly ICriticalHitApplicationResult[];
  readonly events: readonly CriticalHitEvent[];
  readonly updatedManifest: CriticalSlotManifest;
  readonly updatedComponentDamage: IComponentDamageState;
  readonly locationBlownOff: boolean;
  readonly headDestroyed: boolean;
  readonly unitDestroyed: boolean;
  readonly destructionCause?: 'engine_destroyed' | 'pilot_death';
}

export type CriticalHitEvent =
  | { type: 'critical_hit_resolved'; payload: ICriticalHitResolvedPayload }
  | { type: 'psr_triggered'; payload: IPSRTriggeredPayload }
  | { type: 'unit_destroyed'; payload: IUnitDestroyedPayload }
  | { type: 'pilot_hit'; payload: IPilotHitPayload };

export type {
  CombatLocation,
  CriticalEffectType,
  ICriticalEffect,
  IComponentDamageState,
};
