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

it('commits scripted voluntary go-prone as a same-hex movement step', () => {
  const unit = createMinimalUnitState('player-1', GameSide.Player, {
    q: 0,
    r: 0,
  });
  const state = {
    gameId: 'runner-go-prone-validation',
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
  const payload = events.find(
    (event) => event.type === GameEventType.MovementDeclared,
  )?.payload as IMovementDeclaredPayload | undefined;

  expect(payload).toMatchObject({
    unitId: 'player-1',
    from: { q: 0, r: 0 },
    to: { q: 0, r: 0 },
    movementType: MovementType.Stationary,
    mpUsed: 1,
    heatGenerated: 0,
    hexesMoved: 0,
    straightHexes: 0,
    turningMpCost: 1,
    netDisplacement: 0,
    steps: [
      expect.objectContaining({
        kind: 'goProne',
        at: { q: 0, r: 0 },
        mpCost: 1,
      }),
    ],
  });
  expect(next.units['player-1'].position).toEqual({ q: 0, r: 0 });
  expect(next.units['player-1'].prone).toBe(true);
  expect(MOVEMENT_RULE_COMBAT_SUPPORT.prone).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('runner AI'),
  });
});

it('detaches swarming infantry when a BattleMech commits voluntary go-prone', () => {
  const host = createMinimalUnitState('player-1', GameSide.Player, {
    q: 0,
    r: 0,
  });
  const swarmer = {
    ...createMinimalUnitState('opponent-1', GameSide.Opponent, {
      q: 0,
      r: 0,
    }),
    unitType: UnitType.INFANTRY,
    isSwarming: true,
    combatState: {
      kind: 'squad',
      state: {
        unitId: 'opponent-1',
        squadSize: 0,
        troopers: [],
        swarmingUnitId: 'player-1',
        legAttackCommitted: false,
        mimeticActiveThisTurn: true,
        stealthKind: 'mimetic',
        hasMagneticClamp: true,
        hasVibroClaws: false,
        vibroClawCount: 0,
        destroyed: false,
      },
    },
  } as const;
  const state = {
    gameId: 'runner-go-prone-swarmer-dislodge',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.Movement,
    activationIndex: 0,
    units: {
      'player-1': host,
      'opponent-1': swarmer,
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
  const movementPayload = events.find(
    (event) => event.type === GameEventType.MovementDeclared,
  )?.payload as IMovementDeclaredPayload | undefined;
  const dismountPayload = events.find(
    (event) => event.type === GameEventType.SwarmDismounted,
  )?.payload as ISwarmDismountedPayload | undefined;

  expect(movementPayload).toMatchObject({
    unitId: 'player-1',
    from: { q: 0, r: 0 },
    to: { q: 0, r: 0 },
    movementType: MovementType.Stationary,
    steps: [expect.objectContaining({ kind: 'goProne' })],
  });
  expect(dismountPayload).toEqual({
    unitId: 'opponent-1',
    targetUnitId: 'player-1',
    cause: 'go_prone_dislodgement',
    dismountDamage: 0,
  });
  expect(next.units['player-1'].prone).toBe(true);
  expect(next.units['opponent-1'].isSwarming).toBe(false);
  expect(
    next.units['opponent-1'].combatState?.kind === 'squad'
      ? next.units['opponent-1'].combatState.state.swarmingUnitId
      : undefined,
  ).toBeUndefined();
  expect(
    next.units['opponent-1'].combatState?.kind === 'squad'
      ? next.units['opponent-1'].combatState.state.mimeticActiveThisTurn
      : undefined,
  ).toBe(true);
});

it('commits hull-down go-prone at zero MP and clears hull-down posture', () => {
  const unit = {
    ...createMinimalUnitState('player-1', GameSide.Player, { q: 0, r: 0 }),
    hullDown: true,
    infernoBurning: true,
  };
  const state = {
    gameId: 'runner-hull-down-go-prone-validation',
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
  const payload = events.find(
    (event) => event.type === GameEventType.MovementDeclared,
  )?.payload as IMovementDeclaredPayload | undefined;

  expect(payload).toMatchObject({
    unitId: 'player-1',
    mpUsed: 0,
    turningMpCost: 0,
    steps: [
      expect.objectContaining({
        kind: 'goProne',
        mpCost: 0,
      }),
    ],
  });
  expect(next.units['player-1'].prone).toBe(true);
  expect(next.units['player-1'].hullDown).toBe(false);
  expect(next.units['player-1'].infernoBurning).toBe(false);
  expect(
    MOVEMENT_RULE_COMBAT_SUPPORT['go-prone-hull-down-zero-mp-transition'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('zero-MP same-hex GO_PRONE'),
    sourceRefs: expect.arrayContaining([
      expect.objectContaining({
        citation: expect.stringContaining('getGoProneMpCost'),
      }),
      expect.objectContaining({
        citation: expect.stringContaining('applyMovementEvent'),
      }),
    ]),
  });
  expect(MOVEMENT_RULE_COMBAT_SUPPORT['go-prone-side-paths']).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('infernoBurning state'),
  });
  expect(
    MOVEMENT_RULE_COMBAT_SUPPORT['go-prone-side-paths'].gap,
  ).toBeUndefined();
  expect(
    MOVEMENT_RULE_COMBAT_SUPPORT['go-prone-side-paths'].evidence,
  ).toContain('go-prone-enemy-occupied-start-follow-up-block');
  expect(
    MOVEMENT_RULE_COMBAT_SUPPORT['go-prone-side-paths'].sourceRefs,
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        citation: expect.stringContaining('infernoBurning'),
      }),
    ]),
  );
});
