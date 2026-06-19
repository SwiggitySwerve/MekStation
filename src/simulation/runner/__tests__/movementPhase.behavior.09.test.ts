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

it('applies represented EMP minefield shutdown without conventional mine damage', () => {
  const source = { q: 0, r: 0 };
  const target = { q: 1, r: 0 };
  const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Clear);
  const unit = createMinimalUnitState('player-1', GameSide.Player, source);
  const empMinefield: IRepresentedMinefieldState = {
    type: 'emp',
    damagePerLeg: 10,
    density: 20,
    setting: 50,
    source: 'scenario',
  };
  const state: IGameState = {
    gameId: 'runner-minefield-emp-fail-closed',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.Movement,
    activationIndex: 0,
    units: {
      'player-1': unit,
    },
    minefields: {
      [coordToKey(target)]: empMinefield,
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
    d6Roller: scriptedD6Roller([6, 6, 5, 4, 4, 6, 6]),
  });

  expect(next.units['player-1']).toMatchObject({
    damageThisPhase: 0,
    armor: unit.armor,
    pendingPSRs: [],
    shutdown: true,
    empShutdownTurns: 4,
  });
  expect(
    events.find(
      (event) => event.type === GameEventType.EmpMinefieldEffectApplied,
    )?.payload,
  ).toMatchObject({
    unitId: 'player-1',
    hex: target,
    roll: 9,
    modifier: 0,
    modifiedRoll: 9,
    effect: 'shutdown',
    durationTurns: 4,
    source: 'minefield',
  });
  expect(
    events.find((event) => event.type === GameEventType.MinefieldChanged)
      ?.payload,
  ).toMatchObject({
    operation: 'set',
    hex: target,
    minefield: expect.objectContaining({
      type: 'emp',
      density: 15,
      source: 'event',
    }),
    reason: 'movement_detonation',
  });
  const replayed = events.reduce(
    (replayedState, event) => applyEvent(replayedState, event),
    state,
  );
  expect(replayed.units['player-1']).toMatchObject({
    damageThisPhase: 0,
    shutdown: true,
    empShutdownTurns: 4,
  });
  expect(replayed.minefields?.[coordToKey(target)]).toMatchObject({
    type: 'emp',
    density: 15,
    source: 'event',
  });
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
      'minefield-represented-non-conventional-type-guard'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('no fallback to conventional damage'),
  });
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-emp-effects'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('EmpMinefieldEffectApplied'),
  });
});

it('triggers represented vibrabomb damage on same-hex BattleMech movement', () => {
  const source = { q: 0, r: 0 };
  const target = { q: 1, r: 0 };
  const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Clear);
  const unit = {
    ...createMinimalUnitState('player-1', GameSide.Player, source),
    tonnage: 60,
  };
  const state: IGameState = {
    gameId: 'runner-minefield-vibrabomb-same-hex',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.Movement,
    activationIndex: 0,
    units: {
      'player-1': unit,
    },
    minefields: {
      [coordToKey(target)]: {
        type: 'vibrabomb',
        damagePerLeg: 0,
        density: 10,
        setting: 50,
        source: 'scenario',
      },
    },
    turnEvents: [],
  };
  const events: Parameters<typeof runMovementPhase>[0]['events'] = [];
  const rolls = [1, 4];

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
    d6Roller: () => rolls.shift() ?? 1,
  });
  const damagePayloads = events
    .filter((event) => event.type === GameEventType.DamageApplied)
    .map((event) => event.payload as IDamageAppliedPayload);

  expect(next.units['player-1']).toMatchObject({
    damageThisPhase: 10,
    armor: {
      left_leg: 16,
      right_leg: 16,
    },
    pendingPSRs: [],
  });
  expect(damagePayloads).toEqual([
    expect.objectContaining({
      unitId: 'player-1',
      location: 'right_leg',
      damage: 5,
      armorRemaining: 16,
    }),
    expect.objectContaining({
      unitId: 'player-1',
      location: 'left_leg',
      damage: 5,
      armorRemaining: 16,
    }),
  ]);
  expect(next.minefields?.[coordToKey(target)]).toEqual({
    type: 'vibrabomb',
    damagePerLeg: 0,
    density: 5,
    setting: 50,
    detonated: false,
    source: 'event',
  });
  expect(events).toContainEqual(
    expect.objectContaining({
      type: GameEventType.MinefieldChanged,
      payload: expect.objectContaining({
        operation: 'set',
        hex: target,
        reason: 'movement_detonation',
        sourceUnitId: 'player-1',
        minefield: expect.objectContaining({
          type: 'vibrabomb',
          density: 5,
          setting: 50,
        }),
      }),
    }),
  );
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
      'minefield-represented-vibrabomb-effects'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('vibrabomb'),
  });
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
      'minefield-represented-vibrabomb-effects'
    ].gap,
  ).toBeUndefined();
});
