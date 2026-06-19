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

it('applies represented minefield damage when a BattleMech jumps into a mined hex', () => {
  const target = { q: 2, r: 0 };
  const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Mines);

  const { next, events } = runScriptedMove(
    grid,
    target,
    {},
    {
      movementType: MovementType.Jump,
      capability: { walkMP: 4, runMP: 6, jumpMP: 4 },
    },
  );
  const movementPayload = events.find(
    (event) => event.type === GameEventType.MovementDeclared,
  )?.payload as IMovementDeclaredPayload | undefined;
  const damagePayloads = events
    .filter((event) => event.type === GameEventType.DamageApplied)
    .map((event) => event.payload as IDamageAppliedPayload);

  expect(movementPayload?.steps).toEqual([
    expect.objectContaining({
      kind: 'jump',
      to: target,
      terrainEntered: TerrainType.Mines,
    }),
  ]);
  expect(next.units['player-1']).toMatchObject({
    position: target,
    damageThisPhase: 20,
    armor: {
      left_leg: 11,
      right_leg: 11,
    },
  });
  expect(damagePayloads).toEqual([
    expect.objectContaining({
      unitId: 'player-1',
      location: 'left_leg',
      damage: 10,
    }),
    expect.objectContaining({
      unitId: 'player-1',
      location: 'right_leg',
      damage: 10,
    }),
  ]);
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-inferno-residual-controls'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('GO_PRONE movement'),
  });
});

it('does not invent represented minefield damage for explicit non-Mek units', () => {
  const target = { q: 1, r: 0 };
  const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Mines);

  const { next, events } = runScriptedMove(
    grid,
    target,
    {
      unitType: UnitType.VEHICLE,
    },
    { movementType: MovementType.Walk },
  );

  expect(next.units['player-1']).toMatchObject({
    position: target,
    pendingPSRs: [],
    damageThisPhase: 0,
  });
  expect(
    events.some(
      (event) =>
        event.type === GameEventType.PSRTriggered ||
        event.type === GameEventType.UnitStuck ||
        event.type === GameEventType.DamageApplied,
    ),
  ).toBe(false);
  expect(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT.mines).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('non-Mek units'),
  });
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-non-battlemech-sea-variants'],
  ).toMatchObject({
    level: 'out-of-scope',
    gap: expect.stringContaining('outside this BattleMech suite'),
  });
});

it('does not apply represented minefield damage to same-hex non-entry steps', () => {
  const target = { q: 1, r: 0 };
  const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Mines);
  const unit = createMinimalUnitState('player-1', GameSide.Player, target);
  const state = {
    gameId: 'runner-minefield-same-hex-entry-guard',
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
        from: target,
        to: target,
        terrainEntered: TerrainType.Mines,
      },
    ],
  });

  expect(next.units['player-1']).toMatchObject({
    position: target,
    damageThisPhase: 0,
    armor: unit.armor,
  });
  expect(events).toEqual([]);
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-inferno-residual-controls'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('GO_PRONE movement'),
  });
});

it('does not double-apply represented minefield damage for repeated entries into the same coordinate', () => {
  const source = { q: 0, r: 0 };
  const target = { q: 1, r: 0 };
  const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Mines);
  const unit = createMinimalUnitState('player-1', GameSide.Player, source);
  const state = {
    gameId: 'runner-minefield-duplicate-coordinate-entry-guard',
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
        terrainEntered: TerrainType.Mines,
      },
      {
        kind: 'lateral',
        index: 1,
        from: source,
        to: target,
        terrainEntered: TerrainType.Mines,
      },
    ],
  });

  expect(next.units['player-1']).toMatchObject({
    damageThisPhase: 20,
    armor: {
      left_leg: 11,
      right_leg: 11,
    },
  });
  expect(
    events.filter((event) => event.type === GameEventType.DamageApplied),
  ).toHaveLength(2);
  expect(
    events.filter((event) => event.type === GameEventType.PSRTriggered),
  ).toHaveLength(1);
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-hidden-reveal-detection'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('hidden conventional coordinate'),
  });
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-represented-entry-side-paths']
      .evidence,
  ).toEqual(
    expect.stringContaining('per-declaration duplicate-coordinate suppression'),
  );
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-hidden-reveal-detection']
      .evidence,
  ).toEqual(expect.stringContaining('detectedBySides'));
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-hidden-reveal-detection'].gap,
  ).toBeUndefined();
});
