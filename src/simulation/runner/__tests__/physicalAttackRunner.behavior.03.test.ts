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

it('rejects injected thrash declarations in non-clear same-hex terrain before side effects', () => {
  const { events, result } = runPhase('thrash', {
    attacker: { prone: true },
    target: {
      position: { q: 0, r: 0 },
      unitType: UnitType.INFANTRY,
    },
    grid: createSameHexPhysicalGrid(TerrainType.LightWoods),
  });

  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'thrash',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
    location: 'TerrainNotClearOrPavement',
  });
  expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
  expect(result.units['player-1'].pendingPSRs).toHaveLength(0);
  expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
});

it('rejects injected physical declarations against passenger targets before side effects', () => {
  const { events, result } = runPhase('kick', {
    target: { isPassenger: true },
  });

  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'kick',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
    location: 'TargetPassenger',
  });
  expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
  expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
  expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
  expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
});

it('removes ejected units from runner physical target selection', () => {
  const { events, result } = runPhase('kick', {
    target: { hasEjected: true },
  });

  expect(events).toHaveLength(0);
  expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
  expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
  expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
  expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
});

it('removes retreated units from runner physical target selection', () => {
  const { events, result } = runPhase('kick', {
    target: { hasRetreated: true },
  });

  expect(events).toHaveLength(0);
  expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
  expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
  expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
  expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
});

it('rejects injected physical declarations against swarming targets before side effects', () => {
  const { events, result } = runPhase('kick', {
    target: { isSwarming: true },
  });

  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'kick',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
    location: 'TargetSwarming',
  });
  expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
  expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
  expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
  expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
});

it('rejects injected physical declarations against targets making DFA before side effects', () => {
  const { events, result } = runPhase('kick', {
    target: { isMakingDFA: true },
  });

  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'kick',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
    location: 'TargetMakingDFA',
  });
  expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
  expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
  expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
  expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
});

it('rejects injected charge declarations against targets making displacement attacks before side effects', () => {
  const { events, result } = runPhase('charge', {
    attacker: {
      movementThisTurn: MovementType.Run,
      hexesMovedThisTurn: 5,
    },
    target: { isMakingDisplacementAttack: true },
  });

  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'charge',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
    location: 'TargetMakingDisplacementAttack',
  });
  expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
  expect(damageEventsFor(events, 'player-1')).toHaveLength(0);
  expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
  expect(result.units['player-1'].pendingPSRs).toHaveLength(0);
  expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
  expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
});

it('rejects injected push declarations against targets pushing another unit before side effects', () => {
  const { events, result } = runPhase('push', {
    attacker: { facing: Facing.Southeast },
    target: {
      isMakingDisplacementAttack: true,
      isPushing: true,
      displacementAttackTargetId: 'third-unit',
    },
  });

  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'push',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
    location: 'TargetPushingAnotherMek',
  });
  expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
  expect(damageEventsFor(events, 'player-1')).toHaveLength(0);
  expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
  expect(result.units['player-1'].pendingPSRs).toHaveLength(0);
  expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
  expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
});

it('rejects injected physical declarations against targets inside another building before side effects', () => {
  const { events, result } = runPhase('kick', {
    target: { occupiedBuildingId: 'building-east' },
  });

  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'kick',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
    location: 'TargetInsideBuilding',
  });
  expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
  expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
  expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
  expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
});

it('rejects injected physical declarations against airborne targets before side effects', () => {
  const { events, result } = runPhase('kick', {
    target: { isAirborne: true },
  });

  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'kick',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
    location: 'TargetAirborne',
  });
  expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
  expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
  expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
  expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
});

it('hydrates runner jump MP for DFA reach against airborne VTOL targets', () => {
  const reachable = runPhase('dfa', {
    attacker: {
      movementThisTurn: MovementType.Jump,
      hexesMovedThisTurn: 4,
      piloting: 0,
    },
    target: { isAirborne: true, unitType: UnitType.VTOL },
    grid: createPhysicalGrid({ targetElevation: 5 }),
    movementCapabilitiesByUnit: new Map([
      ['player-1', { walkMP: 4, runMP: 6, jumpMP: 4 }],
    ]),
  });
  const reachablePayload = resolvedPayload(reachable.events);

  expect(reachablePayload.attackType).toBe('dfa');
  expect(Number.isFinite(reachablePayload.toHitNumber)).toBe(true);
  expect(reachablePayload.location).not.toBe('TargetAirborne');
  expect(reachablePayload.location).not.toBe('ElevationMismatch');

  const unreachable = runPhase('dfa', {
    attacker: {
      movementThisTurn: MovementType.Jump,
      hexesMovedThisTurn: 4,
    },
    target: { isAirborne: true, unitType: UnitType.VTOL },
    grid: createPhysicalGrid({ targetElevation: 5 }),
    movementCapabilitiesByUnit: new Map([
      ['player-1', { walkMP: 4, runMP: 6, jumpMP: 3 }],
    ]),
  });

  expect(resolvedPayload(unreachable.events)).toMatchObject({
    attackType: 'dfa',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
    location: 'ElevationMismatch',
  });
  expect(damageEventsFor(unreachable.events, 'opponent-1')).toHaveLength(0);
  expect(damageEventsFor(unreachable.events, 'player-1')).toHaveLength(0);
  expect(unreachable.result.units['opponent-1'].pendingPSRs).toHaveLength(0);
  expect(unreachable.result.units['player-1'].pendingPSRs).toHaveLength(0);
});
