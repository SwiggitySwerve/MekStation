import {
  Facing,
  GameEventType,
  GamePhase,
  IGameEvent,
  IGameState,
  IHexGrid,
} from '@/types/gameplay';
import {
  gridWithUnitOccupants,
  validateCommittedMovement,
} from '@/utils/gameplay/movement';
import {
  decomposeMovementSteps,
  movementAnimationModeForType,
} from '@/utils/gameplay/movement/eventPath';

import type { IAIPlayer } from '../../ai/IAIPlayer';
import type { IWeapon } from '../../ai/types';

import { InvariantRunner } from '../../invariants/InvariantRunner';
import { IViolation } from '../../invariants/types';
import { applyMovementEvent } from '../SimulationRunnerState';
import {
  createMovementCapability,
  toAIUnitState,
} from '../SimulationRunnerSupport';
import { createGameEvent } from './utils';

export function runMovementPhase(options: {
  state: IGameState;
  botPlayer: IAIPlayer;
  grid: IHexGrid;
  invariantRunner: InvariantRunner;
  violations: IViolation[];
  events: IGameEvent[];
  gameId: string;
  /**
   * Per `add-combat-fidelity-suite` Phase 1: per-unit hydrated weapon list,
   * keyed by runner unit id. When the lookup misses, `toAIUnitState` falls
   * back to the synthetic single-medium-laser path. Optional so existing
   * non-swarm callers keep their current behavior.
   */
  weaponsByUnit?: ReadonlyMap<string, readonly IWeapon[]>;
}): IGameState {
  const {
    botPlayer,
    events,
    gameId,
    grid,
    invariantRunner,
    state,
    violations,
    weaponsByUnit,
  } = options;
  let currentState = { ...state, phase: GamePhase.Movement };
  violations.push(...invariantRunner.runAll(currentState));

  for (const unitId of Object.keys(currentState.units)) {
    const unit = currentState.units[unitId];
    if (unit.destroyed) {
      continue;
    }

    const aiUnit = toAIUnitState(unit, weaponsByUnit?.get(unitId));
    const capability = createMovementCapability();
    const moveEvent = botPlayer.playMovementPhase(aiUnit, grid, capability);

    if (moveEvent) {
      const validation = validateCommittedMovement({
        grid: gridWithUnitOccupants(grid, currentState.units),
        unit,
        to: moveEvent.payload.to,
        facing: moveEvent.payload.facing as Facing,
        movementType: moveEvent.payload.movementType,
        capability,
      });

      if (!validation.valid) {
        events.push(
          createGameEvent(
            gameId,
            events.length,
            GameEventType.MovementInvalid,
            currentState.turn,
            GamePhase.Movement,
            {
              unitId,
              from: unit.position,
              to: moveEvent.payload.to,
              facing: moveEvent.payload.facing as Facing,
              movementType: moveEvent.payload.movementType,
              reason: validation.reason,
              details: validation.details,
              mpCost: validation.mpCost,
              heatGenerated: validation.heatGenerated,
            },
            unitId,
          ),
        );
        continue;
      }

      currentState = applyMovementEvent(currentState, unitId, {
        ...moveEvent.payload,
        mpUsed: validation.mpCost,
      });

      // Per `enrich-movement-declared-with-chain-and-displacement`
      // (movement-system delta): synthesize the per-step chain plus the
      // four decomposition fields (`hexesMoved` / `straightHexes` /
      // `turningMpCost` / `netDisplacement`) and the visited path so
      // every `MovementDeclared` event carries a complete picture of
      // the move's commit history. The bot today does not surface a
      // pre-computed path, so we let the helper fall back to a
      // straight-line `hexLine` projection — adequate for the runner's
      // simulation needs and for the readable-companion formatter.
      //
      // TODO PR-C follow-on (`enrich-movement-declared-with-chain-and-displacement`
      // piloting-skill-rolls delta — Movement-Step PSR Trigger-Source Stamping):
      // when the runner gains true mid-move PSR resolution (skid on
      // ice, jump-landing leg damage, AttemptStand, swarm-dislodge),
      // pass `decomposition.steps[i].index` into the corresponding
      // `createSkiddingPSR` / `createIcePSR` / `createStandingUpPSR`
      // factory call so the emitted `psr_triggered` event carries
      // `triggerSource: 'movement-step:<index>'`. The factories
      // already accept the optional `stepIndex` parameter; the only
      // missing piece is the runner-side wiring once the mid-move
      // PSR phase exists. PSRs that fire OUTSIDE movement-step
      // resolution (damage, heat, gyro destroyed) MUST RETAIN their
      // existing free-string `triggerSource` values.
      const decomposition = decomposeMovementSteps({
        from: unit.position,
        to: moveEvent.payload.to,
        fromFacing: unit.facing as Facing,
        toFacing: moveEvent.payload.facing as Facing,
        movementType: moveEvent.payload.movementType,
        mpUsed: validation.mpCost,
        path: validation.path,
        grid,
      });
      const mode = movementAnimationModeForType(moveEvent.payload.movementType);

      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.MovementDeclared,
          currentState.turn,
          GamePhase.Movement,
          {
            unitId,
            from: unit.position,
            to: moveEvent.payload.to,
            facing: moveEvent.payload.facing as Facing,
            movementType: moveEvent.payload.movementType,
            ...(mode ? { mode } : {}),
            path: validation.path,
            mpUsed: validation.mpCost,
            heatGenerated: validation.heatGenerated,
            hexesMoved: decomposition.hexesMoved,
            straightHexes: decomposition.straightHexes,
            turningMpCost: decomposition.turningMpCost,
            netDisplacement: decomposition.netDisplacement,
            steps: decomposition.steps,
          },
          unitId,
        ),
      );
    }
  }

  violations.push(...invariantRunner.runAll(currentState));
  return currentState;
}
