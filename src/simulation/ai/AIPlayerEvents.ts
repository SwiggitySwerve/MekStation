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
    /**
     * Per `add-ai-resource-planning` (A2) design D4: the firing mode the bot
     * selected for each declared weapon, keyed by weapon id. Present only
     * when the bot's tier enables `weaponModeSelection` and at least one
     * declared weapon is multi-mode; absent (and the combat engine resolves
     * default modes) for the `Green`/`Regular` tiers and single-mode-only
     * fire lists — byte-identical to pre-A2 behavior.
     */
    weaponModes?: Readonly<Record<string, string>>;
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
