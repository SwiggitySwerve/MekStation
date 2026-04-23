import {
  Facing,
  GameEventType,
  GamePhase,
  ICriticalHitResolvedPayload,
  IAmmoExplosionPayload,
  IGameEvent,
  IHeatPayload,
  IPilotHitPayload,
  IPSRResolvedPayload,
  IPSRTriggeredPayload,
  IRetreatTriggeredPayload,
  IShutdownCheckPayload,
  IStartupAttemptPayload,
  IUnitDestroyedPayload,
  IUnitFellPayload,
  IUnitRetreatedPayload,
  IUnitStoodPayload,
  IAmmoConsumedPayload,
  IPhysicalAttackDeclaredPayload,
  IPhysicalAttackResolvedPayload,
  PhysicalAttackEventType,
} from '@/types/gameplay';

import { createEventBase } from './base';

export function createHeatGeneratedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  amount: number,
  source: IHeatPayload['source'],
  newTotal: number,
): IGameEvent {
  const payload: IHeatPayload = { unitId, amount, source, newTotal };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.HeatGenerated,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

export function createHeatDissipatedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  unitId: string,
  amount: number,
  newTotal: number,
  breakdown?: IHeatPayload['breakdown'],
): IGameEvent {
  const payload: IHeatPayload = {
    unitId,
    amount: -Math.abs(amount),
    source: 'dissipation',
    newTotal,
    ...(breakdown ? { breakdown } : {}),
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.HeatDissipated,
      turn,
      GamePhase.Heat,
      unitId,
    ),
    payload,
  };
}

export function createPilotHitEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  wounds: number,
  totalWounds: number,
  source: 'head_hit' | 'ammo_explosion' | 'mech_destruction' | 'heat',
  consciousnessCheckRequired: boolean,
  consciousnessCheckPassed?: boolean,
): IGameEvent {
  const payload: IPilotHitPayload = {
    unitId,
    wounds,
    totalWounds,
    source,
    consciousnessCheckRequired,
    consciousnessCheckPassed,
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.PilotHit,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

export function createUnitDestroyedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  cause: 'damage' | 'ammo_explosion' | 'pilot_death' | 'shutdown',
): IGameEvent {
  const payload: IUnitDestroyedPayload = { unitId, cause };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.UnitDestroyed,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

/**
 * Per `wire-heat-generation-and-effects` task 11.4: emitted when an
 * explosive ammo bin detonates. `source` distinguishes heat-induced
 * (rolled during the heat phase) from crit-induced explosions.
 */
export function createAmmoExplosionEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  location: string,
  damage: number,
  source: IAmmoExplosionPayload['source'],
  options?: {
    readonly binId?: string;
    readonly weaponType?: string;
    readonly roundsDestroyed?: number;
  },
): IGameEvent {
  const payload: IAmmoExplosionPayload = {
    unitId,
    location,
    damage,
    source,
    ...(options?.binId !== undefined ? { binId: options.binId } : {}),
    ...(options?.weaponType !== undefined
      ? { weaponType: options.weaponType }
      : {}),
    ...(options?.roundsDestroyed !== undefined
      ? { roundsDestroyed: options.roundsDestroyed }
      : {}),
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.AmmoExplosion,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

export function createCriticalHitResolvedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  location: string,
  slotIndex: number,
  componentType: string,
  componentName: string,
  effect: string,
  destroyed: boolean,
): IGameEvent {
  const payload: ICriticalHitResolvedPayload = {
    unitId,
    location,
    slotIndex,
    componentType,
    componentName,
    effect,
    destroyed,
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.CriticalHitResolved,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

export function createPSRTriggeredEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  reason: string,
  additionalModifier: number,
  triggerSource: string,
): IGameEvent {
  const payload: IPSRTriggeredPayload = {
    unitId,
    reason,
    additionalModifier,
    triggerSource,
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.PSRTriggered,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

export function createPSRResolvedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  targetNumber: number,
  roll: number,
  modifiers: number,
  passed: boolean,
  reason: string,
): IGameEvent {
  const payload: IPSRResolvedPayload = {
    unitId,
    targetNumber,
    roll,
    modifiers,
    passed,
    reason,
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.PSRResolved,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

export function createUnitFellEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  fallDamage: number,
  newFacing: Facing,
  pilotDamage: number,
): IGameEvent {
  const payload: IUnitFellPayload = {
    unitId,
    fallDamage,
    newFacing,
    pilotDamage,
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.UnitFell,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

/**
 * Per `wire-piloting-skill-rolls` task 9.3: fired when a prone unit
 * successfully passes an `AttemptStand` PSR and returns upright.
 */
export function createUnitStoodEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  roll: number,
  targetNumber: number,
): IGameEvent {
  const payload: IUnitStoodPayload = {
    unitId,
    turn,
    roll,
    targetNumber,
  };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.UnitStood,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

export function createShutdownCheckEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  heatLevel: number,
  targetNumber: number,
  roll: number,
  shutdownOccurred: boolean,
): IGameEvent {
  const payload: IShutdownCheckPayload = {
    unitId,
    heatLevel,
    targetNumber,
    roll,
    shutdownOccurred,
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.ShutdownCheck,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

export function createStartupAttemptEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  targetNumber: number,
  roll: number,
  success: boolean,
): IGameEvent {
  const payload: IStartupAttemptPayload = {
    unitId,
    targetNumber,
    roll,
    success,
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.StartupAttempt,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

export function createAmmoConsumedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  binId: string,
  weaponType: string,
  roundsConsumed: number,
  roundsRemaining: number,
): IGameEvent {
  const payload: IAmmoConsumedPayload = {
    unitId,
    binId,
    weaponType,
    roundsConsumed,
    roundsRemaining,
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.AmmoConsumed,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

/**
 * Per `implement-physical-attack-phase` task 2.4: emitted when a unit
 * declares a physical attack (punch / kick / charge / DFA / push / club).
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
): IGameEvent {
  const payload: IPhysicalAttackDeclaredPayload = {
    attackerId,
    targetId,
    attackType,
    toHitNumber,
    limb,
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
