import {
  GameEventType,
  GamePhase,
  IGameEvent,
  IPilotHitPayload,
  IUnitDestroyedPayload,
} from '@/types/gameplay';

import type { IGameplayEventContext } from './eventContext';

import { createEventBase } from './base';

type PilotHitEdgeOptions = Pick<
  IPilotHitPayload,
  'edgeReroll' | 'edgeSuperseded' | 'edgeTrigger' | 'edgePointsRemaining'
>;

export interface ICreatePilotHitEventInput extends IGameplayEventContext {
  readonly wounds: number;
  readonly totalWounds: number;
  readonly source: IPilotHitPayload['source'];
  readonly consciousnessCheckRequired: boolean;
  readonly consciousnessCheckPassed?: boolean;
  readonly edge?: PilotHitEdgeOptions;
}

export function createPilotHitEvent(
  input: ICreatePilotHitEventInput | string,
  ...legacy:
    | []
    | [
        sequence: number,
        turn: number,
        phase: GamePhase,
        unitId: string,
        wounds: number,
        totalWounds: number,
        source: IPilotHitPayload['source'],
        consciousnessCheckRequired: boolean,
        consciousnessCheckPassed?: boolean,
        edge?: PilotHitEdgeOptions,
      ]
): IGameEvent {
  const [
    sequence,
    turn,
    phase,
    unitId,
    wounds,
    totalWounds,
    source,
    consciousnessCheckRequired,
    consciousnessCheckPassed,
    edge,
  ] = legacy as [
    number,
    number,
    GamePhase,
    string,
    number,
    number,
    IPilotHitPayload['source'],
    boolean,
    boolean | undefined,
    PilotHitEdgeOptions | undefined,
  ];
  const eventInput =
    typeof input !== 'string'
      ? input
      : {
          gameId: input,
          sequence,
          turn,
          phase,
          unitId,
          wounds,
          totalWounds,
          source,
          consciousnessCheckRequired,
          consciousnessCheckPassed,
          edge,
        };
  const payload: IPilotHitPayload = {
    unitId: eventInput.unitId,
    wounds: eventInput.wounds,
    totalWounds: eventInput.totalWounds,
    source: eventInput.source,
    consciousnessCheckRequired: eventInput.consciousnessCheckRequired,
    consciousnessCheckPassed: eventInput.consciousnessCheckPassed,
    ...(eventInput.edge?.edgeReroll !== undefined
      ? { edgeReroll: eventInput.edge.edgeReroll }
      : {}),
    ...(eventInput.edge?.edgeSuperseded !== undefined
      ? { edgeSuperseded: eventInput.edge.edgeSuperseded }
      : {}),
    ...(eventInput.edge?.edgeTrigger !== undefined
      ? { edgeTrigger: eventInput.edge.edgeTrigger }
      : {}),
    ...(eventInput.edge?.edgePointsRemaining !== undefined
      ? { edgePointsRemaining: eventInput.edge.edgePointsRemaining }
      : {}),
  };

  return {
    ...createEventBase(
      eventInput.gameId,
      eventInput.sequence,
      GameEventType.PilotHit,
      eventInput.turn,
      eventInput.phase,
      eventInput.unitId,
    ),
    payload,
  };
}

export interface ICreateUnitDestroyedEventInput extends IGameplayEventContext {
  readonly cause: IUnitDestroyedPayload['cause'];
  readonly options?: { readonly killerUnitId?: string };
}

export function createUnitDestroyedEvent(
  input: ICreateUnitDestroyedEventInput | string,
  ...legacy:
    | []
    | [
        sequence: number,
        turn: number,
        phase: GamePhase,
        unitId: string,
        cause: IUnitDestroyedPayload['cause'],
        options?: { readonly killerUnitId?: string },
      ]
): IGameEvent {
  const [sequence, turn, phase, unitId, cause, options] = legacy as [
    number,
    number,
    GamePhase,
    string,
    IUnitDestroyedPayload['cause'],
    { readonly killerUnitId?: string } | undefined,
  ];
  const eventInput =
    typeof input !== 'string'
      ? input
      : { gameId: input, sequence, turn, phase, unitId, cause, options };
  const payload: IUnitDestroyedPayload = {
    unitId: eventInput.unitId,
    cause: eventInput.cause,
    ...(eventInput.options?.killerUnitId !== undefined
      ? { killerUnitId: eventInput.options.killerUnitId }
      : {}),
  };

  return {
    ...createEventBase(
      eventInput.gameId,
      eventInput.sequence,
      GameEventType.UnitDestroyed,
      eventInput.turn,
      eventInput.phase,
      eventInput.unitId,
    ),
    payload,
  };
}
