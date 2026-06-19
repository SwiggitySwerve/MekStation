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

it('uses represented minefield density for detonation target thresholds', () => {
  const source = { q: 0, r: 0 };
  const target = { q: 1, r: 0 };
  const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Clear);

  const runEntry = (
    minefield: NonNullable<IGameState['minefields']>[string],
    d6Roller: () => number,
  ) => {
    const unit = createMinimalUnitState('player-1', GameSide.Player, source);
    const state: IGameState = {
      gameId: 'runner-minefield-density-trigger-target',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {
        'player-1': unit,
      },
      minefields: {
        [coordToKey(target)]: minefield,
      },
      turnEvents: [],
    };
    const events: Parameters<typeof runMovementPhase>[0]['events'] = [];

    return {
      next: applyMovementMinefieldEffects({
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
        d6Roller,
      }),
      events,
    };
  };

  const baseline = runEntry(
    { type: 'conventional', damagePerLeg: 5, source: 'scenario' },
    () => 4,
  );
  const density20 = runEntry(
    {
      type: 'conventional',
      damagePerLeg: 5,
      density: 20,
      source: 'scenario',
    },
    () => 4,
  );
  const density25Rolls = [3, 4];
  const density25 = runEntry(
    {
      type: 'conventional',
      damagePerLeg: 5,
      density: 25,
      source: 'scenario',
    },
    () => density25Rolls.shift() ?? 1,
  );

  expect(baseline.next.units['player-1']).toMatchObject({
    damageThisPhase: 0,
    armor: {
      left_leg: 21,
      right_leg: 21,
    },
  });
  expect(baseline.events).toEqual([]);

  expect(density20.next.units['player-1']).toMatchObject({
    damageThisPhase: 10,
    armor: {
      left_leg: 16,
      right_leg: 16,
    },
  });
  expect(
    density20.events.filter(
      (event) => event.type === GameEventType.DamageApplied,
    ),
  ).toHaveLength(2);
  expect(density20.next.minefields?.[coordToKey(target)]).toEqual({
    type: 'conventional',
    damagePerLeg: 5,
    density: 15,
    source: 'event',
    detonated: false,
  });
  expect(
    density20.events.filter(
      (event) => event.type === GameEventType.MinefieldChanged,
    ),
  ).toHaveLength(1);

  expect(density25.next.units['player-1']).toMatchObject({
    damageThisPhase: 10,
    armor: {
      left_leg: 16,
      right_leg: 16,
    },
  });
  expect(
    density25.events.filter(
      (event) => event.type === GameEventType.DamageApplied,
    ),
  ).toHaveLength(2);
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
      'minefield-represented-density-trigger-target'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('density 20'),
  });
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-inferno-residual-controls']
      .gap,
  ).not.toEqual(expect.stringContaining('density trigger target'));
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
      'minefield-represented-density-reduction'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'reduces represented conventional and inferno density',
    ),
  });
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-inferno-residual-controls']
      .gap,
  ).not.toEqual(expect.stringContaining('density reduction'));
});
