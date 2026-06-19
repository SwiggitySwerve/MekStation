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

it('applies combined active MASC and Supercharger run MP and queues both failure PSRs', () => {
  const target = { q: 10, r: 0 };
  const { next, events } = runScriptedMove(
    createMinimalGrid(11),
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
  const movementPayload = events.find(
    (event) => event.type === GameEventType.MovementDeclared,
  )?.payload as IMovementDeclaredPayload | undefined;
  const payloads = psrPayloads(events);

  expect(movementPayload).toMatchObject({
    unitId: 'player-1',
    to: target,
    mpUsed: 10,
  });
  expect(next.units['player-1'].position).toEqual(target);
  expect(next.units['player-1'].pendingPSRs).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        fixedTargetNumber: 3,
        reasonCode: PSRTrigger.MASCFailure,
        triggerSource: PSRTrigger.MASCFailure,
      }),
      expect.objectContaining({
        fixedTargetNumber: 3,
        reasonCode: PSRTrigger.SuperchargerFailure,
        triggerSource: PSRTrigger.SuperchargerFailure,
      }),
    ]),
  );
  expect(payloads).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        fixedTargetNumber: 3,
        reasonCode: PSRTrigger.MASCFailure,
      }),
      expect.objectContaining({
        fixedTargetNumber: 3,
        reasonCode: PSRTrigger.SuperchargerFailure,
      }),
    ]),
  );
  expectMovementEnhancementPsrBeforeMovementCommit(
    events,
    PSRTrigger.MASCFailure,
  );
  expectMovementEnhancementPsrBeforeMovementCommit(
    events,
    PSRTrigger.SuperchargerFailure,
  );
  expect(
    MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT[MovementEnhancementType.SUPERCHARGER],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining('active Supercharger run and sprint MP'),
    sourceRefs: expect.arrayContaining([
      expect.objectContaining({ kind: 'megamek-source' }),
    ]),
  });
  expect(
    MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT[MovementEnhancementType.SUPERCHARGER]
      .gap,
  ).toBeUndefined();
  expect(
    MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT['supercharger-side-paths'],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'named Supercharger failure trigger source',
    ),
    sourceRefs: expect.arrayContaining([
      expect.objectContaining({ kind: 'megamek-source' }),
    ]),
  });
  expect(
    MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT['supercharger-side-paths'].gap,
  ).toBeUndefined();
  expect(
    MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT[
      'supercharger-battlemech-represented-side-paths'
    ],
  ).toMatchObject({
    level: 'integrated',
    evidence: expect.stringContaining(
      'Represented BattleMech Supercharger side-path accounting',
    ),
    sourceRefs: expect.arrayContaining([
      expect.objectContaining({ kind: 'megamek-source' }),
    ]),
  });
  expect(
    MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT[
      'supercharger-battlemech-represented-side-paths'
    ].gap,
  ).toBeUndefined();
});

it('uses explicit prior booster use counts for MASC/Supercharger failure target numbers', () => {
  const target = { q: 10, r: 0 };
  const { next, events } = runScriptedMove(
    createMinimalGrid(11),
    target,
    {
      hasMASC: true,
      hasSupercharger: true,
      activeMASC: true,
      activeSupercharger: true,
      mascTurnsUsed: 2,
      superchargerTurnsUsed: 3,
    },
    {
      movementType: MovementType.Run,
      capability: { walkMP: 4, runMP: 6, jumpMP: 0 },
    },
  );
  const payloads = psrPayloads(events);

  expect(next.units['player-1'].pendingPSRs).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        fixedTargetNumber: 7,
        reasonCode: PSRTrigger.MASCFailure,
      }),
      expect.objectContaining({
        fixedTargetNumber: 11,
        reasonCode: PSRTrigger.SuperchargerFailure,
      }),
    ]),
  );
  expect(payloads).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        fixedTargetNumber: 7,
        reasonCode: PSRTrigger.MASCFailure,
      }),
      expect.objectContaining({
        fixedTargetNumber: 11,
        reasonCode: PSRTrigger.SuperchargerFailure,
      }),
    ]),
  );
});

it('advances and decays MASC/Supercharger prior-use counters at turn reset', () => {
  const target = { q: 10, r: 0 };
  const { next } = runScriptedMove(
    createMinimalGrid(11),
    target,
    {
      hasMASC: true,
      hasSupercharger: true,
      activeMASC: true,
      activeSupercharger: true,
      mascTurnsUsed: 1,
      superchargerTurnsUsed: 2,
    },
    {
      movementType: MovementType.Run,
      capability: { walkMP: 4, runMP: 6, jumpMP: 0 },
    },
  );

  const afterUsedTurn = resetTurnState({ ...next, turn: 2 });

  expect(afterUsedTurn.units['player-1']).toMatchObject({
    activeMASC: false,
    activeSupercharger: false,
    mascTurnsUsed: 2,
    superchargerTurnsUsed: 3,
    mascFailureLevelIncreasedLastTurn: true,
    superchargerFailureLevelIncreasedLastTurn: true,
  });

  const afterIdleTurn = resetTurnState({ ...afterUsedTurn, turn: 3 });

  expect(afterIdleTurn.units['player-1']).toMatchObject({
    mascTurnsUsed: 0,
    superchargerTurnsUsed: 1,
    mascFailureLevelIncreasedLastTurn: false,
    superchargerFailureLevelIncreasedLastTurn: false,
  });
});

it('applies explicit Partial Wing jump MP and jump heat support', () => {
  const target = { q: 5, r: 0 };
  const { next, events } = runScriptedMove(
    createMinimalGrid(6),
    target,
    { partialWingJumpBonus: 2 },
    {
      movementType: MovementType.Jump,
      capability: { walkMP: 4, runMP: 6, jumpMP: 3 },
    },
  );
  const payload = events.find(
    (event) => event.type === GameEventType.MovementDeclared,
  )?.payload as IMovementDeclaredPayload | undefined;

  expect(payload).toMatchObject({
    unitId: 'player-1',
    to: target,
    mpUsed: 5,
    heatGenerated: 3,
  });
  expect(next.units['player-1'].position).toEqual(target);
  expect(
    MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT[MovementEnhancementType.PARTIAL_WING],
  ).toMatchObject({
    level: 'integrated',
    sourceRefs: expect.arrayContaining([
      expect.objectContaining({ kind: 'megamek-source' }),
    ]),
  });
});
