/**
 * Behavior-class coverage for runner physical attacks that are supported by
 * the shared physical-attack rules but historically skipped by the runner.
 */

import { ActuatorType } from '@/types/construction/MechConfigurationSystem';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  IGameEvent,
  IGameState,
  IHex,
  IHexGrid,
  IDamageAppliedPayload,
  ICriticalHitResolvedPayload,
  IMinefieldChangedPayload,
  IRepresentedMinefieldState,
  IPhysicalAttackDeclaredPayload,
  IMovementCapability,
  IPilotHitPayload,
  IPhysicalAttackResolvedPayload,
  IUnitDestroyedPayload,
  IUnitFellPayload,
  IUnitGameState,
  LockState,
  MovementType,
  PSRTrigger,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  buildCriticalSlotManifest,
  type CriticalSlotManifest,
} from '@/utils/gameplay/criticalHitResolution';
import {
  SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES,
  type PhysicalAttackINarcPodSelection,
  type PhysicalAttackLimb,
  type PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks';
import { terrainStringFromFeatures } from '@/utils/gameplay/terrainEncoding';

import type {
  IAIPlayer,
  IAIUnitState,
  IAttackEvent,
  IMovementEvent,
  IPhysicalAttackEvent,
  IRetreatEvent,
} from '../../ai/IAIPlayer';
import type { IViolation } from '../../invariants/types';

import { SeededRandom } from '../../core/SeededRandom';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import {
  DISPLACEMENT_DOMINO_SECONDARY_FALLOUT_UNSUPPORTED_IDS,
  PHYSICAL_LEGALITY_GATE_SUPPORT,
} from '../CombatPhysicalLegalityGateSupport';
import { runPhysicalAttackPhase } from '../phases/physicalAttack';
import { DEFAULT_COMPONENT_DAMAGE } from '../SimulationRunnerConstants';
import {
  EXPLICIT_UNSUPPORTED_MINEFIELD_VARIANT_TYPES,
  DeclaresMappedPhysicalAttackAI,
  createUnit,
  createState,
  scriptedD6Random,
  createPhysicalGrid,
  createSameHexPhysicalGrid,
  createBreakGrapplePhysicalGrid,
  createGroundedDropShipDfaGrid,
  createSamePhaseDisplacementState,
  createSamePhaseDisplacementGrid,
  createDominoChargeGrid,
  createBlockedDominoChargeGrid,
  createFriendlyDfaMissGrid,
  runPhase,
  runPhaseWithState,
  runAutomaticPhase,
  damageEventsFor,
  resolvedPayload,
  expectPendingPSR,
} from './physicalAttackRunner.behavior.test-helpers';

it('queues represented inferno coordinate minefield heat when domino displacement enters it', () => {
  const baseState = createState();
  const mineCoord = { q: 1, r: 3 };
  const state: IGameState = {
    ...baseState,
    minefields: {
      '1,3': {
        type: 'inferno',
        damagePerLeg: 10,
        density: 10,
        source: 'scenario',
      },
    },
    units: {
      ...baseState.units,
      'player-1': {
        ...baseState.units['player-1'],
        facing: Facing.South,
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
        piloting: 0,
      },
      'domino-blocker': createUnit(
        'domino-blocker',
        GameSide.Opponent,
        { q: 1, r: 1 },
        { pilotConscious: false },
      ),
      'domino-tail': createUnit(
        'domino-tail',
        GameSide.Opponent,
        { q: 1, r: 2 },
        { pilotConscious: false },
      ),
    },
  };
  const { events, result } = runPhaseWithState(
    'charge',
    state,
    createDominoChargeGrid(),
    {
      random: scriptedD6Random(Array.from({ length: 28 }, () => 6)),
    },
  );
  const minefieldChanged = events.find(
    (event) => event.type === GameEventType.MinefieldChanged,
  );
  const minefieldPayload = minefieldChanged?.payload as
    | IMinefieldChangedPayload
    | undefined;

  expect(resolvedPayload(events).displacements).toContainEqual({
    unitId: 'domino-tail',
    from: { q: 1, r: 2 },
    to: mineCoord,
    reason: 'domino',
  });
  expect(result.units['domino-tail']).toMatchObject({
    position: mineCoord,
    damageThisPhase: 0,
    armor: state.units['domino-tail'].armor,
    pendingExternalHeat: 10,
    infernoBurning: true,
  });
  expect(damageEventsFor(events, 'domino-tail')).toEqual([]);
  expect(minefieldChanged?.phase).toBe(GamePhase.PhysicalAttack);
  expect(minefieldPayload).toMatchObject({
    operation: 'set',
    hex: mineCoord,
    reason: 'movement_detonation',
    sourceUnitId: 'domino-tail',
    minefield: {
      type: 'inferno',
      damagePerLeg: 10,
      density: 5,
      detonated: false,
      source: 'event',
    },
  });
  expectPendingPSR(result, 'domino-tail', PSRTrigger.DominoEffect, {
    reason: 'Domino effect',
    additionalModifier: 0,
  });
});

it('suppresses represented coordinate minefield fallout for detonated state during domino displacement', () => {
  const baseState = createState();
  const mineCoord = { q: 1, r: 3 };
  const state: IGameState = {
    ...baseState,
    minefields: {
      '1,3': {
        type: 'conventional',
        damagePerLeg: 5,
        detonated: true,
        source: 'event',
      },
    },
    units: {
      ...baseState.units,
      'player-1': {
        ...baseState.units['player-1'],
        facing: Facing.South,
        movementThisTurn: MovementType.Run,
        hexesMovedThisTurn: 5,
        piloting: 0,
      },
      'domino-blocker': createUnit(
        'domino-blocker',
        GameSide.Opponent,
        { q: 1, r: 1 },
        { pilotConscious: false },
      ),
      'domino-tail': createUnit(
        'domino-tail',
        GameSide.Opponent,
        { q: 1, r: 2 },
        { pilotConscious: false },
      ),
    },
  };
  const { events, result } = runPhaseWithState(
    'charge',
    state,
    createDominoChargeGrid(),
    {
      random: scriptedD6Random(Array.from({ length: 28 }, () => 6)),
    },
  );

  expect(resolvedPayload(events).displacements).toContainEqual({
    unitId: 'domino-tail',
    from: { q: 1, r: 2 },
    to: mineCoord,
    reason: 'domino',
  });
  expect(result.units['domino-tail']).toMatchObject({
    position: mineCoord,
    damageThisPhase: 0,
    armor: state.units['domino-tail'].armor,
  });
  expect(damageEventsFor(events, 'domino-tail')).toEqual([]);
  expect(
    events.filter((event) => event.type === GameEventType.MinefieldChanged),
  ).toEqual([]);
  expect(result.minefields?.['1,3']).toEqual({
    type: 'conventional',
    damagePerLeg: 5,
    detonated: true,
    source: 'event',
  });
  expectPendingPSR(result, 'domino-tail', PSRTrigger.DominoEffect, {
    reason: 'Domino effect',
    additionalModifier: 0,
  });
});

it.each(EXPLICIT_UNSUPPORTED_MINEFIELD_VARIANT_TYPES)(
  'does not treat %s coordinate minefield variants as represented domino fallout',
  (variantType) => {
    const baseState = createState();
    const mineCoord = { q: 1, r: 3 };
    const nonConventionalMinefield: IRepresentedMinefieldState = {
      type: variantType,
      damagePerLeg: 5,
      source: 'scenario',
    };
    const state: IGameState = {
      ...baseState,
      minefields: {
        '1,3': nonConventionalMinefield,
      },
      units: {
        ...baseState.units,
        'player-1': {
          ...baseState.units['player-1'],
          facing: Facing.South,
          movementThisTurn: MovementType.Run,
          hexesMovedThisTurn: 5,
          piloting: 0,
        },
        'domino-blocker': createUnit(
          'domino-blocker',
          GameSide.Opponent,
          { q: 1, r: 1 },
          { pilotConscious: false },
        ),
        'domino-tail': createUnit(
          'domino-tail',
          GameSide.Opponent,
          { q: 1, r: 2 },
          { pilotConscious: false },
        ),
      },
    };
    const { events, result } = runPhaseWithState(
      'charge',
      state,
      createDominoChargeGrid(),
      {
        random: scriptedD6Random(Array.from({ length: 28 }, () => 6)),
      },
    );

    expect(resolvedPayload(events).displacements).toContainEqual({
      unitId: 'domino-tail',
      from: { q: 1, r: 2 },
      to: mineCoord,
      reason: 'domino',
    });
    expect(result.units['domino-tail']).toMatchObject({
      position: mineCoord,
      damageThisPhase: 0,
      armor: state.units['domino-tail'].armor,
    });
    expect(damageEventsFor(events, 'domino-tail')).toEqual([]);
    expect(
      events.filter((event) => event.type === GameEventType.MinefieldChanged),
    ).toEqual([]);
    expect(result.minefields?.['1,3']).toEqual(nonConventionalMinefield);
    expectPendingPSR(result, 'domino-tail', PSRTrigger.DominoEffect, {
      reason: 'Domino effect',
      additionalModifier: 0,
    });
  },
);
