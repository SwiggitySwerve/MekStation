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

it('skips prone charge attackers before injected physical declarations', () => {
  const proneAttacker = runPhase('charge', {
    attacker: {
      movementThisTurn: MovementType.Run,
      hexesMovedThisTurn: 5,
      prone: true,
    },
  });

  expect(proneAttacker.events).toEqual([]);
  expect(damageEventsFor(proneAttacker.events, 'opponent-1')).toHaveLength(0);
  expect(damageEventsFor(proneAttacker.events, 'player-1')).toHaveLength(0);
  expect(proneAttacker.result.units['opponent-1'].pendingPSRs).toHaveLength(0);
  expect(proneAttacker.result.units['player-1'].pendingPSRs).toHaveLength(0);
  expect(proneAttacker.result.units['opponent-1'].position).toEqual({
    q: 1,
    r: 0,
  });
  expect(proneAttacker.result.units['player-1'].position).toEqual({
    q: 0,
    r: 0,
  });
});

it('rejects injected DFA declarations after mechanical jump booster movement before side effects', () => {
  const mechanicalJumpDfa = runPhase('dfa', {
    attacker: {
      movementThisTurn: MovementType.Jump,
      hexesMovedThisTurn: 4,
      usedMechanicalJumpBoosterThisTurn: true,
    },
  });

  expect(resolvedPayload(mechanicalJumpDfa.events)).toMatchObject({
    attackType: 'dfa',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
    location: 'MechanicalJumpBooster',
  });
  expect(damageEventsFor(mechanicalJumpDfa.events, 'opponent-1')).toHaveLength(
    0,
  );
  expect(damageEventsFor(mechanicalJumpDfa.events, 'player-1')).toHaveLength(0);
  expect(mechanicalJumpDfa.result.units['opponent-1'].pendingPSRs).toHaveLength(
    0,
  );
  expect(mechanicalJumpDfa.result.units['player-1'].pendingPSRs).toHaveLength(
    0,
  );
});

it('rejects injected charge declarations after backward movement before side effects', () => {
  const backwardCharge = runPhase('charge', {
    attacker: {
      movementThisTurn: MovementType.Run,
      hexesMovedThisTurn: 5,
      movedBackwardThisTurn: true,
    },
  });

  expect(resolvedPayload(backwardCharge.events)).toMatchObject({
    attackType: 'charge',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
    location: 'ChargeBackwardMovement',
  });
  expect(damageEventsFor(backwardCharge.events, 'opponent-1')).toHaveLength(0);
  expect(damageEventsFor(backwardCharge.events, 'player-1')).toHaveLength(0);
  expect(backwardCharge.result.units['opponent-1'].pendingPSRs).toHaveLength(0);
  expect(backwardCharge.result.units['player-1'].pendingPSRs).toHaveLength(0);
  expect(backwardCharge.result.units['opponent-1'].position).toEqual({
    q: 1,
    r: 0,
  });
  expect(backwardCharge.result.units['player-1'].position).toEqual({
    q: 0,
    r: 0,
  });
});

it('rejects injected charge declarations after jump movement before side effects', () => {
  const jumpCharge = runPhase('charge', {
    attacker: {
      movementThisTurn: MovementType.Jump,
      hexesMovedThisTurn: 5,
    },
  });

  expect(resolvedPayload(jumpCharge.events)).toMatchObject({
    attackType: 'charge',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
    location: 'ChargeJumpMovement',
  });
  expect(damageEventsFor(jumpCharge.events, 'opponent-1')).toHaveLength(0);
  expect(damageEventsFor(jumpCharge.events, 'player-1')).toHaveLength(0);
  expect(jumpCharge.result.units['opponent-1'].pendingPSRs).toHaveLength(0);
  expect(jumpCharge.result.units['player-1'].pendingPSRs).toHaveLength(0);
  expect(jumpCharge.result.units['opponent-1'].position).toEqual({
    q: 1,
    r: 0,
  });
  expect(jumpCharge.result.units['player-1'].position).toEqual({
    q: 0,
    r: 0,
  });
});

it('rejects injected charge declarations when target elevation does not overlap the attacker', () => {
  const elevatedTarget = runPhase('charge', {
    attacker: {
      movementThisTurn: MovementType.Run,
      hexesMovedThisTurn: 5,
    },
    grid: createPhysicalGrid({ targetElevation: 2 }),
  });

  expect(resolvedPayload(elevatedTarget.events)).toMatchObject({
    attackType: 'charge',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
    location: 'ElevationMismatch',
  });
  expect(damageEventsFor(elevatedTarget.events, 'opponent-1')).toHaveLength(0);
  expect(damageEventsFor(elevatedTarget.events, 'player-1')).toHaveLength(0);
  expect(elevatedTarget.result.units['opponent-1'].pendingPSRs).toHaveLength(0);
  expect(elevatedTarget.result.units['player-1'].pendingPSRs).toHaveLength(0);
  expect(elevatedTarget.result.units['opponent-1'].position).toEqual({
    q: 1,
    r: 0,
  });
  expect(elevatedTarget.result.units['player-1'].position).toEqual({
    q: 0,
    r: 0,
  });
});

it('rejects injected non-Mek charge declarations against infantry or ProtoMech targets', () => {
  const protoTarget = runPhase('charge', {
    attacker: {
      movementThisTurn: MovementType.Run,
      hexesMovedThisTurn: 5,
      unitType: UnitType.VEHICLE,
    },
    target: { unitType: UnitType.PROTOMECH },
  });

  expect(resolvedPayload(protoTarget.events)).toMatchObject({
    attackType: 'charge',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
    location: 'TargetInfantryOrProtoMek',
  });
  expect(damageEventsFor(protoTarget.events, 'opponent-1')).toHaveLength(0);
  expect(damageEventsFor(protoTarget.events, 'player-1')).toHaveLength(0);
  expect(protoTarget.result.units['opponent-1'].pendingPSRs).toHaveLength(0);
  expect(protoTarget.result.units['player-1'].pendingPSRs).toHaveLength(0);
  expect(protoTarget.result.units['opponent-1'].position).toEqual({
    q: 1,
    r: 0,
  });
  expect(protoTarget.result.units['player-1'].position).toEqual({
    q: 0,
    r: 0,
  });
});

it('rejects injected DFA declarations by infantry-family attackers before side effects', () => {
  const infantryAttacker = runPhase('dfa', {
    attacker: {
      movementThisTurn: MovementType.Jump,
      hexesMovedThisTurn: 4,
      unitType: UnitType.INFANTRY,
    },
  });

  expect(resolvedPayload(infantryAttacker.events)).toMatchObject({
    attackType: 'dfa',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
    location: 'AttackerInfantry',
  });
  expect(damageEventsFor(infantryAttacker.events, 'opponent-1')).toHaveLength(
    0,
  );
  expect(damageEventsFor(infantryAttacker.events, 'player-1')).toHaveLength(0);
  expect(infantryAttacker.result.units['opponent-1'].pendingPSRs).toHaveLength(
    0,
  );
  expect(infantryAttacker.result.units['player-1'].pendingPSRs).toHaveLength(0);
  expect(infantryAttacker.result.units['opponent-1'].position).toEqual({
    q: 1,
    r: 0,
  });
  expect(infantryAttacker.result.units['player-1'].position).toEqual({
    q: 0,
    r: 0,
  });
});

it('rejects injected DFA declarations against DropShip targets before side effects', () => {
  const dropshipTarget = runPhase('dfa', {
    attacker: {
      movementThisTurn: MovementType.Jump,
      hexesMovedThisTurn: 4,
    },
    target: { unitType: UnitType.DROPSHIP },
  });

  expect(resolvedPayload(dropshipTarget.events)).toMatchObject({
    attackType: 'dfa',
    roll: 0,
    toHitNumber: Infinity,
    hit: false,
    damage: 0,
    location: 'TargetDropShip',
  });
  expect(damageEventsFor(dropshipTarget.events, 'opponent-1')).toHaveLength(0);
  expect(damageEventsFor(dropshipTarget.events, 'player-1')).toHaveLength(0);
  expect(dropshipTarget.result.units['opponent-1'].pendingPSRs).toHaveLength(0);
  expect(dropshipTarget.result.units['player-1'].pendingPSRs).toHaveLength(0);
  expect(dropshipTarget.result.units['opponent-1'].position).toEqual({
    q: 1,
    r: 0,
  });
  expect(dropshipTarget.result.units['player-1'].position).toEqual({
    q: 0,
    r: 0,
  });
});
