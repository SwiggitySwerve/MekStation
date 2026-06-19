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

it('applies explicit active MASC run MP and queues a failure PSR', () => {
  const target = { q: 8, r: 0 };
  const { next, events } = runScriptedMove(
    createMinimalGrid(9),
    target,
    { hasMASC: true, activeMASC: true },
    {
      movementType: MovementType.Run,
      capability: { walkMP: 4, runMP: 6, jumpMP: 0 },
    },
  );
  const movementPayload = events.find(
    (event) => event.type === GameEventType.MovementDeclared,
  )?.payload as IMovementDeclaredPayload | undefined;
  const payloads = psrPayloads(events);

  expect(movementPayload).toMatchObject({
    unitId: 'player-1',
    to: target,
    mpUsed: 8,
  });
  expect(next.units['player-1'].position).toEqual(target);
  expect(next.units['player-1'].pendingPSRs).toContainEqual(
    expect.objectContaining({
      fixedTargetNumber: 3,
      reasonCode: PSRTrigger.MASCFailure,
      triggerSource: PSRTrigger.MASCFailure,
    }),
  );
  expect(payloads).toContainEqual(
    expect.objectContaining({
      fixedTargetNumber: 3,
      unitId: 'player-1',
      reasonCode: PSRTrigger.MASCFailure,
      triggerSource: PSRTrigger.MASCFailure,
    }),
  );
  expectMovementEnhancementPsrBeforeMovementCommit(
    events,
    PSRTrigger.MASCFailure,
  );
  expect(
    MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT[MovementEnhancementType.MASC],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('active MASC run and sprint MP'),
    sourceRefs: expect.arrayContaining([
      expect.objectContaining({ kind: 'megamek-source' }),
    ]),
  });
  expect(
    MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT[MovementEnhancementType.MASC].gap,
  ).toBeUndefined();
  expect(MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT['masc-side-paths']).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('named MASC failure trigger source'),
    sourceRefs: expect.arrayContaining([
      expect.objectContaining({ kind: 'megamek-source' }),
    ]),
  });
  expect(
    MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT['masc-side-paths'].gap,
  ).toBeUndefined();
  expect(
    MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT[
      'masc-battlemech-represented-side-paths'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'Represented BattleMech MASC side-path accounting',
    ),
    sourceRefs: expect.arrayContaining([
      expect.objectContaining({ kind: 'megamek-source' }),
    ]),
  });
  expect(
    MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT[
      'masc-battlemech-represented-side-paths'
    ].gap,
  ).toBeUndefined();
  expect(
    RUNNER_PSR_TRIGGER_COMBAT_SUPPORT[PSRTrigger.MASCFailure],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('movementEnhancementPsr'),
  });
});

it('keeps inactive MASC from expanding run MP', () => {
  const target = { q: 8, r: 0 };
  const { next, events } = runScriptedMove(
    createMinimalGrid(9),
    target,
    { hasMASC: true },
    {
      movementType: MovementType.Run,
      capability: { walkMP: 4, runMP: 6, jumpMP: 0 },
    },
  );

  expectSingleMovementInvalid(events, 'InsufficientMP');
  expect(next.units['player-1'].position).toEqual({ q: 0, r: 0 });
});

it('does not queue MASC or Supercharger failure PSRs for validation-rejected boosted run movement', () => {
  const target = { q: 11, r: 0 };
  const { next, events } = runScriptedMove(
    createMinimalGrid(12),
    target,
    {
      hasMASC: true,
      hasSupercharger: true,
      activeMASC: true,
      activeSupercharger: true,
    },
    {
      movementType: MovementType.Run,
      capability: { walkMP: 4, runMP: 6, jumpMP: 0 },
    },
  );

  expectSingleMovementInvalid(events, 'InsufficientMP');
  expect(psrPayloads(events)).toEqual([]);
  expect(next.units['player-1']).toMatchObject({
    position: { q: 0, r: 0 },
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    heat: 0,
    damageThisPhase: 0,
    pendingPSRs: [],
  });
  expect(
    events.some((event) => event.type === GameEventType.MovementDeclared),
  ).toBe(false);
  expect(
    events.some(
      (event) =>
        event.type === GameEventType.PSRTriggered ||
        event.type === GameEventType.PSRResolved,
    ),
  ).toBe(false);
  expect(MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT['masc-side-paths']).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('named MASC failure trigger source'),
  });
  expect(
    MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT['masc-side-paths'].gap,
  ).toBeUndefined();
  expect(
    MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT['supercharger-side-paths'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'named Supercharger failure trigger source',
    ),
  });
  expect(
    MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT['supercharger-side-paths'].gap,
  ).toBeUndefined();
});
