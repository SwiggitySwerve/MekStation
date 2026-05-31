import type {
  GameEventType,
  IMovementStep,
  MovementType,
} from '@/types/gameplay';
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
    steps?: readonly IMovementStep[];
  };
}

export interface IAttackEvent {
  type: GameEventType.AttackDeclared;
  payload: {
    attackerId: string;
    targetId: string;
    weapons: readonly string[];
    /**
     * Optional per-weapon target override for multi-target fire. When absent,
     * every declared weapon uses `targetId`, preserving the legacy single-target
     * attack event shape.
     */
    weaponTargets?: Readonly<Record<string, string>>;
    /**
     * Per `add-ai-resource-planning` (A2) design D4: the firing mode the bot
     * selected for each declared weapon, keyed by weapon id. Present only
     * when the bot's tier enables `weaponModeSelection` and at least one
     * declared weapon is multi-mode; absent (and the combat engine resolves
     * default modes) for the `Green`/`Regular` tiers and single-mode-only
     * fire lists — byte-identical to pre-A2 behavior.
     */
    weaponModes?: Readonly<Record<string, string>>;
    /** Optional per-weapon called-shot declarations keyed by weapon id. */
    calledShots?: Readonly<Record<string, boolean>>;
    /** Optional per-weapon teammate-assisted called shots keyed by weapon id. */
    teammateCalledShots?: Readonly<Record<string, boolean>>;
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
