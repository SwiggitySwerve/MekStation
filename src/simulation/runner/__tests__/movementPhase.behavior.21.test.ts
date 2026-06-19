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

it('applies No Arms to runner stand-up PSRs', () => {
  const { events } = runScriptedMove(
    createMinimalGrid(3),
    { q: 1, r: 0 },
    {
      piloting: 5,
      prone: true,
      unitQuirks: ['no_arms'],
    },
    { random: fixedRandom(0.99) },
  );
  const resolved = events.find(
    (event) => event.type === GameEventType.PSRResolved,
  )?.payload as IPSRResolvedPayload | undefined;

  expect(resolved).toMatchObject({
    unitId: 'player-1',
    reasonCode: PSRTrigger.StandingUp,
    targetNumber: 7,
    modifiers: 2,
    roll: 12,
    passed: true,
  });
  expect(QUIRK_COMBAT_SUPPORT.no_arms).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('stand-up paths'),
  });
});

it('keeps a unit prone when the stand-up PSR fails without fall damage', () => {
  const { next, events } = runScriptedMove(
    createMinimalGrid(3),
    { q: 1, r: 0 },
    {
      prone: true,
      piloting: 5,
    },
    { random: fixedRandom(0) },
  );
  const resolved = events.find(
    (event) => event.type === GameEventType.PSRResolved,
  )?.payload as IPSRResolvedPayload | undefined;

  expect(resolved).toMatchObject({
    unitId: 'player-1',
    reasonCode: PSRTrigger.StandingUp,
    targetNumber: 5,
    roll: 2,
    passed: false,
  });
  expect(events.some((event) => event.type === GameEventType.UnitStood)).toBe(
    false,
  );
  expect(events.some((event) => event.type === GameEventType.UnitFell)).toBe(
    false,
  );
  expect(events.some((event) => event.type === GameEventType.PilotHit)).toBe(
    false,
  );
  expect(next.units['player-1'].position).toEqual({ q: 0, r: 0 });
  expect(next.units['player-1'].prone).toBe(true);
  expect(next.units['player-1'].pendingPSRs ?? []).toEqual([]);
});
