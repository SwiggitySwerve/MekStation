/**
 * Vehicle combat event factories.
 *
 * @spec openspec/changes/add-vehicle-combat-behavior/specs/combat-resolution/spec.md
 */

import {
  GameEventType,
  GamePhase,
  IGameEvent,
  IMotiveDamagedPayload,
  IMotivePenaltyAppliedPayload,
  ITurretLockedPayload,
  IVehicleCrewStunnedPayload,
  IVehicleImmobilizedPayload,
  IVTOLCrashCheckPayload,
} from '@/types/gameplay';

import type { IGameplayEventContext } from './eventContext';

import { createEventBase } from './base';

/**
 * Emitted when a vehicle hit triggers a motive-damage roll. The severity
 * and mpPenalty match the 2d6 motive-damage table (TW p.193).
 */
export interface ICreateMotiveDamagedEventInput extends IGameplayEventContext {
  readonly severity: IMotiveDamagedPayload['severity'];
  readonly mpPenalty: number;
  readonly rolls?: readonly number[];
}

export function createMotiveDamagedEvent(
  input: ICreateMotiveDamagedEventInput | string,
  ...legacy:
    | []
    | [
        sequence: number,
        turn: number,
        phase: GamePhase,
        unitId: string,
        severity: IMotiveDamagedPayload['severity'],
        mpPenalty: number,
        rolls?: readonly number[],
      ]
): IGameEvent {
  const [sequence, turn, phase, unitId, severity, mpPenalty, rolls] =
    legacy as [
      number,
      number,
      GamePhase,
      string,
      IMotiveDamagedPayload['severity'],
      number,
      readonly number[] | undefined,
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
          severity,
          mpPenalty,
          rolls,
        };
  const payload: IMotiveDamagedPayload = {
    unitId: eventInput.unitId,
    severity: eventInput.severity,
    mpPenalty: eventInput.mpPenalty,
    rolls: eventInput.rolls,
  };
  return {
    ...createEventBase(
      eventInput.gameId,
      eventInput.sequence,
      GameEventType.MotiveDamaged,
      eventInput.turn,
      eventInput.phase,
      eventInput.unitId,
    ),
    payload,
  };
}

/**
 * Emitted after motive damage mutates a vehicle's effective MP — useful
 * for pathfinder invalidation and UI gauges.
 */
export interface ICreateMotivePenaltyAppliedEventInput extends IGameplayEventContext {
  readonly previousCruiseMP: number;
  readonly newCruiseMP: number;
  readonly newFlankMP: number;
}

export function createMotivePenaltyAppliedEvent(
  input: ICreateMotivePenaltyAppliedEventInput | string,
  ...legacy:
    | []
    | [
        sequence: number,
        turn: number,
        phase: GamePhase,
        unitId: string,
        previousCruiseMP: number,
        newCruiseMP: number,
        newFlankMP: number,
      ]
): IGameEvent {
  const [
    sequence,
    turn,
    phase,
    unitId,
    previousCruiseMP,
    newCruiseMP,
    newFlankMP,
  ] = legacy as [number, number, GamePhase, string, number, number, number];
  const eventInput =
    typeof input !== 'string'
      ? input
      : {
          gameId: input,
          sequence,
          turn,
          phase,
          unitId,
          previousCruiseMP,
          newCruiseMP,
          newFlankMP,
        };
  const payload: IMotivePenaltyAppliedPayload = {
    unitId: eventInput.unitId,
    previousCruiseMP: eventInput.previousCruiseMP,
    newCruiseMP: eventInput.newCruiseMP,
    newFlankMP: eventInput.newFlankMP,
  };
  return {
    ...createEventBase(
      eventInput.gameId,
      eventInput.sequence,
      GameEventType.MotivePenaltyApplied,
      eventInput.turn,
      eventInput.phase,
      eventInput.unitId,
    ),
    payload,
  };
}

/**
 * Emitted when a vehicle transitions to immobilized (one-way). Callers
 * pick the `cause` matching the trigger.
 */
export function createVehicleImmobilizedEvent(
  input:
    | (IGameplayEventContext & {
        readonly cause: IVehicleImmobilizedPayload['cause'];
      })
    | string,
  ...legacy:
    | []
    | [
        sequence: number,
        turn: number,
        phase: GamePhase,
        unitId: string,
        cause: IVehicleImmobilizedPayload['cause'],
      ]
): IGameEvent {
  const [sequence, turn, phase, unitId, cause] = legacy as [
    number,
    number,
    GamePhase,
    string,
    IVehicleImmobilizedPayload['cause'],
  ];
  const eventInput =
    typeof input !== 'string'
      ? input
      : { gameId: input, sequence, turn, phase, unitId, cause };
  const payload: IVehicleImmobilizedPayload = {
    unitId: eventInput.unitId,
    cause: eventInput.cause,
  };
  return {
    ...createEventBase(
      eventInput.gameId,
      eventInput.sequence,
      GameEventType.VehicleImmobilized,
      eventInput.turn,
      eventInput.phase,
      eventInput.unitId,
    ),
    payload,
  };
}

/**
 * Emitted when a vehicle turret is locked (primary or secondary).
 */
export function createTurretLockedEvent(
  input: (IGameplayEventContext & { readonly secondary: boolean }) | string,
  ...legacy:
    | []
    | [
        sequence: number,
        turn: number,
        phase: GamePhase,
        unitId: string,
        secondary: boolean,
      ]
): IGameEvent {
  const [sequence, turn, phase, unitId, secondary] = legacy as [
    number,
    number,
    GamePhase,
    string,
    boolean,
  ];
  const eventInput =
    typeof input !== 'string'
      ? input
      : { gameId: input, sequence, turn, phase, unitId, secondary };
  const payload: ITurretLockedPayload = {
    unitId: eventInput.unitId,
    secondary: eventInput.secondary,
  };
  return {
    ...createEventBase(
      eventInput.gameId,
      eventInput.sequence,
      GameEventType.TurretLocked,
      eventInput.turn,
      eventInput.phase,
      eventInput.unitId,
    ),
    payload,
  };
}

/**
 * Emitted when a Crew Stunned crit applies. `phasesStunned` is the number
 * of upcoming phases skipped (typically 2 — next movement + weapon).
 */
export function createVehicleCrewStunnedEvent(
  input: (IGameplayEventContext & { readonly phasesStunned: number }) | string,
  ...legacy:
    | []
    | [
        sequence: number,
        turn: number,
        phase: GamePhase,
        unitId: string,
        phasesStunned: number,
      ]
): IGameEvent {
  const [sequence, turn, phase, unitId, phasesStunned] = legacy as [
    number,
    number,
    GamePhase,
    string,
    number,
  ];
  const eventInput =
    typeof input !== 'string'
      ? input
      : { gameId: input, sequence, turn, phase, unitId, phasesStunned };
  const payload: IVehicleCrewStunnedPayload = {
    unitId: eventInput.unitId,
    phasesStunned: eventInput.phasesStunned,
  };
  return {
    ...createEventBase(
      eventInput.gameId,
      eventInput.sequence,
      GameEventType.VehicleCrewStunned,
      eventInput.turn,
      eventInput.phase,
      eventInput.unitId,
    ),
    payload,
  };
}

/**
 * Emitted when a VTOL rotor hit triggers a crash check. `fallDamage` is
 * `10 × altitude`; the caller is responsible for applying that damage
 * via the standard damage pipeline if the crash check fails.
 */
export interface ICreateVTOLCrashCheckEventInput extends IGameplayEventContext {
  readonly altitude: number;
  readonly fallDamage: number;
}

export function createVTOLCrashCheckEvent(
  input: ICreateVTOLCrashCheckEventInput | string,
  ...legacy:
    | []
    | [
        sequence: number,
        turn: number,
        phase: GamePhase,
        unitId: string,
        altitude: number,
        fallDamage: number,
      ]
): IGameEvent {
  const [sequence, turn, phase, unitId, altitude, fallDamage] = legacy as [
    number,
    number,
    GamePhase,
    string,
    number,
    number,
  ];
  const eventInput =
    typeof input !== 'string'
      ? input
      : { gameId: input, sequence, turn, phase, unitId, altitude, fallDamage };
  const payload: IVTOLCrashCheckPayload = {
    unitId: eventInput.unitId,
    altitude: eventInput.altitude,
    fallDamage: eventInput.fallDamage,
  };
  return {
    ...createEventBase(
      eventInput.gameId,
      eventInput.sequence,
      GameEventType.VTOLCrashCheck,
      eventInput.turn,
      eventInput.phase,
      eventInput.unitId,
    ),
    payload,
  };
}
