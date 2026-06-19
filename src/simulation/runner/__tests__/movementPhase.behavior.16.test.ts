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

it('event-sources hidden conventional minefield detection and movement reveal', () => {
  const target = { q: 1, r: 0 };
  const hiddenMinefield: IRepresentedMinefieldState = {
    type: 'conventional',
    damagePerLeg: 4,
    hidden: true,
    source: 'scenario',
  };
  const baseState: IGameState = {
    gameId: 'runner-hidden-minefield-detection-reveal',
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
      [coordToKey(target)]: hiddenMinefield,
    },
    turnEvents: [],
  };
  const detectionEvents: Parameters<typeof runMovementPhase>[0]['events'] = [];

  const detected = applyRunnerMinefieldDetection({
    state: baseState,
    events: detectionEvents,
    gameId: baseState.gameId,
    hex: target,
    unitId: 'player-1',
  });
  const detectionPayload = detectionEvents[0]
    ?.payload as IMinefieldChangedPayload;

  expect(detectionPayload).toMatchObject({
    operation: 'detect',
    hex: target,
    detectingSide: GameSide.Player,
    reason: 'detection',
    sourceUnitId: 'player-1',
  });
  expect(detected.minefields?.[coordToKey(target)]).toMatchObject({
    hidden: true,
    detectedBySides: [GameSide.Player],
  });
  expect(detected.minefields?.[coordToKey(target)]?.revealed).toBeUndefined();
  expect(
    detectionEvents.some(
      (event) =>
        event.type === GameEventType.DamageApplied ||
        event.type === GameEventType.PSRTriggered,
    ),
  ).toBe(false);

  const movementEvents: Parameters<typeof runMovementPhase>[0]['events'] = [];
  const afterEntry = applyMovementMinefieldEffects({
    currentState: detected,
    events: movementEvents,
    gameId: detected.gameId,
    grid: createMinimalGrid(3),
    unitId: 'player-1',
    steps: [
      {
        kind: 'forward',
        index: 0,
        from: { q: 0, r: 0 },
        to: target,
        terrainEntered: TerrainType.Clear,
      },
    ],
  });
  const revealPayload = movementEvents.find(
    (event) => event.type === GameEventType.MinefieldChanged,
  )?.payload as IMinefieldChangedPayload | undefined;

  expect(afterEntry.units['player-1']).toMatchObject({
    damageThisPhase: 8,
    armor: {
      left_leg: 17,
      right_leg: 17,
    },
  });
  expect(revealPayload).toMatchObject({
    operation: 'detonate',
    hex: target,
    reason: 'movement_detonation',
    sourceUnitId: 'player-1',
    minefield: expect.objectContaining({
      hidden: false,
      revealed: true,
      detectedBySides: [GameSide.Player],
      detonated: true,
    }),
  });
  expect(afterEntry.minefields?.[coordToKey(target)]).toMatchObject({
    hidden: false,
    revealed: true,
    detectedBySides: [GameSide.Player],
    detonated: true,
  });
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-hidden-reveal-detection'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('hidden conventional coordinate'),
  });
});

it('applies Eagle Eyes relief to represented minefield detonation rolls', () => {
  const target = { q: 1, r: 0 };
  const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Mines);

  const withoutEagleEyes = runScriptedMove(
    grid,
    target,
    {},
    { random: fixedRandom(0.75) },
  );
  const withEagleEyes = runScriptedMove(
    grid,
    target,
    { abilities: ['eagle_eyes'] },
    { random: fixedRandom(0.75) },
  );

  expect(withoutEagleEyes.next.units['player-1']).toMatchObject({
    position: target,
    damageThisPhase: 20,
    armor: {
      left_leg: 11,
      right_leg: 11,
    },
  });
  expect(
    withoutEagleEyes.events.filter(
      (event) => event.type === GameEventType.DamageApplied,
    ),
  ).toHaveLength(2);

  expect(withEagleEyes.next.units['player-1']).toMatchObject({
    position: target,
    damageThisPhase: 0,
    armor: {
      left_leg: 21,
      right_leg: 21,
    },
    pendingPSRs: [],
  });
  expect(
    withEagleEyes.events.some(
      (event) =>
        event.type === GameEventType.DamageApplied ||
        event.type === GameEventType.PSRTriggered,
    ),
  ).toBe(false);
  expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.eagle_eyes).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('detonation target-number relief'),
  });
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-hidden-reveal-detection'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('hidden conventional coordinate'),
  });
});

it('applies represented minefield damage when a BattleMech laterally enters a mined hex', () => {
  const target = { q: 1, r: -1 };
  const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Mines);

  const { next, events } = runScriptedMove(
    grid,
    target,
    {
      abilities: ['maneuvering_ace'],
      facing: Facing.North,
      secondaryFacing: Facing.North,
    },
    {
      facing: Facing.North,
      capability: { walkMP: 2, runMP: 3, jumpMP: 0 },
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
      kind: 'lateral',
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
