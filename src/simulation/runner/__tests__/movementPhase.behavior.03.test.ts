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

it('commits same-hex facing changes with authoritative turn MP', () => {
  const { next, events } = runScriptedMove(
    createMinimalGrid(3),
    { q: 0, r: 0 },
    { facing: Facing.North },
    {
      movementType: MovementType.Walk,
      facing: Facing.Northeast,
      capability: { walkMP: 1, runMP: 2, jumpMP: 0 },
    },
  );
  const payload = events.find(
    (event) => event.type === GameEventType.MovementDeclared,
  )?.payload as IMovementDeclaredPayload | undefined;

  expect(payload).toMatchObject({
    unitId: 'player-1',
    from: { q: 0, r: 0 },
    to: { q: 0, r: 0 },
    facing: Facing.Northeast,
    mpUsed: 1,
    heatGenerated: 1,
    hexesMoved: 0,
    straightHexes: 0,
    turningMpCost: 1,
    netDisplacement: 0,
  });
  expect(payload?.steps).toEqual([
    expect.objectContaining({
      kind: 'turn',
      fromFacing: Facing.North,
      toFacing: Facing.Northeast,
    }),
  ]);
  expect(next.units['player-1'].position).toEqual({ q: 0, r: 0 });
  expect(next.units['player-1'].facing).toBe(Facing.Northeast);
  expect(COMBAT_COMMAND_ACTION_SUPPORT['facing.rotate-right']).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('same-hex MovementDeclared'),
  });
});

it('applies strong wind jump-distance reduction during runner movement validation', () => {
  const target = { q: 3, r: 0 };
  const capability = { walkMP: 4, runMP: 6, jumpMP: 4 };
  const calm = createEnvironmentalConditions({ wind: 'none' });
  const strongWind = createEnvironmentalConditions({ wind: 'strong' });

  const calmMove = runScriptedMove(
    createMinimalGrid(4),
    target,
    {},
    {
      movementType: MovementType.Jump,
      capability,
      environmentalConditions: calm,
    },
  );
  const windyMove = runScriptedMove(
    createMinimalGrid(4),
    target,
    {},
    {
      movementType: MovementType.Jump,
      capability,
      environmentalConditions: strongWind,
    },
  );

  expect(calmMove.events).toHaveLength(1);
  expect(calmMove.next.units['player-1'].position).toEqual(target);
  expectSingleMovementInvalid(windyMove.events, 'InsufficientMP');
  expect(windyMove.next.units['player-1'].position).toEqual({ q: 0, r: 0 });
  expect(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT.wind).toMatchObject({
    level: 'integrated',
  });
});

it('applies represented low-light movement penalties and Nightwalker relief before committing runner movement', () => {
  const target = { q: 1, r: 0 };
  const grid = createMinimalGrid(3);
  const night = createEnvironmentalConditions({ light: 'night' });
  const capability = { walkMP: 1, runMP: 2, jumpMP: 0 };

  const blockedWithoutAbility = runScriptedMove(
    grid,
    target,
    {},
    {
      movementType: MovementType.Walk,
      capability,
      environmentalConditions: night,
    },
  );
  const allowedWithNightwalker = runScriptedMove(
    grid,
    target,
    { abilities: ['tm_nightwalker'] },
    {
      movementType: MovementType.Walk,
      capability,
      environmentalConditions: night,
    },
  );
  const payload = allowedWithNightwalker.events.find(
    (event) => event.type === GameEventType.MovementDeclared,
  )?.payload as IMovementDeclaredPayload | undefined;

  expectSingleMovementInvalid(blockedWithoutAbility.events, 'InsufficientMP');
  expect(payload).toMatchObject({
    unitId: 'player-1',
    to: target,
    mpUsed: 1,
    heatGenerated: 1,
  });
  expect(allowedWithNightwalker.next.units['player-1'].position).toEqual(
    target,
  );
});

it('prohibits Nightwalker run-derived runner movement in represented low light', () => {
  const target = { q: 1, r: 0 };
  const night = createEnvironmentalConditions({ light: 'night' });
  const run = runScriptedMove(
    createMinimalGrid(3),
    target,
    { abilities: ['tm_nightwalker'] },
    {
      movementType: MovementType.Run,
      capability: { walkMP: 4, runMP: 6, jumpMP: 0 },
      environmentalConditions: night,
    },
  );
  const invalid = run.events[0]?.payload as IMovementInvalidPayload | undefined;

  expectSingleMovementInvalid(run.events, 'TerrainBlocked');
  expect(invalid?.details).toContain('Nightwalker prohibits running');
  expect(run.next.units['player-1'].position).toEqual({ q: 0, r: 0 });
});

it('applies active TSM walk MP before runner movement validation', () => {
  const target = { q: 5, r: 0 };
  const { next, events } = runScriptedMove(
    createMinimalGrid(6),
    target,
    { hasTSM: true, heat: 9 },
    {
      movementType: MovementType.Walk,
      capability: { walkMP: 4, runMP: 6, jumpMP: 0 },
    },
  );
  const payload = events.find(
    (event) => event.type === GameEventType.MovementDeclared,
  )?.payload as IMovementDeclaredPayload | undefined;

  expect(payload).toMatchObject({
    unitId: 'player-1',
    to: target,
    mpUsed: 5,
    heatGenerated: 1,
  });
  expect(next.units['player-1'].position).toEqual(target);
  expect(
    MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT[MovementEnhancementType.TSM],
  ).toMatchObject({
    level: 'integrated',
    sourceRefs: expect.arrayContaining([
      expect.objectContaining({ kind: 'megamek-source' }),
    ]),
  });
});

it('keeps TSM dormant below the heat-9 activation threshold', () => {
  const target = { q: 5, r: 0 };
  const { next, events } = runScriptedMove(
    createMinimalGrid(6),
    target,
    { hasTSM: true, heat: 8 },
    {
      movementType: MovementType.Walk,
      capability: { walkMP: 4, runMP: 6, jumpMP: 0 },
    },
  );

  expectSingleMovementInvalid(events, 'InsufficientMP');
  expect(next.units['player-1'].position).toEqual({ q: 0, r: 0 });
});
