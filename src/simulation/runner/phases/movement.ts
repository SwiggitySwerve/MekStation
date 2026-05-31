import {
  Facing,
  GameEventType,
  GamePhase,
  type IEnvironmentalConditions,
  IGameEvent,
  IGameState,
  IHexGrid,
  type IMovementCapability,
  type IMovementDeclaredPayload,
  MovementType,
} from '@/types/gameplay';
import {
  canUnitGoProne,
  getGoProneMpCost,
} from '@/utils/gameplay/gameSessionProne';
import {
  applyActiveMPBoosters,
  applyJumpJetCriticalDamage,
  applyPartialWingJumpBonus,
  getHeatAdjustedMovementCapability,
} from '@/utils/gameplay/movement/calculations';
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
import { queueMovementEnhancementPSRs } from './movementEnhancementPsr';
import { resolveRunnerStandUpAttempt } from './movementStandUp';
import { queueMovementTerrainPSRs } from './movementTerrainPsr';
import { createD6Roller, createGameEvent } from './utils';

function isGoProneMovementPayload(
  payload: IMovementDeclaredPayload | undefined,
): boolean {
  return payload?.steps?.some((step) => step.kind === 'goProne') ?? false;
}

function createGoPronePayload(
  unitId: string,
  unit: IGameState['units'][string],
): IMovementDeclaredPayload {
  const mpCost = getGoProneMpCost(unit);

  return {
    unitId,
    from: unit.position,
    to: unit.position,
    facing: unit.facing as Facing,
    movementType: MovementType.Stationary,
    path: [unit.position],
    mpUsed: mpCost,
    heatGenerated: 0,
    hexesMoved: 0,
    straightHexes: 0,
    turningMpCost: mpCost,
    netDisplacement: 0,
    steps: [
      {
        kind: 'goProne',
        index: 0,
        at: { q: unit.position.q, r: unit.position.r },
        mpCost,
      },
    ],
  };
}

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
    const baseCapability =
      movementCapabilitiesByUnit?.get(unitId) ?? createMovementCapability();
    const jumpDamageCapability = applyJumpJetCriticalDamage(
      baseCapability,
      unit.componentDamage?.jumpJetsDestroyed,
    );
    const partialWingCapability = applyPartialWingJumpBonus(
      jumpDamageCapability,
      unit.partialWingJumpBonus,
    );
    const hasSourceBackedMovementState =
      unit.hasTSM === true ||
      unit.activeMASC === true ||
      unit.activeSupercharger === true;
    const unboostedCapability = hasSourceBackedMovementState
      ? getHeatAdjustedMovementCapability(
          partialWingCapability,
          unit.heat,
          unit.hasTSM === true,
        )
      : partialWingCapability;
    const capability = applyActiveMPBoosters(
      unboostedCapability,
      unit.activeMASC,
      unit.activeSupercharger,
    );
    const validationHeat = hasSourceBackedMovementState ? 0 : unit.heat;
    const moveEvent = botPlayer.playMovementPhase(aiUnit, grid, capability);

    if (moveEvent) {
      if (isGoProneMovementPayload(moveEvent.payload)) {
        if (!canUnitGoProne(unit)) {
          continue;
        }

        const payload = createGoPronePayload(unitId, unit);
        currentState = applyMovementEvent(currentState, unitId, {
          to: payload.to,
          facing: payload.facing,
          movementType: payload.movementType,
          mpUsed: payload.mpUsed,
          hexesMoved: payload.hexesMoved,
          steps: payload.steps,
        });
        events.push(
          createGameEvent(
            gameId,
            events.length,
            GameEventType.MovementDeclared,
            currentState.turn,
            GamePhase.Movement,
            payload,
            unitId,
          ),
        );
        continue;
      }

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
        validationHeat,
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
      // entry/exit, skidding, and explicit active MASC/Supercharger use.
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

      currentState = applyMovementEvent(currentState, unitId, {
        ...committedPayload,
        hexesMoved: decomposition.hexesMoved,
        steps: decomposition.steps,
      });

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

      currentState = queueMovementEnhancementPSRs({
        currentState,
        events,
        gameId,
        unitId,
        movementType: committedPayload.movementType,
        activeMASC: unit.activeMASC,
        activeSupercharger: unit.activeSupercharger,
        mascTurnsUsed: unit.mascTurnsUsed,
        superchargerTurnsUsed: unit.superchargerTurnsUsed,
      });
    }
  }

  violations.push(...invariantRunner.runAll(currentState));
  return currentState;
}
