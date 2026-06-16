import {
  GameEventType,
  GamePhase,
  IGameEvent,
  IPhysicalAttackDeclaredPayload,
  IPhysicalAttackResolvedPayload,
  INeuralInterfaceStateChangedPayload,
  IRetreatTriggeredPayload,
  IUnitEjectedPayload,
  IUnitRetreatedPayload,
  PhysicalAttackEventType,
} from '@/types/gameplay';

import { createEventBase } from './base';

/**
 * Per `implement-physical-attack-phase` task 2.4: emitted when a unit
 * declares a physical attack (punch / kick / charge / DFA / push / melee).
 */
export function createPhysicalAttackDeclaredEvent(
  gameId: string,
  sequence: number,
  turn: number,
  attackerId: string,
  targetId: string,
  attackType: PhysicalAttackEventType,
  toHitNumber: number,
  limb?: IPhysicalAttackDeclaredPayload['limb'],
  hitTable?: IPhysicalAttackDeclaredPayload['hitTable'],
  twoHandedZweihander?: boolean,
  selectedINarcPod?: IPhysicalAttackDeclaredPayload['selectedINarcPod'],
  blockerStepOutDecision?: IPhysicalAttackDeclaredPayload['blockerStepOutDecision'],
): IGameEvent {
  const payload: IPhysicalAttackDeclaredPayload = {
    attackerId,
    targetId,
    attackType,
    toHitNumber,
    limb,
    ...(hitTable ? { hitTable } : {}),
    ...(twoHandedZweihander === true ? { twoHandedZweihander } : {}),
    ...(selectedINarcPod !== undefined ? { selectedINarcPod } : {}),
    ...(blockerStepOutDecision !== undefined ? { blockerStepOutDecision } : {}),
  };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.PhysicalAttackDeclared,
      turn,
      GamePhase.PhysicalAttack,
      attackerId,
    ),
    payload,
  };
}

/**
 * Per `implement-physical-attack-phase` tasks 4-8: emitted when a
 * physical attack is resolved (hit or miss). On hit, `damage` and
 * `location` are set; on miss they're omitted.
 */
export function createPhysicalAttackResolvedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  attackerId: string,
  targetId: string,
  attackType: PhysicalAttackEventType,
  roll: number,
  toHitNumber: number,
  hit: boolean,
  damage?: number,
  location?: string,
  clusters?: IPhysicalAttackResolvedPayload['clusters'],
  displacements?: IPhysicalAttackResolvedPayload['displacements'],
  automaticHit?: boolean,
  automaticHitReason?: string,
  selectedINarcPod?: IPhysicalAttackResolvedPayload['selectedINarcPod'],
): IGameEvent {
  const payload: IPhysicalAttackResolvedPayload = {
    attackerId,
    targetId,
    attackType,
    roll,
    toHitNumber,
    hit,
    damage,
    location,
    clusters,
    displacements,
    automaticHit,
    automaticHitReason,
    selectedINarcPod,
  };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.PhysicalAttackResolved,
      turn,
      GamePhase.PhysicalAttack,
      attackerId,
    ),
    payload,
  };
}

/**
 * Per `wire-bot-ai-helpers-and-capstone`: emitted when a bot-controlled
 * unit crosses its retreat trigger. `edge` is the resolved concrete edge
 * (`'nearest'` is converted upstream by `resolveEdge`). `phase` carries
 * the phase at the time of trigger so replay consumers can show "X
 * started retreating during Movement on turn 4".
 */
export function createRetreatTriggeredEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  edge: 'north' | 'south' | 'east' | 'west',
  reason: 'structural_threshold' | 'vital_crit',
): IGameEvent {
  const payload: IRetreatTriggeredPayload = { unitId, edge, reason };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.RetreatTriggered,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

/**
 * Per `add-bot-retreat-behavior` § 7: emitted when a retreating unit's
 * movement places it on a hex along its locked `retreatTargetEdge`.
 * Pairs with a `MovementDeclared` event in the same turn; the reducer
 * (`applyUnitRetreated`) latches `hasRetreated = true` so the unit is
 * excluded from active-side counts for victory resolution while staying
 * distinct from combat destruction for post-battle summaries.
 */
export function createUnitRetreatedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  retreatEdge: 'north' | 'south' | 'east' | 'west',
): IGameEvent {
  const payload: IUnitRetreatedPayload = { unitId, retreatEdge, turn };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.UnitRetreated,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

export function createUnitEjectedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  reason: IUnitEjectedPayload['reason'],
): IGameEvent {
  const payload: IUnitEjectedPayload = { unitId, turn, reason };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.UnitEjected,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

export function createNeuralInterfaceStateChangedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  active: boolean,
  reason: INeuralInterfaceStateChangedPayload['reason'],
): IGameEvent {
  const payload: INeuralInterfaceStateChangedPayload = {
    unitId,
    active,
    turn,
    reason,
  };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.NeuralInterfaceStateChanged,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}
