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

it('event-sources represented conventional minefield clearing and reset without damage side effects', () => {
  const target = { q: 1, r: 0 };
  const secondTarget = { q: 2, r: 0 };
  const key = coordToKey(target);
  const secondKey = coordToKey(secondTarget);
  const unit = createMinimalUnitState('player-1', GameSide.Player, {
    q: 0,
    r: 0,
  });
  const baseState: IGameState = {
    gameId: 'runner-minefield-clearing-sweeper-reset',
    status: GameStatus.Active,
    turn: 1,
    phase: GamePhase.Movement,
    activationIndex: 0,
    units: {
      'player-1': unit,
    },
    minefields: {
      [key]: {
        type: 'conventional',
        damagePerLeg: 4,
        density: 10,
        source: 'scenario',
      },
      [secondKey]: {
        type: 'conventional',
        damagePerLeg: 6,
        source: 'scenario',
      },
    },
    turnEvents: [],
  };
  const events: Parameters<typeof runMovementPhase>[0]['events'] = [];

  const reduced = applyRunnerMinefieldClearing({
    state: baseState,
    events,
    gameId: baseState.gameId,
    hex: target,
    unitId: 'player-1',
    reason: 'mine_sweeper',
  });
  const removed = applyRunnerMinefieldClearing({
    state: reduced,
    events,
    gameId: baseState.gameId,
    hex: target,
    unitId: 'player-1',
  });
  const collateralMinefield = baseState.minefields?.[secondKey];
  if (!collateralMinefield) {
    throw new Error('Expected authored collateral minefield');
  }
  const collateralDetonated: IGameState = {
    ...removed,
    minefields: {
      ...removed.minefields,
      [secondKey]: {
        ...collateralMinefield,
        detonated: true,
        source: 'event',
      },
    },
  };
  const reset = applyRunnerMinefieldReset({
    state: collateralDetonated,
    events,
    gameId: baseState.gameId,
    unitId: 'player-1',
    minefields: baseState.minefields ?? {},
  });

  expect(events).toEqual([
    expect.objectContaining({
      type: GameEventType.MinefieldChanged,
      actorId: 'player-1',
      payload: expect.objectContaining({
        operation: 'set',
        hex: target,
        reason: 'mine_sweeper',
        sourceUnitId: 'player-1',
        minefield: {
          type: 'conventional',
          damagePerLeg: 4,
          density: 5,
          detonated: false,
          source: 'event',
        },
      }),
    }),
    expect.objectContaining({
      type: GameEventType.MinefieldChanged,
      actorId: 'player-1',
      payload: expect.objectContaining({
        operation: 'remove',
        hex: target,
        reason: 'clearing',
        sourceUnitId: 'player-1',
      }),
    }),
    expect.objectContaining({
      type: GameEventType.MinefieldChanged,
      actorId: 'player-1',
      payload: expect.objectContaining({
        operation: 'reset',
        reason: 'collateral_reset',
        sourceUnitId: 'player-1',
        minefields: baseState.minefields,
      }),
    }),
  ]);
  expect(reduced.minefields?.[key]).toEqual({
    type: 'conventional',
    damagePerLeg: 4,
    density: 5,
    detonated: false,
    source: 'event',
  });
  expect(removed.minefields).toEqual({
    [secondKey]: {
      type: 'conventional',
      damagePerLeg: 6,
      source: 'scenario',
    },
  });
  expect(collateralDetonated.minefields?.[secondKey]).toEqual({
    type: 'conventional',
    damagePerLeg: 6,
    detonated: true,
    source: 'event',
  });
  expect(reset.minefields).toEqual(baseState.minefields);
  expect(reset.units['player-1']).toMatchObject({
    damageThisPhase: 0,
    armor: unit.armor,
    pendingPSRs: [],
  });
  expect(
    events.some(
      (event) =>
        event.type === GameEventType.DamageApplied ||
        event.type === GameEventType.PSRTriggered,
    ),
  ).toBe(false);

  const movementEvents: Parameters<typeof runMovementPhase>[0]['events'] = [];
  const afterResetEntry = applyMovementMinefieldEffects({
    currentState: reset,
    events: movementEvents,
    gameId: baseState.gameId,
    grid: createMinimalGrid(3),
    unitId: 'player-1',
    steps: [
      {
        kind: 'forward',
        index: 0,
        from: { q: 0, r: 0 },
        to: secondTarget,
        terrainEntered: TerrainType.Clear,
      },
    ],
  });

  expect(afterResetEntry.units['player-1']).toMatchObject({
    damageThisPhase: 12,
    armor: {
      left_leg: 15,
      right_leg: 15,
    },
  });
  expect(
    movementEvents.filter(
      (event) => event.type === GameEventType.DamageApplied,
    ),
  ).toHaveLength(2);
  expect(afterResetEntry.minefields?.[secondKey]).toEqual({
    type: 'conventional',
    damagePerLeg: 6,
    detonated: true,
    source: 'scenario',
  });
});

it('does not clear non-conventional coordinate minefield variants as represented conventional mines', () => {
  const target = { q: 1, r: 0 };
  const baseState: IGameState = {
    gameId: 'runner-minefield-clearing-non-conventional-guard',
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
      [coordToKey(target)]: {
        type: 'inferno',
        damagePerLeg: 4,
        density: 20,
        source: 'scenario',
      },
    },
    turnEvents: [],
  };
  const events: Parameters<typeof runMovementPhase>[0]['events'] = [];

  const next = applyRunnerMinefieldClearing({
    state: baseState,
    events,
    gameId: baseState.gameId,
    hex: target,
    unitId: 'player-1',
    reason: 'mine_sweeper',
  });

  expect(next).toBe(baseState);
  expect(events).toEqual([]);
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-inferno-residual-controls'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'inferno entries without positive density',
    ),
  });
});
