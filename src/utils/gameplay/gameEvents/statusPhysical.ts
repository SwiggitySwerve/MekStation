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

import type { IGameplayEventContext } from './eventContext';

import { createEventBase } from './base';

/**
 * Per `implement-physical-attack-phase` task 2.4: emitted when a unit
 * declares a physical attack (punch / kick / charge / DFA / push / melee).
 */
export interface ICreatePhysicalAttackDeclaredEventInput {
  readonly gameId: string;
  readonly sequence: number;
  readonly turn: number;
  readonly attackerId: string;
  readonly targetId: string;
  readonly attackType: PhysicalAttackEventType;
  readonly toHitNumber: number;
  readonly limb?: IPhysicalAttackDeclaredPayload['limb'];
  readonly hitTable?: IPhysicalAttackDeclaredPayload['hitTable'];
  readonly twoHandedZweihander?: boolean;
  readonly selectedINarcPod?: IPhysicalAttackDeclaredPayload['selectedINarcPod'];
  readonly blockerStepOutDecision?: IPhysicalAttackDeclaredPayload['blockerStepOutDecision'];
}

export function createPhysicalAttackDeclaredEvent(
  input: ICreatePhysicalAttackDeclaredEventInput | string,
  ...legacy:
    | []
    | [
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
      ]
): IGameEvent {
  const [
    sequence,
    turn,
    attackerId,
    targetId,
    attackType,
    toHitNumber,
    limb,
    hitTable,
    twoHandedZweihander,
    selectedINarcPod,
    blockerStepOutDecision,
  ] = legacy as [
    number,
    number,
    string,
    string,
    PhysicalAttackEventType,
    number,
    IPhysicalAttackDeclaredPayload['limb'] | undefined,
    IPhysicalAttackDeclaredPayload['hitTable'] | undefined,
    boolean | undefined,
    IPhysicalAttackDeclaredPayload['selectedINarcPod'] | undefined,
    IPhysicalAttackDeclaredPayload['blockerStepOutDecision'] | undefined,
  ];
  const eventInput =
    typeof input !== 'string'
      ? input
      : {
          gameId: input,
          sequence,
          turn,
          attackerId,
          targetId,
          attackType,
          toHitNumber,
          limb,
          hitTable,
          twoHandedZweihander,
          selectedINarcPod,
          blockerStepOutDecision,
        };
  const payload: IPhysicalAttackDeclaredPayload = {
    attackerId: eventInput.attackerId,
    targetId: eventInput.targetId,
    attackType: eventInput.attackType,
    toHitNumber: eventInput.toHitNumber,
    limb: eventInput.limb,
    ...(eventInput.hitTable ? { hitTable: eventInput.hitTable } : {}),
    ...(eventInput.twoHandedZweihander === true
      ? { twoHandedZweihander: eventInput.twoHandedZweihander }
      : {}),
    ...(eventInput.selectedINarcPod !== undefined
      ? { selectedINarcPod: eventInput.selectedINarcPod }
      : {}),
    ...(eventInput.blockerStepOutDecision !== undefined
      ? { blockerStepOutDecision: eventInput.blockerStepOutDecision }
      : {}),
  };
  return {
    ...createEventBase(
      eventInput.gameId,
      eventInput.sequence,
      GameEventType.PhysicalAttackDeclared,
      eventInput.turn,
      GamePhase.PhysicalAttack,
      eventInput.attackerId,
    ),
    payload,
  };
}

/**
 * Per `implement-physical-attack-phase` tasks 4-8: emitted when a
 * physical attack is resolved (hit or miss). On hit, `damage` and
 * `location` are set; on miss they're omitted.
 */
export interface ICreatePhysicalAttackResolvedEventInput {
  readonly gameId: string;
  readonly sequence: number;
  readonly turn: number;
  readonly attackerId: string;
  readonly targetId: string;
  readonly attackType: PhysicalAttackEventType;
  readonly roll: number;
  readonly toHitNumber: number;
  readonly hit: boolean;
  readonly damage?: number;
  readonly location?: string;
  readonly clusters?: IPhysicalAttackResolvedPayload['clusters'];
  readonly displacements?: IPhysicalAttackResolvedPayload['displacements'];
  readonly automaticHit?: boolean;
  readonly automaticHitReason?: string;
  readonly selectedINarcPod?: IPhysicalAttackResolvedPayload['selectedINarcPod'];
}

export function createPhysicalAttackResolvedEvent(
  input: ICreatePhysicalAttackResolvedEventInput | string,
  ...legacy:
    | []
    | [
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
      ]
): IGameEvent {
  const [
    sequence,
    turn,
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
  ] = legacy as [
    number,
    number,
    string,
    string,
    PhysicalAttackEventType,
    number,
    number,
    boolean,
    number | undefined,
    string | undefined,
    IPhysicalAttackResolvedPayload['clusters'] | undefined,
    IPhysicalAttackResolvedPayload['displacements'] | undefined,
    boolean | undefined,
    string | undefined,
    IPhysicalAttackResolvedPayload['selectedINarcPod'] | undefined,
  ];
  const eventInput =
    typeof input !== 'string'
      ? input
      : {
          gameId: input,
          sequence,
          turn,
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
  const payload: IPhysicalAttackResolvedPayload = {
    attackerId: eventInput.attackerId,
    targetId: eventInput.targetId,
    attackType: eventInput.attackType,
    roll: eventInput.roll,
    toHitNumber: eventInput.toHitNumber,
    hit: eventInput.hit,
    damage: eventInput.damage,
    location: eventInput.location,
    clusters: eventInput.clusters,
    displacements: eventInput.displacements,
    automaticHit: eventInput.automaticHit,
    automaticHitReason: eventInput.automaticHitReason,
    selectedINarcPod: eventInput.selectedINarcPod,
  };
  return {
    ...createEventBase(
      eventInput.gameId,
      eventInput.sequence,
      GameEventType.PhysicalAttackResolved,
      eventInput.turn,
      GamePhase.PhysicalAttack,
      eventInput.attackerId,
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
export interface ICreateRetreatTriggeredEventInput extends IGameplayEventContext {
  readonly edge: 'north' | 'south' | 'east' | 'west';
  readonly reason: 'structural_threshold' | 'vital_crit';
}

export function createRetreatTriggeredEvent(
  input: ICreateRetreatTriggeredEventInput | string,
  ...legacy:
    | []
    | [
        sequence: number,
        turn: number,
        phase: GamePhase,
        unitId: string,
        edge: 'north' | 'south' | 'east' | 'west',
        reason: 'structural_threshold' | 'vital_crit',
      ]
): IGameEvent {
  const [sequence, turn, phase, unitId, edge, reason] = legacy as [
    number,
    number,
    GamePhase,
    string,
    'north' | 'south' | 'east' | 'west',
    'structural_threshold' | 'vital_crit',
  ];
  const eventInput =
    typeof input !== 'string'
      ? input
      : { gameId: input, sequence, turn, phase, unitId, edge, reason };
  const payload: IRetreatTriggeredPayload = {
    unitId: eventInput.unitId,
    edge: eventInput.edge,
    reason: eventInput.reason,
  };
  return {
    ...createEventBase(
      eventInput.gameId,
      eventInput.sequence,
      GameEventType.RetreatTriggered,
      eventInput.turn,
      eventInput.phase,
      eventInput.unitId,
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

export interface ICreateNeuralInterfaceStateChangedEventInput extends IGameplayEventContext {
  readonly active: boolean;
  readonly reason: INeuralInterfaceStateChangedPayload['reason'];
}

export function createNeuralInterfaceStateChangedEvent(
  input: ICreateNeuralInterfaceStateChangedEventInput | string,
  ...legacy:
    | []
    | [
        sequence: number,
        turn: number,
        phase: GamePhase,
        unitId: string,
        active: boolean,
        reason: INeuralInterfaceStateChangedPayload['reason'],
      ]
): IGameEvent {
  const [sequence, turn, phase, unitId, active, reason] = legacy as [
    number,
    number,
    GamePhase,
    string,
    boolean,
    INeuralInterfaceStateChangedPayload['reason'],
  ];
  const eventInput =
    typeof input !== 'string'
      ? input
      : { gameId: input, sequence, turn, phase, unitId, active, reason };
  const payload: INeuralInterfaceStateChangedPayload = {
    unitId: eventInput.unitId,
    active: eventInput.active,
    turn: eventInput.turn,
    reason: eventInput.reason,
  };
  return {
    ...createEventBase(
      eventInput.gameId,
      eventInput.sequence,
      GameEventType.NeuralInterfaceStateChanged,
      eventInput.turn,
      eventInput.phase,
      eventInput.unitId,
    ),
    payload,
  };
}
