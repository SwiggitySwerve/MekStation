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

it('resolves source-backed gun-emplacement physical targets as automatic hits', () => {
  const { events } = runPhase('kick', {
    target: { unitType: 'Gun Emplacement' },
  });

  const resolved = resolvedPayload(events);
  expect(resolved).toMatchObject({
    attackerId: 'player-1',
    targetId: 'opponent-1',
    attackType: 'kick',
    roll: 0,
    toHitNumber: 0,
    hit: true,
    damage: 13,
    automaticHit: true,
    automaticHitReason: 'Targeting adjacent gun emplacement.',
  });
  expect(damageEventsFor(events, 'opponent-1')).toHaveLength(1);
});

it('honors an injected push declaration and queues the pushed PSR', () => {
  const { events, result } = runPhase('push', {
    attacker: { facing: Facing.Southeast },
  });

  expect(events.map((event) => event.type)).toEqual([
    GameEventType.PhysicalAttackDeclared,
    GameEventType.PhysicalAttackResolved,
  ]);

  const resolved = events[1].payload as IPhysicalAttackResolvedPayload;
  expect(resolved).toMatchObject({
    attackerId: 'player-1',
    targetId: 'opponent-1',
    attackType: 'push',
    roll: 8,
    toHitNumber: 4,
    hit: true,
    damage: 0,
  });
  expect(result.units['opponent-1'].pendingPSRs).toEqual([
    expect.objectContaining({ reasonCode: PSRTrigger.Pushed }),
  ]);
});

it('honors an injected optional TacOps trip declaration and queues the tripped PSR', () => {
  const { events, result } = runPhase('trip', {
    attacker: { facing: Facing.Southeast },
    optionalRules: ['tacops_trip_attack'],
  });

  expect(events.map((event) => event.type)).toEqual([
    GameEventType.PhysicalAttackDeclared,
    GameEventType.PhysicalAttackResolved,
  ]);

  const resolved = events[1].payload as IPhysicalAttackResolvedPayload;
  expect(resolved).toMatchObject({
    attackerId: 'player-1',
    targetId: 'opponent-1',
    attackType: 'trip',
    roll: 8,
    toHitNumber: 4,
    hit: true,
    damage: 0,
  });
  expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
  expect(result.units['opponent-1'].pendingPSRs).toEqual([
    expect.objectContaining({
      reason: 'Tripped',
      additionalModifier: 0,
      triggerSource: 'trip',
    }),
  ]);
});

it('honors an injected normal TacOps grapple declaration as zero-damage grapple state', () => {
  const { events, result } = runPhase('grapple', {
    attacker: {
      facing: Facing.Southeast,
      piloting: 1,
    },
    optionalRules: ['tacops_grappling'],
  });

  expect(events.map((event) => event.type)).toEqual([
    GameEventType.PhysicalAttackDeclared,
    GameEventType.PhysicalAttackResolved,
  ]);

  const resolved = events[1].payload as IPhysicalAttackResolvedPayload;
  expect(resolved).toMatchObject({
    attackerId: 'player-1',
    targetId: 'opponent-1',
    attackType: 'grapple',
    roll: 8,
    toHitNumber: 1,
    hit: true,
    damage: 0,
  });
  expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
  expect(result.units['player-1']).toMatchObject({
    grappledUnitId: 'opponent-1',
    isGrappleAttacker: true,
    grappledThisRound: true,
    grappleSide: 'both',
    position: { q: 1, r: 0 },
  });
  expect(result.units['opponent-1']).toMatchObject({
    grappledUnitId: 'player-1',
    isGrappleAttacker: false,
    grappledThisRound: true,
    grappleSide: 'both',
    facing: Facing.Northwest,
  });
});

it('honors an injected break-grapple declaration as zero-damage state clearing', () => {
  const { events, result } = runPhase('break-grapple', {
    attacker: {
      position: { q: 0, r: 0 },
      facing: Facing.North,
      grappledUnitId: 'opponent-1',
      isGrappleAttacker: true,
      grappledThisRound: true,
      grappleSide: 'both',
    },
    target: {
      position: { q: 0, r: 0 },
      grappledUnitId: 'player-1',
      isGrappleAttacker: false,
      grappledThisRound: true,
      grappleSide: 'both',
    },
    grid: createBreakGrapplePhysicalGrid(),
    optionalRules: ['tacops_grappling'],
  });

  expect(events.map((event) => event.type)).toEqual([
    GameEventType.PhysicalAttackDeclared,
    GameEventType.PhysicalAttackResolved,
  ]);

  const resolved = events[1].payload as IPhysicalAttackResolvedPayload;
  expect(resolved).toMatchObject({
    attackerId: 'player-1',
    targetId: 'opponent-1',
    attackType: 'break-grapple',
    roll: 0,
    toHitNumber: 0,
    hit: true,
    damage: 0,
    automaticHit: true,
    automaticHitReason: 'original attacker',
    displacements: [
      {
        unitId: 'player-1',
        from: { q: 0, r: 0 },
        to: { q: 0, r: -1 },
        reason: 'break-grapple',
      },
    ],
  });
  expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
  expect(result.units['player-1']).toMatchObject({
    position: { q: 0, r: -1 },
    grappledUnitId: undefined,
    isGrappleAttacker: undefined,
    grappledThisRound: false,
    grappleSide: undefined,
    facing: Facing.South,
  });
  expect(result.units['opponent-1']).toMatchObject({
    position: { q: 0, r: 0 },
    grappledUnitId: undefined,
    isGrappleAttacker: undefined,
    grappledThisRound: false,
    grappleSide: undefined,
  });
});

it('honors an injected source-backed thrash declaration as automatic infantry damage with attacker PSR', () => {
  const { events, result } = runPhase('thrash', {
    attacker: { prone: true },
    target: {
      position: { q: 0, r: 0 },
      unitType: UnitType.INFANTRY,
    },
    grid: createSameHexPhysicalGrid(),
  });

  expect(events.map((event) => event.type)).toEqual([
    GameEventType.PhysicalAttackDeclared,
    GameEventType.DamageApplied,
    GameEventType.PhysicalAttackResolved,
  ]);

  const resolved = resolvedPayload(events);
  expect(resolved).toMatchObject({
    attackerId: 'player-1',
    targetId: 'opponent-1',
    attackType: 'thrash',
    roll: 0,
    toHitNumber: 0,
    hit: true,
    damage: 22,
    automaticHit: true,
    automaticHitReason: 'Thrash attacks always hit.',
  });
  expect(damageEventsFor(events, 'opponent-1')).toEqual([
    expect.objectContaining({
      unitId: 'opponent-1',
      damage: 22,
      sourceUnitId: 'player-1',
    }),
  ]);
  expect(result.units['player-1'].pendingPSRs).toEqual([
    expect.objectContaining({
      reason: 'Thrashing attack',
      additionalModifier: 0,
      triggerSource: 'thrash_attacker_hit',
    }),
  ]);
  expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
});
