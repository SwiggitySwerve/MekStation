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

import { createEventBase } from './base';

/**
 * Emitted when a vehicle hit triggers a motive-damage roll. The severity
 * and mpPenalty match the 2d6 motive-damage table (TW p.193).
 */
export function createMotiveDamagedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  severity: IMotiveDamagedPayload['severity'],
  mpPenalty: number,
  rolls?: readonly number[],
): IGameEvent {
  const payload: IMotiveDamagedPayload = {
    unitId,
    severity,
    mpPenalty,
    rolls,
  };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.MotiveDamaged,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

/**
 * Emitted after motive damage mutates a vehicle's effective MP — useful
 * for pathfinder invalidation and UI gauges.
 */
export function createMotivePenaltyAppliedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  previousCruiseMP: number,
  newCruiseMP: number,
  newFlankMP: number,
): IGameEvent {
  const payload: IMotivePenaltyAppliedPayload = {
    unitId,
    previousCruiseMP,
    newCruiseMP,
    newFlankMP,
  };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.MotivePenaltyApplied,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

/**
 * Emitted when a vehicle transitions to immobilized (one-way). Callers
 * pick the `cause` matching the trigger.
 */
export function createVehicleImmobilizedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  cause: IVehicleImmobilizedPayload['cause'],
): IGameEvent {
  const payload: IVehicleImmobilizedPayload = { unitId, cause };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.VehicleImmobilized,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

/**
 * Emitted when a vehicle turret is locked (primary or secondary).
 */
export function createTurretLockedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  secondary: boolean,
): IGameEvent {
  const payload: ITurretLockedPayload = { unitId, secondary };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.TurretLocked,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

/**
 * Emitted when a Crew Stunned crit applies. `phasesStunned` is the number
 * of upcoming phases skipped (typically 2 — next movement + weapon).
 */
export function createVehicleCrewStunnedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  phasesStunned: number,
): IGameEvent {
  const payload: IVehicleCrewStunnedPayload = { unitId, phasesStunned };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.VehicleCrewStunned,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

/**
 * Emitted when a VTOL rotor hit triggers a crash check. `fallDamage` is
 * `10 × altitude`; the caller is responsible for applying that damage
 * via the standard damage pipeline if the crash check fails.
 */
export function createVTOLCrashCheckEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  altitude: number,
  fallDamage: number,
): IGameEvent {
  const payload: IVTOLCrashCheckPayload = { unitId, altitude, fallDamage };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.VTOLCrashCheck,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}
