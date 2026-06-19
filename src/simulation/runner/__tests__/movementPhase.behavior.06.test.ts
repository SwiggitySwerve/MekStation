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

it('does not let Partial Wing create jump capability without base jump MP', () => {
  const target = { q: 1, r: 0 };
  const { next, events } = runScriptedMove(
    createMinimalGrid(3),
    target,
    { partialWingJumpBonus: 2 },
    {
      movementType: MovementType.Jump,
      capability: { walkMP: 4, runMP: 6, jumpMP: 0 },
    },
  );

  expectSingleMovementInvalid(events, 'JumpUnavailable');
  expect(next.units['player-1'].position).toEqual({ q: 0, r: 0 });
});

it('applies jump-jet critical damage before runner jump validation', () => {
  const componentDamage = {
    ...DEFAULT_COMPONENT_DAMAGE,
    jumpJetsDestroyed: 1,
  };
  const capability = { walkMP: 4, runMP: 6, jumpMP: 4 };
  const blocked = runScriptedMove(
    createMinimalGrid(5),
    { q: 4, r: 0 },
    { componentDamage },
    { movementType: MovementType.Jump, capability },
  );
  const allowed = runScriptedMove(
    createMinimalGrid(5),
    { q: 3, r: 0 },
    { componentDamage },
    { movementType: MovementType.Jump, capability },
  );

  expectSingleMovementInvalid(blocked.events, 'InsufficientMP');
  expect(blocked.next.units['player-1'].position).toEqual({ q: 0, r: 0 });
  expect(allowed.next.units['player-1'].position).toEqual({ q: 3, r: 0 });
  expect(
    allowed.events.find(
      (event) => event.type === GameEventType.MovementDeclared,
    )?.payload,
  ).toMatchObject({
    unitId: 'player-1',
    mpUsed: 3,
    heatGenerated: 3,
  });
});

it('does not let Partial Wing recreate jump capability after jump-jet crits destroy all base jump MP', () => {
  const { next, events } = runScriptedMove(
    createMinimalGrid(3),
    { q: 1, r: 0 },
    {
      partialWingJumpBonus: 2,
      componentDamage: {
        ...DEFAULT_COMPONENT_DAMAGE,
        jumpJetsDestroyed: 3,
      },
    },
    {
      movementType: MovementType.Jump,
      capability: { walkMP: 4, runMP: 6, jumpMP: 3 },
    },
  );

  expectSingleMovementInvalid(events, 'JumpUnavailable');
  expect(next.units['player-1'].position).toEqual({ q: 0, r: 0 });
});

it('marks BattleMechs stuck immediately when they jump into swamp', () => {
  const target = { q: 1, r: 0 };
  const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Swamp);

  const { next, events } = runScriptedMove(
    grid,
    target,
    {
      unitType: UnitType.BATTLEMECH,
    },
    {
      movementType: MovementType.Jump,
      capability: { walkMP: 4, runMP: 6, jumpMP: 4 },
    },
  );

  expect(next.units['player-1']).toMatchObject({
    position: target,
    isStuck: true,
    pendingPSRs: [],
  });
  expect(events).toContainEqual(
    expect.objectContaining({
      type: GameEventType.UnitStuck,
      payload: expect.objectContaining({
        unitId: 'player-1',
        reasonCode: PSRTrigger.SwampBogDown,
      }),
    }),
  );
  expect(
    events.some((event) => event.type === GameEventType.PSRTriggered),
  ).toBe(false);
});

it('applies represented minefield marker damage and PSR evidence on BattleMech entry', () => {
  const target = { q: 1, r: 0 };
  const grid = setTerrain(createMinimalGrid(3), target, TerrainType.Mines);

  const { next, events } = runScriptedMove(grid, target);
  const damagePayloads = events
    .filter((event) => event.type === GameEventType.DamageApplied)
    .map((event) => event.payload as IDamageAppliedPayload);
  const payloads = psrPayloads(events);

  expect(next.units['player-1']).toMatchObject({
    position: target,
    damageThisPhase: 20,
    armor: {
      left_leg: 11,
      right_leg: 11,
    },
  });
  expect(next.units['player-1'].pendingPSRs).toContainEqual(
    expect.objectContaining({
      reasonCode: PSRTrigger.PhaseDamage20Plus,
    }),
  );
  expect(events).toContainEqual(
    expect.objectContaining({
      type: GameEventType.MovementDeclared,
      payload: expect.objectContaining({
        unitId: 'player-1',
        to: target,
        mpUsed: 1,
      }),
    }),
  );
  expect(damagePayloads).toEqual([
    expect.objectContaining({
      unitId: 'player-1',
      location: 'left_leg',
      damage: 10,
      armorRemaining: 11,
      structureRemaining: 14,
    }),
    expect.objectContaining({
      unitId: 'player-1',
      location: 'right_leg',
      damage: 10,
      armorRemaining: 11,
      structureRemaining: 14,
    }),
  ]);
  expect(payloads).toContainEqual(
    expect.objectContaining({
      unitId: 'player-1',
      reasonCode: PSRTrigger.PhaseDamage20Plus,
      triggerSource: PSRTrigger.PhaseDamage20Plus,
    }),
  );
  expect(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT.mines).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('represented TerrainType.Mines'),
  });
  expect(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT.mines.gap).toBeUndefined();
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-variant-side-paths'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('Split-accounting row'),
  });
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT[
      'minefield-non-conventional-type-semantics'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('Split-accounting row'),
  });
  expect(
    TERRAIN_ENVIRONMENT_COMBAT_SUPPORT['minefield-emp-effects'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('EmpMinefieldEffectApplied'),
  });
});
