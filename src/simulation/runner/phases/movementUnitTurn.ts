import {
  Facing,
  GameEventType,
  GamePhase,
  type IEnvironmentalConditions,
  type IGameEvent,
  type IGameState,
  type IHexGrid,
  type IMovementCapability,
  type IMovementDeclaredPayload,
  MovementType,
} from '@/types/gameplay';
import { createSwarmDismountedEvent } from '@/utils/gameplay/gameEvents/battleArmor';
import { createMovementInvalidEvent } from '@/utils/gameplay/gameEvents/movement';
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
import { movementInvalidReasonFromValidation } from '@/utils/gameplay/movement/commitValidation';
import { validateMovement } from '@/utils/gameplay/movement/validation';

import type { IMovementEvent } from '../../ai/AIPlayerEvents';
import type { IAIPlayer } from '../../ai/IAIPlayer';
import type { IWeapon } from '../../ai/types';

import { applyMovementEvent } from '../SimulationRunnerState';
import {
  createMovementCapability,
  toAIUnitState,
} from '../SimulationRunnerSupport';
import { commitValidatedMovement } from './movementCommit';
import { resolveRunnerStandUpAttempt } from './movementStandUp';
import { createGameEvent } from './utils';

type MovementUnit = IGameState['units'][string];
type MovementCommandPayload = IMovementEvent['payload'];

interface MovementCapabilityContext {
  readonly capability: IMovementCapability;
  readonly unboostedCapability: IMovementCapability;
  readonly validationHeat: number;
}

interface MovementUnitTurnOptions {
  currentState: IGameState;
  unitId: string;
  botPlayer: IAIPlayer;
  grid: IHexGrid;
  events: IGameEvent[];
  gameId: string;
  weaponsByUnit?: ReadonlyMap<string, readonly IWeapon[]>;
  movementCapabilitiesByUnit?: ReadonlyMap<string, IMovementCapability>;
  environmentalConditions?: IEnvironmentalConditions;
  optionalRules?: readonly string[];
  d6Roller: () => number;
}

export function runMovementUnitTurn(
  options: MovementUnitTurnOptions,
): IGameState {
  const {
    currentState,
    unitId,
    botPlayer,
    grid,
    events,
    gameId,
    weaponsByUnit,
    movementCapabilitiesByUnit,
    environmentalConditions,
    optionalRules,
    d6Roller,
  } = options;
  const unit = currentState.units[unitId];
  if (!unit || shouldSkipMovementUnit(unit)) return currentState;

  const capabilityContext = movementCapabilityContext(
    unit,
    movementCapabilitiesByUnit?.get(unitId),
  );
  const aiUnit = toAIUnitState(unit, weaponsByUnit?.get(unitId));
  const moveEvent = botPlayer.playMovementPhase(
    aiUnit,
    grid,
    capabilityContext.capability,
  );

  if (!moveEvent) return currentState;
  if (isGoProneMovementPayload(moveEvent.payload)) {
    return resolveGoProneMovement({
      currentState,
      events,
      gameId,
      unitId,
      unit,
    });
  }

  if (unit.prone) {
    return resolveRunnerStandUpAttempt({
      currentState,
      events,
      gameId,
      unitId,
      d6Roller,
    });
  }

  const validationCapability = movementCapabilityWithUnitLegProfile(
    unit,
    movementCapabilityForCommand(moveEvent.payload, capabilityContext),
  );
  const validation = validateMovement(
    grid,
    {
      unitId,
      coord: unit.position,
      facing: unit.facing,
      prone: unit.prone ?? false,
      isStuck: unit.isStuck ?? false,
    },
    moveEvent.payload.to,
    moveEvent.payload.facing as Facing,
    moveEvent.payload.movementType,
    validationCapability,
    capabilityContext.validationHeat,
    environmentalConditions,
    { environmentalConditions, pilotAbilities: unit.abilities },
  );

  if (!validation.valid) {
    emitInvalidMovementEvent({
      currentState,
      events,
      gameId,
      unitId,
      unit,
      payload: moveEvent.payload,
      error: validation.error,
      mpCost: validation.mpCost,
      heatGenerated: validation.heatGenerated,
    });
    return currentState;
  }

  return commitValidatedMovement({
    currentState,
    events,
    gameId,
    grid,
    unitId,
    unit,
    payload: moveEvent.payload,
    validationCapability,
    mpCost: validation.mpCost,
    heatGenerated: validation.heatGenerated,
    environmentalConditions,
    optionalRules,
    d6Roller,
  });
}

function shouldSkipMovementUnit(unit: MovementUnit): boolean {
  return (
    unit.destroyed ||
    unit.hasRetreated ||
    unit.hasEjected ||
    unit.shutdown ||
    !unit.pilotConscious
  );
}

function movementCapabilityContext(
  unit: MovementUnit,
  providedCapability: IMovementCapability | undefined,
): MovementCapabilityContext {
  const baseCapability = providedCapability ?? createMovementCapability();
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

  return {
    capability: applyActiveMPBoosters(
      unboostedCapability,
      unit.activeMASC,
      unit.activeSupercharger,
    ),
    unboostedCapability,
    validationHeat: hasSourceBackedMovementState ? 0 : unit.heat,
  };
}

function movementCapabilityForCommand(
  payload: MovementCommandPayload,
  context: MovementCapabilityContext,
): IMovementCapability {
  return payload.movementType === MovementType.Evade
    ? context.unboostedCapability
    : context.capability;
}

function isGoProneMovementPayload(
  payload: MovementCommandPayload | undefined,
): boolean {
  return payload?.steps?.some((step) => step.kind === 'goProne') ?? false;
}

function resolveGoProneMovement(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  unitId: string;
  unit: MovementUnit;
}): IGameState {
  const { currentState, events, gameId, unitId, unit } = options;
  if (!canUnitGoProne(unit)) return currentState;

  const payload = createGoPronePayload(unitId, unit);
  let nextState = applyMovementEvent(currentState, unitId, {
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
      nextState.turn,
      GamePhase.Movement,
      payload,
      unitId,
    ),
  );
  nextState = clearGoProneSwarmers({
    currentState: nextState,
    events,
    gameId,
    hostId: unitId,
  });

  return nextState;
}

function createGoPronePayload(
  unitId: string,
  unit: MovementUnit,
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

function clearGoProneSwarmers(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  hostId: string;
}): IGameState {
  const { currentState, events, gameId, hostId } = options;
  const host = currentState.units[hostId];
  if (host?.unitType !== 'BattleMech') return currentState;

  let units = currentState.units;
  let changed = false;

  for (const [swarmerId, swarmer] of Object.entries(currentState.units)) {
    if (
      swarmer.combatState?.kind !== 'squad' ||
      swarmer.combatState.state.swarmingUnitId !== hostId
    ) {
      continue;
    }

    const { swarmingUnitId: _swarmingUnitId, ...squadState } =
      swarmer.combatState.state;

    units = {
      ...units,
      [swarmerId]: {
        ...swarmer,
        isSwarming: false,
        combatState: {
          ...swarmer.combatState,
          state: squadState,
        },
      },
    };
    changed = true;

    events.push(
      createSwarmDismountedEvent(
        gameId,
        events.length,
        currentState.turn,
        GamePhase.Movement,
        swarmerId,
        hostId,
        'go_prone_dislodgement',
        0,
      ),
    );
  }

  return changed ? { ...currentState, units } : currentState;
}

function movementCapabilityWithUnitLegProfile(
  unit: MovementUnit,
  capability: IMovementCapability,
): IMovementCapability {
  return unit.isQuad === true && capability.mekLegProfile !== 'quad'
    ? { ...capability, mekLegProfile: 'quad' }
    : capability;
}

function emitInvalidMovementEvent(options: {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  unitId: string;
  unit: MovementUnit;
  payload: MovementCommandPayload;
  error?: string;
  mpCost: number;
  heatGenerated: number;
}): void {
  const {
    currentState,
    events,
    gameId,
    unitId,
    unit,
    payload,
    error,
    mpCost,
    heatGenerated,
  } = options;
  events.push(
    createMovementInvalidEvent(
      gameId,
      events.length,
      currentState.turn,
      unitId,
      unit.position,
      payload.to,
      payload.facing as Facing,
      payload.movementType,
      movementInvalidReasonFromValidation(error),
      error,
      mpCost,
      heatGenerated,
    ),
  );
}
