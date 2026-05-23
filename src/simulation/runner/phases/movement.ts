import {
  Facing,
  GameEventType,
  GamePhase,
  type IEnvironmentalConditions,
  IGameEvent,
  IGameState,
  IHexGrid,
  type IMovementCapability,
} from '@/types/gameplay';
import {
  buildMovementEventPath,
  decomposeMovementSteps,
  maxMovementCostForCapability,
  movementAnimationModeForType,
} from '@/utils/gameplay/movement/eventPath';
import { validateMovement } from '@/utils/gameplay/movement/validation';

import type { IAIPlayer } from '../../ai/IAIPlayer';
import type { IWeapon } from '../../ai/types';

import { SeededRandom } from '../../core/SeededRandom';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import { IViolation } from '../../invariants/types';
import { applyMovementEvent } from '../SimulationRunnerState';
import {
  createMovementCapability,
  toAIUnitState,
} from '../SimulationRunnerSupport';
import { queueMovementDamagePSRs } from './movementDamagePsr';
import { resolveRunnerStandUpAttempt } from './movementStandUp';
import { queueMovementTerrainPSRs } from './movementTerrainPsr';
import { createD6Roller, createGameEvent } from './utils';

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
  movementCapabilitiesByUnit?: ReadonlyMap<string, IMovementCapability>;
  environmentalConditions?: IEnvironmentalConditions;
  random?: SeededRandom;
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
    movementCapabilitiesByUnit,
    environmentalConditions,
    random,
  } = options;
  let currentState = { ...state, phase: GamePhase.Movement };
  const d6Roller = random ? createD6Roller(random) : () => 6;
  violations.push(...invariantRunner.runAll(currentState));

  for (const unitId of Object.keys(currentState.units)) {
    const unit = currentState.units[unitId];
    if (
      unit.destroyed ||
      unit.hasRetreated ||
      unit.hasEjected ||
      unit.shutdown ||
      !unit.pilotConscious
    ) {
      continue;
    }

    const aiUnit = toAIUnitState(unit, weaponsByUnit?.get(unitId));
    const capability =
      movementCapabilitiesByUnit?.get(unitId) ?? createMovementCapability();
    const moveEvent = botPlayer.playMovementPhase(aiUnit, grid, capability);

    if (moveEvent) {
      if (unit.prone) {
        currentState = resolveRunnerStandUpAttempt({
          currentState,
          events,
          gameId,
          unitId,
          d6Roller,
        });
        continue;
      }

      const validation = validateMovement(
        grid,
        {
          unitId,
          coord: unit.position,
          facing: unit.facing,
          prone: unit.prone ?? false,
        },
        moveEvent.payload.to,
        moveEvent.payload.facing as Facing,
        moveEvent.payload.movementType,
        capability,
        unit.heat,
        environmentalConditions,
      );

      if (!validation.valid) {
        continue;
      }

      const committedPayload = {
        ...moveEvent.payload,
        mpUsed: validation.mpCost,
        heatGenerated: validation.heatGenerated,
      };

      currentState = applyMovementEvent(currentState, unitId, committedPayload);

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
      // Current runner PSR wiring covers stand-up before movement commit,
      // then terrain PSRs for rubble, running through rough, ice, water
      // entry/exit, and skidding. Special-equipment PSRs remain follow-on work.
      const path = buildMovementEventPath({
        grid,
        from: unit.position,
        to: committedPayload.to,
        movementType: committedPayload.movementType,
        maxCost: Math.min(
          validation.mpCost,
          maxMovementCostForCapability(
            capability,
            committedPayload.movementType,
          ),
        ),
      });
      const decomposition = decomposeMovementSteps({
        from: unit.position,
        to: committedPayload.to,
        fromFacing: unit.facing as Facing,
        toFacing: committedPayload.facing as Facing,
        movementType: committedPayload.movementType,
        mpUsed: committedPayload.mpUsed,
        path,
        grid,
      });
      const mode = movementAnimationModeForType(committedPayload.movementType);

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
            to: committedPayload.to,
            facing: committedPayload.facing as Facing,
            movementType: committedPayload.movementType,
            ...(mode ? { mode } : {}),
            path,
            mpUsed: committedPayload.mpUsed,
            heatGenerated: committedPayload.heatGenerated,
            hexesMoved: decomposition.hexesMoved,
            straightHexes: decomposition.straightHexes,
            turningMpCost: decomposition.turningMpCost,
            netDisplacement: decomposition.netDisplacement,
            steps: decomposition.steps,
          },
          unitId,
        ),
      );

      currentState = queueMovementDamagePSRs({
        currentState,
        events,
        gameId,
        unitId,
        movementType: committedPayload.movementType,
        steps: decomposition.steps,
      });

      currentState = queueMovementTerrainPSRs({
        currentState,
        events,
        gameId,
        grid,
        unitId,
        movementType: committedPayload.movementType,
        steps: decomposition.steps,
      });
    }
  }

  violations.push(...invariantRunner.runAll(currentState));
  return currentState;
}
