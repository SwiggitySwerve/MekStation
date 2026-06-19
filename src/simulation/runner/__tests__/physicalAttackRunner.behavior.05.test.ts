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

it('rejects injected push declarations for explicit non-Mek attackers or targets', () => {
  const nonMekAttacker = runPhase('push', {
    attacker: {
      facing: Facing.Southeast,
      unitType: UnitType.VEHICLE,
    },
  });

  expect(resolvedPayload(nonMekAttacker.events)).toMatchObject({
    attackType: 'push',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
    location: 'AttackerNotMek',
  });
  expect(nonMekAttacker.result.units['opponent-1'].pendingPSRs).toHaveLength(0);
  expect(nonMekAttacker.result.units['opponent-1'].position).toEqual({
    q: 1,
    r: 0,
  });
  expect(nonMekAttacker.result.units['player-1'].position).toEqual({
    q: 0,
    r: 0,
  });

  const nonMekTarget = runPhase('push', {
    attacker: { facing: Facing.Southeast },
    target: { unitType: UnitType.BATTLE_ARMOR },
  });

  expect(resolvedPayload(nonMekTarget.events)).toMatchObject({
    attackType: 'push',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
    location: 'TargetNotMek',
  });
  expect(nonMekTarget.result.units['opponent-1'].pendingPSRs).toHaveLength(0);
  expect(nonMekTarget.result.units['opponent-1'].position).toEqual({
    q: 1,
    r: 0,
  });
  expect(nonMekTarget.result.units['player-1'].position).toEqual({
    q: 0,
    r: 0,
  });
});

it('rejects injected push declarations from quad BattleMechs before side effects', () => {
  const quadAttacker = runPhase('push', {
    attacker: {
      facing: Facing.Southeast,
      isQuad: true,
    },
  });

  expect(resolvedPayload(quadAttacker.events)).toMatchObject({
    attackType: 'push',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
    location: 'AttackerQuad',
  });
  expect(quadAttacker.result.units['opponent-1'].pendingPSRs).toHaveLength(0);
  expect(quadAttacker.result.units['opponent-1'].position).toEqual({
    q: 1,
    r: 0,
  });
  expect(quadAttacker.result.units['player-1'].position).toEqual({
    q: 0,
    r: 0,
  });
});

it('rejects injected push declarations from airborne attackers before side effects', () => {
  const airborneAttacker = runPhase('push', {
    attacker: {
      facing: Facing.Southeast,
      isAirborne: true,
    },
  });

  expect(resolvedPayload(airborneAttacker.events)).toMatchObject({
    attackType: 'push',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
    location: 'AttackerAirborne',
  });
  expect(airborneAttacker.result.units['opponent-1'].pendingPSRs).toHaveLength(
    0,
  );
  expect(airborneAttacker.result.units['opponent-1'].position).toEqual({
    q: 1,
    r: 0,
  });
  expect(airborneAttacker.result.units['player-1'].position).toEqual({
    q: 0,
    r: 0,
  });
});

it('rejects injected push declarations with rear-flipped arms before side effects', () => {
  const flippedArms = runPhase('push', {
    attacker: {
      facing: Facing.Southeast,
      armsFlipped: true,
    },
  });

  expect(resolvedPayload(flippedArms.events)).toMatchObject({
    attackType: 'push',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
    location: 'ArmsFlipped',
  });
  expect(flippedArms.result.units['opponent-1'].pendingPSRs).toHaveLength(0);
  expect(flippedArms.result.units['opponent-1'].position).toEqual({
    q: 1,
    r: 0,
  });
  expect(flippedArms.result.units['player-1'].position).toEqual({
    q: 0,
    r: 0,
  });
});

it('rejects injected charge declarations against non-Mek or prone targets before side effects', () => {
  const nonMekTarget = runPhase('charge', {
    attacker: {
      movementThisTurn: MovementType.Run,
      hexesMovedThisTurn: 5,
    },
    target: { unitType: UnitType.BATTLE_ARMOR },
  });

  expect(resolvedPayload(nonMekTarget.events)).toMatchObject({
    attackType: 'charge',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
    location: 'TargetNotMek',
  });
  expect(damageEventsFor(nonMekTarget.events, 'opponent-1')).toHaveLength(0);
  expect(damageEventsFor(nonMekTarget.events, 'player-1')).toHaveLength(0);
  expect(nonMekTarget.result.units['opponent-1'].pendingPSRs).toHaveLength(0);
  expect(nonMekTarget.result.units['player-1'].pendingPSRs).toHaveLength(0);
  expect(nonMekTarget.result.units['opponent-1'].position).toEqual({
    q: 1,
    r: 0,
  });
  expect(nonMekTarget.result.units['player-1'].position).toEqual({
    q: 0,
    r: 0,
  });

  const gunEmplacementTarget = runPhase('charge', {
    attacker: {
      movementThisTurn: MovementType.Run,
      hexesMovedThisTurn: 5,
    },
    target: { unitType: 'Gun Emplacement' },
  });
  const gunEmplacementResolved = resolvedPayload(gunEmplacementTarget.events);

  expect(gunEmplacementResolved).toMatchObject({
    attackType: 'charge',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
    location: 'TargetNotMek',
  });
  expect(gunEmplacementResolved.automaticHit).toBeUndefined();
  expect(
    damageEventsFor(gunEmplacementTarget.events, 'opponent-1'),
  ).toHaveLength(0);
  expect(damageEventsFor(gunEmplacementTarget.events, 'player-1')).toHaveLength(
    0,
  );
  expect(
    gunEmplacementTarget.result.units['opponent-1'].pendingPSRs,
  ).toHaveLength(0);
  expect(
    gunEmplacementTarget.result.units['player-1'].pendingPSRs,
  ).toHaveLength(0);
  expect(gunEmplacementTarget.result.units['opponent-1'].position).toEqual({
    q: 1,
    r: 0,
  });
  expect(gunEmplacementTarget.result.units['player-1'].position).toEqual({
    q: 0,
    r: 0,
  });

  const proneTarget = runPhase('charge', {
    attacker: {
      movementThisTurn: MovementType.Run,
      hexesMovedThisTurn: 5,
    },
    target: { prone: true },
  });

  expect(resolvedPayload(proneTarget.events)).toMatchObject({
    attackType: 'charge',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
    location: 'TargetProne',
  });
  expect(damageEventsFor(proneTarget.events, 'opponent-1')).toHaveLength(0);
  expect(damageEventsFor(proneTarget.events, 'player-1')).toHaveLength(0);
  expect(proneTarget.result.units['opponent-1'].pendingPSRs).toHaveLength(0);
  expect(proneTarget.result.units['player-1'].pendingPSRs).toHaveLength(0);
  expect(proneTarget.result.units['opponent-1'].position).toEqual({
    q: 1,
    r: 0,
  });
  expect(proneTarget.result.units['player-1'].position).toEqual({
    q: 0,
    r: 0,
  });
});
