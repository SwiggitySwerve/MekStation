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

it('applies encoded represented minefield damage level without promoting minefield variants', () => {
  const target = { q: 1, r: 0 };
  const grid = setTerrainFeatures(createMinimalGrid(3), target, [
    { type: TerrainType.Mines, level: 6 },
  ]);

  const { next, events } = runScriptedMove(grid, target);
  const damagePayloads = events
    .filter((event) => event.type === GameEventType.DamageApplied)
    .map((event) => event.payload as IDamageAppliedPayload);

  expect(next.units['player-1']).toMatchObject({
    position: target,
    damageThisPhase: 12,
    armor: {
      left_leg: 15,
      right_leg: 15,
    },
    pendingPSRs: [],
  });
  expect(damagePayloads).toEqual([
    expect.objectContaining({
      unitId: 'player-1',
      location: 'left_leg',
      damage: 6,
      armorRemaining: 15,
      structureRemaining: 14,
    }),
    expect.objectContaining({
      unitId: 'player-1',
      location: 'right_leg',
      damage: 6,
      armorRemaining: 15,
      structureRemaining: 14,
    }),
  ]);
  expect(
    events.some((event) => event.type === GameEventType.PSRTriggered),
  ).toBe(false);
  expect(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT.mines).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('encoded feature-level'),
  });
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
      'minefield-represented-encoded-damage-levels'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('encoded level 6'),
  });
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
      'minefield-represented-encoded-damage-levels'
    ].gap,
  ).toBeUndefined();
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

it('applies represented battle-wide minefield state damage from coordinate entries', () => {
  const source = { q: 0, r: 0 };
  const target = { q: 1, r: 0 };
  const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Clear);
  const unit = createMinimalUnitState('player-1', GameSide.Player, source);
  const state: IGameState = {
    gameId: 'runner-minefield-state-entry-damage',
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
        damagePerLeg: 7,
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
  });
  const damagePayloads = events
    .filter((event) => event.type === GameEventType.DamageApplied)
    .map((event) => event.payload as IDamageAppliedPayload);

  expect(next.units['player-1']).toMatchObject({
    damageThisPhase: 14,
    armor: {
      left_leg: 14,
      right_leg: 14,
    },
    pendingPSRs: [],
  });
  expect(damagePayloads).toEqual([
    expect.objectContaining({
      unitId: 'player-1',
      location: 'left_leg',
      damage: 7,
      armorRemaining: 14,
      structureRemaining: 14,
    }),
    expect.objectContaining({
      unitId: 'player-1',
      location: 'right_leg',
      damage: 7,
      armorRemaining: 14,
      structureRemaining: 14,
    }),
  ]);
  expect(next.minefields?.[coordToKey(target)]).toEqual({
    type: 'conventional',
    damagePerLeg: 7,
    detonated: true,
    source: 'scenario',
  });
  expect(
    events.find((event) => event.type === GameEventType.MinefieldChanged),
  ).toMatchObject({
    actorId: 'player-1',
    payload: {
      operation: 'detonate',
      hex: target,
      minefield: {
        type: 'conventional',
        damagePerLeg: 7,
        detonated: true,
        source: 'scenario',
      },
      reason: 'movement_detonation',
      sourceUnitId: 'player-1',
    },
  });
  expect(
    events.some((event) => event.type === GameEventType.PSRTriggered),
  ).toBe(false);
});
