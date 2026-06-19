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

it('blocks runner follow-up movement from another-unit occupied start hex without blocking go-prone', () => {
  const grid = setOccupant(createMinimalGrid(3), { q: 0, r: 0 }, 'enemy-1');
  const movement = runScriptedMove(grid, { q: 1, r: 0 });
  const unit = createMinimalUnitState('player-1', GameSide.Player, {
    q: 0,
    r: 0,
  });
  const state = {
    gameId: 'runner-enemy-occupied-start-go-prone',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.Movement,
    activationIndex: 0,
    units: {
      'player-1': unit,
    },
    turnEvents: [],
  };
  const events: Parameters<typeof runMovementPhase>[0]['events'] = [];
  const violations: Parameters<typeof runMovementPhase>[0]['violations'] = [];

  const prone = runMovementPhase({
    state,
    botPlayer: new ScriptedGoPronePlayer('player-1'),
    grid,
    invariantRunner: new InvariantRunner(),
    violations,
    events,
    gameId: state.gameId,
  });

  expectSingleMovementInvalid(movement.events, 'InvalidDestination');
  expect(movement.events[0]?.payload).toMatchObject({
    details:
      'Unit cannot make follow-up movement from a start hex occupied by another unit',
  });
  expect(events).toContainEqual(
    expect.objectContaining({
      type: GameEventType.MovementDeclared,
      payload: expect.objectContaining({
        unitId: 'player-1',
        steps: [expect.objectContaining({ kind: 'goProne' })],
      }),
    }),
  );
  expect(prone.units['player-1'].prone).toBe(true);
  expect(
    MOVEMENT_RULE_COMBAT_SUPPORT[
      'go-prone-enemy-occupied-start-follow-up-block'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'same-hex GO_PRONE posture remains legal',
    ),
  });
  expect(
    MOVEMENT_RULE_COMBAT_SUPPORT[
      'go-prone-enemy-occupied-start-follow-up-block'
    ].gap,
  ).toBeUndefined();
  expect(MOVEMENT_RULE_COMBAT_SUPPORT['go-prone-side-paths']).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'go-prone-enemy-occupied-start-follow-up-block',
    ),
  });
  expect(
    MOVEMENT_RULE_COMBAT_SUPPORT['go-prone-side-paths'].gap,
  ).toBeUndefined();
});

it('rejects scripted go-prone for explicit non-Mek units', () => {
  const unit = {
    ...createMinimalUnitState('player-1', GameSide.Player, { q: 0, r: 0 }),
    unitType: UnitType.VEHICLE,
  };
  const state = {
    gameId: 'runner-non-mek-go-prone-validation',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.Movement,
    activationIndex: 0,
    units: {
      'player-1': unit,
    },
    turnEvents: [],
  };
  const events: Parameters<typeof runMovementPhase>[0]['events'] = [];
  const violations: Parameters<typeof runMovementPhase>[0]['violations'] = [];

  const next = runMovementPhase({
    state,
    botPlayer: new ScriptedGoPronePlayer('player-1'),
    grid: createMinimalGrid(3),
    invariantRunner: new InvariantRunner(),
    violations,
    events,
    gameId: state.gameId,
  });

  expect(
    events.some((event) => event.type === GameEventType.MovementDeclared),
  ).toBe(false);
  expect(next.units['player-1'].prone).toBe(false);
});

it('resolves a successful stand-up PSR before committing prone movement', () => {
  const target = { q: 1, r: 0 };

  const { next, events } = runScriptedMove(
    createMinimalGrid(3),
    target,
    {
      prone: true,
      piloting: 5,
      pilotWounds: 1,
    },
    { random: fixedRandom(0.99) },
  );
  const triggered = events.find(
    (event) => event.type === GameEventType.PSRTriggered,
  )?.payload as IPSRTriggeredPayload | undefined;
  const resolved = events.find(
    (event) => event.type === GameEventType.PSRResolved,
  )?.payload as IPSRResolvedPayload | undefined;
  const stood = events.find((event) => event.type === GameEventType.UnitStood)
    ?.payload as IUnitStoodPayload | undefined;

  expect(
    events.some((event) => event.type === GameEventType.MovementDeclared),
  ).toBe(false);
  expect(triggered).toMatchObject({
    unitId: 'player-1',
    reasonCode: PSRTrigger.StandingUp,
    basePilotingSkill: 5,
  });
  expect(resolved).toMatchObject({
    unitId: 'player-1',
    reasonCode: PSRTrigger.StandingUp,
    targetNumber: 6,
    passed: true,
  });
  expect(stood).toMatchObject({
    unitId: 'player-1',
    roll: 12,
    targetNumber: 6,
  });
  expect(next.units['player-1'].position).toEqual({ q: 0, r: 0 });
  expect(next.units['player-1'].prone).toBe(false);
  expect(next.units['player-1'].pendingPSRs ?? []).toEqual([]);
  expect(COMBAT_COMMAND_ACTION_SUPPORT['movement.stand']).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('InteractiveSession.attemptStandUp'),
  });
  expect(MOVEMENT_RULE_COMBAT_SUPPORT.stand).toMatchObject({
    level: 'integrated',
  });
  expect(
    RUNNER_PSR_TRIGGER_COMBAT_SUPPORT[PSRTrigger.StandingUp],
  ).toMatchObject({
    level: 'integrated',
  });
});

it('applies Animal Mimicry to runner quad Mek stand-up PSRs', () => {
  const { events } = runScriptedMove(
    createMinimalGrid(3),
    { q: 1, r: 0 },
    {
      abilities: ['animal_mimic'],
      isQuad: true,
      piloting: 5,
      prone: true,
    },
    { random: fixedRandom(0.5) },
  );
  const resolved = events.find(
    (event) => event.type === GameEventType.PSRResolved,
  )?.payload as IPSRResolvedPayload | undefined;

  expect(resolved).toMatchObject({
    unitId: 'player-1',
    reasonCode: PSRTrigger.StandingUp,
    targetNumber: 4,
    modifiers: -1,
    roll: 8,
    passed: true,
  });
  expect(SPA_COMBAT_SUPPORT['animal-mimicry']).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('Animal Mimicry'),
  });
});

it('suppresses VDNI piloting target-number relief when neural interface is disconnected', () => {
  const { events } = runScriptedMove(
    createMinimalGrid(3),
    { q: 1, r: 0 },
    {
      abilities: ['vdni'],
      neuralInterfaceActive: false,
      piloting: 5,
      prone: true,
      unitType: UnitType.BATTLEMECH,
    },
    { random: fixedRandom(0.5) },
  );
  const resolved = events.find(
    (event) => event.type === GameEventType.PSRResolved,
  )?.payload as IPSRResolvedPayload | undefined;

  expect(resolved).toMatchObject({
    unitId: 'player-1',
    reasonCode: PSRTrigger.StandingUp,
    targetNumber: 5,
    modifiers: 0,
    roll: 8,
    passed: true,
  });
});
