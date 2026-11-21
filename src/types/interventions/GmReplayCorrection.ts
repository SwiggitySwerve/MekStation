import type { IAmmoSlotState, IComponentDamageState, IGameState, IUnitGameState } from '@/types/gameplay/GameSessionStateTypes';
import type { IObjectiveMarker } from '@/types/scenario/ScenarioInterfaces';
import type { IGmCombatAttackResolutionCorrectionState } from './GmCombatInterventionTypes';

type UnitAfter<K extends keyof IUnitGameState> = Partial<Pick<IUnitGameState, K>>;
type UnitEffect<F extends string, A, C extends string = never> = {
  readonly family: F;
  readonly unitId: string;
  readonly after: A;
  readonly clear?: readonly C[];
};

/** Combat values only. Private commands and ledger records are not this type. */
export type GmReplayCorrectionEffect =
  | UnitEffect<'reposition-facing', UnitAfter<'position' | 'facing' | 'secondaryFacing'>, 'secondaryFacing'>
  | UnitEffect<'damage-critical', {
      readonly armor?: Record<string, number>;
      readonly structure?: Record<string, number>;
      readonly componentDamage?: IComponentDamageState;
      readonly destroyedLocations?: readonly string[];
      readonly destroyedEquipment?: readonly string[];
    }, 'componentDamage'>
  | UnitEffect<'heat-ammo', {
      readonly heat?: number;
      readonly ammo?: Record<string, number>;
      readonly ammoState?: Record<string, IAmmoSlotState>;
    }, 'ammoState'>
  | {
      readonly family: 'turn-order';
      readonly after: Partial<Pick<IGameState, 'phase' | 'initiativeWinner' | 'firstMover'>>;
      readonly clear?: readonly ('initiativeWinner' | 'firstMover')[];
    }
  | UnitEffect<'lifecycle', UnitAfter<'destroyed' | 'destructionCause' | 'hasEjected' | 'hasRetreated' | 'isWithdrawing' | 'shutdown' | 'retreatTargetEdge'>,
      'destructionCause' | 'hasEjected' | 'hasRetreated' | 'isWithdrawing' | 'shutdown' | 'retreatTargetEdge'>
  | {
      readonly family: 'attack-resolution';
      readonly attackId: string;
      readonly after: IGmCombatAttackResolutionCorrectionState;
    }
  | {
      readonly family: 'objective-state';
      readonly objectiveId: string;
      readonly previousHexKey?: string;
      readonly after: IObjectiveMarker;
    };

export interface IGmCorrectionAppliedPayload {
  readonly correctionId: string;
  readonly effects: readonly GmReplayCorrectionEffect[];
  readonly intentId?: string;
}

export interface IGmCorrectionSupersededFact {
  readonly status: 'superseded';
  readonly originalVisibleEventId: string;
}
