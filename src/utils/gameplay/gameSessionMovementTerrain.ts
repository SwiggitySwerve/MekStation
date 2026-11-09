import type {
  Facing,
  IGameEvent,
  IGameSession,
  IHexGrid,
  IMovementCapability,
  IMovementDeclaredPayload,
  IUnitGameState,
} from '@/types/gameplay';

import { GameEventType, GamePhase } from '@/types/gameplay';

import { createPSRTriggeredEvent, createUnitStuckEvent } from './gameEvents';
import { appendEvent } from './gameSessionEvents';
import { decomposeMovementSteps } from './movement/eventPathDecomposition';
import { planRunningWithDamagePSR } from './movement/runningDamagePsr';
import {
  planMovementTerrainEffects,
  type MovementTerrainEffect,
} from './movement/terrainPsrTriggers';

/** One committed interactive movement, as declared. */
export interface IInteractiveMovementTerrainInput {
  readonly grid: IHexGrid;
  /** The declared movement (`MovementDeclared` payload). */
  readonly declared: IMovementDeclaredPayload;
  /** The unit's facing before it moved. */
  readonly fromFacing: Facing;
  /** The unit after the declaration applied (stand-up and jump unstick included). */
  readonly mover: IUnitGameState;
  readonly capability?: IMovementCapability;
}

/**
 * Build the movement PSR events for one interactive movement from the shared
 * producers, numbered from `startSequence`: the running-with-damage roll
 * (`planRunningWithDamagePSR`) first, then the terrain effects
 * (`planMovementTerrainEffects`), the order the runner queues them in. Steps
 * come from the canonical decomposition of the declared path; the
 * `MovementDeclared` payload itself is not changed.
 */
export function buildInteractiveMovementTerrainEvents(
  session: IGameSession,
  input: IInteractiveMovementTerrainInput,
  startSequence: number,
): readonly IGameEvent[] {
  const { capability, declared, fromFacing, grid, mover } = input;
  const { steps } = decomposeMovementSteps({
    from: declared.from,
    to: declared.to,
    fromFacing,
    toFacing: declared.facing,
    movementType: declared.movementType,
    mpUsed: declared.mpUsed,
    path: declared.path,
    grid,
    movementCapability: capability,
  });
  const runningDamage = planRunningWithDamagePSR({
    unitId: declared.unitId,
    unit: mover,
    movementType: declared.movementType,
    steps,
  });
  const effects: readonly MovementTerrainEffect[] = [
    ...(runningDamage ? [{ kind: 'psr' as const, psr: runningDamage }] : []),
    ...planMovementTerrainEffects({
      grid,
      unitId: declared.unitId,
      unit: mover,
      movementType: declared.movementType,
      movementMode: capability?.movementMode,
      steps,
    }),
  ];
  const piloting = session.units.find(
    (unit) => unit.id === declared.unitId,
  )?.piloting;
  const { turn } = session.currentState;

  return effects.map((effect, offset) => {
    const sequence = startSequence + offset;
    if (effect.kind === 'stuck') {
      return createUnitStuckEvent(
        session.id,
        sequence,
        turn,
        GamePhase.Movement,
        declared.unitId,
        effect.reason,
        effect.reasonCode,
      );
    }
    const { psr } = effect;
    return createPSRTriggeredEvent(
      session.id,
      sequence,
      turn,
      GamePhase.Movement,
      declared.unitId,
      psr.reason,
      psr.additionalModifier,
      psr.triggerSource,
      piloting,
      psr.reasonCode,
      psr.fixedTargetNumber,
    );
  });
}

/**
 * Append the terrain events for the movement the session just declared. The
 * last event must be that unit's `MovementDeclared`; call this once, right
 * after `declareMovement` and before the movement is locked.
 */
export function appendInteractiveMovementTerrainEffects(
  session: IGameSession,
  options: {
    readonly grid: IHexGrid;
    readonly unitId: string;
    readonly fromFacing: Facing;
    readonly capability?: IMovementCapability;
  },
): IGameSession {
  const last = session.events[session.events.length - 1];
  const declared = last?.payload as IMovementDeclaredPayload | undefined;
  if (
    last?.type !== GameEventType.MovementDeclared ||
    declared?.unitId !== options.unitId
  ) {
    throw new Error(
      `Terrain effects need ${options.unitId}'s MovementDeclared as the last event`,
    );
  }

  const events = buildInteractiveMovementTerrainEvents(
    session,
    {
      grid: options.grid,
      declared,
      fromFacing: options.fromFacing,
      mover: session.currentState.units[options.unitId],
      capability: options.capability,
    },
    session.events.length,
  );
  return events.reduce((next, event) => appendEvent(next, event), session);
}
