import type {
  GamePhase,
  GameSide,
  IAttackResolvedPayload,
  IAmmoSlotState,
  IComponentDamageState,
  IGameState,
  IUnitGameState,
  IUnitDestroyedPayload,
} from '@/types/gameplay/GameSessionInterfaces';
import type {
  Facing,
  IHexCoordinate,
} from '@/types/gameplay/HexGridInterfaces';
import type { IObjectiveMarker } from '@/types/scenario/ScenarioInterfaces';

import type {
  IGmPrivateMetadata,
  IGmPublicEffect,
} from './GmInterventionAuthorityTypes';

export type GmCombatCorrectionFamily =
  | 'reposition-facing'
  | 'damage-critical'
  | 'heat-ammo'
  | 'turn-order'
  | 'lifecycle'
  | 'attack-resolution'
  | 'objective-state';

export type GmCombatLifecycleState =
  | 'active'
  | 'ejected'
  | 'withdrawing'
  | 'withdrawn'
  | 'disabled'
  | 'destroyed'
  | 'rescued';

export interface IGmCombatInterventionUnitState extends IUnitGameState {
  readonly rescued?: boolean;
}

export interface IGmCombatAttackResolutionCorrectionState extends Pick<
  IAttackResolvedPayload,
  | 'attackerId'
  | 'targetId'
  | 'weaponId'
  | 'roll'
  | 'toHitNumber'
  | 'hit'
  | 'location'
  | 'damage'
  | 'heat'
  | 'attackerArc'
  | 'ammoBinId'
  | 'rolls'
> {
  readonly attackId: string;
  readonly relatedEventIds?: readonly string[];
  readonly supersededEventIds?: readonly string[];
}

export interface IGmCombatInterventionState extends Omit<IGameState, 'units'> {
  readonly units: Record<string, IGmCombatInterventionUnitState>;
  readonly initiativeOrder?: readonly string[];
  readonly activeUnitId?: string | null;
  readonly attackResolutionCorrections?: Readonly<
    Record<string, IGmCombatAttackResolutionCorrectionState>
  >;
  readonly gmInterventionEvents?: readonly IGmCombatProjectedEffect[];
}

export interface IGmCombatRepositionFacingCorrection {
  readonly family: 'reposition-facing';
  readonly unitId: string;
  readonly position?: IHexCoordinate;
  readonly facing?: Facing;
  readonly secondaryFacing?: Facing;
}

export interface IGmCombatDamageCriticalCorrection {
  readonly family: 'damage-critical';
  readonly unitId: string;
  readonly armor?: Record<string, number>;
  readonly structure?: Record<string, number>;
  readonly componentDamage?: IComponentDamageState;
  readonly destroyedLocations?: readonly string[];
  readonly destroyedEquipment?: readonly string[];
}

export interface IGmCombatHeatAmmoCorrection {
  readonly family: 'heat-ammo';
  readonly unitId: string;
  readonly heat?: number;
  readonly ammo?: Record<string, number>;
  readonly ammoState?: Record<string, IAmmoSlotState>;
}

export interface IGmCombatTurnOrderCorrection {
  readonly family: 'turn-order';
  readonly phase?: GamePhase;
  readonly initiativeWinner?: GameSide;
  readonly firstMover?: GameSide;
  readonly activationIndex?: number;
  readonly initiativeOrder?: readonly string[];
  readonly activeUnitId?: string | null;
}

export interface IGmCombatLifecycleCorrection {
  readonly family: 'lifecycle';
  readonly unitId: string;
  readonly lifecycle: GmCombatLifecycleState;
  readonly retreatTargetEdge?: 'north' | 'south' | 'east' | 'west';
  readonly destructionCause?: IUnitDestroyedPayload['cause'];
}

export interface IGmCombatAttackResolutionCorrection extends IGmCombatAttackResolutionCorrectionState {
  readonly family: 'attack-resolution';
}

export interface IGmCombatObjectiveStateCorrection {
  readonly family: 'objective-state';
  readonly objectiveId?: string;
  readonly hexKey?: string;
  readonly marker?: IObjectiveMarker;
  readonly patch?: Partial<
    Pick<
      IObjectiveMarker,
      | 'objectiveType'
      | 'owningSide'
      | 'controlSide'
      | 'controlRule'
      | 'holdTurnsRequired'
      | 'holdProgress'
    >
  >;
}

export type GmCombatInterventionCorrection =
  | IGmCombatRepositionFacingCorrection
  | IGmCombatDamageCriticalCorrection
  | IGmCombatHeatAmmoCorrection
  | IGmCombatTurnOrderCorrection
  | IGmCombatLifecycleCorrection
  | IGmCombatAttackResolutionCorrection
  | IGmCombatObjectiveStateCorrection;

export interface IGmCombatInterventionCommandPayload {
  readonly correction: GmCombatInterventionCorrection;
  readonly privateMetadata: IGmPrivateMetadata;
  readonly publicSummary?: string;
  readonly visibleToPlayerIds?: readonly string[];
}

export type GmCombatProjectedEffectType =
  | 'gm.combat.reposition_facing_corrected'
  | 'gm.combat.damage_critical_corrected'
  | 'gm.combat.heat_ammo_corrected'
  | 'gm.combat.turn_order_corrected'
  | 'gm.combat.lifecycle_corrected'
  | 'gm.combat.attack_resolution_corrected'
  | 'gm.combat.objective_state_corrected';

export interface IGmCombatProjectedEffectBase<TType extends string> {
  readonly type: TType;
  readonly family: GmCombatCorrectionFamily;
  readonly interventionId?: string;
  readonly changedStateRefs: readonly string[];
  readonly publicSummary: string;
}

export interface IGmCombatRepositionFacingEffect extends IGmCombatProjectedEffectBase<'gm.combat.reposition_facing_corrected'> {
  readonly family: 'reposition-facing';
  readonly unitId: string;
  readonly before: Pick<
    IGmCombatInterventionUnitState,
    'position' | 'facing' | 'secondaryFacing'
  >;
  readonly after: Partial<
    Pick<
      IGmCombatInterventionUnitState,
      'position' | 'facing' | 'secondaryFacing'
    >
  >;
}

export interface IGmCombatDamageCriticalEffect extends IGmCombatProjectedEffectBase<'gm.combat.damage_critical_corrected'> {
  readonly family: 'damage-critical';
  readonly unitId: string;
  readonly before: Pick<
    IGmCombatInterventionUnitState,
    | 'armor'
    | 'structure'
    | 'componentDamage'
    | 'destroyedLocations'
    | 'destroyedEquipment'
  >;
  readonly after: Partial<
    Pick<
      IGmCombatInterventionUnitState,
      | 'armor'
      | 'structure'
      | 'componentDamage'
      | 'destroyedLocations'
      | 'destroyedEquipment'
    >
  >;
}

export interface IGmCombatHeatAmmoEffect extends IGmCombatProjectedEffectBase<'gm.combat.heat_ammo_corrected'> {
  readonly family: 'heat-ammo';
  readonly unitId: string;
  readonly before: Pick<
    IGmCombatInterventionUnitState,
    'heat' | 'ammo' | 'ammoState'
  >;
  readonly after: Partial<
    Pick<IGmCombatInterventionUnitState, 'heat' | 'ammo' | 'ammoState'>
  >;
}

export interface IGmCombatTurnOrderEffect extends IGmCombatProjectedEffectBase<'gm.combat.turn_order_corrected'> {
  readonly family: 'turn-order';
  readonly before: Pick<
    IGmCombatInterventionState,
    | 'phase'
    | 'initiativeWinner'
    | 'firstMover'
    | 'activationIndex'
    | 'initiativeOrder'
    | 'activeUnitId'
  >;
  readonly after: Partial<
    Pick<
      IGmCombatInterventionState,
      | 'phase'
      | 'initiativeWinner'
      | 'firstMover'
      | 'activationIndex'
      | 'initiativeOrder'
      | 'activeUnitId'
    >
  >;
}

export interface IGmCombatLifecycleEffect extends IGmCombatProjectedEffectBase<'gm.combat.lifecycle_corrected'> {
  readonly family: 'lifecycle';
  readonly unitId: string;
  readonly before: Pick<
    IGmCombatInterventionUnitState,
    | 'destroyed'
    | 'destructionCause'
    | 'hasEjected'
    | 'isWithdrawing'
    | 'hasRetreated'
    | 'shutdown'
    | 'rescued'
    | 'retreatTargetEdge'
  >;
  readonly after: Partial<
    Pick<
      IGmCombatInterventionUnitState,
      | 'destroyed'
      | 'destructionCause'
      | 'hasEjected'
      | 'isWithdrawing'
      | 'hasRetreated'
      | 'shutdown'
      | 'rescued'
      | 'retreatTargetEdge'
    >
  >;
}

export interface IGmCombatAttackResolutionEffect extends IGmCombatProjectedEffectBase<'gm.combat.attack_resolution_corrected'> {
  readonly family: 'attack-resolution';
  readonly attackId: string;
  readonly before?: IGmCombatAttackResolutionCorrectionState;
  readonly after: IGmCombatAttackResolutionCorrectionState;
}

export interface IGmCombatObjectiveStateEffect extends IGmCombatProjectedEffectBase<'gm.combat.objective_state_corrected'> {
  readonly family: 'objective-state';
  readonly objectiveId: string;
  readonly before?: IObjectiveMarker;
  readonly after: IObjectiveMarker;
}

export type IGmCombatProjectedEffect =
  | IGmCombatRepositionFacingEffect
  | IGmCombatDamageCriticalEffect
  | IGmCombatHeatAmmoEffect
  | IGmCombatTurnOrderEffect
  | IGmCombatLifecycleEffect
  | IGmCombatAttackResolutionEffect
  | IGmCombatObjectiveStateEffect;

export interface IGmCombatInterventionDomainPayload {
  readonly correction: GmCombatInterventionCorrection;
  readonly projectedEffects: readonly IGmCombatProjectedEffect[];
}

export interface IGmCombatPublicEffect extends IGmPublicEffect {
  readonly family: GmCombatCorrectionFamily;
}
