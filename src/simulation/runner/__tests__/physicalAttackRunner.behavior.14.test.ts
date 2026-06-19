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

it('queues represented terrain and building PSR fallout for domino displacement destinations', () => {
  const baseState = createState();
  const state: IGameState = {
    ...baseState,
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
        { pilotConscious: false, tonnage: 55 },
      ),
    },
  };
  const grid = createDominoChargeGrid();
  const hexes = new Map(grid.hexes);
  const rubbleHex = hexes.get('1,2');
  const buildingHex = hexes.get('1,3');
  if (rubbleHex) {
    hexes.set('1,2', { ...rubbleHex, terrain: TerrainType.Rubble });
  }
  if (buildingHex) {
    hexes.set('1,3', {
      ...buildingHex,
      terrain: terrainStringFromFeatures([
        { type: TerrainType.Building, level: 2, constructionFactor: 40 },
      ]),
    });
  }

  const { events, result } = runPhaseWithState(
    'charge',
    state,
    { ...grid, hexes },
    {
      random: scriptedD6Random(Array.from({ length: 24 }, () => 6)),
    },
  );
  const physicalPsrPayloads = events
    .filter(
      (event) =>
        event.type === GameEventType.PSRTriggered &&
        event.phase === GamePhase.PhysicalAttack,
    )
    .map((event) => event.payload);

  expect(resolvedPayload(events).displacements).toEqual([
    {
      unitId: 'opponent-1',
      from: { q: 1, r: 0 },
      to: { q: 1, r: 1 },
      reason: 'charge',
    },
    {
      unitId: 'domino-blocker',
      from: { q: 1, r: 1 },
      to: { q: 1, r: 2 },
      reason: 'domino',
    },
    {
      unitId: 'domino-tail',
      from: { q: 1, r: 2 },
      to: { q: 1, r: 3 },
      reason: 'domino',
    },
    {
      unitId: 'player-1',
      from: { q: 0, r: 0 },
      to: { q: 1, r: 0 },
      reason: 'charge',
    },
  ]);
  expectPendingPSR(result, 'domino-blocker', PSRTrigger.EnteringRubble, {
    reason: 'Entering rubble',
    triggerSource: PSRTrigger.EnteringRubble,
  });
  expectPendingPSR(result, 'domino-tail', PSRTrigger.BuildingCollapse, {
    reason: 'Building collapse',
    triggerSource: PSRTrigger.BuildingCollapse,
  });
  expectPendingPSR(result, 'domino-blocker', PSRTrigger.DominoEffect);
  expectPendingPSR(result, 'domino-tail', PSRTrigger.DominoEffect);
  expect(physicalPsrPayloads).toContainEqual(
    expect.objectContaining({
      unitId: 'domino-blocker',
      reasonCode: PSRTrigger.EnteringRubble,
      triggerSource: PSRTrigger.EnteringRubble,
    }),
  );
  expect(physicalPsrPayloads).toContainEqual(
    expect.objectContaining({
      unitId: 'domino-tail',
      reasonCode: PSRTrigger.BuildingCollapse,
      triggerSource: PSRTrigger.BuildingCollapse,
    }),
  );
  expect(physicalPsrPayloads).not.toContainEqual(
    expect.objectContaining({
      unitId: 'opponent-1',
      reasonCode: PSRTrigger.EnteringRubble,
    }),
  );
});

it('applies represented coordinate minefield fallout when domino displacement enters a state minefield', () => {
  const baseState = createState();
  const mineCoord = { q: 1, r: 3 };
  const state: IGameState = {
    ...baseState,
    minefields: {
      '1,3': {
        type: 'conventional',
        damagePerLeg: 5,
        density: 20,
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
    damageThisPhase: 10,
    armor: {
      left_leg: 16,
      right_leg: 16,
    },
  });
  expect(damageEventsFor(events, 'domino-tail')).toEqual([
    expect.objectContaining({
      unitId: 'domino-tail',
      location: 'left_leg',
      damage: 5,
      armorRemaining: 16,
    }),
    expect.objectContaining({
      unitId: 'domino-tail',
      location: 'right_leg',
      damage: 5,
      armorRemaining: 16,
    }),
  ]);
  expect(minefieldChanged?.phase).toBe(GamePhase.PhysicalAttack);
  expect(minefieldPayload).toMatchObject({
    operation: 'set',
    hex: mineCoord,
    reason: 'movement_detonation',
    sourceUnitId: 'domino-tail',
    minefield: {
      type: 'conventional',
      damagePerLeg: 5,
      density: 15,
      detonated: false,
      source: 'event',
    },
  });
  expect(result.minefields?.['1,3']).toEqual({
    type: 'conventional',
    damagePerLeg: 5,
    density: 15,
    detonated: false,
    source: 'event',
  });
  expectPendingPSR(result, 'domino-tail', PSRTrigger.DominoEffect, {
    reason: 'Domino effect',
    additionalModifier: 0,
  });
});
