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

it('triggers represented active coordinate minefield damage for BattleMech jump entry', () => {
  const source = { q: 0, r: 0 };
  const target = { q: 1, r: 0 };
  const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Clear);
  const unit = createMinimalUnitState('player-1', GameSide.Player, source);
  const activeMinefield: IRepresentedMinefieldState = {
    type: 'active',
    damagePerLeg: 8,
    density: 20,
    source: 'scenario',
  };
  const state: IGameState = {
    gameId: 'runner-minefield-active-non-ground-trigger',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.Movement,
    activationIndex: 0,
    units: {
      'player-1': unit,
    },
    minefields: {
      [coordToKey(target)]: activeMinefield,
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
        kind: 'jump',
        index: 0,
        from: source,
        to: target,
        terrainEntered: TerrainType.Clear,
      },
    ],
    d6Roller: () => 6,
  });
  const damagePayloads = events
    .filter((event) => event.type === GameEventType.DamageApplied)
    .map((event) => event.payload as IDamageAppliedPayload);

  expect(next.units['player-1']).toMatchObject({
    damageThisPhase: 16,
    armor: {
      left_leg: 13,
      right_leg: 13,
    },
    pendingPSRs: [],
  });
  expect(damagePayloads).toEqual([
    expect.objectContaining({
      unitId: 'player-1',
      location: 'left_leg',
      damage: 8,
    }),
    expect.objectContaining({
      unitId: 'player-1',
      location: 'right_leg',
      damage: 8,
    }),
  ]);
  expect(next.minefields?.[coordToKey(target)]).toEqual({
    type: 'active',
    damagePerLeg: 8,
    density: 15,
    detonated: false,
    source: 'event',
  });
  expect(
    events.find((event) => event.type === GameEventType.MinefieldChanged),
  ).toMatchObject({
    actorId: 'player-1',
    payload: {
      operation: 'set',
      hex: target,
      minefield: {
        type: 'active',
        damagePerLeg: 8,
        density: 15,
        detonated: false,
        source: 'event',
      },
      reason: 'movement_detonation',
      sourceUnitId: 'player-1',
    },
  });
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-active-non-ground-triggers'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('jump entry'),
  });
});

it('queues represented inferno coordinate minefield density as external heat without leg damage', () => {
  const source = { q: 0, r: 0 };
  const target = { q: 1, r: 0 };
  const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Clear);
  const unit = createMinimalUnitState('player-1', GameSide.Player, source);
  const state: IGameState = {
    gameId: 'runner-minefield-inferno-entry-heat',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.Movement,
    activationIndex: 0,
    units: {
      'player-1': unit,
    },
    minefields: {
      [coordToKey(target)]: {
        type: 'inferno',
        damagePerLeg: 10,
        density: 10,
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
        terrainEntered: TerrainType.Clear,
      },
    ],
    d6Roller: () => 6,
  });

  expect(next.units['player-1']).toMatchObject({
    damageThisPhase: 0,
    armor: unit.armor,
    pendingExternalHeat: 10,
    infernoBurning: true,
  });
  expect(
    events.filter((event) => event.type === GameEventType.DamageApplied),
  ).toEqual([]);
  expect(
    events.filter((event) => event.type === GameEventType.PSRTriggered),
  ).toEqual([]);
  expect(
    events.find((event) => event.type === GameEventType.MinefieldChanged),
  ).toMatchObject({
    actorId: 'player-1',
    payload: {
      operation: 'set',
      hex: target,
      reason: 'movement_detonation',
      sourceUnitId: 'player-1',
      minefield: {
        type: 'inferno',
        damagePerLeg: 10,
        density: 5,
        detonated: false,
        source: 'event',
      },
    },
  });
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
      'minefield-represented-inferno-entry-heat'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('pendingExternalHeat'),
  });
});
