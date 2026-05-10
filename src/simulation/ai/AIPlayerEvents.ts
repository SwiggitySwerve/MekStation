import type { GameEventType, MovementType } from '@/types/gameplay';
import type { PhysicalAttackType } from '@/utils/gameplay/physicalAttacks';

export interface IMovementEvent {
  type: GameEventType.MovementDeclared;
  payload: {
    unitId: string;
    from: { q: number; r: number };
    to: { q: number; r: number };
    facing: number;
    movementType: MovementType;
    mpUsed: number;
    heatGenerated: number;
  };
}

export interface IAttackEvent {
  type: GameEventType.AttackDeclared;
  payload: {
    attackerId: string;
    targetId: string;
    weapons: readonly string[];
  };
}

export interface IRetreatEvent {
  type: GameEventType.RetreatTriggered;
  payload: {
    unitId: string;
    edge: 'north' | 'south' | 'east' | 'west';
    reason: 'structural_threshold' | 'vital_crit';
  };
}

export interface IPhysicalAttackEvent {
  type: GameEventType.PhysicalAttackDeclared;
  payload: {
    attackerId: string;
    targetId: string;
    attackType: PhysicalAttackType;
  };
}

export type BotGameEvent =
  | IMovementEvent
  | IAttackEvent
  | IRetreatEvent
  | IPhysicalAttackEvent;
