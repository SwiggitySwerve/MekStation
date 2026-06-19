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

it('does not apply represented coordinate minefield damage after explicit detonation state', () => {
  const source = { q: 0, r: 0 };
  const target = { q: 1, r: 0 };
  const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Clear);
  const unit = createMinimalUnitState('player-1', GameSide.Player, source);
  const state: IGameState = {
    gameId: 'runner-minefield-state-detonated-entry-suppression',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.Movement,
    activationIndex: 0,
    units: {
      'player-1': unit,
    },
    minefields: {
      [coordToKey(target)]: {
        type: 'conventional',
        damagePerLeg: 10,
        detonated: true,
        source: 'scenario',
      },
    },
    turnEvents: [],
  };
  const events: Parameters<typeof runMovementPhase>[0]['events'] = [];

  const next = applyMovementMinefieldEffects({
    currentState: state,
    events,
    gameId: state.gameId,
    grid,
    unitId: 'player-1',
    steps: [
      {
        kind: 'forward',
        index: 0,
        from: source,
        to: target,
      },
    ],
  });

  expect(next.units['player-1']).toMatchObject({
    damageThisPhase: 0,
    armor: unit.armor,
  });
  expect(events).toEqual([]);
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
      'minefield-represented-conventional-detonated-state'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('already-detonated suppression'),
  });
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
      'minefield-represented-conventional-detonated-state'
    ].gap,
  ).toBeUndefined();
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-variant-side-paths'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'represented conventional/detonated coordinate state',
    ),
  });
});

it('consumes event-sourced coordinate minefield lifecycle state during movement', () => {
  const source = { q: 0, r: 0 };
  const target = { q: 1, r: 0 };
  const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Clear);
  const unit = createMinimalUnitState('player-1', GameSide.Player, source);
  const baseState: IGameState = {
    gameId: 'runner-minefield-event-lifecycle',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.Movement,
    activationIndex: 0,
    units: {
      'player-1': unit,
    },
    turnEvents: [],
  };
  const stateWithMinefield = applyEvent(baseState, {
    id: 'minefield-add',
    gameId: baseState.gameId,
    sequence: 1,
    timestamp: '2026-06-14T00:00:00Z',
    type: GameEventType.MinefieldChanged,
    turn: 1,
    phase: GamePhase.Movement,
    payload: {
      operation: 'add',
      hex: target,
      minefield: { type: 'conventional', damagePerLeg: 4 },
    },
  });
  const damageEvents: Parameters<typeof runMovementPhase>[0]['events'] = [];

  const damaged = applyMovementMinefieldEffects({
    currentState: stateWithMinefield,
    events: damageEvents,
    gameId: baseState.gameId,
    grid,
    unitId: 'player-1',
    steps: [
      {
        kind: 'forward',
        index: 0,
        from: source,
        to: target,
        terrainEntered: TerrainType.Clear,
      },
    ],
  });
  const stateWithDetonatedMinefield = applyEvent(stateWithMinefield, {
    id: 'minefield-detonate',
    gameId: baseState.gameId,
    sequence: 2,
    timestamp: '2026-06-14T00:00:01Z',
    type: GameEventType.MinefieldChanged,
    turn: 1,
    phase: GamePhase.Movement,
    payload: {
      operation: 'detonate',
      hex: target,
    },
  });
  const suppressedEvents: Parameters<typeof runMovementPhase>[0]['events'] = [];

  const suppressed = applyMovementMinefieldEffects({
    currentState: stateWithDetonatedMinefield,
    events: suppressedEvents,
    gameId: baseState.gameId,
    grid,
    unitId: 'player-1',
    steps: [
      {
        kind: 'forward',
        index: 0,
        from: source,
        to: target,
        terrainEntered: TerrainType.Clear,
      },
    ],
  });

  expect(damaged.units['player-1']).toMatchObject({
    damageThisPhase: 8,
    armor: {
      left_leg: 17,
      right_leg: 17,
    },
  });
  expect(
    damageEvents.filter((event) => event.type === GameEventType.DamageApplied),
  ).toHaveLength(2);
  expect(stateWithDetonatedMinefield.minefields?.[coordToKey(target)]).toEqual({
    type: 'conventional',
    damagePerLeg: 4,
    detonated: true,
    source: 'event',
  });
  expect(suppressed.units['player-1']).toMatchObject({
    damageThisPhase: 0,
    armor: unit.armor,
  });
  expect(suppressedEvents).toEqual([]);
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
      'minefield-represented-coordinate-state-lifecycle'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('event-sourced add'),
  });
});
