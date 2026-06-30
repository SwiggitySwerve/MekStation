import {
  GameEventType,
  type GameEventVisibility,
} from '@/types/gameplay/GameSessionInterfaces';

const PUBLIC_EVENTS = new Set<GameEventType>([
  GameEventType.GameCreated,
  GameEventType.GameStarted,
  GameEventType.GameEnded,
  GameEventType.TurnStarted,
  GameEventType.TurnEnded,
  GameEventType.PhaseChanged,
  GameEventType.InitiativeRolled,
  GameEventType.InitiativeOrderSet,
  GameEventType.AttacksRevealed,
  GameEventType.CommandResultPublished,
]);

const ACTOR_ONLY_EVENTS = new Set<GameEventType>([
  GameEventType.MovementDeclared,
  GameEventType.MovementEnhancementActivated,
  GameEventType.AttackDeclared,
  GameEventType.AttackLocked,
  GameEventType.PhysicalAttackDeclared,
]);

const TARGET_VISIBLE_EVENTS = new Set<GameEventType>([
  GameEventType.AttackResolved,
  GameEventType.AMSInterception,
  GameEventType.DesignatorMarkerApplied,
  GameEventType.DamageApplied,
  GameEventType.PhysicalAttackResolved,
]);

export function classifyGameEventVisibility(event: {
  readonly type: GameEventType;
  readonly visibility?: GameEventVisibility;
}): GameEventVisibility {
  if (event.visibility) {
    return event.visibility;
  }

  if (PUBLIC_EVENTS.has(event.type)) {
    return 'public';
  }

  if (ACTOR_ONLY_EVENTS.has(event.type)) {
    return 'actor-only';
  }

  if (TARGET_VISIBLE_EVENTS.has(event.type)) {
    return 'target-visible';
  }

  return 'observer-visible';
}
