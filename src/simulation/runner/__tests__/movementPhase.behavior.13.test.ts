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

it('manually detonates represented conventional coordinate minefields without damage side effects', () => {
  const source = { q: 0, r: 0 };
  const target = { q: 1, r: 0 };
  const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Clear);
  const unit = createMinimalUnitState('player-1', GameSide.Player, source);
  const baseState: IGameState = {
    gameId: 'runner-minefield-manual-conventional-detonation',
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
        damagePerLeg: 4,
        source: 'scenario',
      },
    },
    turnEvents: [],
  };
  const events: Parameters<typeof runMovementPhase>[0]['events'] = [];

  const detonated = applyRunnerMinefieldManualDetonation({
    state: baseState,
    events,
    gameId: baseState.gameId,
    hex: target,
    unitId: 'player-1',
  });

  expect(events).toEqual([
    expect.objectContaining({
      type: GameEventType.MinefieldChanged,
      phase: GamePhase.Movement,
      actorId: 'player-1',
      payload: expect.objectContaining({
        operation: 'detonate',
        hex: target,
        reason: 'manual_adjustment',
        sourceUnitId: 'player-1',
        minefield: {
          type: 'conventional',
          damagePerLeg: 4,
          detonated: true,
          source: 'scenario',
        },
      }),
    }),
  ]);
  expect(
    events.filter((event) => event.type === GameEventType.DamageApplied),
  ).toEqual([]);
  expect(
    events.filter((event) => event.type === GameEventType.PSRTriggered),
  ).toEqual([]);
  expect(detonated.minefields?.[coordToKey(target)]).toEqual({
    type: 'conventional',
    damagePerLeg: 4,
    detonated: true,
    source: 'scenario',
  });
  expect(detonated.units['player-1']).toMatchObject({
    damageThisPhase: 0,
    armor: unit.armor,
  });

  const movementEvents: Parameters<typeof runMovementPhase>[0]['events'] = [];
  const afterEntry = applyMovementMinefieldEffects({
    currentState: detonated,
    events: movementEvents,
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

  expect(afterEntry.units['player-1']).toMatchObject({
    damageThisPhase: 0,
    armor: unit.armor,
  });
  expect(movementEvents).toEqual([]);
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
      'minefield-represented-manual-conventional-detonation'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('manual_adjustment'),
  });
});

it('does not manually detonate non-conventional coordinate minefield variants as represented conventional mines', () => {
  const target = { q: 1, r: 0 };
  const nonConventionalMinefield: IRepresentedMinefieldState = {
    type: 'command-detonated',
    damagePerLeg: 4,
    source: 'scenario',
  };
  const baseState: IGameState = {
    gameId: 'runner-minefield-manual-non-conventional-guard',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.Movement,
    activationIndex: 0,
    units: {
      'player-1': createMinimalUnitState('player-1', GameSide.Player, {
        q: 0,
        r: 0,
      }),
    },
    minefields: {
      [coordToKey(target)]: nonConventionalMinefield,
    },
    turnEvents: [],
  };
  const events: Parameters<typeof runMovementPhase>[0]['events'] = [];

  const next = applyRunnerMinefieldManualDetonation({
    state: baseState,
    events,
    gameId: baseState.gameId,
    hex: target,
    unitId: 'player-1',
  });

  expect(next).toBe(baseState);
  expect(events).toEqual([]);
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-inferno-residual-controls'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('GO_PRONE movement'),
  });
});
