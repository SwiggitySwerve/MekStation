import type {
  Facing,
  IGameSession,
  IHexCoordinate,
  MovementType,
  StandUpMode,
} from '@/types/gameplay';

import { GamePhase } from '@/types/gameplay';

import { createMovementDeclaredEvent } from './gameEvents';
import { appendEvent } from './gameSessionEvents';

export interface IDeclareMovementOptions {
  readonly standUpAttempt?: boolean;
  readonly standUpSucceeded?: boolean;
  readonly standUpMode?: StandUpMode;
  readonly hullDownExitAttempt?: boolean;
  readonly hullDownEntryAttempt?: boolean;
  readonly goProneAttempt?: boolean;
  readonly conversionStepCount?: number;
  readonly conversionMpCost?: number;
  readonly altitudeControlStepCount?: number;
  readonly altitudeControlMpCost?: number;
}

export type DeclareMovement = (
  session: IGameSession,
  unitId: string,
  from: IHexCoordinate,
  to: IHexCoordinate,
  facing: Facing,
  movementType: MovementType,
  mpUsed: number,
  heatGenerated: number,
  path?: readonly IHexCoordinate[],
  options?: IDeclareMovementOptions,
) => IGameSession;

export const declareMovement: DeclareMovement = (...args) => {
  const [
    session,
    unitId,
    from,
    to,
    facing,
    movementType,
    mpUsed,
    heatGenerated,
    path,
    options,
  ] = args;

  if (session.currentState.phase !== GamePhase.Movement) {
    throw new Error('Not in movement phase');
  }

  const unit = session.currentState.units[unitId];
  if (!unit) {
    throw new Error(`Unit ${unitId} not found`);
  }

  const sequence = session.events.length;
  const { turn } = session.currentState;
  const event = createMovementDeclaredEvent(
    session.id,
    sequence,
    turn,
    unitId,
    from,
    to,
    facing,
    movementType,
    mpUsed,
    heatGenerated,
    path,
    options,
  );

  return appendEvent(session, event);
};
