import type { IGameSession } from '@/types/gameplay/GameSessionInterfaces';
import type {
  IRuntimeMovementStateChangedPayload,
  StandUpMode,
} from '@/types/gameplay/GameSessionMovementEvents';
import type { D6Roller, DiceRoller } from '@/utils/gameplay/diceTypes';

import { GameEventType } from '@/types/gameplay';
import {
  Facing,
  MovementType,
  type IHexCoordinate,
  type IHexGrid,
  type IMovementCapability,
} from '@/types/gameplay/HexGridInterfaces';
import { applyAirMekLandingControlPSR } from '@/utils/gameplay/airMekLandingPsr';
import { createRuntimeMovementStateChangedEvent } from '@/utils/gameplay/gameEvents';
import {
  attemptStandUp,
  declareMovement,
  lockMovement,
} from '@/utils/gameplay/gameSession';
import { appendEvent } from '@/utils/gameplay/gameSession';
import {
  calculateMovementHeat,
  gridWithUnitOccupants,
  getHullDownEntryCost,
  getHullDownExitCost,
  getStandingCost,
  resolveRuntimeMovementCapability,
  validateCommittedMovement,
} from '@/utils/gameplay/movement';
import { pendingAltitudeControlMovementCost } from '@/utils/gameplay/movement/altitudeControlAccounting';
import { automaticWigeLandingRuntimePatch } from '@/utils/gameplay/movement/automaticWigeLanding';
import { pendingConversionMovementCost } from '@/utils/gameplay/movement/conversionAccounting';

import {
  appendInteractiveMovementInvalid,
  hullDownEntryInvalidDetails,
  hullDownGoProneInvalidDetails,
} from './InteractiveSession.actions.movementPosture';

export interface IApplyMovementInput {
  readonly session: IGameSession;
  readonly grid: IHexGrid;
  readonly movementByUnit: Map<string, IMovementCapability>;
  readonly unitId: string;
  readonly to: IHexCoordinate;
  readonly facing: Facing;
  readonly movementType: MovementType;
  /** Optional pre-computed path; built from the grid when omitted. */
  readonly path?: readonly IHexCoordinate[];
  /** Optional authoritative roller for stand-up PSR resolution. */
  readonly diceRoller?: DiceRoller;
  /** Normal GET_UP or TacOps CAREFUL_STAND for prone stand-up attempts. */
  readonly standUpMode?: StandUpMode;
  /** MegaMek HULL_DOWN posture transition for standing Mek-style units. */
  readonly hullDownEntryAttempt?: boolean;
  /** MegaMek GO_PRONE posture transition from hull-down to prone. */
  readonly goProneAttempt?: boolean;
}

/**
 * Declare and lock a unit's movement for the current Movement phase.
 * Returns the unchanged session when the unit id is unknown (callers
 * treat a missing unit as a no-op). When no explicit path is given the
 * event path is rebuilt from the grid so movement costs stay in
 * lockstep with the pathfinder.
 */
export function applyInteractiveSessionMovement(
  input: IApplyMovementInput,
): IGameSession {
  const unit = input.session.currentState.units[input.unitId];
  if (!unit) return input.session;

  const from = unit.position;
  const pendingConversion = pendingConversionMovementCost(unit);
  const pendingAltitudeControl = pendingAltitudeControlMovementCost(unit);
  const gridWithOccupants = gridWithUnitOccupants(
    input.grid,
    input.session.currentState.units,
  );
  const rawMovementCapability = input.movementByUnit.get(input.unitId);
  const movementCapability = rawMovementCapability
    ? (resolveRuntimeMovementCapability(unit, rawMovementCapability) ??
      rawMovementCapability)
    : undefined;
  const validation = validateCommittedMovement({
    grid: gridWithOccupants,
    unit,
    to: input.to,
    facing: input.facing,
    movementType: input.movementType,
    capability: movementCapability,
    path: input.path,
    standUpMode: input.standUpMode,
    optionalRules: input.session.config.optionalRules,
  });

  if (!validation.valid) {
    return appendInteractiveMovementInvalid({
      session: input.session,
      unitId: input.unitId,
      from,
      to: input.to,
      facing: input.facing,
      movementType: input.movementType,
      reason: validation.reason,
      details: validation.details,
      mpCost: validation.mpCost,
      heatGenerated: validation.heatGenerated,
    });
  }

  if (input.hullDownEntryAttempt === true) {
    const invalidHullDownEntryDetails = hullDownEntryInvalidDetails({
      unit,
      movementCapability,
      from,
      to: input.to,
      facing: input.facing,
      movementType: input.movementType,
      optionalRules: input.session.config.optionalRules,
    });
    const hullDownEntryCost = movementCapability
      ? getHullDownEntryCost(unit, movementCapability)
      : 0;
    if (invalidHullDownEntryDetails) {
      return appendInteractiveMovementInvalid({
        session: input.session,
        unitId: input.unitId,
        from,
        to: input.to,
        facing: input.facing,
        movementType: input.movementType,
        reason: 'InvalidDestination',
        details: invalidHullDownEntryDetails,
        mpCost: hullDownEntryCost,
        heatGenerated: 0,
      });
    }

    let session = input.session;
    session = declareMovement(
      session,
      input.unitId,
      from,
      from,
      unit.facing,
      MovementType.Walk,
      hullDownEntryCost,
      calculateMovementHeat(MovementType.Walk, 0, {
        movementMode: movementCapability?.movementMode,
        movementHeatProfile: movementCapability?.movementHeatProfile,
        partialWingJumpBonus: movementCapability?.partialWingJumpBonus,
      }),
      [from],
      { hullDownEntryAttempt: true },
    );
    session = lockMovement(session, input.unitId);
    return session;
  }

  if (input.goProneAttempt === true) {
    const invalidGoProneDetails = hullDownGoProneInvalidDetails({
      unit,
      movementCapability,
      from,
      to: input.to,
      facing: input.facing,
      movementType: input.movementType,
    });
    if (invalidGoProneDetails) {
      return appendInteractiveMovementInvalid({
        session: input.session,
        unitId: input.unitId,
        from,
        to: input.to,
        facing: input.facing,
        movementType: input.movementType,
        reason: 'InvalidDestination',
        details: invalidGoProneDetails,
        mpCost: 0,
        heatGenerated: 0,
      });
    }

    let session = input.session;
    session = declareMovement(
      session,
      input.unitId,
      from,
      from,
      unit.facing,
      MovementType.Stationary,
      0,
      0,
      [from],
      { goProneAttempt: true },
    );
    session = lockMovement(session, input.unitId);
    return session;
  }

  const standUpAttempt =
    unit.prone === true &&
    movementCapability !== undefined &&
    input.movementType !== MovementType.Jump &&
    input.movementType !== MovementType.Stationary;
  const hullDownExitAttempt =
    movementCapability !== undefined &&
    getHullDownExitCost(unit, movementCapability, input.movementType) > 0;

  let session = input.session;
  let standUpSucceeded: boolean | undefined;
  const standUpMode = input.standUpMode ?? 'normal';
  if (standUpAttempt) {
    const beforeStandEventCount = session.events.length;
    session = attemptStandUp(
      session,
      input.unitId,
      input.diceRoller,
      standUpMode,
      movementCapability,
    );
    standUpSucceeded = session.events
      .slice(beforeStandEventCount)
      .some((event) => event.type === GameEventType.UnitStood);

    if (!standUpSucceeded) {
      session = declareMovement(
        session,
        input.unitId,
        from,
        from,
        unit.facing,
        input.movementType,
        getStandingCost(movementCapability, standUpMode),
        calculateMovementHeat(MovementType.Walk, 0, {
          movementMode: movementCapability.movementMode,
          movementHeatProfile: movementCapability.movementHeatProfile,
          partialWingJumpBonus: movementCapability.partialWingJumpBonus,
        }),
        [from],
        {
          standUpAttempt: true,
          standUpSucceeded: false,
          standUpMode,
          conversionStepCount: pendingConversion.stepCount,
          conversionMpCost: pendingConversion.mpCost,
          altitudeControlStepCount: pendingAltitudeControl.stepCount,
          altitudeControlMpCost: pendingAltitudeControl.mpCost,
        },
      );
      session = lockMovement(session, input.unitId);
      return session;
    }
  }

  session = declareMovement(
    session,
    input.unitId,
    from,
    input.to,
    input.facing,
    input.movementType,
    validation.mpCost,
    validation.heatGenerated,
    validation.path,
    {
      standUpAttempt,
      standUpSucceeded,
      standUpMode,
      hullDownExitAttempt,
      conversionStepCount: pendingConversion.stepCount,
      conversionMpCost: pendingConversion.mpCost,
      altitudeControlStepCount: pendingAltitudeControl.stepCount,
      altitudeControlMpCost: pendingAltitudeControl.mpCost,
    },
  );
  const automaticLandingPatch = automaticWigeLandingRuntimePatch(
    unit,
    input.movementType,
    validation.path,
    input.to,
    { movementMode: movementCapability?.movementMode },
  );
  if (automaticLandingPatch) {
    session = appendEvent(
      session,
      createRuntimeMovementStateChangedEvent(
        session.id,
        session.events.length,
        session.currentState.turn,
        input.unitId,
        automaticLandingPatch,
      ),
    );
  }
  session = lockMovement(session, input.unitId);
  return session;
}

export interface IApplyRuntimeMovementStateInput {
  readonly session: IGameSession;
  readonly unitId: string;
  readonly patch: Omit<IRuntimeMovementStateChangedPayload, 'unitId'>;
  readonly diceRoller?: D6Roller;
  readonly tonnageByUnit?: ReadonlyMap<string, number>;
}

export function applyInteractiveSessionRuntimeMovementState(
  input: IApplyRuntimeMovementStateInput,
): IGameSession {
  if (!input.session.currentState.units[input.unitId]) {
    return input.session;
  }

  const session = appendEvent(
    input.session,
    createRuntimeMovementStateChangedEvent(
      input.session.id,
      input.session.events.length,
      input.session.currentState.turn,
      input.unitId,
      input.patch,
    ),
  );
  return applyAirMekLandingControlPSR(
    session,
    input.unitId,
    input.patch,
    input.diceRoller,
    input.tonnageByUnit?.get(input.unitId),
  );
}
