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

it('uses target motion type for runner DFA reach against airborne WIGE vehicles', () => {
  const unreachable = runPhase('dfa', {
    attacker: {
      movementThisTurn: MovementType.Jump,
      hexesMovedThisTurn: 4,
    },
    target: {
      isAirborne: true,
      unitType: UnitType.VEHICLE,
      motionType: GroundMotionType.WIGE,
    },
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
});

it('rejects injected physical declarations by evading attackers before side effects', () => {
  const { events, result } = runPhase('kick', {
    attacker: { isEvading: true },
  });

  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'kick',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
    location: 'AttackerEvading',
  });
  expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
  expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
  expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
  expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
});

it('rejects injected physical declarations by cargo-interacting attackers before side effects', () => {
  const { events, result } = runPhase('kick', {
    attacker: { isLoadingOrUnloadingCargo: true },
  });

  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'kick',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
    location: 'AttackerCargoInteraction',
  });
  expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
  expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
  expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
  expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
});

it('rejects injected physical declarations against different-board targets before side effects', () => {
  const { events, result } = runPhase('kick', {
    attacker: { boardId: 'board-alpha' },
    target: { boardId: 'board-beta' },
  });

  expect(resolvedPayload(events)).toMatchObject({
    attackType: 'kick',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
    location: 'DifferentBoard',
  });
  expect(damageEventsFor(events, 'opponent-1')).toHaveLength(0);
  expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
  expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
  expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
});

it('rejects source-backed push legality gates before displacement side effects', () => {
  const { events, result } = runPhase('push', {
    target: { prone: true },
  });

  const resolved = resolvedPayload(events);
  expect(resolved).toMatchObject({
    attackType: 'push',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
  });
  expect(resolved.displacements).toBeUndefined();
  expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
  expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
  expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
});

it('keeps injected push declarations conservative when fired weapon locations are unknown', () => {
  const { events, result } = runPhase('push', {
    attacker: {
      facing: Facing.Southeast,
      weaponsFiredThisTurn: ['right-arm-medium-laser'],
    },
  });

  const resolved = resolvedPayload(events);
  expect(resolved).toMatchObject({
    attackType: 'push',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
    location: 'WeaponFiredThisTurn',
  });
  expect(resolved.displacements).toBeUndefined();
  expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
  expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
  expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
});

it('rejects injected push declarations after hydrated arm-mounted weapon fire', () => {
  const { events, result } = runPhase('push', {
    attacker: {
      facing: Facing.Southeast,
      weaponsFiredThisTurn: ['right-arm-medium-laser'],
      weaponLocationById: {
        'right-arm-medium-laser': 'RIGHT_ARM',
      },
    },
  });

  const resolved = resolvedPayload(events);
  expect(resolved).toMatchObject({
    attackType: 'push',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
    location: 'WeaponFiredThisTurn',
  });
  expect(resolved.displacements).toBeUndefined();
  expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
  expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
  expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
});

it('allows injected push declarations after hydrated torso-mounted weapon fire', () => {
  const { events, result } = runPhase('push', {
    attacker: {
      facing: Facing.Southeast,
      weaponsFiredThisTurn: ['center-torso-laser'],
      weaponLocationById: {
        'center-torso-laser': 'CENTER_TORSO',
      },
    },
  });

  const resolved = resolvedPayload(events);
  expect(resolved).toMatchObject({
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

it('rejects injected push declarations when either attacker arm is missing', () => {
  const { events, result } = runPhase('push', {
    attacker: {
      facing: Facing.Southeast,
      destroyedLocations: ['left_arm'],
    },
  });

  const resolved = resolvedPayload(events);
  expect(resolved).toMatchObject({
    attackType: 'push',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
    location: 'LimbMissing',
  });
  expect(resolved.displacements).toBeUndefined();
  expect(result.units['opponent-1'].pendingPSRs).toHaveLength(0);
  expect(result.units['opponent-1'].position).toEqual({ q: 1, r: 0 });
  expect(result.units['player-1'].position).toEqual({ q: 0, r: 0 });
});

it('rejects injected punch and kick declarations when source-required limbs are missing', () => {
  const missingPunchArm = runPhase('punch', {
    attacker: {
      destroyedLocations: ['right_arm'],
    },
  });

  expect(resolvedPayload(missingPunchArm.events)).toMatchObject({
    attackType: 'punch',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
    location: 'LimbMissing',
  });
  expect(damageEventsFor(missingPunchArm.events, 'opponent-1')).toHaveLength(0);

  const missingKickLeg = runPhase('kick', {
    attacker: {
      destroyedLocations: ['left_leg'],
    },
  });

  expect(resolvedPayload(missingKickLeg.events)).toMatchObject({
    attackType: 'kick',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
    location: 'LimbMissing',
  });
  expect(damageEventsFor(missingKickLeg.events, 'opponent-1')).toHaveLength(0);
  expect(missingKickLeg.result.units['player-1'].pendingPSRs).toHaveLength(0);
});
