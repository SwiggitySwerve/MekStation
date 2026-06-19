import type {
  IAttackEvent,
  IPhysicalAttackEvent,
  IRetreatEvent,
} from '@/simulation/ai/AIPlayerEvents';
import type { IMovementEvent } from '@/simulation/ai/AIPlayerEvents';
import type { IAIPlayer, IAIUnitState } from '@/simulation/ai/IAIPlayer';
import type {
  IEnvironmentalConditions,
  IHexCoordinate,
  IHexGrid,
  IMovementCapability,
  LightCondition,
} from '@/types/gameplay';

import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import { MovementEnhancementType } from '@/types/construction/MovementEnhancement';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  MovementType,
  PSRTrigger,
  type IDamageAppliedPayload,
  type IGameState,
  type IMinefieldChangedPayload,
  type IMovementDeclaredPayload,
  type IMovementInvalidPayload,
  type IPSRResolvedPayload,
  type IPSRTriggeredPayload,
  type IRepresentedMinefieldState,
  type ISwarmDismountedPayload,
  type IUnitStoodPayload,
} from '@/types/gameplay';
import {
  TerrainType,
  type ITerrainFeature,
} from '@/types/gameplay/TerrainTypes';
import { UnitType } from '@/types/unit';
import { createEnvironmentalConditions } from '@/utils/gameplay/environmentalModifiers';
import { applyEvent } from '@/utils/gameplay/gameState';
import { coordToKey } from '@/utils/gameplay/hexMath';

import { SeededRandom } from '../../core/SeededRandom';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import { COMBAT_COMMAND_ACTION_SUPPORT } from '../CombatActionSupport';
import { CANONICAL_SPA_COMBAT_SCOPE_SUPPORT } from '../CombatCanonicalSpaSupport';
import {
  QUIRK_COMBAT_SUPPORT,
  SPA_COMBAT_SUPPORT,
} from '../CombatFeatureSupport';
import { RUNNER_PSR_TRIGGER_COMBAT_SUPPORT } from '../CombatLifecycleSupport';
import { PILOT_MODIFIER_RESOLVER_COMBAT_SUPPORT } from '../CombatPilotModifierApplicationSupport';
import {
  MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT,
  MOVEMENT_RULE_COMBAT_SUPPORT,
  TERRAIN_ENVIRONMENT_COMBAT_SUPPORT,
} from '../CombatRuleSupport';
import { TERRAIN_TYPE_PSR_COMBAT_SUPPORT } from '../CombatTerrainEnvironmentSupport';
import {
  applyRunnerMinefieldClearing,
  applyRunnerMinefieldCommandDetonation,
  applyRunnerMinefieldDetection,
  applyRunnerMinefieldManualDetonation,
  applyRunnerMinefieldReset,
} from '../phases/minefieldActions';
import { runMovementPhase } from '../phases/movement';
import { applyMovementMinefieldEffects } from '../phases/movementMines';
import { DEFAULT_COMPONENT_DAMAGE } from '../SimulationRunnerConstants';
import { resetTurnState } from '../SimulationRunnerState';
import {
  createMinimalGrid,
  createMinimalUnitState,
} from '../SimulationRunnerSupport';
import {
  ScriptedGoPronePlayer,
  fixedRandom,
  scriptedD6Roller,
  setTerrain,
  setElevation,
  setTerrainFeatures,
  setOccupant,
  runScriptedMove,
  psrPayloads,
  expectMovementEnhancementPsrBeforeMovementCommit,
  expectSingleMovementInvalid,
} from './movementPhase.behavior.test-helpers';

it('commits QuadMek Maneuvering Ace lateral steps at entry cost', () => {
  const target = { q: 1, r: -1 };
  const grid = setTerrain(createMinimalGrid(3), target, TerrainType.LightWoods);
  const { next, events } = runScriptedMove(
    grid,
    target,
    {
      facing: Facing.North,
      secondaryFacing: Facing.North,
      abilities: ['maneuvering_ace'],
      isQuad: true,
    },
    {
      facing: Facing.North,
      capability: { walkMP: 2, runMP: 3, jumpMP: 0 },
    },
  );
  const payload = events.find(
    (event) => event.type === GameEventType.MovementDeclared,
  )?.payload as IMovementDeclaredPayload | undefined;

  expect(payload).toMatchObject({
    unitId: 'player-1',
    to: target,
    facing: Facing.North,
    movementType: MovementType.Walk,
    mpUsed: 2,
    hexesMoved: 1,
    straightHexes: 1,
    turningMpCost: 0,
  });
  expect(payload?.steps).toEqual([
    expect.objectContaining({
      kind: 'lateral',
      direction: 'right',
      from: { q: 0, r: 0 },
      to: target,
      mpCost: 2,
    }),
  ]);
  expect(next.units['player-1']).toMatchObject({
    position: target,
    facing: Facing.North,
    movementThisTurn: MovementType.Walk,
    hexesMovedThisTurn: 1,
  });
});

it('commits TacOps Evade as run-based movement with source-backed evasion state', () => {
  const target = { q: 2, r: 0 };
  const { next, events } = runScriptedMove(
    createMinimalGrid(4),
    target,
    {},
    {
      movementType: MovementType.Evade,
      capability: { walkMP: 2, runMP: 3, jumpMP: 0 },
    },
  );
  const payload = events.find(
    (event) => event.type === GameEventType.MovementDeclared,
  )?.payload as IMovementDeclaredPayload | undefined;

  expect(payload).toMatchObject({
    unitId: 'player-1',
    to: target,
    movementType: MovementType.Evade,
    mode: MovementType.Run,
    mpUsed: 2,
    heatGenerated: 4,
    hexesMoved: 2,
  });
  expect(next.units['player-1']).toMatchObject({
    position: target,
    movementThisTurn: MovementType.Evade,
    isEvading: true,
    evasionBonus: 1,
    hexesMovedThisTurn: 2,
  });

  const reset = resetTurnState(next);
  expect(reset.units['player-1']).toMatchObject({
    sprintedThisTurn: false,
    isEvading: false,
    evasionBonus: undefined,
  });
});

it('does not allow MASC or Supercharger boosted MP to extend TacOps Evade reach', () => {
  const target = { q: 4, r: 0 };
  const { next, events } = runScriptedMove(
    createMinimalGrid(5),
    target,
    {
      hasMASC: true,
      activeMASC: true,
    },
    {
      movementType: MovementType.Evade,
      capability: { walkMP: 2, runMP: 3, jumpMP: 0 },
    },
  );

  expectSingleMovementInvalid(events, 'InsufficientMP');
  expect(next.units['player-1']).toMatchObject({
    position: { q: 0, r: 0 },
    movementThisTurn: MovementType.Stationary,
  });
  expect(next.units['player-1'].isEvading).not.toBe(true);
  expect(next.units['player-1'].evasionBonus).toBeUndefined();
});

it('commits TacOps Sprint as run-based movement with source-backed sprint state', () => {
  const target = { q: 4, r: 0 };
  const { next, events } = runScriptedMove(
    createMinimalGrid(5),
    target,
    {},
    {
      movementType: MovementType.Sprint,
      capability: { walkMP: 2, runMP: 3, jumpMP: 0 },
    },
  );
  const payload = events.find(
    (event) => event.type === GameEventType.MovementDeclared,
  )?.payload as IMovementDeclaredPayload | undefined;

  expect(payload).toMatchObject({
    unitId: 'player-1',
    to: target,
    movementType: MovementType.Sprint,
    mode: MovementType.Run,
    mpUsed: 4,
    heatGenerated: 3,
    hexesMoved: 4,
  });
  expect(next.units['player-1']).toMatchObject({
    position: target,
    movementThisTurn: MovementType.Sprint,
    sprintedThisTurn: true,
    isEvading: false,
    hexesMovedThisTurn: 4,
  });

  const reset = resetTurnState(next);
  expect(reset.units['player-1']).toMatchObject({
    sprintedThisTurn: false,
    isEvading: false,
    evasionBonus: undefined,
  });
});

it('applies active MASC/Supercharger sprint MP and queues their failure PSRs', () => {
  const target = { q: 12, r: 0 };
  const { next, events } = runScriptedMove(
    createMinimalGrid(13),
    target,
    {
      hasMASC: true,
      hasSupercharger: true,
      activeMASC: true,
      activeSupercharger: true,
    },
    {
      movementType: MovementType.Sprint,
      capability: { walkMP: 4, runMP: 6, jumpMP: 0 },
    },
  );
  const movementPayload = events.find(
    (event) => event.type === GameEventType.MovementDeclared,
  )?.payload as IMovementDeclaredPayload | undefined;
  const payloads = psrPayloads(events);

  expect(movementPayload).toMatchObject({
    unitId: 'player-1',
    to: target,
    movementType: MovementType.Sprint,
    mpUsed: 12,
    heatGenerated: 3,
  });
  expect(next.units['player-1']).toMatchObject({
    position: target,
    sprintedThisTurn: true,
  });
  expect(payloads).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        fixedTargetNumber: 3,
        reasonCode: PSRTrigger.MASCFailure,
        triggerSource: PSRTrigger.MASCFailure,
      }),
      expect.objectContaining({
        fixedTargetNumber: 3,
        reasonCode: PSRTrigger.SuperchargerFailure,
        triggerSource: PSRTrigger.SuperchargerFailure,
      }),
    ]),
  );
});

it('applies Terrain Master: Mountaineer movement relief before committing runner movement', () => {
  const target = { q: 1, r: 0 };
  const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Rubble);

  const { next, events } = runScriptedMove(
    grid,
    target,
    { abilities: ['tm_mountaineer'] },
    {
      movementType: MovementType.Walk,
      capability: { walkMP: 1, runMP: 1, jumpMP: 0 },
    },
  );
  const payload = events.find(
    (event) => event.type === GameEventType.MovementDeclared,
  )?.payload as IMovementDeclaredPayload | undefined;

  expect(payload).toMatchObject({
    unitId: 'player-1',
    to: target,
    mpUsed: 1,
    heatGenerated: 1,
  });
  expect(next.units['player-1'].position).toEqual(target);
  expect(SPA_COMBAT_SUPPORT.tm_mountaineer).toMatchObject({
    level: 'integrated',
  });
});
