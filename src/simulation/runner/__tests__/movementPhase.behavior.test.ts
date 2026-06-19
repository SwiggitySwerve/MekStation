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

it('rejects invalid ground movement before committing the bot payload', () => {
  const target = { q: 1, r: 0 };
  const grid = setElevation(createMinimalGrid(3), target, 3);

  const { next, events } = runScriptedMove(grid, target);

  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({
    type: GameEventType.MovementInvalid,
    payload: {
      unitId: 'player-1',
      to: target,
      reason: 'TerrainBlocked',
    },
  });
  expect(next.units['player-1'].position).toEqual({ q: 0, r: 0 });
  expect(next.units['player-1'].movementThisTurn).toBe(MovementType.Stationary);
});

it('replaces bot-reported MP and heat with authoritative movement validation', () => {
  const target = { q: 1, r: 0 };
  const grid = setTerrain(createMinimalGrid(3), target, TerrainType.LightWoods);

  const { next, events } = runScriptedMove(grid, target);
  const payload = events.find(
    (event) => event.type === GameEventType.MovementDeclared,
  )?.payload as IMovementDeclaredPayload | undefined;

  expect(payload).toMatchObject({
    unitId: 'player-1',
    to: target,
    mpUsed: 2,
    heatGenerated: 1,
    hexesMoved: 1,
  });
  expect(next.units['player-1'].position).toEqual(target);
  expect(next.units['player-1'].hexesMovedThisTurn).toBe(1);
  expect(next.units['player-1'].heat).toBe(0);
});

it('commits Maneuvering Ace biped lateral shifts through movement validation and event steps', () => {
  const target = { q: 1, r: -1 };
  const { next, events } = runScriptedMove(
    createMinimalGrid(3),
    target,
    {
      facing: Facing.North,
      secondaryFacing: Facing.North,
      abilities: ['maneuvering_ace'],
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
  expect(psrPayloads(events)).not.toContainEqual(
    expect.objectContaining({
      reasonCode: PSRTrigger.ControlledSideslip,
    }),
  );
});

it('queues controlled-sideslip PSRs for represented running lateral movement', () => {
  const target = { q: 1, r: -1 };
  const { next, events } = runScriptedMove(
    createMinimalGrid(3),
    target,
    {
      facing: Facing.North,
      secondaryFacing: Facing.North,
      abilities: ['maneuvering_ace'],
    },
    {
      movementType: MovementType.Run,
      facing: Facing.North,
      capability: { walkMP: 2, runMP: 3, jumpMP: 0 },
    },
  );

  expect(next.units['player-1'].pendingPSRs).toEqual([
    expect.objectContaining({
      entityId: 'player-1',
      reason: 'Controlled sideslip',
      reasonCode: PSRTrigger.ControlledSideslip,
      additionalModifier: -1,
      triggerSource: 'movement-step:0',
    }),
  ]);
  expect(psrPayloads(events)).toEqual([
    expect.objectContaining({
      unitId: 'player-1',
      reason: 'Controlled sideslip',
      reasonCode: PSRTrigger.ControlledSideslip,
      additionalModifier: -1,
      triggerSource: 'movement-step:0',
    }),
  ]);
});

it('queues one flanking-and-turning PSR for represented BattleMech run movement that turns after moving', () => {
  const target = { q: 1, r: -2 };
  const { next, events } = runScriptedMove(
    createMinimalGrid(4),
    target,
    {
      abilities: ['maneuvering_ace'],
      facing: Facing.North,
      secondaryFacing: Facing.North,
    },
    {
      movementType: MovementType.Run,
      facing: Facing.Northeast,
      capability: { walkMP: 2, runMP: 3, jumpMP: 0 },
    },
  );
  const movementPayload = events.find(
    (event) => event.type === GameEventType.MovementDeclared,
  )?.payload as IMovementDeclaredPayload | undefined;

  expect(movementPayload).toMatchObject({
    unitId: 'player-1',
    to: target,
    facing: Facing.Northeast,
    movementType: MovementType.Run,
    mpUsed: 3,
    hexesMoved: 2,
    straightHexes: 2,
    turningMpCost: 1,
  });
  expect(movementPayload?.steps).toEqual([
    expect.objectContaining({
      kind: 'forward',
      index: 0,
      from: { q: 0, r: 0 },
      to: { q: 0, r: -1 },
    }),
    expect.objectContaining({
      kind: 'turn',
      index: 1,
      at: { q: 0, r: -1 },
      fromFacing: Facing.North,
      toFacing: Facing.Northeast,
    }),
    expect.objectContaining({
      kind: 'forward',
      index: 2,
      from: { q: 0, r: -1 },
      to: target,
    }),
  ]);
  expect(next.units['player-1'].pendingPSRs).toEqual([
    expect.objectContaining({
      entityId: 'player-1',
      reason: 'Flanking and turning',
      reasonCode: PSRTrigger.FlankingAndTurning,
      additionalModifier: 0,
      triggerSource: 'movement-step:2',
    }),
  ]);
  expect(psrPayloads(events)).toEqual([
    expect.objectContaining({
      unitId: 'player-1',
      reason: 'Flanking and turning',
      reasonCode: PSRTrigger.FlankingAndTurning,
      additionalModifier: 0,
      triggerSource: 'movement-step:2',
    }),
  ]);
});
