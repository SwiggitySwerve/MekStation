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

it('queues depth-aware entering-water PSRs from complex terrain features', () => {
  const target = { q: 1, r: 0 };
  const grid = setTerrainFeatures(createMinimalGrid(3), target, [
    { type: TerrainType.Water, level: 2 },
  ]);

  const { next, events } = runScriptedMove(
    grid,
    target,
    {
      abilities: ['tm_frogman'],
      unitType: UnitType.BATTLEMECH,
    },
    { movementType: MovementType.Walk },
  );
  const payloads = psrPayloads(events);

  expect(next.units['player-1'].position).toEqual(target);
  expect(next.units['player-1'].pendingPSRs).toContainEqual(
    expect.objectContaining({
      reasonCode: PSRTrigger.EnteringWater,
      terrainLevel: 2,
      additionalModifier: 0,
    }),
  );
  expect(payloads).toContainEqual(
    expect.objectContaining({
      unitId: 'player-1',
      reasonCode: PSRTrigger.EnteringWater,
      additionalModifier: 0,
      triggerSource: expect.stringMatching(/^movement-step:/),
    }),
  );
  expect(SPA_COMBAT_SUPPORT.tm_frogman).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('water-entry PSR'),
  });
});

it('queues building-collapse PSRs when explicit unit load exceeds building CF', () => {
  const target = { q: 1, r: 0 };
  const grid = setTerrainFeatures(createMinimalGrid(3), target, [
    { type: TerrainType.Building, level: 2, constructionFactor: 40 },
  ]);

  const { next, events } = runScriptedMove(
    grid,
    target,
    {
      tonnage: 55,
      unitType: UnitType.BATTLEMECH,
    },
    { movementType: MovementType.Walk },
  );
  const payloads = psrPayloads(events);

  expect(next.units['player-1'].position).toEqual(target);
  expect(next.units['player-1'].pendingPSRs).toContainEqual(
    expect.objectContaining({
      reasonCode: PSRTrigger.BuildingCollapse,
      additionalModifier: 0,
    }),
  );
  expect(payloads).toContainEqual(
    expect.objectContaining({
      unitId: 'player-1',
      reasonCode: PSRTrigger.BuildingCollapse,
      triggerSource: expect.stringMatching(/^movement-step:/),
    }),
  );
  expect(
    RUNNER_PSR_TRIGGER_COMBAT_SUPPORT[PSRTrigger.BuildingCollapse],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('constructionFactor'),
  });
  expect(TERRAIN_TYPE_PSR_COMBAT_SUPPORT[TerrainType.Building]).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('constructionFactor'),
  });
});

it('does not invent building-collapse PSRs without explicit load metadata', () => {
  const target = { q: 1, r: 0 };
  const grid = setTerrainFeatures(createMinimalGrid(3), target, [
    { type: TerrainType.Building, level: 2, constructionFactor: 40 },
  ]);

  const { next, events } = runScriptedMove(
    grid,
    target,
    {
      unitType: UnitType.BATTLEMECH,
    },
    { movementType: MovementType.Walk },
  );

  expect(next.units['player-1'].position).toEqual(target);
  expect(next.units['player-1'].pendingPSRs).not.toContainEqual(
    expect.objectContaining({
      reasonCode: PSRTrigger.BuildingCollapse,
    }),
  );
  expect(psrPayloads(events)).not.toContainEqual(
    expect.objectContaining({
      reasonCode: PSRTrigger.BuildingCollapse,
    }),
  );
});

it('queues water-exit PSRs when a unit leaves water terrain', () => {
  const target = { q: 1, r: 0 };
  const grid = setTerrain(
    createMinimalGrid(3),
    { q: 0, r: 0 },
    TerrainType.Water,
  );

  const { next, events } = runScriptedMove(grid, target);
  const payloads = psrPayloads(events);

  expect(next.units['player-1'].position).toEqual(target);
  expect(next.units['player-1'].pendingPSRs).toContainEqual(
    expect.objectContaining({ reasonCode: PSRTrigger.ExitingWater }),
  );
  expect(payloads).toContainEqual(
    expect.objectContaining({
      reasonCode: PSRTrigger.ExitingWater,
      triggerSource: expect.stringMatching(/^movement-step:/),
    }),
  );
  expect(
    RUNNER_PSR_TRIGGER_COMBAT_SUPPORT[PSRTrigger.ExitingWater],
  ).toMatchObject({
    level: 'integrated',
  });
});

it('queues skid PSRs when a running unit changes facing on pavement', () => {
  const target = { q: 0, r: -1 };
  const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Pavement);

  const { next, events } = runScriptedMove(
    grid,
    target,
    {},
    {
      movementType: MovementType.Run,
      facing: Facing.Northeast,
    },
  );
  const payloads = psrPayloads(events);

  expect(next.units['player-1'].position).toEqual(target);
  expect(next.units['player-1'].pendingPSRs).toContainEqual(
    expect.objectContaining({ reasonCode: PSRTrigger.Skidding }),
  );
  expect(payloads).toContainEqual(
    expect.objectContaining({
      additionalModifier: -1,
      unitId: 'player-1',
      reasonCode: PSRTrigger.Skidding,
      triggerSource: expect.stringMatching(/^movement-step:/),
    }),
  );
  expect(RUNNER_PSR_TRIGGER_COMBAT_SUPPORT[PSRTrigger.Skidding]).toMatchObject({
    level: 'integrated',
  });
});

it('queues damaged-movement PSRs when a damaged unit runs', () => {
  const target = { q: 1, r: 0 };
  const componentDamage = {
    ...DEFAULT_COMPONENT_DAMAGE,
    gyroHits: 1,
    actuators: { [ActuatorType.HIP]: true },
  };

  const { next, events } = runScriptedMove(
    createMinimalGrid(3),
    target,
    { componentDamage },
    { movementType: MovementType.Run },
  );
  const payloads = psrPayloads(events);

  expect(next.units['player-1'].position).toEqual(target);
  expect(next.units['player-1'].pendingPSRs).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ reasonCode: PSRTrigger.RunningDamagedHip }),
      expect.objectContaining({ reasonCode: PSRTrigger.RunningDamagedGyro }),
    ]),
  );
  expect(payloads).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        reasonCode: PSRTrigger.RunningDamagedHip,
        triggerSource: expect.stringMatching(/^movement-step:/),
      }),
      expect.objectContaining({
        reasonCode: PSRTrigger.RunningDamagedGyro,
        triggerSource: expect.stringMatching(/^movement-step:/),
      }),
    ]),
  );
  expect(
    RUNNER_PSR_TRIGGER_COMBAT_SUPPORT[PSRTrigger.RunningDamagedHip],
  ).toMatchObject({ level: 'integrated' });
  expect(
    RUNNER_PSR_TRIGGER_COMBAT_SUPPORT[PSRTrigger.RunningDamagedGyro],
  ).toMatchObject({ level: 'integrated' });
});
